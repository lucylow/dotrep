/**
 * x402 Payment Middleware
 * Easy-to-use middleware for protecting endpoints with x402 payments
 * 
 * Usage:
 *   app.get('/api/premium-data', x402Middleware('premium-data'), (req, res) => {
 *     res.json({ data: 'premium content' });
 *   });
 */

const crypto = require('crypto');

/**
 * x402 Payment Middleware Factory
 * @param {string} resourceId - Resource identifier from accessPolicies
 * @param {object} options - Middleware options
 * @returns {Function} Express middleware
 */
function x402Middleware(resourceId, options = {}) {
  return async (req, res, next) => {
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

    const policy = accessPolicies[resourceId];
    
    if (!policy) {
      return res.status(500).json({ 
        error: 'Configuration Error', 
        message: `Access policy not found for resource: ${resourceId}` 
      });
    }

    // Check for payment proof in header
    const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
    
    if (!xPaymentHeader) {
      // Return 402 Payment Required
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      
      res.status(402).setHeader('Retry-After', '60');
      return res.json({
        error: 'Payment Required',
        paymentRequest,
        message: `Include X-PAYMENT header with payment transaction proof to access this resource`
      });
    }

    try {
      // Parse payment proof
      const proof = typeof xPaymentHeader === 'string' 
        ? JSON.parse(xPaymentHeader) 
        : xPaymentHeader;
      
      // Validate payment proof
      const validation = validatePaymentProof(proof, proof.challenge);
      if (!validation.valid) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          message: validation.error,
          paymentRequest
        });
      }

      // Verify settlement
      const settlement = await verifySettlement(proof);
      if (!settlement.verified) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          message: 'Payment settlement not verified',
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

      // Mark as settled (prevent replay)
      paymentSettlements.set(proof.txHash, {
        ...settlement,
        timestamp: Date.now()
      });
      paymentProofs.set(proof.txHash, proof);

      // Publish Payment Evidence KA to DKG
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

      // Attach payment evidence to request for use in route handler
      req.paymentEvidence = {
        ual: publishResult.ual,
        txHash: proof.txHash,
        chain: proof.chain,
        verified: true,
        dkgTransactionHash: publishResult.transactionHash
      };

      // Continue to route handler
      next();
    } catch (error) {
      console.error('Error processing payment:', error);
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      
      res.status(402).setHeader('Retry-After', '60');
      return res.json({
        error: 'Payment Required',
        message: 'Invalid payment proof format',
        paymentRequest
      });
    }
  };
}

module.exports = { x402Middleware };

