/**
 * Trust Analytics & Reporting System
 * Real-time trust dashboard and comprehensive scoring
 */

import { SybilResistantStaking, getStakingSystem } from './stakingSystem';
import { X402PaymentHandler, getX402PaymentHandler } from './x402PaymentHandler';
import { TrustEscrow, getTrustEscrow } from './trustEscrow';
import { getSybilDetectionService } from '../sybilDetection';

export interface TrustReport {
  economicTrust: {
    totalStaked: bigint;
    stakeTier: string;
    reputationMultiplier: number;
    slashableAmount: bigint;
    lockPeriodRemaining: number; // Days
  };
  reputationTrust: {
    overallScore: number;
    domainExpertise: Record<string, number>;
    temporalConsistency: number;
    engagementQuality: number;
  };
  paymentTrust: {
    totalTransactions: number;
    successRate: number;
    averageDealSize: number;
    disputeRate: number;
    totalReceived: number;
    totalSent: number;
  };
  sybilResistance: {
    riskScore: number;
    clusterAnalysis: {
      clusterId?: string;
      clusterSize: number;
      anomalyScore: number;
    };
    behavioralAnomalies: string[];
    identityUniqueness: number;
  };
  trustRecommendations: string[];
  lastUpdated: string;
}

export interface TrustScore {
  compositeScore: number; // 0-1
  componentScores: {
    economic: number;
    reputation: number;
    payment: number;
    sybil: number;
  };
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  lastUpdated: string;
}

export class TrustAnalytics {
  private staking: SybilResistantStaking;
  private payments: X402PaymentHandler;
  private escrow: TrustEscrow;
  private sybilDetection: ReturnType<typeof getSybilDetectionService>;

  constructor() {
    this.staking = getStakingSystem();
    this.payments = getX402PaymentHandler();
    this.escrow = getTrustEscrow();
    this.sybilDetection = getSybilDetectionService();
  }

  /**
   * Generate comprehensive trust report for a user
   */
  async generateTrustReport(userDID: string): Promise<TrustReport> {
    // Get staking information
    const stakingInfo = this.staking.getUserStake(userDID);
    
    // Get payment statistics
    const paymentStats = this.payments.getPaymentStatistics(userDID);
    
    // Get escrow deals
    const userDeals = this.escrow.getUserDeals(userDID);
    
    // Analyze sybil risk (simplified - in production would use actual detection)
    const sybilAnalysis = await this.analyzeSybilRisk(userDID);
    
    // Get reputation data (would query DKG in production)
    const reputationData = await this.getReputationData(userDID);

    // Calculate lock period remaining
    const lockPeriodRemaining = stakingInfo && stakingInfo.lockedUntil > Date.now()
      ? Math.ceil((stakingInfo.lockedUntil - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      economicTrust: {
        totalStaked: stakingInfo?.totalStaked || BigInt(0),
        stakeTier: stakingInfo?.tier || 'BASIC',
        reputationMultiplier: stakingInfo?.reputationMultiplier || 100,
        slashableAmount: stakingInfo?.slashableAmount || BigInt(0),
        lockPeriodRemaining
      },
      reputationTrust: {
        overallScore: reputationData.overallScore,
        domainExpertise: reputationData.domainScores,
        temporalConsistency: reputationData.temporalConsistency,
        engagementQuality: reputationData.engagementQuality
      },
      paymentTrust: {
        totalTransactions: paymentStats.totalTransactions,
        successRate: paymentStats.successRate,
        averageDealSize: paymentStats.averageAmount,
        disputeRate: paymentStats.disputeRate,
        totalReceived: paymentStats.totalReceived,
        totalSent: paymentStats.totalSent
      },
      sybilResistance: {
        riskScore: sybilAnalysis.riskScore,
        clusterAnalysis: {
          clusterId: sybilAnalysis.clusterId,
          clusterSize: sybilAnalysis.clusterSize,
          anomalyScore: sybilAnalysis.anomalyScore
        },
        behavioralAnomalies: sybilAnalysis.anomalies,
        identityUniqueness: sybilAnalysis.uniquenessScore
      },
      trustRecommendations: this.generateRecommendations(
        stakingInfo,
        reputationData,
        paymentStats,
        sybilAnalysis
      ),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate comprehensive trust score
   */
  async calculateTrustScore(userDID: string): Promise<TrustScore> {
    const report = await this.generateTrustReport(userDID);

    const weights = {
      economic: 0.35,    // Staking and financial commitment
      reputation: 0.30,  // Historical performance
      payment: 0.20,     // Transaction reliability
      sybil: 0.15        // Identity authenticity
    };

    // Calculate component scores (normalized to 0-1)
    const economicScore = this.calculateEconomicScore(report.economicTrust);
    const reputationScore = report.reputationTrust.overallScore;
    const paymentScore = this.calculatePaymentScore(report.paymentTrust);
    const sybilScore = 1 - report.sybilResistance.riskScore;

    // Calculate composite score
    const compositeScore = Math.min(1.0,
      economicScore * weights.economic +
      reputationScore * weights.reputation +
      paymentScore * weights.payment +
      sybilScore * weights.sybil
    );

    // Calculate confidence interval (simplified)
    const variance = this.calculateVariance([
      economicScore,
      reputationScore,
      paymentScore,
      sybilScore
    ]);
    const stdDev = Math.sqrt(variance);
    const margin = 1.96 * stdDev; // 95% confidence

    return {
      compositeScore,
      componentScores: {
        economic: economicScore,
        reputation: reputationScore,
        payment: paymentScore,
        sybil: sybilScore
      },
      confidenceInterval: {
        lower: Math.max(0, compositeScore - margin),
        upper: Math.min(1, compositeScore + margin)
      },
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Calculate economic trust score
   */
  private calculateEconomicScore(economicTrust: TrustReport['economicTrust']): number {
    // Normalize staked amount (0-1 scale, assuming max is 100k TRAC)
    const maxStake = BigInt(100000) * BigInt(10 ** 18);
    const stakeScore = Number(economicTrust.totalStaked) / Number(maxStake);
    
    // Tier score (0-1)
    const tierScores: Record<string, number> = {
      'BASIC': 0.25,
      'VERIFIED': 0.5,
      'PREMIUM': 0.75,
      'ELITE': 1.0
    };
    const tierScore = tierScores[economicTrust.stakeTier] || 0;

    // Reputation multiplier score (normalized)
    const multiplierScore = (economicTrust.reputationMultiplier - 100) / 100; // 0-1

    // Weighted combination
    return Math.min(1.0,
      stakeScore * 0.4 +
      tierScore * 0.4 +
      multiplierScore * 0.2
    );
  }

  /**
   * Calculate payment trust score
   */
  private calculatePaymentScore(paymentTrust: TrustReport['paymentTrust']): number {
    if (paymentTrust.totalTransactions === 0) {
      return 0.5; // Neutral score for new users
    }

    // Success rate weight
    const successScore = paymentTrust.successRate;

    // Dispute rate (inverse)
    const disputeScore = 1 - paymentTrust.disputeRate;

    // Volume score (normalized, assuming max is $100k)
    const maxVolume = 100000;
    const totalVolume = paymentTrust.totalReceived + paymentTrust.totalSent;
    const volumeScore = Math.min(1.0, totalVolume / maxVolume);

    // Weighted combination
    return Math.min(1.0,
      successScore * 0.5 +
      disputeScore * 0.3 +
      volumeScore * 0.2
    );
  }

  /**
   * Analyze sybil risk for a user
   */
  private async analyzeSybilRisk(userDID: string): Promise<{
    riskScore: number;
    clusterId?: string;
    clusterSize: number;
    anomalyScore: number;
    anomalies: string[];
    uniquenessScore: number;
  }> {
    // In production, this would use actual sybil detection
    // For now, return mock analysis
    const mockRisk = Math.random() * 0.3; // 0-30% risk

    return {
      riskScore: mockRisk,
      clusterId: mockRisk > 0.2 ? `cluster_${userDID.slice(-8)}` : undefined,
      clusterSize: mockRisk > 0.2 ? Math.floor(Math.random() * 10) + 2 : 1,
      anomalyScore: mockRisk * 0.5,
      anomalies: mockRisk > 0.15 ? ['rapid_contributions', 'low_external_connections'] : [],
      uniquenessScore: 1 - mockRisk
    };
  }

  /**
   * Get reputation data (would query DKG in production)
   */
  private async getReputationData(userDID: string): Promise<{
    overallScore: number;
    domainScores: Record<string, number>;
    temporalConsistency: number;
    engagementQuality: number;
  }> {
    // Mock data - in production would query DKG
    return {
      overallScore: 0.75 + Math.random() * 0.2, // 0.75-0.95
      domainScores: {
        'technology': 0.8,
        'marketing': 0.7,
        'finance': 0.6
      },
      temporalConsistency: 0.85,
      engagementQuality: 0.82
    };
  }

  /**
   * Generate recommendations based on trust report
   */
  private generateRecommendations(
    stakingInfo: ReturnType<typeof this.staking.getUserStake>,
    reputationData: Awaited<ReturnType<typeof this.getReputationData>>,
    paymentStats: ReturnType<typeof this.payments.getPaymentStatistics>,
    sybilAnalysis: Awaited<ReturnType<typeof this.analyzeSybilRisk>>
  ): string[] {
    const recommendations: string[] = [];

    // Staking recommendations
    if (!stakingInfo || stakingInfo.totalStaked === BigInt(0)) {
      recommendations.push('Consider staking tokens to increase your trust score and unlock premium features');
    } else if (stakingInfo.tier === 'BASIC') {
      recommendations.push('Upgrade to VERIFIED tier by staking 5,000 TRAC to unlock enhanced reputation multipliers');
    }

    // Payment recommendations
    if (paymentStats.totalTransactions === 0) {
      recommendations.push('Complete your first transaction to establish payment history');
    } else if (paymentStats.disputeRate > 0.1) {
      recommendations.push('High dispute rate detected. Review your campaign participation to reduce disputes');
    }

    // Sybil recommendations
    if (sybilAnalysis.riskScore > 0.2) {
      recommendations.push('Sybil risk detected. Increase external connections and diversify activity patterns');
    }

    // Reputation recommendations
    if (reputationData.overallScore < 0.7) {
      recommendations.push('Improve reputation by completing more high-quality campaigns');
    }

    return recommendations;
  }

  /**
   * Calculate variance of scores
   */
  private calculateVariance(scores: number[]): number {
    if (scores.length === 0) return 0;
    
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const squaredDiffs = scores.map(s => Math.pow(s - mean, 2));
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / scores.length;
  }

  /**
   * Get trust leaderboard
   */
  async getTrustLeaderboard(limit: number = 100): Promise<Array<{
    userDID: string;
    trustScore: number;
    tier: string;
    totalStaked: bigint;
  }>> {
    // In production, would query database
    // For now, return empty array
    return [];
  }

  /**
   * Get trust trends over time
   */
  async getTrustTrends(
    userDID: string,
    days: number = 30
  ): Promise<Array<{
    date: string;
    trustScore: number;
    componentScores: TrustScore['componentScores'];
  }>> {
    // In production, would query historical data
    // For now, return current score
    const currentScore = await this.calculateTrustScore(userDID);
    return [{
      date: new Date().toISOString(),
      trustScore: currentScore.compositeScore,
      componentScores: currentScore.componentScores
    }];
  }
}

// Singleton instance
let analyticsInstance: TrustAnalytics | null = null;

export function getTrustAnalytics(): TrustAnalytics {
  if (!analyticsInstance) {
    analyticsInstance = new TrustAnalytics();
  }
  return analyticsInstance;
}

