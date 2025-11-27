/**
 * Trust Orchestrator
 * Integrates staking, payments, and escrow for end-to-end trust management
 */

import { SybilResistantStaking, StakeTier, getStakingSystem } from './stakingSystem';
import { X402PaymentHandler, getX402PaymentHandler } from './x402PaymentHandler';
import { TrustEscrow, getTrustEscrow, DealStatus } from './trustEscrow';
import { getSybilDetectionService } from '../sybilDetection';
import { ReputationCalculator } from '../reputationCalculator';

export interface CampaignUAL {
  id: string;
  details: {
    budget: number;
    title: string;
    description: string;
  };
  participationRequirements: {
    minReputationScore: number;
    maxSybilRisk: number;
    minStakeTier?: StakeTier;
  };
  creator: string;
}

export interface MatchedInfluencer {
  influencerDID: string;
  reputation: number;
  sybilRisk: number;
  stakeTier: StakeTier;
  trustScore: number;
  matchScore: number;
}

export interface CampaignResult {
  status: string;
  totalDeals: number;
  successfulDeals: number;
  totalPayments: number;
  averageROI: number;
  trustMetrics: {
    averageTrustScore: number;
    sybilDetected: number;
    slashingEvents: number;
  };
}

export class TrustOrchestrator {
  private staking: SybilResistantStaking;
  private payments: X402PaymentHandler;
  private escrow: TrustEscrow;
  private sybilDetection: ReturnType<typeof getSybilDetectionService>;
  private reputationCalculator: ReputationCalculator;

  constructor() {
    this.staking = getStakingSystem();
    this.payments = getX402PaymentHandler();
    this.escrow = getTrustEscrow();
    this.sybilDetection = getSybilDetectionService();
    this.reputationCalculator = new ReputationCalculator();
  }

  /**
   * Execute a trusted campaign end-to-end
   */
  async executeTrustedCampaign(
    campaignUAL: CampaignUAL,
    brandDID: string
  ): Promise<CampaignResult> {
    // Phase 1: Identity & Staking Verification
    const stakingStatus = await this.verifyStakingRequirements(brandDID, campaignUAL);
    if (!stakingStatus.verified) {
      throw new Error(
        `Insufficient stake: ${stakingStatus.requiredStake} TRAC needed for ${stakingStatus.requiredTier} tier`
      );
    }

    // Phase 2: Discovery Payment
    const discoveryPayment = await this.payments.initiateDiscoveryPayment(
      brandDID,
      campaignUAL.details.budget
    );

    // Phase 3: Influencer Matching with Trust Weighting
    const matchedInfluencers = await this.findTrustedInfluencers(
      campaignUAL,
      stakingStatus.currentTier
    );

    // Phase 4: Automated Deal Making
    const activatedDeals = await this.activateTrustedDeals(
      matchedInfluencers,
      campaignUAL
    );

    // Phase 5: Performance Monitoring & Payment
    const campaignResults = await this.monitorAndSettleCampaign(
      activatedDeals,
      campaignUAL
    );

    return campaignResults;
  }

  /**
   * Verify staking requirements for a campaign
   */
  async verifyStakingRequirements(
    userDID: string,
    campaignUAL: CampaignUAL
  ): Promise<{
    verified: boolean;
    currentTier: StakeTier;
    requiredTier: StakeTier;
    currentStake: bigint;
    requiredStake: bigint;
    reputationMultiplier: number;
  }> {
    const requiredTier = campaignUAL.participationRequirements.minStakeTier || StakeTier.BASIC;
    return this.staking.verifyStakingRequirements(userDID, requiredTier);
  }

  /**
   * Find trusted influencers matching campaign requirements
   */
  async findTrustedInfluencers(
    campaignUAL: CampaignUAL,
    brandTier: StakeTier
  ): Promise<MatchedInfluencer[]> {
    const requirements = campaignUAL.participationRequirements;
    
    // In production, this would query DKG for influencers
    // For now, we'll simulate with mock data
    const mockInfluencers: Array<{
      influencerDID: string;
      reputation: number;
      sybilRisk: number;
      stakeTier: StakeTier;
    }> = [
      {
        influencerDID: 'did:example:influencer1',
        reputation: 0.85,
        sybilRisk: 0.1,
        stakeTier: StakeTier.VERIFIED
      },
      {
        influencerDID: 'did:example:influencer2',
        reputation: 0.92,
        sybilRisk: 0.05,
        stakeTier: StakeTier.PREMIUM
      },
      {
        influencerDID: 'did:example:influencer3',
        reputation: 0.78,
        sybilRisk: 0.15,
        stakeTier: StakeTier.BASIC
      }
    ];

    // Filter by requirements
    const filtered = mockInfluencers.filter(inf => {
      return (
        inf.reputation >= requirements.minReputationScore &&
        inf.sybilRisk <= requirements.maxSybilRisk &&
        this.isTierHigherOrEqual(inf.stakeTier, requirements.minStakeTier || StakeTier.BASIC)
      );
    });

    // Apply trust weighting
    const weighted = filtered.map(inf => {
      const trustScore = this.calculateTrustScore(inf);
      const matchScore = this.calculateMatchScore(inf, campaignUAL, trustScore);
      
      return {
        ...inf,
        trustScore,
        matchScore
      };
    });

    // Sort by match score descending
    weighted.sort((a, b) => b.matchScore - a.matchScore);

    return weighted;
  }

  /**
   * Activate trusted deals with escrow
   */
  async activateTrustedDeals(
    influencers: MatchedInfluencer[],
    campaignUAL: CampaignUAL
  ): Promise<string[]> {
    const dealIds: string[] = [];
    const baseCompensation = campaignUAL.details.budget / influencers.length;

    for (const influencer of influencers) {
      // Create escrow deal
      const deal = await this.escrow.createEscrow(
        campaignUAL.creator,
        influencer.influencerDID,
        BigInt(Math.floor(baseCompensation * 10 ** 6)), // Convert to USDC (6 decimals)
        0.7, // 70% performance threshold
        this.generateVerificationHash(influencer.influencerDID, campaignUAL.id),
        {
          campaignUAL: campaignUAL.id,
          influencerTrustScore: influencer.trustScore,
          matchScore: influencer.matchScore
        }
      );

      // Activate deal
      await this.escrow.activateDeal(deal.dealId);
      dealIds.push(deal.dealId);
    }

    return dealIds;
  }

  /**
   * Monitor and settle campaign
   */
  async monitorAndSettleCampaign(
    dealIds: string[],
    campaignUAL: CampaignUAL
  ): Promise<CampaignResult> {
    const results = {
      successful: [] as string[],
      failed: [] as string[],
      totalPayments: 0,
      trustMetrics: {
        averageTrustScore: 0,
        sybilDetected: 0,
        slashingEvents: 0
      }
    };

    let totalTrustScore = 0;
    let successfulCount = 0;

    for (const dealId of dealIds) {
      const deal = this.escrow.getDeal(dealId);
      if (!deal) continue;

      // Simulate performance (in production, would fetch real metrics)
      const performanceProof = {
        engagementRate: 0.06 + Math.random() * 0.04, // 6-10%
        conversions: Math.floor(50 + Math.random() * 150), // 50-200
        qualityRating: 4.0 + Math.random() * 1.0, // 4.0-5.0
        verifiedAt: Date.now(),
        verifier: 'platform_verifier'
      };

      try {
        // Release payment based on performance
        const releaseResult = await this.escrow.releasePayment(
          dealId,
          performanceProof,
          deal.totalAmount,
          true // isVerifier
        );

        if (releaseResult.success) {
          results.successful.push(dealId);
          results.totalPayments += Number(releaseResult.releasedAmount) / 10 ** 6; // Convert from USDC
          successfulCount++;
        }

        // Calculate trust score for this influencer
        const influencerStake = this.staking.getUserStake(deal.influencer);
        if (influencerStake) {
          const trustScore = this.calculateTrustScore({
            influencerDID: deal.influencer,
            reputation: 0.8, // Would fetch from DKG
            sybilRisk: 0.1,
            stakeTier: influencerStake.tier
          });
          totalTrustScore += trustScore;
        }
      } catch (error) {
        results.failed.push(dealId);
        console.error(`Failed to settle deal ${dealId}:`, error);
      }
    }

    // Check for slashing events
    const slashingStats = this.escrow.getSlashingStatistics();
    results.trustMetrics.slashingEvents = slashingStats.slashedDeals;

    // Calculate average ROI (simplified)
    const totalBudget = campaignUAL.details.budget;
    const averageROI = results.totalPayments > 0
      ? ((results.totalPayments / totalBudget) - 1) * 100
      : -100;

    return {
      status: 'campaign_completed',
      totalDeals: dealIds.length,
      successfulDeals: successfulCount,
      totalPayments: results.totalPayments,
      averageROI,
      trustMetrics: {
        averageTrustScore: successfulCount > 0 ? totalTrustScore / successfulCount : 0,
        sybilDetected: results.trustMetrics.sybilDetected,
        slashingEvents: results.trustMetrics.slashingEvents
      }
    };
  }

  /**
   * Calculate trust score for an influencer
   */
  private calculateTrustScore(influencer: {
    influencerDID: string;
    reputation: number;
    sybilRisk: number;
    stakeTier: StakeTier;
  }): number {
    const weights = {
      reputation: 0.30,
      sybil: 0.15,
      staking: 0.35,
      payment: 0.20
    };

    // Get staking info
    const stake = this.staking.getUserStake(influencer.influencerDID);
    const stakingScore = stake ? Number(stake.reputationMultiplier) / 200 : 0.5; // Normalize to 0-1

    // Get payment stats
    const paymentStats = this.payments.getPaymentStatistics(influencer.influencerDID);
    const paymentScore = paymentStats.totalTransactions > 0
      ? paymentStats.successRate * (1 - paymentStats.disputeRate)
      : 0.5;

    // Sybil resistance score (inverse of risk)
    const sybilScore = 1 - influencer.sybilRisk;

    return (
      influencer.reputation * weights.reputation +
      sybilScore * weights.sybil +
      stakingScore * weights.staking +
      paymentScore * weights.payment
    );
  }

  /**
   * Calculate match score for campaign
   */
  private calculateMatchScore(
    influencer: MatchedInfluencer,
    campaignUAL: CampaignUAL,
    trustScore: number
  ): number {
    // Base match on trust score
    let score = trustScore * 0.6;

    // Bonus for higher tier
    const tierBonus = {
      [StakeTier.BASIC]: 0,
      [StakeTier.VERIFIED]: 0.1,
      [StakeTier.PREMIUM]: 0.2,
      [StakeTier.ELITE]: 0.3
    };
    score += tierBonus[influencer.stakeTier] || 0;

    // Bonus for low sybil risk
    score += (1 - influencer.sybilRisk) * 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Check if tier1 is higher or equal to tier2
   */
  private isTierHigherOrEqual(tier1: StakeTier, tier2: StakeTier): boolean {
    const tierOrder = [StakeTier.BASIC, StakeTier.VERIFIED, StakeTier.PREMIUM, StakeTier.ELITE];
    return tierOrder.indexOf(tier1) >= tierOrder.indexOf(tier2);
  }

  /**
   * Generate verification hash
   */
  private generateVerificationHash(influencerDID: string, campaignUAL: string): string {
    const data = `${influencerDID}_${campaignUAL}_${Date.now()}`;
    return Buffer.from(data).toString('base64').slice(0, 32);
  }
}

// Singleton instance
let orchestratorInstance: TrustOrchestrator | null = null;

export function getTrustOrchestrator(): TrustOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new TrustOrchestrator();
  }
  return orchestratorInstance;
}

