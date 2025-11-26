/**
 * XCM (Cross-Consensus Messaging) Integration for DotRep
 * 
 * This module provides XCM message handling for cross-chain payments,
 * reputation queries, and automated triggers. Supports both real XCM
 * and mock mode for hackathon demos.
 * 
 * Based on Polkadot XCM v3 integration guidance:
 * - XCM message construction and parsing
 * - Cross-chain payment triggers
 * - Reputation update automation
 * - Mock XCM payloads for demo
 */

export interface XCMPayload {
  sourceChain: string;
  targetChain: string;
  sender: string;
  recipient?: string;
  amount?: number;
  messageType: 'payment' | 'reputation_query' | 'reputation_update' | 'endorsement' | 'custom';
  messageData: any;
  queryId?: string;
  timestamp: number;
}

export interface XCMEvent {
  type: 'XcmSent' | 'XcmReceived' | 'XcmExecuted' | 'XcmFailed';
  payload: XCMPayload;
  blockHash?: string;
  blockNumber?: number;
  transactionHash?: string;
  executionResult?: 'success' | 'failed' | 'pending';
  error?: string;
}

export interface XCMConfig {
  sourceChain?: string;
  targetChain?: string;
  useMockMode?: boolean;
  onXCMReceived?: (event: XCMEvent) => Promise<void>;
  onXCMExecuted?: (event: XCMEvent) => Promise<void>;
}

/**
 * XCM Integration Service
 * 
 * Handles XCM messages for cross-chain operations. In production,
 * this would integrate with Polkadot's XCM pallet. For hackathons,
 * provides mock XCM payloads that demonstrate the flow.
 */
export class XCMIntegration {
  private config: Required<XCMConfig>;
  private receivedMessages: XCMEvent[] = [];
  private mockMode: boolean;

  constructor(config: XCMConfig = {}) {
    const getEnvVar = (name: string): string | undefined => {
      try {
        const proc = (globalThis as any).process || (globalThis as any).global?.process;
        return proc?.env?.[name];
      } catch {
        return undefined;
      }
    };

    this.config = {
      sourceChain: config.sourceChain || getEnvVar('XCM_SOURCE_CHAIN') || 'polkadot',
      targetChain: config.targetChain || getEnvVar('XCM_TARGET_CHAIN') || 'neuroweb',
      useMockMode: config.useMockMode ?? getEnvVar('XCM_USE_MOCK') === 'true' ?? true,
      onXCMReceived: config.onXCMReceived,
      onXCMExecuted: config.onXCMExecuted,
    };
    this.mockMode = this.config.useMockMode;
  }

  /**
   * Generate a mock XCM payload for demo purposes
   * 
   * This simulates an XCM message that would be sent from another
   * parachain to trigger a reputation update or payment.
   */
  generateMockXCMPayload(
    messageType: XCMPayload['messageType'],
    data: {
      sender: string;
      recipient?: string;
      amount?: number;
      [key: string]: any;
    }
  ): XCMPayload {
    const payload: XCMPayload = {
      sourceChain: this.config.sourceChain,
      targetChain: this.config.targetChain,
      sender: data.sender,
      recipient: data.recipient,
      amount: data.amount,
      messageType,
      messageData: {
        ...data,
        mock: true,
      },
      queryId: `xcm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    console.log(`📤 [MOCK] Generated XCM payload:`);
    console.log(`   Type: ${messageType}`);
    console.log(`   From: ${payload.sourceChain} (${payload.sender})`);
    console.log(`   To: ${payload.targetChain}`);
    if (payload.amount) {
      console.log(`   Amount: ${payload.amount}`);
    }
    console.log(`   Query ID: ${payload.queryId}`);

    return payload;
  }

  /**
   * Simulate receiving an XCM message
   * 
   * In production, this would be triggered by actual XCM events
   * from the Polkadot runtime. For demos, this simulates the
   * message reception and processing.
   */
  async simulateXCMReceived(payload: XCMPayload): Promise<XCMEvent> {
    const event: XCMEvent = {
      type: 'XcmReceived',
      payload,
      blockHash: `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('')}`,
      blockNumber: Math.floor(Date.now() / 1000),
      transactionHash: `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('')}`,
      executionResult: 'pending',
    };

    this.receivedMessages.push(event);

    console.log(`📥 XCM message received:`);
    console.log(`   Type: ${payload.messageType}`);
    console.log(`   Query ID: ${payload.queryId}`);
    console.log(`   Block: #${event.blockNumber}`);

    // Call callback if provided
    if (this.config.onXCMReceived) {
      await this.config.onXCMReceived(event);
    }

    return event;
  }

  /**
   * Process an XCM message and trigger appropriate actions
   * 
   * This is where the actual business logic happens:
   * - Payment messages trigger payment processing
   * - Reputation queries trigger reputation lookups
   * - Endorsement messages trigger reputation updates
   */
  async processXCMessage(event: XCMEvent): Promise<XCMEvent> {
    const { payload } = event;

    console.log(`⚙️  Processing XCM message: ${payload.messageType}`);

    try {
      switch (payload.messageType) {
        case 'payment':
          await this.handlePaymentMessage(payload);
          break;
        case 'reputation_query':
          await this.handleReputationQuery(payload);
          break;
        case 'reputation_update':
          await this.handleReputationUpdate(payload);
          break;
        case 'endorsement':
          await this.handleEndorsement(payload);
          break;
        default:
          console.warn(`⚠️  Unknown message type: ${payload.messageType}`);
      }

      event.executionResult = 'success';
      event.type = 'XcmExecuted';

      if (this.config.onXCMExecuted) {
        await this.config.onXCMExecuted(event);
      }
    } catch (error: any) {
      event.executionResult = 'failed';
      event.type = 'XcmFailed';
      event.error = error.message;
      console.error(`❌ XCM processing failed:`, error.message);
    }

    return event;
  }

  /**
   * Handle payment XCM message
   * 
   * In production, this would:
   * 1. Verify the payment on the source chain
   * 2. Process the payment on NeuroWeb
   * 3. Trigger reputation update or endorsement
   */
  private async handlePaymentMessage(payload: XCMPayload): Promise<void> {
    console.log(`💰 Processing payment from ${payload.sender}`);
    console.log(`   Amount: ${payload.amount || 'N/A'}`);

    // In production, this would:
    // - Verify payment on source chain
    // - Transfer funds or record payment
    // - Trigger reputation/endorsement update

    // For demo, just log the action
    if (payload.messageData?.triggerReputationUpdate) {
      console.log(`   → Triggering reputation update for ${payload.recipient}`);
    }
  }

  /**
   * Handle reputation query XCM message
   */
  private async handleReputationQuery(payload: XCMPayload): Promise<void> {
    console.log(`🔍 Processing reputation query for ${payload.recipient || payload.sender}`);

    // In production, this would:
    // - Query reputation from DKG
    // - Send response back via XCM
    // - Include reputation score, breakdown, etc.
  }

  /**
   * Handle reputation update XCM message
   */
  private async handleReputationUpdate(payload: XCMPayload): Promise<void> {
    console.log(`📊 Processing reputation update for ${payload.recipient || payload.sender}`);

    // In production, this would:
    // - Update reputation based on message data
    // - Publish updated KA to DKG
    // - Anchor on NeuroWeb
  }

  /**
   * Handle endorsement XCM message
   */
  private async handleEndorsement(payload: XCMPayload): Promise<void> {
    console.log(`👍 Processing endorsement from ${payload.sender} for ${payload.recipient}`);

    // In production, this would:
    // - Create endorsement KA
    // - Publish to DKG
    // - Update reputation scores
    // - Anchor on NeuroWeb
  }

  /**
   * Create a complete demo flow: payment → XCM → reputation update
   * 
   * This demonstrates the full cross-chain flow for hackathon demos.
   */
  async demoPaymentToReputationFlow(
    brandAddress: string,
    creatorAddress: string,
    amount: number
  ): Promise<{
    paymentEvent: XCMEvent;
    reputationEvent?: XCMEvent;
  }> {
    console.log(`\n🎬 Starting demo: Payment → XCM → Reputation Update`);
    console.log(`   Brand: ${brandAddress}`);
    console.log(`   Creator: ${creatorAddress}`);
    console.log(`   Amount: ${amount}`);

    // Step 1: Generate payment XCM payload
    const paymentPayload = this.generateMockXCMPayload('payment', {
      sender: brandAddress,
      recipient: creatorAddress,
      amount,
      triggerReputationUpdate: true,
      campaignId: `campaign-${Date.now()}`,
    });

    // Step 2: Simulate receiving the payment message
    const paymentEvent = await this.simulateXCMReceived(paymentPayload);

    // Step 3: Process the payment
    await this.processXCMessage(paymentEvent);

    // Step 4: Generate endorsement XCM payload (triggered by payment)
    const endorsementPayload = this.generateMockXCMPayload('endorsement', {
      sender: brandAddress,
      recipient: creatorAddress,
      amount,
      endorsementType: 'campaign_participation',
      campaignId: paymentPayload.messageData.campaignId,
    });

    // Step 5: Simulate receiving the endorsement message
    const endorsementEvent = await this.simulateXCMReceived(endorsementPayload);

    // Step 6: Process the endorsement
    await this.processXCMessage(endorsementEvent);

    console.log(`✅ Demo flow completed!`);

    return {
      paymentEvent,
      reputationEvent: endorsementEvent,
    };
  }

  /**
   * Get all received XCM messages
   */
  getReceivedMessages(): XCMEvent[] {
    return [...this.receivedMessages];
  }

  /**
   * Get XCM integration status
   */
  getStatus(): {
    mockMode: boolean;
    sourceChain: string;
    targetChain: string;
    messagesReceived: number;
  } {
    return {
      mockMode: this.mockMode,
      sourceChain: this.config.sourceChain,
      targetChain: this.config.targetChain,
      messagesReceived: this.receivedMessages.length,
    };
  }

  /**
   * Clear message history
   */
  clearHistory(): void {
    this.receivedMessages = [];
    console.log('🗑️  Cleared XCM message history');
  }
}

/**
 * Factory function to create XCM integration
 */
export function createXCMIntegration(config?: XCMConfig): XCMIntegration {
  return new XCMIntegration(config);
}

export default XCMIntegration;

