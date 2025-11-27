/**
 * x402 Economic Integration Orchestrator
 * 
 * Orchestrates economic transactions with x402 payment protocol integration.
 * Handles payment execution, diminishing returns detection, and transaction recording.
 */

import { EconomicDecision, PremiumDataSource } from './trustEconomicDecisionEngine';
import { AutonomousPaymentAgent } from './m2mCommerce/autonomousPaymentAgent';
import type { AutonomousAgentConfig } from './m2mCommerce/types';

export interface EconomicTransaction {
  id: string;
  timestamp: string;
  user: string;
  decision: EconomicDecision;
  payments: Array<{
    source: string;
    amount: number;
    txHash?: string;
    chain?: string;
    success: boolean;
    uniqueValueEstimate: number;
  }>;
  totalCost: number;
  economicRationale: string;
  roi: number;
}

export class X402EconomicOrchestrator {
  private facilitatorEndpoint: string;
  private x402Agent: AutonomousPaymentAgent;
  private transactionHistory: Map<string, EconomicTransaction>;
  private dkgClient?: any;

  constructor(config: {
    facilitatorEndpoint: string;
    x402Config: AutonomousAgentConfig;
    dkgClient?: any;
  }) {
    this.facilitatorEndpoint = config.facilitatorEndpoint;
    this.x402Agent = new AutonomousPaymentAgent(config.x402Config);
    this.dkgClient = config.dkgClient;
    this.transactionHistory = new Map();
  }

  /**
   * Execute economic transaction with x402 payments
   */
  async executeEconomicTransaction(
    decision: EconomicDecision,
    userDid: string,
    queryContext?: Record<string, any>
  ): Promise<EconomicTransaction> {
    const transaction: EconomicTransaction = {
      id: `eco_${Date.now()}_${userDid.slice(-8)}`,
      timestamp: new Date().toISOString(),
      user: userDid,
      decision,
      payments: [],
      totalCost: 0,
      economicRationale: decision.decisionRationale,
      roi: 0,
    };

    // Execute each approved payment
    for (const source of decision.premiumSources) {
      if (transaction.totalCost + source.cost > decision.maxBudget) {
        console.log(`💰 Budget limit reached at $${transaction.totalCost.toFixed(2)}`);
        break;
      }

      // Check for diminishing returns
      if (this.diminishingReturns(transaction.payments)) {
        console.log('🔄 Diminishing returns detected, stopping acquisitions');
        break;
      }

      const paymentResult = await this.executeSingleEconomicPayment(source, userDid);

      if (paymentResult.success) {
        transaction.payments.push(paymentResult);
        transaction.totalCost += source.cost;
      }
    }

    // Calculate ROI
    transaction.roi = this.calculateROI(decision, transaction.totalCost);

    // Record economic transaction to DKG
    await this.recordEconomicTransaction(transaction);

    // Store in history
    this.transactionHistory.set(transaction.id, transaction);

    return transaction;
  }

  /**
   * Execute single economic payment
   */
  private async executeSingleEconomicPayment(
    source: PremiumDataSource,
    userDid: string
  ): Promise<{
    source: string;
    amount: number;
    txHash?: string;
    chain?: string;
    success: boolean;
    uniqueValueEstimate: number;
  }> {
    try {
      console.log(`💸 Executing payment for ${source.name}: $${source.cost.toFixed(2)}`);

      const paymentResult = await this.x402Agent.requestResource({
        url: source.url,
        maxPrice: source.cost.toString(),
      });

      if (paymentResult.success && paymentResult.paymentEvidence) {
        const evidence = paymentResult.paymentEvidence;

        return {
          source: source.name,
          amount: source.cost,
          txHash: evidence.txHash,
          chain: evidence.chain,
          success: true,
          uniqueValueEstimate: source.expectedROI, // Use expected ROI as value estimate
        };
      } else {
        return {
          source: source.name,
          amount: source.cost,
          success: false,
          uniqueValueEstimate: 0,
        };
      }
    } catch (error) {
      console.error(`❌ Payment failed for ${source.name}:`, error);
      return {
        source: source.name,
        amount: source.cost,
        success: false,
        uniqueValueEstimate: 0,
      };
    }
  }

  /**
   * Detect diminishing returns
   * Simple heuristic: if last 2 payments added less than 10% unique value
   */
  private diminishingReturns(completedPayments: EconomicTransaction['payments']): boolean {
    if (completedPayments.length < 3) return false;

    const recentPayments = completedPayments.slice(-2);
    const uniqueValue = recentPayments.reduce(
      (sum, payment) => sum + payment.uniqueValueEstimate,
      0
    );

    return uniqueValue < 0.1; // Less than 10% unique value
  }

  /**
   * Calculate ROI for transaction
   */
  private calculateROI(decision: EconomicDecision, totalCost: number): number {
    if (totalCost === 0) return 0;

    const expectedValue = decision.expectedROI + totalCost; // ROI + cost = value
    return (expectedValue - totalCost) / totalCost;
  }

  /**
   * Record economic transaction to DKG
   */
  private async recordEconomicTransaction(transaction: EconomicTransaction): Promise<void> {
    if (!this.dkgClient) {
      console.log('📝 DKG client not configured, skipping transaction recording');
      return;
    }

    try {
      // Create economic activity asset
      const economicAsset = {
        '@context': {
          '@vocab': 'https://schema.org/',
          dotrep: 'https://dotrep.io/ontology/',
        },
        '@type': 'EconomicActivity',
        '@id': `economic:${transaction.id}`,
        creator: transaction.user,
        timestamp: transaction.timestamp,
        'dotrep:economicDecision': {
          trustTier: transaction.decision.trustTier,
          maxBudget: transaction.decision.maxBudget,
          shouldInvest: transaction.decision.shouldInvest,
        },
        'dotrep:payments': transaction.payments.map((p) => ({
          source: p.source,
          amount: p.amount,
          txHash: p.txHash,
          chain: p.chain,
          success: p.success,
        })),
        'dotrep:metrics': {
          totalCost: transaction.totalCost,
          roi: transaction.roi,
          paymentCount: transaction.payments.length,
        },
        'dotrep:rationale': transaction.economicRationale,
      };

      // Publish to DKG
      await this.dkgClient.publishReputationAsset(economicAsset, 2); // Store for 2 epochs

      console.log(`✅ Recorded economic transaction ${transaction.id} to DKG`);
    } catch (error) {
      console.warn(`⚠️ Failed to record economic transaction to DKG:`, error);
    }
  }

  /**
   * Get transaction history for user
   */
  getTransactionHistory(userDid: string): EconomicTransaction[] {
    return Array.from(this.transactionHistory.values()).filter(
      (tx) => tx.user === userDid
    );
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): EconomicTransaction | undefined {
    return this.transactionHistory.get(transactionId);
  }
}

