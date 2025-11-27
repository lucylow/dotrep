/**
 * Identity & Trust Tokenomics Agents
 * 
 * Comprehensive AI agent system for identity verification and trust signaling
 * with sophisticated tokenomics for Sybil resistance.
 * 
 * @module agents
 */

export { IdentityVerificationAgent, createIdentityVerificationAgent } from './identity-verification-agent';
export type { VerificationData, VerificationResult, VerificationStep, IdentityVerificationConfig } from './identity-verification-agent';

export { CommunityVettingAgent, createCommunityVettingAgent } from './community-vetting-agent';
export type { Voucher, VettingSession, CommunityVettingConfig } from './community-vetting-agent';

export { EconomicBehaviorAgent, createEconomicBehaviorAgent } from './economic-behavior-agent';
export type { TransactionData, StakingData, EconomicAnalysis, EconomicBehaviorConfig } from './economic-behavior-agent';

export { TokenCuratedRegistryAgent, createTCRAgent } from './tcr-agent';
export type { Registry, RegistryEntry, RegistryConfig, VoteRecord, TCRConfig } from './tcr-agent';

export { IdentityTrustWorkflow, createIdentityTrustWorkflow } from './identity-trust-workflow';
export type { UserData, OnboardingWorkflow, WorkflowConfig } from './identity-trust-workflow';

