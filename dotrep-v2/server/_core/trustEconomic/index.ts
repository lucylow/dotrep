/**
 * Trust-Based Economic Decision System
 * 
 * Complete implementation of trust-based economic decision framework
 * for autonomous AI agents making spending decisions based on user reputation.
 */

export { TrustEconomicDecisionEngine } from '../trustEconomicDecisionEngine';
export type {
  TrustProfile,
  ValueAnalysis,
  PremiumDataSource,
  EconomicDecision,
  EconomicPolicy,
} from '../trustEconomicDecisionEngine';

export { TrustEconomicChatbot } from '../trustEconomicChatbot';
export type { ChatbotResponse, BudgetManager } from '../trustEconomicChatbot';

export { X402EconomicOrchestrator } from '../x402EconomicOrchestrator';
export type { EconomicTransaction } from '../x402EconomicOrchestrator';

export { EconomicScenarios, demoTrustEconomicDecisions } from '../economicScenarios';
export type { EconomicScenario } from '../economicScenarios';

export { createTrustEconomicChatbot, runTrustEconomicDemo, exampleUsage } from '../trustEconomicDemo';

