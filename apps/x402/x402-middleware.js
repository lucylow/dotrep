/**
 * x402 Payment Middleware - Enhanced Web Payments Layer
 * Easy-to-use middleware for protecting endpoints with x402 payments
 * 
 * Implements the x402 protocol as a foundational "payments layer" for the web,
 * enabling seamless, on-chain transactions directly within HTTP.
 * 
 * Features:
 * - Canonical HTTP 402 Payment Required responses
 * - X-PAYMENT header support (standard)
 * - Challenge/nonce for replay protection
 * - Facilitator support (Coinbase, Cloudflare, or custom)
 * - Multi-chain support (Base, Solana, Ethereum, etc.)
 * - Dynamic pricing support
 * - Reputation-based access control
 * - Payment Evidence KA publishing to OriginTrail DKG
 * 
 * Usage:
 *   // Simple usage with static pricing
 *   app.get('/api/premium-data', x402Middleware('premium-data'), (req, res) => {
 *     res.json({ data: 'premium content' });
 *   });
 * 
 *   // Advanced usage with dynamic pricing
 *   app.get('/api/dynamic-resource', x402Middleware('dynamic-resource', {
 *     getPrice: (req) => {
 *       // Calculate price based on request context
 *       return { amount: '0.10', currency: 'USDC' };
 *     },
 *     reputationRequirements: {
 *       minReputationScore: 0.8,
 *       minPaymentCount: 5
 *     }
 *   }), (req, res) => {
 *     res.json({ data: 'dynamic content' });
 *   });
 */

const crypto = require('crypto');
const { HTTP402ResponseBuilder, XPaymentHeaderParser, HTTPHeaderUtils } = require('./x402-http-handlers');
const { verifyPaymentAuthorizationSignature, validateAuthorizationTiming } = require('./eip712-signing');

/**
 * x402 Payment Middleware Factory
 * @param {string|Function} resourceIdOrGetter - Resource identifier from accessPolicies, or function to get resource ID dynamically
 * @param {object} options - Middleware options
 * @param {object|Function} options.getPrice - Function to get dynamic price, or object with static price override
 * @param {object} options.reputationRequirements - Reputation requirements for this resource
 * @param {boolean} options.requirePaymentEvidence - Whether to publish payment evidence (default: true)
 * @param {number} options.challengeExpiryMinutes - Challenge expiry in minutes (default: 15)
 * @param {Function} options.onPaymentSuccess - Callback when payment is verified (optional)
 * @param {Function} options.onPaymentFailure - Callback when payment fails (optional)
 * @returns {Function} Express middleware
 */
function x402Middleware(resourceIdOrGetter, options = {}) {
  const {
    getPrice = null, // Function(req) => { amount, currency } or null for static pricing
    reputationRequirements = {},
    requirePaymentEvidence = true,
    challengeExpiryMinutes = 15,
    onPaymentSuccess = null,
    onPaymentFailure = null
  } = options;

  // Initialize HTTP response builders
  const responseBuilder = new HTTP402ResponseBuilder();
  const headerParser = new XPaymentHeaderParser();

  return async (req, res, next) => {
    // Validate that x402 utilities are available
    if (!req.app.locals || !req.app.locals.x402) {
      console.error('[x402] x402 utilities not found in app.locals. Make sure x402 is initialized.');
      return res.status(500).json({
        error: 'Configuration Error',
        code: 'X402_NOT_INITIALIZED',
        message: 'x402 payment system not properly initialized',
        documentation: 'https://x402.org/docs/server-setup'
      });
    }

    const { 
      accessPolicies, 
      paymentChallenges, 
      paymentSettlements,
      paymentProofs,
      validatePaymentProof,
      verifySettlement,
      createPaymentRequest,
      generateChallenge,
      createAndPublishPaymentEvidence,
      validateTransactionWithReputation,
      ENABLE_REPUTATION_FILTER,
      EDGE_PUBLISH_URL,
      FACILITATOR_URL,
      X402_VERSION
    } = req.app.locals.x402;

    // Get resource ID (static or dynamic)
    const resourceId = typeof resourceIdOrGetter === 'function' 
      ? resourceIdOrGetter(req) 
      : resourceIdOrGetter;

    if (!resourceId) {
      return res.status(500).json({ 
        error: 'Configuration Error',
        code: 'INVALID_RESOURCE_ID',
        message: 'Resource ID is required' 
      });
    }

    // Get base policy
    let policy = accessPolicies[resourceId];
    
    if (!policy) {
      return res.status(500).json({ 
        error: 'Configuration Error',
        code: 'POLICY_NOT_FOUND',
        message: `Access policy not found for resource: ${resourceId}` 
      });
    }

    // Apply dynamic pricing if provided
    if (getPrice) {
      try {
        const dynamicPrice = typeof getPrice === 'function' 
          ? await getPrice(req) 
          : getPrice;
        
        if (dynamicPrice && (dynamicPrice.amount || dynamicPrice.currency)) {
          policy = {
            ...policy,
            amount: dynamicPrice.amount || policy.amount,
            currency: dynamicPrice.currency || policy.currency
          };
        }
      } catch (priceError) {
        console.error('[x402] Error calculating dynamic price:', priceError);
        // Fall back to static policy price
      }
    }

    // Check for payment proof in header
    const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
    
    if (!xPaymentHeader) {
      // Return 402 Payment Required using standardized builder
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      
      // Build RFC-compliant 402 response
      const response = responseBuilder.buildPaymentRequired(paymentRequest, {
        retryAfter: 60,
        includeClientGuidance: true,
        vary: ['Accept', 'X-PAYMENT']
      });
      
      // Set all headers
      res.status(response.status);
      for (const [key, value] of Object.entries(response.headers)) {
        res.setHeader(key, value);
      }
      
      return res.json(response.body);
    }

    try {
      // Parse payment proof using standardized parser
      let proof;
      try {
        proof = headerParser.parse(xPaymentHeader);
      } catch (parseError) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        const errorResponse = responseBuilder.buildError(parseError, 402, {
          code: 'INVALID_PAYMENT_HEADER',
          paymentRequest,
          retryable: true,
          retryAfter: 60
        });
        
        res.status(errorResponse.status);
        for (const [key, value] of Object.entries(errorResponse.headers)) {
          res.setHeader(key, value);
        }
        return res.json(errorResponse.body);
      }

      // Validate payment proof structure
      const structureValidation = headerParser.validate(proof);
      if (!structureValidation.valid) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        const errorResponse = responseBuilder.buildError(
          structureValidation.errors.join('; '), 
          402, 
          {
            code: 'INVALID_PAYMENT_PROOF',
            paymentRequest,
            retryable: true,
            retryAfter: 60
          }
        );
        
        res.status(errorResponse.status);
        for (const [key, value] of Object.entries(errorResponse.headers)) {
          res.setHeader(key, value);
        }
        return res.json(errorResponse.body);
      }

      // Validate EIP-712 signature if present
      if (proof.signature && proof.payer) {
        try {
          const timingValidation = validateAuthorizationTiming(proof);
          if (!timingValidation.valid) {
            const challenge = generateChallenge();
            const paymentRequest = createPaymentRequest(policy, challenge);
            
            const errorResponse = responseBuilder.buildError(
              timingValidation.error,
              402,
              {
                code: timingValidation.code || 'AUTHORIZATION_INVALID',
                paymentRequest,
                retryable: true,
                retryAfter: 60
              }
            );
            
            res.status(errorResponse.status);
            for (const [key, value] of Object.entries(errorResponse.headers)) {
              res.setHeader(key, value);
            }
            return res.json(errorResponse.body);
          }

          // Verify EIP-712 signature
          const sigVerification = await verifyPaymentAuthorizationSignature(proof, {
            verifyingContract: null // Can be set per resource if needed
          });

          if (!sigVerification.verified) {
            const challenge = generateChallenge();
            const paymentRequest = createPaymentRequest(policy, challenge);
            
            const errorResponse = responseBuilder.buildError(
              sigVerification.error || 'Invalid payment signature',
              402,
              {
                code: 'INVALID_SIGNATURE',
                paymentRequest,
                retryable: true,
                retryAfter: 60
              }
            );
            
            res.status(errorResponse.status);
            for (const [key, value] of Object.entries(errorResponse.headers)) {
              res.setHeader(key, value);
            }
            return res.json(errorResponse.body);
          }
        } catch (sigError) {
          console.warn('[x402] EIP-712 signature verification error:', sigError);
          // Continue with other validation methods if EIP-712 fails
        }
      }
      
      // Validate payment proof
      if (!proof.challenge) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          code: 'MISSING_CHALLENGE',
          message: 'Payment proof missing challenge field',
          paymentRequest
        });
      }

      // Additional validation using existing validatePaymentProof
      const paymentValidation = validatePaymentProof(proof, proof.challenge);
      if (!paymentValidation.valid) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        const errorResponse = responseBuilder.buildError(
          validation.error || 'Payment proof validation failed',
          402,
          {
            code: 'VALIDATION_FAILED',
            paymentRequest,
            retryable: true,
            retryAfter: 60
          }
        );
        
        res.status(errorResponse.status);
        for (const [key, value] of Object.entries(errorResponse.headers)) {
          res.setHeader(key, value);
        }
        return res.json({
          ...errorResponse.body,
          details: validation
        });
      }

      // Verify settlement
      let settlement;
      try {
        settlement = await verifySettlement(proof);
      } catch (settlementError) {
        console.error('[x402] Settlement verification error:', settlementError);
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          code: 'SETTLEMENT_VERIFICATION_ERROR',
          message: 'Failed to verify payment settlement',
          paymentRequest
        });
      }

      if (!settlement || !settlement.verified) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          code: 'SETTLEMENT_NOT_VERIFIED',
          message: settlement?.error || 'Payment settlement not verified',
          settlementDetails: settlement,
          paymentRequest
        });
      }

      // Reputation-based validation (if enabled)
      if (ENABLE_REPUTATION_FILTER && options.reputationRequirements) {
        const reputationValidation = await validateTransactionWithReputation(
          proof.payer,
          policy.recipient,
          proof.amount,
          policy.resourceUAL,
          EDGE_PUBLISH_URL,
          options.reputationRequirements
        );

        if (!reputationValidation.allowed) {
          const challenge = generateChallenge();
          const paymentRequest = createPaymentRequest(policy, challenge);
          
          res.status(403).setHeader('Retry-After', '60');
          return res.json({
            error: 'Transaction Not Allowed',
            message: reputationValidation.reason,
            reputationCheck: reputationValidation,
            paymentRequest
          });
        }
      }

      // Check for replay attack (txHash already processed)
      if (paymentSettlements.has(proof.txHash)) {
        const existingSettlement = paymentSettlements.get(proof.txHash);
        console.warn(`[x402] Replay attack detected: txHash ${proof.txHash} already processed at ${existingSettlement.timestamp}`);
        
        res.status(409).json({
          error: 'Transaction Already Processed',
          code: 'REPLAY_DETECTED',
          message: 'This transaction hash has already been processed',
          originalTimestamp: existingSettlement.timestamp
        });
        return;
      }

      // Mark as settled (prevent replay)
      paymentSettlements.set(proof.txHash, {
        ...settlement,
        timestamp: Date.now(),
        resourceId,
        policy
      });
      paymentProofs.set(proof.txHash, proof);

      // Publish Payment Evidence KA to DKG (if required)
      let paymentEvidence = null;
      if (requirePaymentEvidence && createAndPublishPaymentEvidence) {
        try {
          const paymentData = {
            txHash: proof.txHash,
            payer: proof.payer,
            recipient: policy.recipient,
            amount: proof.amount,
            currency: proof.currency,
            chain: proof.chain,
            resourceUAL: policy.resourceUAL,
            challenge: proof.challenge,
            facilitatorSig: proof.facilitatorSig,
            signature: proof.signature,
            blockNumber: settlement.blockNumber,
            timestamp: new Date().toISOString()
          };
          
          const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);
          
          paymentEvidence = {
            ual: publishResult.ual,
            txHash: proof.txHash,
            chain: proof.chain,
            verified: true,
            dkgTransactionHash: publishResult.transactionHash,
            published: publishResult.success !== false
          };
        } catch (publishError) {
          console.error('[x402] Failed to publish payment evidence:', publishError);
          // Continue even if publishing fails (payment is still valid)
          paymentEvidence = {
            txHash: proof.txHash,
            chain: proof.chain,
            verified: true,
            published: false,
            error: 'Failed to publish payment evidence to DKG'
          };
        }
      } else {
        paymentEvidence = {
          txHash: proof.txHash,
          chain: proof.chain,
          verified: true,
          published: false
        };
      }

      // Attach payment evidence to request for use in route handler
      req.paymentEvidence = paymentEvidence;
      req.paymentProof = proof;
      req.paymentPolicy = policy;
      req.paymentSettlement = settlement;

      // Call success callback if provided
      if (onPaymentSuccess) {
        try {
          await onPaymentSuccess(req, res, {
            proof,
            settlement,
            paymentEvidence,
            policy
          });
        } catch (callbackError) {
          console.warn('[x402] Payment success callback error:', callbackError);
          // Don't block request if callback fails
        }
      }

      // Continue to route handler
      next();
    } catch (error) {
      console.error('[x402] Error processing payment:', error);
      
      // Log error details for debugging
      if (error.stack) {
        console.error('[x402] Error stack:', error.stack);
      }

      // Call failure callback if provided
      if (onPaymentFailure) {
        try {
          await onPaymentFailure(req, res, error);
        } catch (callbackError) {
          console.warn('[x402] Payment failure callback error:', callbackError);
        }
      }
      
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      
      // Determine if error is retryable
      const isRetryable = !error.code || !['INVALID_SIGNATURE', 'REPLAY_DETECTED'].includes(error.code);
      
      res.status(isRetryable ? 500 : 400)
        .setHeader('Retry-After', '60')
        .setHeader('X-x402-Version', X402_VERSION || '1.0');
      
      return res.json({
        error: 'Payment Processing Error',
        code: error.code || 'PAYMENT_PROCESSING_ERROR',
        message: error.message || 'An error occurred while processing the payment',
        paymentRequest, // Provide new challenge for retry
        retryable: isRetryable,
        details: process.env.NODE_ENV === 'development' ? {
          error: error.message,
          stack: error.stack
        } : undefined
      });
    }
  };
}

/**
 * Helper middleware to extract payment information from request
 * @param {object} req - Express request object
 * @returns {object|null} Payment evidence or null
 */
function getPaymentEvidence(req) {
  return req.paymentEvidence || null;
}

/**
 * Helper middleware to check if request has valid payment
 * @param {object} req - Express request object
 * @returns {boolean} True if payment is valid
 */
function hasValidPayment(req) {
  return !!(req.paymentEvidence && req.paymentEvidence.verified);
}

/**
 * Create a payment middleware with dynamic pricing
 * @param {Function} getPrice - Function(req) => { amount, currency }
 * @param {object} baseOptions - Base middleware options
 * @returns {Function} Express middleware
 */
function x402MiddlewareWithDynamicPricing(getPrice, baseOptions = {}) {
  return x402Middleware('dynamic', {
    ...baseOptions,
    getPrice
  });
}

/**
 * Create a payment middleware that matches the x402-express pattern
 * Similar to: paymentMiddleware(walletAddress, { "GET /endpoint": { price: "$0.10" } })
 * @param {string} walletAddress - Recipient wallet address
 * @param {object} routeConfig - Route configuration object
 * @param {object} globalOptions - Global options (facilitator URL, etc.)
 * @returns {Function} Express middleware factory
 */
function paymentMiddleware(walletAddress, routeConfig, globalOptions = {}) {
  const { url: facilitatorUrl } = globalOptions;
  
  return (req, res, next) => {
    // Match route pattern (e.g., "GET /api/endpoint")
    const routeKey = `${req.method} ${req.path}`;
    const routePolicy = routeConfig[routeKey] || routeConfig[req.path];
    
    if (!routePolicy) {
      // Route not protected, continue
      return next();
    }

    // Extract price from route policy
    const priceStr = routePolicy.price || routePolicy.amount || '0.00';
    const amount = priceStr.replace('$', '').trim();
    const currency = routePolicy.currency || 'USDC';
    const network = routePolicy.network || 'base';
    
    // Create temporary policy for this route
    const tempPolicy = {
      amount,
      currency,
      recipient: walletAddress,
      chains: [network],
      resourceUAL: `urn:ual:dotrep:route:${req.path}`,
      description: routePolicy.description || `Access to ${req.path}`
    };

    // Use x402 middleware with temporary policy
    // Note: This requires accessPolicies to support dynamic addition
    // For now, we'll use a simplified approach
    return x402Middleware('dynamic', {
      getPrice: () => ({ amount, currency }),
      ...globalOptions
    })(req, res, next);
  };
}

module.exports = { 
  x402Middleware,
  x402MiddlewareWithDynamicPricing,
  paymentMiddleware,
  getPaymentEvidence,
  hasValidPayment
};

