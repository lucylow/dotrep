/**
 * Serverless Reputation Calculation Service
 * Cloud-optimized reputation scoring algorithm with x402 protocol integration
 * 
 * Implements comprehensive "highly trusted user" determination based on:
 * - On-chain identity verification (NFT/SBT identity)
 * - Reputation registry (transaction-verified feedback)
 * - Validation mechanisms (cryptographic proofs)
 * - Transaction-verified payments (x402 protocol)
 * - Transparent and accessible data (public goods)
 * - Continuous update and dynamic scoring
 * - PageRank-based node identification for key influencers
 * - Bot cluster detection and reputation adjustment
 * 
 * x402 Protocol Integration:
 * - Tracks payments made via x402 HTTP 402 Payment Required flow
 * - Payments are verified on-chain and represent autonomous agent commerce
 * - x402 payments provide stronger trust signals than traditional payments
 * - Payment evidence is stored and can be queried via DKG
 * 
 * Architecture Alignment:
 * - HTTP Layer: x402 payments are HTTP-native (no special blockchain RPC required)
 * - Stateless: Each payment verification is independent (no session required)
 * - Web Standard: Uses standard HTTP status codes and headers
 */

import { BotDetectionResults } from './botClusterDetector';

export interface Contribution {
  id: string;
  type: string;
  weight: number;
  timestamp: number;
  age: number; // in days
  verified?: boolean; // Whether this contribution is verified on-chain
  verifierCount?: number; // Number of verifiers
}

export interface OnChainIdentity {
  nftIdentity?: {
    tokenId: string;
    contractAddress: string;
    chain: string;
    mintTimestamp: number;
    verified: boolean;
  };
  sbtCredential?: {
    tokenId: string;
    issuer: string;
    credentialType: string;
    verified: boolean;
  };
  walletAddress?: string;
  verifiedChains?: string[]; // Cross-chain verification
}

/**
 * Verified Payment (Enhanced for x402 Whitepaper compliance)
 * 
 * Tracks x402 protocol payments with full whitepaper Section 9.2 fields
 * for better reputation signal extraction.
 */
export interface VerifiedPayment {
  // Transaction settlement fields
  txHash: string;
  chain: string;
  amount: number;
  currency: string;
  timestamp: number;
  recipient?: string; // Payment recipient (for reputation signals)
  payerReputation?: number; // Reputation of payer (for weighted scoring)
  verified: boolean; // Verified on-chain or via facilitator
  
  // x402 Whitepaper Section 9.2 fields (for enhanced tracking)
  maxAmountRequired?: string; // Maximum amount from payment request
  assetType?: string; // Token type (e.g., "ERC20")
  assetAddress?: string; // Smart contract address
  paymentAddress?: string; // Recipient wallet
  network?: string; // Blockchain network
  payer?: string; // Payer wallet address
  paymentId?: string; // Payment request identifier
  nonce?: string; // Replay protection nonce
  signature?: string; // EIP-712 signature
  isX402Payment?: boolean; // Flag indicating x402 protocol payment
}

export interface ReputationRegistry {
  ratings: Array<{
    fromUser: string;
    rating: number; // 0-1
    timestamp: number;
    verified: boolean; // Whether rating is from verified transaction
    transactionHash?: string; // Link to verified transaction
  }>;
  feedback: Array<{
    fromUser: string;
    feedback: string;
    timestamp: number;
    verified: boolean;
  }>;
  validations: Array<{
    validator: string;
    validationType: 'cryptographic' | 'third-party' | 'community';
    proof?: string; // zk proof, TEE attestation, etc.
    timestamp: number;
    verified: boolean;
  }>;
}

export interface ReputationCalculationRequest {
  contributions: Contribution[];
  algorithmWeights: Record<string, number>;
  timeDecayFactor: number;
  userId: string;
  includeSafetyScore?: boolean; // Include Guardian safety score (Umanitek Guardian dataset)
  onChainIdentity?: OnChainIdentity; // On-chain identity verification
  verifiedPayments?: VerifiedPayment[]; // x402 and other verified payments
  reputationRegistry?: ReputationRegistry; // Transaction-verified feedback
  includeHighlyTrustedDetermination?: boolean; // Calculate highly trusted status
  botDetectionResults?: BotDetectionResults; // Bot cluster detection results for reputation adjustment
  publishToDKG?: boolean; // Auto-publish to OriginTrail DKG as Knowledge Asset
  dkgClient?: any; // DKG client instance for publishing (optional)
}

export interface HighlyTrustedUserStatus {
  isHighlyTrusted: boolean;
  confidence: number; // 0-1 confidence in highly trusted status
  requirements: {
    onChainIdentityVerified: boolean;
    minReputationScore: boolean;
    minVerifiedPayments: boolean;
    minVerifiedRatings: boolean;
    positiveRecentActivity: boolean;
    sybilResistant: boolean;
  };
  trustFactors: {
    identityVerificationScore: number; // 0-1
    paymentHistoryScore: number; // 0-1
    reputationRegistryScore: number; // 0-1
    validationScore: number; // 0-1
    temporalConsistencyScore: number; // 0-1
  };
  trustLevel: 'highly_trusted' | 'trusted' | 'moderate' | 'caution' | 'untrusted';
  explanation: string[];
}

export interface ReputationScore {
  overall: number;
  breakdown: Record<string, number>;
  percentile: number;
  rank: number;
  lastUpdated: number;
  safetyScore?: number; // Guardian safety score (0-1)
  combinedScore?: number; // Reputation * safety score
  highlyTrustedStatus?: HighlyTrustedUserStatus; // x402 protocol highly trusted user determination
  botDetectionPenalty?: number; // Penalty applied from bot cluster detection (0-1)
  sybilRisk?: number; // Sybil risk score from bot detection (0-1)
}

export class ReputationCalculator {
  // Thresholds for highly trusted user determination (x402 protocol standards)
  private readonly HIGHLY_TRUSTED_THRESHOLDS = {
    minReputationScore: 800, // Minimum overall reputation score (out of 1000)
    minVerifiedPayments: 10, // Minimum number of verified transactions
    minPaymentValue: 100.0, // Minimum total payment value (e.g., in USD)
    minVerifiedRatings: 5, // Minimum verified ratings from other users
    minRatingAverage: 0.8, // Minimum average rating (0-1)
    minIdentityVerificationScore: 0.85, // Minimum identity verification confidence
    minTemporalConsistency: 0.7, // Minimum temporal consistency score
    minRecentActivityDays: 30, // Recent activity within last N days
  };

  /**
   * Calculate reputation score with time decay and x402 protocol integration
   * 
   * Enhanced for OriginTrail hackathon with:
   * - Automatic DKG publishing as Knowledge Assets
   * - Guardian dataset integration for Sybil resistance
   * - Three-layer architecture support (Agent-Knowledge-Trust)
   * 
   * @throws {Error} If input validation fails or calculation encounters critical errors
   */
  async calculateReputation(request: ReputationCalculationRequest): Promise<ReputationScore> {
    try {
      // Input validation
      this.validateRequest(request);

      const { 
        contributions, 
        algorithmWeights, 
        timeDecayFactor, 
        userId, 
        includeSafetyScore = false,
        onChainIdentity,
        verifiedPayments = [],
        reputationRegistry,
        includeHighlyTrustedDetermination = false,
        publishToDKG = false, // New option to auto-publish to DKG
        dkgClient // Optional DKG client for publishing
      } = request;

      const now = Date.now();

      // Calculate base reputation from contributions
      let breakdown: Record<string, number>;
      let baseOverall: number;
      try {
        const result = this.calculateContributionScores(
          contributions,
          algorithmWeights,
          timeDecayFactor,
          now
        );
        breakdown = result.breakdown;
        baseOverall = result.overall;
      } catch (error) {
        throw new Error(`Failed to calculate contribution scores for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Apply boosts and penalties
      let overall = baseOverall;
      try {
        overall = this.applyPaymentBoost(overall, verifiedPayments);
        overall = this.applyRegistryBoost(overall, reputationRegistry);
      } catch (error) {
        console.warn(`Failed to apply boosts for user ${userId}, using base score:`, error);
        // Continue with base score if boost calculation fails
      }

      // Apply bot detection penalty if provided
      let botDetectionPenalty = 0;
      let sybilRisk = 0;
      if (request.botDetectionResults) {
        try {
          const result = this.calculateBotDetectionPenalty(userId, request.botDetectionResults);
          botDetectionPenalty = result.penalty;
          sybilRisk = result.sybilRisk;
        } catch (error) {
          console.warn(`Failed to calculate bot detection penalty for user ${userId}:`, error);
          // Continue without penalty if calculation fails
        }
      }

      if (botDetectionPenalty > 0) {
        overall = overall * (1 - botDetectionPenalty);
      }

      // Calculate percentile and rank in parallel with error handling
      let percentile = 0;
      let rank = 0;
      try {
        [percentile, rank] = await Promise.all([
          this.calculatePercentile(userId, overall).catch(err => {
            console.warn(`Failed to calculate percentile for user ${userId}:`, err);
            return Math.min(100, Math.max(0, (overall / 1000) * 100)); // Fallback calculation
          }),
          this.calculateRank(userId).catch(err => {
            console.warn(`Failed to calculate rank for user ${userId}:`, err);
            return 0; // Fallback rank
          }),
        ]);
      } catch (error) {
        console.warn(`Failed to calculate percentile/rank for user ${userId}:`, error);
        // Use fallback values
        percentile = Math.min(100, Math.max(0, (overall / 1000) * 100));
        rank = 0;
      }

      // Get Guardian safety score if requested (Umanitek Guardian dataset integration)
      let safetyScore: number | undefined;
      let combinedScore: number | undefined;
      if (includeSafetyScore) {
        try {
          const result = await this.calculateSafetyScore(userId, overall);
          safetyScore = result.safetyScore;
          combinedScore = result.combinedScore;
        } catch (error) {
          console.warn(`Failed to calculate safety score for user ${userId}:`, error);
          // Continue without safety score if calculation fails
        }
      }

      // Determine highly trusted user status (x402 protocol)
      let highlyTrustedStatus: HighlyTrustedUserStatus | undefined;
      if (includeHighlyTrustedDetermination) {
        try {
          highlyTrustedStatus = await this.determineHighlyTrustedUser({
            userId,
            overall,
            onChainIdentity,
            verifiedPayments,
            reputationRegistry,
            contributions,
          });
        } catch (error) {
          console.warn(`Failed to determine highly trusted status for user ${userId}:`, error);
          // Continue without highly trusted status if calculation fails
        }
      }

      const reputationScore: ReputationScore = {
        overall: Math.round(Math.max(0, overall)), // Ensure non-negative
        breakdown: this.normalizeBreakdown(breakdown),
        percentile: Math.max(0, Math.min(100, percentile)), // Clamp to 0-100
        rank: Math.max(0, rank), // Ensure non-negative
        lastUpdated: now,
        safetyScore,
        combinedScore: combinedScore ? Math.round(Math.max(0, combinedScore)) : undefined,
        highlyTrustedStatus,
        botDetectionPenalty: botDetectionPenalty > 0 ? botDetectionPenalty : undefined,
        sybilRisk: sybilRisk > 0 ? sybilRisk : undefined,
      };

      // Auto-publish to DKG as Knowledge Asset (Knowledge Layer integration)
      if (publishToDKG && dkgClient) {
        try {
          await this.publishReputationToDKG(
            dkgClient,
            userId,
            reputationScore,
            contributions,
            {
              safetyScore,
              sybilRisk,
              botDetectionPenalty,
              highlyTrusted: highlyTrustedStatus?.isHighlyTrusted,
              verifiedPayments: verifiedPayments.length,
              onChainIdentity: onChainIdentity ? true : false
            }
          );
        } catch (error) {
          console.warn(`Failed to publish reputation to DKG for ${userId}:`, error);
          // Don't fail the calculation if DKG publish fails
        }
      }

      return reputationScore;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to calculate')) {
        throw error; // Re-throw validation and calculation errors
      }
      throw new Error(`Reputation calculation failed for user ${request.userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate reputation calculation request
   */
  private validateRequest(request: ReputationCalculationRequest): void {
    if (!request.userId || typeof request.userId !== 'string') {
      throw new Error('Invalid userId: must be a non-empty string');
    }

    if (!Array.isArray(request.contributions)) {
      throw new Error('Invalid contributions: must be an array');
    }

    if (typeof request.timeDecayFactor !== 'number' || request.timeDecayFactor < 0) {
      throw new Error('Invalid timeDecayFactor: must be a non-negative number');
    }

    if (!request.algorithmWeights || typeof request.algorithmWeights !== 'object') {
      throw new Error('Invalid algorithmWeights: must be an object');
    }

    // Validate contributions
    request.contributions.forEach((contribution, index) => {
      if (typeof contribution.weight !== 'number' || contribution.weight < 0) {
        throw new Error(`Invalid contribution[${index}].weight: must be a non-negative number`);
      }
      if (typeof contribution.timestamp !== 'number' || contribution.timestamp < 0) {
        throw new Error(`Invalid contribution[${index}].timestamp: must be a valid timestamp`);
      }
    });
  }

  /**
   * Calculate contribution scores with time decay and verification boosts
   * 
   * @throws {Error} If invalid input data is provided
   */
  private calculateContributionScores(
    contributions: Contribution[],
    algorithmWeights: Record<string, number>,
    timeDecayFactor: number,
    now: number
  ): { breakdown: Record<string, number>; overall: number } {
    try {
      if (!Array.isArray(contributions)) {
        throw new Error('Contributions must be an array');
      }
      if (typeof now !== 'number' || now <= 0) {
        throw new Error('Invalid timestamp: now must be a positive number');
      }
      if (typeof timeDecayFactor !== 'number' || timeDecayFactor < 0) {
        throw new Error('Invalid timeDecayFactor: must be a non-negative number');
      }

      const msPerDay = this.TIME_CONSTANTS.msPerDay;
      if (msPerDay <= 0) {
        throw new Error('Invalid TIME_CONSTANTS.msPerDay: must be positive');
      }

      const breakdown: Record<string, number> = {};

      contributions.forEach((contribution, index) => {
        try {
          if (!contribution || typeof contribution !== 'object') {
            throw new Error(`Invalid contribution at index ${index}: must be an object`);
          }
          if (typeof contribution.weight !== 'number' || contribution.weight < 0) {
            throw new Error(`Invalid contribution[${index}].weight: must be a non-negative number`);
          }
          if (typeof contribution.timestamp !== 'number' || contribution.timestamp < 0) {
            throw new Error(`Invalid contribution[${index}].timestamp: must be a valid timestamp`);
          }

          const ageInDays = (now - contribution.timestamp) / msPerDay;
          if (!isFinite(ageInDays) || ageInDays < 0) {
            console.warn(`Invalid age calculation for contribution ${index}, using 0:`, ageInDays);
            // Skip this contribution if age calculation fails
            return;
          }

          const decayFactor = Math.exp(-timeDecayFactor * ageInDays);
          if (!isFinite(decayFactor) || decayFactor < 0) {
            console.warn(`Invalid decay factor for contribution ${index}, using 0:`, decayFactor);
            return;
          }

          const weight = algorithmWeights[contribution.type] || 1;
          if (typeof weight !== 'number' || weight < 0) {
            console.warn(`Invalid weight for contribution type ${contribution.type}, using 1`);
            // Use default weight
          }
          
          // Boost verified contributions (x402 protocol: transaction-verified signals)
          const verificationBoost = contribution.verified 
            ? this.SCORING_WEIGHTS.verificationBoost 
            : 1.0;
          
          // Verifier boost (up to 25% for 5+ verifiers)
          const verifierCount = contribution.verifierCount || 0;
          const verifierBoost = verifierCount > 0
            ? 1 + (Math.min(verifierCount, this.SCORING_WEIGHTS.maxVerifiers) * 
                   this.SCORING_WEIGHTS.verifierBoostPerVerifier)
            : 1.0;
          
          const score = contribution.weight * weight * decayFactor * verificationBoost * verifierBoost;
          if (!isFinite(score) || score < 0) {
            console.warn(`Invalid score calculation for contribution ${index}, skipping:`, score);
            return;
          }

          breakdown[contribution.type] = (breakdown[contribution.type] || 0) + score;
        } catch (error) {
          console.warn(`Error processing contribution at index ${index}:`, error);
          // Continue processing other contributions
        }
      });

      const overall = Object.values(breakdown).reduce((sum, score) => {
        if (!isFinite(score)) {
          console.warn(`Invalid score in breakdown, skipping:`, score);
          return sum;
        }
        return sum + score;
      }, 0);

      if (!isFinite(overall)) {
        throw new Error('Calculated overall score is not finite');
      }

      return { breakdown, overall };
    } catch (error) {
      throw new Error(`Failed to calculate contribution scores: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Apply payment-weighted reputation boost
   * 
   * @throws {Error} If invalid input data is provided
   */
  private applyPaymentBoost(overall: number, verifiedPayments: VerifiedPayment[]): number {
    try {
      if (typeof overall !== 'number' || !isFinite(overall) || overall < 0) {
        throw new Error('Invalid overall score: must be a finite non-negative number');
      }
      if (!Array.isArray(verifiedPayments)) {
        throw new Error('VerifiedPayments must be an array');
      }

      if (verifiedPayments.length === 0) return overall;
      
      const paymentBoost = this.calculatePaymentWeightedBoost(verifiedPayments);
      if (!isFinite(paymentBoost) || paymentBoost < 0) {
        console.warn('Invalid payment boost calculated, using 0:', paymentBoost);
        return overall;
      }

      const boosted = overall * (1 + paymentBoost);
      if (!isFinite(boosted) || boosted < 0) {
        console.warn('Invalid boosted score calculated, returning original:', boosted);
        return overall;
      }

      return boosted;
    } catch (error) {
      console.warn(`Failed to apply payment boost:`, error);
      return overall; // Return original score on error
    }
  }

  /**
   * Apply reputation registry boost
   * 
   * @throws {Error} If invalid input data is provided
   */
  private applyRegistryBoost(overall: number, reputationRegistry?: ReputationRegistry): number {
    try {
      if (typeof overall !== 'number' || !isFinite(overall) || overall < 0) {
        throw new Error('Invalid overall score: must be a finite non-negative number');
      }

      if (!reputationRegistry || !reputationRegistry.ratings || reputationRegistry.ratings.length === 0) {
        return overall;
      }
      
      const registryBoost = this.calculateRegistryBoost(reputationRegistry);
      if (!isFinite(registryBoost) || registryBoost < 0) {
        console.warn('Invalid registry boost calculated, using 0:', registryBoost);
        return overall;
      }

      const boosted = overall * (1 + registryBoost);
      if (!isFinite(boosted) || boosted < 0) {
        console.warn('Invalid boosted score calculated, returning original:', boosted);
        return overall;
      }

      return boosted;
    } catch (error) {
      console.warn(`Failed to apply registry boost:`, error);
      return overall; // Return original score on error
    }
  }

  /**
   * Calculate safety score and combined score
   */
  private async calculateSafetyScore(
    userId: string,
    overall: number
  ): Promise<{ safetyScore?: number; combinedScore?: number }> {
    try {
      const { getGuardianVerificationService } = await import('../../dkg-integration/guardian-verification');
      const guardianService = getGuardianVerificationService();
      const safetyData = await guardianService.calculateCreatorSafetyScore(userId);
      const safetyScore = Math.max(0, Math.min(1, safetyData.safetyScore)); // Clamp to 0-1
      
      // Combined score: reputation weighted by safety
      // Formula: overall * (baseWeight + safetyWeight * safetyScore)
      const combinedScore = overall * (
        this.SCORING_WEIGHTS.baseReputationWeight + 
        this.SCORING_WEIGHTS.safetyScoreWeight * safetyScore
      );
      
      return { safetyScore, combinedScore };
    } catch (error) {
      console.warn(`Failed to get safety score for ${userId}:`, error);
      return { safetyScore: undefined, combinedScore: undefined };
    }
  }

  /**
   * Normalize breakdown scores to ensure they're non-negative
   */
  private normalizeBreakdown(breakdown: Record<string, number>): Record<string, number> {
    const normalized: Record<string, number> = {};
    for (const [key, value] of Object.entries(breakdown)) {
      normalized[key] = Math.max(0, value);
    }
    return normalized;
  }

  /**
   * Calculate bot detection penalty for a specific user
   * 
   * @throws {Error} If invalid input data is provided
   */
  private calculateBotDetectionPenalty(
    userId: string,
    botDetectionResults: BotDetectionResults
  ): { penalty: number; sybilRisk: number } {
    try {
      if (typeof userId !== 'string' || userId.length === 0) {
        throw new Error('Invalid userId: must be a non-empty string');
      }
      if (!botDetectionResults || typeof botDetectionResults !== 'object') {
        throw new Error('BotDetectionResults must be a valid object');
      }

      // Check if user is in a confirmed bot cluster
      if (Array.isArray(botDetectionResults.confirmedBotClusters)) {
        const confirmedCluster = botDetectionResults.confirmedBotClusters.find(cluster => {
          try {
            return cluster && Array.isArray(cluster.nodes) && cluster.nodes.includes(userId);
          } catch (error) {
            console.warn('Error checking confirmed bot cluster:', error);
            return false;
          }
        });

        if (confirmedCluster) {
          try {
            const suspicionScore = typeof confirmedCluster.suspicionScore === 'number' && 
                                 isFinite(confirmedCluster.suspicionScore) &&
                                 confirmedCluster.suspicionScore >= 0 &&
                                 confirmedCluster.suspicionScore <= 1
              ? confirmedCluster.suspicionScore
              : 0.5; // Default if invalid

            // Significant penalty for confirmed bots (70% penalty)
            const penalty = Math.min(0.7, suspicionScore * 0.7);
            return {
              penalty: isFinite(penalty) ? Math.max(0, penalty) : 0,
              sybilRisk: Math.max(0, Math.min(1, isFinite(suspicionScore) ? suspicionScore : 0)),
            };
          } catch (error) {
            console.warn('Error processing confirmed bot cluster penalty:', error);
          }
        }
      }

      // Check if user is in a suspicious cluster
      if (Array.isArray(botDetectionResults.suspiciousClusters)) {
        const suspiciousCluster = botDetectionResults.suspiciousClusters.find(cluster => {
          try {
            return cluster && Array.isArray(cluster.nodes) && cluster.nodes.includes(userId);
          } catch (error) {
            console.warn('Error checking suspicious cluster:', error);
            return false;
          }
        });

        if (suspiciousCluster) {
          try {
            const suspicionScore = typeof suspiciousCluster.suspicionScore === 'number' && 
                                 isFinite(suspiciousCluster.suspicionScore) &&
                                 suspiciousCluster.suspicionScore >= 0 &&
                                 suspiciousCluster.suspicionScore <= 1
              ? suspiciousCluster.suspicionScore
              : 0.3; // Default if invalid

            // Smaller penalty for suspicious clusters (30% penalty)
            const penalty = Math.min(0.3, suspicionScore * 0.3);
            return {
              penalty: isFinite(penalty) ? Math.max(0, penalty) : 0,
              sybilRisk: Math.max(0, Math.min(1, isFinite(suspicionScore) ? suspicionScore : 0)),
            };
          } catch (error) {
            console.warn('Error processing suspicious cluster penalty:', error);
          }
        }
      }

      // Check if user is an individual bot
      if (Array.isArray(botDetectionResults.individualBots)) {
        const individualBot = botDetectionResults.individualBots.find(bot => {
          try {
            return bot && bot.node === userId;
          } catch (error) {
            console.warn('Error checking individual bot:', error);
            return false;
          }
        });

        if (individualBot) {
          try {
            const sybilRisk = typeof individualBot.sybilRisk === 'number' && 
                            isFinite(individualBot.sybilRisk) &&
                            individualBot.sybilRisk >= 0 &&
                            individualBot.sybilRisk <= 1
              ? individualBot.sybilRisk
              : 0.3; // Default if invalid

            // Penalty based on sybil risk
            const penalty = Math.min(0.5, sybilRisk * 0.5);
            return {
              penalty: isFinite(penalty) ? Math.max(0, penalty) : 0,
              sybilRisk: Math.max(0, Math.min(1, isFinite(sybilRisk) ? sybilRisk : 0)),
            };
          } catch (error) {
            console.warn('Error processing individual bot penalty:', error);
          }
        }
      }

      // No penalty
      return { penalty: 0, sybilRisk: 0 };
    } catch (error) {
      console.warn(`Failed to calculate bot detection penalty for user ${userId}:`, error);
      return { penalty: 0, sybilRisk: 0 }; // Return no penalty on error (conservative approach)
    }
  }

  /**
   * Calculate payment-weighted reputation boost (TraceRank-style)
   * Higher-value payments from high-reputation payers = stronger signal
   * Enhanced with x402 protocol integration for autonomous agent payments
   * 
   * x402 Protocol Benefits:
   * - HTTP-native payments (no special blockchain RPC for initial handshake)
   * - Stateless verification (each payment is independently verifiable)
   * - Cryptographically secured (on-chain verification via facilitator)
   * - Autonomous agent commerce (represents AI-to-AI economic interactions)
   * 
   * These characteristics make x402 payments stronger trust signals than
   * traditional payment methods, as they demonstrate:
   * 1. Technical sophistication (ability to handle HTTP 402 flow)
   * 2. Cryptographic security (on-chain verification)
   * 3. Agent autonomy (no human intervention required)
   * 
   * @throws {Error} If invalid payment data is provided
   */
  private calculatePaymentWeightedBoost(payments: VerifiedPayment[]): number {
    try {
      if (!Array.isArray(payments)) {
        throw new Error('Payments must be an array');
      }

      if (payments.length === 0) return 0;

      const verifiedPayments = payments.filter(p => p && p.verified === true);
      if (verifiedPayments.length === 0) return 0;

      let weightedSum = 0;
      let totalValue = 0;
      let x402PaymentCount = 0; // Track x402 protocol payments for additional boost
      let x402PaymentValue = 0; // Track total value of x402 payments

      verifiedPayments.forEach((payment, index) => {
        try {
          if (!payment || typeof payment !== 'object') {
            console.warn(`Invalid payment at index ${index}, skipping`);
            return;
          }

          const value = typeof payment.amount === 'number' && isFinite(payment.amount) && payment.amount >= 0
            ? payment.amount
            : 0;
          
          if (value <= 0) {
            console.warn(`Invalid payment amount at index ${index}, skipping:`, payment.amount);
            return;
          }

          const payerRep = typeof payment.payerReputation === 'number' && 
                          isFinite(payment.payerReputation) && 
                          payment.payerReputation >= 0 && 
                          payment.payerReputation <= 1
            ? payment.payerReputation
            : 0.5; // Default 0.5 if unknown
          
          totalValue += value;
          // Weight = amount * payer_reputation (TraceRank principle)
          const weighted = value * payerRep;
          if (isFinite(weighted)) {
            weightedSum += weighted;
          }
          
          // Identify x402 protocol payments
          // x402 payments are HTTP-native, stateless, and cryptographically verified
          // Indicators: USDC currency, chain specified, or explicit x402 flag
          const isX402Payment = payment.currency === 'USDC' && 
                               (payment.chain || payment.verified) &&
                               // Additional check: x402 payments typically have txHash
                               payment.txHash;
          
          if (isX402Payment) {
            x402PaymentCount++;
            x402PaymentValue += value;
          }
        } catch (error) {
          console.warn(`Error processing payment at index ${index}:`, error);
          // Continue processing other payments
        }
      });

      if (totalValue <= 0) {
        return 0; // No valid payments
      }

      // Normalize: boost = (weighted_average - 0.5) * 0.2
      // Max boost: 10% for perfect weighted average
      const weightedAverage = weightedSum / totalValue;
      if (!isFinite(weightedAverage)) {
        console.warn('Invalid weighted average calculated, using 0:', weightedAverage);
        return 0;
      }

      let baseBoost = Math.max(0, (weightedAverage - 0.5) * 0.2);
      if (!isFinite(baseBoost)) {
        baseBoost = 0;
      }
      
      // Additional boost for x402 protocol payments (up to 5% extra)
      // x402 payments are cryptographically secured and represent autonomous agent commerce
      // The boost scales with both count and value of x402 payments
      const x402PaymentRatio = verifiedPayments.length > 0 
        ? x402PaymentCount / verifiedPayments.length 
        : 0;
      const x402ValueRatio = totalValue > 0 
        ? x402PaymentValue / totalValue 
        : 0;
      
      if (!isFinite(x402PaymentRatio) || !isFinite(x402ValueRatio)) {
        console.warn('Invalid x402 ratios calculated, using 0');
        return baseBoost;
      }
      
      // Combined boost: considers both payment count and value
      // This rewards users who receive significant x402 payments
      const x402Boost = Math.min(
        0.05, 
        (x402PaymentRatio * 0.03) + (x402ValueRatio * 0.02)
      );
      
      if (!isFinite(x402Boost)) {
        console.warn('Invalid x402 boost calculated, using 0:', x402Boost);
        return baseBoost;
      }
      
      const totalBoost = baseBoost + x402Boost;
      return isFinite(totalBoost) ? Math.max(0, totalBoost) : 0;
    } catch (error) {
      console.warn(`Failed to calculate payment weighted boost:`, error);
      return 0; // Return 0 boost on error
    }
  }

  /**
   * Calculate reputation registry boost from verified ratings
   * 
   * @throws {Error} If invalid registry data is provided
   */
  private calculateRegistryBoost(registry: ReputationRegistry): number {
    try {
      if (!registry || typeof registry !== 'object') {
        throw new Error('Registry must be a valid object');
      }
      if (!Array.isArray(registry.ratings)) {
        throw new Error('Registry ratings must be an array');
      }

      const verifiedRatings = registry.ratings.filter(r => r && r.verified === true);
      if (verifiedRatings.length === 0) return 0;

      let totalRating = 0;
      let validRatings = 0;

      verifiedRatings.forEach((rating, index) => {
        try {
          if (!rating || typeof rating !== 'object') {
            console.warn(`Invalid rating at index ${index}, skipping`);
            return;
          }

          const ratingValue = typeof rating.rating === 'number' && 
                             isFinite(rating.rating) && 
                             rating.rating >= 0 && 
                             rating.rating <= 1
            ? rating.rating
            : null;

          if (ratingValue === null) {
            console.warn(`Invalid rating value at index ${index}, skipping:`, rating.rating);
            return;
          }

          totalRating += ratingValue;
          validRatings++;
        } catch (error) {
          console.warn(`Error processing rating at index ${index}:`, error);
          // Continue processing other ratings
        }
      });

      if (validRatings === 0) return 0;

      const avgRating = totalRating / validRatings;
      if (!isFinite(avgRating)) {
        console.warn('Invalid average rating calculated, using 0:', avgRating);
        return 0;
      }
      
      // Boost = (avg_rating - 0.5) * 0.15
      // Max boost: 7.5% for perfect average rating
      const boost = (avgRating - 0.5) * 0.15;
      if (!isFinite(boost)) {
        console.warn('Invalid boost calculated, using 0:', boost);
        return 0;
      }

      return Math.max(0, boost);
    } catch (error) {
      console.warn(`Failed to calculate registry boost:`, error);
      return 0; // Return 0 boost on error
    }
  }

  /**
   * Determine if user is "highly trusted" based on x402 protocol standards
   * 
   * Key elements:
   * 1. On-chain identity verification (NFT/SBT)
   * 2. Reputation registry (transaction-verified feedback)
   * 3. Validation mechanisms (cryptographic proofs)
   * 4. Verified payment history (x402 transactions)
   * 5. Continuous update and dynamic scoring
   * 
   * @throws {Error} If calculation encounters critical errors
   */
  private async determineHighlyTrustedUser(params: {
    userId: string;
    overall: number;
    onChainIdentity?: OnChainIdentity;
    verifiedPayments: VerifiedPayment[];
    reputationRegistry?: ReputationRegistry;
    contributions: Contribution[];
  }): Promise<HighlyTrustedUserStatus> {
    try {
      const { userId, overall, onChainIdentity, verifiedPayments, reputationRegistry, contributions } = params;
      
      if (typeof userId !== 'string' || userId.length === 0) {
        throw new Error('Invalid userId: must be a non-empty string');
      }
      if (typeof overall !== 'number' || !isFinite(overall) || overall < 0) {
        throw new Error('Invalid overall score: must be a finite non-negative number');
      }
      if (!Array.isArray(verifiedPayments)) {
        throw new Error('VerifiedPayments must be an array');
      }
      if (!Array.isArray(contributions)) {
        throw new Error('Contributions must be an array');
      }
      
      const now = Date.now();
      const explanation: string[] = [];
      
      // 1. On-chain identity verification
      let identityVerificationScore = 0;
      try {
        identityVerificationScore = this.calculateIdentityVerificationScore(onChainIdentity);
      } catch (error) {
        console.warn(`Failed to calculate identity verification score for ${userId}:`, error);
        identityVerificationScore = 0;
      }
      const onChainIdentityVerified = identityVerificationScore >= this.HIGHLY_TRUSTED_THRESHOLDS.minIdentityVerificationScore;
      
      if (onChainIdentityVerified) {
        explanation.push(`✓ On-chain identity verified (score: ${(identityVerificationScore * 100).toFixed(1)}%)`);
      } else {
        explanation.push(`✗ On-chain identity verification insufficient (score: ${(identityVerificationScore * 100).toFixed(1)}%)`);
      }

      // 2. Minimum reputation score
      const minReputationScore = overall >= this.HIGHLY_TRUSTED_THRESHOLDS.minReputationScore;
      if (minReputationScore) {
        explanation.push(`✓ Reputation score above threshold (${overall.toFixed(0)} >= ${this.HIGHLY_TRUSTED_THRESHOLDS.minReputationScore})`);
      } else {
        explanation.push(`✗ Reputation score below threshold (${overall.toFixed(0)} < ${this.HIGHLY_TRUSTED_THRESHOLDS.minReputationScore})`);
      }

      // 3. Verified payment history (x402 protocol)
      const verifiedPaymentsOnly = verifiedPayments.filter(p => p && p.verified === true);
      let paymentHistoryScore = 0;
      let totalPaymentValue = 0;
      try {
        paymentHistoryScore = this.calculatePaymentHistoryScore(verifiedPaymentsOnly);
        totalPaymentValue = verifiedPaymentsOnly.reduce((sum, p) => {
          const amount = typeof p.amount === 'number' && isFinite(p.amount) && p.amount >= 0 ? p.amount : 0;
          return sum + amount;
        }, 0);
      } catch (error) {
        console.warn(`Failed to calculate payment history score for ${userId}:`, error);
        paymentHistoryScore = 0;
        totalPaymentValue = 0;
      }
      
      const minVerifiedPayments = verifiedPaymentsOnly.length >= this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedPayments;
      const minPaymentValue = totalPaymentValue >= this.HIGHLY_TRUSTED_THRESHOLDS.minPaymentValue;
      
      if (minVerifiedPayments) {
        explanation.push(`✓ Sufficient verified payments (${verifiedPaymentsOnly.length} >= ${this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedPayments})`);
      } else {
        explanation.push(`✗ Insufficient verified payments (${verifiedPaymentsOnly.length} < ${this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedPayments})`);
      }

      if (minPaymentValue) {
        explanation.push(`✓ Total payment value sufficient (${totalPaymentValue.toFixed(2)} >= ${this.HIGHLY_TRUSTED_THRESHOLDS.minPaymentValue})`);
      } else {
        explanation.push(`✗ Total payment value insufficient (${totalPaymentValue.toFixed(2)} < ${this.HIGHLY_TRUSTED_THRESHOLDS.minPaymentValue})`);
      }

      // 4. Reputation registry (verified ratings)
      let registryScore = 0;
      let verifiedRatings: Array<{ rating: number }> = [];
      let avgRating = 0;
      try {
        registryScore = reputationRegistry 
          ? this.calculateReputationRegistryScore(reputationRegistry)
          : 0;
        verifiedRatings = reputationRegistry?.ratings?.filter(r => r && r.verified === true) || [];
        if (verifiedRatings.length > 0) {
          const totalRating = verifiedRatings.reduce((sum, r) => {
            const rating = typeof r.rating === 'number' && isFinite(r.rating) && r.rating >= 0 && r.rating <= 1
              ? r.rating
              : 0;
            return sum + rating;
          }, 0);
          avgRating = totalRating / verifiedRatings.length;
        }
      } catch (error) {
        console.warn(`Failed to calculate reputation registry score for ${userId}:`, error);
        registryScore = 0;
        verifiedRatings = [];
        avgRating = 0;
      }
      
      const minVerifiedRatings = verifiedRatings.length >= this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedRatings;
      const minRatingAverage = avgRating >= this.HIGHLY_TRUSTED_THRESHOLDS.minRatingAverage;
      
      if (minVerifiedRatings) {
        explanation.push(`✓ Sufficient verified ratings (${verifiedRatings.length} >= ${this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedRatings})`);
      } else {
        explanation.push(`✗ Insufficient verified ratings (${verifiedRatings.length} < ${this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedRatings})`);
      }

      if (minRatingAverage) {
        explanation.push(`✓ Average rating above threshold (${(avgRating * 100).toFixed(1)}% >= ${(this.HIGHLY_TRUSTED_THRESHOLDS.minRatingAverage * 100)}%)`);
      } else {
        explanation.push(`✗ Average rating below threshold (${(avgRating * 100).toFixed(1)}% < ${(this.HIGHLY_TRUSTED_THRESHOLDS.minRatingAverage * 100)}%)`);
      }

      // 5. Validation mechanisms (cryptographic proofs, TEE, zk proofs)
      let validationScore = 0;
      try {
        validationScore = reputationRegistry && Array.isArray(reputationRegistry.validations)
          ? this.calculateValidationScore(reputationRegistry.validations)
          : 0;
      } catch (error) {
        console.warn(`Failed to calculate validation score for ${userId}:`, error);
        validationScore = 0;
      }

      // 6. Temporal consistency (recent activity)
      let temporalConsistencyScore = 0;
      try {
        temporalConsistencyScore = this.calculateTemporalConsistencyScore(contributions, verifiedPaymentsOnly);
      } catch (error) {
        console.warn(`Failed to calculate temporal consistency score for ${userId}:`, error);
        temporalConsistencyScore = 0;
      }
      const positiveRecentActivity = temporalConsistencyScore >= this.HIGHLY_TRUSTED_THRESHOLDS.minTemporalConsistency;
      
      if (positiveRecentActivity) {
        explanation.push(`✓ Positive recent activity detected (consistency: ${(temporalConsistencyScore * 100).toFixed(1)}%)`);
      } else {
        explanation.push(`✗ Insufficient recent activity (consistency: ${(temporalConsistencyScore * 100).toFixed(1)}%)`);
      }

      // 7. Sybil resistance (payment pattern analysis)
      let sybilResistant = false;
      try {
        sybilResistant = await this.assessSybilResistance(verifiedPaymentsOnly);
      } catch (error) {
        console.warn(`Failed to assess Sybil resistance for ${userId}:`, error);
        sybilResistant = false; // Default to false on error (more conservative)
      }

      // Aggregate requirements
      const requirements = {
        onChainIdentityVerified,
        minReputationScore,
        minVerifiedPayments: minVerifiedPayments && minPaymentValue, // Both count and value must pass
        minVerifiedRatings: minVerifiedRatings && minRatingAverage, // Both count and average must pass
        positiveRecentActivity,
        sybilResistant,
      };

      // Count passed requirements
      const passedRequirements = Object.values(requirements).filter(v => v).length;
      
      // Highly trusted if minimum requirements met (at least 5 out of 6 requirements)
      const isHighlyTrusted = passedRequirements >= 5;

      // Calculate overall confidence using weighted factors
      const trustFactors = {
        identityVerificationScore: Math.max(0, Math.min(1, identityVerificationScore)),
        paymentHistoryScore: Math.max(0, Math.min(1, paymentHistoryScore)),
        reputationRegistryScore: Math.max(0, Math.min(1, registryScore)),
        validationScore: Math.max(0, Math.min(1, validationScore)),
        temporalConsistencyScore: Math.max(0, Math.min(1, temporalConsistencyScore)),
      };

      const confidence = (
        trustFactors.identityVerificationScore * this.CONFIDENCE_WEIGHTS.identityVerification +
        trustFactors.paymentHistoryScore * this.CONFIDENCE_WEIGHTS.paymentHistory +
        trustFactors.reputationRegistryScore * this.CONFIDENCE_WEIGHTS.reputationRegistry +
        trustFactors.validationScore * this.CONFIDENCE_WEIGHTS.validation +
        trustFactors.temporalConsistencyScore * this.CONFIDENCE_WEIGHTS.temporalConsistency
      );

      if (!isFinite(confidence) || confidence < 0 || confidence > 1) {
        console.warn(`Invalid confidence calculated for ${userId}, clamping to 0-1:`, confidence);
      }

      // Determine trust level based on thresholds
      let trustLevel: HighlyTrustedUserStatus['trustLevel'];
      try {
        trustLevel = this.determineTrustLevel(overall, confidence, isHighlyTrusted);
      } catch (error) {
        console.warn(`Failed to determine trust level for ${userId}:`, error);
        trustLevel = 'untrusted'; // Default to most conservative level
      }

      return {
        isHighlyTrusted,
        confidence: Math.max(0, Math.min(1, isFinite(confidence) ? confidence : 0)),
        requirements,
        trustFactors,
        trustLevel,
        explanation,
      };
    } catch (error) {
      throw new Error(`Failed to determine highly trusted user status for ${params.userId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Determine trust level based on score, confidence, and highly trusted status
   */
  private determineTrustLevel(
    overall: number,
    confidence: number,
    isHighlyTrusted: boolean
  ): HighlyTrustedUserStatus['trustLevel'] {
    const thresholds = this.TRUST_LEVEL_THRESHOLDS;

    if (isHighlyTrusted && confidence >= thresholds.highlyTrusted.confidence) {
      return 'highly_trusted';
    }
    if (overall >= thresholds.trusted.score && confidence >= thresholds.trusted.confidence) {
      return 'trusted';
    }
    if (overall >= thresholds.moderate.score && confidence >= thresholds.moderate.confidence) {
      return 'moderate';
    }
    if (overall >= thresholds.caution.score || confidence >= thresholds.caution.confidence) {
      return 'caution';
    }
    return 'untrusted';
  }

  /**
   * Calculate identity verification score (0-1)
   * Based on NFT identity, SBT credentials, and cross-chain verification
   * 
   * @throws {Error} If invalid identity data is provided
   */
  private calculateIdentityVerificationScore(identity?: OnChainIdentity): number {
    try {
      if (!identity) return 0;

      if (typeof identity !== 'object') {
        throw new Error('Identity must be a valid object');
      }

      let score = 0;

      // NFT Identity verification
      try {
        if (identity.nftIdentity && 
            typeof identity.nftIdentity === 'object' && 
            identity.nftIdentity.verified === true) {
          const nftWeight = this.IDENTITY_WEIGHTS.nftIdentity;
          if (isFinite(nftWeight) && nftWeight >= 0) {
            score += nftWeight;
          }
        }
      } catch (error) {
        console.warn('Error processing NFT identity:', error);
        // Continue with other identity checks
      }

      // SBT Credential verification
      try {
        if (identity.sbtCredential && 
            typeof identity.sbtCredential === 'object' && 
            identity.sbtCredential.verified === true) {
          const sbtWeight = this.IDENTITY_WEIGHTS.sbtCredential;
          if (isFinite(sbtWeight) && sbtWeight >= 0) {
            score += sbtWeight;
          }
        }
      } catch (error) {
        console.warn('Error processing SBT credential:', error);
        // Continue with other identity checks
      }

      // Cross-chain verification bonus
      try {
        if (Array.isArray(identity.verifiedChains) && 
            identity.verifiedChains.length >= this.IDENTITY_WEIGHTS.minChainsForCrossChain) {
          const chainCount = identity.verifiedChains.length;
          const crossChainBonus = Math.min(
            this.IDENTITY_WEIGHTS.crossChainBase,
            chainCount * this.IDENTITY_WEIGHTS.crossChainPerChain
          );
          if (isFinite(crossChainBonus) && crossChainBonus >= 0) {
            score += crossChainBonus;
          }
        }
      } catch (error) {
        console.warn('Error processing cross-chain verification:', error);
        // Continue with other identity checks
      }

      // Wallet address verification (optional bonus)
      try {
        if (identity.walletAddress && typeof identity.walletAddress === 'string' && identity.walletAddress.length > 0) {
          const walletWeight = this.IDENTITY_WEIGHTS.walletAddress;
          if (isFinite(walletWeight) && walletWeight >= 0) {
            score += walletWeight;
          }
        }
      } catch (error) {
        console.warn('Error processing wallet address:', error);
        // Continue
      }

      // Clamp to 0-1 range
      const finalScore = isFinite(score) ? score : 0;
      return Math.max(0, Math.min(1.0, finalScore));
    } catch (error) {
      console.warn(`Failed to calculate identity verification score:`, error);
      return 0; // Return 0 on error
    }
  }

  /**
   * Calculate payment history score (0-1)
   * Based on number of payments, total value, and recency
   * 
   * @throws {Error} If invalid payment data is provided
   */
  private calculatePaymentHistoryScore(payments: VerifiedPayment[]): number {
    try {
      if (!Array.isArray(payments)) {
        throw new Error('Payments must be an array');
      }

      if (payments.length === 0) return 0;

      const now = Date.now();
      let totalValue = 0;
      let validPayments = 0;

      payments.forEach((payment, index) => {
        try {
          if (!payment || typeof payment !== 'object') {
            console.warn(`Invalid payment at index ${index} in payment history score, skipping`);
            return;
          }

          const amount = typeof payment.amount === 'number' && isFinite(payment.amount) && payment.amount >= 0
            ? payment.amount
            : 0;
          
          if (amount > 0) {
            totalValue += amount;
            validPayments++;
          }
        } catch (error) {
          console.warn(`Error processing payment at index ${index} in payment history score:`, error);
          // Continue processing other payments
        }
      });

      if (validPayments === 0) return 0;
      
      // Payment count score (0-0.4)
      const countScore = Math.min(0.4, validPayments / this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedPayments * 0.4);
      if (!isFinite(countScore) || countScore < 0) {
        console.warn('Invalid count score calculated, using 0');
        return 0;
      }
      
      // Payment value score (0-0.4)
      const valueScore = totalValue > 0 && this.HIGHLY_TRUSTED_THRESHOLDS.minPaymentValue > 0
        ? Math.min(0.4, totalValue / this.HIGHLY_TRUSTED_THRESHOLDS.minPaymentValue * 0.4)
        : 0;
      if (!isFinite(valueScore) || valueScore < 0) {
        console.warn('Invalid value score calculated, using 0');
        return countScore;
      }
      
      // Recency score (0-0.2) - recent payments weighted higher
      const recentWindow = this.HIGHLY_TRUSTED_THRESHOLDS.minRecentActivityDays * 24 * 60 * 60 * 1000;
      const recentPayments = payments.filter(p => {
        if (!p || typeof p.timestamp !== 'number' || !isFinite(p.timestamp)) {
          return false;
        }
        const diff = now - p.timestamp;
        return isFinite(diff) && diff >= 0 && diff < recentWindow;
      });
      const recencyScore = recentPayments.length > 0 ? 0.2 : 0;

      const totalScore = countScore + valueScore + recencyScore;
      return Math.max(0, Math.min(1, isFinite(totalScore) ? totalScore : 0));
    } catch (error) {
      console.warn(`Failed to calculate payment history score:`, error);
      return 0; // Return 0 on error
    }
  }

  /**
   * Calculate reputation registry score (0-1)
   * Based on verified ratings and feedback
   * 
   * @throws {Error} If invalid registry data is provided
   */
  private calculateReputationRegistryScore(registry: ReputationRegistry): number {
    try {
      if (!registry || typeof registry !== 'object') {
        throw new Error('Registry must be a valid object');
      }
      if (!Array.isArray(registry.ratings)) {
        throw new Error('Registry ratings must be an array');
      }

      const verifiedRatings = registry.ratings.filter(r => r && r.verified === true);
      if (verifiedRatings.length === 0) return 0;

      let totalRating = 0;
      let validRatings = 0;

      verifiedRatings.forEach((rating, index) => {
        try {
          if (!rating || typeof rating !== 'object') {
            console.warn(`Invalid rating at index ${index} in registry score, skipping`);
            return;
          }

          const ratingValue = typeof rating.rating === 'number' && 
                             isFinite(rating.rating) && 
                             rating.rating >= 0 && 
                             rating.rating <= 1
            ? rating.rating
            : null;

          if (ratingValue === null) {
            console.warn(`Invalid rating value at index ${index}, skipping:`, rating.rating);
            return;
          }

          totalRating += ratingValue;
          validRatings++;
        } catch (error) {
          console.warn(`Error processing rating at index ${index} in registry score:`, error);
          // Continue processing other ratings
        }
      });

      if (validRatings === 0) return 0;

      const avgRating = totalRating / validRatings;
      if (!isFinite(avgRating) || avgRating < 0 || avgRating > 1) {
        console.warn('Invalid average rating calculated, using 0:', avgRating);
        return 0;
      }

      const countScore = this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedRatings > 0
        ? Math.min(0.6, validRatings / this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedRatings * 0.6)
        : 0;
      if (!isFinite(countScore) || countScore < 0) {
        console.warn('Invalid count score calculated, using 0');
        return avgRating * 0.4;
      }

      const ratingScore = avgRating * 0.4;
      if (!isFinite(ratingScore) || ratingScore < 0) {
        console.warn('Invalid rating score calculated, using count score only');
        return countScore;
      }

      const totalScore = countScore + ratingScore;
      return Math.max(0, Math.min(1, isFinite(totalScore) ? totalScore : 0));
    } catch (error) {
      console.warn(`Failed to calculate reputation registry score:`, error);
      return 0; // Return 0 on error
    }
  }

  /**
   * Calculate validation score (0-1)
   * Based on cryptographic proofs, TEE attestations, zk proofs
   * 
   * @throws {Error} If invalid validation data is provided
   */
  private calculateValidationScore(validations: ReputationRegistry['validations']): number {
    try {
      if (!Array.isArray(validations)) {
        throw new Error('Validations must be an array');
      }

      if (validations.length === 0) return 0;

      const verifiedValidations = validations.filter(v => v && v.verified === true);
      if (verifiedValidations.length === 0) return 0;

      // Higher weight for cryptographic and TEE validations
      let weightedSum = 0;
      verifiedValidations.forEach((v, index) => {
        try {
          if (!v || typeof v !== 'object') {
            console.warn(`Invalid validation at index ${index}, skipping`);
            return;
          }

          const validationType = v.validationType;
          switch (validationType) {
            case 'cryptographic':
              weightedSum += 1.0;
              break;
            case 'third-party':
              weightedSum += 0.8;
              break;
            case 'community':
              weightedSum += 0.5;
              break;
            default:
              console.warn(`Unknown validation type at index ${index}: ${validationType}, using 0.3`);
              weightedSum += 0.3; // Default weight for unknown types
              break;
          }
        } catch (error) {
          console.warn(`Error processing validation at index ${index}:`, error);
          // Continue processing other validations
        }
      });

      if (!isFinite(weightedSum) || weightedSum < 0) {
        console.warn('Invalid weighted sum calculated, using 0:', weightedSum);
        return 0;
      }

      // Normalize: max score = 1.0 for 3+ cryptographic validations
      const score = weightedSum / 3.0;
      return Math.max(0, Math.min(1.0, isFinite(score) ? score : 0));
    } catch (error) {
      console.warn(`Failed to calculate validation score:`, error);
      return 0; // Return 0 on error
    }
  }

  /**
   * Calculate temporal consistency score (0-1)
   * Measures recent activity and consistency over time
   * 
   * @param contributions - User contributions to analyze
   * @param payments - Verified payments to analyze
   * @returns Temporal consistency score between 0 and 1
   */
  private calculateTemporalConsistencyScore(
    contributions: Contribution[],
    payments: VerifiedPayment[]
  ): number {
    const now = Date.now();
    const recentWindow = this.HIGHLY_TRUSTED_THRESHOLDS.minRecentActivityDays * this.TIME_CONSTANTS.msPerDay;

    // Recent contributions
    const recentContributions = contributions.filter(c => 
      (now - c.timestamp) < recentWindow && c.timestamp > 0
    );

    // Recent payments
    const recentPayments = payments.filter(p => 
      (now - p.timestamp) < recentWindow && p.timestamp > 0
    );

    // Activity score
    const contributionActivity = Math.min(
      this.TEMPORAL_WEIGHTS.contributionActivity,
      recentContributions.length / this.TEMPORAL_WEIGHTS.contributionActivityDivisor * 
      this.TEMPORAL_WEIGHTS.contributionActivity
    );
    const paymentActivity = Math.min(
      this.TEMPORAL_WEIGHTS.paymentActivity,
      recentPayments.length / this.TEMPORAL_WEIGHTS.paymentActivityDivisor * 
      this.TEMPORAL_WEIGHTS.paymentActivity
    );

    // Consistency score - based on regular activity pattern
    let consistencyScore = this.TEMPORAL_WEIGHTS.consistencyScore; // Default if no recent activity
    if (recentContributions.length > 0 || recentPayments.length > 0) {
      // Simple heuristic: activity in multiple weeks = consistent
      const weeks = new Set<number>();
      [...recentContributions, ...recentPayments].forEach(item => {
        const week = Math.floor(item.timestamp / this.TIME_CONSTANTS.msPerWeek);
        weeks.add(week);
      });
      consistencyScore = Math.min(
        this.TEMPORAL_WEIGHTS.consistencyScore,
        weeks.size / this.TEMPORAL_WEIGHTS.consistencyWeeksDivisor * 
        this.TEMPORAL_WEIGHTS.consistencyScore
      );
    }

    return Math.max(0, Math.min(1, contributionActivity + paymentActivity + consistencyScore));
  }

  /**
   * Assess Sybil resistance based on payment patterns
   * Detects coordinated attacks and suspicious patterns
   * 
   * @param payments - Verified payments to analyze
   * @returns true if payment patterns indicate low Sybil risk, false otherwise
   */
  private async assessSybilResistance(payments: VerifiedPayment[]): Promise<boolean> {
    try {
      if (!Array.isArray(payments)) {
        throw new Error('Payments must be an array');
      }

      if (payments.length < this.SYBIL_THRESHOLDS.minPaymentsForAssessment) {
        return true; // Not enough data to assess - assume safe
      }

      // Analyze payment patterns
      const recipients = new Set<string>();
      const amounts: number[] = [];
      const timestamps: number[] = [];

      payments.forEach((payment, index) => {
        try {
          if (!payment || typeof payment !== 'object') {
            console.warn(`Invalid payment at index ${index} in Sybil assessment, skipping`);
            return;
          }

          if (payment.recipient && typeof payment.recipient === 'string') {
            recipients.add(payment.recipient);
          }

          const amount = typeof payment.amount === 'number' && isFinite(payment.amount) && payment.amount >= 0
            ? payment.amount
            : 0;
          amounts.push(amount);

          const timestamp = typeof payment.timestamp === 'number' && isFinite(payment.timestamp) && payment.timestamp > 0
            ? payment.timestamp
            : 0;
          if (timestamp > 0) {
            timestamps.push(timestamp);
          }
        } catch (error) {
          console.warn(`Error processing payment at index ${index} in Sybil assessment:`, error);
          // Continue processing other payments
        }
      });

      if (amounts.length === 0 || timestamps.length === 0) {
        return true; // Not enough valid data to assess - assume safe
      }

      // Sybil indicators
      // 1. Many small payments to same recipient (suspicious pattern)
      const uniqueRecipients = recipients.size;
      const totalAmount = amounts.reduce((a, b) => a + b, 0);
      const avgAmount = totalAmount / amounts.length;
      
      if (!isFinite(avgAmount) || avgAmount < 0) {
        console.warn('Invalid average amount calculated in Sybil assessment, assuming safe');
        return true;
      }

      const sameRecipientRatio = payments.length > 0 ? uniqueRecipients / payments.length : 1;
      if (!isFinite(sameRecipientRatio) || sameRecipientRatio < 0 || sameRecipientRatio > 1) {
        console.warn('Invalid recipient ratio calculated in Sybil assessment, assuming safe');
        return true;
      }

      // 2. Payment bursts (coordinated activity)
      const now = Date.now();
      const recentPayments = timestamps.filter(ts => {
        const diff = now - ts;
        return isFinite(diff) && diff >= 0 && diff < this.SYBIL_THRESHOLDS.burstWindowMs;
      }).length;

      // Sybil risk flags
      const hasSameRecipientPattern = 
        sameRecipientRatio < this.SYBIL_THRESHOLDS.suspiciousRecipientRatio &&
        payments.length > this.SYBIL_THRESHOLDS.suspiciousPaymentCount &&
        avgAmount < this.SYBIL_THRESHOLDS.suspiciousAvgAmount;
      
      const hasBurstPattern = recentPayments > this.SYBIL_THRESHOLDS.burstThreshold;

      // Low Sybil risk if patterns are normal
      return !hasSameRecipientPattern && !hasBurstPattern;
    } catch (error) {
      console.warn(`Failed to assess Sybil resistance:`, error);
      return false; // Default to false on error (more conservative - assume risky)
    }
  }

  /**
   * Calculate user's percentile rank based on reputation score
   * 
   * @param userId - User identifier
   * @param score - Reputation score to calculate percentile for
   * @returns Promise resolving to percentile (0-100)
   */
  private async calculatePercentile(userId: string, score: number): Promise<number> {
    try {
      if (typeof userId !== 'string' || userId.length === 0) {
        throw new Error('Invalid userId: must be a non-empty string');
      }
      if (typeof score !== 'number' || !isFinite(score) || score < 0) {
        throw new Error('Invalid score: must be a finite non-negative number');
      }

      // In production, this would query a cloud database
      const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
      
      if (typeof analyticsEndpoint !== 'string' || analyticsEndpoint.length === 0) {
        throw new Error('Invalid analytics endpoint');
      }

      try {
        const response = await fetch(`${analyticsEndpoint}/percentile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, score }),
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          if (data && typeof data.percentile === 'number' && 
              isFinite(data.percentile) && 
              data.percentile >= 0 && 
              data.percentile <= 100) {
            return data.percentile;
          } else {
            console.warn(`Invalid percentile data received for user ${userId}:`, data);
          }
        } else {
          console.warn(`Failed to calculate percentile from cloud for user ${userId}: HTTP ${response.status}`);
        }
      } catch (fetchError) {
        // Handle network errors, timeouts, etc.
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
            console.warn(`Timeout calculating percentile from cloud for user ${userId}`);
          } else {
            console.warn(`Network error calculating percentile from cloud for user ${userId}:`, fetchError.message);
          }
        } else {
          console.warn(`Failed to calculate percentile from cloud for user ${userId}:`, fetchError);
        }
      }
    } catch (error) {
      console.warn(`Error in calculatePercentile for user ${userId}:`, error);
    }

    // Default percentile calculation (mock)
    // Assumes max score of 1000
    try {
      const defaultPercentile = (score / 1000) * 100;
      return Math.min(100, Math.max(0, isFinite(defaultPercentile) ? defaultPercentile : 0));
    } catch (error) {
      console.warn(`Failed to calculate default percentile for user ${userId}:`, error);
      return 0; // Return 0 as fallback
    }
  }

  /**
   * Calculate user's rank based on reputation score
   * 
   * @param userId - User identifier
   * @returns Promise resolving to rank (lower is better, 0 = top rank)
   */
  private async calculateRank(userId: string): Promise<number> {
    try {
      if (typeof userId !== 'string' || userId.length === 0) {
        throw new Error('Invalid userId: must be a non-empty string');
      }

      // In production, this would query a cloud database
      const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
      
      if (typeof analyticsEndpoint !== 'string' || analyticsEndpoint.length === 0) {
        throw new Error('Invalid analytics endpoint');
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (process.env.CLOUD_API_KEY && typeof process.env.CLOUD_API_KEY === 'string') {
          headers['Authorization'] = `Bearer ${process.env.CLOUD_API_KEY}`;
        }

        const response = await fetch(`${analyticsEndpoint}/rank/${encodeURIComponent(userId)}`, {
          headers,
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          if (data && typeof data.rank === 'number' && 
              isFinite(data.rank) && 
              data.rank >= 0) {
            return data.rank;
          } else {
            console.warn(`Invalid rank data received for user ${userId}:`, data);
          }
        } else {
          console.warn(`Failed to calculate rank from cloud for user ${userId}: HTTP ${response.status}`);
        }
      } catch (fetchError) {
        // Handle network errors, timeouts, etc.
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout')) {
            console.warn(`Timeout calculating rank from cloud for user ${userId}`);
          } else {
            console.warn(`Network error calculating rank from cloud for user ${userId}:`, fetchError.message);
          }
        } else {
          console.warn(`Failed to calculate rank from cloud for user ${userId}:`, fetchError);
        }
      }
    } catch (error) {
      console.warn(`Error in calculateRank for user ${userId}:`, error);
    }

    // Default rank (mock)
    return 0;
  }

  // Missing constants that are referenced in the code
  private readonly SCORING_WEIGHTS = {
    verificationBoost: 1.25, // 25% boost for verified contributions
    maxVerifiers: 5, // Maximum verifiers to count
    verifierBoostPerVerifier: 0.05, // 5% boost per verifier (up to 25%)
    baseReputationWeight: 0.7, // Base weight for reputation in combined score
    safetyScoreWeight: 0.3, // Weight for safety score in combined score
  };

  private readonly CONFIDENCE_WEIGHTS = {
    identityVerification: 0.25,
    paymentHistory: 0.25,
    reputationRegistry: 0.20,
    validation: 0.15,
    temporalConsistency: 0.15,
  };

  private readonly IDENTITY_WEIGHTS = {
    nftIdentity: 0.4,
    sbtCredential: 0.3,
    walletAddress: 0.1,
    crossChainBase: 0.1,
    crossChainPerChain: 0.05,
    minChainsForCrossChain: 2,
  };

  private readonly TEMPORAL_WEIGHTS = {
    contributionActivity: 0.4,
    paymentActivity: 0.3,
    consistencyScore: 0.3,
    contributionActivityDivisor: 10, // Normalize to 10 contributions
    paymentActivityDivisor: 5, // Normalize to 5 payments
    consistencyWeeksDivisor: 4, // Normalize to 4 weeks
  };

  private readonly SYBIL_THRESHOLDS = {
    minPaymentsForAssessment: 3,
    burstWindowMs: 24 * 60 * 60 * 1000, // 24 hours
    burstThreshold: 10, // More than 10 payments in burst window
    suspiciousRecipientRatio: 0.3, // Less than 30% unique recipients
    suspiciousPaymentCount: 5, // More than 5 payments
    suspiciousAvgAmount: 10.0, // Average amount less than $10
  };

  private readonly TRUST_LEVEL_THRESHOLDS = {
    highlyTrusted: {
      score: 850,
      confidence: 0.85,
    },
    trusted: {
      score: 700,
      confidence: 0.70,
    },
    moderate: {
      score: 500,
      confidence: 0.50,
    },
    caution: {
      score: 300,
      confidence: 0.30,
    },
  };

  private readonly TIME_CONSTANTS = {
    msPerDay: 24 * 60 * 60 * 1000,
    msPerWeek: 7 * 24 * 60 * 60 * 1000,
  };

  /**
   * Publish reputation score to OriginTrail DKG as a Knowledge Asset
   * 
   * This implements the Knowledge Layer of the three-layer architecture:
   * - Stores reputation data as verifiable JSON-LD Knowledge Assets
   * - Enables SPARQL queries for reputation insights
   * - Creates provenance chains for reputation history
   * - Supports MCP (Model Context Protocol) for AI agent queries
   * 
   * @param dkgClient - DKG client instance
   * @param userId - User identifier
   * @param reputationScore - Calculated reputation score
   * @param contributions - User contributions
   * @param metadata - Additional metadata to include
   * @throws {Error} If publishing fails
   */
  private async publishReputationToDKG(
    dkgClient: any,
    userId: string,
    reputationScore: ReputationScore,
    contributions: Contribution[],
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      if (!dkgClient || typeof dkgClient !== 'object') {
        throw new Error('Invalid DKG client: must be a valid object');
      }
      if (typeof userId !== 'string' || userId.length === 0) {
        throw new Error('Invalid userId: must be a non-empty string');
      }
      if (!reputationScore || typeof reputationScore !== 'object') {
        throw new Error('Invalid reputationScore: must be a valid object');
      }
      if (!Array.isArray(contributions)) {
        throw new Error('Contributions must be an array');
      }
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Metadata must be a valid object');
      }

      if (typeof dkgClient.publishReputationAsset !== 'function') {
        throw new Error('DKG client does not have publishReputationAsset method');
      }

      // Build contributions array with error handling
      const contributionData = contributions.map((c, index) => {
        try {
          if (!c || typeof c !== 'object') {
            console.warn(`Invalid contribution at index ${index}, skipping`);
            return null;
          }

          const timestamp = typeof c.timestamp === 'number' && isFinite(c.timestamp) && c.timestamp > 0
            ? c.timestamp
            : Date.now();

          return {
            id: typeof c.id === 'string' ? c.id : `contribution-${index}`,
            type: typeof c.type === 'string' ? c.type : 'unknown',
            url: '',
            title: typeof c.type === 'string' ? c.type : 'Unknown Contribution',
            date: new Date(timestamp).toISOString(),
            impact: typeof c.weight === 'number' && isFinite(c.weight) && c.weight >= 0 ? c.weight : 0
          };
        } catch (error) {
          console.warn(`Error processing contribution at index ${index}:`, error);
          return null;
        }
      }).filter(c => c !== null);

      const reputationAsset = {
        developerId: userId,
        reputationScore: typeof reputationScore.overall === 'number' && isFinite(reputationScore.overall)
          ? Math.max(0, reputationScore.overall)
          : 0,
        contributions: contributionData,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          breakdown: reputationScore.breakdown || {},
          percentile: typeof reputationScore.percentile === 'number' && isFinite(reputationScore.percentile)
            ? Math.max(0, Math.min(100, reputationScore.percentile))
            : 0,
          rank: typeof reputationScore.rank === 'number' && isFinite(reputationScore.rank)
            ? Math.max(0, reputationScore.rank)
            : 0,
          safetyScore: typeof reputationScore.safetyScore === 'number' && isFinite(reputationScore.safetyScore)
            ? reputationScore.safetyScore
            : undefined,
          combinedScore: typeof reputationScore.combinedScore === 'number' && isFinite(reputationScore.combinedScore)
            ? reputationScore.combinedScore
            : undefined,
          sybilRisk: typeof reputationScore.sybilRisk === 'number' && isFinite(reputationScore.sybilRisk)
            ? reputationScore.sybilRisk
            : undefined,
          botDetectionPenalty: typeof reputationScore.botDetectionPenalty === 'number' && isFinite(reputationScore.botDetectionPenalty)
            ? reputationScore.botDetectionPenalty
            : undefined,
          highlyTrusted: reputationScore.highlyTrustedStatus?.isHighlyTrusted === true,
          trustLevel: reputationScore.highlyTrustedStatus?.trustLevel || 'untrusted',
          source: 'reputation_calculator',
          version: '1.0.0',
          // MCP metadata for AI agent integration
          mcp: {
            tool: 'reputation_score',
            version: '1.0.0',
            verifiable: true,
            source: 'dotrep_reputation_calculator'
          }
        }
      };

      const result = await dkgClient.publishReputationAsset(reputationAsset, 2); // Store for 2 epochs
      
      if (result && result.UAL) {
        console.log(`✅ Published reputation to DKG for ${userId}: ${result.UAL}`);
      } else {
        console.warn(`⚠️ Published reputation to DKG for ${userId} but no UAL returned`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to publish reputation to DKG for ${userId}:`, errorMessage);
      throw new Error(`Failed to publish reputation to DKG: ${errorMessage}`);
    }
  }
}
