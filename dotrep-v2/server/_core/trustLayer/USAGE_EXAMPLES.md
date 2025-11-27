# Trust Layer Usage Examples

## Overview

This document provides practical examples of using the Trust Layer in your applications.

## Basic Staking Operations

### Stake Tokens

```typescript
import { getStakingSystem } from './_core/trustLayer';

const staking = getStakingSystem();

// Stake 5,000 TRAC to reach VERIFIED tier
const result = await staking.stake(
  'did:example:user1',
  BigInt(5000) * BigInt(10 ** 18),
  'VERIFIED'
);

console.log(`New tier: ${result.newTier}`);
console.log(`Locked until: ${new Date(result.lockedUntil).toISOString()}`);
console.log(`Reputation multiplier: ${result.reputationMultiplier}%`);
```

### Check Stake Status

```typescript
const stake = staking.getUserStake('did:example:user1');

if (stake) {
  console.log(`Total staked: ${stake.totalStaked.toString()}`);
  console.log(`Current tier: ${stake.tier}`);
  console.log(`Reputation multiplier: ${stake.reputationMultiplier}%`);
  console.log(`Slashable amount: ${stake.slashableAmount.toString()}`);
}
```

### Unstake Tokens

```typescript
// Unstake 1,000 TRAC (only if lock period expired)
const result = await staking.unstake(
  'did:example:user1',
  BigInt(1000) * BigInt(10 ** 18)
);

console.log(`Remaining stake: ${result.remainingStake.toString()}`);
console.log(`New tier: ${result.newTier}`);
```

## Payment Operations

### Create Payment Request

```typescript
import { getX402PaymentHandler } from './_core/trustLayer';

const payments = getX402PaymentHandler();

const payment = await payments.createPaymentRequest({
  from: 'did:example:brand1',
  to: 'platform_treasury',
  amount: 5000000, // $5 USDC (6 decimals)
  resource: 'discovery_access_123',
  conditions: {
    maxResults: 50,
    qualityThreshold: 0.7,
    expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  }
});

console.log(`Payment ID: ${payment.id}`);
console.log(`Status: ${payment.status}`);
```

### Complete Payment

```typescript
const success = await payments.completePayment(
  payment.id,
  'verification_proof_hash'
);

if (success) {
  console.log('Payment completed successfully');
}
```

### Get Payment Statistics

```typescript
const stats = payments.getPaymentStatistics('did:example:influencer1');

console.log(`Total transactions: ${stats.totalTransactions}`);
console.log(`Success rate: ${(stats.successRate * 100).toFixed(2)}%`);
console.log(`Dispute rate: ${(stats.disputeRate * 100).toFixed(2)}%`);
console.log(`Total received: $${stats.totalReceived / 10 ** 6}`);
```

## Escrow Operations

### Create Escrow Deal

```typescript
import { getTrustEscrow } from './_core/trustLayer';

const escrow = getTrustEscrow();

const deal = await escrow.createEscrow(
  'did:example:brand1',
  'did:example:influencer1',
  BigInt(200000000), // $200 USDC (6 decimals)
  0.7, // 70% performance threshold
  'verification_hash_123',
  {
    campaignId: 'campaign_123',
    createdAt: Date.now()
  }
);

console.log(`Deal ID: ${deal.dealId}`);
console.log(`Total amount: ${deal.totalAmount.toString()}`);

// Activate the deal
await escrow.activateDeal(deal.dealId);
```

### Release Escrow Payment

```typescript
const performanceProof = {
  engagementRate: 0.06, // 6%
  conversions: 150,
  qualityRating: 4.5,
  verifiedAt: Date.now(),
  verifier: 'platform_verifier'
};

const result = await escrow.releasePayment(
  deal.dealId,
  performanceProof,
  deal.totalAmount,
  true // isVerifier
);

console.log(`Released: ${result.releasedAmount.toString()}`);
console.log(`Remaining: ${result.remainingAmount.toString()}`);
```

## Trust Analytics

### Get Trust Report

```typescript
import { getTrustAnalytics } from './_core/trustLayer';

const analytics = getTrustAnalytics();

const report = await analytics.generateTrustReport('did:example:user1');

console.log('Economic Trust:');
console.log(`  Total staked: ${report.economicTrust.totalStaked.toString()}`);
console.log(`  Tier: ${report.economicTrust.stakeTier}`);
console.log(`  Reputation multiplier: ${report.economicTrust.reputationMultiplier}%`);

console.log('Reputation Trust:');
console.log(`  Overall score: ${report.reputationTrust.overallScore}`);

console.log('Payment Trust:');
console.log(`  Success rate: ${(report.paymentTrust.successRate * 100).toFixed(2)}%`);
console.log(`  Dispute rate: ${(report.paymentTrust.disputeRate * 100).toFixed(2)}%`);

console.log('Sybil Resistance:');
console.log(`  Risk score: ${(report.sybilResistance.riskScore * 100).toFixed(2)}%`);

console.log('Recommendations:');
report.trustRecommendations.forEach(rec => console.log(`  - ${rec}`));
```

### Calculate Trust Score

```typescript
const score = await analytics.calculateTrustScore('did:example:user1');

console.log(`Composite trust score: ${(score.compositeScore * 100).toFixed(2)}%`);
console.log('Component scores:');
console.log(`  Economic: ${(score.componentScores.economic * 100).toFixed(2)}%`);
console.log(`  Reputation: ${(score.componentScores.reputation * 100).toFixed(2)}%`);
console.log(`  Payment: ${(score.componentScores.payment * 100).toFixed(2)}%`);
console.log(`  Sybil: ${(score.componentScores.sybil * 100).toFixed(2)}%`);
console.log(`Confidence: ${(score.confidenceInterval.lower * 100).toFixed(2)}% - ${(score.confidenceInterval.upper * 100).toFixed(2)}%`);
```

## Trust Orchestrator

### Execute Full Campaign

```typescript
import { getTrustOrchestrator } from './_core/trustLayer';

const orchestrator = getTrustOrchestrator();

const campaignUAL = {
  id: 'campaign_123',
  details: {
    budget: 10000,
    title: 'Tech Product Launch',
    description: 'Launch campaign for new tech product'
  },
  participationRequirements: {
    minReputationScore: 0.7,
    maxSybilRisk: 0.2,
    minStakeTier: 'VERIFIED'
  },
  creator: 'did:example:brand1'
};

const result = await orchestrator.executeTrustedCampaign(
  campaignUAL,
  'did:example:brand1'
);

console.log(`Status: ${result.status}`);
console.log(`Total deals: ${result.totalDeals}`);
console.log(`Successful deals: ${result.successfulDeals}`);
console.log(`Total payments: $${result.totalPayments}`);
console.log(`Average ROI: ${result.averageROI.toFixed(2)}%`);
console.log(`Average trust score: ${(result.trustMetrics.averageTrustScore * 100).toFixed(2)}%`);
```

## Agent Integration

### Get Trust-Enhanced Recommendations

```typescript
import { getTrustLayerAgentIntegration } from './_core/trustLayer';

const integration = getTrustLayerAgentIntegration();

const recommendations = await integration.getTrustEnhancedRecommendations(
  'did:example:brand1',
  {
    targetAudience: 'Tech enthusiasts',
    minReputation: 0.8,
    maxSybilRisk: 0.15,
    platforms: ['twitter', 'reddit'],
    specialties: ['technology'],
    budget: 5000,
    campaignType: 'product_launch',
    minTrustScore: 0.75,
    minStakeTier: 'VERIFIED'
  }
);

console.log(`Brand verified: ${recommendations.brandVerification.verified}`);
console.log(`Influencers found: ${recommendations.influencers.length}`);
console.log(`Average trust score: ${(recommendations.trustInsights.averageTrustScore * 100).toFixed(2)}%`);

recommendations.influencers.forEach((match, index) => {
  console.log(`\nInfluencer ${index + 1}:`);
  console.log(`  DID: ${match.influencer.did}`);
  console.log(`  Trust score: ${(match.trustScore * 100).toFixed(2)}%`);
  console.log(`  Match score: ${(match.matchScore * 100).toFixed(2)}%`);
  console.log(`  Stake tier: ${match.influencer.stakeTier}`);
  console.log(`  Estimated ROI: ${match.estimatedROI.toFixed(2)}%`);
  console.log(`  Recommended payment: $${match.recommendedPayment}`);
  console.log(`  Staking verified: ${match.stakingVerified}`);
  console.log(`  Escrow ready: ${match.escrowReady}`);
  console.log(`  Reasoning: ${match.reasoning}`);
});
```

### Verify Brand for Campaign

```typescript
const verification = await integration.verifyBrandForCampaign(
  'did:example:brand1',
  50000 // Campaign budget
);

if (verification.verified) {
  console.log(`Brand verified for ${verification.requiredTier} tier campaign`);
} else {
  console.log(`Brand needs to stake ${verification.missingStake?.toString()} TRAC`);
  console.log('Recommendations:');
  verification.recommendations.forEach(rec => console.log(`  - ${rec}`));
}
```

### Setup Escrow for Deal

```typescript
const escrowSetup = await integration.setupInfluencerEscrow(
  'did:example:brand1',
  'did:example:influencer1',
  200, // $200 payment
  0.7 // 70% performance threshold
);

console.log(`Escrow deal ID: ${escrowSetup.dealId}`);
console.log(`Payment flow ID: ${escrowSetup.paymentFlowId}`);
```

## Utility Functions

### Format Stake Amount

```typescript
import { formatStakeAmount, formatUSDC, getTierDisplayName } from './_core/trustLayer/utils';

const stake = BigInt(5000) * BigInt(10 ** 18);
console.log(`Formatted stake: ${formatStakeAmount(stake)} TRAC`);

const usdcAmount = 5000000; // $5 USDC
console.log(`Formatted USDC: ${formatUSDC(usdcAmount)}`);

const tier = 'VERIFIED';
console.log(`Tier display: ${getTierDisplayName(tier)}`);
```

### Calculate Performance Bonus

```typescript
import { calculatePerformanceBonus } from './_core/trustLayer/utils';

const bonus = calculatePerformanceBonus(
  0.06, // 6% engagement rate
  150,  // 150 conversions
  4.5   // 4.5 quality rating
);

console.log(`Eligible for bonus: ${bonus.eligible}`);
console.log(`Total bonus: $${bonus.totalBonus / 10 ** 6}`);
console.log(`Engagement bonus: ${bonus.bonuses.engagement ? '$50' : 'Not eligible'}`);
console.log(`Conversion bonus: ${bonus.bonuses.conversion ? '$100' : 'Not eligible'}`);
console.log(`Quality bonus: ${bonus.bonuses.quality ? '$75' : 'Not eligible'}`);
```

## API Usage (tRPC)

### Using from Client

```typescript
import { trpc } from './trpc';

// Stake tokens
const stakeResult = await trpc.trust.stake.mutate({
  userDID: 'did:example:user1',
  amount: '5000000000000000000', // 5000 TRAC (as string)
  targetTier: 'VERIFIED'
});

// Get trust score
const trustScore = await trpc.trust.getTrustScore.query({
  userDID: 'did:example:user1'
});

// Get trust-enhanced recommendations
const recommendations = await trpc.trust.getTrustEnhancedRecommendations.query({
  brandDID: 'did:example:brand1',
  requirements: {
    targetAudience: 'Tech enthusiasts',
    minReputation: 0.8,
    budget: 5000,
    campaignType: 'product_launch',
    minTrustScore: 0.75
  }
});
```

## Error Handling

```typescript
try {
  const result = await staking.stake(userDID, amount, tier);
  console.log('Staking successful:', result);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('Insufficient stake')) {
      console.error('Not enough tokens staked');
    } else if (error.message.includes('locked')) {
      console.error('Stake is still locked');
    } else {
      console.error('Staking failed:', error.message);
    }
  }
}
```

## Best Practices

1. **Always verify staking requirements** before executing campaigns
2. **Check trust scores** before matching influencers
3. **Use escrow** for all influencer payments
4. **Monitor payment statistics** to identify trusted partners
5. **Review trust recommendations** to improve scores
6. **Handle errors gracefully** with appropriate user feedback
7. **Cache trust scores** to reduce API calls
8. **Validate all inputs** before making trust layer calls

