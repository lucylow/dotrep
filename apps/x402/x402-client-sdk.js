/**
 * Enhanced x402 Client SDK
 * 
 * Provides a high-level client library for interacting with x402-protected APIs.
 * Handles the complete payment flow automatically:
 * 1. Request resource → receive 402
 * 2. Sign payment authorization (EIP-712)
 * 3. Execute payment (facilitator or on-chain)
 * 4. Retry request with X-PAYMENT header
 * 5. Handle errors and retries
 * 
 * Usage:
 *   const client = new X402Client({ wallet, facilitator: 'coinbase' });
 *   const data = await client.request('/api/premium-data');
 */

const axios = require('axios');
const { ethers } = require('ethers');
const { signPaymentAuthorization, createPaymentProof, formatPaymentProofForHeader } = require('./eip712-signing');
const { createFacilitatorClient } = require('./facilitator-client');
const { X402HTTPClient } = require('./x402-http-client');

/**
 * x402 Client Configuration
 */
class X402ClientConfig {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || process.env.X402_API_URL || 'http://localhost:4000';
    this.wallet = options.wallet; // ethers.js wallet or signer
    this.facilitator = options.facilitator || 'auto'; // 'auto', 'coinbase', 'cloudflare', 'custom', 'on-chain'
    this.facilitatorConfig = options.facilitatorConfig || {};
    this.useEIP712 = options.useEIP712 !== false; // Default: true
    this.autoRetry = options.autoRetry !== false; // Default: true
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.timeout = options.timeout || 30000;
    this.onPaymentRequired = options.onPaymentRequired; // Callback when payment is needed
    this.onPaymentComplete = options.onPaymentComplete; // Callback when payment succeeds
  }
}

/**
 * Enhanced x402 Client
 */
class X402Client {
  constructor(config = {}) {
    this.config = new X402ClientConfig(config);
    this.facilitatorClient = createFacilitatorClient(this.config.facilitatorConfig);
    this.httpClient = new X402HTTPClient({
      timeout: this.config.timeout,
      keepAlive: true,
      maxRetries: this.config.maxRetries
    });
    this.paymentCache = new Map(); // Cache payment proofs for reuse
  }

  /**
   * Request a protected resource
   * Automatically handles payment flow if 402 is returned
   */
  async request(path, options = {}) {
    const {
      method = 'GET',
      params = {},
      data = null,
      headers = {},
      skipPayment = false
    } = options;

    try {
      // Step 1: Make initial request
      const response = await this.httpClient.request(
        `${this.config.apiUrl}${path}`,
        {
          method,
          params,
          data,
          headers
        }
      );

      // Step 2: Check if payment is required
      if (response.status === 402 && !skipPayment) {
        return await this.handlePaymentRequired(path, response.data, options);
      }

      // Step 3: Return successful response
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      if (error.response && error.response.status === 402 && !skipPayment) {
        return await this.handlePaymentRequired(path, error.response.data, options);
      }

      throw error;
    }
  }

  /**
   * Handle 402 Payment Required response
   */
  async handlePaymentRequired(path, paymentResponse, originalOptions = {}) {
    const paymentRequest = paymentResponse.paymentRequest;

    if (!paymentRequest) {
      throw new Error('Payment required but no payment request provided');
    }

    // Call payment required callback
    if (this.config.onPaymentRequired) {
      await this.config.onPaymentRequired(paymentRequest, path);
    }

    // Step 1: Sign payment authorization (EIP-712)
    let paymentProof;
    if (this.config.useEIP712 && this.config.wallet) {
      paymentProof = await this.signAndPay(paymentRequest);
    } else {
      // Fallback: use facilitator without EIP-712
      paymentProof = await this.payViaFacilitator(paymentRequest);
    }

    // Step 2: Retry request with X-PAYMENT header
    const retryResponse = await this.retryWithPayment(path, paymentProof, originalOptions);

    // Call payment complete callback
    if (this.config.onPaymentComplete) {
      await this.config.onPaymentComplete(paymentProof, retryResponse);
    }

    return retryResponse;
  }

  /**
   * Sign payment authorization and execute payment
   */
  async signAndPay(paymentRequest) {
    if (!this.config.wallet) {
      throw new Error('Wallet not configured. Cannot sign payment authorization.');
    }

    // Step 1: Sign payment authorization using EIP-712
    const signature = await signPaymentAuthorization(
      paymentRequest,
      this.config.wallet,
      {
        chain: paymentRequest.chains[0] // Use first supported chain
      }
    );

    // Step 2: Execute payment via facilitator or on-chain
    let paymentResult;
    const facilitator = this.config.facilitator === 'auto'
      ? this.facilitatorClient.getRecommendedFacilitator(paymentRequest.chains[0])
      : this.config.facilitator;

    if (facilitator && facilitator !== 'on-chain') {
      // Use facilitator (gasless)
      paymentResult = await this.facilitatorClient.pay(
        paymentRequest,
        await this.config.wallet.getAddress(),
        {
          facilitator: facilitator,
          signature: signature
        }
      );
    } else {
      // Execute on-chain payment
      paymentResult = await this.payOnChain(paymentRequest, signature);
    }

    // Step 3: Create payment proof
    const paymentProof = createPaymentProof(
      paymentRequest,
      signature,
      paymentResult.txHash,
      {
        facilitatorSig: paymentResult.facilitatorSig
      }
    );

    // Cache payment proof for potential reuse
    this.paymentCache.set(paymentRequest.challenge, paymentProof);

    return paymentProof;
  }

  /**
   * Pay via facilitator (without EIP-712 signing)
   */
  async payViaFacilitator(paymentRequest) {
    const payerAddress = this.config.wallet
      ? await this.config.wallet.getAddress()
      : paymentRequest.payer || null;

    if (!payerAddress) {
      throw new Error('Payer address required for facilitator payment');
    }

    const facilitator = this.config.facilitator === 'auto'
      ? this.facilitatorClient.getRecommendedFacilitator(paymentRequest.chains[0])
      : this.config.facilitator;

    const paymentResult = await this.facilitatorClient.pay(
      paymentRequest,
      payerAddress,
      {
        facilitator: facilitator
      }
    );

    return {
      txHash: paymentResult.txHash,
      chain: paymentResult.chain,
      payer: payerAddress,
      amount: paymentRequest.amount,
      currency: paymentRequest.currency,
      challenge: paymentRequest.challenge,
      recipient: paymentRequest.recipient,
      facilitatorSig: paymentResult.facilitatorSig,
      signature: null // No EIP-712 signature
    };
  }

  /**
   * Execute on-chain payment
   */
  async payOnChain(paymentRequest, signature = null) {
    if (!this.config.wallet) {
      throw new Error('Wallet required for on-chain payment');
    }

    // This would use the blockchain payment service
    // For now, return a mock response
    // In production, integrate with blockchain-payment-service.js
    const mockTxHash = `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex').slice(0, 64)}`;

    return {
      success: true,
      txHash: mockTxHash,
      chain: paymentRequest.chains[0],
      blockNumber: 'pending',
      method: 'on-chain'
    };
  }

  /**
   * Retry request with X-PAYMENT header
   */
  async retryWithPayment(path, paymentProof, originalOptions = {}) {
    const formattedProof = formatPaymentProofForHeader(paymentProof);
    const xPaymentHeader = JSON.stringify(formattedProof);

    const response = await this.httpClient.request(
      `${this.config.apiUrl}${path}`,
      {
        method: originalOptions.method || 'GET',
        params: originalOptions.params,
        data: originalOptions.data,
        headers: {
          ...originalOptions.headers,
          'X-PAYMENT': xPaymentHeader
        }
      }
    );

    if (response.status === 402) {
      // Payment verification failed
      throw new Error(`Payment verification failed: ${response.data.message || 'Unknown error'}`);
    }

    return {
      success: true,
      status: response.status,
      data: response.data,
      headers: response.headers,
      paymentEvidence: response.data.paymentEvidence
    };
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(txHash, chain) {
    try {
      const verification = await this.facilitatorClient.verifyPayment(txHash, chain);
      return verification;
    } catch (error) {
      console.error('[X402Client] Payment status check failed:', error);
      return {
        verified: false,
        error: error.message
      };
    }
  }

  /**
   * Clear payment cache
   */
  clearCache() {
    this.paymentCache.clear();
  }
}

/**
 * Create x402 client instance
 */
function createX402Client(config = {}) {
  return new X402Client(config);
}

/**
 * Helper: Create client from private key
 */
function createX402ClientFromPrivateKey(privateKey, config = {}) {
  const provider = config.provider || new ethers.JsonRpcProvider(config.rpcUrl || 'https://mainnet.base.org');
  const wallet = new ethers.Wallet(privateKey, provider);

  return new X402Client({
    ...config,
    wallet
  });
}

module.exports = {
  X402Client,
  createX402Client,
  createX402ClientFromPrivateKey,
  X402ClientConfig
};

