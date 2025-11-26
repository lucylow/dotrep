# Trust Layer Implementation

## Overview

The Trust Layer provides a comprehensive system for managing trust in the DotRep platform through token staking and x402 payments. It combines economic security, automated payments, and sophisticated trust scoring to create a robust foundation for the influencer marketplace.

## Architecture

### Components

1. **Staking System** (`stakingSystem.ts`)
   - Multi-tiered staking (BASIC, VERIFIED, PREMIUM, ELITE)
   - Slashing mechanisms for malicious behavior
   - Reputation multipliers based on stake tier
   - Lock periods to prevent rapid unstaking

2. **x402 Payment Handler** (`x402PaymentHandler.ts`)
   - Multi-stage payment flows (discovery, verification, participation, success)
   - Conditional payment releases
   - Performance-based bonuses
   - Payment statistics and history

3. **Trust Escrow** (`trustEscrow.ts`)
   - Performance-based payment releases
   - Dispute resolution support
   - Slashing for fraud/abuse
   - Escrow deal management

4. **Trust Orchestrator** (`trustOrchestrator.ts`)
   - End-to-end campaign execution
   - Influencer matching with trust weighting
   - Automated deal activation
   - Performance monitoring and settlement

5. **Trust Analytics** (`trustAnalytics.ts`)
   - Comprehensive trust reports
   - Multi-dimensional trust scoring
   - Trust trends and leaderboards
   - Personalized recommendations

## Staking Tiers

| Tier | Minimum Stake | Lock Period | Reputation Multiplier | Slashable % |
|------|--------------|-------------|----------------------|-------------|
| BASIC | 1,000 TRAC | 30 days | 1.10x (10% boost) | 10% |
| VERIFIED | 5,000 TRAC | 90 days | 1.25x (25% boost) | 20% |
| PREMIUM | 25,000 TRAC | 180 days | 1.50x (50% boost) | 30% |
| ELITE | 100,000 TRAC | 365 days | 2.00x (100% boost) | 40% |

## Slashing Conditions

1. **Fake Engagement** - 25% slash, 3 evidence reports required
2. **Sybil Identity** - 50% slash, 1 evidence report (automated detection)
3. **Campaign Fraud** - 75% slash, 2 verified reports required
4. **Platform Abuse** - 100% slash, 5 community votes required

## Payment Flows

### Discovery Phase
- 5% of campaign budget reserved
- Provides access to influencer discovery API
- Quality threshold: 0.7
- Max results: 50
- Expiry: 24 hours

### Verification Phase
- Identity verification: $10 USDC
- Sybil analysis: $25 USDC
- Reputation audit: $15 USDC
- Cross-platform check: $20 USDC

### Success-Based Payments
- Base compensation + performance bonuses
- Engagement bonus: $50 USDC (if engagement rate ≥ 5%)
- Conversion bonus: $100 USDC (if conversions ≥ 100)
- Quality bonus: $75 USDC (if quality rating ≥ 4.5)

## Trust Score Calculation

The composite trust score combines four dimensions:

- **Economic Trust (35%)**: Staking amount, tier, reputation multiplier
- **Reputation Trust (30%)**: Historical performance, domain expertise
- **Payment Trust (20%)**: Transaction success rate, dispute rate, volume
- **Sybil Resistance (15%)**: Identity uniqueness, behavioral patterns

## API Endpoints

### Staking
- `trust.stake` - Stake tokens and upgrade tier
- `trust.unstake` - Unstake tokens (after lock period)
- `trust.getStake` - Get user stake information
- `trust.slash` - Execute slash on user stake

### Payments
- `trust.createPayment` - Create payment request
- `trust.completePayment` - Complete a payment
- `trust.getPaymentStats` - Get payment statistics

### Escrow
- `trust.createEscrow` - Create escrow deal
- `trust.releaseEscrow` - Release escrow payment based on performance

### Analytics
- `trust.getTrustReport` - Generate comprehensive trust report
- `trust.getTrustScore` - Calculate trust score
- `trust.executeCampaign` - Execute end-to-end trusted campaign

## Usage Examples

### Staking Tokens

```typescript
import { getStakingSystem } from './_core/trustLayer';

const staking = getStakingSystem();
const result = await staking.stake(
  'did:example:user1',
  BigInt(5000) * BigInt(10 ** 18), // 5000 TRAC
  'VERIFIED' // Target tier
);
```

### Creating Payment

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
    qualityThreshold: 0.7
  }
});
```

### Getting Trust Report

```typescript
import { getTrustAnalytics } from './_core/trustLayer';

const analytics = getTrustAnalytics();
const report = await analytics.generateTrustReport('did:example:user1');
const score = await analytics.calculateTrustScore('did:example:user1');
```

## Integration with Existing Systems

The Trust Layer integrates with:
- **Reputation Calculator**: For reputation-based trust scoring
- **Sybil Detection**: For identity verification and risk assessment
- **DKG Client**: For querying influencer profiles and campaign data
- **Polkadot API**: For on-chain staking operations (future)

## Future Enhancements

1. On-chain staking contract integration
2. Real-time payment processing via x402 protocol
3. Advanced machine learning for trust prediction
4. Cross-chain trust portability
5. Decentralized arbitration system
6. Trust-based governance participation

## Security Considerations

- All staking operations require lock periods to prevent rapid unstaking
- Slashing conditions are enforced with evidence requirements
- Payment escrow protects both brands and influencers
- Trust scores are calculated from multiple independent sources
- Sybil detection continuously monitors for suspicious patterns

## Performance

- Trust score calculation: < 100ms
- Payment processing: < 50ms
- Escrow release: < 200ms
- Campaign execution: < 5s (depends on number of influencers)

## Testing

Run tests with:
```bash
npm test -- trustLayer
```

## License

MIT

