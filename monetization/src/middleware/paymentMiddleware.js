/**
 * x402 Payment Middleware
 * Implements HTTP 402 Payment Required with X-Payment-Request header
 */

import { verifyPaymentProof } from '../middleware/verifyPaymentMiddleware.js';
import {
  createPaymentRequest,
  formatPaymentRequestHeader,
  isPaymentRequestExpired,
} from '../utils/x402Helpers.js';

/**
 * Express middleware to require payment for protected resources
 * @param {Object} priceObj - Price configuration
 * @param {string} priceObj.amount - Payment amount (e.g., "0.01")
 * @param {string} priceObj.token - Token symbol (e.g., "USDC")
 * @param {string} priceObj.recipient - Recipient address (optional, uses config default)
 * @param {string} priceObj.reference - Resource reference ID (optional, auto-generated)
 * @param {number} priceObj.expiresInMinutes - Expiry in minutes (default: 15)
 * @returns {Function} Express middleware
 */
export function requirePayment(priceObj) {
  return async (req, res, next) => {
    try {
      // Check if payment proof is already provided
      const paymentProofHeader = req.headers['x-payment-proof'];
      
      if (paymentProofHeader) {
        // Verify the payment proof
        const verificationResult = await verifyPaymentProof(
          paymentProofHeader,
          priceObj
        );

        if (verificationResult.valid) {
          // Attach payment info to request
          req.payment = {
            txHash: verificationResult.txHash,
            payer: verificationResult.payer,
            amount: verificationResult.amount,
            token: verificationResult.token,
            reference: verificationResult.reference,
          };
          return next();
        } else {
          return res.status(402).json({
            error: 'Invalid payment proof',
            message: verificationResult.error,
            paymentRequest: createPaymentRequestObject(req, priceObj),
          });
        }
      }

      // No payment proof - return 402 Payment Required
      const paymentRequest = createPaymentRequestObject(req, priceObj);
      
      // Check if request has expired (if retrying with same nonce)
      if (paymentRequest.expiresAt && isPaymentRequestExpired(paymentRequest)) {
        // Generate new payment request
        const newPaymentRequest = createPaymentRequestObject(req, priceObj);
        return send402Response(res, newPaymentRequest);
      }

      return send402Response(res, paymentRequest);
    } catch (error) {
      console.error('Payment middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error.message,
      });
    }
  };
}

/**
 * Create payment request object for a resource
 * @param {Object} req - Express request
 * @param {Object} priceObj - Price configuration
 * @returns {Object} Payment request
 */
function createPaymentRequestObject(req, priceObj) {
  // Generate reference if not provided
  const reference = priceObj.reference || 
    `${req.path}:${Date.now()}`;

  return createPaymentRequest({
    amount: priceObj.amount,
    token: priceObj.token,
    recipient: priceObj.recipient,
    reference,
    resource: req.path,
    expiresInMinutes: priceObj.expiresInMinutes || 15,
  });
}

/**
 * Send HTTP 402 Payment Required response
 * @param {Object} res - Express response
 * @param {Object} paymentRequest - Payment request object
 */
function send402Response(res, paymentRequest) {
  const headerValue = formatPaymentRequestHeader(paymentRequest);

  res.status(402)
    .set('X-Payment-Request', headerValue)
    .set('Content-Type', 'application/json')
    .json({
      message: 'Payment required',
      paymentRequest: {
        amount: paymentRequest.amount,
        token: paymentRequest.token,
        recipient: paymentRequest.recipient,
        reference: paymentRequest.reference,
        nonce: paymentRequest.nonce,
        expiresAt: new Date(paymentRequest.expiresAt).toISOString(),
        resource: paymentRequest.resource,
      },
      instructions: {
        step1: 'Read the X-Payment-Request header',
        step2: 'Submit payment transaction to the specified recipient',
        step3: 'Sign the payment proof using EIP-712',
        step4: 'Retry the request with X-Payment-Proof header',
      },
    });
}

