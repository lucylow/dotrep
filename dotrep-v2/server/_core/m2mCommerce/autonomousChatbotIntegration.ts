/**
 * Autonomous Chatbot Integration
 * 
 * Integration layer for connecting autonomous payment decision system
 * with chatbot/agent systems (e.g., DKGAIAgent).
 * 
 * This enables chatbots to autonomously decide to pay for premium data
 * to enhance their responses.
 */

import {
  AutonomousPaymentDecisionEngine,
  type UserContext,
  type PremiumDataSource
} from './autonomousPaymentDecisionEngine';
import { AutonomousBudgetManager } from './autonomousBudgetManager';
import { AutonomousPaymentOrchestrator } from './autonomousPaymentOrchestrator';
import { AutonomousPaymentAgent } from './autonomousPaymentAgent';
import type { AutonomousAgentConfig } from './types';

export interface ChatbotPaymentConfig {
  /** Daily budget limit in USD */
  dailyBudget?: number;
  /** Per-query budget limit in USD */
  perQueryBudget?: number;
  /** Monthly budget limit in USD (optional) */
  monthlyBudget?: number;
  /** x402 payment agent configuration */
  paymentAgentConfig?: Partial<AutonomousAgentConfig>;
  /** DKG client for recording payments (optional) */
  dkgClient?: any;
}

export interface EnhancedQueryResult {
  response: string;
  citations: string[];
  confidence: number;
  paymentInfo?: {
    amountPaid: number;
    sources: string[];
    rationale: string;
    txHash?: string;
  };
  purchasedData?: any;
}

/**
 * Autonomous Chatbot with Payment Capability
 * 
 * Wraps a chatbot/agent to add autonomous payment decision capabilities.
 */
export class AutonomousChatbot {
  private orchestrator: AutonomousPaymentOrchestrator;
  private decisionEngine: AutonomousPaymentDecisionEngine;
  private budgetManager: AutonomousBudgetManager;
  private conversationContext: Map<string, any> = new Map();

  constructor(config: ChatbotPaymentConfig) {
    // Initialize budget manager
    this.budgetManager = new AutonomousBudgetManager({
      dailyBudget: config.dailyBudget || 10.0,
      perQueryBudget: config.perQueryBudget || 2.0,
      monthlyBudget: config.monthlyBudget
    });

    // Initialize decision engine
    this.decisionEngine = new AutonomousPaymentDecisionEngine({
      daily: config.dailyBudget || 10.0,
      perQuery: config.perQueryBudget || 2.0,
      monthly: config.monthlyBudget
    });

    // Initialize payment agent
    const paymentAgent = new AutonomousPaymentAgent(
      {
        agentId: 'autonomous-chatbot',
        payerAddress: config.paymentAgentConfig?.payerAddress || '',
        maxPaymentAmount: config.perQueryBudget?.toString() || '2.0',
        ...config.paymentAgentConfig
      }
    );

    // Initialize orchestrator
    this.orchestrator = new AutonomousPaymentOrchestrator({
      decisionEngine: this.decisionEngine,
      budgetManager: this.budgetManager,
      paymentAgent,
      dkgClient: config.dkgClient
    });
  }

  /**
   * Process a user message with autonomous payment capability
   */
  async processMessage(
    userMessage: string,
    userId: string,
    options?: {
      userDid?: string;
      userReputation?: number;
      userTrustLevel?: number;
    }
  ): Promise<EnhancedQueryResult> {
    // Get or create conversation context
    const context = this.conversationContext.get(userId) || {};
    context.lastMessage = userMessage;
    context.timestamp = Date.now();

    // Build user context
    const userContext: UserContext = {
      userId,
      userDid: options?.userDid,
      trustLevel: options?.userTrustLevel,
      reputationScore: options?.userReputation
    };

    // Step 1: Check what free data we already have
    const freeDataSources = await this.queryFreeSources(userMessage);

    // Step 2: Process with autonomous payment
    const paymentResult = await this.orchestrator.processQueryWithAutonomousPayment(
      userMessage,
      userContext,
      freeDataSources
    );

    // Step 3: Generate response with all available data
    const response = await this.generateResponse(
      userMessage,
      freeDataSources,
      paymentResult.purchasedData || paymentResult.sources || [],
      paymentResult
    );

    // Update conversation context
    this.conversationContext.set(userId, context);

    return {
      response: response.text,
      citations: response.citations || [],
      confidence: response.confidence || 0.7,
      paymentInfo: paymentResult.success && paymentResult.amountPaid
        ? {
            amountPaid: paymentResult.amountPaid,
            sources: paymentResult.sources?.map(s => s.name) || [],
            rationale: paymentResult.decision?.rationale || '',
            txHash: paymentResult.paymentProof?.txHash
          }
        : undefined,
      purchasedData: paymentResult.data
    };
  }

  /**
   * Query free data sources (baseline response)
   */
  private async queryFreeSources(query: string): Promise<any[]> {
    // In a real implementation, this would query free APIs, cached data, etc.
    // For now, return empty array (indicating no free data available)
    return [];
  }

  /**
   * Generate response using all available data (free + purchased)
   */
  private async generateResponse(
    query: string,
    freeData: any[],
    purchasedData: any[],
    paymentResult: any
  ): Promise<{ text: string; citations: string[]; confidence: number }> {
    // Simple response generation
    // In a real implementation, this would use an LLM to synthesize the response

    let responseText = '';

    if (purchasedData.length > 0) {
      responseText = `Based on premium data sources (${purchasedData.map(d => d.name || d).join(', ')}), `;
    } else {
      responseText = 'Based on available data, ';
    }

    // Add query-specific response
    if (query.toLowerCase().includes('investment') || query.toLowerCase().includes('stock')) {
      responseText += 'I can provide investment analysis. ';
      if (purchasedData.length > 0) {
        responseText += 'I\'ve accessed real-time market data to enhance this analysis.';
      }
    } else if (query.toLowerCase().includes('industry') || query.toLowerCase().includes('market')) {
      responseText += 'I can provide industry insights. ';
      if (purchasedData.length > 0) {
        responseText += 'I\'ve accessed professional industry reports for comprehensive analysis.';
      }
    } else {
      responseText += 'I can help answer your question.';
    }

    // Add payment context if payment was made
    if (paymentResult.success && paymentResult.amountPaid) {
      responseText += `\n\n[Note: Paid $${paymentResult.amountPaid.toFixed(2)} for premium data to enhance this response]`;
    }

    return {
      text: responseText,
      citations: [],
      confidence: purchasedData.length > 0 ? 0.9 : 0.7
    };
  }

  /**
   * Get budget status
   */
  getBudgetStatus() {
    return this.budgetManager.getBudgetStatus();
  }

  /**
   * Get payment history for a user
   */
  getPaymentHistory(userId: string) {
    return this.orchestrator.getPaymentHistory(userId);
  }
}

/**
 * Create an autonomous chatbot instance with default configuration
 */
export function createAutonomousChatbot(config?: ChatbotPaymentConfig): AutonomousChatbot {
  return new AutonomousChatbot(config || {});
}

