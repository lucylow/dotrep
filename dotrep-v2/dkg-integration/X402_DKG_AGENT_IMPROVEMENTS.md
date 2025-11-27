# x402 Protocol Integration for DKG AI Agent - Improvements Summary

## Overview

This document summarizes the comprehensive improvements made to the DKG AI Agent to enable autonomous payments using the x402 protocol. These enhancements allow AI agents to seamlessly query premium DKG data and pay for access without human intervention.

## Key Improvements

### 1. **x402 Payment Client Integration**

The DKG AI Agent now includes optional x402 payment client support:

- **Automatic Payment Handling**: Agents can automatically handle HTTP 402 Payment Required responses
- **Configurable Payment Settings**: Flexible configuration for payment limits, recipient reputation requirements, and chain preferences
- **Payment Evidence Tracking**: Automatic tracking and publishing of payment evidence to DKG

**Configuration Example:**
```typescript
const agent = createDKGAIAgent({
  agentId: 'research-agent-1',
  agentName: 'Research Agent',
  purpose: 'Query premium DKG data for research',
  capabilities: ['dRAG', 'knowledge-extraction'],
  x402Config: {
    payerAddress: '0x1234...',
    privateKey: process.env.AGENT_PRIVATE_KEY,
    facilitatorUrl: 'https://facilitator.example.com',
    preferredChain: 'base',
    maxPaymentAmount: 100.0, // USD
    minRecipientReputation: 0.7,
    enableNegotiation: true,
    trackPaymentEvidence: true,
  },
});
```

### 2. **Enhanced Query Processing with Payment Support**

The `processQuery` method now supports:

- **Premium Endpoint Queries**: Automatically queries premium DKG endpoints when specified
- **Automatic Payment Execution**: Handles payment flow seamlessly when HTTP 402 is received
- **Payment Evidence Publishing**: Publishes payment evidence as Knowledge Assets to DKG
- **Fallback to Standard Queries**: Gracefully falls back to standard queries if payment fails

**Enhanced Query Options:**
```typescript
const response = await agent.processQuery(
  'What are the latest research findings on blockchain scalability?',
  {
    enablePayment: true, // Enable x402 payments
    maxPaymentAmount: 5.0, // Max $5 for this query
    premiumEndpoint: 'https://premium-dkg.chainbase.com/api/query',
    topK: 10,
    minProvenanceScore: 70,
  }
);

// Response includes payment information
console.log(`Amount paid: ${response.paymentInfo?.amountPaid}`);
console.log(`Payment UAL: ${response.paymentInfo?.paymentUAL}`);
```

### 3. **Reputation-Aware Payment Decisions**

The agent now evaluates recipient reputation before making payments:

- **Reputation Lookup**: Queries DKG for recipient reputation scores
- **Payment History Analysis**: Uses payment history to infer reputation
- **Threshold Enforcement**: Enforces minimum reputation thresholds before payment
- **Audit Logging**: Logs reputation checks for transparency

**Reputation Evaluation:**
- Checks recipient reputation from DKG Knowledge Assets
- Analyzes payment history for the recipient
- Calculates reputation score based on verified transactions
- Warns or blocks payments to low-reputation recipients

### 4. **Payment Evidence Tracking and Publishing**

All payments are tracked and published to DKG:

- **Automatic Evidence Creation**: Payment evidence is automatically created after successful payments
- **DKG Publishing**: Evidence is published as Knowledge Assets with JSON-LD format
- **TraceRank Integration**: Payment evidence enables payment-weighted reputation scoring
- **Audit Trail**: Complete audit trail of all agent payments

**Payment Evidence Flow:**
1. Payment executed via x402 protocol
2. Payment evidence extracted from transaction
3. Evidence published to DKG as Knowledge Asset
4. UAL returned for reference and audit

### 5. **Enhanced Query Method with Auto-Payment**

New method `queryDKGWithAutoPayment` provides:

- **Automatic HTTP 402 Handling**: Intercepts and handles payment requirements
- **Retry Logic**: Automatically retries requests with payment proof
- **Error Handling**: Graceful error handling with fallback options
- **Payment Evidence Tracking**: Automatic evidence tracking for all payments

**Usage Example:**
```typescript
// Query any DKG endpoint with automatic payment handling
const data = await agent.queryDKGWithAutoPayment(
  'https://api.chainbase.com/dkg/query',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'premium data query' }),
  }
);
```

### 6. **Enhanced Agent Status and Analytics**

Agent status now includes payment statistics:

- **Payment History**: Complete payment history tracking
- **Payment Statistics**: Total payments, amounts, and averages
- **Chain Preferences**: Preferred blockchain networks
- **x402 Status**: Whether x402 is enabled and configured

**Status Example:**
```typescript
const status = agent.getStatus();
console.log(`Total payments: ${status.paymentStats?.totalPayments}`);
console.log(`Total amount: $${status.paymentStats?.totalAmount}`);
console.log(`x402 enabled: ${status.x402Enabled}`);
```

## Architecture

### Payment Flow

```
┌─────────────────┐
│  AI Agent       │
│  Query Request  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DKG Endpoint   │
│  (Premium API)  │
└────────┬────────┘
         │
         │ HTTP 402 Payment Required
         ▼
┌─────────────────┐
│  x402 Agent     │
│  Payment Client │
└────────┬────────┘
         │
         ├─► Evaluate Payment Decision
         │   ├─ Check Recipient Reputation
         │   ├─ Verify Payment Amount
         │   └─ Select Optimal Chain
         │
         ├─► Execute Payment
         │   ├─ Via Facilitator (gasless)
         │   └─ Or On-Chain
         │
         ├─► Create Payment Proof
         │   └─ Sign with Private Key
         │
         └─► Retry Request with X-PAYMENT Header
             │
             ▼
    ┌─────────────────┐
    │  Payment        │
    │  Verification   │
    └────────┬────────┘
             │
             ├─► Success: Return Data
             │
             └─► Publish Payment Evidence to DKG
```

### Integration Points

1. **x402AutonomousAgent**: Core payment client for handling HTTP 402 responses
2. **DKGClientV8**: Enhanced with payment evidence publishing capabilities
3. **Reputation System**: Integration with reputation calculator for payment decisions
4. **Knowledge Assets**: Payment evidence stored as JSON-LD Knowledge Assets

## Benefits

### For AI Agents

- **Autonomous Operation**: Agents can operate 24/7 without human intervention
- **Premium Data Access**: Access to paid premium DKG data and APIs
- **Flexible Pricing**: Pay-per-use model instead of rigid subscriptions
- **Cost Control**: Configurable payment limits and budgets

### For Data Providers

- **Monetization**: Easy monetization of DKG data and APIs
- **Instant Settlement**: On-chain payment settlement
- **Transparent Pricing**: Clear payment requirements via HTTP 402
- **Reputation Signals**: Payments create reputation signals for TraceRank

### For the Ecosystem

- **Autonomous Economy**: Enables fully automated agent-to-agent commerce
- **Trust Signals**: Payment evidence creates verifiable trust signals
- **Data Quality**: Paid data access incentivizes high-quality data
- **Innovation**: Lowers barriers for AI agent innovation

## Usage Examples

### Basic Agent with Payment Support

```typescript
import { createDKGAIAgent } from './dkg-integration/dkg-agent-launcher';

const agent = createDKGAIAgent({
  agentId: 'research-bot',
  agentName: 'Research Bot',
  purpose: 'Autonomous research and data gathering',
  capabilities: ['dRAG', 'knowledge-extraction', 'citation-tracking'],
  x402Config: {
    payerAddress: process.env.AGENT_WALLET_ADDRESS,
    privateKey: process.env.AGENT_PRIVATE_KEY,
    preferredChain: 'base',
    maxPaymentAmount: 100.0,
  },
});

await agent.initialize();

// Query with automatic payment
const response = await agent.processQuery(
  'Find the latest blockchain research papers',
  {
    enablePayment: true,
    premiumEndpoint: 'https://premium-dkg.example.com/query',
  }
);
```

### Agent Orchestrator with Payment

```typescript
import { createAgentLauncher } from './dkg-integration/dkg-agent-launcher';

const orchestrator = createAgentLauncher('research-swarm');

// Launch multiple agents with payment support
await orchestrator.launchAgent({
  agentId: 'agent-1',
  agentName: 'Research Agent 1',
  purpose: 'Premium data queries',
  capabilities: ['dRAG'],
  x402Config: {
    payerAddress: '0x...',
    preferredChain: 'base',
  },
});

// Route task with automatic payment handling
await orchestrator.routeTask({
  agentId: 'agent-1',
  taskType: 'query',
  input: {
    query: 'Premium research data query',
    options: {
      enablePayment: true,
      premiumEndpoint: 'https://premium-api.example.com',
    },
  },
});
```

## Security Considerations

1. **Private Key Management**: Private keys should be stored securely (e.g., using environment variables or key management services)
2. **Payment Limits**: Always configure maximum payment amounts to prevent excessive spending
3. **Reputation Thresholds**: Set minimum recipient reputation requirements to avoid payments to untrustworthy sources
4. **Audit Logging**: All payments are tracked and published to DKG for audit purposes

## Future Enhancements

- **Multi-Agent Payment Coordination**: Coordinate payments across agent swarms
- **Dynamic Pricing**: Negotiate prices dynamically based on data quality and demand
- **Payment Escrow**: Implement escrow for high-value transactions
- **Cross-Chain Payments**: Enhanced support for cross-chain payment routing
- **Payment Analytics**: Advanced analytics for payment patterns and optimization

## References

- [x402 Protocol Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [x402 Protocol Documentation](https://docs.cdp.coinbase.com/x402/welcome)
- [Chainbase x402 Integration](https://blog.chainbase.com/chainbase-integrates-x402-protocol-to-power-instant-pay-per-request-data-access)
- [OriginTrail DKG Documentation](https://docs.origintrail.io/)

## Conclusion

These improvements transform the DKG AI Agent into a fully autonomous economic actor capable of:
- Making payments without human intervention
- Accessing premium data and APIs
- Building verifiable payment history for reputation
- Operating in a decentralized data economy

The integration of x402 protocol with DKG creates a powerful foundation for autonomous agent commerce and data monetization.

