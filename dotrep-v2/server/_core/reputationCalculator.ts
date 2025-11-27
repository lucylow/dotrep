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
  includeSafetyScore?: boolean; // Include Guardian safety score
  onChainIdentity?: OnChainIdentity; // On-chain identity verification
  verifiedPayments?: VerifiedPayment[]; // x402 and other verified payments
  reputationRegistry?: ReputationRegistry; // Transaction-verified feedback
  includeHighlyTrustedDetermination?: boolean; // Calculate highly trusted status
  botDetectionResults?: BotDetectionResults; // Bot cluster detection results for reputation adjustment
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
    minRequirementsPassed: 5, // Minimum requirements that must pass (out of 6)
    minConfidenceForHighlyTrusted: 0.85, // Minimum confidence for highly trusted status
  };

  // Scoring weights and multipliers
  private readonly SCORING_WEIGHTS = {
    verificationBoost: 1.2, // Boost for verified contributions
    maxVerifierBoost: 0.25, // Maximum boost from verifiers (25%)
    verifierBoostPerVerifier: 0.05, // Boost per verifier (up to 5 verifiers)
    maxVerifiers: 5, // Maximum number of verifiers to count
    defaultPayerReputation: 0.5, // Default reputation for unknown payers
    paymentBoostMultiplier: 0.2, // Multiplier for payment-weighted boost
    registryBoostMultiplier: 0.15, // Multiplier for registry boost
    safetyScoreWeight: 0.3, // Weight of safety score in combined calculation
    baseReputationWeight: 0.7, // Base reputation weight in combined calculation
  };

  // Trust level thresholds
  private readonly TRUST_LEVEL_THRESHOLDS = {
    highlyTrusted: { score: 800, confidence: 0.85 },
    trusted: { score: 600, confidence: 0.65 },
    moderate: { score: 400, confidence: 0.50 },
    caution: { score: 200, confidence: 0.30 },
  };

  // Confidence calculation weights
  private readonly CONFIDENCE_WEIGHTS = {
    identityVerification: 0.25,
    paymentHistory: 0.25,
    reputationRegistry: 0.20,
    validation: 0.15,
    temporalConsistency: 0.15,
  };

  // Identity verification weights
  private readonly IDENTITY_WEIGHTS = {
    nftIdentity: 0.4,
    sbtCredential: 0.4,
    crossChainBase: 0.2,
    crossChainPerChain: 0.1,
    walletAddress: 0.1,
    minChainsForCrossChain: 2,
  };

  // Payment history scoring weights
  private readonly PAYMENT_HISTORY_WEIGHTS = {
    countScore: 0.4,
    valueScore: 0.4,
    recencyScore: 0.2,
  };

  // Registry scoring weights
  private readonly REGISTRY_WEIGHTS = {
    countScore: 0.6,
    ratingScore: 0.4,
  };

  // Validation type weights
  private readonly VALIDATION_WEIGHTS = {
    cryptographic: 1.0,
    thirdParty: 0.8,
    community: 0.5,
    normalizationFactor: 3.0, // Number of validations for max score
  };

  // Temporal consistency scoring weights
  private readonly TEMPORAL_WEIGHTS = {
    contributionActivity: 0.3,
    paymentActivity: 0.3,
    consistencyScore: 0.4,
    contributionActivityDivisor: 10, // For normalization
    paymentActivityDivisor: 5, // For normalization
    consistencyWeeksDivisor: 4, // For normalization
  };

  // Bot detection penalty multipliers
  private readonly BOT_PENALTY_MULTIPLIERS = {
    confirmedCluster: 0.7,
    suspiciousCluster: 0.3,
    individualBot: 0.5,
    maxPenalty: 0.7, // Maximum penalty (70%)
  };

  // Sybil detection thresholds
  private readonly SYBIL_THRESHOLDS = {
    minPaymentsForAssessment: 3,
    suspiciousRecipientRatio: 0.3,
    suspiciousPaymentCount: 10,
    suspiciousAvgAmount: 1.0,
    burstWindowMs: 3600000, // 1 hour
    burstThreshold: 20,
  };

  // Time constants
  private readonly TIME_CONSTANTS = {
    msPerDay: 1000 * 60 * 60 * 24,
    msPerWeek: 7 * 24 * 60 * 60 * 1000,
    msPerHour: 60 * 60 * 1000,
  };

  /**
   * Calculate reputation score with time decay and x402 protocol integration
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
      includeHighlyTrustedDetermination = false
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

    // Get Guardian safety score if requested
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

    return {
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
   */
  private calculatePaymentWeightedBoost(payments: VerifiedPayment[]): number {
    if (payments.length === 0) return 0;

    const verifiedPayments = payments.filter(p => p.verified);
    if (verifiedPayments.length === 0) return 0;

    let weightedSum = 0;
    let totalValue = 0;

    verifiedPayments.forEach(payment => {
      const value = payment.amount;
      const payerRep = payment.payerReputation || 0.5; // Default 0.5 if unknown
      
      totalValue += value;
      // Weight = amount * payer_reputation (TraceRank principle)
      weightedSum += value * payerRep;
    });

    // Normalize: boost = (weighted_average - 0.5) * 0.2
    // Max boost: 10% for perfect weighted average
    const weightedAverage = totalValue > 0 ? weightedSum / totalValue : 0;
    return Math.max(0, (weightedAverage - 0.5) * 0.2);
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
    const totalRequirements = Object.keys(requirements).length;
    
    // Highly trusted if 5 out of 6 requirements met (strict threshold)
    const isHighlyTrusted = passedRequirements >= 5;

    // Calculate overall confidence
    const trustFactors = {
      identityVerificationScore,
      paymentHistoryScore,
      reputationRegistryScore: registryScore,
      validationScore,
      temporalConsistencyScore,
    };

    const confidence = (
      identityVerificationScore * 0.25 +
      paymentHistoryScore * 0.25 +
      registryScore * 0.20 +
      validationScore * 0.15 +
      temporalConsistencyScore * 0.15
    );

    // Determine trust level
    let trustLevel: HighlyTrustedUserStatus['trustLevel'];
    if (isHighlyTrusted && confidence >= 0.85) {
      trustLevel = 'highly_trusted';
    } else if (overall >= 600 && confidence >= 0.65) {
      trustLevel = 'trusted';
    } else if (overall >= 400 && confidence >= 0.50) {
      trustLevel = 'moderate';
    } else if (overall >= 200 || confidence >= 0.30) {
      trustLevel = 'caution';
    } else {
      trustLevel = 'untrusted';
    }

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
   * Calculate identity verification score (0-1)
   * Based on NFT identity, SBT credentials, and cross-chain verification
   */
  private calculateIdentityVerificationScore(identity?: OnChainIdentity): number {
    if (!identity) return 0;

    let score = 0;
    let factors = 0;

    // NFT Identity verification (40% weight)
    if (identity.nftIdentity?.verified) {
      score += 0.4;
      factors++;
    }

    // SBT Credential verification (40% weight)
    if (identity.sbtCredential?.verified) {
      score += 0.4;
      factors++;
    }

    // Cross-chain verification bonus (20% weight)
    if (identity.verifiedChains && identity.verifiedChains.length >= 2) {
      const crossChainBonus = Math.min(0.2, identity.verifiedChains.length * 0.1);
      score += crossChainBonus;
      factors++;
    }

    // Wallet address verification (optional, 10% bonus)
    if (identity.walletAddress) {
      score += 0.1;
      factors++;
    }

    // Normalize if multiple factors present
    return factors > 0 ? Math.min(1.0, score) : 0;
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
  private calculateTemporalConsistencyScore(
    contributions: Contribution[],
    payments: VerifiedPayment[]
  ): number {
    const now = Date.now();
    const recentWindow = this.HIGHLY_TRUSTED_THRESHOLDS.minRecentActivityDays * 24 * 60 * 60 * 1000;

    // Recent contributions
    const recentContributions = contributions.filter(c => 
      (now - c.timestamp) < recentWindow
    );

    // Recent payments
    const recentPayments = payments.filter(p => 
      (now - p.timestamp) < recentWindow
    );

    // Activity score (0-0.6)
    const contributionActivity = Math.min(0.3, recentContributions.length / 10 * 0.3);
    const paymentActivity = Math.min(0.3, recentPayments.length / 5 * 0.3);

    // Consistency score (0-0.4) - based on regular activity pattern
    let consistencyScore = 0.4; // Default if no recent activity
    if (recentContributions.length > 0 || recentPayments.length > 0) {
      // Simple heuristic: activity in multiple weeks = consistent
      const weeks = new Set();
      [...recentContributions, ...recentPayments].forEach(item => {
        const week = Math.floor(item.timestamp / (7 * 24 * 60 * 60 * 1000));
        weeks.add(week);
      });
      consistencyScore = Math.min(0.4, weeks.size / 4 * 0.4);
    }

    return contributionActivity + paymentActivity + consistencyScore;
  }

  /**
   * Assess Sybil resistance based on payment patterns
   * Detects coordinated attacks and suspicious patterns
   */
  private async assessSybilResistance(payments: VerifiedPayment[]): Promise<boolean> {
    if (payments.length < 3) return true; // Not enough data to assess

    // Analyze payment patterns
    const recipients = new Set<string>();
    const amounts: number[] = [];
    const timestamps: number[] = [];

    payments.forEach(payment => {
      if (payment.recipient) recipients.add(payment.recipient);
      amounts.push(payment.amount);
      timestamps.push(payment.timestamp);
    });

    // Sybil indicators
    // 1. Many small payments to same recipient
    const uniqueRecipients = recipients.size;
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const sameRecipientRatio = uniqueRecipients / payments.length;

    // 2. Payment bursts (coordinated activity)
    const now = Date.now();
    const recentPayments = timestamps.filter(ts => (now - ts) < 3600000).length; // Last hour

    // Sybil risk flags
    const hasSameRecipientPattern = sameRecipientRatio < 0.3 && payments.length > 10 && avgAmount < 1.0;
    const hasBurstPattern = recentPayments > 20;

    // Low Sybil risk if patterns are normal
    return !hasSameRecipientPattern && !hasBurstPattern;
  }

  private async calculatePercentile(userId: string, score: number): Promise<number> {
    // In production, this would query a cloud database
    // For now, return a mock percentile
    try {
      const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
      const response = await fetch(`${analyticsEndpoint}/percentile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, score })
      });

      if (response.ok) {
        const data = await response.json();
        return data.percentile;
      }
    } catch (error) {
      console.warn('Failed to calculate percentile from cloud, using default:', error);
    }

    // Default percentile calculation (mock)
    return Math.min(100, Math.max(0, (score / 1000) * 100));
  }

  private async calculateRank(userId: string): Promise<number> {
    // In production, this would query a cloud database
    try {
      const analyticsEndpoint = process.env.CLOUD_ANALYTICS_ENDPOINT || 'https://analytics.dotrep.cloud';
      const response = await fetch(`${analyticsEndpoint}/rank/${userId}`, {
        headers: {
          ...(process.env.CLOUD_API_KEY && { 'Authorization': `Bearer ${process.env.CLOUD_API_KEY}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.rank;
      }
    } catch (error) {
      console.warn('Failed to calculate rank from cloud, using default:', error);
    }

    // Default rank (mock)
    return 0;
  }
}


