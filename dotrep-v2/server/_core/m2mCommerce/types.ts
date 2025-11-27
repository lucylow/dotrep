/**
 * Type definitions for Machine-to-Machine Commerce with x402 Protocol
 */

export interface PaymentInstructions {
  amount: string;
  currency: string;
  recipient: string;
  resource: string;
  expiry: number;
  description?: string;
  challenge?: string;
  payment_methods?: Array<{
    type: string;
    currencies: string[];
    network: string;
  }>;
}

export interface PaymentProof {
  txHash?: string;
  chain?: string;
  amount: string;
  currency: string;
  recipient: string;
  resource: string;
  timestamp: number;
  signature?: string;
  challenge?: string;
  facilitatorProof?: string;
}

export interface PaymentVerificationResult {
  valid: boolean;
  verified: boolean;
  reason?: string;
  txHash?: string;
}

export interface AutonomousAgentConfig {
  agentId: string;
  payerAddress: string;
  maxPaymentAmount?: string;
  minRecipientReputation?: number;
  enableNegotiation?: boolean;
  facilitatorUrl?: string;
  supportedChains?: string[];
  supportedCurrencies?: string[];
}

export interface ResourceRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  maxPrice?: string;
  retryOn402?: boolean;
}

export interface ResourceResponse<T = any> {
  success: boolean;
  data?: T;
  paymentEvidence?: PaymentProof;
  amountPaid?: string;
  error?: string;
  statusCode?: number;
}

export interface EndorsementOpportunity {
  id: string;
  influencerId: string;
  influencerReputation: number;
  campaignId: string;
  cost: string;
  currency: string;
  paymentUrl: string;
  maxBudget?: string;
  expectedROI?: number;
  metadata?: Record<string, any>;
}

export interface CampaignRequirements {
  id: string;
  minInfluencerReputation: number;
  maxBudget: number;
  targetAudience?: string[];
  requiredCapabilities?: string[];
  minROI?: number;
}

export interface DataProduct {
  id: string;
  name: string;
  description: string;
  price: string;
  currency: string;
  dataType: string;
  provider: string;
  providerReputation: number;
  accessUrl: string;
}

export interface TrustBasedPricingConfig {
  basePrice: string;
  buyerReputation: number;
  sellerReputation: number;
  minPriceMultiplier?: number;
  maxPriceMultiplier?: number;
}

export interface CrossChainPaymentRequest {
  fromChain: string;
  toChain: string;
  amount: string;
  currency: string;
  recipient: string;
  payer: string;
}

export interface MicroPaymentEconomics {
  costBasis: number;
  demandElasticity: number;
  competitorPrices: number[];
}

