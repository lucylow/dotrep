# Autonomous Payment Decision System

This system enables AI agents and chatbots to **autonomously decide** whether to pay for premium data via x402 protocol, creating a self-funding AI agent system.

## 🎯 Overview

The autonomous payment system implements a complete decision framework that:

1. **Analyzes queries** to determine complexity and data needs
2. **Identifies data gaps** that premium sources could fill
3. **Evaluates cost-benefit** ratios for potential data purchases
4. **Checks budget constraints** (daily, per-query, monthly limits)
5. **Executes x402 payments** when justified
6. **Records payments to DKG** for transparency and auditability

## 🏗️ Architecture

### Core Components

1. **`AutonomousPaymentDecisionEngine`** - Analyzes queries and makes payment decisions
2. **`AutonomousBudgetManager`** - Manages spending limits and tracks payments
3. **`AutonomousPaymentOrchestrator`** - Orchestrates the complete payment flow
4. **`AutonomousChatbot`** - High-level chatbot integration with payment capability

### Decision Flow

```
User Query
    ↓
Query Analysis (complexity, data needs)
    ↓
Identify Premium Data Sources
    ↓
Cost-Benefit Analysis
    ↓
Budget Check
    ↓
Payment Decision
    ↓
Execute x402 Payment (if justified)
    ↓
Retrieve & Integrate Premium Data
    ↓
Generate Enhanced Response
```

## 📦 Installation & Usage

### Basic Usage

```typescript
import {
  AutonomousPaymentDecisionEngine,
  AutonomousBudgetManager,
  AutonomousPaymentOrchestrator,
  AutonomousChatbot
} from './m2mCommerce';

// Create autonomous chatbot
const chatbot = new AutonomousChatbot({
  dailyBudget: 10.0,      // $10 per day
  perQueryBudget: 2.0,   // $2 per query
  monthlyBudget: 300.0   // $300 per month
});

// Process a query - chatbot autonomously decides to pay if justified
const response = await chatbot.processMessage(
  "Should I invest in TechInnovate? Analyze their Q4 prospects.",
  "user:premium_trader",
  {
    userReputation: 850,
    userTrustLevel: 0.9
  }
);

console.log(response.response);
if (response.paymentInfo) {
  console.log(`Paid $${response.paymentInfo.amountPaid} for premium data`);
  console.log(`Sources: ${response.paymentInfo.sources.join(', ')}`);
  console.log(`Rationale: ${response.paymentInfo.rationale}`);
}
```

### Advanced Usage: Direct Orchestrator

```typescript
import {
  AutonomousPaymentDecisionEngine,
  AutonomousBudgetManager,
  AutonomousPaymentOrchestrator
} from './m2mCommerce';
import { AutonomousPaymentAgent } from './autonomousPaymentAgent';

// Initialize components
const budgetManager = new AutonomousBudgetManager({
  dailyBudget: 10.0,
  perQueryBudget: 2.0
});

const decisionEngine = new AutonomousPaymentDecisionEngine({
  daily: 10.0,
  perQuery: 2.0
});

const paymentAgent = new AutonomousPaymentAgent({
  agentId: 'my-agent',
  payerAddress: '0x...',
  maxPaymentAmount: '2.0'
});

const orchestrator = new AutonomousPaymentOrchestrator({
  decisionEngine,
  budgetManager,
  paymentAgent,
  dkgClient: dkgClient // Optional: for recording payments
});

// Process query with autonomous payment
const result = await orchestrator.processQueryWithAutonomousPayment(
  "Analyze TechInnovate's market position",
  {
    userId: 'user:123',
    userDid: 'did:dkg:user:123',
    trustLevel: 0.9,
    reputationScore: 850
  }
);

if (result.success && result.amountPaid) {
  console.log(`Paid $${result.amountPaid} for ${result.sources?.length} data sources`);
  console.log(`Data:`, result.data);
}
```

## 🧠 Decision Logic

### Decision Factors

The system evaluates multiple factors:

1. **Query Complexity** (0-1): How complex is the query?
   - Keywords: "analyze", "compare", "evaluate", "investment", "forecast"
   - Higher complexity = more likely to pay

2. **Data Gap Severity** (0-1): How critical are missing data?
   - Real-time data gaps: +0.3
   - Financial data gaps: +0.3
   - Industry data gaps: +0.2

3. **User Trust Level** (0-1): How trusted is the user?
   - Based on reputation score or explicit trust level
   - Low trust (< 0.6) = less likely to invest budget

4. **Potential Value** (0-1): How valuable is the response?
   - Investment queries: +0.3
   - Real-time data: +0.2
   - Specialized knowledge: +0.1

5. **Cost-Benefit Ratio**: `value / cost`
   - Higher ratio = better investment
   - Must be positive to justify payment

### Decision Matrix

Payment is approved if:

- **High Priority**: `queryComplexity > 0.8` AND `dataGapSeverity > 0.7`
- **Medium Priority**: `potentialValue > costBenefitRatio` AND within budget AND trusted user

### Budget Constraints

- **Daily Limit**: Maximum spending per day
- **Per-Query Limit**: Maximum spending per query
- **Monthly Limit**: Optional monthly cap
- **User Trust**: Low-trust users don't get budget allocation

## 💰 Budget Management

```typescript
// Get budget status
const status = budgetManager.getBudgetStatus();
console.log(`Daily Remaining: $${status.daily.remaining}`);
console.log(`Monthly Remaining: $${status.monthly?.remaining}`);

// Check if can spend
const check = budgetManager.canSpend(1.5, { userId: 'user:123' });
if (check.allowed) {
  console.log('Can spend $1.50');
} else {
  console.log('Budget constraints:', check.constraints);
}

// Get spending history
const history = budgetManager.getSpendingHistory({
  userId: 'user:123',
  limit: 10
});
```

## 📊 Premium Data Sources

The system automatically identifies premium sources based on query analysis:

- **Real-time Financial Data**: Stock prices, market data ($0.25)
- **Industry Analysis**: Professional reports ($1.50)
- **Expert Knowledge**: Specialized knowledge base ($0.75)
- **Sentiment Analysis**: Market sentiment ($0.50)

You can customize sources in `AutonomousPaymentDecisionEngine.identifyPremiumSources()`.

## 🔗 Integration with Existing Systems

### Integration with DKGAIAgent

```typescript
import { DKGAIAgent } from './dkg-agent-launcher';
import { AutonomousPaymentOrchestrator } from './m2mCommerce';

// Extend DKGAIAgent to use autonomous payments
class EnhancedDKGAIAgent extends DKGAIAgent {
  private paymentOrchestrator: AutonomousPaymentOrchestrator;

  async processQuery(query: string, options: any) {
    // Check if we should pay for premium data
    const paymentResult = await this.paymentOrchestrator.processQueryWithAutonomousPayment(
      query,
      {
        userId: options.userId,
        userDid: options.userDid,
        trustLevel: options.trustLevel
      }
    );

    // If payment was made, use premium data
    if (paymentResult.success && paymentResult.data) {
      // Integrate premium data into query processing
      return this.processWithPremiumData(query, paymentResult.data);
    }

    // Otherwise, use standard processing
    return super.processQuery(query, options);
  }
}
```

## 📝 Recording Payments to DKG

Payments are automatically recorded to DKG for transparency:

```typescript
const orchestrator = new AutonomousPaymentOrchestrator({
  decisionEngine,
  budgetManager,
  paymentAgent,
  dkgClient: dkgClient // DKG client instance
});

// Payments are automatically recorded with:
// - Payment amount and recipient
// - Transaction hash
// - Decision rationale
// - User context
```

## 🎬 Demo

Run the demo to see autonomous payments in action:

```typescript
import { runAutonomousPaymentDemos } from './autonomousPaymentDemo';

await runAutonomousPaymentDemos();
```

### Expected Output

```
=== DEMO: Autonomous x402 Payments ===

1. COMPLEX QUERY (Investment Analysis)
Decision: PAY
Rationale: High-priority query (complexity: 85%, data gaps: 80%) - justified payment
Data Sources Used: Realtime Stock API, Sentiment Analysis Pro
Total Spent: $0.75
Budget Remaining: $9.25

2. SIMPLE QUERY (Basic Info)
Decision: DON'T PAY
Rationale: Free data sources sufficient for this query
Total Spent: $0.00

3. FINANCIAL QUERY (Real-time Data)
Decision: PAY
Rationale: Medium-priority query with good cost-benefit ratio (2.5)
Data Sources Used: Realtime Stock API, Industry Insights API
Total Spent: $1.75
Budget Remaining: $7.50
```

## 🔒 Security & Trust

- **Budget Limits**: Hard limits prevent overspending
- **User Trust**: Low-trust users don't get budget allocation
- **DKG Recording**: All payments recorded for auditability
- **Cost-Benefit Analysis**: Only pays when value justifies cost

## 🚀 Future Enhancements

- [ ] Machine learning to improve decision accuracy
- [ ] Dynamic pricing based on demand
- [ ] Multi-agent budget sharing
- [ ] Payment negotiation (counter-offers)
- [ ] Reputation-based pricing discounts

## 📚 API Reference

See individual component files for detailed API documentation:

- `autonomousPaymentDecisionEngine.ts` - Decision logic
- `autonomousBudgetManager.ts` - Budget management
- `autonomousPaymentOrchestrator.ts` - Payment orchestration
- `autonomousChatbotIntegration.ts` - Chatbot integration

## 🤝 Contributing

This system is part of the OriginTrail hackathon submission. Contributions welcome!

