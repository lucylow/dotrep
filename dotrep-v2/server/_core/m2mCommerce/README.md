# Machine-to-Machine Commerce with x402 Protocol

Complete implementation for autonomous agent commerce using the x402 protocol. This module enables AI agents and machines to conduct economic transactions without human intervention.

## Overview

The M2M commerce infrastructure provides:

- **Near-zero fee micropayments** (as low as $0.001)
- **Instant settlement** (~2 seconds on blockchain)
- **Fully autonomous payments** (no human intervention required)
- **HTTP-native integration** (minimal code, one-line middleware)
- **Multi-chain support** (Base, Solana, Ethereum, Polygon, Arbitrum)
- **Trust-based dynamic pricing** (reputation-aware pricing)
- **Cross-chain payments** (bridge support for multi-chain commerce)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                M2M Commerce Layer                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Autonomous │  │  Smart      │  │  Trust & Reputation │  │
│  │   Agents    │  │  Contracts  │  │      Systems        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   x402      │  │  Micro-     │  │  Cross-Chain        │  │
│  │  Protocol   │  │ payments    │  │  Interoperability   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. x402 Payment Middleware

Express.js middleware that protects routes with HTTP 402 Payment Required.

```typescript
import { x402PaymentMiddleware } from './server/_core/m2mCommerce';

app.get('/api/premium/data',
  x402PaymentMiddleware({
    amount: '0.10',
    currency: 'USDC',
    recipient: process.env.MARKETPLACE_WALLET,
    description: 'Premium reputation analytics report'
  }),
  async (req, res) => {
    const data = await generatePremiumReport();
    res.json(data);
  }
);
```

### 2. Autonomous Payment Agent

Enables AI agents to automatically acquire paid resources.

```typescript
import { AutonomousPaymentAgent } from './server/_core/m2mCommerce';

const agent = new AutonomousPaymentAgent({
  agentId: 'my-ai-agent',
  payerAddress: '0x...',
  maxPaymentAmount: '100.0',
  minRecipientReputation: 0.7
});

// Automatically handles payment and acquires resource
const data = await agent.acquireResource(
  'https://api.example.com/premium/data',
  '0.15' // Max price
);
```

### 3. Trust-Based Dynamic Pricing

Reputation-aware pricing that adjusts based on buyer and seller trust scores.

```typescript
import { TrustBasedPricingEngine } from './server/_core/m2mCommerce';

const pricingEngine = new TrustBasedPricingEngine();

const price = await pricingEngine.calculateDynamicPrice({
  basePrice: '10.00',
  buyerReputation: 0.85, // High reputation buyer gets discount
  sellerReputation: 0.92, // High reputation seller charges premium
});
```

### 4. Marketplace Services

#### AI Endorsement Marketplace

```typescript
import { AIEndorsementMarketplace } from './server/_core/m2mCommerce';

const marketplace = new AIEndorsementMarketplace({
  agentId: 'campaign-agent',
  payerAddress: '0x...',
  maxPaymentAmount: '1000.00'
});

const endorsements = await marketplace.findAndPurchaseEndorsements({
  id: 'campaign-1',
  minInfluencerReputation: 0.8,
  maxBudget: 500,
  minROI: 2.0
});
```

#### Reputation Data Marketplace

```typescript
import { ReputationDataMarketplace } from './server/_core/m2mCommerce';

const dataMarketplace = new ReputationDataMarketplace(x402Handler);

dataMarketplace.setupDataProduct({
  id: 'reputation-analytics',
  price: '0.50',
  currency: 'USDC',
  accessUrl: '/api/data/reputation-analytics'
}, app);

// AI agent subscribes
const data = await dataMarketplace.subscribeToDataFeed(agent, 'reputation-analytics');
```

### 5. Cross-Chain Payment Processor

Enables payments across multiple blockchain networks.

```typescript
import { CrossChainPaymentProcessor } from './server/_core/m2mCommerce';

const processor = new CrossChainPaymentProcessor();

const result = await processor.handleCrossChainPayment({
  fromChain: 'base',
  toChain: 'polygon',
  amount: '50.00',
  currency: 'USDC',
  recipient: '0x...',
  payer: '0x...'
}, 'layerzero');
```

## Payment Flow

The typical x402 payment flow:

1. **Client Request**: Agent requests paid resource
2. **402 Response**: Server responds with HTTP 402 Payment Required + payment instructions
3. **Payment Authorization**: Client cryptographically signs payment authorization
4. **Retry with Proof**: Client retries request with `X-Payment-Authorization` header
5. **Verification**: Server verifies payment (via facilitator or on-chain)
6. **Access Granted**: Server fulfills request with 200 OK response

## Integration with Reputation Calculator

The M2M commerce system integrates with the reputation calculator to:

- Use reputation scores for trust-based pricing
- Weight payments by payer reputation (TraceRank-style)
- Provide additional boost for x402 protocol payments
- Enable reputation-weighted payment decisions

## Use Cases

### 1. Automated Campaign Management

AI agents automatically manage endorsement campaigns, discovering opportunities, purchasing endorsements, and monitoring performance.

### 2. Pay-Per-Query Reputation Data

Monetize reputation data through pay-per-query pricing. AI agents can purchase reputation reports, analytics, and insights.

### 3. Real-Time Data Streaming

Pay-per-stream reputation data updates via Server-Sent Events (SSE).

### 4. Cross-Chain Services

Pay for services on different blockchain networks using cross-chain bridges.

## Environment Variables

```bash
# x402 Configuration
X402_FACILITATOR_URL=https://facilitator.x402.org
X402_WALLET_ADDRESS=0x...

# Bridge Configuration
LAYERZERO_RPC_URL=https://...
AXELAR_RPC_URL=https://...
WORMHOLE_RPC_URL=https://...
```

## Examples

See `examples.ts` for comprehensive usage examples covering all components.

## Benefits

### For Service Providers

- **Unlocks New Business Models**: Pay-per-use pricing for APIs and services
- **Global Access**: Payments without user accounts or sign-ups
- **Reduced Infrastructure**: Offload complexity to facilitator services
- **Micropayment Viability**: Near-zero fees enable small transactions

### For AI Agents

- **Full Autonomy**: No human intervention required for payments
- **Real-Time Commerce**: Instant settlement enables real-time interactions
- **Trust-Based Pricing**: Better prices for high-reputation agents
- **Multi-Chain Support**: Pay for services across any supported chain

## References

- [x402 Protocol Specification](https://www.x402.org/x402-whitepaper.pdf)
- [x402 Ecosystem](https://www.x402.org/ecosystem)
- [Solana x402 Guide](https://solana.com/x402/what-is-x402)

## License

MIT

