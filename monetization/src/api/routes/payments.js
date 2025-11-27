/**
 * Payment Routes
 * x402 payment endpoints and verification
 */

import express from 'express';
import { paymentFacilitator } from '../../services/paymentFacilitator.js';
import { verifyPaymentProof } from '../../middleware/verifyPaymentMiddleware.js';

const router = express.Router();

/**
 * POST /payments/submit
 * Submit a payment (facilitator endpoint)
 */
router.post('/submit', async (req, res) => {
  try {
    const { paymentRequest } = req.body;

    if (!paymentRequest) {
      return res.status(400).json({
        error: 'Missing paymentRequest',
      });
    }

    const result = await paymentFacilitator.submitPayment(paymentRequest);

    res.json({
      success: true,
      txHash: result.txHash,
      status: result.status,
      simulated: result.simulated || false,
    });
  } catch (error) {
    console.error('Payment submission error:', error);
    res.status(500).json({
      error: 'Payment submission failed',
      message: error.message,
    });
  }
});

/**
 * GET /payments/:txHash
 * Get payment status
 */
router.get('/:txHash', async (req, res) => {
  try {
    const { txHash } = req.params;
    const payment = await paymentFacilitator.getPayment(txHash);

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
      });
    }

    res.json({
      txHash: payment.txHash,
      amount: payment.amount,
      token: payment.token,
      recipient: payment.recipient,
      status: payment.status,
      reference: payment.reference,
      timestamp: payment.timestamp,
    });
  } catch (error) {
    console.error('Payment lookup error:', error);
    res.status(500).json({
      error: 'Payment lookup failed',
      message: error.message,
    });
  }
});

/**
 * POST /payments/verify
 * Verify a payment proof
 */
router.post('/verify', async (req, res) => {
  try {
    const { proof } = req.body;

    if (!proof) {
      return res.status(400).json({
        error: 'Missing payment proof',
      });
    }

    const proofHeader = typeof proof === 'string' ? proof : JSON.stringify(proof);
    const verification = await verifyPaymentProof(proofHeader);

    if (verification.valid) {
      res.json({
        valid: true,
        payment: {
          txHash: verification.txHash,
          payer: verification.payer,
          amount: verification.amount,
          token: verification.token,
        },
      });
    } else {
      res.status(402).json({
        valid: false,
        error: verification.error,
      });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      error: 'Payment verification failed',
      message: error.message,
    });
  }
});

export default router;

