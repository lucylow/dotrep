/**
 * Reputation Routes
 * Reputation retrieval endpoints
 */

import express from 'express';
import { getReputationFor, getTopCreators } from '../../services/reputationService.js';

const router = express.Router();

/**
 * GET /reputation/:creatorId
 * Get reputation for a specific creator
 */
router.get('/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const reputation = await getReputationFor(creatorId);

    res.json({
      creatorId,
      reputation,
    });
  } catch (error) {
    console.error('Reputation lookup error:', error);
    res.status(500).json({
      error: 'Reputation lookup failed',
      message: error.message,
    });
  }
});

/**
 * GET /reputation/top
 * Get top creators by topic
 * Query params: topic, limit
 */
router.get('/top', async (req, res) => {
  try {
    const topic = req.query.topic || null;
    const limit = parseInt(req.query.limit || '10', 10);

    const topCreators = await getTopCreators(topic, limit);

    res.json({
      topic,
      limit,
      creators: topCreators,
    });
  } catch (error) {
    console.error('Top creators lookup error:', error);
    res.status(500).json({
      error: 'Top creators lookup failed',
      message: error.message,
    });
  }
});

export default router;

