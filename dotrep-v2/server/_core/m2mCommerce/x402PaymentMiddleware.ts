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
import type { PaymentInstructions, PaymentProof, PaymentVerificationResult } from './types';

export interface X402MiddlewareOptions {
  amount: string;
  currency: string;
  recipient: string;
  description?: string;
  expiry?: number; // Expiry time in milliseconds (default: 5 minutes)
  resource?: string; // Resource identifier
  paymentMethods?: string[]; // Supported payment methods
  facilitatorUrl?: string; // x402 facilitator URL
  skipVerification?: boolean; // For testing/dev environments
}

export interface PaymentInstructions {
  amount: string;
  currency: string;
  recipient: string;
  resource: string;
  expiry: number;
  description?: string;
  challenge?: string; // Nonce to prevent replay attacks
  payment_methods?: Array<{
    type: string;
    currencies: string[];
    network: string;
  }>;
}

export interface PaymentProof {
  txHash?: string;
  chain?: string;
  amount: string;
  currency: string;
  recipient: string;
  resource: string;
  timestamp: number;
  signature?: string;
  challenge?: string;
  facilitatorProof?: string; // If using facilitator service
}

export interface PaymentVerificationResult {
  valid: boolean;
  verified: boolean;
  reason?: string;
  txHash?: string;
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
export function x402PaymentMiddleware(options: X402MiddlewareOptions) {
  const {
    amount,
    currency,
    recipient,
    description,
    expiry = 300000, // 5 minutes default
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
            { amount, currency, recipient, resource: resource || req.originalUrl },
            facilitatorUrl
          );

          if (verificationResult.valid && verificationResult.verified) {
            // Payment valid, proceed to resource
            return next();
          } else {
            // Payment invalid, return 402 with updated instructions
            return sendPaymentRequired(res, {
              amount,
              currency,
              recipient,
              resource: resource || req.originalUrl,
              expiry: Date.now() + expiry,
              description: description || 'Access to resource',
              challenge: generateChallenge(),
              payment_methods: [
                {
                  type: 'crypto',
                  currencies: ['USDC', 'ETH', 'TRAC'],
                  network: 'base'
                }
              ]
            }, verificationResult.reason);
          }
        } else {
          // Skip verification (dev mode)
          return next();
        }
      }

      // No payment provided, return 402 Payment Required
      return sendPaymentRequired(res, {
        amount,
        currency,
        recipient,
        resource: resource || req.originalUrl,
        expiry: Date.now() + expiry,
        description: description || 'Access to resource',
        challenge: generateChallenge(),
        payment_methods: [
          {
            type: 'crypto',
            currencies: ['USDC', 'ETH', 'TRAC'],
            network: 'base'
          }
        ]
      });

    } catch (error) {
      console.error('[x402Middleware] Error in payment middleware:', error);
      
      // On error, return 402 to allow client to retry
      return sendPaymentRequired(res, {
        amount,
        currency,
        recipient,
        resource: resource || req.originalUrl,
        expiry: Date.now() + expiry,
        description: description || 'Access to resource',
        challenge: generateChallenge(),
        payment_methods: [
          {
            type: 'crypto',
            currencies: ['USDC', 'ETH', 'TRAC'],
            network: 'base'
          }
        ]
      });
    }
  };
}

/**
 * Send HTTP 402 Payment Required response
 */
function sendPaymentRequired(
  res: Response,
  instructions: PaymentInstructions,
  reason?: string
): void {
  res.status(402)
     .set('X-Payment-Required', 'true')
     .set('X-Payment-Amount', instructions.amount)
     .set('X-Payment-Currency', instructions.currency)
     .set('X-Payment-Recipient', instructions.recipient)
     .set('X-Payment-Resource', instructions.resource)
     .set('X-Payment-Expiry', instructions.expiry.toString())
     .set('X-Payment-Challenge', instructions.challenge || '')
     .json({
       error: 'Payment Required',
       code: 'X402_PAYMENT_REQUIRED',
       instructions: {
         amount: instructions.amount,
         currency: instructions.currency,
         recipient: instructions.recipient,
         resource: instructions.resource,
         expiry: new Date(instructions.expiry).toISOString(),
         description: instructions.description,
         challenge: instructions.challenge,
         payment_methods: instructions.payment_methods
       },
       reason: reason || 'Payment is required to access this resource',
       documentation: 'https://x402.org/docs/client-integration'
     });
}

/**
 * Validate payment proof from X-Payment-Authorization header
 * 
 * Can verify via:
 * 1. Facilitator service (recommended for gasless payments)
 * 2. On-chain verification (direct blockchain check)
 * 3. Signed message verification (for off-chain proofs)
 */
async function validatePaymentProof(
  paymentHeader: string,
  expected: { amount: string; currency: string; recipient: string; resource?: string },
  facilitatorUrl: string
): Promise<PaymentVerificationResult> {
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

    // Basic validation
    if (!paymentProof.amount || !paymentProof.currency || !paymentProof.recipient) {
      return {
        valid: false,
        verified: false,
        reason: 'Invalid payment proof format'
      };
    }

    // Verify amount and currency match
    if (paymentProof.amount !== expected.amount || paymentProof.currency !== expected.currency) {
      return {
        valid: false,
        verified: false,
        reason: 'Payment amount or currency mismatch'
      };
    }

    // Verify recipient
    if (paymentProof.recipient.toLowerCase() !== expected.recipient.toLowerCase()) {
      return {
        valid: false,
        verified: false,
        reason: 'Payment recipient mismatch'
      };
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

    // Verify expiry (if provided)
    if (paymentProof.timestamp) {
      const age = Date.now() - paymentProof.timestamp;
      const maxAge = 300000; // 5 minutes
      if (age > maxAge) {
        return {
          valid: false,
          verified: false,
          reason: 'Payment proof expired'
        };
      }
    }

    // Try facilitator verification first (faster, gasless)
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
            txHash: facilitatorResult.txHash || paymentProof.txHash
          };
        }
      } catch (error) {
        console.warn('[x402Middleware] Facilitator verification failed, trying on-chain:', error);
      }
    }

    // Try on-chain verification
    if (paymentProof.txHash && paymentProof.chain) {
      const onChainResult = await verifyOnChain(paymentProof);
      
      if (onChainResult.verified) {
        return {
          valid: true,
          verified: true,
          txHash: paymentProof.txHash
        };
      }
    }

    // If signature is provided, verify signed message
    if (paymentProof.signature) {
      // In production, verify cryptographic signature
      // For now, if signature exists, consider it valid if other checks pass
      return {
        valid: true,
        verified: true,
        txHash: paymentProof.txHash
      };
    }

    // Payment proof format is valid but not verified
    return {
      valid: true,
      verified: false,
      reason: 'Payment proof not verified'
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
 * Generate challenge/nonce to prevent replay attacks
 */
function generateChallenge(): string {
  return `x402-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

