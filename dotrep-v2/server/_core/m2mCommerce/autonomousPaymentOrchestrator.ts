/**
 * Autonomous Payment Orchestrator
 * 
 * Orchestrates the complete autonomous payment flow:
 * 1. Decision engine analyzes query and decides if payment is justified
 * 2. Budget manager checks if payment is within limits
 * 3. x402 payment agent executes the payment
 * 4. Payment evidence is recorded to DKG
 * 
 * This is the main integration point for autonomous chatbot payments.
 */

import { AutonomousPaymentDecisionEngine, PremiumDataSource, UserContext } from './autonomousPaymentDecisionEngine';
import { AutonomousBudgetManager, SpendingRecord } from './autonomousBudgetManager';
import { AutonomousPaymentAgent } from './autonomousPaymentAgent';
import type { PaymentProof } from './types';

export interface PaymentOrchestratorConfig {
  decisionEngine: AutonomousPaymentDecisionEngine;
  budgetManager: AutonomousBudgetManager;
  paymentAgent: AutonomousPaymentAgent;
  dkgClient?: any; // Optional DKG client for recording payments
}

export interface PaymentExecutionResult {
  success: boolean;
  data?: any;
  paymentProof?: PaymentProof;
  amountPaid?: number;
  sources?: Array<{
    name: string;
    cost: number;
    data?: any;
  }>;
  error?: string;
  decision?: {
    shouldPay: boolean;
    rationale: string;
    maxAmount?: number;
  };
}

export class AutonomousPaymentOrchestrator {
  private decisionEngine: AutonomousPaymentDecisionEngine;
  private budgetManager: AutonomousBudgetManager;
  private paymentAgent: AutonomousPaymentAgent;
  private dkgClient?: any;
  private paymentHistory: Map<string, PaymentProof[]> = new Map(); // userId -> payments[]

  constructor(config: PaymentOrchestratorConfig) {
    this.decisionEngine = config.decisionEngine;
    this.budgetManager = config.budgetManager;
    this.paymentAgent = config.paymentAgent;
    this.dkgClient = config.dkgClient;
  }

  /**
   * Main method: Process query and autonomously pay for premium data if justified
   */
  async processQueryWithAutonomousPayment(
    userQuery: string,
    userContext: UserContext,
    freeDataSources?: any[] // Data already available from free sources
  ): Promise<PaymentExecutionResult> {
    try {
      // Step 1: Identify premium data sources that could enhance the response
      const queryAnalysis = this.decisionEngine.analyzeQuery(userQuery);
      const premiumSources = this.decisionEngine.identifyPremiumSources(queryAnalysis);

      if (premiumSources.length === 0) {
        return {
          success: true,
          decision: {
            shouldPay: false,
            rationale: 'No premium data sources identified for this query'
          }
        };
      }

      // Step 2: Autonomous payment decision
      const paymentDecision = await this.decisionEngine.shouldPayForData(
        userQuery,
        userContext,
        premiumSources
      );

      if (!paymentDecision.shouldPay) {
        return {
          success: true,
          decision: {
            shouldPay: false,
            rationale: paymentDecision.rationale
          }
        };
      }

      // Step 3: Check budget constraints
      const budgetCheck = this.budgetManager.canSpend(
        paymentDecision.maxAmount || 0,
        { userId: userContext.userId }
      );

      if (!budgetCheck.allowed) {
        return {
          success: false,
          error: `Budget constraints not met: ${JSON.stringify(budgetCheck.constraints)}`,
          decision: {
            shouldPay: true,
            rationale: paymentDecision.rationale,
            maxAmount: paymentDecision.maxAmount
          }
        };
      }

      // Step 4: Execute payments for recommended sources
      const purchasedData: Array<{ name: string; cost: number; data?: any }> = [];
      let totalPaid = 0;
      const paymentProofs: PaymentProof[] = [];

      for (const source of paymentDecision.recommendedSources || []) {
        if (totalPaid + source.cost > (paymentDecision.maxAmount || 0)) {
          break; // Stop if we'd exceed max amount
        }

        try {
          // Execute x402 payment
          const paymentResult = await this.executeX402Payment(source, userContext);

          if (paymentResult.success && paymentResult.paymentProof) {
            purchasedData.push({
              name: source.name,
              cost: source.cost,
              data: paymentResult.data
            });

            totalPaid += source.cost;
            paymentProofs.push(paymentResult.paymentProof);

            // Record spending
            this.budgetManager.recordSpending(
              source.cost,
              source.url,
              userContext.userId,
              paymentDecision.rationale,
              paymentResult.paymentProof.txHash
            );

            // Record payment to decision engine
            this.decisionEngine.recordPayment(source.cost, userContext.userId, source.url);

            // Record payment history
            if (!this.paymentHistory.has(userContext.userId)) {
              this.paymentHistory.set(userContext.userId, []);
            }
            this.paymentHistory.get(userContext.userId)!.push(paymentResult.paymentProof);
          }
        } catch (error) {
          console.warn(`[PaymentOrchestrator] Failed to purchase ${source.name}:`, error);
          // Continue with other sources
        }
      }

      // Step 5: Record payment evidence to DKG (if enabled)
      if (this.dkgClient && paymentProofs.length > 0) {
        try {
          await this.recordPaymentToDKG(paymentProofs, userContext, paymentDecision);
        } catch (error) {
          console.warn('[PaymentOrchestrator] Failed to record payment to DKG:', error);
          // Don't fail the whole operation if DKG recording fails
        }
      }

      return {
        success: purchasedData.length > 0,
        data: purchasedData.length > 0 ? this.combineData(purchasedData) : undefined,
        paymentProof: paymentProofs[0], // Return first payment proof
        amountPaid: totalPaid,
        sources: purchasedData,
        decision: {
          shouldPay: true,
          rationale: paymentDecision.rationale,
          maxAmount: paymentDecision.maxAmount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        decision: {
          shouldPay: false,
          rationale: 'Error during payment decision process'
        }
      };
    }
  }

  /**
   * Execute x402 payment for a specific data source
   */
  private async executeX402Payment(
    source: PremiumDataSource,
    userContext: UserContext
  ): Promise<{ success: boolean; paymentProof?: PaymentProof; data?: any; error?: string }> {
    try {
      // Use autonomous payment agent to acquire resource
      const result = await this.paymentAgent.acquireResource(source.url, source.cost.toString());

      // Extract payment proof from agent (if available)
      // The agent should have executed the payment and stored the proof
      const paymentProof: PaymentProof = {
        amount: source.cost.toString(),
        currency: 'USDC',
        recipient: '', // Will be filled by payment agent
        resource: source.url,
        timestamp: Date.now()
      };

      return {
        success: true,
        paymentProof,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment execution failed'
      };
    }
  }

  /**
   * Record payment evidence to DKG for transparency
   */
  private async recordPaymentToDKG(
    paymentProofs: PaymentProof[],
    userContext: UserContext,
    decision: any
  ): Promise<void> {
    if (!this.dkgClient) return;

    try {
      const paymentEvidence = {
        payer: userContext.userId,
        payerDid: userContext.userDid,
        payments: paymentProofs.map(proof => ({
          amount: proof.amount,
          currency: proof.currency,
          recipient: proof.recipient,
          resource: proof.resource,
          timestamp: proof.timestamp,
          txHash: proof.txHash,
          chain: proof.chain
        })),
        decision: {
          rationale: decision.rationale,
          factors: decision.factors,
          timestamp: Date.now()
        },
        metadata: {
          source: 'autonomous_payment_orchestrator',
          version: '1.0.0',
          protocol: 'x402'
        }
      };

      // Publish to DKG (implementation depends on DKG client)
      if (this.dkgClient.publishPaymentEvidence) {
        await this.dkgClient.publishPaymentEvidence(paymentEvidence);
      } else {
        // Fallback: use generic publish method
        await this.dkgClient.publish(paymentEvidence, 'payment_evidence', 2);
      }

      console.log(`✅ Recorded ${paymentProofs.length} payment(s) to DKG for user ${userContext.userId}`);
    } catch (error) {
      console.error('Failed to record payment to DKG:', error);
      throw error;
    }
  }

  /**
   * Combine data from multiple purchased sources
   */
  private combineData(sources: Array<{ name: string; cost: number; data?: any }>): any {
    // Simple combination: merge all data objects
    const combined: any = {
      sources: sources.map(s => s.name),
      data: {}
    };

    sources.forEach(source => {
      if (source.data) {
        combined.data[source.name] = source.data;
      }
    });

    return combined;
  }

  /**
   * Get payment history for a user
   */
  getPaymentHistory(userId: string): PaymentProof[] {
    return this.paymentHistory.get(userId) || [];
  }

  /**
   * Get budget status
   */
  getBudgetStatus() {
    return this.budgetManager.getBudgetStatus();
  }
}

