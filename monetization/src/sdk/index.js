/**
 * DotRep SDK
 * Client library for interacting with DotRep Monetization API
 */

import axios from 'axios';
import { ethers } from 'ethers';
import { signPaymentProof } from '../utils/cryptoHelpers.js';

/**
 * DotRep SDK Client
 */
export class DotRepSDK {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'http://localhost:3000';
    this.wallet = config.wallet || null; // ethers.js wallet instance
    this.facilitatorUrl = config.facilitatorUrl || null;
  }

  /**
   * Get reputation for a creator
   * @param {string} creatorId - Creator identifier
   * @returns {Promise<Object>} Reputation data
   */
  async getReputationFor(creatorId) {
    const response = await axios.get(`${this.apiUrl}/api/reputation/${creatorId}`);
    return response.data.reputation;
  }

  /**
   * Request trusted feed with automatic payment handling
   * @param {string} creatorId - Creator identifier
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Feed data and receipt UAL
   */
  async requestTrustedFeed(creatorId, options = {}) {
    try {
      // First request (will get 402)
      const response = await axios.get(
        `${this.apiUrl}/api/marketplace/trusted-feed/${creatorId}`,
        {
          validateStatus: (status) => status === 200 || status === 402,
        }
      );

      if (response.status === 200) {
        // Already paid or free
        return response.data;
      }

      // Got 402 - need to pay
      if (response.status === 402) {
        const paymentRequest = response.data.paymentRequest;
        
        // Submit payment
        const paymentResult = await this.submitPayment(paymentRequest);
        
        // Sign payment proof
        const proofSignature = await this.signPaymentProof(
          paymentResult.txHash,
          paymentRequest.nonce,
          paymentRequest.reference
        );

        // Retry with payment proof
        const retryResponse = await axios.get(
          `${this.apiUrl}/api/marketplace/trusted-feed/${creatorId}`,
          {
            headers: {
              'X-Payment-Proof': JSON.stringify({
                txHash: paymentResult.txHash,
                signedBy: this.wallet.address,
                chain: 'base',
                proofSignature,
                nonce: paymentRequest.nonce,
              }),
            },
          }
        );

        return retryResponse.data;
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`API error: ${error.response.data.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Submit payment via facilitator
   * @param {Object} paymentRequest - Payment request
   * @returns {Promise<Object>} Payment result
   */
  async submitPayment(paymentRequest) {
    if (this.facilitatorUrl) {
      // Use external facilitator
      const response = await axios.post(`${this.facilitatorUrl}/submit`, {
        paymentRequest,
      });
      return response.data;
    } else {
      // Use API's payment endpoint
      const response = await axios.post(`${this.apiUrl}/api/payments/submit`, {
        paymentRequest,
      });
      return response.data;
    }
  }

  /**
   * Sign payment proof
   * @param {string} txHash - Transaction hash
   * @param {string} nonce - Nonce
   * @param {string} reference - Reference ID
   * @returns {Promise<string>} EIP-712 signature
   */
  async signPaymentProof(txHash, nonce, reference) {
    if (!this.wallet) {
      throw new Error('Wallet not configured');
    }

    return await signPaymentProof(txHash, nonce, reference, this.wallet.privateKey);
  }

  /**
   * Publish a community note
   * @param {Object} noteObj - Note data
   * @returns {Promise<Object>} Publication result
   */
  async publishCommunityNote(noteObj) {
    const response = await axios.post(`${this.apiUrl}/api/community/notes`, {
      ...noteObj,
      author: this.wallet?.address || noteObj.author,
    });
    return response.data;
  }

  /**
   * Get top creators
   * @param {string} topic - Topic filter (optional)
   * @param {number} limit - Number of results (default: 10)
   * @returns {Promise<Array>} Top creators
   */
  async getTopCreators(topic = null, limit = 10) {
    const params = { limit };
    if (topic) {
      params.topic = topic;
    }

    const response = await axios.get(`${this.apiUrl}/api/reputation/top`, { params });
    return response.data.creators;
  }
}

// Export convenience function
export function createSDK(config) {
  return new DotRepSDK(config);
}

export default DotRepSDK;

