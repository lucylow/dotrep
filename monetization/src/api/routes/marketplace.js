/**
 * Marketplace Routes
 * Trusted feed and marketplace endpoints with payment gating
 */

import express from 'express';
import { requirePayment } from '../../middleware/paymentMiddleware.js';
import { generateReferenceId } from '../../utils/x402Helpers.js';
import { publishKnowledgeAsset } from '../../services/dkgPublisher.js';
import { getReputationFor } from '../../services/reputationService.js';
import config from '../../utils/config.js';

const router = express.Router();

/**
 * GET /trusted-feed/:creatorId
 * Get trusted feed for a creator (payment-gated)
 */
router.get('/trusted-feed/:creatorId', 
  requirePayment({
    amount: '0.01',
    token: 'USDC',
    expiresInMinutes: 15,
  }),
  async (req, res) => {
    try {
      const { creatorId } = req.params;
      
      // Payment middleware has already verified payment and attached req.payment
      const payment = req.payment;

      // Generate feed data (in production, fetch from DKG or database)
      const feed = await generateTrustedFeed(creatorId);

      // Publish ReceiptAsset to DKG
      const receiptUAL = await publishReceiptAsset(payment, creatorId);

      res.json({
        feed,
        receiptUAL,
        payment: {
          txHash: payment.txHash,
          amount: payment.amount,
          token: payment.token,
        },
      });
    } catch (error) {
      console.error('Trusted feed error:', error);
      res.status(500).json({
        error: 'Failed to generate trusted feed',
        message: error.message,
      });
    }
  }
);

/**
 * POST /offer
 * Create a marketplace offer (requires auth in production)
 */
router.post('/offer', async (req, res) => {
  try {
    const { creatorId, title, description, price, token } = req.body;

    // TODO: Add authentication middleware
    // TODO: Validate creator reputation meets minimum threshold

    const offer = {
      id: generateOfferId(),
      creatorId,
      title,
      description,
      price,
      token: token || 'USDC',
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    // In production, save to database
    // For now, return the offer

    res.json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error('Offer creation error:', error);
    res.status(500).json({
      error: 'Offer creation failed',
      message: error.message,
    });
  }
});

/**
 * POST /endorsement
 * Finalize endorsement deal using escrow flow
 */
router.post('/endorsement', async (req, res) => {
  try {
    const { offerId, buyerAddress, amount } = req.body;

    // TODO: Validate offer exists and is active
    // TODO: Create escrow deposit

    const referenceId = `endorsement:${offerId}:${Date.now()}`;

    // In production, call escrowService.deposit()
    // For now, simulate

    res.json({
      success: true,
      referenceId,
      message: 'Endorsement deal initiated. Funds held in escrow.',
    });
  } catch (error) {
    console.error('Endorsement error:', error);
    res.status(500).json({
      error: 'Endorsement creation failed',
      message: error.message,
    });
  }
});

/**
 * Generate trusted feed for a creator
 * @param {string} creatorId - Creator identifier
 * @returns {Promise<Array>} Feed items
 */
async function generateTrustedFeed(creatorId) {
  // In production, fetch from DKG or database
  // For now, return mock data
  const reputation = await getReputationFor(creatorId);

  return [
    {
      id: 'feed1',
      creatorId,
      title: 'Trusted Content Item 1',
      content: 'This is premium content from a trusted creator.',
      reputation: reputation.finalScore,
      timestamp: new Date().toISOString(),
    },
    {
      id: 'feed2',
      creatorId,
      title: 'Trusted Content Item 2',
      content: 'Another high-quality piece of content.',
      reputation: reputation.finalScore,
      timestamp: new Date().toISOString(),
    },
  ];
}

/**
 * Publish ReceiptAsset to DKG
 * @param {Object} payment - Payment information
 * @param {string} creatorId - Creator identifier
 * @returns {Promise<string>} Receipt UAL
 */
async function publishReceiptAsset(payment, creatorId) {
  const receiptAsset = {
    '@context': 'https://schema.org',
    '@type': 'ReceiptAsset',
    id: `urn:ual:dotrep:receipt:${payment.txHash.slice(2, 18)}`,
    txHash: payment.txHash,
    payer: payment.payer,
    amount: payment.amount,
    token: payment.token,
    recipient: payment.recipient || config.recipientAddress,
    reference: payment.reference,
    creatorId,
    resource: 'trusted_feed',
    issuedAt: new Date().toISOString(),
    contentHash: generateContentHash(payment),
  };

  const result = await publishKnowledgeAsset(receiptAsset);
  return result.ual;
}

/**
 * Generate content hash for receipt
 * @param {Object} payment - Payment data
 * @returns {string} Content hash
 */
function generateContentHash(payment) {
  const crypto = require('crypto');
  const json = JSON.stringify(payment);
  return '0x' + crypto.createHash('sha256').update(json).digest('hex');
}

/**
 * Generate offer ID
 * @returns {string} Offer ID
 */
function generateOfferId() {
  return 'offer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

export default router;

