/**
 * Machine-to-Machine Commerce with x402 Protocol
 * 
 * Complete implementation for autonomous agent commerce, including:
 * - x402 payment middleware
 * - Autonomous payment agents
 * - Trust-based dynamic pricing
 * - M2M marketplace services
 * - Cross-chain payment processing
 */

export { x402PaymentMiddleware, type X402MiddlewareOptions } from './x402PaymentMiddleware';
export { AutonomousPaymentAgent, type AutonomousAgentConfig } from './autonomousPaymentAgent';
export { TrustBasedPricingEngine } from './trustBasedPricing';
export {
  AIEndorsementMarketplace,
  ReputationDataMarketplace,
  AutomatedCampaignManager
} from './marketplaceServices';
export {
  CrossChainPaymentProcessor,
  MultiChainPaymentRouter,
  type BridgeConfig,
  type CrossChainPaymentResult
} from './crossChainPayments';
export {
  M2MCommerceReputationCalculator,
  createM2MCommerceReputationCalculator,
  type M2MCommerceReputationOptions
} from './reputationIntegration';

export type {
  PaymentInstructions,
  PaymentProof,
  PaymentVerificationResult,
  ResourceRequest,
  ResourceResponse,
  EndorsementOpportunity,
  CampaignRequirements,
  DataProduct,
  TrustBasedPricingConfig,
  CrossChainPaymentRequest,
  MicroPaymentEconomics
} from './types';

