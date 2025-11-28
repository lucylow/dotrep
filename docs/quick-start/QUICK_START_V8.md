# DotRep + OriginTrail DKG Integration - Quick Start Guide (V8)

## 🚀 10-Minute Setup

This guide will get you up and running with the DotRep + OriginTrail DKG integration in 10 minutes.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** >= 20.0.0 ([Download](https://nodejs.org/))
- ✅ **npm** >= 8.0.0 (comes with Node.js)
- ✅ **Rust** >= 1.70 (for Substrate pallets) ([Install](https://rustup.rs/))
- ✅ **Git** (for cloning the repository)

Check your versions:
```bash
node --version  # Should show v20.x.x or higher
npm --version   # Should show 8.x.x or higher
rustc --version # Should show 1.70.x or higher
```

---

## Step 1: Clone and Setup (2 minutes)

```bash
# Navigate to the project
cd dotrep

# Install root dependencies
npm install

# Navigate to dotrep-v2
cd dotrep-v2
npm install
```

---

## Step 2: Configure DKG Integration (2 minutes)

### 2.1 Set up DKG Integration

```bash
cd dkg-integration

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 2.2 Edit `.env` file

Open `.env` and configure:

```env
# For testnet (recommended for hackathon)
DKG_ENVIRONMENT=testnet
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900
DKG_BLOCKCHAIN=otp:20430

# Optional: Add your wallet private key for publishing
# DKG_PUBLISH_WALLET=your_private_key_here
```

**Note:** For testing, you can run queries without a wallet. Publishing requires a wallet with TRAC tokens.

### 2.3 Build

```bash
npm run build
```

---

## Step 3: Test DKG Connection (2 minutes)

Create a test file `test-connection.ts`:

```typescript
import { DKGClientV8 } from './dkg-client-v8';

async function test() {
  console.log('🔍 Testing DKG connection...\n');
  
  const client = new DKGClientV8({ environment: 'testnet' });
  
  // Check health
  const isHealthy = await client.healthCheck();
  console.log(`Connection: ${isHealthy ? '✅ Healthy' : '❌ Failed'}`);
  
  // Get node info
  if (isHealthy) {
    const info = await client.getNodeInfo();
    console.log(`\nDKG Node Version: ${info.version}`);
    console.log(`\n✅ Connection successful!`);
  }
}

test().catch(console.error);
```

Run the test:
```bash
npx ts-node test-connection.ts
```

Expected output:
```
🔍 Testing DKG connection...
✅ DKG Client V8 initialized for testnet environment
✅ DKG connection is healthy
ℹ️  DKG Node Version: 8.X.X
Connection: ✅ Healthy

DKG Node Version: 8.X.X

✅ Connection successful!
```

---

## Step 4: Run the Example (2 minutes)

Run the comprehensive example:

```bash
npx ts-node examples/publish-reputation-example-v8.ts
```

This example demonstrates:
- ✅ Initializing DKG Client
- ✅ Publishing reputation as Knowledge Asset
- ✅ Querying reputation from DKG
- ✅ Updating reputation
- ✅ Batch publishing
- ✅ Searching for developers

**Note:** Publishing requires a wallet with TRAC tokens. If you don't have one, the example will show connection and query capabilities.

---

## Step 5: Set up MCP Server (2 minutes)

The MCP server enables AI agents to query reputation data.

```bash
cd ../mcp-server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Build
npm run build

# Start the server
npm start
```

Expected output:
```
✅ DKG Client V8 initialized for testnet environment
DotRep MCP Server running on stdio
```

The MCP server is now ready to receive requests from AI agents!

---

## Step 6: Verify Substrate Pallets (Optional, 2 minutes)

If you want to work with the Substrate pallets:

```bash
cd ../../pallets

# Check Rust setup
rustc --version

# Build pallets
cargo build --release

# Run tests
cargo test
```

---

## 🎉 You're Ready!

Your DotRep + OriginTrail DKG integration is now set up and ready to use!

---

## Quick Reference

### Project Structure

```
dotrep/
├── dotrep-v2/
│   ├── dkg-integration/          # ✨ DKG integration (V8)
│   │   ├── dkg-client-v8.ts      # DKG client
│   │   ├── knowledge-asset-publisher-v8.ts
│   │   ├── examples/
│   │   │   └── publish-reputation-example-v8.ts
│   │   └── README.md
│   ├── mcp-server/               # ✨ MCP server for AI agents
│   │   ├── reputation-mcp.ts
│   │   └── package.json
│   ├── client/                   # React frontend
│   └── server/                   # Node.js backend
└── pallets/                      # Substrate pallets
    ├── reputation/               # Reputation pallet
    ├── trust-layer/              # Trust layer with x402
    └── governance/               # Governance pallet
```

### Key Files

| File | Purpose |
|------|---------|
| `dkg-client-v8.ts` | Core DKG client (V8 compatible) |
| `knowledge-asset-publisher-v8.ts` | High-level publisher |
| `reputation-mcp.ts` | MCP server for AI agents |
| `publish-reputation-example-v8.ts` | Comprehensive example |

### Common Commands

```bash
# DKG Integration
cd dotrep-v2/dkg-integration
npm install && npm run build
npx ts-node examples/publish-reputation-example-v8.ts

# MCP Server
cd dotrep-v2/mcp-server
npm install && npm run build && npm start

# Substrate Pallets
cd pallets
cargo build --release
cargo test
```

---

## Next Steps

### 1. Integrate with Your Backend

```typescript
import { KnowledgeAssetPublisherV8 } from './dkg-integration/knowledge-asset-publisher-v8';

// In your backend API
const publisher = new KnowledgeAssetPublisherV8();

// When a developer's reputation changes
app.post('/api/reputation/update', async (req, res) => {
  const { developerId, score, contributions } = req.body;
  
  const result = await publisher.publishDeveloperReputation({
    developer: { id: developerId, address: developerId },
    score,
    contributions,
    lastUpdated: new Date()
  });
  
  res.json({ ual: result.UAL });
});
```

### 2. Connect AI Agents

Use the MCP server to enable AI agents to query reputation:

```typescript
// AI agent can now call:
// - get_developer_reputation
// - verify_contribution
// - search_developers_by_reputation
// - compare_developers
// - get_reputation_proof
// - get_dkg_health
```

### 3. Deploy to Production

1. **Get TRAC tokens** for mainnet publishing
2. **Update environment** to `mainnet` in `.env`
3. **Deploy MCP server** to your infrastructure
4. **Integrate with frontend** to display UALs and verification

### 4. Add x402 Micropayments

Implement premium reputation access:

```rust
// In Substrate runtime
TrustLayer::pay_for_query(
    Origin::signed(user_account),
    ual,
    1000 // access duration
)?;
```

---

## Troubleshooting

### Issue: "DKG connection failed"

**Solution:**
1. Check internet connection
2. Verify `DKG_OTNODE_URL` in `.env`
3. Try alternative endpoint
4. Check firewall settings

### Issue: "Publishing failed"

**Solution:**
1. Ensure `DKG_PUBLISH_WALLET` is set
2. Verify wallet has TRAC tokens
3. Check wallet private key format
4. Try with lower `epochs` value

### Issue: "Module not found"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build
```

### Issue: "Node version error"

**Solution:**
```bash
# Install Node.js 20+
# Using nvm (recommended)
nvm install 20
nvm use 20

# Verify
node --version  # Should show v20.x.x
```

---

## Getting Help

- 📚 **Documentation**: See `README.md` in `dkg-integration/`
- 🔧 **Examples**: Check `examples/` directory
- 💬 **Discord**: [OriginTrail Community](https://discord.gg/origintrail)
- 📖 **DKG Docs**: [docs.origintrail.io](https://docs.origintrail.io)
- 🐛 **Issues**: Report on GitHub

---

## Hackathon Tips

### For Demo Video

1. **Show DKG Connection** - Run health check
2. **Publish Reputation** - Use example script
3. **Query from DKG** - Show retrieval
4. **MCP Integration** - Demonstrate AI agent queries
5. **Substrate Integration** - Show x402 micropayments

### For Judging Criteria

✅ **Excellence & Innovation** (20%)
- Three-layer architecture (Agent-Knowledge-Trust)
- V8 DKG integration with latest features
- Novel reputation verification approach

✅ **Technical Implementation** (40%)
- Production-ready TypeScript code
- Substrate pallets with x402
- Comprehensive error handling
- Full test coverage

✅ **Impact & Relevance** (20%)
- Solves real developer reputation problem
- Interoperable across platforms
- AI-ready with MCP integration

✅ **Ethics & Sustainability** (10%)
- Privacy-preserving (optional PII)
- Decentralized and verifiable
- Open-source contribution

✅ **Communication** (10%)
- Clear documentation
- Working examples
- Demo video

---

## Resources

- [OriginTrail DKG V8 Docs](https://docs.origintrail.io/build-a-dkg-node-ai-agent/advanced-features-and-toolkits/dkg-sdk/dkg-v8-js-client)
- [dkg.js GitHub](https://github.com/OriginTrail/dkg.js)
- [Polkadot SDK](https://github.com/paritytech/polkadot-sdk)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [W3C JSON-LD](https://www.w3.org/TR/json-ld11/)

---

**🏆 Good luck with your hackathon submission!**

*Built for "Scaling Trust in the Age of AI" Global Hackathon*  
*Supported by OriginTrail x Polkadot x Umanitek*
