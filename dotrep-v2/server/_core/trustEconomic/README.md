# Trust-Based Economic Decision System

## Overview

A comprehensive trust-based economic decision framework that enables AI agents to make autonomous spending decisions based on user reputation and query value analysis. This system implements the complete flow:

```
User Query → Trust Assessment → Value Analysis → Economic Decision → x402 Payment → Enhanced Response
```

## Key Features

### 1. **Trust Assessment**
- Real-time trust evaluation using DKG data
- Multi-dimensional trust scoring (reputation, economic stake, consistency, sybil risk)
- Trust tier classification (PLATINUM, GOLD, SILVER, BRONZE, UNVERIFIED)
- Integration with existing reputation calculator and trust analytics

### 2. **Economic Value Analysis**
- Query complexity assessment
- Urgency detection
- Potential impact estimation
- Business value evaluation
- Competitive advantage analysis
- Dollar value range calculation

### 3. **Economic Decision Making**
- Maximum justifiable spend calculation
- Premium data source identification
- ROI-based source selection
- Budget constraint enforcement
- Diminishing returns detection

### 4. **x402 Payment Integration**
- Autonomous payment execution
- Multi-chain support (Base, Ethereum, Polygon, Solana)
- Payment facilitator integration (gasless payments)
- Transaction recording to DKG
- Payment proof management

### 5. **Trust-Aware Response Generation**
- Quality tier determination (PREMIUM, ENHANCED, BASIC)
- Data source integration
- Response personalization based on trust level
- Economic activity tracking

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│         TrustEconomicChatbot                            │
│  - Main chatbot interface                               │
│  - Query processing                                     │
│  - Response generation                                  │
└──────────────┬──────────────────────────────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    ▼                     ▼
┌─────────────┐    ┌──────────────────────┐
│  Decision   │    │  x402 Economic       │
│  Engine     │    │  Orchestrator        │
│             │    │                      │
│  - Trust    │    │  - Payment exec      │
│    Assess   │    │  - Transaction mgmt  │
│  - Value    │    │  - DKG recording    │
│    Analysis │    │  - ROI calculation   │
│  - Budget   │    └──────────────────────┘
│    Calc     │
└─────────────┘
```

## Usage

### Basic Usage

```typescript
import { createTrustEconomicChatbot } from './trustEconomic';

// Create chatbot
const chatbot = createTrustEconomicChatbot({
  x402Config: {
    agentId: 'my-agent',
    payerAddress: '0x...',
    maxPaymentAmount: '100.0',
    facilitatorUrl: 'https://facilitator.x402.org',
  },
});

// Process query
const response = await chatbot.processQuery(
  'did:dkg:user:hedge_fund_manager',
  'Analyze TechInnovate acquisition prospects',
  {
    type: 'strategic_decision',
    urgency: 'high',
  }
);

console.log('Trust Tier:', response.economicDecision.trustTier);
console.log('Budget Allocated:', response.economicDecision.maxBudget);
console.log('Actual Spend:', response.totalSpend);
console.log('Data Sources:', response.metadata.dataSources);
```

### Advanced Usage with Custom Policy

```typescript
import { TrustEconomicDecisionEngine, TrustEconomicChatbot } from './trustEconomic';

// Create decision engine with custom policy
const decisionEngine = new TrustEconomicDecisionEngine({
  economicPolicy: {
    baseBudgetPerQuery: 2.0, // $2 base budget
    trustTierMultipliers: {
      PLATINUM: 5.0,  // 5x multiplier for platinum
      GOLD: 3.0,
      SILVER: 1.5,
      BRONZE: 0.8,
      UNVERIFIED: 0.2,
    },
    maxBudgetCap: 100.0, // $100 max per query
    minROIThreshold: 0.15, // 15% minimum ROI
    enableDiminishingReturns: true,
  },
});

// Create chatbot
const chatbot = new TrustEconomicChatbot({
  decisionEngine,
  x402Config: { /* ... */ },
});
```

### Running Demo

```typescript
import { runTrustEconomicDemo } from './trustEconomic';

// Run complete demo with scenarios
await runTrustEconomicDemo();
```

## Trust Tiers

| Tier | Score Range | Budget Multiplier | Access Level |
|------|-------------|-------------------|--------------|
| PLATINUM | 0.8+ | 3.0x | Full |
| GOLD | 0.6-0.8 | 2.0x | High |
| SILVER | 0.4-0.6 | 1.0x | Medium |
| BRONZE | 0.2-0.4 | 0.5x | Basic |
| UNVERIFIED | <0.2 | 0.1x | Limited |

## Economic Decision Flow

1. **Trust Assessment**
   - Query DKG for user trust metrics
   - Calculate trust score from multiple dimensions
   - Determine trust tier

2. **Value Analysis**
   - Assess query complexity
   - Evaluate urgency and potential impact
   - Calculate estimated dollar value range

3. **Budget Calculation**
   - Apply trust tier multiplier to base budget
   - Cap at estimated value (50% of max value)
   - Enforce policy maximum

4. **Source Selection**
   - Identify available premium data sources
   - Filter by budget and access level
   - Sort by expected ROI

5. **Payment Execution**
   - Execute x402 payments for selected sources
   - Detect diminishing returns
   - Record transactions to DKG

6. **Response Generation**
   - Integrate purchased data
   - Determine quality tier
   - Generate trust-aware response

## Integration Points

### Reputation Calculator
- Uses `ReputationCalculator` for reputation scoring
- Integrates with `HighlyTrustedUserStatus` determination
- Leverages verified payment history

### Trust Analytics
- Uses `TrustAnalytics` for comprehensive trust scoring
- Integrates economic, reputation, payment, and sybil scores
- Uses trust reports for decision making

### x402 Payment System
- Uses `AutonomousPaymentAgent` for payment execution
- Supports facilitator-based (gasless) and on-chain payments
- Handles payment proof generation and validation

### DKG Integration
- Queries DKG for trust metrics using SPARQL
- Records economic transactions as Knowledge Assets
- Enables provenance tracking

## Example Scenarios

### High-Trust Investment Scenario
- **User**: PLATINUM tier hedge fund manager
- **Query**: "Analyze TechInnovate acquisition prospects"
- **Budget**: $15.00
- **Sources**: M&A Intelligence API ($8), Institutional Sentiment ($5), Regulatory Risk ($2)
- **Result**: PREMIUM quality response with comprehensive analysis

### Medium-Trust Operational Scenario
- **User**: GOLD tier small business owner
- **Query**: "What are current trends in sustainable packaging?"
- **Budget**: $3.00
- **Sources**: Industry Trends Report ($2.50)
- **Result**: ENHANCED quality response with market insights

### Low-Trust Basic Scenario
- **User**: BRONZE tier new user
- **Query**: "What is AI?"
- **Budget**: $0.00
- **Sources**: None
- **Result**: BASIC quality response with general knowledge

## Configuration

### Environment Variables

```bash
# x402 Configuration
X402_FACILITATOR_URL=https://facilitator.x402.org
AGENT_PAYER_ADDRESS=0x...
AGENT_PRIVATE_KEY=...

# DKG Configuration
DKG_USE_MOCK=false
DKG_ENVIRONMENT=testnet

# Economic Policy
BASE_BUDGET_PER_QUERY=1.0
MAX_BUDGET_CAP=50.0
MIN_ROI_THRESHOLD=0.1
```

## API Reference

### TrustEconomicDecisionEngine

#### `makeEconomicDecision(userDid, query, context?)`
Makes trust-based economic decision for a query.

**Returns**: `EconomicDecision` with budget, sources, and rationale.

### TrustEconomicChatbot

#### `processQuery(userDid, userQuery, context?)`
Main chatbot interface for processing queries with economic decisions.

**Returns**: `ChatbotResponse` with response, economic decision, and metadata.

### X402EconomicOrchestrator

#### `executeEconomicTransaction(decision, userDid, queryContext?)`
Executes economic transaction with x402 payments.

**Returns**: `EconomicTransaction` with payment details and ROI.

## Best Practices

1. **Trust Assessment**: Always use real-time trust data from DKG when available
2. **Budget Management**: Implement budget managers to track spending over time
3. **ROI Tracking**: Monitor actual ROI vs expected ROI to improve decision making
4. **Diminishing Returns**: Enable diminishing returns detection to prevent wasteful spending
5. **Error Handling**: Gracefully handle payment failures and fallback to free sources
6. **DKG Recording**: Always record economic activity to DKG for transparency

## Future Enhancements

- [ ] Machine learning for value prediction
- [ ] Dynamic pricing based on demand
- [ ] Multi-agent negotiation
- [ ] Reputation-based discounts
- [ ] Predictive budget allocation
- [ ] Advanced ROI modeling

## License

Part of the DotRep project - see main LICENSE file.

