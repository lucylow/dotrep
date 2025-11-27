/**
 * Demo Mock Data for Tech Gadget Launch Campaign
 * 
 * Provides comprehensive mock data for demonstrating the complete
 * endorsement campaign workflow including brands, influencers, campaigns,
 * verification reports, payment flows, and reputation updates.
 */

import type {
  EndorsementCampaign,
  InfluencerProfile,
  TrustVerificationReport,
  CampaignApplication,
  CampaignPerformanceMetrics,
  ReputationUpdate,
} from './campaign-service';

export interface MockBrandCampaign {
  campaign_id: string;
  brand: {
    name: string;
    did: string;
    reputation: number;
    campaigns_completed: number;
  };
  campaign_details: {
    title: string;
    description: string;
    product_category: string;
    campaign_budget: string;
    duration: string;
  };
  requirements: {
    min_reputation: number;
    min_stake: string;
    target_audience: string[];
    content_type: string[];
    sybil_risk_threshold: number;
  };
  compensation: {
    base_rate: string;
    performance_bonus: string;
    payment_token: string;
    bonus_conditions: {
      engagement_rate: string;
      conversion_rate: string;
      content_quality_score: string;
    };
  };
  verification: {
    usage_proof_required: boolean;
    minimum_usage_days: number;
    quality_metrics_tracked: string[];
  };
  status: string;
  created_date: string;
  ual: string;
}

export const MOCK_CAMPAIGNS: Record<string, MockBrandCampaign> = {
  techinnovate_sw_001: {
    campaign_id: 'campaign_techinnovate_sw_001',
    brand: {
      name: 'TechInnovate',
      did: 'did:dkg:brand:techinnovate',
      reputation: 0.92,
      campaigns_completed: 47,
    },
    campaign_details: {
      title: 'AI-Powered Smartwatch Launch',
      description: 'Review our new SmartWatch Pro with advanced health monitoring and AI assistant',
      product_category: 'wearable_tech',
      campaign_budget: '50000 USDC',
      duration: '30 days',
    },
    requirements: {
      min_reputation: 0.75,
      min_stake: '1000 TRAC',
      target_audience: ['tech_enthusiasts', 'fitness', 'early_adopters'],
      content_type: ['video_review', 'social_posts', 'blog_article'],
      sybil_risk_threshold: 0.35,
    },
    compensation: {
      base_rate: '200 USDC',
      performance_bonus: '100 USDC',
      payment_token: 'USDC',
      bonus_conditions: {
        engagement_rate: '>4%',
        conversion_rate: '>1.5%',
        content_quality_score: '>4.5/5',
      },
    },
    verification: {
      usage_proof_required: true,
      minimum_usage_days: 7,
      quality_metrics_tracked: ['engagement', 'conversions', 'audience_retention'],
    },
    status: 'active',
    created_date: '2025-11-01T10:00:00Z',
    ual: 'ual:dkg:campaign:techinnovate_sw_001',
  },
};

export const MOCK_INFLUENCERS: Record<string, InfluencerProfile> = {
  tech_guru_alex: {
    influencer_id: 'influencer_tech_guru_001',
    did: 'did:dkg:influencer:tech_guru_alex',
    profile: {
      name: 'Alex TechReview',
      niche: 'technology',
      followers: 125000,
      engagement_rate: 6.8,
      audience_demographics: {
        age_18_25: 35,
        age_26_35: 45,
        age_36_plus: 20,
        tech_savvy: 85,
      },
    },
    reputation_metrics: {
      overall_score: 0.89,
      social_rank: 0.92,
      economic_stake: 0.85,
      endorsement_quality: 0.91,
      temporal_consistency: 0.88,
    },
    economic_data: {
      staked_tokens: '5000 TRAC',
      stake_duration_days: 180,
      total_earnings: '15000 USDC',
      completed_campaigns: 23,
      success_rate: 0.96,
    },
    sybil_resistance: {
      unique_identity_proof: true,
      graph_cluster_analysis: 'low_risk',
      behavior_anomaly_score: 0.12,
      connection_diversity: 0.88,
    },
    social_graph: {
      connections: 1450,
      trusted_connections: 42,
      cluster_id: 'main_tech_influencers',
      pagerank_score: 0.076,
    },
    campaign_history: [
      {
        campaign_id: 'campaign_gadget_zone_015',
        performance_score: 4.8,
        earnings: '450 USDC',
        completion_date: '2025-10-15',
      },
    ],
  } as InfluencerProfile & { campaign_history?: any[] },

  fitness_tech_sarah: {
    influencer_id: 'influencer_fitness_tech_002',
    did: 'did:dkg:influencer:fitness_tech_sarah',
    profile: {
      name: 'Sarah FitTech',
      niche: 'fitness_technology',
      followers: 68000,
      engagement_rate: 4.2,
      audience_demographics: {
        age_18_25: 45,
        age_26_35: 38,
        age_36_plus: 17,
        tech_savvy: 65,
      },
    },
    reputation_metrics: {
      overall_score: 0.72,
      social_rank: 0.68,
      economic_stake: 0.75,
      endorsement_quality: 0.71,
      temporal_consistency: 0.74,
    },
    economic_data: {
      staked_tokens: '1500 TRAC',
      stake_duration_days: 90,
      total_earnings: '3200 USDC',
      completed_campaigns: 8,
      success_rate: 0.85,
    },
    sybil_resistance: {
      unique_identity_proof: true,
      graph_cluster_analysis: 'medium_risk',
      behavior_anomaly_score: 0.28,
      connection_diversity: 0.65,
    },
    social_graph: {
      connections: 890,
      trusted_connections: 18,
      cluster_id: 'fitness_tech_community',
      pagerank_score: 0.042,
    },
  },

  suspected_bot_network: {
    influencer_id: 'influencer_tech_bot_003',
    did: 'did:dkg:influencer:suspected_bot_network',
    profile: {
      name: 'TechReview Network',
      niche: 'technology',
      followers: 95000,
      engagement_rate: 1.2,
      audience_demographics: {
        age_18_25: 95,
        age_26_35: 5,
        age_36_plus: 0,
        tech_savvy: 25,
      },
    },
    reputation_metrics: {
      overall_score: 0.35,
      social_rank: 0.15,
      economic_stake: 0.08,
      endorsement_quality: 0.42,
      temporal_consistency: 0.25,
    },
    economic_data: {
      staked_tokens: '50 TRAC',
      stake_duration_days: 7,
      total_earnings: '150 USDC',
      completed_campaigns: 3,
      success_rate: 0.33,
    },
    sybil_resistance: {
      unique_identity_proof: false,
      graph_cluster_analysis: 'high_risk',
      behavior_anomaly_score: 0.82,
      connection_diversity: 0.12,
    },
    social_graph: {
      connections: 120,
      trusted_connections: 2,
      cluster_id: 'suspected_bot_cluster_7',
      pagerank_score: 0.008,
      cluster_characteristics: {
        internal_connections: 95,
        external_connections: 25,
        cluster_density: 0.89,
      },
    } as any,
  },
};

export function getMockTrustVerificationReport(
  influencerDid: string,
  campaignId: string,
  influencerType: 'high' | 'medium' | 'suspected' = 'high'
): TrustVerificationReport {
  const baseReport: TrustVerificationReport = {
    verification_id: `verify_${influencerDid}_${campaignId}_${Date.now()}`,
    influencer_did: influencerDid,
    campaign_id: campaignId,
    verification_timestamp: new Date().toISOString(),
    overall_trust_score: 0,
    detailed_scores: {
      graph_analysis: {
        score: 0,
        pagerank: 0,
        cluster_analysis: 'low_risk',
        connection_diversity: 0,
        findings: '',
      },
      economic_analysis: {
        score: 0,
        stake_amount: '',
        stake_duration: '',
        earnings_history: 'consistent',
        findings: '',
      },
      behavioral_analysis: {
        score: 0,
        consistency_score: 0,
        anomaly_detection: 0,
        pattern_authenticity: 0,
        findings: '',
      },
      content_quality: {
        score: 0,
        historical_performance: 0,
        audience_feedback: 0,
        completion_rate: 0,
        findings: '',
      },
    },
    sybil_risk_assessment: {
      overall_risk: 0,
      risk_level: 'low',
      recommendation: 'HIGHLY_RECOMMENDED',
      confidence: 0,
    },
    campaign_suitability: {
      audience_match: 0,
      content_style_match: 0,
      historical_success_similar_campaigns: 0,
      overall_suitability: 0,
    },
  };

  if (influencerType === 'high') {
    baseReport.overall_trust_score = 0.89;
    baseReport.detailed_scores = {
      graph_analysis: {
        score: 0.92,
        pagerank: 0.076,
        cluster_analysis: 'low_risk',
        connection_diversity: 0.88,
        findings: 'Well-connected across multiple authentic communities',
      },
      economic_analysis: {
        score: 0.85,
        stake_amount: '5000 TRAC',
        stake_duration: '180 days',
        earnings_history: 'consistent',
        findings: 'Strong economic commitment to platform',
      },
      behavioral_analysis: {
        score: 0.91,
        consistency_score: 0.94,
        anomaly_detection: 0.12,
        pattern_authenticity: 0.89,
        findings: 'Natural posting patterns, genuine engagement',
      },
      content_quality: {
        score: 0.88,
        historical_performance: 4.7,
        audience_feedback: 4.8,
        completion_rate: 0.96,
        findings: 'High-quality content with positive audience response',
      },
    };
    baseReport.sybil_risk_assessment = {
      overall_risk: 0.15,
      risk_level: 'low',
      recommendation: 'HIGHLY_RECOMMENDED',
      confidence: 0.93,
    };
    baseReport.campaign_suitability = {
      audience_match: 0.95,
      content_style_match: 0.88,
      historical_success_similar_campaigns: 0.91,
      overall_suitability: 0.92,
    };
  } else if (influencerType === 'suspected') {
    baseReport.overall_trust_score = 0.35;
    baseReport.detailed_scores = {
      graph_analysis: {
        score: 0.18,
        pagerank: 0.008,
        cluster_analysis: 'high_risk',
        connection_diversity: 0.12,
        findings: 'Highly concentrated connections within suspected bot network',
      },
      economic_analysis: {
        score: 0.08,
        stake_amount: '50 TRAC',
        stake_duration: '7 days',
        earnings_history: 'inconsistent',
        findings: 'Minimal economic commitment, typical of disposable accounts',
      },
      behavioral_analysis: {
        score: 0.25,
        consistency_score: 0.32,
        anomaly_detection: 0.82,
        pattern_authenticity: 0.18,
        findings: 'Automated posting patterns, artificial engagement spikes',
      },
      content_quality: {
        score: 0.42,
        historical_performance: 2.1,
        audience_feedback: 1.8,
        completion_rate: 0.33,
        findings: 'Low-quality content, poor campaign completion history',
      },
    };
    baseReport.sybil_risk_assessment = {
      overall_risk: 0.82,
      risk_level: 'high',
      recommendation: 'REJECT',
      confidence: 0.96,
      red_flags: [
        'Cluster density exceeds Sybil threshold',
        'Economic footprint too small for claimed influence',
        'Behavioral patterns indicate automation',
        'Connection graph shows artificial inflation',
      ],
    };
    baseReport.campaign_suitability = {
      audience_match: 0.25,
      content_style_match: 0.18,
      historical_success_similar_campaigns: 0.12,
      overall_suitability: 0.15,
    };
  }

  return baseReport;
}

export function getMockPerformanceMetrics(
  campaignId: string,
  influencerDid: string
): CampaignPerformanceMetrics {
  return {
    campaign_id: campaignId,
    influencer_did: influencerDid,
    performance_period: {
      start: '2025-11-15T00:00:00Z',
      end: '2025-11-25T23:59:59Z',
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

export function getMockReputationUpdate(
  influencerDid: string,
  previousScore: number = 0.89
): ReputationUpdate {
  const newScore = Math.min(1, previousScore + 0.02);
  
  return {
    update_id: `rep_update_${influencerDid}_${Date.now()}`,
    influencer_did: influencerDid,
    previous_reputation: {
      overall_score: previousScore,
      social_rank: 0.92,
      economic_stake: 0.85,
      endorsement_quality: 0.91,
      temporal_consistency: 0.88,
    },
    new_reputation: {
      overall_score: newScore,
      social_rank: 0.93,
      economic_stake: 0.86,
      endorsement_quality: 0.92,
      temporal_consistency: 0.89,
    },
    change_reason: 'successful_techinnovate_campaign',
    performance_factors: {
      campaign_success: 0.95,
      audience_growth: 0.88,
      content_quality: 0.96,
      economic_impact: 0.92,
    },
    economic_impact: {
      campaign_earnings: '300 USDC',
      lifetime_earnings_increase: '15000 → 15300 USDC',
      future_rate_multiplier: 1.08,
      premium_campaign_access: true,
    },
    timestamp: new Date().toISOString(),
    ual: `ual:dkg:reputation:${influencerDid}_update_${Date.now()}`,
  };
}

export function getMockApplicationFlow(
  campaignId: string,
  influencerDid: string
): CampaignApplication {
  const now = new Date();
  const states = [
    {
      status: 'discovered',
      timestamp: new Date(now.getTime() - 20 * 60000).toISOString(),
      action: 'AI agent found matching campaign',
    },
    {
      status: 'applied',
      timestamp: new Date(now.getTime() - 15 * 60000).toISOString(),
      action: 'x402 payment submitted for application',
    },
    {
      status: 'verified',
      timestamp: new Date(now.getTime() - 10 * 60000).toISOString(),
      action: 'Trust verification completed - APPROVED',
    },
    {
      status: 'accepted',
      timestamp: new Date(now.getTime() - 5 * 60000).toISOString(),
      action: 'Brand accepted application',
    },
    {
      status: 'content_created',
      timestamp: new Date(now.getTime() - 2 * 60000).toISOString(),
      action: 'Verified content published with tracking',
    },
    {
      status: 'performance_tracking',
      timestamp: new Date(now.getTime() - 1 * 60000).toISOString(),
      action: 'Real-time metrics collection started',
    },
  ];

  return {
    application_id: `app_${influencerDid}_${campaignId}_${Date.now()}`,
    campaign_id: campaignId,
    influencer_did: influencerDid,
    status: 'performance_tracking',
    states,
    payment_proof: {
      txHash: '0x8a3b7c...e45f12',
      amount: '5 USDC',
      currency: 'USDC',
      timestamp: states[1].timestamp,
    },
  };
}

export function getMockCampaignDiscoveryResults(
  influencerDid: string
): {
  search_query: {
    influencer_did: string;
    filters: {
      min_compensation: string;
      max_sybil_risk: number;
      preferred_categories: string[];
    };
  };
  matching_campaigns: Array<{
    campaign_id: string;
    match_score: number;
    reasons: string[];
    estimated_earnings: string;
    application_cost: string;
  }>;
  recommended_application: string;
  confidence_score: number;
} {
  return {
    search_query: {
      influencer_did: influencerDid,
      filters: {
        min_compensation: '150 USDC',
        max_sybil_risk: 0.4,
        preferred_categories: ['technology', 'gadgets'],
      },
    },
    matching_campaigns: [
      {
        campaign_id: 'campaign_techinnovate_sw_001',
        match_score: 0.94,
        reasons: [
          'Perfect audience alignment',
          'Compensation exceeds requirements',
          'Brand reputation: 0.92',
          'Campaign success rate: 96%',
        ],
        estimated_earnings: '275 USDC',
        application_cost: '5 USDC',
      },
      {
        campaign_id: 'campaign_gadget_zone_016',
        match_score: 0.87,
        reasons: [
          'Good category match',
          'Moderate compensation',
          'Brand reputation: 0.85',
        ],
        estimated_earnings: '180 USDC',
        application_cost: '3 USDC',
      },
    ],
    recommended_application: 'campaign_techinnovate_sw_001',
    confidence_score: 0.91,
  };
}

export function getMockPaymentFlow(type: 'application' | 'success'): any {
  const now = new Date().toISOString();
  
  if (type === 'application') {
    return {
      payment_id: `pay_app_tech_guru_001_techinnovate_${Date.now()}`,
      type: 'campaign_application',
      from: 'did:dkg:influencer:tech_guru_alex',
      to: 'did:dkg:brand:techinnovate',
      amount: '5 USDC',
      token: 'USDC',
      status: 'completed',
      timestamp: now,
      transaction_hash: '0x8a3b7c...e45f12',
      conditions: {
        reputation_verification: true,
        application_review: true,
        refund_if_rejected: true,
      },
      result: 'application_submitted',
    };
  } else {
    return {
      payment_id: `pay_success_tech_guru_001_techinnovate_${Date.now()}`,
      type: 'campaign_success',
      from: 'did:dkg:brand:techinnovate',
      to: 'did:dkg:influencer:tech_guru_alex',
      amount: '300 USDC',
      breakdown: {
        base_rate: '200 USDC',
        performance_bonus: '100 USDC',
      },
      token: 'USDC',
      status: 'completed',
      timestamp: now,
      transaction_hash: '0x9b4c8d...f56g23',
      performance_metrics: {
        engagement_rate: 6.2,
        conversion_rate: 3.1,
        content_quality_score: 4.8,
        bonus_conditions_met: true,
      },
      conditions_verified: true,
    };
  }
}

/**
 * Get influencer profile by DID from mock data
 */
export function getMockInfluencerByDID(did: string): InfluencerProfile | null {
  for (const [key, profile] of Object.entries(MOCK_INFLUENCERS)) {
    if (profile.did === did) {
      return profile;
    }
  }
  return null;
}

/**
 * Get campaign by ID from mock data
 */
export function getMockCampaignById(campaignId: string): MockBrandCampaign | null {
  for (const [key, campaign] of Object.entries(MOCK_CAMPAIGNS)) {
    if (campaign.campaign_id === campaignId || campaign.ual === campaignId) {
      return campaign;
    }
  }
  return null;
}

/**
 * Create comparison dashboard data
 */
export function getMockComparisonDashboard(): {
  comparison_date: string;
  compared_influencers: Array<{
    name: string;
    reputation_score: number;
    engagement_rate: number;
    earnings_per_campaign: string;
    campaign_success_rate: number;
    sybil_risk: number;
    tier: string;
  }>;
  key_insights: string[];
} {
  return {
    comparison_date: new Date().toISOString().split('T')[0],
    compared_influencers: [
      {
        name: 'Alex TechReview',
        reputation_score: 0.91,
        engagement_rate: 6.2,
        earnings_per_campaign: '285 USDC',
        campaign_success_rate: 0.97,
        sybil_risk: 0.15,
        tier: 'premium',
      },
      {
        name: 'Sarah FitTech',
        reputation_score: 0.72,
        engagement_rate: 4.2,
        earnings_per_campaign: '180 USDC',
        campaign_success_rate: 0.85,
        sybil_risk: 0.28,
        tier: 'standard',
      },
      {
        name: 'TechReview Network',
        reputation_score: 0.35,
        engagement_rate: 1.2,
        earnings_per_campaign: '50 USDC',
        campaign_success_rate: 0.33,
        sybil_risk: 0.82,
        tier: 'restricted',
      },
    ],
    key_insights: [
      'High-reputation influencers deliver 3x better engagement',
      'Economic stake correlates strongly with campaign success',
      'Sybil detection prevents 92% of fraudulent campaigns',
      'Quality creators earn 5.7x more than low-reputation accounts',
    ],
  };
}

export default {
  MOCK_CAMPAIGNS,
  MOCK_INFLUENCERS,
  getMockTrustVerificationReport,
  getMockPerformanceMetrics,
  getMockReputationUpdate,
  getMockApplicationFlow,
  getMockCampaignDiscoveryResults,
  getMockPaymentFlow,
  getMockInfluencerByDID,
  getMockCampaignById,
  getMockComparisonDashboard,
};

