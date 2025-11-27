/**
 * Enhanced Facilitator Client for x402 Payments
 * 
 * Supports multiple facilitators:
 * - Coinbase CDP (Cloud Developer Platform)
 * - Cloudflare Workers
 * - Custom facilitators
 * 
 * Provides gasless payment execution and instant verification
 */

const axios = require('axios');
const crypto = require('crypto');

/**
 * Facilitator Client Configuration
 */
class FacilitatorConfig {
  constructor(options = {}) {
    this.coinbaseUrl = options.coinbaseUrl || process.env.COINBASE_FACILITATOR_URL || 'https://api.developer.coinbase.com/facilitator';
    this.cloudflareUrl = options.cloudflareUrl || process.env.CLOUDFLARE_FACILITATOR_URL;
    this.customUrl = options.customUrl || process.env.CUSTOM_FACILITATOR_URL;
    this.timeout = options.timeout || 30000; // 30 seconds
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }
}

/**
 * Enhanced Facilitator Client
 */
class FacilitatorClient {
  constructor(config = {}) {
    this.config = new FacilitatorConfig(config);
    this.supportedChains = {
      'coinbase': ['base', 'base-sepolia'],
      'cloudflare': ['base', 'ethereum', 'polygon', 'arbitrum', 'solana'],
      'custom': [] // Configure per deployment
    };
  }

  /**
   * Get recommended facilitator for a chain
   */
  getRecommendedFacilitator(chain) {
    const chainLower = chain.toLowerCase();

    // Coinbase CDP supports Base networks
    if (['base', 'base-sepolia'].includes(chainLower) && this.config.coinbaseUrl) {
      return 'coinbase';
    }

    // Cloudflare supports multiple chains
    if (this.config.cloudflareUrl) {
      const cloudflareChains = this.supportedChains.cloudflare;
      if (cloudflareChains.includes(chainLower)) {
        return 'cloudflare';
      }
    }

    // Custom facilitator
    if (this.config.customUrl) {
      return 'custom';
    }

    return null;
  }

  /**
   * Execute payment via Coinbase CDP Facilitator
   */
  async payViaCoinbase(paymentRequest, payerAddress, options = {}) {
    if (!this.config.coinbaseUrl) {
      throw new Error('Coinbase facilitator URL not configured');
    }

    const chain = paymentRequest.chain || 'base';
    if (!['base', 'base-sepolia'].includes(chain.toLowerCase())) {
      throw new Error(`Coinbase facilitator does not support chain: ${chain}`);
    }

    try {
      // Coinbase CDP API format
      const requestPayload = {
        payer: payerAddress,
        recipient: paymentRequest.recipient,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'USDC',
        chain: chain,
        challenge: paymentRequest.challenge,
        resourceUAL: paymentRequest.resourceUAL,
        metadata: {
          protocol: 'x402',
          version: paymentRequest.x402 || '1.0',
          ...options.metadata
        }
      };

      // If signature provided, include it
      if (options.signature) {
        requestPayload.signature = options.signature;
      }

      const response = await this.makeRequest(
        `${this.config.coinbaseUrl}/pay`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': options.apiKey || process.env.COINBASE_API_KEY
          }
        }
      );

      return {
        success: true,
        txHash: response.txHash || response.transactionHash,
        chain: chain,
        facilitatorSig: response.facilitatorSig || response.signature,
        blockNumber: response.blockNumber || 'pending',
        facilitator: 'coinbase',
        method: 'facilitator',
        facilitatorData: response
      };
    } catch (error) {
      console.error('[Facilitator] Coinbase payment failed:', error.message);
      throw new Error(`Coinbase facilitator error: ${error.message}`);
    }
  }

  /**
   * Execute payment via Cloudflare Facilitator
   */
  async payViaCloudflare(paymentRequest, payerAddress, options = {}) {
    if (!this.config.cloudflareUrl) {
      throw new Error('Cloudflare facilitator URL not configured');
    }

    try {
      const requestPayload = {
        payer: payerAddress,
        recipient: paymentRequest.recipient,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'USDC',
        chain: paymentRequest.chain,
        challenge: paymentRequest.challenge,
        resourceUAL: paymentRequest.resourceUAL,
        protocol: 'x402',
        version: paymentRequest.x402 || '1.0'
      };

      if (options.signature) {
        requestPayload.signature = options.signature;
      }

      const response = await this.makeRequest(
        `${this.config.cloudflareUrl}/pay`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        txHash: response.txHash || response.transactionHash,
        chain: paymentRequest.chain,
        facilitatorSig: response.facilitatorSig || response.signature,
        blockNumber: response.blockNumber || 'pending',
        facilitator: 'cloudflare',
        method: 'facilitator',
        facilitatorData: response
      };
    } catch (error) {
      console.error('[Facilitator] Cloudflare payment failed:', error.message);
      throw new Error(`Cloudflare facilitator error: ${error.message}`);
    }
  }

  /**
   * Execute payment via custom facilitator
   */
  async payViaCustom(paymentRequest, payerAddress, options = {}) {
    if (!this.config.customUrl) {
      throw new Error('Custom facilitator URL not configured');
    }

    try {
      const requestPayload = {
        payer: payerAddress,
        recipient: paymentRequest.recipient,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency || 'USDC',
        chain: paymentRequest.chain,
        challenge: paymentRequest.challenge,
        resourceUAL: paymentRequest.resourceUAL,
        ...options.customPayload
      };

      const response = await this.makeRequest(
        `${this.config.customUrl}/pay`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...options.headers
          }
        }
      );

      return {
        success: true,
        txHash: response.txHash || response.transactionHash,
        chain: paymentRequest.chain,
        facilitatorSig: response.facilitatorSig || response.signature,
        blockNumber: response.blockNumber || 'pending',
        facilitator: 'custom',
        method: 'facilitator',
        facilitatorData: response
      };
    } catch (error) {
      console.error('[Facilitator] Custom payment failed:', error.message);
      throw new Error(`Custom facilitator error: ${error.message}`);
    }
  }

  /**
   * Execute payment via recommended facilitator
   */
  async pay(paymentRequest, payerAddress, options = {}) {
    const facilitatorType = options.facilitator || this.getRecommendedFacilitator(paymentRequest.chain);

    if (!facilitatorType) {
      throw new Error(`No facilitator available for chain: ${paymentRequest.chain}`);
    }

    switch (facilitatorType) {
      case 'coinbase':
        return await this.payViaCoinbase(paymentRequest, payerAddress, options);
      case 'cloudflare':
        return await this.payViaCloudflare(paymentRequest, payerAddress, options);
      case 'custom':
        return await this.payViaCustom(paymentRequest, payerAddress, options);
      default:
        throw new Error(`Unknown facilitator type: ${facilitatorType}`);
    }
  }

  /**
   * Verify payment via facilitator
   */
  async verifyPayment(txHash, chain, facilitatorType = null) {
    const facilitator = facilitatorType || this.getRecommendedFacilitator(chain);

    if (!facilitator) {
      throw new Error(`No facilitator available for chain: ${chain}`);
    }

    let verifyUrl;
    switch (facilitator) {
      case 'coinbase':
        verifyUrl = `${this.config.coinbaseUrl}/verify`;
        break;
      case 'cloudflare':
        verifyUrl = `${this.config.cloudflareUrl}/verify`;
        break;
      case 'custom':
        verifyUrl = `${this.config.customUrl}/verify`;
        break;
      default:
        throw new Error(`Unknown facilitator: ${facilitator}`);
    }

    try {
      const response = await this.makeRequest(
        verifyUrl,
        { txHash, chain },
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      return {
        verified: response.verified === true || response.status === 'verified',
        txHash,
        chain,
        blockNumber: response.blockNumber,
        confirmations: response.confirmations || 0,
        facilitatorData: response
      };
    } catch (error) {
      console.error(`[Facilitator] Verification failed (${facilitator}):`, error.message);
      return {
        verified: false,
        error: error.message,
        txHash,
        chain
      };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(url, data, options = {}) {
    const method = options.method || 'POST';
    let lastError;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const config = {
          method,
          url,
          timeout: this.config.timeout,
          validateStatus: (status) => status >= 200 && status < 500,
          ...options
        };

        if (data && method !== 'GET') {
          config.data = data;
        } else if (data && method === 'GET') {
          config.params = data;
        }

        const response = await axios(config);

        if (response.status >= 200 && response.status < 300) {
          return response.data;
        }

        if (response.status >= 400 && response.status < 500) {
          // Client error, don't retry
          throw new Error(`Facilitator returned ${response.status}: ${JSON.stringify(response.data)}`);
        }

        // Server error, retry
        throw new Error(`Facilitator returned ${response.status}`);
      } catch (error) {
        lastError = error;

        if (attempt < this.config.retryAttempts - 1) {
          const delay = this.config.retryDelay * Math.pow(2, attempt); // Exponential backoff
          await this.sleep(delay);
          continue;
        }
      }
    }

    throw lastError;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create facilitator client instance
 */
function createFacilitatorClient(config = {}) {
  return new FacilitatorClient(config);
}

module.exports = {
  FacilitatorClient,
  createFacilitatorClient,
  FacilitatorConfig
};

