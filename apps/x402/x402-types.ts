/**
 * TypeScript Type Definitions for x402 Protocol
 * Provides type safety for x402 payment protocol implementation
 */

/**
 * x402 Protocol Version
 */
export type X402Version = '1.0' | '1.1';

/**
 * Supported blockchain networks
 */
export type SupportedChain = 'base' | 'base-sepolia' | 'solana' | 'ethereum' | 'polygon' | 'arbitrum' | 'neuroweb-evm';

/**
 * Supported payment currencies
 */
export type PaymentCurrency = 'USDC' | 'USDT' | 'ETH' | 'SOL' | 'MATIC';

/**
 * Payment challenge/nonce for replay protection
 */
export interface PaymentChallenge {
  challenge: string;
  expires: string; // ISO 8601 timestamp
  nonce: string;
  policy: AccessPolicy;
  createdAt: number; // Unix timestamp
}

/**
 * Access policy for a protected resource
 */
export interface AccessPolicy {
  amount: string; // Amount in currency units (e.g., "2.50")
  currency: PaymentCurrency;
  recipient: string; // Payment recipient address
  chains: SupportedChain[]; // Supported blockchain networks
  resourceUAL: string; // Resource Universal Asset Locator
  description?: string; // Human-readable description
  metadata?: Record<string, unknown>; // Additional policy metadata
}

/**
 * Payment request returned in 402 response
 */
export interface PaymentRequest {
  x402: X402Version;
  amount: string;
  currency: PaymentCurrency;
  recipient: string;
  chains: SupportedChain[];
  facilitator?: string; // Facilitator service URL
  challenge: string;
  expires: string; // ISO 8601 timestamp
  resourceUAL: string;
  description?: string;
}

/**
 * Payment proof provided in X-PAYMENT header
 */
export interface PaymentProof {
  txHash: string; // Transaction hash on blockchain
  chain: SupportedChain;
  payer: string; // Payer address/DID
  amount: string; // Must match policy amount
  currency: PaymentCurrency; // Must match policy currency
  recipient?: string; // Optional, validated against policy
  challenge: string; // Must match challenge from payment request
  signature?: string; // Payer signature (hex format)
  facilitatorSig?: string; // Facilitator signature (if used)
  metadata?: Record<string, unknown>; // Additional proof metadata
}

/**
 * Payment proof validation result
 */
export interface PaymentProofValidation {
  valid: boolean;
  error?: string;
  challengeData?: PaymentChallenge;
  details?: {
    missingFields?: string[];
    expired?: boolean;
    amountMismatch?: boolean;
    currencyMismatch?: boolean;
    recipientMismatch?: boolean;
    chainUnsupported?: boolean;
    replayDetected?: boolean;
  };
}

/**
 * Settlement verification result
 */
export interface SettlementVerification {
  verified: boolean;
  method: 'facilitator' | 'on-chain' | 'pending';
  blockNumber?: string | number;
  error?: string;
  facilitatorData?: Record<string, unknown>;
}

/**
 * Payment evidence published to DKG
 */
export interface PaymentEvidence {
  ual: string; // Universal Asset Locator for the payment evidence
  txHash: string;
  chain: SupportedChain;
  verified: boolean;
  dkgTransactionHash?: string;
  published: boolean;
  error?: string;
  timestamp?: number;
}

/**
 * Reputation requirements for transaction validation
 */
export interface ReputationRequirements {
  minReputationScore?: number; // Minimum reputation score (0-1)
  minPaymentCount?: number; // Minimum number of previous payments
  minTotalPaymentValue?: number; // Minimum total value of previous payments
  requireVerifiedIdentity?: boolean; // Require verified identity/KYC
  blockSybilAccounts?: boolean; // Enable sybil detection
  minRecipientTrustLevel?: 'low' | 'medium' | 'high'; // Minimum recipient trust level
  allowHighSybilRisk?: boolean; // Allow transactions with high sybil risk (for testing)
}

/**
 * Reputation check result
 */
export interface ReputationCheck {
  allowed: boolean;
  reason: string;
  reputationScore?: number;
  totalPayments?: number;
  totalValue?: number;
  verified?: boolean;
  checks?: {
    reputationScore: boolean;
    paymentCount: boolean;
    paymentValue: boolean;
    verifiedIdentity: boolean;
  };
  error?: string;
}

/**
 * Sybil analysis result
 */
export interface SybilAnalysis {
  sybilRisk: 'low' | 'medium' | 'high' | 'unknown';
  riskScore: number; // 0-100
  reason: string;
  stats?: {
    totalPayments: number;
    uniqueRecipients: number;
    avgAmount: number;
    recentPayments: number; // Payments in last hour
  };
  error?: string;
}

/**
 * Payment-weighted reputation (TraceRank-style)
 */
export interface PaymentWeightedReputation {
  weightedScore: number; // Weighted reputation score
  totalPayments: number;
  totalValue: number;
  avgPayerReputation: number;
  trustLevel: 'low' | 'medium' | 'high' | 'unknown';
  error?: string;
}

/**
 * Transaction reputation validation result
 */
export interface TransactionReputationValidation {
  allowed: boolean;
  reason: string;
  payer: {
    reputation: ReputationCheck;
    sybilAnalysis: SybilAnalysis;
  };
  recipient: {
    paymentWeightedReputation: PaymentWeightedReputation;
  };
  timestamp: number;
  error?: string;
}

/**
 * x402 Error response
 */
export interface X402ErrorResponse {
  error: string;
  code?: string; // Error code (e.g., 'PAYMENT_REQUIRED', 'VALIDATION_FAILED')
  message?: string; // Human-readable message
  paymentRequest?: PaymentRequest; // New payment request for retry
  details?: Record<string, unknown>; // Additional error details
  retryable?: boolean; // Whether the request can be retried
  documentation?: string; // Link to documentation
}

/**
 * x402 Success response (with resource)
 */
export interface X402SuccessResponse<T = unknown> {
  resource: string;
  data?: T;
  paymentEvidence?: PaymentEvidence;
  reputationCheck?: TransactionReputationValidation;
  timestamp: string; // ISO 8601 timestamp
}

/**
 * Payment Evidence Knowledge Asset (JSON-LD structure)
 */
export interface PaymentEvidenceKA {
  '@context': string[];
  '@type': 'PaymentEvidence';
  '@id': string;
  'schema:identifier': string;
  'schema:dateCreated': string;
  'schema:dateModified': string;
  'schema:paymentMethod': {
    '@type': 'PaymentMethod';
    name: string;
    protocol: string;
    version: string;
  };
  payer: {
    '@type': 'Person';
    '@id': string;
    identifier: string;
    'dotrep:paymentAddress': string;
  };
  recipient: {
    '@type': 'Organization';
    '@id': string;
    identifier: string;
    'dotrep:paymentAddress': string;
  };
  amount: {
    '@type': 'MonetaryAmount';
    value: string;
    currency: string;
    'dotrep:amountInSmallestUnit': string;
  };
  blockchain: {
    '@type': 'Blockchain';
    name: string;
    transactionHash: string;
    blockNumber: string;
    'dotrep:chainId': string;
  };
  resourceUAL: string;
  'dotrep:resourceType': string;
  settlement: {
    verified: boolean;
    method: string;
    timestamp: string;
    facilitatorSignature?: string | null;
  };
  challenge: string;
  'prov:wasDerivedFrom': string;
  'prov:wasGeneratedBy': {
    '@type': 'Activity';
    name: string;
    startedAtTime: string;
    endedAtTime: string;
  };
  contentHash: string;
  signature?: string | null;
  facilitatorSignature?: string | null;
  'dotrep:reputationSignal': {
    '@type': 'ReputationSignal';
    signalType: string;
    value: number;
    weight: number;
    timestamp: string;
  };
}

/**
 * x402 Middleware options
 */
export interface X402MiddlewareOptions {
  reputationRequirements?: ReputationRequirements;
  requirePaymentEvidence?: boolean; // Whether to publish payment evidence (default: true)
  challengeExpiryMinutes?: number; // Challenge expiry in minutes (default: 15)
}

/**
 * Express request with x402 payment information
 */
export interface X402Request extends Express.Request {
  paymentEvidence?: PaymentEvidence;
  paymentProof?: PaymentProof;
  paymentPolicy?: AccessPolicy;
}

/**
 * Payment query parameters for DKG queries
 */
export interface PaymentQuery {
  payer?: string;
  recipient?: string;
  resourceUAL?: string;
  minAmount?: number;
  limit?: number;
}

/**
 * Payment query result
 */
export interface PaymentQueryResult {
  success: boolean;
  results: Array<{
    payment?: string;
    payer?: string;
    recipient?: string;
    amount?: string;
    currency?: string;
    txHash?: string;
    timestamp?: string;
    resourceUAL?: string;
  }>;
  count?: number;
  error?: string;
  errorCode?: string;
  httpStatus?: number;
}

/**
 * Publishing options for payment evidence
 */
export interface PublishOptions {
  maxRetries?: number; // Maximum retry attempts (default: 3)
  retryDelay?: number; // Delay between retries in ms (default: 1000)
}

/**
 * Publishing result
 */
export interface PublishResult {
  success: boolean;
  ual: string;
  transactionHash?: string;
  blockNumber?: string | number;
  simulated?: boolean; // True if using simulated UAL (publishing failed)
  error?: string;
  errorCode?: string;
  httpStatus?: number;
  attempt?: number;
  attempts?: number;
  data?: Record<string, unknown>;
}

