# x402 + MCP Integration Guide

## Overview

This document describes the comprehensive integration between the x402 payment protocol and Model Context Protocol (MCP), enabling AI agents to seamlessly discover, evaluate, and use external tools with autonomous payments.

## Key Features

### 1. **Autonomous Agent Payments (x402 Protocol)**
- Automatic HTTP 402 Payment Required handling
- Cryptographically signed payment authorizations
- Multi-chain support (Base, Solana, Ethereum, Polygon, Arbitrum)
- Payment facilitator integration (gasless payments)
- Reputation-aware payment decisions
- Price negotiation capabilities

### 2. **Dynamic Tool Discovery (MCP)**
- Discover available tools based on criteria
- Filter by reputation, price, and capabilities
- Progressive disclosure for efficient tool usage
- Budget-aware tool selection

### 3. **Code Execution Pattern**
- Execute code that uses MCP tools efficiently
- Process large datasets in-environment
- Reduce token usage by avoiding massive data dumps
- Import only needed tools

### 4. **Reputation Integration**
- Enhanced reputation calculator with x402 payment signals
- Payment-weighted reputation boost (TraceRank-style)
- Verified payment history for reputation scoring
- Sybil resistance through payment pattern analysis

## Architecture

```
┌─────────────────┐
│   AI Agent      │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  X402McpIntegration Manager    │
│  - Tool Discovery              │
│  - Budget Management           │
│  - Payment Handling            │
└────────┬───────────────────────┘
         │
    ┌────┴────┐
    │        │
    ▼        ▼
┌────────┐ ┌──────────────────┐
│  x402  │ │   MCP Server      │
│ Agent  │ │   - Tool Registry │
│        │ │   - Tool Execution│
└────────┘ └──────────────────┘
    │              │
    ▼              ▼
┌──────────────────────────────┐
│  Blockchain Networks         │
│  (Base, Solana, Ethereum...)  │
└──────────────────────────────┘
```

## Usage Examples

### Example 1: Discover and Use Tools

```typescript
import { createX402McpIntegration } from './server/_core/x402McpIntegration';

// Initialize integration
const integration = createX402McpIntegration({
  agentId: 'my-agent',
  payerAddress: '0x123...',
  maxPaymentAmount: 100,
  minRecipientReputation: 0.7,
  enableNegotiation: true,
});

// Discover tools
const tools = await integration.discoverTools({
  category: 'reputation',
  minProviderReputation: 0.8,
  maxPrice: 0.10,
  requiredCapabilities: ['reputation_query', 'verification'],
});

// Select optimal tools
const selection = await integration.selectTools({
  category: 'reputation',
  minProviderReputation: 0.8,
  budget: 5.0, // $5 budget
  requiredCapabilities: ['reputation_query'],
}, 'Get reputation scores for developers');

console.log(`Selected ${selection.selectedTools.length} tools`);
console.log(`Total cost: $${selection.totalCost}`);
console.log(`Reasoning: ${selection.reasoning}`);

// Use a tool
const result = await integration.useTool('get_developer_reputation', {
  developerId: 'alice',
  includeContributions: true,
});
```

### Example 2: Request Protected Resource with x402

```typescript
import { X402AutonomousAgent } from './server/_core/x402AutonomousAgent';

const agent = new X402AutonomousAgent({
  agentId: 'my-agent',
  payerAddress: '0x123...',
  maxPaymentAmount: 100,
  minRecipientReputation: 0.7,
});

// Request resource - automatically handles payment
const result = await agent.requestResource('https://api.example.com/premium-data');

if (result.success) {
  console.log('Data:', result.data);
  console.log('Payment evidence:', result.paymentEvidence);
  console.log('Amount paid:', result.amountPaid);
}
```

### Example 3: Use MCP Tools Directly

```typescript
// Via MCP server
const mcpTools = [
  {
    name: 'request_resource_with_x402',
    description: 'Request protected resource with automatic x402 payment',
    // ... tool definition
  },
  {
    name: 'discover_x402_tools',
    description: 'Discover available x402-protected tools',
    // ... tool definition
  },
  {
    name: 'execute_code_with_mcp_tools',
    description: 'Execute code using MCP tools efficiently',
    // ... tool definition
  },
];
```

### Example 4: Code Execution Pattern (Progressive Disclosure)

```typescript
// Agent writes code to process data efficiently
const code = `
  import { get_developer_reputation } from './mcp-tools';
  
  // Process large dataset in-environment
  const developers = ['alice', 'bob', 'charlie'];
  const results = await Promise.all(
    developers.map(id => get_developer_reputation({ developerId: id }))
  );
  
  // Filter and aggregate before returning
  const topDevelopers = results
    .filter(r => r.score > 800)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  return topDevelopers; // Only return concise result
`;

const result = await integration.executeCodeWithTools(
  code,
  ['get_developer_reputation'],
  { developers: ['alice', 'bob', 'charlie'] }
);
```

## MCP Tools Reference

### Core x402 Payment Tools

1. **`request_resource_with_x402`**
   - Request protected resource with automatic payment handling
   - Parameters: `url`, `agent_id`, `payer_address`, `max_payment_amount`, `min_recipient_reputation`, `enable_negotiation`

2. **`discover_x402_tools`**
   - Discover available x402-protected tools
   - Parameters: `category`, `min_provider_reputation`, `max_price`, `capabilities`

3. **`execute_code_with_mcp_tools`**
   - Execute code using MCP tools (progressive disclosure)
   - Parameters: `code`, `tool_imports`, `context`

4. **`query_payment_history`**
   - Query payment history for reputation analysis
   - Parameters: `payer_address`, `recipient_address`, `start_timestamp`, `end_timestamp`, `min_amount`, `limit`

5. **`evaluate_payment_decision`**
   - Evaluate payment decision based on reputation and risk
   - Parameters: `payment_request`, `agent_config`

## Reputation Calculator Enhancements

The reputation calculator now includes enhanced x402 payment integration:

### Payment-Weighted Reputation Boost

```typescript
// x402 payments get additional weight
// - Base boost: (weighted_average - 0.5) * 0.2 (up to 10%)
// - x402 boost: up to 5% extra for x402 protocol payments
// - Total boost: up to 15% for high-reputation payers using x402
```

### Verified Payment Signals

- x402 payments are cryptographically verified
- Represent autonomous agent commerce
- Higher trust signal than manual payments
- Integrated into reputation scoring

## Best Practices

### 1. **Tool Discovery**
- Always discover tools before use
- Filter by reputation to ensure quality
- Set budget limits to prevent overspending
- Use required capabilities to find exact tools needed

### 2. **Payment Handling**
- Set appropriate `maxPaymentAmount` limits
- Use reputation thresholds to avoid low-quality providers
- Enable negotiation for larger payments
- Track payment history for analytics

### 3. **Code Execution**
- Use code execution for large datasets
- Process data in-environment before returning
- Import only needed tools
- Return concise, aggregated results

### 4. **Reputation Integration**
- Query payment history for reputation analysis
- Use verified payments for reputation scoring
- Consider payment patterns for sybil detection
- Weight payments by payer reputation

## Security Considerations

1. **Authentication**: MCP servers use OAuth 2.1 for authentication
2. **Authorization**: Tools are accessible at session level
3. **Input Sanitization**: Always validate and sanitize inputs
4. **Payment Verification**: All payments are cryptographically verified
5. **Replay Protection**: Challenges/nonces prevent replay attacks

## Configuration

### Environment Variables

```bash
# x402 Configuration
X402_GATEWAY_URL=http://localhost:4001
FACILITATOR_URL=https://facilitator.example.com
X402_FACILITATOR_URL=https://facilitator.example.com

# MCP Server Configuration
MCP_SERVER_URL=http://localhost:9200/mcp
DKG_USE_MOCK=false
DKG_FALLBACK_TO_MOCK=true

# Blockchain RPC URLs
BASE_RPC_URL=https://mainnet.base.org
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
ETHEREUM_RPC_URL=https://eth.llamarpc.com
```

## Troubleshooting

### Payment Failures
- Check wallet balance
- Verify recipient reputation meets threshold
- Ensure facilitator is available
- Check network connectivity

### Tool Discovery Failures
- Verify MCP server is running
- Check authentication credentials
- Ensure network connectivity
- Review tool registry

### Code Execution Errors
- Validate code syntax
- Check tool imports are available
- Verify context variables
- Review sandbox permissions

## References

- [x402 Protocol Specification](https://www.x402.org/x402-whitepaper.pdf)
- [MCP Specification](https://modelcontextprotocol.io)
- [x402 Ecosystem](https://www.x402.org/ecosystem)
- [Solana x402 Guide](https://solana.com/x402/what-is-x402)

## Support

For issues or questions:
1. Check this documentation
2. Review code examples
3. Consult x402 and MCP specifications
4. Open an issue on GitHub

