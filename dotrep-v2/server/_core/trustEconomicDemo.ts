/**
 * Trust-Based Economic Decision Demo
 * 
 * Complete demo implementation showing trust-based economic decisions in action
 */

import { TrustEconomicDecisionEngine } from './trustEconomicDecisionEngine';
import { TrustEconomicChatbot } from './trustEconomicChatbot';
import { X402EconomicOrchestrator } from './x402EconomicOrchestrator';
import { EconomicScenarios, demoTrustEconomicDecisions } from './economicScenarios';
import type { AutonomousAgentConfig } from './m2mCommerce/types';

/**
 * Create and configure trust-based economic chatbot
 */
export function createTrustEconomicChatbot(config?: {
  x402Config?: AutonomousAgentConfig;
  dkgClient?: any;
}): TrustEconomicChatbot {
  // Create decision engine
  const decisionEngine = new TrustEconomicDecisionEngine({
    x402Config: config?.x402Config,
    dkgClient: config?.dkgClient,
    economicPolicy: {
      baseBudgetPerQuery: 1.0,
      trustTierMultipliers: {
        PLATINUM: 3.0,
        GOLD: 2.0,
        SILVER: 1.0,
        BRONZE: 0.5,
        UNVERIFIED: 0.1,
      },
      maxBudgetCap: 50.0,
      minROIThreshold: 0.1,
      enableDiminishingReturns: true,
    },
  });

  // Create chatbot
  const chatbot = new TrustEconomicChatbot({
    decisionEngine,
    x402Config: config?.x402Config,
  });

  return chatbot;
}

/**
 * Run complete demo
 */
export async function runTrustEconomicDemo(): Promise<void> {
  console.log('\n🎯 TRUST-BASED ECONOMIC DECISION DEMO');
  console.log('='.repeat(60));
  console.log('This demo shows how AI agents make economic decisions');
  console.log('based on user trust and query value analysis.\n');

  // Create chatbot (without x402 for demo - would use real config in production)
  const chatbot = createTrustEconomicChatbot({
    // In production, would provide real x402 config:
    // x402Config: {
    //   agentId: 'trust-economic-agent',
    //   payerAddress: '0x...',
    //   maxPaymentAmount: '100.0',
    //   facilitatorUrl: process.env.X402_FACILITATOR_URL,
    // },
  });

  // Run scenarios
  await demoTrustEconomicDecisions(chatbot);

  console.log('\n✅ Demo complete!');
  console.log('\nKey Takeaways:');
  console.log('• Trust tier determines budget allocation');
  console.log('• Query value analysis guides spending decisions');
  console.log('• Premium data sources are selected based on ROI');
  console.log('• All economic activity is recorded to DKG');
  console.log('• Diminishing returns prevent wasteful spending\n');
}

/**
 * Example usage in production
 */
export async function exampleUsage() {
  // Initialize DKG client (if available)
  // const { createDKGClientV8 } = await import('../dkg-integration/dkg-client-v8');
  // const dkgClient = createDKGClientV8({ useMockMode: false });

  // Create chatbot with full configuration
  const chatbot = createTrustEconomicChatbot({
    x402Config: {
      agentId: 'trust-economic-agent-1',
      payerAddress: process.env.AGENT_PAYER_ADDRESS || '',
      maxPaymentAmount: '100.0',
      facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
      minRecipientReputation: 0.7,
      enableNegotiation: true,
    },
    // dkgClient,
  });

  // Process a query
  const response = await chatbot.processQuery(
    'did:dkg:user:hedge_fund_manager',
    'Analyze TechInnovate acquisition prospects',
    {
      type: 'strategic_decision',
      urgency: 'high',
    }
  );

  console.log('Response:', response);
  console.log('Trust Tier:', response.economicDecision.trustTier);
  console.log('Budget Allocated:', response.economicDecision.maxBudget);
  console.log('Actual Spend:', response.totalSpend);
  console.log('Data Sources:', response.metadata.dataSources);
}

// Run demo if executed directly
if (require.main === module) {
  runTrustEconomicDemo().catch(console.error);
}

