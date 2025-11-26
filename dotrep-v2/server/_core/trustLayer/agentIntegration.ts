/**
 * Trust Layer Integration for AI Agents
 * Enhances AI agents with trust layer capabilities
 */

import { getStakingSystem, StakeTier } from './stakingSystem';
import { getX402PaymentHandler } from './x402PaymentHandler';
import { getTrustEscrow } from './trustEscrow';
import { getTrustAnalytics } from './trustAnalytics';
import { getTrustOrchestrator } from './trustOrchestrator';
import type { InfluencerCandidate, CampaignRequirements } from '../socialCreditAgents';

export interface TrustEnhancedInfluencer extends InfluencerCandidate {
  trustScore: number;
  stakeTier: StakeTier;
  totalStaked: bigint;
  paymentTrust: {
    successRate: number;
    disputeRate: number;
    totalTransactions: number;
  };
  trustRecommendations: string[];
}

export interface TrustEnhancedCampaignMatch {
  influencer: TrustEnhancedInfluencer;
  matchScore: number;
  trustScore: number;
  estimatedROI: number;
  recommendedPayment: number;
  stakingVerified: boolean;
  escrowReady: boolean;
  reasoning: string;
}

/**
 * Trust Layer Agent Integration
 * Provides trust layer functionality to AI agents
 */
export class TrustLayerAgentIntegration {
  private staking = getStakingSystem();
  private payments = getX402PaymentHandler();
  private escrow = getTrustEscrow();
  private analytics = getTrustAnalytics();
  private orchestrator = getTrustOrchestrator();

  /**
   * Enhance influencer candidate with trust layer data
   */
  async enhanceInfluencerWithTrust(
    candidate: InfluencerCandidate
  ): Promise<TrustEnhancedInfluencer> {
    const stake = this.staking.getUserStake(candidate.did);
    const paymentStats = this.payments.getPaymentStatistics(candidate.did);
    const trustScore = await this.analytics.calculateTrustScore(candidate.did);
    const trustReport = await this.analytics.generateTrustReport(candidate.did);

    return {
      ...candidate,
      trustScore: trustScore.compositeScore,
      stakeTier: stake?.tier || StakeTier.BASIC,
      totalStaked: stake?.totalStaked || BigInt(0),
      paymentTrust: {
        successRate: paymentStats.successRate,
        disputeRate: paymentStats.disputeRate,
        totalTransactions: paymentStats.totalTransactions
      },
      trustRecommendations: trustReport.trustRecommendations
    };
  }

  /**
   * Filter and rank influencers by trust requirements
   */
  async filterByTrustRequirements(
    candidates: InfluencerCandidate[],
    requirements: CampaignRequirements & {
      minTrustScore?: number;
      minStakeTier?: StakeTier;
      maxDisputeRate?: number;
    }
  ): Promise<TrustEnhancedCampaignMatch[]> {
    const enhanced = await Promise.all(
      candidates.map(c => this.enhanceInfluencerWithTrust(c))
    );

    // Filter by trust requirements
    const filtered = enhanced.filter(inf => {
      if (requirements.minTrustScore && inf.trustScore < requirements.minTrustScore) {
        return false;
      }
      if (requirements.minStakeTier) {
        const tierOrder = [StakeTier.BASIC, StakeTier.VERIFIED, StakeTier.PREMIUM, StakeTier.ELITE];
        if (tierOrder.indexOf(inf.stakeTier) < tierOrder.indexOf(requirements.minStakeTier)) {
          return false;
        }
      }
      if (requirements.maxDisputeRate && inf.paymentTrust.disputeRate > requirements.maxDisputeRate) {
        return false;
      }
      return true;
    });

    // Calculate match scores with trust weighting
    const matches = filtered.map(inf => {
      const baseMatchScore = this.calculateBaseMatchScore(inf, requirements);
      const trustWeight = 0.3; // 30% weight on trust
      const combinedScore = baseMatchScore * (1 - trustWeight) + inf.trustScore * trustWeight;

      return {
        influencer: inf,
        matchScore: combinedScore,
        trustScore: inf.trustScore,
        estimatedROI: this.estimateROI(inf, requirements),
        recommendedPayment: this.calculateRecommendedPayment(inf, requirements),
        stakingVerified: this.staking.verifyStakingRequirements(inf.did, inf.stakeTier).verified,
        escrowReady: inf.paymentTrust.totalTransactions > 0 && inf.paymentTrust.successRate > 0.8,
        reasoning: this.generateTrustReasoning(inf, requirements)
      };
    });

    // Sort by combined match score
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Verify brand can execute campaign (staking requirements)
   */
  async verifyBrandForCampaign(
    brandDID: string,
    campaignBudget: number
  ): Promise<{
    verified: boolean;
    currentTier: StakeTier;
    requiredTier: StakeTier;
    missingStake?: bigint;
    recommendations: string[];
  }> {
    const stake = this.staking.getUserStake(brandDID);
    
    // Determine required tier based on budget
    let requiredTier: StakeTier = StakeTier.BASIC;
    if (campaignBudget >= 100000) {
      requiredTier = StakeTier.ELITE;
    } else if (campaignBudget >= 50000) {
      requiredTier = StakeTier.PREMIUM;
    } else if (campaignBudget >= 10000) {
      requiredTier = StakeTier.VERIFIED;
    }

    const verification = this.staking.verifyStakingRequirements(brandDID, requiredTier);
    const recommendations: string[] = [];

    if (!verification.verified) {
      const missing = verification.requiredStake - verification.currentStake;
      recommendations.push(
        `Stake ${missing.toString()} TRAC to reach ${requiredTier} tier for this campaign budget`
      );
    }

    return {
      verified: verification.verified,
      currentTier: verification.currentTier,
      requiredTier,
      missingStake: verification.verified ? undefined : verification.requiredStake - verification.currentStake,
      recommendations
    };
  }

  /**
   * Setup escrow for influencer deal
   */
  async setupInfluencerEscrow(
    brandDID: string,
    influencerDID: string,
    paymentAmount: number,
    performanceThreshold: number = 0.7
  ): Promise<{
    dealId: string;
    escrowCreated: boolean;
    paymentFlowId?: string;
  }> {
    // Create escrow deal
    const deal = await this.escrow.createEscrow(
      brandDID,
      influencerDID,
      BigInt(Math.floor(paymentAmount * 10 ** 6)), // Convert to USDC (6 decimals)
      performanceThreshold,
      this.generateVerificationHash(influencerDID, brandDID),
      {
        createdAt: Date.now(),
        source: 'agent_integration'
      }
    );

    // Activate deal
    await this.escrow.activateDeal(deal.dealId);

    // Initiate payment flow
    const paymentFlow = await this.payments.initiateDiscoveryPayment(
      brandDID,
      paymentAmount
    );

    return {
      dealId: deal.dealId,
      escrowCreated: true,
      paymentFlowId: paymentFlow.id
    };
  }

  /**
   * Get trust-enhanced campaign recommendations
   */
  async getTrustEnhancedRecommendations(
    brandDID: string,
    requirements: CampaignRequirements
  ): Promise<{
    influencers: TrustEnhancedCampaignMatch[];
    brandVerification: Awaited<ReturnType<typeof this.verifyBrandForCampaign>>;
    trustInsights: {
      averageTrustScore: number;
      highTrustCount: number;
      recommendedBudget: number;
    };
  }> {
    // Verify brand first
    const brandVerification = await this.verifyBrandForCampaign(
      brandDID,
      requirements.budget || 10000
    );

    if (!brandVerification.verified) {
      return {
        influencers: [],
        brandVerification,
        trustInsights: {
          averageTrustScore: 0,
          highTrustCount: 0,
          recommendedBudget: 0
        }
      };
    }

    // Get trust-enhanced matches (would query DKG in production)
    const mockCandidates: InfluencerCandidate[] = [
      {
        did: 'did:example:inf1',
        reputation: 0.85,
        socialRank: 0.8,
        economicStake: 5000,
        sybilRisk: 0.1,
        platforms: ['twitter', 'reddit'],
        specialties: ['technology']
      }
    ];

    const matches = await this.filterByTrustRequirements(mockCandidates, {
      ...requirements,
      minTrustScore: 0.7,
      minStakeTier: StakeTier.BASIC
    });

    const averageTrustScore = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.trustScore, 0) / matches.length
      : 0;

    const highTrustCount = matches.filter(m => m.trustScore >= 0.8).length;

    return {
      influencers: matches,
      brandVerification,
      trustInsights: {
        averageTrustScore,
        highTrustCount,
        recommendedBudget: requirements.budget || 10000
      }
    };
  }

  /**
   * Calculate base match score (without trust)
   */
  private calculateBaseMatchScore(
    influencer: TrustEnhancedInfluencer,
    requirements: CampaignRequirements
  ): number {
    let score = 0;

    // Reputation match
    if (requirements.minReputation) {
      score += (influencer.reputation / requirements.minReputation) * 0.3;
    } else {
      score += influencer.reputation * 0.3;
    }

    // Platform match
    if (requirements.platforms && influencer.platforms) {
      const platformMatch = requirements.platforms.filter(p => 
        influencer.platforms.includes(p)
      ).length / requirements.platforms.length;
      score += platformMatch * 0.2;
    }

    // Specialty match
    if (requirements.specialties && influencer.specialties) {
      const specialtyMatch = requirements.specialties.filter(s =>
        influencer.specialties.includes(s)
      ).length / requirements.specialties.length;
      score += specialtyMatch * 0.2;
    }

    // Sybil risk (inverse)
    if (requirements.maxSybilRisk) {
      const sybilScore = 1 - (influencer.sybilRisk / requirements.maxSybilRisk);
      score += sybilScore * 0.3;
    } else {
      score += (1 - influencer.sybilRisk) * 0.3;
    }

    return Math.min(1.0, score);
  }

  /**
   * Estimate ROI for influencer
   */
  private estimateROI(
    influencer: TrustEnhancedInfluencer,
    requirements: CampaignRequirements
  ): number {
    const baseROI = influencer.reputation * 100; // Base ROI percentage
    const trustMultiplier = influencer.trustScore;
    const engagementBonus = influencer.engagementRate ? influencer.engagementRate * 50 : 0;

    return baseROI * trustMultiplier + engagementBonus;
  }

  /**
   * Calculate recommended payment
   */
  private calculateRecommendedPayment(
    influencer: TrustEnhancedInfluencer,
    requirements: CampaignRequirements
  ): number {
    const basePayment = requirements.budget ? requirements.budget * 0.1 : 1000;
    const trustMultiplier = influencer.trustScore;
    const tierMultiplier = this.getTierMultiplier(influencer.stakeTier);

    return basePayment * trustMultiplier * tierMultiplier;
  }

  /**
   * Get tier multiplier
   */
  private getTierMultiplier(tier: StakeTier): number {
    const multipliers = {
      [StakeTier.BASIC]: 1.0,
      [StakeTier.VERIFIED]: 1.1,
      [StakeTier.PREMIUM]: 1.25,
      [StakeTier.ELITE]: 1.5
    };
    return multipliers[tier] || 1.0;
  }

  /**
   * Generate trust-based reasoning
   */
  private generateTrustReasoning(
    influencer: TrustEnhancedInfluencer,
    requirements: CampaignRequirements
  ): string {
    const reasons: string[] = [];

    if (influencer.trustScore >= 0.8) {
      reasons.push('High trust score indicates reliable performance');
    }

    if (influencer.stakeTier !== StakeTier.BASIC) {
      reasons.push(`${influencer.stakeTier} tier staking demonstrates commitment`);
    }

    if (influencer.paymentTrust.successRate > 0.9) {
      reasons.push('Excellent payment history with high success rate');
    }

    if (influencer.sybilRisk < 0.1) {
      reasons.push('Low sybil risk ensures authentic engagement');
    }

    return reasons.join('. ') || 'Meets basic trust requirements';
  }

  /**
   * Generate verification hash
   */
  private generateVerificationHash(influencerDID: string, brandDID: string): string {
    const data = `${influencerDID}_${brandDID}_${Date.now()}`;
    return Buffer.from(data).toString('base64').slice(0, 32);
  }
}

// Singleton instance
let integrationInstance: TrustLayerAgentIntegration | null = null;

export function getTrustLayerAgentIntegration(): TrustLayerAgentIntegration {
  if (!integrationInstance) {
    integrationInstance = new TrustLayerAgentIntegration();
  }
  return integrationInstance;
}

