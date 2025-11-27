/**
 * Payment Facilitator Service
 * Handles payment submission and verification (simulate or on-chain)
 */

import { ethers } from 'ethers';
import config from '../utils/config.js';
import { randomBytes } from 'crypto';

// In-memory store for simulated payments
const simulatedPayments = new Map();

/**
 * Payment Facilitator Class
 */
class PaymentFacilitator {
  constructor() {
    this.mode = config.simulate ? 'simulate' : 'onChain';
    this.provider = null;
    this.wallet = null;

    if (this.mode === 'onChain' && config.ethRpcUrl) {
      try {
        this.provider = new ethers.JsonRpcProvider(config.ethRpcUrl);
        if (config.privateKey) {
          this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        }
      } catch (error) {
        console.warn('Failed to initialize blockchain provider, using simulate mode:', error.message);
        this.mode = 'simulate';
      }
    }
  }

  /**
   * Submit a payment transaction
   * @param {Object} paymentRequest - Payment request object
   * @returns {Promise<Object>} Transaction result with txHash
   */
  async submitPayment(paymentRequest) {
    if (this.mode === 'simulate') {
      return this.simulatePayment(paymentRequest);
    } else {
      return this.submitOnChainPayment(paymentRequest);
    }
  }

  /**
   * Simulate a payment (dev mode)
   * @param {Object} paymentRequest - Payment request
   * @returns {Promise<Object>} Simulated transaction
   */
  async simulatePayment(paymentRequest) {
    // Generate a random transaction hash
    const txHash = '0x' + randomBytes(32).toString('hex');
    
    const paymentRecord = {
      txHash,
      amount: paymentRequest.amount,
      token: paymentRequest.token,
      recipient: paymentRequest.recipient,
      reference: paymentRequest.reference,
      nonce: paymentRequest.nonce,
      timestamp: Date.now(),
      status: 'confirmed',
    };

    // Store in memory
    simulatedPayments.set(txHash, paymentRecord);

    console.log(`[SIMULATE] Payment submitted: ${txHash} for ${paymentRequest.amount} ${paymentRequest.token}`);

    return {
      txHash,
      status: 'confirmed',
      simulated: true,
    };
  }

  /**
   * Submit payment on-chain
   * @param {Object} paymentRequest - Payment request
   * @returns {Promise<Object>} Transaction result
   */
  async submitOnChainPayment(paymentRequest) {
    if (!this.wallet) {
      throw new Error('Wallet not configured for on-chain payments');
    }

    try {
      // Convert amount to wei (assuming 18 decimals for native token)
      // For ERC20 tokens, you'd need to interact with the token contract
      const amountWei = ethers.parseEther(paymentRequest.amount);

      // Send transaction
      const tx = await this.wallet.sendTransaction({
        to: paymentRequest.recipient,
        value: amountWei,
      });

      // Wait for confirmation
      const receipt = await tx.wait(1);

      return {
        txHash: receipt.hash,
        status: 'confirmed',
        blockNumber: receipt.blockNumber,
        simulated: false,
      };
    } catch (error) {
      console.error('On-chain payment submission error:', error);
      throw new Error(`Payment submission failed: ${error.message}`);
    }
  }

  /**
   * Get payment transaction details
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object|null>} Payment details
   */
  async getPayment(txHash) {
    if (this.mode === 'simulate') {
      return simulatedPayments.get(txHash) || null;
    } else {
      return this.getOnChainPayment(txHash);
    }
  }

  /**
   * Get on-chain payment details
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object|null>} Payment details
   */
  async getOnChainPayment(txHash) {
    if (!this.provider) {
      return null;
    }

    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      if (!receipt || receipt.status !== 1) {
        return null;
      }

      const tx = await this.provider.getTransaction(txHash);

      return {
        txHash,
        amount: ethers.formatEther(tx.value),
        token: 'ETH', // Default to native token
        recipient: receipt.to,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(), // Approximate
      };
    } catch (error) {
      console.error('Error fetching on-chain payment:', error);
      return null;
    }
  }

  /**
   * Validate payment matches payment request
   * @param {string} txHash - Transaction hash
   * @param {Object} paymentRequest - Original payment request
   * @returns {Promise<Object>} Validation result
   */
  async validatePaymentForRequest(txHash, paymentRequest) {
    const payment = await this.getPayment(txHash);

    if (!payment) {
      return {
        valid: false,
        error: 'Payment not found',
      };
    }

    // Validate amount (with tolerance for floating point)
    const requestedAmount = parseFloat(paymentRequest.amount);
    const paidAmount = parseFloat(payment.amount);
    const amountTolerance = 0.0001;

    if (Math.abs(requestedAmount - paidAmount) > amountTolerance) {
      return {
        valid: false,
        error: `Amount mismatch: requested ${requestedAmount}, paid ${paidAmount}`,
      };
    }

    // Validate token
    if (payment.token !== paymentRequest.token) {
      return {
        valid: false,
        error: `Token mismatch: requested ${paymentRequest.token}, paid ${payment.token}`,
      };
    }

    // Validate recipient
    if (payment.recipient.toLowerCase() !== paymentRequest.recipient.toLowerCase()) {
      return {
        valid: false,
        error: 'Recipient mismatch',
      };
    }

    // Validate reference (if available)
    if (payment.reference && paymentRequest.reference && 
        payment.reference !== paymentRequest.reference) {
      return {
        valid: false,
        error: 'Reference mismatch',
      };
    }

    return {
      valid: true,
      payment,
    };
  }
}

// Export singleton instance
export const paymentFacilitator = new PaymentFacilitator();

