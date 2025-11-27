# Quick Start: DotRep + OriginTrail DKG Integration

This guide will get you up and running with the DotRep + OriginTrail DKG integration in under 10 minutes.

## Prerequisites

- Node.js >= 18
- npm or yarn
- OriginTrail testnet wallet (optional for testing)

## Step 1: Clone and Setup

```bash
# Navigate to the DotRep project
cd dotrep/dotrep-v2

# Install dependencies
npm install

# Install DKG integration dependencies
cd dkg-integration
npm install
cd ..
```

## Step 2: Configure Environment

Create a `.env` file in `dotrep-v2/`:

```env
# DKG Configuration (Testnet)
DKG_ENVIRONMENT=testnet
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900
DKG_BLOCKCHAIN=otp:20430

# Optional: Add your wallet for publishing (get testnet tokens from Discord)
# DKG_PUBLISH_WALLET=0x...

# Database
DATABASE_URL=./dotrep.db

# API
PORT=3000
```

## Step 3: Test DKG Connection

```bash
cd dkg-integration

# Build TypeScript
npm run build

# Run example (read-only, no wallet needed)
npx ts-node examples/publish-reputation-example.ts
```

Expected output:
```
=== DotRep + OriginTrail DKG Integration Example ===

Step 1: Initializing DKG Client...
DKG Connection: ✅ Healthy

Step 2: Creating sample reputation data...
Developer ID: 5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
Reputation Score: 850/1000
Contributions: 3
...
```

## Step 4: Start MCP Server (for AI Agents)

```bash
cd ../mcp-server

# Install dependencies
npm install

# Build
npm run build

# Start MCP server
npm start
```

The MCP server will be available for AI agents to query reputation data.

## Step 5: Test AI Agent Integration

Create a test file `test-mcp-client.ts`:

```typescript
import { MCPClient } from '@modelcontextprotocol/sdk/client';

const client = new MCPClient('http://localhost:9200');

// Query developer reputation
const result = await client.callTool('get_developer_reputation', {
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  includeContributions: true
});

console.log(result);
```

## Step 6: Build Substrate Pallets (Optional)

```bash
cd ../../pallets

# Build reputation pallet with DKG integration
cargo build --release -p pallet-reputation

# Build trust layer pallet
cargo build --release -p pallet-trust-layer

# Run tests
cargo test
```

## Key Features Demonstrated

### 1. Knowledge Asset Publishing
```typescript
import { DKGClient } from './dkg-integration/dkg-client';

const client = new DKGClient({ environment: 'testnet' });

const result = await client.publishReputationAsset({
  developerId: 'alice',
  reputationScore: 850,
  contributions: [...],
  timestamp: Date.now(),
  metadata: {}
});

console.log(`Published: ${result.UAL}`);
```

### 2. AI Agent Queries via MCP
```typescript
// AI agent queries reputation
const reputation = await mcpClient.callTool('get_developer_reputation', {
  developerId: 'alice'
});
```

### 3. x402 Micropayments (Substrate)
```rust
// Pay for premium reputation access
TrustLayer::pay_for_query(
    Origin::signed(user),
    ual,
    access_duration
)?;
```

### 4. Token Staking for Credibility
```rust
// Stake tokens to boost reputation
TrustLayer::stake_tokens(
    Origin::signed(developer),
    1000 * UNITS
)?;
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│  AI Agents (MCP)                        │
│  - Query reputation                     │
│  - Verify contributions                 │
│  - Compare developers                   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  OriginTrail DKG                        │
│  - Knowledge Assets (JSON-LD)           │
│  - Verifiable reputation data           │
│  - SPARQL queries                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Polkadot Substrate                     │
│  - DotRep Parachain                     │
│  - NeuroWeb (DKG blockchain)            │
│  - x402 micropayments                   │
│  - Token staking                        │
└─────────────────────────────────────────┘
```

## Common Use Cases

### Use Case 1: Publish Developer Reputation
```bash
# Run the publisher example
npx ts-node dkg-integration/examples/publish-reputation-example.ts
```

### Use Case 2: Query Reputation via AI Agent
```bash
# Start MCP server
cd mcp-server && npm start

# In another terminal, test with MCP client
# (Use any MCP-compatible AI agent or client)
```

### Use Case 3: Pay for Premium Reputation Data
```bash
# Build and run Substrate node
cargo build --release
./target/release/dotrep-node --dev

# Submit extrinsic via Polkadot.js UI
# TrustLayer.payForQuery(ual, duration)
```

## Troubleshooting

### DKG Connection Failed
- **Check**: `DKG_OTNODE_URL` is accessible
- **Solution**: Try `curl https://v6-pegasus-node-02.origin-trail.network:8900`

### Publishing Failed (No Wallet)
- **Issue**: `DKG_PUBLISH_WALLET` not set
- **Solution**: Get testnet tokens from [OriginTrail Discord](https://discord.gg/origintrail)

### MCP Server Not Starting
- **Check**: Port 9200 is available
- **Solution**: Change `PORT` in `.env` or kill process using port

### Substrate Build Errors
- **Check**: Rust version >= 1.70
- **Solution**: `rustup update stable`

## Next Steps

1. **Integrate with existing DotRep backend**:
   - Connect to DotRep database
   - Auto-publish on reputation updates
   - Store UALs in database

2. **Deploy to production**:
   - Switch to mainnet configuration
   - Set up proper wallet management
   - Configure production DKG node

3. **Enhance AI agent capabilities**:
   - Add more MCP tools
   - Implement dRAG workflows
   - Create agent swarms

4. **Add advanced features**:
   - Cross-chain reputation queries
   - Privacy-preserving proofs
   - Decentralized governance

## Resources

- **Full Documentation**: See `ORIGINTRAIL_DKG_INTEGRATION.md`
- **OriginTrail Docs**: https://docs.origintrail.io
- **Polkadot SDK**: https://github.com/paritytech/polkadot-sdk
- **MCP Spec**: https://modelcontextprotocol.io

## Support

- **GitHub Issues**: https://github.com/lucylow/dotrep/issues
- **OriginTrail Discord**: https://discord.gg/origintrail
- **Hackathon Support**: Check hackathon Discord channel

---

**Ready to build?** Start with the example scripts and customize for your use case!
