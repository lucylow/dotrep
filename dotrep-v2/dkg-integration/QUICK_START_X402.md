# Quick Start: Enhanced DKG Agent with x402 Payments

## What Was Improved

The DKG agent query system has been enhanced with:

1. ✅ **x402 Payment Integration** - Autonomous payment handling for premium DKG queries
2. ✅ **Intelligent Query Caching** - Reduces costs by avoiding redundant paid queries
3. ✅ **Budget Management** - Set and enforce query budgets with time-based periods
4. ✅ **Cost Estimation** - Estimate query costs before execution
5. ✅ **Payment Analytics** - Track query costs and payment statistics

## Key Files Added

- `dkg-agent-query-enhancer.ts` - Enhanced query manager with x402 support
- `examples/dkg-agent-x402-example.ts` - Complete usage example
- `DKG_AGENT_X402_IMPROVEMENTS.md` - Detailed documentation

## Quick Usage

### 1. Create Agent with x402 Support

```typescript
import { createDKGAIAgent } from './dkg-agent-launcher';

const agent = createDKGAIAgent({
  agentId: 'my-agent',
  agentName: 'Research Agent',
  purpose: 'Query DKG with autonomous payments',
  capabilities: ['query', 'payment'],
  x402Config: {
    payerAddress: process.env.AGENT_WALLET_ADDRESS,
    preferredChain: 'base',
    maxPaymentAmount: 50.0,
    enableNegotiation: true,
  },
});

await agent.initialize();
```

### 2. Query with Automatic Payment

```typescript
const result = await agent.processQuery(
  'Find all developers with reputation scores above 800',
  {
    enablePayment: true,
    maxPaymentAmount: 5.0,
    useCache: true,
  }
);
```

### 3. Use Query Enhancer for Advanced Features

```typescript
import { createDKGAgentQueryEnhancer } from './dkg-agent-query-enhancer';

const enhancer = createDKGAgentQueryEnhancer(dkgConfig, x402Config);

// Set budget
enhancer.setBudget({
  totalBudget: 100.0,
  periodMs: 24 * 60 * 60 * 1000, // 24 hours
  maxQueries: 50,
});

// Query with caching and budget enforcement
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

- **Autonomous Operation**: Agents can pay for queries without human intervention
- **Cost Efficiency**: Intelligent caching reduces redundant paid queries
- **Budget Control**: Built-in budget management prevents overspending
- **Payment Tracking**: Automatic payment evidence tracking for reputation

## Example Output

```
🚀 Initializing Enhanced DKG Agent Query Manager...
✅ DKG connection verified
💰 x402 payment agent initialized
✅ Enhanced DKG Agent Query Manager initialized

🔍 Agent processing query: "Find reputation scores..."
💰 Estimated query cost: $2.5000
💾 Cache hit for query: query-1234567890
📊 Query Results:
   Response: Found 15 developers...
   Confidence: 87.5%
   Provenance Score: 85/100
   Citations: 5

💰 Payment Information:
   Amount Paid: $2.5000
   Chain: base
   Transaction: 0xabc123...
```

## Next Steps

1. Run the example: `examples/dkg-agent-x402-example.ts`
2. Read full documentation: `DKG_AGENT_X402_IMPROVEMENTS.md`
3. Configure your agent wallet and x402 settings
4. Set appropriate budgets for your use case

## Support

For issues or questions:
- Check the detailed documentation in `DKG_AGENT_X402_IMPROVEMENTS.md`
- Review the example code in `examples/dkg-agent-x402-example.ts`
- See x402 protocol docs: https://www.x402.org/

