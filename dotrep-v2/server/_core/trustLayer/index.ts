/**
 * Trust Layer Module
 * Centralized exports for trust layer components
 */

export * from './stakingSystem';
export * from './x402PaymentHandler';
export * from './trustEscrow';
export * from './trustOrchestrator';
export * from './trustAnalytics';
export * from './agentIntegration';
export * from './utils';

// Re-export singleton getters for convenience
export { getStakingSystem } from './stakingSystem';
export { getX402PaymentHandler } from './x402PaymentHandler';
export { getTrustEscrow } from './trustEscrow';
export { getTrustOrchestrator } from './trustOrchestrator';
export { getTrustAnalytics } from './trustAnalytics';
export { getTrustLayerAgentIntegration } from './agentIntegration';

