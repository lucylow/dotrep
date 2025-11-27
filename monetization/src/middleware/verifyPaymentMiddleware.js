/**
 * Payment Verification Middleware
 * Validates X-Payment-Proof header with signature and on-chain verification
 */

import { parsePaymentProofHeader } from '../utils/x402Helpers.js';
import { verifyPaymentProofSignature, isValidAddress } from '../utils/cryptoHelpers.js';
import { paymentFacilitator } from '../services/paymentFacilitator.js';

/**
 * Verify payment proof from X-Payment-Proof header
 * @param {string} proofHeader - X-Payment-Proof header value
 * @param {Object} paymentRequest - Original payment request (for validation)
 * @returns {Promise<Object>} Verification result
 */
export async function verifyPaymentProof(proofHeader, paymentRequest = null) {
  try {
    // Parse the proof header
    const proof = parsePaymentProofHeader(proofHeader);

    // Validate addresses
    if (!isValidAddress(proof.signedBy)) {
      return {
        valid: false,
        error: 'Invalid signer address in payment proof',
      };
    }

    // Get payment transaction details
    const paymentTx = await paymentFacilitator.getPayment(proof.txHash);
    
    if (!paymentTx) {
      return {
        valid: false,
        error: 'Payment transaction not found',
      };
    }

    // If payment request is provided, validate against it
    if (paymentRequest) {
      const validation = await paymentFacilitator.validatePaymentForRequest(
        proof.txHash,
        paymentRequest
      );

      if (!validation.valid) {
        return {
          valid: false,
          error: validation.error || 'Payment does not match request',
        };
      }
    }

    // Verify EIP-712 signature
    // Note: We need the nonce from the original payment request
    // For now, we'll use the nonce from proof if available, or skip nonce check
    const nonce = proof.nonce || paymentTx.nonce || '';
    const reference = paymentTx.reference || '';

    const signatureValid = await verifyPaymentProofSignature(
      proof.txHash,
      nonce,
      reference,
      proof.proofSignature,
      proof.signedBy
    );

    if (!signatureValid) {
      return {
        valid: false,
        error: 'Invalid payment proof signature',
      };
    }

    // Check for replay attacks (nonce should be used once)
    // In production, maintain a nonce registry
    // For now, we'll rely on expiry and txHash uniqueness

    return {
      valid: true,
      txHash: proof.txHash,
      payer: proof.signedBy,
      amount: paymentTx.amount,
      token: paymentTx.token,
      reference: paymentTx.reference,
      chain: proof.chain,
    };
  } catch (error) {
    console.error('Payment proof verification error:', error);
    return {
      valid: false,
      error: error.message || 'Payment proof verification failed',
    };
  }
}

/**
 * Express middleware to verify payment proof
 * Attaches payment info to req.payment if valid
 */
export function verifyPaymentMiddleware(req, res, next) {
  const proofHeader = req.headers['x-payment-proof'];

  if (!proofHeader) {
    return res.status(402).json({
      error: 'Payment proof required',
      message: 'Include X-Payment-Proof header with your payment proof',
    });
  }

  verifyPaymentProof(proofHeader)
    .then((result) => {
      if (result.valid) {
        req.payment = {
          txHash: result.txHash,
          payer: result.payer,
          amount: result.amount,
          token: result.token,
          reference: result.reference,
        };
        next();
      } else {
        res.status(402).json({
          error: 'Invalid payment proof',
          message: result.error,
        });
      }
    })
    .catch((error) => {
      console.error('Payment verification middleware error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    });
}

