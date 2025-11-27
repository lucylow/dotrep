/**
 * Trust-Based Economic Chatbot
 * 
 * A chatbot that makes spending decisions based on user reputation and value analysis.
 * Implements autonomous, trust-based economic decisions with x402 payment integration.
 */

import { TrustEconomicDecisionEngine, EconomicDecision, PremiumDataSource } from './trustEconomicDecisionEngine';
import { AutonomousPaymentAgent } from './m2mCommerce/autonomousPaymentAgent';
import type { AutonomousAgentConfig } from './m2mCommerce/types';

export interface ChatbotResponse {
  response: string;
  economicDecision: EconomicDecision;
  purchasedData: Array<{
    source: string;
    cost: number;
    data: any;
    paymentProof?: any;
  }>;
  totalSpend: number;
  qualityTier: 'PREMIUM' | 'ENHANCED' | 'BASIC';
  metadata: {
    trustTier: string;
    budgetAllocated: number;
    actualSpend: number;
    dataSources: string[];
    decisionRationale: string;
  };
}

export interface BudgetManager {
  getRemainingBudget(userDid: string, period: 'daily' | 'weekly' | 'monthly'): Promise<number>;
  recordSpend(userDid: string, amount: number, description: string): Promise<void>;
  canSpend(userDid: string, amount: number): Promise<boolean>;
}

export class TrustEconomicChatbot {
  private decisionEngine: TrustEconomicDecisionEngine;
  private x402Agent?: AutonomousPaymentAgent;
  private budgetManager?: BudgetManager;
  private conversationHistory: Map<string, Array<{ query: string; response: ChatbotResponse }>>;

  constructor(config: {
    decisionEngine: TrustEconomicDecisionEngine;
    x402Config?: AutonomousAgentConfig;
    budgetManager?: BudgetManager;
  }) {
    this.decisionEngine = config.decisionEngine;
    this.budgetManager = config.budgetManager;

    if (config.x402Config) {
      this.x402Agent = new AutonomousPaymentAgent(config.x402Config);
    }

    this.conversationHistory = new Map();
  }

  /**
   * Main chatbot loop with trust-based economic decisions
   */
  async processQuery(
    userDid: string,
    userQuery: string,
    context?: Record<string, any>
  ): Promise<ChatbotResponse> {
    console.log(`🔍 Analyzing query from ${userDid}: '${userQuery}'`);

    // Step 1: Make economic decision based on trust
    const economicDecision = await this.decisionEngine.makeEconomicDecision(
      userDid,
      userQuery,
      context
    );

    console.log(`💰 Economic Decision: ${economicDecision.decisionRationale}`);

    // Step 2: Check budget constraints
    if (this.budgetManager) {
      const canSpend = await this.budgetManager.canSpend(userDid, economicDecision.maxBudget);
      if (!canSpend) {
        console.log(`⚠️ Budget constraint: Cannot spend ${economicDecision.maxBudget}`);
        economicDecision.shouldInvest = false;
        economicDecision.premiumSources = [];
      }
    }

    // Step 3: Execute payments if justified
    const purchasedData = economicDecision.shouldInvest
      ? await this.executeDataAcquisitions(
          economicDecision.premiumSources,
          economicDecision.maxBudget,
          userDid
        )
      : [];

    // Step 4: Generate response with appropriate data sources
    const response = await this.generateTrustAwareResponse(
      userQuery,
      purchasedData,
      economicDecision,
      userDid
    );

    // Step 5: Record economic activity
    await this.recordEconomicActivity(userDid, economicDecision, purchasedData);

    // Step 6: Store in conversation history
    this.addToHistory(userDid, userQuery, response);

    return response;
  }

  /**
   * Execute x402 payments for premium data
   */
  private async executeDataAcquisitions(
    premiumSources: PremiumDataSource[],
    maxBudget: number,
    userDid: string
  ): Promise<Array<{ source: string; cost: number; data: any; paymentProof?: any }>> {
    if (!this.x402Agent) {
      console.warn('⚠️ x402 agent not configured, skipping data acquisitions');
      return [];
    }

    const purchasedData: Array<{ source: string; cost: number; data: any; paymentProof?: any }> = [];
    let totalSpent = 0;

    for (const source of premiumSources) {
      if (totalSpent + source.cost > maxBudget) {
        console.log(`💰 Budget limit reached. Stopping acquisitions at ${totalSpent.toFixed(2)}`);
        break;
      }

      try {
        console.log(`💸 Purchasing ${source.name} for $${source.cost.toFixed(2)}`);

        const paymentResult = await this.x402Agent.requestResource({
          url: source.url,
          maxPrice: source.cost.toString(),
        });

        if (paymentResult.success && paymentResult.data) {
          purchasedData.push({
            source: source.name,
            cost: source.cost,
            data: paymentResult.data,
            paymentProof: paymentResult.paymentEvidence,
          });

          totalSpent += source.cost;

          // Record spend if budget manager available
          if (this.budgetManager) {
            await this.budgetManager.recordSpend(
              userDid,
              source.cost,
              `Data acquisition: ${source.name}`
            );
          }

          console.log(`✅ Successfully acquired ${source.name}`);
        } else {
          console.warn(`⚠️ Failed to acquire ${source.name}: ${paymentResult.error}`);
        }
      } catch (error) {
        console.error(`❌ Error acquiring ${source.name}:`, error);
      }
    }

    console.log(`📊 Total data acquisition spend: $${totalSpent.toFixed(2)}`);

    return purchasedData;
  }

  /**
   * Generate trust-aware response with purchased data
   */
  private async generateTrustAwareResponse(
    userQuery: string,
    purchasedData: Array<{ source: string; cost: number; data: any }>,
    economicDecision: EconomicDecision,
    userDid: string
  ): Promise<ChatbotResponse> {
    // Determine quality tier based on data sources
    const qualityTier = this.determineQualityTier(purchasedData, economicDecision);

    // Generate response text (in production, would use LLM)
    const responseText = this.generateResponseText(userQuery, purchasedData, qualityTier);

    const totalSpend = purchasedData.reduce((sum, item) => sum + item.cost, 0);

    return {
      response: responseText,
      economicDecision,
      purchasedData,
      totalSpend,
      qualityTier,
      metadata: {
        trustTier: economicDecision.trustTier,
        budgetAllocated: economicDecision.maxBudget,
        actualSpend: totalSpend,
        dataSources: purchasedData.map((d) => d.source),
        decisionRationale: economicDecision.decisionRationale,
      },
    };
  }

  /**
   * Determine response quality tier
   */
  private determineQualityTier(
    purchasedData: Array<{ source: string; cost: number; data: any }>,
    economicDecision: EconomicDecision
  ): ChatbotResponse['qualityTier'] {
    if (purchasedData.length === 0) {
      return 'BASIC';
    }

    const highValueSources = purchasedData.filter((d) => {
      const source = economicDecision.premiumSources.find((s) => s.name === d.source);
      return source?.value === 'high';
    });

    if (highValueSources.length > 0) {
      return 'PREMIUM';
    }

    return 'ENHANCED';
  }

  /**
   * Generate response text (simplified - would use LLM in production)
   */
  private generateResponseText(
    userQuery: string,
    purchasedData: Array<{ source: string; data: any }>,
    qualityTier: ChatbotResponse['qualityTier']
  ): string {
    let response = `Based on your query: "${userQuery}"\n\n`;

    if (purchasedData.length > 0) {
      response += `I've analyzed premium data sources to provide you with enhanced insights:\n\n`;
      purchasedData.forEach((item) => {
        response += `• ${item.source}: [Data analysis would be integrated here]\n`;
      });
      response += `\nThis response is based on ${qualityTier.toLowerCase()} quality data sources.`;
    } else {
      response += `I can provide a basic response based on general knowledge. For more detailed insights, consider upgrading your trust tier or providing more context about your specific needs.`;
    }

    return response;
  }

  /**
   * Record economic activity to DKG (if configured)
   */
  private async recordEconomicActivity(
    userDid: string,
    economicDecision: EconomicDecision,
    purchasedData: Array<{ source: string; cost: number; paymentProof?: any }>
  ): Promise<void> {
    // In production, would publish economic activity to DKG
    // For now, just log
    console.log(`📝 Recording economic activity for ${userDid}:`, {
      decision: economicDecision.decisionRationale,
      totalSpend: purchasedData.reduce((sum, d) => sum + d.cost, 0),
      sources: purchasedData.map((d) => d.source),
    });
  }

  /**
   * Add to conversation history
   */
  private addToHistory(userDid: string, query: string, response: ChatbotResponse): void {
    if (!this.conversationHistory.has(userDid)) {
      this.conversationHistory.set(userDid, []);
    }

    const history = this.conversationHistory.get(userDid)!;
    history.push({ query, response });

    // Keep only last 10 conversations
    if (history.length > 10) {
      history.shift();
    }
  }

  /**
   * Get conversation history for user
   */
  getConversationHistory(userDid: string): Array<{ query: string; response: ChatbotResponse }> {
    return this.conversationHistory.get(userDid) || [];
  }
}

