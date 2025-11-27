/**
 * Campaign Service for Endorsement Campaign Management
 * 
 * Implements the complete demo scenario workflow:
 * 1. Campaign creation and DKG publishing
 * 2. Influencer discovery with AI agents
 * 3. Trust verification with Sybil detection
 * 4. Endorsement execution with automated payments
 * 5. Reputation updates based on performance
 */

import { DKGClientV8, type DKGConfig } from './dkg-client-v8';
import { createSocialCreditAgents } from '../server/_core/socialCreditAgents';
import { getPolkadotApi } from '../server/_core/polkadotApi';
import type { PolkadotApiService } from '../server/_core/polkadotApi';

export interface CampaignRequirements {
  minReputation: number;
  minStake: string; // e.g., "2000 TRAC"
  targetAudience: string[];
  sybilRiskThreshold: number;
  contentQuality: 'high_engagement' | 'medium' | 'low';
  platforms?: string[];
  specialties?: string[];
}

export interface CompensationStructure {
  baseRate: string; // e.g., "200 USDC"
  performanceBonus: string; // e.g., "100 USDC"
  paymentToken: string;
  bonusConditions: {
    engagementRate?: string; // e.g., ">5%"
    conversionRate?: string; // e.g., ">2%"
    contentQuality?: string; // e.g., "verified_usage"
  };
}

export interface VerificationRequirements {
  completionProof: string;
  qualityMetrics: string[];
  disputeResolution: string;
}

export interface EndorsementCampaign {
  '@context'?: any[];
  '@type': 'EndorsementCampaign';
  '@id': string;
  creator: string; // Brand DID
  name: string;
  description: string;
  requirements: CampaignRequirements;
  compensation: CompensationStructure;
  verification: VerificationRequirements;
  campaignDuration: {
    startDate: string;
    endDate: string;
  };
  expectedReach?: string;
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
  createdAt?: string;
  ual?: string;
}

export interface InfluencerProfile {
  influencer_id: string;
  did: string;
  profile: {
    name: string;
    niche: string;
    followers: number;
    engagement_rate: number;
    audience_demographics: Record<string, number>;
  };
  reputation_metrics: {
    overall_score: number;
    social_rank: number;
    economic_stake: number;
    endorsement_quality: number;
    temporal_consistency: number;
  };
  economic_data: {
    staked_tokens: string;
    stake_duration_days: number;
    total_earnings: string;
    completed_campaigns: number;
    success_rate: number;
  };
  sybil_resistance: {
    unique_identity_proof: boolean;
    graph_cluster_analysis: string;
    behavior_anomaly_score: number;
    connection_diversity: number;
  };
  social_graph?: {
    connections: number;
    trusted_connections: number;
    cluster_id?: string;
    pagerank_score?: number;
  };
}

export interface TrustVerificationReport {
  verification_id: string;
  influencer_did: string;
  campaign_id: string;
  verification_timestamp: string;
  overall_trust_score: number;
  detailed_scores: {
    graph_analysis: {
      score: number;
      pagerank: number;
      cluster_analysis: string;
      connection_diversity: number;
      findings: string;
    };
    economic_analysis: {
      score: number;
      stake_amount: string;
      stake_duration: string;
      earnings_history: string;
      findings: string;
    };
    behavioral_analysis: {
      score: number;
      consistency_score: number;
      anomaly_detection: number;
      pattern_authenticity: number;
      findings: string;
    };
    content_quality: {
      score: number;
      historical_performance: number;
      audience_feedback: number;
      completion_rate: number;
      findings: string;
    };
  };
  sybil_risk_assessment: {
    overall_risk: number;
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    recommendation: 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'CONDITIONAL' | 'REJECT';
    confidence: number;
    red_flags?: string[];
  };
  campaign_suitability: {
    audience_match: number;
    content_style_match: number;
    historical_success_similar_campaigns: number;
    overall_suitability: number;
  };
}

export interface CampaignApplication {
  application_id: string;
  campaign_id: string;
  influencer_did: string;
  status: 'discovered' | 'applied' | 'verified' | 'accepted' | 'rejected' | 
           'content_created' | 'performance_tracking' | 'completed' | 'paid' | 'reputation_updated';
  states: Array<{
    status: string;
    timestamp: string;
    action: string;
  }>;
  payment_proof?: {
    txHash: string;
    amount: string;
    currency: string;
    timestamp: string;
  };
  final_outcome?: {
    status: string;
    total_earnings: string;
    reputation_increase: number;
    future_multiplier: number;
  };
}

export interface CampaignPerformanceMetrics {
  campaign_id: string;
  influencer_did: string;
  performance_period: {
    start: string;
    end: string;
  };
  content_metrics: {
    video_views?: number;
    watch_time_minutes?: number;
    engagement_rate: number;
    comments: number;
    shares: number;
  };
  conversion_metrics: {
    click_through_rate: number;
    conversion_rate: number;
    total_conversions: number;
    conversion_value: string;
  };
  audience_metrics: {
    new_followers: number;
    audience_retention: number;
    demographic_reach: {
      target_audience_reached: number;
      new_audience_segments: number;
    };
  };
  quality_metrics: {
    content_quality_score: number;
    brand_alignment_score: number;
    authenticity_score: number;
    audience_sentiment: number;
  };
  bonus_eligibility: {
    engagement_bonus: boolean;
    conversion_bonus: boolean;
    quality_bonus: boolean;
    total_bonus_earned: string;
  };
}

export interface ReputationUpdate {
  update_id: string;
  influencer_did: string;
  previous_reputation: {
    overall_score: number;
    social_rank: number;
    economic_stake: number;
    endorsement_quality: number;
    temporal_consistency: number;
  };
  new_reputation: {
    overall_score: number;
    social_rank: number;
    economic_stake: number;
    endorsement_quality: number;
    temporal_consistency: number;
  };
  change_reason: string;
  performance_factors: {
    campaign_success: number;
    audience_growth: number;
    content_quality: number;
    economic_impact: number;
  };
  economic_impact: {
    campaign_earnings: string;
    lifetime_earnings_increase: string;
    future_rate_multiplier: number;
    premium_campaign_access: boolean;
  };
  timestamp: string;
  ual?: string;
}

export class CampaignService {
  private dkgClient: DKGClientV8;
  private socialCreditAgents: ReturnType<typeof createSocialCreditAgents>;
  private polkadotApi: PolkadotApiService;
  private campaigns: Map<string, EndorsementCampaign> = new Map();
  private applications: Map<string, CampaignApplication> = new Map();
  private useMockMode: boolean;

  constructor(config?: DKGConfig) {
    this.useMockMode = config?.useMockMode || process.env.DKG_USE_MOCK === 'true' || false;
    this.dkgClient = new DKGClientV8(config);
    this.polkadotApi = getPolkadotApi();
    this.socialCreditAgents = createSocialCreditAgents(this.dkgClient as any, this.polkadotApi);
  }

  /**
   * Step 1: Create and publish campaign as DKG Knowledge Asset
   */
  async createCampaign(
    brandDid: string,
    campaignData: {
      name: string;
      description: string;
      requirements: CampaignRequirements;
      compensation: CompensationStructure;
      verification: VerificationRequirements;
      campaignDuration: { startDate: string; endDate: string };
      expectedReach?: string;
    }
  ): Promise<{ campaign: EndorsementCampaign; ual: string; publishResult: any }> {
    const campaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const ual = `ual:dkg:campaign:${campaignId}`;

    const campaign: EndorsementCampaign = {
      '@context': [
        'https://schema.org',
        'https://trust-marketplace.org/schema',
        {
          dotrep: 'https://dotrep.io/ontology/',
        },
      ],
      '@type': 'EndorsementCampaign',
      '@id': ual,
      creator: brandDid,
      name: campaignData.name,
      description: campaignData.description,
      requirements: campaignData.requirements,
      compensation: campaignData.compensation,
      verification: campaignData.verification,
      campaignDuration: campaignData.campaignDuration,
      expectedReach: campaignData.expectedReach,
      status: 'active',
      createdAt: new Date().toISOString(),
      ual,
    };

    // Convert to JSON-LD for DKG publishing
    const campaignJSONLD = this.campaignToJSONLD(campaign);

    // Publish to DKG
    let publishResult;
    try {
      publishResult = await this.dkgClient['dkg']?.asset?.create?.(
        { public: campaignJSONLD },
        { epochsNum: 2 }
      );
      
      if (publishResult) {
        campaign.ual = publishResult.UAL || ual;
      }
    } catch (error) {
      console.warn('⚠️  DKG publishing failed, using mock mode:', error);
      // In mock mode, generate a mock UAL
      if (this.useMockMode) {
        publishResult = {
          UAL: ual,
          transactionHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
          blockNumber: Math.floor(Date.now() / 1000),
        };
        campaign.ual = ual;
      } else {
        throw error;
      }
    }

    // Store campaign locally
    this.campaigns.set(campaignId, campaign);

    console.log(`✅ Campaign created: ${campaign.name}`);
    console.log(`🔗 UAL: ${campaign.ual}`);
    console.log(`💰 Base Rate: ${campaign.compensation.baseRate}`);
    console.log(`📊 Requirements: Rep > ${campaign.requirements.minReputation}, Stake > ${campaign.requirements.minStake}`);

    return {
      campaign,
      ual: campaign.ual || ual,
      publishResult,
    };
  }

  /**
   * Step 2: Discover matching campaigns using AI agent
   */
  async discoverCampaigns(
    influencerProfile: InfluencerProfile,
    filters?: {
      minCompensation?: string;
      maxSybilRisk?: number;
      preferredCategories?: string[];
    }
  ): Promise<{
    matching_campaigns: Array<{
      campaign_id: string;
      match_score: number;
      reasons: string[];
      estimated_earnings: string;
      application_cost: string;
    }>;
    recommended_application?: string;
    confidence_score: number;
  }> {
    console.log(`🔍 Discovering campaigns for influencer: ${influencerProfile.profile.name}`);
    
    // Get all active campaigns
    const activeCampaigns = Array.from(this.campaigns.values()).filter(
      c => c.status === 'active'
    );

    const matchingCampaigns = [];

    for (const campaign of activeCampaigns) {
      // Check if influencer meets requirements
      const meetsRequirements =
        influencerProfile.reputation_metrics.overall_score >= campaign.requirements.minReputation &&
        this.parseStakeAmount(influencerProfile.economic_data.staked_tokens) >=
          this.parseStakeAmount(campaign.requirements.minStake) &&
        influencerProfile.sybil_resistance.behavior_anomaly_score <= campaign.requirements.sybilRiskThreshold;

      if (!meetsRequirements) continue;

      // Calculate match score
      const matchScore = this.calculateMatchScore(influencerProfile, campaign);
      
      // Apply filters
      if (filters) {
        if (filters.maxSybilRisk !== undefined &&
            influencerProfile.sybil_resistance.behavior_anomaly_score > filters.maxSybilRisk) {
          continue;
        }
        // Additional filtering can be added here
      }

      // Estimate earnings
      const estimatedEarnings = this.estimateEarnings(campaign, influencerProfile);

      matchingCampaigns.push({
        campaign_id: campaign.ual || campaign['@id'],
        match_score: matchScore,
        reasons: this.generateMatchReasons(influencerProfile, campaign),
        estimated_earnings: estimatedEarnings,
        application_cost: '5 USDC', // Fixed application fee
      });
    }

    // Sort by match score
    matchingCampaigns.sort((a, b) => b.match_score - a.match_score);

    // Recommend top match
    const recommended = matchingCampaigns.length > 0 ? matchingCampaigns[0].campaign_id : undefined;
    const confidenceScore = matchingCampaigns.length > 0 ? matchingCampaigns[0].match_score : 0;

    console.log(`✅ Found ${matchingCampaigns.length} matching campaigns`);
    if (recommended) {
      console.log(`⭐ Recommended: ${recommended} (score: ${confidenceScore.toFixed(2)})`);
    }

    return {
      matching_campaigns: matchingCampaigns,
      recommended_application: recommended,
      confidence_score: confidenceScore,
    };
  }

  /**
   * Step 3: Comprehensive trust verification with Sybil detection
   */
  async verifyTrust(
    influencerDid: string,
    campaignId: string
  ): Promise<TrustVerificationReport> {
    console.log(`🛡️  Verifying trust for influencer: ${influencerDid}`);
    
    // Get influencer profile (would query from DKG in production)
    const influencerProfile = await this.getInfluencerProfile(influencerDid);

    // Run comprehensive verification using Sybil Detective Agent
    const sybilAnalysis = await this.socialCreditAgents.sybilDetective.analyzeAccount(influencerDid);

    // Build comprehensive verification report
    const verificationReport: TrustVerificationReport = {
      verification_id: `verify_${influencerDid}_${campaignId}_${Date.now()}`,
      influencer_did: influencerDid,
      campaign_id: campaignId,
      verification_timestamp: new Date().toISOString(),
      overall_trust_score: influencerProfile.reputation_metrics.overall_score,
      detailed_scores: {
        graph_analysis: {
          score: influencerProfile.reputation_metrics.social_rank,
          pagerank: influencerProfile.social_graph?.pagerank_score || 0,
          cluster_analysis: influencerProfile.sybil_resistance.graph_cluster_analysis,
          connection_diversity: influencerProfile.sybil_resistance.connection_diversity,
          findings: this.generateGraphFindings(influencerProfile),
        },
        economic_analysis: {
          score: influencerProfile.reputation_metrics.economic_stake,
          stake_amount: influencerProfile.economic_data.staked_tokens,
          stake_duration: `${influencerProfile.economic_data.stake_duration_days} days`,
          earnings_history: influencerProfile.economic_data.success_rate > 0.8 ? 'consistent' : 'inconsistent',
          findings: this.generateEconomicFindings(influencerProfile),
        },
        behavioral_analysis: {
          score: influencerProfile.reputation_metrics.temporal_consistency,
          consistency_score: influencerProfile.reputation_metrics.temporal_consistency,
          anomaly_detection: influencerProfile.sybil_resistance.behavior_anomaly_score,
          pattern_authenticity: 1 - influencerProfile.sybil_resistance.behavior_anomaly_score,
          findings: this.generateBehavioralFindings(influencerProfile, sybilAnalysis),
        },
        content_quality: {
          score: influencerProfile.reputation_metrics.endorsement_quality,
          historical_performance: influencerProfile.economic_data.success_rate * 5, // Scale to 0-5
          audience_feedback: 4.5, // Would query from DKG
          completion_rate: influencerProfile.economic_data.success_rate,
          findings: this.generateContentQualityFindings(influencerProfile),
        },
      },
      sybil_risk_assessment: {
        overall_risk: influencerProfile.sybil_resistance.behavior_anomaly_score,
        risk_level: this.getRiskLevel(influencerProfile.sybil_resistance.behavior_anomaly_score),
        recommendation: this.getRecommendation(influencerProfile),
        confidence: 1 - influencerProfile.sybil_resistance.behavior_anomaly_score,
        red_flags: this.getRedFlags(influencerProfile, sybilAnalysis),
      },
      campaign_suitability: {
        audience_match: 0.95, // Would calculate based on demographics
        content_style_match: 0.88,
        historical_success_similar_campaigns: influencerProfile.economic_data.success_rate,
        overall_suitability: 0.92,
      },
    };

    console.log(`✅ Trust verification complete`);
    console.log(`   Overall Trust Score: ${verificationReport.overall_trust_score.toFixed(2)}`);
    console.log(`   Sybil Risk: ${verificationReport.sybil_risk_assessment.overall_risk.toFixed(2)} (${verificationReport.sybil_risk_assessment.risk_level})`);
    console.log(`   Recommendation: ${verificationReport.sybil_risk_assessment.recommendation}`);

    return verificationReport;
  }

  /**
   * Step 4: Apply to campaign via x402 payment
   */
  async applyToCampaign(
    campaignId: string,
    influencerDid: string,
    applicationFee: string = '5 USDC'
  ): Promise<CampaignApplication> {
    const applicationId = `app_${influencerDid}_${campaignId}_${Date.now()}`;
    
    const application: CampaignApplication = {
      application_id: applicationId,
      campaign_id: campaignId,
      influencer_did: influencerDid,
      status: 'discovered',
      states: [
        {
          status: 'discovered',
          timestamp: new Date().toISOString(),
          action: 'AI agent found matching campaign',
        },
      ],
    };

    // Update status to applied
    application.status = 'applied';
    application.states.push({
      status: 'applied',
      timestamp: new Date().toISOString(),
      action: 'x402 payment submitted for application',
    });

    // In production, would integrate with x402 payment system
    // For now, simulate payment
    application.payment_proof = {
      txHash: `0x${Buffer.from(`${Date.now()}-${Math.random()}`).toString('hex')}`,
      amount: applicationFee,
      currency: 'USDC',
      timestamp: new Date().toISOString(),
    };

    // Store application
    this.applications.set(applicationId, application);

    console.log(`✅ Application submitted: ${applicationId}`);
    console.log(`💸 Payment: ${applicationFee} (tx: ${application.payment_proof.txHash})`);

    return application;
  }

  /**
   * Step 5: Execute endorsement and track performance
   */
  async executeEndorsement(
    applicationId: string,
    contentAssets: any[]
  ): Promise<{
    application: CampaignApplication;
    performanceMetrics: CampaignPerformanceMetrics;
  }> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application not found: ${applicationId}`);
    }

    const campaign = Array.from(this.campaigns.values()).find(
      c => c.ual === application.campaign_id || c['@id'] === application.campaign_id
    );
    if (!campaign) {
      throw new Error(`Campaign not found: ${application.campaign_id}`);
    }

    // Create verified content
    const verifiedContent = this.createVerifiedContent(contentAssets, application, campaign);

    // Update application status
    application.status = 'content_created';
    application.states.push({
      status: 'content_created',
      timestamp: new Date().toISOString(),
      action: 'Verified content published with tracking',
    });

    // Simulate performance metrics (in production, would track from platforms)
    const performanceMetrics = await this.simulatePerformanceTracking(
      application,
      campaign,
      verifiedContent
    );

    // Evaluate performance and trigger payment if successful
    const performanceScore = this.evaluatePerformance(performanceMetrics, campaign);
    
    if (performanceScore >= 0.8) {
      await this.triggerAutomaticPayment(application, campaign, performanceMetrics);
    }

    return {
      application,
      performanceMetrics,
    };
  }

  /**
   * Step 6: Update reputation based on campaign performance
   */
  async updateReputation(
    influencerDid: string,
    campaignPerformance: CampaignPerformanceMetrics
  ): Promise<ReputationUpdate> {
    console.log(`📈 Updating reputation for: ${influencerDid}`);

    // Get current reputation (would query from DKG)
    const influencerProfile = await this.getInfluencerProfile(influencerDid);
    const previousRep = influencerProfile.reputation_metrics;

    // Calculate new reputation components
    const campaignSuccess = this.calculateCampaignSuccess(campaignPerformance);
    const audienceGrowth = campaignPerformance.audience_metrics.new_followers / 1000; // Normalize
    const contentQuality = campaignPerformance.quality_metrics.content_quality_score / 5;
    const economicImpact = this.parseAmount(campaignPerformance.bonus_eligibility.total_bonus_earned) / 100;

    // Calculate new scores with weighted updates
    const newReputation = {
      overall_score: Math.min(1, previousRep.overall_score + (campaignSuccess * 0.05)),
      social_rank: Math.min(1, previousRep.social_rank + (audienceGrowth * 0.03)),
      economic_stake: previousRep.economic_stake, // Stake doesn't change from campaign
      endorsement_quality: Math.min(1, previousRep.endorsement_quality + (contentQuality * 0.04)),
      temporal_consistency: Math.min(1, previousRep.temporal_consistency + (campaignSuccess * 0.02)),
    };

    // Calculate earnings
    const baseRate = this.parseAmount('200 USDC'); // Would get from campaign
    const bonus = this.parseAmount(campaignPerformance.bonus_eligibility.total_bonus_earned);
    const totalEarnings = baseRate + bonus;

    const reputationUpdate: ReputationUpdate = {
      update_id: `rep_update_${influencerDid}_${Date.now()}`,
      influencer_did: influencerDid,
      previous_reputation: previousRep,
      new_reputation: newReputation,
      change_reason: 'successful_campaign_completion',
      performance_factors: {
        campaign_success: campaignSuccess,
        audience_growth: audienceGrowth,
        content_quality: contentQuality,
        economic_impact: economicImpact,
      },
      economic_impact: {
        campaign_earnings: `${totalEarnings} USDC`,
        lifetime_earnings_increase: `${totalEarnings} USDC`, // Would calculate from history
        future_rate_multiplier: 1 + (newReputation.overall_score - previousRep.overall_score) * 2,
        premium_campaign_access: newReputation.overall_score > 0.85,
      },
      timestamp: new Date().toISOString(),
    };

    // Publish reputation update to DKG (would use actual DKG publish)
    if (!this.useMockMode) {
      try {
        // In production, would publish as reputation asset update
        console.log(`📤 Publishing reputation update to DKG...`);
      } catch (error) {
        console.warn('⚠️  Failed to publish reputation update:', error);
      }
    }

    // Update application status
    const application = Array.from(this.applications.values()).find(
      app => app.influencer_did === influencerDid
    );
    if (application) {
      application.status = 'reputation_updated';
      application.final_outcome = {
        status: 'success',
        total_earnings: reputationUpdate.economic_impact.campaign_earnings,
        reputation_increase: newReputation.overall_score - previousRep.overall_score,
        future_multiplier: reputationUpdate.economic_impact.future_rate_multiplier,
      };
      application.states.push({
        status: 'reputation_updated',
        timestamp: new Date().toISOString(),
        action: 'DKG reputation asset updated',
      });
    }

    console.log(`✅ Reputation updated`);
    console.log(`   Previous: ${previousRep.overall_score.toFixed(2)} → New: ${newReputation.overall_score.toFixed(2)}`);
    console.log(`   Increase: +${(newReputation.overall_score - previousRep.overall_score).toFixed(3)}`);
    console.log(`   Future Multiplier: ${reputationUpdate.economic_impact.future_rate_multiplier.toFixed(2)}x`);

    return reputationUpdate;
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private campaignToJSONLD(campaign: EndorsementCampaign): any {
    return {
      '@context': campaign['@context'],
      '@type': campaign['@type'],
      '@id': campaign['@id'],
      'schema:name': campaign.name,
      'schema:description': campaign.description,
      'schema:creator': {
        '@id': campaign.creator,
      },
      'dotrep:requirements': {
        'dotrep:minReputation': campaign.requirements.minReputation,
        'dotrep:minStake': campaign.requirements.minStake,
        'dotrep:targetAudience': campaign.requirements.targetAudience,
        'dotrep:sybilRiskThreshold': campaign.requirements.sybilRiskThreshold,
        'dotrep:contentQuality': campaign.requirements.contentQuality,
      },
      'dotrep:compensation': {
        'schema:price': campaign.compensation.baseRate,
        'schema:priceCurrency': campaign.compensation.paymentToken,
        'dotrep:performanceBonus': campaign.compensation.performanceBonus,
        'dotrep:bonusConditions': campaign.compensation.bonusConditions,
      },
      'dotrep:verification': {
        'dotrep:completionProof': campaign.verification.completionProof,
        'dotrep:qualityMetrics': campaign.verification.qualityMetrics,
        'dotrep:disputeResolution': campaign.verification.disputeResolution,
      },
      'schema:startDate': campaign.campaignDuration.startDate,
      'schema:endDate': campaign.campaignDuration.endDate,
      'schema:expectedAudience': campaign.expectedReach,
      'dotrep:status': campaign.status,
      'schema:dateCreated': campaign.createdAt,
    };
  }

  private calculateMatchScore(influencer: InfluencerProfile, campaign: EndorsementCampaign): number {
    let score = 0;

    // Reputation match (40%)
    const repRatio = influencer.reputation_metrics.overall_score / campaign.requirements.minReputation;
    score += Math.min(1, repRatio) * 0.4;

    // Stake match (20%)
    const stakeRatio = this.parseStakeAmount(influencer.economic_data.staked_tokens) /
      this.parseStakeAmount(campaign.requirements.minStake);
    score += Math.min(1, stakeRatio) * 0.2;

    // Audience match (20%) - simplified
    score += 0.2;

    // Sybil risk (20%) - lower risk = higher score
    const riskScore = 1 - (influencer.sybil_resistance.behavior_anomaly_score / campaign.requirements.sybilRiskThreshold);
    score += Math.max(0, riskScore) * 0.2;

    return Math.min(1, score);
  }

  private generateMatchReasons(influencer: InfluencerProfile, campaign: EndorsementCampaign): string[] {
    const reasons: string[] = [];
    
    if (influencer.reputation_metrics.overall_score > campaign.requirements.minReputation * 1.2) {
      reasons.push('Reputation significantly exceeds requirements');
    }
    
    if (influencer.economic_data.success_rate > 0.9) {
      reasons.push('High historical campaign success rate');
    }
    
    if (influencer.sybil_resistance.behavior_anomaly_score < 0.2) {
      reasons.push('Low Sybil risk profile');
    }

    return reasons;
  }

  private estimateEarnings(campaign: EndorsementCampaign, influencer: InfluencerProfile): string {
    const base = this.parseAmount(campaign.compensation.baseRate);
    const bonus = this.parseAmount(campaign.compensation.performanceBonus);
    
    // Estimate bonus probability based on historical success
    const bonusProbability = influencer.economic_data.success_rate;
    const estimatedBonus = bonus * bonusProbability;
    
    const total = base + estimatedBonus;
    return `${total.toFixed(0)} USDC`;
  }

  private async getInfluencerProfile(did: string): Promise<InfluencerProfile> {
    // Try to get from mock data first
    try {
      const { getMockInfluencerByDID } = await import('./demo-mock-data');
      const mockProfile = getMockInfluencerByDID(did);
      if (mockProfile) {
        return mockProfile;
      }
    } catch (error) {
      console.warn('Could not load mock data:', error);
    }

    // In production, would query from DKG
    // Fallback to basic mock profile
    return this.getMockInfluencerProfile(did);
  }

  private getMockInfluencerProfile(did: string): InfluencerProfile {
    // This would be replaced with actual DKG queries
    return {
      influencer_id: did,
      did,
      profile: {
        name: 'Mock Influencer',
        niche: 'technology',
        followers: 100000,
        engagement_rate: 5.5,
        audience_demographics: {},
      },
      reputation_metrics: {
        overall_score: 0.85,
        social_rank: 0.82,
        economic_stake: 0.88,
        endorsement_quality: 0.87,
        temporal_consistency: 0.83,
      },
      economic_data: {
        staked_tokens: '3000 TRAC',
        stake_duration_days: 120,
        total_earnings: '15000 USDC',
        completed_campaigns: 15,
        success_rate: 0.93,
      },
      sybil_resistance: {
        unique_identity_proof: true,
        graph_cluster_analysis: 'low_risk',
        behavior_anomaly_score: 0.15,
        connection_diversity: 0.85,
      },
      social_graph: {
        connections: 1200,
        trusted_connections: 35,
        pagerank_score: 0.065,
      },
    };
  }

  private parseStakeAmount(stake: string): number {
    const match = stake.match(/(\d+(?:\.\d+)?)\s*TRAC/i);
    return match ? parseFloat(match[1]) : 0;
  }

  private parseAmount(amount: string): number {
    const match = amount.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private generateGraphFindings(profile: InfluencerProfile): string {
    if (profile.sybil_resistance.connection_diversity > 0.8) {
      return 'Well-connected across multiple authentic communities';
    } else if (profile.sybil_resistance.connection_diversity < 0.3) {
      return 'Limited connection diversity, possible cluster';
    }
    return 'Moderate connection diversity';
  }

  private generateEconomicFindings(profile: InfluencerProfile): string {
    if (profile.economic_data.stake_duration_days > 90) {
      return 'Strong economic commitment to platform';
    }
    return 'Moderate economic commitment';
  }

  private generateBehavioralFindings(profile: InfluencerProfile, sybilAnalysis: any): string {
    if (profile.sybil_resistance.behavior_anomaly_score < 0.2) {
      return 'Natural posting patterns, genuine engagement';
    } else if (profile.sybil_resistance.behavior_anomaly_score > 0.7) {
      return 'Automated posting patterns detected';
    }
    return 'Moderate behavioral patterns';
  }

  private generateContentQualityFindings(profile: InfluencerProfile): string {
    if (profile.economic_data.success_rate > 0.9) {
      return 'High-quality content with positive audience response';
    }
    return 'Moderate content quality';
  }

  private getRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore < 0.3) return 'low';
    if (riskScore < 0.5) return 'medium';
    if (riskScore < 0.7) return 'high';
    return 'critical';
  }

  private getRecommendation(profile: InfluencerProfile): 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'CONDITIONAL' | 'REJECT' {
    if (profile.reputation_metrics.overall_score > 0.8 && 
        profile.sybil_resistance.behavior_anomaly_score < 0.3) {
      return 'HIGHLY_RECOMMENDED';
    } else if (profile.reputation_metrics.overall_score > 0.7 &&
               profile.sybil_resistance.behavior_anomaly_score < 0.5) {
      return 'RECOMMENDED';
    } else if (profile.sybil_resistance.behavior_anomaly_score > 0.7) {
      return 'REJECT';
    }
    return 'CONDITIONAL';
  }

  private getRedFlags(profile: InfluencerProfile, sybilAnalysis: any): string[] {
    const flags: string[] = [];
    
    if (profile.sybil_resistance.connection_diversity < 0.3) {
      flags.push('Low connection diversity');
    }
    
    if (profile.economic_data.staked_tokens && this.parseStakeAmount(profile.economic_data.staked_tokens) < 100) {
      flags.push('Minimal token stake');
    }
    
    if (profile.sybil_resistance.behavior_anomaly_score > 0.7) {
      flags.push('High behavioral anomaly score');
    }

    return flags;
  }

  private createVerifiedContent(contentAssets: any[], application: CampaignApplication, campaign: EndorsementCampaign): any {
    return {
      content: contentAssets,
      verification_proofs: {
        creator_did: application.influencer_did,
        campaign_id: application.campaign_id,
        timestamp: new Date().toISOString(),
        content_hash: this.computeContentHash(contentAssets),
        usage_proof: 'verified_usage_7days',
      },
      tracking_metadata: {
        engagement_metrics: true,
        conversion_tracking: true,
        audience_verification: true,
      },
    };
  }

  private computeContentHash(content: any[]): string {
    // Simplified hash computation
    const contentStr = JSON.stringify(content);
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(contentStr).digest('hex');
  }

  private async simulatePerformanceTracking(
    application: CampaignApplication,
    campaign: EndorsementCampaign,
    content: any
  ): Promise<CampaignPerformanceMetrics> {
    // Simulate performance metrics (in production, would track from platforms)
    return {
      campaign_id: application.campaign_id,
      influencer_did: application.influencer_did,
      performance_period: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      content_metrics: {
        video_views: 125000,
        watch_time_minutes: 45000,
        engagement_rate: 6.2,
        comments: 1247,
        shares: 892,
      },
      conversion_metrics: {
        click_through_rate: 8.3,
        conversion_rate: 3.1,
        total_conversions: 387,
        conversion_value: '18500 USDC',
      },
      audience_metrics: {
        new_followers: 3200,
        audience_retention: 85,
        demographic_reach: {
          target_audience_reached: 92,
          new_audience_segments: 28,
        },
      },
      quality_metrics: {
        content_quality_score: 4.8,
        brand_alignment_score: 4.9,
        authenticity_score: 4.7,
        audience_sentiment: 0.89,
      },
      bonus_eligibility: {
        engagement_bonus: true,
        conversion_bonus: true,
        quality_bonus: true,
        total_bonus_earned: '100 USDC',
      },
    };
  }

  private evaluatePerformance(metrics: CampaignPerformanceMetrics, campaign: EndorsementCampaign): number {
    let score = 0;

    // Engagement rate (30%)
    const engagementRate = metrics.content_metrics.engagement_rate;
    score += Math.min(1, engagementRate / 10) * 0.3;

    // Conversion rate (30%)
    const conversionRate = metrics.conversion_metrics.conversion_rate;
    score += Math.min(1, conversionRate / 5) * 0.3;

    // Content quality (25%)
    const qualityScore = metrics.quality_metrics.content_quality_score / 5;
    score += qualityScore * 0.25;

    // Audience retention (15%)
    const retention = metrics.audience_metrics.audience_retention / 100;
    score += retention * 0.15;

    return score;
  }

  private async triggerAutomaticPayment(
    application: CampaignApplication,
    campaign: EndorsementCampaign,
    metrics: CampaignPerformanceMetrics
  ): Promise<void> {
    // Calculate payment amount
    const baseAmount = this.parseAmount(campaign.compensation.baseRate);
    const bonusAmount = metrics.bonus_eligibility.total_bonus_earned ? 
      this.parseAmount(metrics.bonus_eligibility.total_bonus_earned) : 0;
    const totalAmount = baseAmount + bonusAmount;

    // In production, would execute x402 payment
    console.log(`💸 Triggering automatic payment: ${totalAmount} ${campaign.compensation.paymentToken}`);
    
    application.status = 'paid';
    application.states.push({
      status: 'paid',
      timestamp: new Date().toISOString(),
      action: `x402 automatic payment executed: ${totalAmount} ${campaign.compensation.paymentToken}`,
    });
  }

  private calculateCampaignSuccess(metrics: CampaignPerformanceMetrics): number {
    const engagement = Math.min(1, metrics.content_metrics.engagement_rate / 10);
    const conversion = Math.min(1, metrics.conversion_metrics.conversion_rate / 5);
    const quality = metrics.quality_metrics.content_quality_score / 5;
    
    return (engagement * 0.4 + conversion * 0.3 + quality * 0.3);
  }
}

/**
 * Factory function to create Campaign Service instance
 */
export function createCampaignService(config?: DKGConfig): CampaignService {
  return new CampaignService(config);
}

export default CampaignService;

