/**
 * OriginTrail DKG Publisher Service
 * Publishes JSON-LD Knowledge Assets to Edge Node
 */

import axios from 'axios';
import { randomBytes } from 'crypto';
import config from '../utils/config.js';

/**
 * Publish a Knowledge Asset to OriginTrail DKG
 * @param {Object} jsonLd - JSON-LD Knowledge Asset
 * @returns {Promise<Object>} Publication result with UAL
 */
export async function publishKnowledgeAsset(jsonLd) {
  if (config.simulate) {
    return simulatePublish(jsonLd);
  }

  try {
    const response = await axios.post(
      `${config.edgeNodeUrl}/publish`,
      jsonLd,
      {
        headers: {
          'Content-Type': 'application/ld+json',
        },
        timeout: 30000, // 30 second timeout
      }
    );

    return {
      ual: response.data.ual || generateUAL(jsonLd),
      status: response.data.status || 'published',
      publishedAt: new Date().toISOString(),
      txHash: response.data.txHash,
    };
  } catch (error) {
    console.error('DKG publish error:', error);
    
    // If error but we have a response, try to extract UAL
    if (error.response?.data?.ual) {
      return {
        ual: error.response.data.ual,
        status: 'published',
        publishedAt: new Date().toISOString(),
        error: error.message,
      };
    }

    // Fallback to simulation if publish fails
    if (config.simulate || !config.edgeNodeUrl) {
      console.warn('Falling back to simulation mode');
      return simulatePublish(jsonLd);
    }

    throw new Error(`DKG publish failed: ${error.message}`);
  }
}

/**
 * Simulate DKG publish (dev mode)
 * @param {Object} jsonLd - JSON-LD Knowledge Asset
 * @returns {Promise<Object>} Simulated publication result
 */
function simulatePublish(jsonLd) {
  const ual = generateUAL(jsonLd);
  
  console.log(`[SIMULATE] Published KA to DKG: ${ual}`);
  console.log(`[SIMULATE] Content hash: ${jsonLd.contentHash || 'N/A'}`);

  return {
    ual,
    status: 'published',
    publishedAt: new Date().toISOString(),
    simulated: true,
  };
}

/**
 * Generate a UAL (Universal Asset Locator) for a Knowledge Asset
 * @param {Object} jsonLd - JSON-LD Knowledge Asset
 * @returns {string} UAL
 */
function generateUAL(jsonLd) {
  // Extract ID or generate from content hash
  const id = jsonLd.id || jsonLd['@id'] || jsonLd.contentHash;
  
  if (!id) {
    // Generate a random UAL if no ID available
    const randomId = randomBytes(16).toString('hex');
    return `urn:ual:dotrep:asset:${randomId}`;
  }

  // Parse existing UAL or create new one
  if (id.startsWith('urn:ual:')) {
    return id;
  }

  // Determine asset type from context
  let assetType = 'asset';
  if (jsonLd['@type']) {
    if (Array.isArray(jsonLd['@type'])) {
      const type = jsonLd['@type'].find(t => 
        t.includes('Receipt') || t.includes('Reputation') || t.includes('Note')
      );
      if (type) {
        if (type.includes('Receipt')) assetType = 'receipt';
        else if (type.includes('Reputation')) assetType = 'reputation';
        else if (type.includes('Note')) assetType = 'note';
      }
    } else if (typeof jsonLd['@type'] === 'string') {
      if (jsonLd['@type'].includes('Receipt')) assetType = 'receipt';
      else if (jsonLd['@type'].includes('Reputation')) assetType = 'reputation';
      else if (jsonLd['@type'].includes('Note')) assetType = 'note';
    }
  }

  // Extract hash or ID component
  const hashComponent = id.startsWith('0x') ? id.slice(2) : id;
  
  return `urn:ual:dotrep:${assetType}:${hashComponent.slice(0, 16)}`;
}

/**
 * Verify a Knowledge Asset was published
 * @param {string} ual - Universal Asset Locator
 * @returns {Promise<Object>} Verification result
 */
export async function verifyKnowledgeAsset(ual) {
  if (config.simulate) {
    return {
      exists: true,
      ual,
      verified: true,
      simulated: true,
    };
  }

  try {
    const response = await axios.get(
      `${config.edgeNodeUrl}/query`,
      {
        params: { ual },
        timeout: 10000,
      }
    );

    return {
      exists: !!response.data,
      ual,
      verified: true,
      data: response.data,
    };
  } catch (error) {
    console.error('DKG verify error:', error);
    return {
      exists: false,
      ual,
      verified: false,
      error: error.message,
    };
  }
}

