/**
 * Economic Decision Scenarios
 * 
 * Concrete examples of trust-based economic decisions for demonstration
 */

import { TrustEconomicDecisionEngine } from './trustEconomicDecisionEngine';
import { TrustEconomicChatbot } from './trustEconomicChatbot';

export interface EconomicScenario {
  userDid: string;
  userQuery: string;
  context?: Record<string, any>;
  expectedBehavior: {
    trustTier: 'PLATINUM' | 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED';
    maxBudget: number;
    dataSources: Array<{
      name: string;
      cost: number;
      value: 'high' | 'medium' | 'low';
    }>;
    decisionRationale: string;
  };
}

export class EconomicScenarios {
  /**
   * High-trust investment scenario
   * PLATINUM user asking for strategic analysis
   */
  static highTrustInvestmentScenario(): EconomicScenario {
    return {
      userDid: 'did:dkg:user:hedge_fund_manager',
      userQuery: 'Analyze TechInnovate acquisition prospects and recommend position sizing',
      context: {
        type: 'strategic_decision',
        urgency: 'high',
        businessContext: 'investment_firm',
      },
      expectedBehavior: {
        trustTier: 'PLATINUM',
        maxBudget: 15.0,
        dataSources: [
          { name: 'M&A Intelligence API', cost: 8.0, value: 'high' },
          { name: 'Institutional Sentiment', cost: 5.0, value: 'medium' },
          { name: 'Regulatory Risk Analysis', cost: 2.0, value: 'low' },
        ],
        decisionRationale: 'High-trust user making strategic investment decision',
      },
    };
  }

  /**
   * Medium-trust operational scenario
   * GOLD user asking for market analysis
   */
  static mediumTrustOperationalScenario(): EconomicScenario {
    return {
      userDid: 'did:dkg:user:small_business_owner',
      userQuery: 'What are the current trends in sustainable packaging?',
      context: {
        type: 'tactical_analysis',
        urgency: 'medium',
        businessContext: 'small_business',
      },
      expectedBehavior: {
        trustTier: 'GOLD',
        maxBudget: 3.0,
        dataSources: [{ name: 'Industry Trends Report', cost: 2.5, value: 'medium' }],
        decisionRationale: 'Medium-trust user seeking operational insights',
      },
    };
  }

  /**
   * Low-trust basic scenario
   * BRONZE user asking general question
   */
  static lowTrustBasicScenario(): EconomicScenario {
    return {
      userDid: 'did:dkg:user:new_user_123',
      userQuery: 'What is AI?',
      context: {
        type: 'informational',
        urgency: 'low',
      },
      expectedBehavior: {
        trustTier: 'BRONZE',
        maxBudget: 0.0,
        dataSources: [],
        decisionRationale: 'Low-trust user with basic informational query',
      },
    };
  }

  /**
   * Strategic decision scenario
   * PLATINUM user making high-value decision
   */
  static strategicDecisionScenario(): EconomicScenario {
    return {
      userDid: 'did:dkg:user:ceo_enterprise',
      userQuery: 'Should we expand into the European market? Analyze market conditions, regulatory requirements, and competitive landscape.',
      context: {
        type: 'strategic_decision',
        urgency: 'high',
        businessContext: 'enterprise',
        value: 'high',
      },
      expectedBehavior: {
        trustTier: 'PLATINUM',
        maxBudget: 25.0,
        dataSources: [
          { name: 'M&A Intelligence API', cost: 8.0, value: 'high' },
          { name: 'Industry Trends Report', cost: 2.5, value: 'medium' },
          { name: 'Regulatory Risk Analysis', cost: 2.0, value: 'low' },
        ],
        decisionRationale: 'High-value strategic decision requiring comprehensive analysis',
      },
    };
  }

  /**
   * Operational efficiency scenario
   * SILVER user optimizing processes
   */
  static operationalEfficiencyScenario(): EconomicScenario {
    return {
      userDid: 'did:dkg:user:operations_manager',
      userQuery: 'How can we optimize our supply chain to reduce costs by 15%?',
      context: {
        type: 'operational_efficiency',
        urgency: 'medium',
        businessContext: 'operations',
      },
      expectedBehavior: {
        trustTier: 'SILVER',
        maxBudget: 5.0,
        dataSources: [{ name: 'Industry Trends Report', cost: 2.5, value: 'medium' }],
        decisionRationale: 'Medium-trust user seeking operational optimization',
      },
    };
  }
}

/**
 * Demo implementation for trust-based economic decisions
 */
export async function demoTrustEconomicDecisions(
  chatbot: TrustEconomicChatbot
): Promise<void> {
  console.log('🎯 DEMO: Trust-Based Economic Decisions');
  console.log('='.repeat(50));

  const scenarios = [
    EconomicScenarios.highTrustInvestmentScenario(),
    EconomicScenarios.mediumTrustOperationalScenario(),
    EconomicScenarios.lowTrustBasicScenario(),
    EconomicScenarios.strategicDecisionScenario(),
    EconomicScenarios.operationalEfficiencyScenario(),
  ];

  for (const scenario of scenarios) {
    console.log(`\n🧩 Scenario: ${scenario.userQuery}`);
    console.log(`   User: ${scenario.userDid}`);

    try {
      // Process query with economic decision making
      const response = await chatbot.processQuery(
        scenario.userDid,
        scenario.userQuery,
        scenario.context
      );

      // Display results
      console.log(`   Trust Tier: ${response.economicDecision.trustTier}`);
      console.log(`   Budget Allocated: $${response.economicDecision.maxBudget.toFixed(2)}`);
      console.log(`   Actual Spend: $${response.totalSpend.toFixed(2)}`);
      console.log(`   Data Sources: ${response.metadata.dataSources.join(', ') || 'None'}`);
      console.log(`   Decision: ${response.economicDecision.decisionRationale}`);
      console.log(`   Response Quality: ${response.qualityTier}`);
    } catch (error) {
      console.error(`   ❌ Error processing scenario:`, error);
    }

    console.log('-'.repeat(50));
  }
}

