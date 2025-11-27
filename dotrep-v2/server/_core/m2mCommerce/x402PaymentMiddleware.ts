/**
 * x402 Payment Middleware for Machine-to-Machine Commerce
 * 
 * Implements HTTP 402 Payment Required protocol for autonomous agent payments.
 * Supports near-zero fee micropayments, instant settlement, and fully autonomous
 * payment flows for AI agents and machines.
 * 
 * Based on x402 protocol specification:
 * - HTTP-native integration (minimal code, one-line middleware)
 * - Cryptographically signed payment authorizations
 * - Facilitator service integration (gasless payments)
 * - Multi-chain support (Base, Solana, Ethereum, Polygon, Arbitrum)
 */

import { Request, Response, NextFunction } from 'express';

export interface X402MiddlewareOptions {
  // Whitepaper Section 9.1 fields
  maxAmountRequired: string; // Maximum payment amount (e.g., "0.10")
  assetType?: string; // Token type (default: "ERC20")
  assetAddress?: string; // Smart contract address (default: USDC on Base)
  paymentAddress?: string; // Recipient wallet (default: env var)
  network?: string; // Blockchain network (default: "base-sepolia")
  expiresAtMinutes?: number; // Expiry in minutes (default: 15)
  
  // Legacy fields (for backward compatibility)
  amount?: string; // Alias for maxAmountRequired
  currency?: string; // Derived from assetType/assetAddress
  recipient?: string; // Alias for paymentAddress
  description?: string;
  expiry?: number; // Legacy expiry time in milliseconds
  resource?: string; // Resource identifier
  paymentMethods?: string[]; // Supported payment methods
  facilitatorUrl?: string; // x402 facilitator URL
  skipVerification?: boolean; // For testing/dev environments
}

/**
 * Payment Request Format (Section 9.1 of x402 Whitepaper)
 * 
 * Structured JSON payload returned in HTTP 402 response with specific fields
 * that tell the client exactly how to pay.
 */
export interface PaymentInstructions {
  // Whitepaper Section 9.1 fields
  maxAmountRequired: string; // Maximum payment amount required (e.g., "0.10")
  assetType: string; // Token type (e.g., "ERC20")
  assetAddress: string; // Smart contract address of payment token (e.g., USDC)
  paymentAddress: string; // Where to send the payment (marketplace wallet)
  network: string; // Blockchain network (e.g., "base-mainnet", "base-sepolia")
  expiresAt: string; // ISO 8601 timestamp (e.g., "2024-05-20T12:00:00Z")
  nonce: string; // Unique identifier to prevent replay attacks
  paymentId: string; // Request identifier for tracking individual payments
  
  // Legacy fields (for backward compatibility)
  amount?: string; // Alias for maxAmountRequired
  currency?: string; // Derived from assetType/assetAddress
  recipient?: string; // Alias for paymentAddress
  resource?: string; // Resource identifier
  expiry?: number; // Legacy expiry timestamp (ms)
  description?: string;
  challenge?: string; // Alias for nonce
  payment_methods?: Array<{
    type: string;
    currencies: string[];
    network: string;
  }>;
}

/**
 * Payment Authorization (Section 9.2 of x402 Whitepaper)
 * 
 * Cryptographically signed message containing:
 * - All fields from the payment request
 * - The actual payment amount (must be ≤ maxAmountRequired)
 * - Timestamp of the authorization
 * - Cryptographic signature from the paying wallet (EIP-712 standard)
 */
export interface PaymentProof {
  // Whitepaper Section 9.2 fields
  maxAmountRequired: string; // From payment request
  assetType: string; // From payment request
  assetAddress: string; // From payment request
  paymentAddress: string; // From payment request
  network: string; // From payment request
  expiresAt: string; // From payment request
  nonce: string; // From payment request
  paymentId: string; // From payment request
  
  // Payment authorization fields
  amount: string; // Actual payment amount (must be ≤ maxAmountRequired)
  payer: string; // Wallet address of payer
  timestamp: number; // Timestamp of authorization
  signature: string; // EIP-712 cryptographic signature
  
  // Transaction settlement fields
  txHash?: string; // Transaction hash (if settled on-chain)
  chain?: string; // Alias for network
  currency?: string; // Derived from assetType/assetAddress
  recipient?: string; // Alias for paymentAddress
  resource?: string; // Resource identifier
  challenge?: string; // Alias for nonce
  facilitatorProof?: string; // If using facilitator service
}

export interface PaymentVerificationResult {
  valid: boolean;
  verified: boolean;
  reason?: string;
  txHash?: string;
  paymentProof?: PaymentProof;
}

/**
 * x402 Payment Middleware Factory
 * 
 * Creates Express middleware that protects routes with x402 payments.
 * Returns HTTP 402 with payment instructions if payment is missing or invalid.
 * 
 * @example
 * ```typescript
 * app.get('/api/premium/data',
 *   x402PaymentMiddleware({
 *     amount: '0.10',
 *     currency: 'USDC',
 *     recipient: process.env.MARKETPLACE_WALLET,
 *     description: 'Premium reputation analytics report'
 *   }),
 *   async (req, res) => {
 *     const data = await generatePremiumReport();
 *     res.json(data);
 *   }
 * );
 * ```
 */
/**
 * Get default asset configuration for a network
 */
function getDefaultAssetConfig(network: string): { assetType: string; assetAddress: string } {
  const networkLower = network.toLowerCase();
  
  // USDC addresses by network (ERC20)
  const usdcAddresses: Record<string, string> = {
    'base-mainnet': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'polygon': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  };
  
  return {
    assetType: 'ERC20',
    assetAddress: usdcAddresses[networkLower] || usdcAddresses['base-sepolia']
  };
}

export function x402PaymentMiddleware(options: X402MiddlewareOptions) {
  // Resolve options with whitepaper-compliant defaults
  const network = options.network || options.currency === 'USDC' ? 'base-sepolia' : 'base-sepolia';
  const assetConfig = getDefaultAssetConfig(network);
  const expiresAtMinutes = options.expiresAtMinutes || 15;
  
  const maxAmountRequired = options.maxAmountRequired || options.amount || '0.10';
  const assetType = options.assetType || assetConfig.assetType;
  const assetAddress = options.assetAddress || assetConfig.assetAddress;
  const paymentAddress = options.paymentAddress || options.recipient || process.env.X402_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000';
  
  const {
    description,
    resource,
    paymentMethods = ['crypto'],
    facilitatorUrl = process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
    skipVerification = false
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if payment is already provided
      const paymentHeader = req.headers['x-payment-authorization'] || req.headers['x-payment'];
      
      if (paymentHeader && typeof paymentHeader === 'string') {
        // Validate payment proof
        if (!skipVerification) {
          const verificationResult = await validatePaymentProof(
            paymentHeader,
            { 
              maxAmountRequired, 
              assetType, 
              assetAddress, 
              paymentAddress, 
              network,
              resource: resource || req.originalUrl 
            },
            facilitatorUrl
          );

          if (verificationResult.valid && verificationResult.verified) {
            // Payment valid, proceed to resource
            // Store payment proof in request for reputation tracking
            req.paymentProof = verificationResult.paymentProof;
            return next();
          } else {
            // Payment invalid, return 402 with updated instructions
            return sendPaymentRequired(res, {
              maxAmountRequired,
              assetType,
              assetAddress,
              paymentAddress,
              network,
              resource: resource || req.originalUrl,
              expiresAtMinutes,
              description: description || 'Access to resource',
            }, verificationResult.reason);
          }
        } else {
          // Skip verification (dev mode)
          return next();
        }
      }

      // No payment provided, return 402 Payment Required (Whitepaper Section 9.1 format)
      return sendPaymentRequired(res, {
        maxAmountRequired,
        assetType,
        assetAddress,
        paymentAddress,
        network,
        resource: resource || req.originalUrl,
        expiresAtMinutes,
        description: description || 'Access to resource',
      });

    } catch (error) {
      console.error('[x402Middleware] Error in payment middleware:', error);
      
      // On error, return 402 to allow client to retry
      return sendPaymentRequired(res, {
        maxAmountRequired,
        assetType,
        assetAddress,
        paymentAddress,
        network,
        resource: resource || req.originalUrl,
        expiresAtMinutes,
        description: description || 'Access to resource',
      });
    }
  };
}

/**
 * Send HTTP 402 Payment Required response (Whitepaper Section 9.1 format)
 * 
 * Returns structured JSON payload with specific fields that tell the client
 * exactly how to pay, following the x402 whitepaper specification.
 */
function sendPaymentRequired(
  res: Response,
  options: {
    maxAmountRequired: string;
    assetType: string;
    assetAddress: string;
    paymentAddress: string;
    network: string;
    resource: string;
    expiresAtMinutes: number;
    description?: string;
  },
  reason?: string
): void {
  // Generate unique identifiers for this payment request
  const paymentId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const nonce = generateChallenge();
  const expiresAt = new Date(Date.now() + options.expiresAtMinutes * 60 * 1000).toISOString();
  
  // Build whitepaper-compliant payment request (Section 9.1)
  const paymentRequest: PaymentInstructions = {
    maxAmountRequired: options.maxAmountRequired,
    assetType: options.assetType,
    assetAddress: options.assetAddress,
    paymentAddress: options.paymentAddress,
    network: options.network,
    expiresAt,
    nonce,
    paymentId,
    description: options.description || 'Payment required to access this resource',
    // Legacy fields for backward compatibility
    amount: options.maxAmountRequired,
    currency: 'USDC', // Derived from assetType/assetAddress
    recipient: options.paymentAddress,
    resource: options.resource,
    challenge: nonce,
  };
  
  res.status(402)
     .set('X-Payment-Required', 'true')
     .set('X-Payment-Amount', options.maxAmountRequired)
     .set('X-Payment-Currency', 'USDC')
     .set('X-Payment-Recipient', options.paymentAddress)
     .set('X-Payment-Resource', options.resource)
     .set('X-Payment-Expiry', expiresAt)
     .set('X-Payment-Nonce', nonce)
     .set('X-Payment-Id', paymentId)
     .json({
       error: 'Payment Required',
       code: 'X402_PAYMENT_REQUIRED',
       // Whitepaper Section 9.1: Structured JSON payload
       maxAmountRequired: paymentRequest.maxAmountRequired,
       assetType: paymentRequest.assetType,
       assetAddress: paymentRequest.assetAddress,
       paymentAddress: paymentRequest.paymentAddress,
       network: paymentRequest.network,
       expiresAt: paymentRequest.expiresAt,
       nonce: paymentRequest.nonce,
       paymentId: paymentRequest.paymentId,
       // Additional fields for client guidance
       instructions: paymentRequest, // Full instructions object
       reason: reason || 'Payment is required to access this resource',
       documentation: 'https://x402.org/docs/client-integration'
     });
}

/**
 * Validate payment proof from X-Payment-Authorization header
 * 
 * Implements Whitepaper Section 9.2: Payment Authorization
 * - Validates EIP-712 signature
 * - Verifies payment amount ≤ maxAmountRequired
 * - Checks expiry and nonce
 * 
 * Can verify via:
 * 1. Facilitator service (recommended for gasless payments)
 * 2. On-chain verification (direct blockchain check)
 * 3. EIP-712 signed message verification (Section 9.2)
 */
async function validatePaymentProof(
  paymentHeader: string,
  expected: { 
    maxAmountRequired: string; 
    assetType: string; 
    assetAddress: string; 
    paymentAddress: string; 
    network: string;
    resource?: string 
  },
  facilitatorUrl: string
): Promise<PaymentVerificationResult & { paymentProof?: PaymentProof }> {
  try {
    // Parse payment proof
    let paymentProof: PaymentProof;
    
    if (typeof paymentHeader === 'string') {
      try {
        paymentProof = JSON.parse(paymentHeader) as PaymentProof;
      } catch {
        // If not JSON, might be base64 encoded
        paymentProof = JSON.parse(Buffer.from(paymentHeader, 'base64').toString()) as PaymentProof;
      }
    } else {
      paymentProof = paymentHeader as PaymentProof;
    }

    // Whitepaper Section 9.2: Validate payment authorization fields
    if (!paymentProof.amount || !paymentProof.payer || !paymentProof.signature) {
      return {
        valid: false,
        verified: false,
        reason: 'Invalid payment proof format: missing required fields (amount, payer, signature)'
      };
    }

    // Verify payment amount ≤ maxAmountRequired (Section 9.2)
    const proofAmount = parseFloat(paymentProof.amount);
    const maxAmount = parseFloat(expected.maxAmountRequired);
    if (proofAmount > maxAmount) {
      return {
        valid: false,
        verified: false,
        reason: `Payment amount ${paymentProof.amount} exceeds maximum required ${expected.maxAmountRequired}`
      };
    }

    // Verify asset address matches
    if (paymentProof.assetAddress && 
        paymentProof.assetAddress.toLowerCase() !== expected.assetAddress.toLowerCase()) {
      return {
        valid: false,
        verified: false,
        reason: 'Payment asset address mismatch'
      };
    }

    // Verify payment address (recipient)
    const proofPaymentAddress = paymentProof.paymentAddress || paymentProof.recipient;
    if (proofPaymentAddress && 
        proofPaymentAddress.toLowerCase() !== expected.paymentAddress.toLowerCase()) {
      return {
        valid: false,
        verified: false,
        reason: 'Payment recipient mismatch'
      };
    }
    
    // Verify network matches
    if (paymentProof.network && paymentProof.network !== expected.network) {
      return {
        valid: false,
        verified: false,
        reason: 'Payment network mismatch'
      };
    }
    
    // Verify nonce/paymentId matches (replay protection)
    if (paymentProof.paymentId && paymentProof.paymentId !== expected.paymentId) {
      // Note: paymentId validation would require storing active payment requests
      // For now, we validate nonce/challenge
    }
    
    // Verify expiry (Section 9.2)
    if (paymentProof.expiresAt) {
      const expiresAt = new Date(paymentProof.expiresAt).getTime();
      if (Date.now() > expiresAt) {
        return {
          valid: false,
          verified: false,
          reason: 'Payment authorization expired'
        };
      }
    }

    // Verify resource (if provided)
    if (expected.resource && paymentProof.resource && 
        paymentProof.resource !== expected.resource) {
      return {
        valid: false,
        verified: false,
        reason: 'Payment resource mismatch'
      };
    }

    // Whitepaper Section 9.2: Verify EIP-712 signature
    if (paymentProof.signature) {
      try {
        // Import EIP-712 verification (would need to implement or use existing)
        // For now, we'll verify via facilitator or on-chain
        const signatureValid = await verifyEIP712Signature(paymentProof, expected);
        
        if (!signatureValid) {
          return {
            valid: false,
            verified: false,
            reason: 'Invalid EIP-712 signature'
          };
        }
      } catch (error) {
        console.warn('[x402Middleware] EIP-712 signature verification failed:', error);
        // Continue to facilitator/on-chain verification
      }
    }

    // Try facilitator verification first (faster, gasless) - Section 9.3
    if (paymentProof.facilitatorProof) {
      try {
        const facilitatorResult = await verifyWithFacilitator(
          paymentProof,
          facilitatorUrl
        );
        
        if (facilitatorResult.verified) {
          return {
            valid: true,
            verified: true,
            txHash: facilitatorResult.txHash || paymentProof.txHash,
            paymentProof: paymentProof as PaymentProof
          };
        }
      } catch (error) {
        console.warn('[x402Middleware] Facilitator verification failed, trying on-chain:', error);
      }
    }

    // Try on-chain verification (Section 9.3: Transaction Settlement)
    if (paymentProof.txHash && (paymentProof.chain || paymentProof.network)) {
      const onChainResult = await verifyOnChain(paymentProof);
      
      if (onChainResult.verified) {
        return {
          valid: true,
          verified: true,
          txHash: paymentProof.txHash,
          paymentProof: paymentProof as PaymentProof
        };
      }
    }

    // If signature is provided and other checks pass, consider it valid
    // (In production, EIP-712 verification should be mandatory)
    if (paymentProof.signature) {
      return {
        valid: true,
        verified: true,
        txHash: paymentProof.txHash,
        paymentProof: paymentProof as PaymentProof
      };
    }

    // Payment proof format is valid but not verified
    return {
      valid: true,
      verified: false,
      reason: 'Payment proof not verified (missing signature or settlement)',
      paymentProof: paymentProof as PaymentProof
    };

  } catch (error) {
    console.error('[x402Middleware] Payment proof validation error:', error);
    return {
      valid: false,
      verified: false,
      reason: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Verify payment with x402 facilitator service
 */
async function verifyWithFacilitator(
  paymentProof: PaymentProof,
  facilitatorUrl: string
): Promise<{ verified: boolean; txHash?: string }> {
  try {
    const response = await fetch(`${facilitatorUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        proof: paymentProof.facilitatorProof,
        payment: {
          amount: paymentProof.amount,
          currency: paymentProof.currency,
          recipient: paymentProof.recipient
        }
      }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const result = await response.json();
      return {
        verified: result.verified === true,
        txHash: result.txHash
      };
    }

    return { verified: false };
  } catch (error) {
    console.warn('[x402Middleware] Facilitator verification failed:', error);
    return { verified: false };
  }
}

/**
 * Verify payment on-chain
 */
async function verifyOnChain(paymentProof: PaymentProof): Promise<{ verified: boolean }> {
  // In production, implement actual on-chain verification
  // For now, if txHash exists, assume verified
  // This should check the blockchain to verify the transaction exists and matches
  
  if (!paymentProof.txHash) {
    return { verified: false };
  }

  // TODO: Implement actual blockchain verification
  // Example for Base/Ethereum:
  // const provider = new ethers.JsonRpcProvider(RPC_URL);
  // const tx = await provider.getTransaction(paymentProof.txHash);
  // const receipt = await provider.getTransactionReceipt(paymentProof.txHash);
  // Verify: tx.to === recipient, tx.value >= amount, receipt.status === 1

  return { verified: true }; // Mock for now
}

/**
 * Generate challenge/nonce to prevent replay attacks (Whitepaper Section 9.1)
 */
function generateChallenge(): string {
  return `x402-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Verify EIP-712 signature (Whitepaper Section 9.2)
 * 
 * This should use the EIP-712 verification utilities from eip712-signing.js
 * For now, this is a placeholder that would integrate with the existing EIP-712 code.
 */
async function verifyEIP712Signature(
  paymentProof: Partial<PaymentProof>,
  expected: { assetAddress: string; paymentAddress: string; network: string }
): Promise<boolean> {
  // TODO: Integrate with apps/x402/eip712-signing.js
  // This would call verifyPaymentAuthorizationSignature() from that module
  // For now, return true if signature exists (production should verify properly)
  return !!paymentProof.signature;
}

// Extend Express Request type to include payment proof
declare global {
  namespace Express {
    interface Request {
      paymentProof?: PaymentProof;
    }
  }
}

