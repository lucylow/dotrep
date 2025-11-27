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

export interface VerifiedPayment {
  txHash: string;
  chain: string;
  amount: number;
  currency: string;
  timestamp: number;
  recipient?: string; // Payment recipient (for reputation signals)
  payerReputation?: number; // Reputation of payer (for weighted scoring)
  verified: boolean; // Verified on-chain or via facilitator
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
   * @throws {Error} If input validation fails
   */
  async calculateReputation(request: ReputationCalculationRequest): Promise<ReputationScore> {
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
    const { breakdown, overall: baseOverall } = this.calculateContributionScores(
      contributions,
      algorithmWeights,
      timeDecayFactor,
      now
    );

    // Apply boosts and penalties
    let overall = baseOverall;
    overall = this.applyPaymentBoost(overall, verifiedPayments);
    overall = this.applyRegistryBoost(overall, reputationRegistry);

    // Apply bot detection penalty if provided
    const { penalty: botDetectionPenalty, sybilRisk } = request.botDetectionResults
      ? this.calculateBotDetectionPenalty(userId, request.botDetectionResults)
      : { penalty: 0, sybilRisk: 0 };

    if (botDetectionPenalty > 0) {
      overall = overall * (1 - botDetectionPenalty);
    }

    // Calculate percentile and rank in parallel
    const [percentile, rank] = await Promise.all([
      this.calculatePercentile(userId, overall),
      this.calculateRank(userId),
    ]);

    // Get Guardian safety score if requested (Umanitek Guardian dataset integration)
    const { safetyScore, combinedScore } = includeSafetyScore
      ? await this.calculateSafetyScore(userId, overall)
      : { safetyScore: undefined, combinedScore: undefined };

    // Determine highly trusted user status (x402 protocol)
    const highlyTrustedStatus = includeHighlyTrustedDetermination
      ? await this.determineHighlyTrustedUser({
          userId,
          overall,
          onChainIdentity,
          verifiedPayments,
          reputationRegistry,
          contributions,
        })
      : undefined;

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
   */
  private calculateContributionScores(
    contributions: Contribution[],
    algorithmWeights: Record<string, number>,
    timeDecayFactor: number,
    now: number
  ): { breakdown: Record<string, number>; overall: number } {
    const msPerDay = this.TIME_CONSTANTS.msPerDay;
    const breakdown: Record<string, number> = {};

    contributions.forEach(contribution => {
      const ageInDays = (now - contribution.timestamp) / msPerDay;
      const decayFactor = Math.exp(-timeDecayFactor * ageInDays);
      const weight = algorithmWeights[contribution.type] || 1;
      
      // Boost verified contributions (x402 protocol: transaction-verified signals)
      const verificationBoost = contribution.verified 
        ? this.SCORING_WEIGHTS.verificationBoost 
        : 1.0;
      
      // Verifier boost (up to 25% for 5+ verifiers)
      const verifierBoost = contribution.verifierCount 
        ? 1 + (Math.min(contribution.verifierCount, this.SCORING_WEIGHTS.maxVerifiers) * 
               this.SCORING_WEIGHTS.verifierBoostPerVerifier)
        : 1.0;
      
      const score = contribution.weight * weight * decayFactor * verificationBoost * verifierBoost;
      breakdown[contribution.type] = (breakdown[contribution.type] || 0) + score;
    });

    const overall = Object.values(breakdown).reduce((sum, score) => sum + score, 0);
    return { breakdown, overall };
  }

  /**
   * Apply payment-weighted reputation boost
   */
  private applyPaymentBoost(overall: number, verifiedPayments: VerifiedPayment[]): number {
    if (verifiedPayments.length === 0) return overall;
    
    const paymentBoost = this.calculatePaymentWeightedBoost(verifiedPayments);
    return overall * (1 + paymentBoost);
  }

  /**
   * Apply reputation registry boost
   */
  private applyRegistryBoost(overall: number, reputationRegistry?: ReputationRegistry): number {
    if (!reputationRegistry || reputationRegistry.ratings.length === 0) return overall;
    
    const registryBoost = this.calculateRegistryBoost(reputationRegistry);
    return overall * (1 + registryBoost);
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
   */
  private calculateBotDetectionPenalty(
    userId: string,
    botDetectionResults: BotDetectionResults
  ): { penalty: number; sybilRisk: number } {
    // Check if user is in a confirmed bot cluster
    const confirmedCluster = botDetectionResults.confirmedBotClusters.find(cluster =>
      cluster.nodes.includes(userId)
    );

    if (confirmedCluster) {
      // Significant penalty for confirmed bots (70% penalty)
      return {
        penalty: Math.min(0.7, confirmedCluster.suspicionScore * 0.7),
        sybilRisk: confirmedCluster.suspicionScore,
      };
    }

    // Check if user is in a suspicious cluster
    const suspiciousCluster = botDetectionResults.suspiciousClusters.find(cluster =>
      cluster.nodes.includes(userId)
    );

    if (suspiciousCluster) {
      // Smaller penalty for suspicious clusters (30% penalty)
      return {
        penalty: Math.min(0.3, suspiciousCluster.suspicionScore * 0.3),
        sybilRisk: suspiciousCluster.suspicionScore,
      };
    }

    // Check if user is an individual bot
    const individualBot = botDetectionResults.individualBots.find(bot => bot.node === userId);

    if (individualBot) {
      // Penalty based on sybil risk
      return {
        penalty: Math.min(0.5, individualBot.sybilRisk * 0.5),
        sybilRisk: individualBot.sybilRisk,
      };
    }

    // No penalty
    return { penalty: 0, sybilRisk: 0 };
  }

  /**
   * Calculate payment-weighted reputation boost (TraceRank-style)
   * Higher-value payments from high-reputation payers = stronger signal
   * Enhanced with x402 protocol integration for autonomous agent payments
   */
  private calculatePaymentWeightedBoost(payments: VerifiedPayment[]): number {
    if (payments.length === 0) return 0;

    const verifiedPayments = payments.filter(p => p.verified);
    if (verifiedPayments.length === 0) return 0;

    let weightedSum = 0;
    let totalValue = 0;
    let x402PaymentCount = 0; // Track x402 protocol payments for additional boost

    verifiedPayments.forEach(payment => {
      const value = payment.amount;
      const payerRep = payment.payerReputation || 0.5; // Default 0.5 if unknown
      
      totalValue += value;
      // Weight = amount * payer_reputation (TraceRank principle)
      weightedSum += value * payerRep;
      
      // x402 protocol payments get additional weight (autonomous agent payments)
      // These are cryptographically verified and represent higher trust
      if (payment.currency === 'USDC' || payment.chain) {
        x402PaymentCount++;
      }
    });

    // Normalize: boost = (weighted_average - 0.5) * 0.2
    // Max boost: 10% for perfect weighted average
    const weightedAverage = totalValue > 0 ? weightedSum / totalValue : 0;
    let baseBoost = Math.max(0, (weightedAverage - 0.5) * 0.2);
    
    // Additional boost for x402 protocol payments (up to 5% extra)
    // x402 payments are cryptographically secured and represent autonomous agent commerce
    const x402Boost = Math.min(0.05, (x402PaymentCount / verifiedPayments.length) * 0.05);
    
    return baseBoost + x402Boost;
  }

  /**
   * Calculate reputation registry boost from verified ratings
   */
  private calculateRegistryBoost(registry: ReputationRegistry): number {
    const verifiedRatings = registry.ratings.filter(r => r.verified);
    if (verifiedRatings.length === 0) return 0;

    const avgRating = verifiedRatings.reduce((sum, r) => sum + r.rating, 0) / verifiedRatings.length;
    
    // Boost = (avg_rating - 0.5) * 0.15
    // Max boost: 7.5% for perfect average rating
    return Math.max(0, (avgRating - 0.5) * 0.15);
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
   */
  private async determineHighlyTrustedUser(params: {
    userId: string;
    overall: number;
    onChainIdentity?: OnChainIdentity;
    verifiedPayments: VerifiedPayment[];
    reputationRegistry?: ReputationRegistry;
    contributions: Contribution[];
  }): Promise<HighlyTrustedUserStatus> {
    const { userId, overall, onChainIdentity, verifiedPayments, reputationRegistry, contributions } = params;
    
    const now = Date.now();
    const explanation: string[] = [];
    
    // 1. On-chain identity verification
    const identityVerificationScore = this.calculateIdentityVerificationScore(onChainIdentity);
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
    const verifiedPaymentsOnly = verifiedPayments.filter(p => p.verified);
    const paymentHistoryScore = this.calculatePaymentHistoryScore(verifiedPaymentsOnly);
    const totalPaymentValue = verifiedPaymentsOnly.reduce((sum, p) => sum + p.amount, 0);
    
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
    const registryScore = reputationRegistry 
      ? this.calculateReputationRegistryScore(reputationRegistry)
      : 0;
    const verifiedRatings = reputationRegistry?.ratings.filter(r => r.verified) || [];
    const avgRating = verifiedRatings.length > 0
      ? verifiedRatings.reduce((sum, r) => sum + r.rating, 0) / verifiedRatings.length
      : 0;
    
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
    const validationScore = reputationRegistry
      ? this.calculateValidationScore(reputationRegistry.validations)
      : 0;

    // 6. Temporal consistency (recent activity)
    const temporalConsistencyScore = this.calculateTemporalConsistencyScore(contributions, verifiedPaymentsOnly);
    const positiveRecentActivity = temporalConsistencyScore >= this.HIGHLY_TRUSTED_THRESHOLDS.minTemporalConsistency;
    
    if (positiveRecentActivity) {
      explanation.push(`✓ Positive recent activity detected (consistency: ${(temporalConsistencyScore * 100).toFixed(1)}%)`);
    } else {
      explanation.push(`✗ Insufficient recent activity (consistency: ${(temporalConsistencyScore * 100).toFixed(1)}%)`);
    }

    // 7. Sybil resistance (payment pattern analysis)
    const sybilResistant = await this.assessSybilResistance(verifiedPaymentsOnly);

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

    // Determine trust level based on thresholds
    const trustLevel = this.determineTrustLevel(overall, confidence, isHighlyTrusted);

    return {
      isHighlyTrusted,
      confidence,
      requirements,
      trustFactors,
      trustLevel,
      explanation,
    };
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
   */
  private calculateIdentityVerificationScore(identity?: OnChainIdentity): number {
    if (!identity) return 0;

    let score = 0;

    // NFT Identity verification
    if (identity.nftIdentity?.verified) {
      score += this.IDENTITY_WEIGHTS.nftIdentity;
    }

    // SBT Credential verification
    if (identity.sbtCredential?.verified) {
      score += this.IDENTITY_WEIGHTS.sbtCredential;
    }

    // Cross-chain verification bonus
    if (identity.verifiedChains && 
        identity.verifiedChains.length >= this.IDENTITY_WEIGHTS.minChainsForCrossChain) {
      const crossChainBonus = Math.min(
        this.IDENTITY_WEIGHTS.crossChainBase,
        identity.verifiedChains.length * this.IDENTITY_WEIGHTS.crossChainPerChain
      );
      score += crossChainBonus;
    }

    // Wallet address verification (optional bonus)
    if (identity.walletAddress) {
      score += this.IDENTITY_WEIGHTS.walletAddress;
    }

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1.0, score));
  }

  /**
   * Calculate payment history score (0-1)
   * Based on number of payments, total value, and recency
   */
  private calculatePaymentHistoryScore(payments: VerifiedPayment[]): number {
    if (payments.length === 0) return 0;

    const now = Date.now();
    const totalValue = payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Payment count score (0-0.4)
    const countScore = Math.min(0.4, payments.length / this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedPayments * 0.4);
    
    // Payment value score (0-0.4)
    const valueScore = Math.min(0.4, totalValue / this.HIGHLY_TRUSTED_THRESHOLDS.minPaymentValue * 0.4);
    
    // Recency score (0-0.2) - recent payments weighted higher
    const recentPayments = payments.filter(p => 
      (now - p.timestamp) < (this.HIGHLY_TRUSTED_THRESHOLDS.minRecentActivityDays * 24 * 60 * 60 * 1000)
    );
    const recencyScore = recentPayments.length > 0 ? 0.2 : 0;

    return countScore + valueScore + recencyScore;
  }

  /**
   * Calculate reputation registry score (0-1)
   * Based on verified ratings and feedback
   */
  private calculateReputationRegistryScore(registry: ReputationRegistry): number {
    const verifiedRatings = registry.ratings.filter(r => r.verified);
    if (verifiedRatings.length === 0) return 0;

    const avgRating = verifiedRatings.reduce((sum, r) => sum + r.rating, 0) / verifiedRatings.length;
    const countScore = Math.min(0.6, verifiedRatings.length / this.HIGHLY_TRUSTED_THRESHOLDS.minVerifiedRatings * 0.6);
    const ratingScore = avgRating * 0.4;

    return countScore + ratingScore;
  }

  /**
   * Calculate validation score (0-1)
   * Based on cryptographic proofs, TEE attestations, zk proofs
   */
  private calculateValidationScore(validations: ReputationRegistry['validations']): number {
    if (validations.length === 0) return 0;

    const verifiedValidations = validations.filter(v => v.verified);
    if (verifiedValidations.length === 0) return 0;

    // Higher weight for cryptographic and TEE validations
    let weightedSum = 0;
    verifiedValidations.forEach(v => {
      switch (v.validationType) {
        case 'cryptographic':
          weightedSum += 1.0;
          break;
        case 'third-party':
          weightedSum += 0.8;
          break;
        case 'community':
          weightedSum += 0.5;
          break;
      }
    });

    // Normalize: max score = 1.0 for 3+ cryptographic validations
    return Math.min(1.0, weightedSum / 3.0);
  }

  /**
   * Calculate temporal consistency score (0-1)
   * Measures recent activity and consistency over time
   */
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
   */
  /**
   * Assess Sybil resistance based on payment patterns
   * Detects coordinated attacks and suspicious patterns
   * 
   * @param payments - Verified payments to analyze
   * @returns true if payment patterns indicate low Sybil risk, false otherwise
   */
  private async assessSybilResistance(payments: VerifiedPayment[]): Promise<boolean> {
    if (payments.length < this.SYBIL_THRESHOLDS.minPaymentsForAssessment) {
      return true; // Not enough data to assess - assume safe
    }

    // Analyze payment patterns
    const recipients = new Set<string>();
    const amounts: number[] = [];
    const timestamps: number[] = [];

    payments.forEach(payment => {
      if (payment.recipient) recipients.add(payment.recipient);
      amounts.push(Math.max(0, payment.amount)); // Ensure non-negative
      timestamps.push(payment.timestamp);
    });

    // Sybil indicators
    // 1. Many small payments to same recipient (suspicious pattern)
    const uniqueRecipients = recipients.size;
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const sameRecipientRatio = uniqueRecipients / payments.length;

    // 2. Payment bursts (coordinated activity)
    const now = Date.now();
    const recentPayments = timestamps.filter(ts => 
      (now - ts) < this.SYBIL_THRESHOLDS.burstWindowMs
    ).length;

    // Sybil risk flags
    const hasSameRecipientPattern = 
      sameRecipientRatio < this.SYBIL_THRESHOLDS.suspiciousRecipientRatio &&
      payments.length > this.SYBIL_THRESHOLDS.suspiciousPaymentCount &&
      avgAmount < this.SYBIL_THRESHOLDS.suspiciousAvgAmount;
    
    const hasBurstPattern = recentPayments > this.SYBIL_THRESHOLDS.burstThreshold;

    // Low Sybil risk if patterns are normal
    return !hasSameRecipientPattern && !hasBurstPattern;
  }

  /**
   * Calculate user's percentile rank based on reputation score
   * 
   * @param userId - User identifier
   * @param score - Reputation score to calculate percentile for
   * @returns Promise resolving to percentile (0-100)
   */
  private async calculatePercentile(userId: string, score: number): Promise<number> {
    // In production, this would query a cloud database
    const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
    
    try {
      const response = await fetch(`${analyticsEndpoint}/percentile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, score }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof data.percentile === 'number' && data.percentile >= 0 && data.percentile <= 100) {
          return data.percentile;
        }
      }
    } catch (error) {
      console.warn(`Failed to calculate percentile from cloud for user ${userId}, using default:`, error);
    }

    // Default percentile calculation (mock)
    // Assumes max score of 1000
    return Math.min(100, Math.max(0, (score / 1000) * 100));
  }

  /**
   * Calculate user's rank based on reputation score
   * 
   * @param userId - User identifier
   * @returns Promise resolving to rank (lower is better, 0 = top rank)
   */
  private async calculateRank(userId: string): Promise<number> {
    // In production, this would query a cloud database
    const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (process.env.CLOUD_API_KEY) {
        headers['Authorization'] = `Bearer ${process.env.CLOUD_API_KEY}`;
      }

      const response = await fetch(`${analyticsEndpoint}/rank/${userId}`, {
        headers,
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const data = await response.json();
        if (typeof data.rank === 'number' && data.rank >= 0) {
          return data.rank;
        }
      }
    } catch (error) {
      console.warn(`Failed to calculate rank from cloud for user ${userId}, using default:`, error);
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

  // Add missing property to HIGHLY_TRUSTED_THRESHOLDS
  private readonly HIGHLY_TRUSTED_THRESHOLDS_COMPLETE = {
    ...this.HIGHLY_TRUSTED_THRESHOLDS,
    minRequirementsPassed: 5, // Minimum number of requirements that must pass
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
   */
  private async publishReputationToDKG(
    dkgClient: any,
    userId: string,
    reputationScore: ReputationScore,
    contributions: Contribution[],
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      const reputationAsset = {
        developerId: userId,
        reputationScore: reputationScore.overall,
        contributions: contributions.map(c => ({
          id: c.id,
          type: c.type as any,
          url: '',
          title: c.type,
          date: new Date(c.timestamp).toISOString(),
          impact: c.weight
        })),
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          breakdown: reputationScore.breakdown,
          percentile: reputationScore.percentile,
          rank: reputationScore.rank,
          safetyScore: reputationScore.safetyScore,
          combinedScore: reputationScore.combinedScore,
          sybilRisk: reputationScore.sybilRisk,
          botDetectionPenalty: reputationScore.botDetectionPenalty,
          highlyTrusted: reputationScore.highlyTrustedStatus?.isHighlyTrusted,
          trustLevel: reputationScore.highlyTrustedStatus?.trustLevel,
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
      
      console.log(`✅ Published reputation to DKG for ${userId}: ${result.UAL}`);
    } catch (error) {
      console.error(`❌ Failed to publish reputation to DKG for ${userId}:`, error);
      throw error;
    }
  }
}
