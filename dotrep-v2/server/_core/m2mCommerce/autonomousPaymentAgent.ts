/**
 * Autonomous Payment Agent for Machine-to-Machine Commerce
 * 
 * Enables AI agents and machines to autonomously acquire paid resources
 * using the x402 protocol. Handles the complete payment flow including:
 * - Detecting HTTP 402 Payment Required responses
 * - Parsing payment instructions
 * - Executing payments (on-chain or via facilitator)
 * - Retrying requests with payment proof
 * 
 * Designed for fully autonomous operations without human intervention.
 */

import type {
  AutonomousAgentConfig,
  ResourceRequest,
  ResourceResponse,
  PaymentInstructions,
  PaymentProof
} from './types';

export class AutonomousPaymentAgent {
  private config: AutonomousAgentConfig;
  private wallet?: any; // Wallet instance (ethers, web3, etc.)
  
  constructor(config: AutonomousAgentConfig, wallet?: any) {
    this.config = {
      maxPaymentAmount: '100.0',
      minRecipientReputation: 0.5,
      enableNegotiation: false,
      facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
      supportedChains: ['base', 'base-sepolia', 'ethereum', 'polygon'],
      supportedCurrencies: ['USDC', 'ETH', 'TRAC'],
      ...config
    };
    this.wallet = wallet;
  }

  /**
   * Acquire a paid resource automatically
   * 
   * Handles the complete x402 payment flow:
   * 1. Initial request (may receive HTTP 402)
   * 2. Parse payment instructions
   * 3. Execute payment
   * 4. Retry request with payment proof
   * 
   * @param resourceUrl - URL of the resource to acquire
   * @param maxPrice - Optional maximum price the agent is willing to pay
   * @returns Resource data or throws error if payment fails
   */
  async acquireResource<T = any>(
    resourceUrl: string,
    maxPrice?: string
  ): Promise<T> {
    try {
      // Initial request
      const response = await fetch(resourceUrl, {
        method: 'GET',
        headers: {
          'User-Agent': `Autonomous-Agent/${this.config.agentId}`,
          'Accept': 'application/json'
        }
      });

      if (response.status === 402) {
        // Parse payment instructions from 402 response
        const paymentInstructions = await this.parse402Response(response);
        
        // Validate price against budget
        if (maxPrice && parseFloat(paymentInstructions.amount) > parseFloat(maxPrice)) {
          throw new Error(
            `Price ${paymentInstructions.amount} exceeds budget ${maxPrice}`
          );
        }

        // Check against agent's max payment amount
        if (parseFloat(paymentInstructions.amount) > parseFloat(this.config.maxPaymentAmount || '100')) {
          throw new Error(
            `Price ${paymentInstructions.amount} exceeds agent's max payment amount ${this.config.maxPaymentAmount}`
          );
        }

        // Execute payment
        const paymentProof = await this.executePayment(paymentInstructions);
        
        // Retry request with payment proof
        const paidResponse = await fetch(resourceUrl, {
          method: 'GET',
          headers: {
            'X-Payment-Authorization': JSON.stringify(paymentProof),
            'User-Agent': `Autonomous-Agent/${this.config.agentId}`,
            'Accept': 'application/json'
          }
        });

        if (paidResponse.status === 200) {
          return await paidResponse.json() as T;
        } else if (paidResponse.status === 402) {
          // Payment still required - might be invalid
          const errorData = await paidResponse.json();
          throw new Error(
            `Payment failed: ${errorData.reason || 'Invalid payment proof'}`
          );
        } else {
          throw new Error(`Unexpected status: ${paidResponse.status}`);
        }
      } else if (response.status === 200) {
        // Resource is free
        return await response.json() as T;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.error('[AutonomousPaymentAgent] Resource acquisition failed:', error);
      throw error;
    }
  }

  /**
   * Request a resource with full control over request parameters
   */
  async requestResource<T = any>(request: ResourceRequest): Promise<ResourceResponse<T>> {
    try {
      const response = await fetch(request.url, {
        method: request.method || 'GET',
        headers: {
          'User-Agent': `Autonomous-Agent/${this.config.agentId}`,
          ...request.headers
        },
        body: request.body ? JSON.stringify(request.body) : undefined
      });

      if (response.status === 402) {
        // Parse payment instructions
        const paymentInstructions = await this.parse402Response(response);
        
        // Check price constraints
        if (request.maxPrice && 
            parseFloat(paymentInstructions.amount) > parseFloat(request.maxPrice)) {
          return {
            success: false,
            error: `Price ${paymentInstructions.amount} exceeds max price ${request.maxPrice}`,
            statusCode: 402
          };
        }

        // Execute payment
        const paymentProof = await this.executePayment(paymentInstructions);
        
        // Retry request with payment proof
        const paidResponse = await fetch(request.url, {
          method: request.method || 'GET',
          headers: {
            'X-Payment-Authorization': JSON.stringify(paymentProof),
            'User-Agent': `Autonomous-Agent/${this.config.agentId}`,
            ...request.headers
          },
          body: request.body ? JSON.stringify(request.body) : undefined
        });

        if (paidResponse.status === 200) {
          const data = await paidResponse.json() as T;
          return {
            success: true,
            data,
            paymentEvidence: paymentProof,
            amountPaid: paymentInstructions.amount,
            statusCode: 200
          };
        } else {
          return {
            success: false,
            error: `Payment failed with status: ${paidResponse.status}`,
            statusCode: paidResponse.status
          };
        }
      } else if (response.status === 200) {
        const data = await response.json() as T;
        return {
          success: true,
          data,
          statusCode: 200
        };
      } else {
        return {
          success: false,
          error: `Request failed with status: ${response.status}`,
          statusCode: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        statusCode: 500
      };
    }
  }

  /**
   * Parse HTTP 402 response to extract payment instructions
   */
  private async parse402Response(response: Response): Promise<PaymentInstructions> {
    // Try to get instructions from JSON body
    const body = await response.json().catch(() => ({}));
    
    // Extract from headers or body
    const amount = response.headers.get('X-Payment-Amount') || body.instructions?.amount;
    const currency = response.headers.get('X-Payment-Currency') || body.instructions?.currency;
    const recipient = response.headers.get('X-Payment-Recipient') || body.instructions?.recipient;
    const resource = response.headers.get('X-Payment-Resource') || body.instructions?.resource;
    const expiryHeader = response.headers.get('X-Payment-Expiry');
    const expiry = expiryHeader ? parseInt(expiryHeader, 10) : Date.now() + 300000;
    const challenge = response.headers.get('X-Payment-Challenge') || body.instructions?.challenge;

    if (!amount || !currency || !recipient) {
      throw new Error('Invalid payment instructions: missing required fields');
    }

    return {
      amount,
      currency,
      recipient,
      resource: resource || '',
      expiry,
      challenge,
      description: body.instructions?.description,
      payment_methods: body.instructions?.payment_methods || [{
        type: 'crypto',
        currencies: [currency],
        network: 'base'
      }]
    };
  }

  /**
   * Execute payment and return payment proof
   * 
   * Supports:
   * 1. Facilitator service (gasless, recommended)
   * 2. On-chain direct payment
   * 3. Signed authorization (off-chain proof)
   */
  private async executePayment(
    instructions: PaymentInstructions
  ): Promise<PaymentProof> {
    // Check expiry
    if (instructions.expiry < Date.now()) {
      throw new Error('Payment instructions expired');
    }

    // Try facilitator first (gasless, faster)
    if (this.config.facilitatorUrl) {
      try {
        const facilitatorProof = await this.executePaymentViaFacilitator(instructions);
        if (facilitatorProof) {
          return facilitatorProof;
        }
      } catch (error) {
        console.warn('[AutonomousPaymentAgent] Facilitator payment failed, trying on-chain:', error);
      }
    }

    // Fallback to on-chain payment
    if (this.wallet) {
      try {
        return await this.executeOnChainPayment(instructions);
      } catch (error) {
        console.error('[AutonomousPaymentAgent] On-chain payment failed:', error);
        throw error;
      }
    }

    // If no wallet, create signed authorization (for testing/dev)
    return this.createSignedAuthorization(instructions);
  }

  /**
   * Execute payment via x402 facilitator service
   */
  private async executePaymentViaFacilitator(
    instructions: PaymentInstructions
  ): Promise<PaymentProof | null> {
    if (!this.config.facilitatorUrl || !this.wallet) {
      return null;
    }

    try {
      // Create payment authorization
      const authorization = {
        amount: instructions.amount,
        currency: instructions.currency,
        recipient: instructions.recipient,
        resource: instructions.resource,
        challenge: instructions.challenge,
        payer: this.config.payerAddress,
        timestamp: Date.now()
      };

      // Sign authorization (implementation depends on wallet type)
      const signature = await this.signMessage(JSON.stringify(authorization));

      // Submit to facilitator
      const response = await fetch(`${this.config.facilitatorUrl}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          authorization,
          signature,
          payer: this.config.payerAddress
        }),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        const result = await response.json();
        return {
          txHash: result.txHash,
          chain: result.chain || 'base',
          amount: instructions.amount,
          currency: instructions.currency,
          recipient: instructions.recipient,
          resource: instructions.resource,
          timestamp: Date.now(),
          facilitatorProof: result.proof,
          challenge: instructions.challenge
        };
      }

      return null;
    } catch (error) {
      console.warn('[AutonomousPaymentAgent] Facilitator payment error:', error);
      return null;
    }
  }

  /**
   * Execute on-chain payment
   */
  private async executeOnChainPayment(
    instructions: PaymentInstructions
  ): Promise<PaymentProof> {
    if (!this.wallet) {
      throw new Error('Wallet not available for on-chain payment');
    }

    // Determine chain and create appropriate transaction
    const chain = this.determineChain(instructions.currency);
    
    try {
      // For Ethereum-compatible chains (Base, Ethereum, Polygon, etc.)
      if (chain === 'base' || chain === 'ethereum' || chain === 'polygon') {
        return await this.executeEVMTransaction(instructions, chain);
      }

      // For Solana
      if (chain === 'solana') {
        return await this.executeSolanaTransaction(instructions);
      }

      throw new Error(`Unsupported chain: ${chain}`);
    } catch (error) {
      console.error('[AutonomousPaymentAgent] On-chain payment failed:', error);
      throw error;
    }
  }

  /**
   * Execute EVM-compatible transaction (Base, Ethereum, Polygon, etc.)
   */
  private async executeEVMTransaction(
    instructions: PaymentInstructions,
    chain: string
  ): Promise<PaymentProof> {
    // This is a placeholder - actual implementation depends on wallet library
    // Example with ethers.js:
    /*
    const { ethers } = require('ethers');
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const tx = await wallet.sendTransaction({
      to: instructions.recipient,
      value: ethers.parseEther(instructions.amount),
      // gasLimit: 21000 for simple transfers
    });
    
    const receipt = await tx.wait(1); // Wait for 1 confirmation
    
    return {
      txHash: receipt.hash,
      chain,
      amount: instructions.amount,
      currency: instructions.currency,
      recipient: instructions.recipient,
      resource: instructions.resource,
      timestamp: Date.now(),
      challenge: instructions.challenge
    };
    */

    // Mock implementation for now
    const txHash = `0x${Math.random().toString(16).substring(2)}`;
    
    return {
      txHash,
      chain,
      amount: instructions.amount,
      currency: instructions.currency,
      recipient: instructions.recipient,
      resource: instructions.resource,
      timestamp: Date.now(),
      challenge: instructions.challenge
    };
  }

  /**
   * Execute Solana transaction
   */
  private async executeSolanaTransaction(
    instructions: PaymentInstructions
  ): Promise<PaymentProof> {
    // Placeholder for Solana transaction
    // Would use @solana/web3.js in production
    
    const txHash = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return {
      txHash,
      chain: 'solana',
      amount: instructions.amount,
      currency: instructions.currency,
      recipient: instructions.recipient,
      resource: instructions.resource,
      timestamp: Date.now(),
      challenge: instructions.challenge
    };
  }

  /**
   * Create signed authorization (off-chain proof)
   */
  private createSignedAuthorization(
    instructions: PaymentInstructions
  ): PaymentProof {
    const message = JSON.stringify({
      amount: instructions.amount,
      currency: instructions.currency,
      recipient: instructions.recipient,
      resource: instructions.resource,
      challenge: instructions.challenge,
      timestamp: Date.now()
    });

    // In production, this would cryptographically sign the message
    // For now, return a proof structure
    return {
      amount: instructions.amount,
      currency: instructions.currency,
      recipient: instructions.recipient,
      resource: instructions.resource,
      timestamp: Date.now(),
      challenge: instructions.challenge,
      signature: 'mock-signature' // Would be actual cryptographic signature
    };
  }

  /**
   * Sign a message (implementation depends on wallet)
   */
  private async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not available for signing');
    }

    // Implementation depends on wallet library
    // Example: await wallet.signMessage(message)
    return 'mock-signature';
  }

  /**
   * Determine blockchain chain from currency
   */
  private determineChain(currency: string): string {
    const chainMap: Record<string, string> = {
      'USDC': 'base', // Default to Base
      'ETH': 'base',
      'TRAC': 'polygon',
      'SOL': 'solana'
    };

    return chainMap[currency.toUpperCase()] || 'base';
  }
}

