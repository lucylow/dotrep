/**
 * Escrow Service
 * Interacts with Escrow smart contract
 */

import { ethers } from 'ethers';
import config from '../utils/config.js';

// Escrow ABI (minimal)
const ESCROW_ABI = [
  'function deposit(string memory referenceId) payable',
  'function release(string memory referenceId)',
  'function getDeposit(string memory referenceId) view returns (address buyer, uint256 amount, address recipient, bool released)',
  'function feePercent() view returns (uint256)',
];

/**
 * Escrow Service Class
 */
class EscrowService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.wallet = null;
    this.simulate = config.simulate || !config.escrowContractAddress;

    if (!this.simulate && config.ethRpcUrl) {
      try {
        this.provider = new ethers.JsonRpcProvider(config.ethRpcUrl);
        if (config.privateKey) {
          this.wallet = new ethers.Wallet(config.privateKey, this.provider);
        }
        
        if (config.escrowContractAddress) {
          this.contract = new ethers.Contract(
            config.escrowContractAddress,
            ESCROW_ABI,
            this.wallet || this.provider
          );
        }
      } catch (error) {
        console.warn('Failed to initialize escrow contract, using simulate mode:', error.message);
        this.simulate = true;
      }
    }
  }

  /**
   * Deposit funds into escrow
   * @param {string} referenceId - Reference ID for the deposit
   * @param {string} amount - Amount in ETH (as string, e.g., "0.01")
   * @returns {Promise<Object>} Transaction result
   */
  async deposit(referenceId, amount) {
    if (this.simulate) {
      return this.simulateDeposit(referenceId, amount);
    }

    if (!this.contract || !this.wallet) {
      throw new Error('Escrow contract not initialized');
    }

    try {
      const tx = await this.contract.deposit(referenceId, {
        value: ethers.parseEther(amount),
      });

      const receipt = await tx.wait(1);

      return {
        txHash: receipt.hash,
        referenceId,
        amount,
        status: 'deposited',
        simulated: false,
      };
    } catch (error) {
      console.error('Escrow deposit error:', error);
      throw new Error(`Escrow deposit failed: ${error.message}`);
    }
  }

  /**
   * Release funds from escrow
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Object>} Transaction result
   */
  async release(referenceId) {
    if (this.simulate) {
      return this.simulateRelease(referenceId);
    }

    if (!this.contract || !this.wallet) {
      throw new Error('Escrow contract not initialized');
    }

    try {
      const tx = await this.contract.release(referenceId);
      const receipt = await tx.wait(1);

      return {
        txHash: receipt.hash,
        referenceId,
        status: 'released',
        simulated: false,
      };
    } catch (error) {
      console.error('Escrow release error:', error);
      throw new Error(`Escrow release failed: ${error.message}`);
    }
  }

  /**
   * Get deposit information
   * @param {string} referenceId - Reference ID
   * @returns {Promise<Object>} Deposit info
   */
  async getDeposit(referenceId) {
    if (this.simulate) {
      return this.simulateGetDeposit(referenceId);
    }

    if (!this.contract) {
      throw new Error('Escrow contract not initialized');
    }

    try {
      const deposit = await this.contract.getDeposit(referenceId);
      
      return {
        referenceId,
        buyer: deposit.buyer,
        amount: ethers.formatEther(deposit.amount),
        recipient: deposit.recipient,
        released: deposit.released,
      };
    } catch (error) {
      console.error('Error getting deposit:', error);
      return null;
    }
  }

  /**
   * Get fee percentage
   * @returns {Promise<number>} Fee percentage (0-100)
   */
  async getFeePercent() {
    if (this.simulate) {
      return 2.5; // Default 2.5%
    }

    if (!this.contract) {
      return 2.5;
    }

    try {
      const feePercent = await this.contract.feePercent();
      return Number(feePercent);
    } catch (error) {
      console.error('Error getting fee percent:', error);
      return 2.5;
    }
  }

  // Simulation methods
  simulateDeposit(referenceId, amount) {
    console.log(`[SIMULATE] Escrow deposit: ${referenceId}, amount: ${amount} ETH`);
    return {
      txHash: '0x' + require('crypto').randomBytes(32).toString('hex'),
      referenceId,
      amount,
      status: 'deposited',
      simulated: true,
    };
  }

  simulateRelease(referenceId) {
    console.log(`[SIMULATE] Escrow release: ${referenceId}`);
    return {
      txHash: '0x' + require('crypto').randomBytes(32).toString('hex'),
      referenceId,
      status: 'released',
      simulated: true,
    };
  }

  simulateGetDeposit(referenceId) {
    return {
      referenceId,
      buyer: '0x' + require('crypto').randomBytes(20).toString('hex'),
      amount: '0.01',
      recipient: config.recipientAddress,
      released: false,
      simulated: true,
    };
  }
}

// Export singleton instance
export const escrowService = new EscrowService();

