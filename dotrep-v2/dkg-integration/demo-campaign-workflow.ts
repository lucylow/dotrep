/**
 * Demo Campaign Workflow
 * 
 * Complete end-to-end demonstration of the Tech Gadget Launch campaign scenario:
 * 1. Brand Creates Campaign
 * 2. Influencer Discovery
 * 3. Trust Verification
 * 4. Endorsement Execution
 * 5. Reputation Update
 */

import { CampaignService, createCampaignService } from './campaign-service';
import {
  MOCK_CAMPAIGNS,
  MOCK_INFLUENCERS,
  getMockTrustVerificationReport,
  getMockPerformanceMetrics,
  getMockReputationUpdate,
  getMockCampaignDiscoveryResults,
  getMockPaymentFlow,
  getMockComparisonDashboard,
} from './demo-mock-data';
import type { DKGConfig } from './dkg-client-v8';

export interface DemoWorkflowResult {
  campaign: any;
  discovery: any;
  verification: any;
  application: any;
  performance: any;
  reputation: any;
  timeline: Array<{
    step: string;
    timestamp: string;
    duration: string;
    status: 'success' | 'pending' | 'failed';
  }>;
}

/**
 * Run the complete demo workflow
 */
export async function runDemoCampaignWorkflow(
  config?: DKGConfig & { useMockData?: boolean }
): Promise<DemoWorkflowResult> {
  const useMockData = config?.useMockData !== false;
  const campaignService = createCampaignService({
    ...config,
    useMockMode: useMockData || config?.useMockMode,
  });

  const timeline: Array<{
    step: string;
    timestamp: string;
    duration: string;
    status: 'success' | 'pending' | 'failed';
  }> = [];

  console.log('\n🎮 ========================================');
  console.log('   DEMO SCENARIO: Tech Gadget Launch');
  console.log('========================================\n');

  // Step 1: Brand Creates Campaign
  console.log('📝 STEP 1: Brand Creates Campaign');
  console.log('-----------------------------------');
  const step1Start = Date.now();
  
  const mockCampaign = MOCK_CAMPAIGNS.techinnovate_sw_001;
  const campaign = await campaignService.createCampaign(
    mockCampaign.brand.did,
    {
      name: mockCampaign.campaign_details.title,
      description: mockCampaign.campaign_details.description,
      requirements: {
        minReputation: mockCampaign.requirements.min_reputation,
        minStake: mockCampaign.requirements.min_stake,
        targetAudience: mockCampaign.requirements.target_audience,
        sybilRiskThreshold: mockCampaign.requirements.sybil_risk_threshold,
        contentQuality: 'high_engagement' as const,
      },
      compensation: {
        baseRate: mockCampaign.compensation.base_rate,
        performanceBonus: mockCampaign.compensation.performance_bonus,
        paymentToken: mockCampaign.compensation.payment_token,
        bonusConditions: mockCampaign.compensation.bonus_conditions,
      },
      verification: {
        completionProof: 'usage_verification_7days',
        qualityMetrics: mockCampaign.verification.quality_metrics_tracked,
        disputeResolution: 'arbitration_dao',
      },
      campaignDuration: {
        startDate: mockCampaign.created_date,
        endDate: new Date(new Date(mockCampaign.created_date).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      expectedReach: '50K+ viewers',
    }
  );

  const step1Duration = ((Date.now() - step1Start) / 1000).toFixed(2);
  timeline.push({
    step: 'Campaign Creation & DKG Publishing',
    timestamp: new Date().toISOString(),
    duration: `${step1Duration}s`,
    status: 'success',
  });

  console.log(`✅ Campaign created in ${step1Duration}s\n`);

  // Step 2: Influencer Discovery
  console.log('🔍 STEP 2: Influencer Discovery');
  console.log('-----------------------------------');
  const step2Start = Date.now();

  const influencer = MOCK_INFLUENCERS.tech_guru_alex;
  const discovery = await campaignService.discoverCampaigns(influencer, {
    minCompensation: '150 USDC',
    maxSybilRisk: 0.4,
    preferredCategories: ['technology', 'gadgets'],
  });

  const step2Duration = ((Date.now() - step2Start) / 1000).toFixed(2);
  timeline.push({
    step: 'AI Agent Discovery & x402 Application',
    timestamp: new Date().toISOString(),
    duration: `${step2Duration}s`,
    status: 'success',
  });

  console.log(`✅ Found ${discovery.matching_campaigns.length} matching campaigns in ${step2Duration}s\n`);

  // Step 3: Trust Verification
  console.log('🛡️  STEP 3: Trust Verification');
  console.log('-----------------------------------');
  const step3Start = Date.now();

  const verification = await campaignService.verifyTrust(
    influencer.did,
    campaign.ual || campaign.campaign['@id']
  );

  const step3Duration = ((Date.now() - step3Start) / 1000).toFixed(2);
  timeline.push({
    step: 'Live Sybil Detection & Trust Verification',
    timestamp: new Date().toISOString(),
    duration: `${step3Duration}s`,
    status: verification.sybil_risk_assessment.recommendation === 'REJECT' ? 'failed' : 'success',
  });

  console.log(`✅ Verification completed in ${step3Duration}s`);
  console.log(`   Recommendation: ${verification.sybil_risk_assessment.recommendation}\n`);

  // Step 4: Apply to Campaign
  console.log('💸 STEP 4: Apply to Campaign via x402');
  console.log('-----------------------------------');
  const step4Start = Date.now();

  const application = await campaignService.applyToCampaign(
    campaign.ual || campaign.campaign['@id'],
    influencer.did,
    '5 USDC'
  );

  const step4Duration = ((Date.now() - step4Start) / 1000).toFixed(2);
  timeline.push({
    step: 'x402 Payment Application',
    timestamp: new Date().toISOString(),
    duration: `${step4Duration}s`,
    status: 'success',
  });

  console.log(`✅ Application submitted in ${step4Duration}s\n`);

  // Step 5: Execute Endorsement
  console.log('📱 STEP 5: Execute Endorsement');
  console.log('-----------------------------------');
  const step5Start = Date.now();

  const endorsement = await campaignService.executeEndorsement(
    application.application_id,
    [
      {
        type: 'video',
        url: 'https://example.com/video',
        description: 'Smartwatch review video',
      },
    ]
  );

  const step5Duration = ((Date.now() - step5Start) / 1000).toFixed(2);
  timeline.push({
    step: 'Content Execution & Automated Payment',
    timestamp: new Date().toISOString(),
    duration: `${step5Duration}s`,
    status: 'success',
  });

  console.log(`✅ Endorsement executed in ${step5Duration}s`);
  console.log(`   Engagement Rate: ${endorsement.performanceMetrics.content_metrics.engagement_rate}%`);
  console.log(`   Conversion Rate: ${endorsement.performanceMetrics.conversion_metrics.conversion_rate}%\n`);

  // Step 6: Update Reputation
  console.log('📈 STEP 6: Update Reputation');
  console.log('-----------------------------------');
  const step6Start = Date.now();

  const reputationUpdate = await campaignService.updateReputation(
    influencer.did,
    endorsement.performanceMetrics
  );

  const step6Duration = ((Date.now() - step6Start) / 1000).toFixed(2);
  timeline.push({
    step: 'Reputation Update & Economic Impact',
    timestamp: new Date().toISOString(),
    duration: `${step6Duration}s`,
    status: 'success',
  });

  console.log(`✅ Reputation updated in ${step6Duration}s`);
  console.log(`   Score Change: ${reputationUpdate.previous_reputation.overall_score.toFixed(2)} → ${reputationUpdate.new_reputation.overall_score.toFixed(2)}`);
  console.log(`   Future Multiplier: ${reputationUpdate.economic_impact.future_rate_multiplier.toFixed(2)}x\n`);

  // Demo Summary
  console.log('📊 ========================================');
  console.log('   DEMO SUMMARY');
  console.log('========================================\n');

  const totalDuration = timeline.reduce((sum, t) => sum + parseFloat(t.duration), 0);
  console.log(`⏱️  Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`💰 Total Earnings: ${reputationUpdate.economic_impact.campaign_earnings}`);
  console.log(`📈 Reputation Increase: +${(reputationUpdate.new_reputation.overall_score - reputationUpdate.previous_reputation.overall_score).toFixed(3)}`);
  console.log(`🎯 Campaign Status: ${campaign.campaign.status || 'completed'}\n`);

  // Comparison Dashboard
  console.log('📊 ========================================');
  console.log('   INFLUENCER COMPARISON');
  console.log('========================================\n');

  const comparison = getMockComparisonDashboard();
  comparison.compared_influencers.forEach((inf, idx) => {
    console.log(`${idx + 1}. ${inf.name}`);
    console.log(`   Reputation: ${inf.reputation_score.toFixed(2)} | Engagement: ${inf.engagement_rate}%`);
    console.log(`   Earnings/Campaign: ${inf.earnings_per_campaign} | Sybil Risk: ${inf.sybil_risk.toFixed(2)}`);
    console.log(`   Tier: ${inf.tier.toUpperCase()}\n`);
  });

  console.log('💡 Key Insights:');
  comparison.key_insights.forEach((insight, idx) => {
    console.log(`   ${idx + 1}. ${insight}`);
  });

  console.log('\n✅ ========================================');
  console.log('   DEMO COMPLETED SUCCESSFULLY');
  console.log('========================================\n');

  return {
    campaign,
    discovery,
    verification,
    application,
    performance: endorsement.performanceMetrics,
    reputation: reputationUpdate,
    timeline,
  };
}

/**
 * Run Sybil Detection Comparison Demo
 */
export async function runSybilDetectionDemo(
  config?: DKGConfig & { useMockData?: boolean }
): Promise<{
  realAccount: any;
  suspectedSybil: any;
  comparison: any;
}> {
  const campaignService = createCampaignService({
    ...config,
    useMockMode: config?.useMockData !== false || config?.useMockMode,
  });

  console.log('\n🛡️  ========================================');
  console.log('   SYBIL DETECTION COMPARISON');
  console.log('========================================\n');

  const realAccount = MOCK_INFLUENCERS.tech_guru_alex;
  const suspectedSybil = MOCK_INFLUENCERS.suspected_bot_network;

  const realVerification = await campaignService.verifyTrust(
    realAccount.did,
    'campaign_techinnovate_sw_001'
  );

  const sybilVerification = await campaignService.verifyTrust(
    suspectedSybil.did,
    'campaign_techinnovate_sw_001'
  );

  console.log('📊 Real Account Analysis:');
  console.log(`   Trust Score: ${realVerification.overall_trust_score.toFixed(2)}`);
  console.log(`   Sybil Risk: ${realVerification.sybil_risk_assessment.overall_risk.toFixed(2)} (${realVerification.sybil_risk_assessment.risk_level})`);
  console.log(`   Recommendation: ${realVerification.sybil_risk_assessment.recommendation}\n`);

  console.log('🚨 Suspected Sybil Account Analysis:');
  console.log(`   Trust Score: ${sybilVerification.overall_trust_score.toFixed(2)}`);
  console.log(`   Sybil Risk: ${sybilVerification.sybil_risk_assessment.overall_risk.toFixed(2)} (${sybilVerification.sybil_risk_assessment.risk_level})`);
  console.log(`   Recommendation: ${sybilVerification.sybil_risk_assessment.recommendation}`);
  
  if (sybilVerification.sybil_risk_assessment.red_flags) {
    console.log(`   Red Flags:`);
    sybilVerification.sybil_risk_assessment.red_flags.forEach((flag, idx) => {
      console.log(`     ${idx + 1}. ${flag}`);
    });
  }

  console.log('\n✅ ========================================');
  console.log('   SYBIL DETECTION DEMO COMPLETE');
  console.log('========================================\n');

  return {
    realAccount: {
      profile: realAccount,
      verification: realVerification,
    },
    suspectedSybil: {
      profile: suspectedSybil,
      verification: sybilVerification,
    },
    comparison: {
      trustScoreDifference: realVerification.overall_trust_score - sybilVerification.overall_trust_score,
      riskDifference: sybilVerification.sybil_risk_assessment.overall_risk - realVerification.sybil_risk_assessment.overall_risk,
      recommendation: {
        real: realVerification.sybil_risk_assessment.recommendation,
        sybil: sybilVerification.sybil_risk_assessment.recommendation,
      },
    },
  };
}

/**
 * Main demo runner
 */
export async function runDemo(
  demoType: 'full' | 'sybil' = 'full',
  config?: DKGConfig & { useMockData?: boolean }
): Promise<any> {
  try {
    if (demoType === 'sybil') {
      return await runSybilDetectionDemo(config);
    } else {
      return await runDemoCampaignWorkflow(config);
    }
  } catch (error: any) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

export default {
  runDemo,
  runDemoCampaignWorkflow,
  runSybilDetectionDemo,
};

