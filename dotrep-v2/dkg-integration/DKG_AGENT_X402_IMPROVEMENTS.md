# Enhanced DKG Agent Query System with x402 Integration

## Overview

This document describes the comprehensive improvements made to enable AI agents to query the Decentralized Knowledge Graph (DKG) with autonomous payment capabilities using the x402 protocol. These enhancements transform AI agents into fully autonomous economic actors capable of accessing premium data and services without human intervention.

## Key Features

### 1. **Autonomous Payment Handling (x402 Protocol)**

The enhanced agent automatically handles HTTP 402 Payment Required responses:

- **Automatic Payment Detection**: Detects when a DKG query requires payment
- **Payment Decision Logic**: Evaluates payment requests based on:
  - Budget constraints
  - Recipient reputation
  - Query value assessment
  - Risk analysis
- **Cryptographic Payment Authorization**: Signs and submits payment authorizations autonomously
- **Payment Proof Retry**: Automatically retries requests with payment proof after successful payment
- **Multi-Chain Support**: Works across Base, Solana, Ethereum, Polygon, and other x402-supported chains

### 2. **Intelligent Query Caching**

Reduces costs by avoiding redundant paid queries:

- **Query Result Caching**: Caches query results with configurable TTL
- **Cache Key Generation**: Creates unique cache keys based on query and options
- **Automatic Cache Cleanup**: Removes expired cache entries automatically
- **Cache Hit Metrics**: Tracks cache hit rates for analytics

### 3. **Query Cost Management**

Comprehensive cost control and optimization:

- **Cost Estimation**: Estimates query costs before execution
- **Budget Management**: Set and enforce query budgets with time-based periods
- **Query Limits**: Enforce maximum query counts per period
- **Cost Tracking**: Track all query costs in real-time

### 4. **Enhanced Query Methods**

Multiple query types supported:

- **SPARQL Queries**: Execute complex SPARQL queries with payment handling
- **DRAG Queries**: Natural language queries using Decentralized Retrieval Augmented Generation
- **Payment Evidence Queries**: Query payment history and evidence
- **Reputation Queries**: Query reputation scores and data

### 5. **Payment Evidence Tracking**

Automatic tracking of payments for reputation scoring:

- **Payment Evidence Publication**: Publishes payment evidence to DKG as Knowledge Assets
- **Reputation Integration**: Payment evidence contributes to reputation scoring (TraceRank-style)
- **Payment History**: Maintains complete payment history for analytics
- **Provenance Chains**: Links payments to knowledge assets and queries

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AI Agent Application                       │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              DKGAgentQueryEnhancer                           │
│  - Query Caching                                             │
│  - Cost Estimation                                           │
│  - Budget Management                                         │
│  - Query Analytics                                           │
└──────────────┬──────────────────────────┬────────────────────┘
               │                          │
               ▼                          ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│   DKGClientV8        │    │  X402AutonomousAgent         │
│  - DKG Queries       │    │  - HTTP 402 Handling         │
│  - DRAG API          │    │  - Payment Authorization     │
│  - SPARQL Execution  │    │  - Multi-chain Support       │
└──────────┬───────────┘    │  - Payment Evidence          │
           │                └────────────┬─────────────────┘
           │                             │
           ▼                             ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│  OriginTrail DKG     │    │  x402 Payment Network        │
│  - Knowledge Assets  │    │  - Payment Facilitators      │
│  - SPARQL Endpoint   │    │  - Blockchain Networks       │
│  - DRAG API          │    │  - Payment Verification      │
└──────────────────────┘    └──────────────────────────────┘
```

## Usage Examples

### Basic Agent Setup with x402

```typescript
import { createDKGAIAgent } from './dkg-agent-launcher';

const agent = createDKGAIAgent({
  agentId: 'my-agent',
  agentName: 'Research Agent',
  purpose: 'Query DKG for research data',
  capabilities: ['query', 'payment'],
  x402Config: {
    payerAddress: '0x...',
    preferredChain: 'base',
    maxPaymentAmount: 50.0,
    enableNegotiation: true,
  },
});

await agent.initialize();
```

### Query with Automatic Payment

```typescript
const result = await agent.processQuery(
  'Find all reputation scores above 800',
  {
    enablePayment: true,
    maxPaymentAmount: 5.0,
    useCache: true,
  }
);

console.log(`Paid: $${result.paymentInfo?.amountPaid}`);
console.log(`Citations: ${result.citations.length}`);
```

### Using Query Enhancer Directly

```typescript
import { createDKGAgentQueryEnhancer } from './dkg-agent-query-enhancer';

const enhancer = createDKGAgentQueryEnhancer(dkgConfig, x402Config);

// Set budget
enhancer.setBudget({
  totalBudget: 100.0,
  periodMs: 24 * 60 * 60 * 1000, // 24 hours
  maxQueries: 50,
});

// Execute query
const result = await enhancer.queryDKG(
  {
    sparql: 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10',
    type: 'sparql',
  },
  {
    enablePayment: true,
    maxPaymentAmount: 2.0,
    useCache: true,
  }
);
```

## Benefits

### For AI Agents

1. **Autonomous Operation**: Agents can operate 24/7 without human intervention for payments
2. **Cost Efficiency**: Intelligent caching reduces redundant paid queries
3. **Budget Control**: Built-in budget management prevents overspending
4. **Payment Tracking**: Automatic payment evidence tracking for reputation

### For DKG Data Providers

1. **Monetization**: Enable pay-per-query monetization for premium data
2. **Access Control**: Control access to premium datasets and APIs
3. **Payment Verification**: Cryptographically verified payments on-chain
4. **Reputation Signals**: Payment evidence contributes to reputation systems

### For the Ecosystem

1. **Data Economy**: Enables a vibrant data economy with autonomous agents
2. **Trust Signals**: Payment history becomes a trust signal
3. **Cost Transparency**: Clear cost tracking and analytics
4. **Interoperability**: Works across multiple blockchain networks

## Implementation Details

### Query Flow with x402 Payment

1. **Initial Request**: Agent makes query request to DKG API
2. **402 Response**: Server responds with HTTP 402 Payment Required
3. **Payment Evaluation**: Agent evaluates payment request (budget, reputation, risk)
4. **Payment Authorization**: Agent signs and submits payment authorization
5. **Payment Verification**: Payment facilitator verifies and settles payment on-chain
6. **Retry with Proof**: Agent retries original request with X-PAYMENT header
7. **Result Delivery**: Server returns query results
8. **Evidence Tracking**: Agent publishes payment evidence to DKG

### Cost Estimation

Query costs are estimated based on:
- Query type (SPARQL, DRAG, etc.)
- Query complexity (length, filters)
- Result limit
- Provenance requirements

### Budget Management

Budgets are enforced per period:
- Total budget amount
- Time period (e.g., daily, weekly)
- Maximum query count
- Automatic reset at period end

### Cache Strategy

- Cache keys based on query and options
- Configurable TTL per query
- Automatic cleanup of expired entries
- Cache hit rate tracking

## Configuration

### Environment Variables

```bash
# DKG Configuration
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900
DKG_ENVIRONMENT=testnet
DKG_USE_MOCK=false

# x402 Configuration
X402_FACILITATOR_URL=https://facilitator.x402.org
AGENT_WALLET_ADDRESS=0x...
AGENT_PRIVATE_KEY=... # Use secure key management in production

# Payment Configuration
DKG_API_URL=https://api.dkg.example.com
MAX_PAYMENT_AMOUNT=50.0
```

### Agent Configuration Options

```typescript
interface AgentConfig {
  x402Config?: {
    payerAddress: string;
    privateKey?: string;
    facilitatorUrl?: string;
    preferredChain?: SupportedChain;
    maxPaymentAmount?: number;
    minRecipientReputation?: number;
    enableNegotiation?: boolean;
    trackPaymentEvidence?: boolean;
  };
  queryBudget?: {
    totalBudget: number;
    periodMs: number;
    maxQueries?: number;
  };
}
```

## Security Considerations

1. **Private Key Management**: Use secure key management systems in production
2. **Budget Limits**: Always set reasonable budget limits to prevent runaway costs
3. **Reputation Checks**: Verify recipient reputation before payments
4. **Payment Verification**: Always verify payment settlement before trusting results
5. **Cache Security**: Ensure cached results don't expose sensitive data

## Future Enhancements

1. **Query Optimization**: Intelligent query rewriting to reduce costs
2. **Batch Payments**: Combine multiple queries into single payment
3. **Subscription Support**: Support for subscription-based access
4. **Payment Splitting**: Split payments across multiple recipients
5. **Advanced Analytics**: More detailed cost and performance analytics

## References

- [x402 Protocol Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [Coinbase x402 Documentation](https://docs.cdp.coinbase.com/x402/welcome)
- [OriginTrail DKG Documentation](https://docs.origintrail.io/)
- [Chainbase x402 Integration](https://blog.chainbase.com/chainbase-integrates-x402-protocol)

## Summary

The enhanced DKG agent query system with x402 integration enables AI agents to autonomously access premium DKG data and services through seamless payment handling. This unlocks a new paradigm of agentic commerce where AI agents can transact as easily as they exchange data, creating a vibrant data economy powered by decentralized knowledge graphs and autonomous payments.

