/**
 * Reputation Service
 * Fetches reputation data from DKG and provides rankings
 */

import { publishKnowledgeAsset } from './dkgPublisher.js';
import config from '../utils/config.js';

// In-memory cache for reputation data
const reputationCache = new Map();

/**
 * Get reputation for a creator
 * @param {string} creatorId - Creator identifier
 * @returns {Promise<Object>} Reputation data
 */
export async function getReputationFor(creatorId) {
  // Check cache first
  const cacheKey = `creator:${creatorId}`;
  const cached = reputationCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < config.reputationCacheTtl * 1000)) {
    return cached.data;
  }

  // In production, fetch from DKG
  // For now, return mock data
  const reputation = await fetchReputationFromDKG(creatorId);

  // Cache the result
  reputationCache.set(cacheKey, {
    data: reputation,
    timestamp: Date.now(),
  });

  return reputation;
}

/**
 * Fetch reputation from DKG (or compute)
 * @param {string} creatorId - Creator identifier
 * @returns {Promise<Object>} Reputation data
 */
async function fetchReputationFromDKG(creatorId) {
  // TODO: Implement actual DKG query
  // For now, return mock structure
  return {
    creatorId,
    graphScore: 0.75,
    stakeWeight: 0.60,
    paymentWeight: 0.85,
    sybilPenalty: 0.0,
    finalScore: 0.73,
    rank: null, // Will be set by getTopCreators
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get top creators by topic
 * @param {string} topic - Topic/category (optional)
 * @param {number} limit - Number of results (default: 10)
 * @returns {Promise<Array>} Top creators
 */
export async function getTopCreators(topic = null, limit = 10) {
  // In production, query DKG for ReputationAssets
  // For now, return mock data
  const mockCreators = [
    { creatorId: 'creator1', finalScore: 0.95, topic: 'web3' },
    { creatorId: 'creator2', finalScore: 0.89, topic: 'web3' },
    { creatorId: 'creator3', finalScore: 0.87, topic: 'ai' },
    { creatorId: 'creator4', finalScore: 0.82, topic: 'web3' },
    { creatorId: 'creator5', finalScore: 0.80, topic: 'blockchain' },
  ];

  let results = mockCreators;
  
  if (topic) {
    results = mockCreators.filter(c => c.topic === topic);
  }

  // Fetch full reputation data for each
  const topCreators = await Promise.all(
    results.slice(0, limit).map(async (creator, index) => {
      const reputation = await getReputationFor(creator.creatorId);
      return {
        ...reputation,
        rank: index + 1,
      };
    })
  );

  return topCreators;
}

/**
 * Publish a ReputationAsset to DKG
 * @param {Object} reputationData - Reputation calculation results
 * @returns {Promise<Object>} Publication result
 */
export async function publishReputationAsset(reputationData) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ReputationAsset',
    id: `urn:ual:dotrep:reputation:${reputationData.creatorId}`,
    creatorId: reputationData.creatorId,
    graphScore: reputationData.graphScore,
    stakeWeight: reputationData.stakeWeight,
    paymentWeight: reputationData.paymentWeight,
    sybilPenalty: reputationData.sybilPenalty,
    finalScore: reputationData.finalScore,
    computedAt: new Date().toISOString(),
    contentHash: reputationData.contentHash || generateContentHash(reputationData),
  };

  return await publishKnowledgeAsset(jsonLd);
}

/**
 * Generate content hash for reputation data
 * @param {Object} data - Reputation data
 * @returns {string} Content hash
 */
function generateContentHash(data) {
  const crypto = require('crypto');
  const json = JSON.stringify(data);
  return '0x' + crypto.createHash('sha256').update(json).digest('hex');
}

