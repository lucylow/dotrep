# Campaign Management & Demo System

## Overview

This system implements a complete endorsement campaign workflow demonstrating the integration of:
- **OriginTrail DKG** for publishing campaigns as Knowledge Assets
- **x402 Payment Protocol** for application and success payments
- **AI Agents** for influencer discovery and matching
- **Sybil Detection** for trust verification
- **Reputation Updates** based on campaign performance

## 🎮 Demo Scenario: "Tech Gadget Launch"

The complete demo follows this workflow:

### Step 1: Brand Creates Campaign
- Publishes endorsement offer as DKG Knowledge Asset
- Sets requirements: rep > 0.8, stake > 2000 TRAC
- Offers: $200 base + $100 performance bonus

### Step 2: Influencer Discovery
- AI agent queries DKG for matching campaigns
- Filters by reputation requirements, payment terms
- Applies via x402 payment of $5 discovery fee

### Step 3: Trust Verification
- System runs Sybil detection on influencer
- Checks graph connectivity, stake history, behavior patterns
- Returns verifiable trust score to brand

### Step 4: Endorsement Execution
- Influencer creates content, posts with verification
- Engagement metrics recorded to DKG
- Automatic payment via x402 upon verification

### Step 5: Reputation Update
- Success metrics update influencer's reputation score
- High performance increases future earning potential
- All data stored as verifiable Knowledge Assets

## 📦 Components

### 1. CampaignService (`campaign-service.ts`)

Main service class that orchestrates the entire campaign workflow:

```typescript
import { createCampaignService } from './campaign-service';

const campaignService = createCampaignService({
  useMockMode: true, // Use mock mode for demo
  fallbackToMock: true
});

// Create a campaign
const { campaign, ual } = await campaignService.createCampaign(
  'did:dkg:brand:techinnovate',
  {
    name: 'AI-Powered Smartwatch Launch',
    description: 'Review our new SmartWatch Pro...',
    requirements: {
      minReputation: 0.75,
      minStake: '1000 TRAC',
      targetAudience: ['tech_enthusiasts', 'fitness'],
      sybilRiskThreshold: 0.35,
      contentQuality: 'high_engagement'
    },
    compensation: {
      baseRate: '200 USDC',
      performanceBonus: '100 USDC',
      paymentToken: 'USDC',
      bonusConditions: {
        engagementRate: '>4%',
        conversionRate: '>1.5%'
      }
    },
    verification: {
      completionProof: 'usage_verification_7days',
      qualityMetrics: ['engagement', 'conversions'],
      disputeResolution: 'arbitration_dao'
    },
    campaignDuration: {
      startDate: '2025-11-01T10:00:00Z',
      endDate: '2025-11-30T23:59:59Z'
    }
  }
);
```

### 2. Demo Mock Data (`demo-mock-data.ts`)

Provides comprehensive mock data for demonstrations:

```typescript
import {
  MOCK_CAMPAIGNS,
  MOCK_INFLUENCERS,
  getMockTrustVerificationReport,
  getMockPerformanceMetrics,
  getMockReputationUpdate,
  getMockCampaignDiscoveryResults
} from './demo-mock-data';

// Get mock campaign
const campaign = MOCK_CAMPAIGNS.techinnovate_sw_001;

// Get mock influencer
const influencer = MOCK_INFLUENCERS.tech_guru_alex;

// Get trust verification report
const verification = getMockTrustVerificationReport(
  influencer.did,
  campaign.ual,
  'high' // or 'medium' | 'suspected'
);
```

### 3. Demo Workflow (`demo-campaign-workflow.ts`)

Runs the complete end-to-end demo:

```typescript
import { runDemoCampaignWorkflow, runSybilDetectionDemo } from './demo-campaign-workflow';

// Run full workflow
const result = await runDemoCampaignWorkflow({
  useMockData: true
});

// Run Sybil detection comparison
const sybilDemo = await runSybilDetectionDemo({
  useMockData: true
});
```

## 🚀 Usage Examples

### Basic Campaign Creation

```typescript
import { createCampaignService } from './dkg-integration/campaign-service';

const service = createCampaignService({
  useMockMode: true
});

const { campaign, ual } = await service.createCampaign(
  'did:dkg:brand:example',
  {
    name: 'Product Launch Campaign',
    description: 'Looking for tech influencers...',
    requirements: {
      minReputation: 0.8,
      minStake: '2000 TRAC',
      targetAudience: ['tech'],
      sybilRiskThreshold: 0.3,
      contentQuality: 'high_engagement'
    },
    compensation: {
      baseRate: '200 USDC',
      performanceBonus: '100 USDC',
      paymentToken: 'USDC',
      bonusConditions: {
        engagementRate: '>5%'
      }
    },
    verification: {
      completionProof: 'usage_verification_7days',
      qualityMetrics: ['engagement'],
      disputeResolution: 'arbitration_dao'
    },
    campaignDuration: {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  }
);
```

### Influencer Discovery

```typescript
const influencer = {
  influencer_id: 'influencer_001',
  did: 'did:dkg:influencer:alice',
  profile: {
    name: 'Alice TechReview',
    niche: 'technology',
    followers: 100000,
    engagement_rate: 6.5,
    audience_demographics: {}
  },
  reputation_metrics: {
    overall_score: 0.89,
    social_rank: 0.92,
    economic_stake: 0.85,
    endorsement_quality: 0.91,
    temporal_consistency: 0.88
  },
  economic_data: {
    staked_tokens: '5000 TRAC',
    stake_duration_days: 180,
    total_earnings: '15000 USDC',
    completed_campaigns: 23,
    success_rate: 0.96
  },
  sybil_resistance: {
    unique_identity_proof: true,
    graph_cluster_analysis: 'low_risk',
    behavior_anomaly_score: 0.12,
    connection_diversity: 0.88
  }
};

const discovery = await service.discoverCampaigns(influencer, {
  minCompensation: '150 USDC',
  maxSybilRisk: 0.4,
  preferredCategories: ['technology']
});

console.log(`Found ${discovery.matching_campaigns.length} matching campaigns`);
console.log(`Recommended: ${discovery.recommended_application}`);
```

### Trust Verification

```typescript
const verification = await service.verifyTrust(
  'did:dkg:influencer:alice',
  campaign.ual
);

console.log(`Trust Score: ${verification.overall_trust_score}`);
console.log(`Sybil Risk: ${verification.sybil_risk_assessment.overall_risk}`);
console.log(`Recommendation: ${verification.sybil_risk_assessment.recommendation}`);
```

### Apply to Campaign

```typescript
const application = await service.applyToCampaign(
  campaign.ual,
  'did:dkg:influencer:alice',
  '5 USDC' // Application fee
);

console.log(`Application ID: ${application.application_id}`);
console.log(`Status: ${application.status}`);
console.log(`Payment TX: ${application.payment_proof?.txHash}`);
```

### Execute Endorsement

```typescript
const result = await service.executeEndorsement(
  application.application_id,
  [
    {
      type: 'video',
      url: 'https://example.com/video',
      description: 'Product review video'
    }
  ]
);

console.log(`Engagement Rate: ${result.performanceMetrics.content_metrics.engagement_rate}%`);
console.log(`Conversion Rate: ${result.performanceMetrics.conversion_metrics.conversion_rate}%`);
```

### Update Reputation

```typescript
const reputationUpdate = await service.updateReputation(
  'did:dkg:influencer:alice',
  result.performanceMetrics
);

console.log(`Previous Score: ${reputationUpdate.previous_reputation.overall_score}`);
console.log(`New Score: ${reputationUpdate.new_reputation.overall_score}`);
console.log(`Earnings: ${reputationUpdate.economic_impact.campaign_earnings}`);
```

## 🎯 Running the Complete Demo

### Full Workflow Demo

```typescript
import { runDemoCampaignWorkflow } from './dkg-integration/demo-campaign-workflow';

const result = await runDemoCampaignWorkflow({
  useMockData: true,
  useMockMode: true
});

// Access results
console.log('Campaign:', result.campaign);
console.log('Discovery:', result.discovery);
console.log('Verification:', result.verification);
console.log('Performance:', result.performance);
console.log('Reputation:', result.reputation);
console.log('Timeline:', result.timeline);
```

### Sybil Detection Demo

```typescript
import { runSybilDetectionDemo } from './dkg-integration/demo-campaign-workflow';

const sybilDemo = await runSybilDetectionDemo({
  useMockData: true
});

console.log('Real Account:', sybilDemo.realAccount);
console.log('Suspected Sybil:', sybilDemo.suspectedSybil);
console.log('Comparison:', sybilDemo.comparison);
```

## 📊 Mock Data Structure

The demo includes comprehensive mock data:

### Campaigns
- `techinnovate_sw_001`: TechInnovate Smartwatch Launch Campaign

### Influencers
- `tech_guru_alex`: High-reputation tech influencer (score: 0.89)
- `fitness_tech_sarah`: Medium-reputation fitness tech influencer (score: 0.72)
- `suspected_bot_network`: Low-reputation suspected Sybil account (score: 0.35)

### Verification Reports
- High-trust verification report
- Sybil risk verification report

### Performance Metrics
- Complete campaign performance data
- Engagement, conversion, and quality metrics

### Payment Flows
- Application payment flow
- Success payment flow with bonuses

## 🔧 Configuration

### DKG Configuration

```typescript
const config = {
  endpoint: 'https://v6-pegasus-node-02.origin-trail.network:8900',
  blockchain: {
    name: 'otp:20430',
    privateKey: process.env.DKG_PUBLISH_WALLET
  },
  environment: 'testnet', // or 'mainnet' | 'local'
  useMockMode: false, // Set to true for demo without DKG connection
  fallbackToMock: true // Automatically fallback if DKG unavailable
};
```

### Mock Mode

For demos and testing, you can use mock mode:

```typescript
const service = createCampaignService({
  useMockMode: true,
  fallbackToMock: true
});
```

This allows running the complete workflow without requiring:
- DKG node connection
- Blockchain wallet
- Actual payments

## 🎬 Demo Features

### 1. Live Sybil Detection
- Real-time analysis of fake vs real accounts
- Graph connectivity analysis
- Behavioral pattern detection

### 2. Trust Visualization
- Interactive graph display
- Risk heat maps
- Cluster detection

### 3. Auto-Payment Demo
- x402 payment flow from discovery to payment
- Automatic bonus calculation
- Payment evidence recording

### 4. DKG Verification
- Campaign data anchored on DKG
- Verifiable reputation updates
- Immutable audit trail

### 5. Economic Impact
- Quality creators earn more
- Reputation-based pricing
- Future multiplier effects

## 📝 Integration with Existing Systems

### x402 Payment Integration

The campaign service integrates with x402 payment infrastructure:

```typescript
// Application payment
const application = await service.applyToCampaign(campaignId, influencerDid, '5 USDC');

// Automatic success payment
await service.triggerAutomaticPayment(application, campaign, metrics);
```

### DKG Publishing

Campaigns are published as JSON-LD Knowledge Assets:

```typescript
const { campaign, ual } = await service.createCampaign(brandDid, campaignData);

// Campaign is automatically published to DKG
// Can be queried using the UAL
```

### AI Agent Integration

Uses existing AI agent infrastructure:

```typescript
// Discovery uses TrustNavigatorAgent
const discovery = await service.discoverCampaigns(influencer);

// Verification uses SybilDetectiveAgent
const verification = await service.verifyTrust(influencerDid, campaignId);
```

## 🚨 Error Handling

The service includes comprehensive error handling:

```typescript
try {
  const result = await service.createCampaign(brandDid, campaignData);
} catch (error) {
  if (error.message.includes('DKG')) {
    // Handle DKG connection errors
  } else if (error.message.includes('payment')) {
    // Handle payment errors
  } else {
    // Handle other errors
  }
}
```

## 📈 Performance Considerations

- **Mock Mode**: Instant execution, no network calls
- **DKG Mode**: Network latency depends on DKG node
- **Batch Operations**: Use batch methods for multiple campaigns

## 🔒 Security Features

- **Sybil Detection**: Multi-dimensional verification
- **Payment Verification**: x402 challenge-response
- **DKG Anchoring**: Immutable audit trail
- **Reputation Gating**: Quality control through reputation

## 📚 Additional Resources

- [Campaign Service API](./campaign-service.ts)
- [Demo Mock Data](./demo-mock-data.ts)
- [Demo Workflow](./demo-campaign-workflow.ts)
- [DKG Client V8](./dkg-client-v8.ts)

## 🎯 Next Steps

1. Run the full demo workflow
2. Customize mock data for your use case
3. Integrate with real DKG node
4. Connect to x402 payment gateway
5. Extend with additional verification methods

## 📞 Support

For questions or issues:
- Check the inline documentation in source files
- Review the demo workflow examples
- Test with mock mode first before connecting to real DKG

---

**Note**: This system is designed for demonstration purposes. For production use, ensure proper:
- Error handling
- Payment verification
- DKG node configuration
- Security measures

