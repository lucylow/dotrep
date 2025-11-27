/**
 * Campaign Demo Example
 * 
 * Complete example demonstrating the endorsement campaign workflow
 */

import { createCampaignService } from '../campaign-service';
import { runDemoCampaignWorkflow, runSybilDetectionDemo } from '../demo-campaign-workflow';
import { MOCK_CAMPAIGNS, MOCK_INFLUENCERS } from '../demo-mock-data';
import type { DKGConfig } from '../dkg-client-v8';

/**
 * Example 1: Run the complete demo workflow
 */
export async function example1_FullDemo() {
  console.log('🎮 Running Full Campaign Demo Workflow\n');

  const result = await runDemoCampaignWorkflow({
    useMockData: true,
    useMockMode: true,
  });

  console.log('\n📊 Demo Results:');
  console.log(`- Campaign UAL: ${result.campaign.ual}`);
  console.log(`- Matching Campaigns Found: ${result.discovery.matching_campaigns.length}`);
  console.log(`- Trust Score: ${result.verification.overall_trust_score.toFixed(2)}`);
  console.log(`- Application Status: ${result.application.status}`);
  console.log(`- Engagement Rate: ${result.performance.content_metrics.engagement_rate}%`);
  console.log(`- Reputation Change: +${(result.reputation.new_reputation.overall_score - result.reputation.previous_reputation.overall_score).toFixed(3)}`);

  return result;
}

/**
 * Example 2: Sybil Detection Comparison
 */
export async function example2_SybilDetection() {
  console.log('🛡️  Running Sybil Detection Comparison Demo\n');

  const result = await runSybilDetectionDemo({
    useMockData: true,
    useMockMode: true,
  });

  console.log('\n📊 Comparison Results:');
  console.log(`- Real Account Trust Score: ${result.realAccount.verification.overall_trust_score.toFixed(2)}`);
  console.log(`- Sybil Account Trust Score: ${result.suspectedSybil.verification.overall_trust_score.toFixed(2)}`);
  console.log(`- Trust Score Difference: ${result.comparison.trustScoreDifference.toFixed(2)}`);
  console.log(`- Risk Difference: ${result.comparison.riskDifference.toFixed(2)}`);
  console.log(`- Real Recommendation: ${result.comparison.recommendation.real}`);
  console.log(`- Sybil Recommendation: ${result.comparison.recommendation.sybil}`);

  return result;
}

/**
 * Example 3: Create and Manage Campaign
 */
export async function example3_CreateCampaign() {
  console.log('📝 Creating Campaign Example\n');

  const service = createCampaignService({
    useMockMode: true,
    fallbackToMock: true,
  });

  const brandDid = 'did:dkg:brand:techinnovate';
  const mockCampaign = MOCK_CAMPAIGNS.techinnovate_sw_001;

  // Create campaign
  const { campaign, ual } = await service.createCampaign(brandDid, {
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
  });

  console.log(`✅ Campaign created with UAL: ${ual}`);
  console.log(`   Name: ${campaign.name}`);
  console.log(`   Status: ${campaign.status}`);
  console.log(`   Base Rate: ${campaign.compensation.baseRate}`);
  console.log(`   Min Reputation: ${campaign.requirements.minReputation}`);

  return { campaign, ual };
}

/**
 * Example 4: Discover Campaigns
 */
export async function example4_DiscoverCampaigns() {
  console.log('🔍 Campaign Discovery Example\n');

  const service = createCampaignService({
    useMockMode: true,
  });

  const influencer = MOCK_INFLUENCERS.tech_guru_alex;

  // First, create a campaign to discover
  const { campaign, ual } = await example3_CreateCampaign();

  // Discover matching campaigns
  const discovery = await service.discoverCampaigns(influencer, {
    minCompensation: '150 USDC',
    maxSybilRisk: 0.4,
    preferredCategories: ['technology', 'gadgets'],
  });

  console.log(`\n✅ Discovery Results:`);
  console.log(`   Found ${discovery.matching_campaigns.length} matching campaigns`);
  
  if (discovery.matching_campaigns.length > 0) {
    const topMatch = discovery.matching_campaigns[0];
    console.log(`   Top Match Score: ${topMatch.match_score.toFixed(2)}`);
    console.log(`   Estimated Earnings: ${topMatch.estimated_earnings}`);
    console.log(`   Reasons:`);
    topMatch.reasons.forEach((reason, idx) => {
      console.log(`     ${idx + 1}. ${reason}`);
    });
  }

  return discovery;
}

/**
 * Example 5: Complete Workflow
 */
export async function example5_CompleteWorkflow() {
  console.log('🔄 Complete Campaign Workflow Example\n');

  const service = createCampaignService({
    useMockMode: true,
  });

  const brandDid = 'did:dkg:brand:techinnovate';
  const influencer = MOCK_INFLUENCERS.tech_guru_alex;

  // Step 1: Create campaign
  console.log('Step 1: Creating campaign...');
  const { campaign, ual } = await example3_CreateCampaign();

  // Step 2: Discover campaigns
  console.log('\nStep 2: Discovering campaigns...');
  const discovery = await service.discoverCampaigns(influencer);

  // Step 3: Verify trust
  console.log('\nStep 3: Verifying trust...');
  const verification = await service.verifyTrust(influencer.did, ual);
  console.log(`   Trust Score: ${verification.overall_trust_score.toFixed(2)}`);
  console.log(`   Recommendation: ${verification.sybil_risk_assessment.recommendation}`);

  // Step 4: Apply to campaign
  console.log('\nStep 4: Applying to campaign...');
  const application = await service.applyToCampaign(ual, influencer.did, '5 USDC');
  console.log(`   Application ID: ${application.application_id}`);
  console.log(`   Status: ${application.status}`);

  // Step 5: Execute endorsement
  console.log('\nStep 5: Executing endorsement...');
  const endorsement = await service.executeEndorsement(application.application_id, [
    { type: 'video', url: 'https://example.com/video', description: 'Review video' },
  ]);
  console.log(`   Engagement Rate: ${endorsement.performanceMetrics.content_metrics.engagement_rate}%`);
  console.log(`   Conversion Rate: ${endorsement.performanceMetrics.conversion_metrics.conversion_rate}%`);

  // Step 6: Update reputation
  console.log('\nStep 6: Updating reputation...');
  const reputationUpdate = await service.updateReputation(
    influencer.did,
    endorsement.performanceMetrics
  );
  console.log(`   Score Change: ${reputationUpdate.previous_reputation.overall_score.toFixed(2)} → ${reputationUpdate.new_reputation.overall_score.toFixed(2)}`);
  console.log(`   Earnings: ${reputationUpdate.economic_impact.campaign_earnings}`);

  console.log('\n✅ Complete workflow finished successfully!');

  return {
    campaign,
    discovery,
    verification,
    application,
    endorsement,
    reputationUpdate,
  };
}

/**
 * Main example runner
 */
export async function runExample(exampleNumber: number) {
  const examples: Record<number, () => Promise<any>> = {
    1: example1_FullDemo,
    2: example2_SybilDetection,
    3: example3_CreateCampaign,
    4: example4_DiscoverCampaigns,
    5: example5_CompleteWorkflow,
  };

  const example = examples[exampleNumber];
  if (!example) {
    console.error(`❌ Example ${exampleNumber} not found. Available: 1-5`);
    return;
  }

  try {
    await example();
  } catch (error: any) {
    console.error(`❌ Example ${exampleNumber} failed:`, error.message);
    throw error;
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🚀 Running All Campaign Demo Examples\n');
  console.log('=' .repeat(50) + '\n');

  for (let i = 1; i <= 5; i++) {
    console.log(`\n📦 Example ${i}`);
    console.log('-'.repeat(50));
    await runExample(i);
    console.log('\n');
  }

  console.log('✅ All examples completed!');
}

// Run if executed directly
if (require.main === module) {
  const exampleNumber = process.argv[2] ? parseInt(process.argv[2]) : 1;
  
  if (exampleNumber === 0) {
    runAllExamples();
  } else {
    runExample(exampleNumber);
  }
}

export default {
  runExample,
  runAllExamples,
  example1_FullDemo,
  example2_SybilDetection,
  example3_CreateCampaign,
  example4_DiscoverCampaigns,
  example5_CompleteWorkflow,
};

