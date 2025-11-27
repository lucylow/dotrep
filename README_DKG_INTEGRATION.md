# DotRep + OriginTrail DKG Integration

## 🏆 Hackathon Submission: Scaling Trust in the Age of AI

**Supported by OriginTrail x Polkadot x Umanitek**

---

## Overview

**DotRep** is a production-ready decentralized reputation system built on Polkadot SDK, now enhanced with **OriginTrail Decentralized Knowledge Graph (DKG)** integration. This integration creates a verifiable, AI-ready reputation platform that implements the complete three-layer architecture (Agent-Knowledge-Trust) required for building trusted AI systems.

### What's New in This Integration

This codebase extends the original DotRep project with:

✅ **OriginTrail DKG Integration** - Reputation data published as verifiable Knowledge Assets  
✅ **Model Context Protocol (MCP) Server** - AI agents can query and verify reputation  
✅ **x402 Micropayment Layer** - Premium reputation access via micropayments  
✅ **Token Staking for Credibility** - Economic incentives for reputation accuracy  
✅ **Three-Layer Architecture** - Agent, Knowledge, and Trust layers fully implemented  
✅ **NeuroWeb Integration** - Blockchain anchoring on Polkadot parachain  

---

## Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT LAYER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MCP Server (Model Context Protocol)                 │  │
│  │  - 6 AI agent tools for reputation queries           │  │
│  │  - Decentralized RAG (dRAG) for verifiable AI        │  │
│  │  - Developer comparison and verification             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  KNOWLEDGE LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OriginTrail DKG (Decentralized Knowledge Graph)     │  │
│  │  - Knowledge Assets (W3C JSON-LD/RDF)                │  │
│  │  - Verifiable reputation data                        │  │
│  │  - SPARQL semantic queries                           │  │
│  │  - UAL (Uniform Asset Locator) addressing            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    TRUST LAYER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Polkadot Substrate Runtime                          │  │
│  │  - DotRep Parachain (existing)                       │  │
│  │  - NeuroWeb Blockchain (OriginTrail on Polkadot)     │  │
│  │  - x402 Micropayment Protocol                        │  │
│  │  - Token Staking (TRAC/NEURO)                        │  │
│  │  - XCM Cross-Chain Messaging                         │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. DKG Integration Module (`dotrep-v2/dkg-integration/`)

**Files**:
- `dkg-client.ts` - Core DKG client for publishing/querying Knowledge Assets
- `knowledge-asset-publisher.ts` - High-level publisher for reputation data
- `schemas/reputation-schema.json` - W3C-compliant JSON-LD schema

**Features**:
- Publish reputation scores as verifiable Knowledge Assets
- Query reputation using UAL (Uniform Asset Locator)
- SPARQL queries for semantic graph searches
- Support for testnet/mainnet/local deployments

### 2. MCP Server (`dotrep-v2/mcp-server/`)

**File**: `reputation-mcp.ts`

**AI Agent Tools**:
1. `get_developer_reputation` - Query reputation with verifiable proofs
2. `verify_contribution` - Verify contribution authenticity
3. `search_developers_by_reputation` - Search by reputation score
4. `get_reputation_proof` - Get blockchain proof
5. `compare_developers` - Compare multiple developers
6. `get_dkg_health` - Monitor DKG connection

### 3. Substrate Pallets

#### Reputation Pallet DKG Integration (`pallets/reputation/src/dkg_integration.rs`)
- UAL storage on-chain
- Publishing queue for off-chain workers
- DKG endpoint configuration
- Event emission for DKG operations

#### Trust Layer Pallet (`pallets/trust-layer/src/lib.rs`)
- x402 micropayment implementation
- Token staking for reputation credibility
- Payment channels for efficient micropayments
- Custom pricing per Knowledge Asset

---

## Quick Start

### Prerequisites
- Node.js >= 18
- Rust >= 1.70
- OriginTrail testnet wallet (optional)

### Installation

```bash
# 1. Navigate to project
cd dotrep/dotrep-v2

# 2. Install dependencies
npm install

# 3. Install DKG integration
cd dkg-integration
npm install

# 4. Configure environment
cp .env.example .env
# Edit .env with your DKG configuration

# 5. Build
npm run build

# 6. Run example
npx ts-node examples/publish-reputation-example.ts
```

### Start MCP Server

```bash
cd mcp-server
npm install
npm run build
npm start
```

### Build Substrate Pallets

```bash
cd ../../pallets
cargo build --release
cargo test
```

**Full setup guide**: See `QUICK_START_DKG.md`

---

## Usage Examples

### Example 1: Publish Reputation to DKG

```typescript
import { DKGClient } from './dkg-integration/dkg-client';

const client = new DKGClient({ environment: 'testnet' });

const result = await client.publishReputationAsset({
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  reputationScore: 850,
  contributions: [
    {
      id: 'contrib-001',
      type: 'github_pr',
      url: 'https://github.com/paritytech/polkadot-sdk/pull/1234',
      title: 'Add new consensus mechanism',
      date: '2025-11-15T10:30:00Z',
      impact: 95
    }
  ],
  timestamp: Date.now(),
  metadata: {}
});

console.log(`Published to DKG: ${result.UAL}`);
```

### Example 2: AI Agent Queries Reputation

```typescript
// AI agent using MCP
const mcpClient = new MCPClient('http://localhost:9200');

const reputation = await mcpClient.callTool('get_developer_reputation', {
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  includeContributions: true
});

console.log(`Reputation: ${reputation.reputationScore}`);
console.log(`Verified: ${reputation.verified}`);
console.log(`Source: ${reputation.source}`); // "OriginTrail DKG"
```

### Example 3: Pay for Premium Access (Substrate)

```rust
// User pays for premium reputation query
TrustLayer::pay_for_query(
    Origin::signed(user_account),
    ual,
    1000 // access duration in blocks
)?;

// Check access
let has_access = TrustLayer::has_query_access(&user_account, &ual);
```

### Example 4: Stake Tokens for Credibility

```rust
// Developer stakes tokens to boost reputation
TrustLayer::stake_tokens(
    Origin::signed(developer_account),
    1000 * UNITS // 1000 TRAC tokens
)?;

// Get credibility boost
let boost = TrustLayer::credibility_boost(&developer_account);
// Returns percentage boost (e.g., 10% for 10x minimum stake)
```

---

## Hackathon Alignment

### Challenge: Social Graph Reputation ✅

**Requirements Met**:
- ✅ Compute reputation from social graph (GitHub/GitLab contributions)
- ✅ PageRank + token staking for Sybil resistance
- ✅ Publish scores to DKG for transparent querying
- ✅ Power trusted feeds and data APIs
- ✅ x402 micropayments for premium access

### Three-Layer Architecture ✅

- ✅ **Agent Layer**: MCP server with 6 AI agent tools
- ✅ **Knowledge Layer**: OriginTrail DKG with JSON-LD Knowledge Assets
- ✅ **Trust Layer**: Polkadot Substrate + x402 micropayments

### OriginTrail Integration (Main Sponsor) ✅

- ✅ **DKG Edge Node**: Full integration via dkg.js SDK
- ✅ **Knowledge Assets**: W3C-compliant JSON-LD schemas
- ✅ **NeuroWeb**: Blockchain anchoring on Polkadot parachain
- ✅ **x402 Protocol**: Micropayments for premium data access
- ✅ **dRAG**: Decentralized Retrieval Augmented Generation

### Polkadot Integration ✅

- ✅ **Substrate Runtime**: Custom pallets for DKG and trust layer
- ✅ **XCM**: Cross-chain reputation queries
- ✅ **Parachain**: NeuroWeb integration
- ✅ **Multi-chain**: Interoperability across ecosystem

---

## Project Structure

```
dotrep/
├── dotrep-v2/
│   ├── dkg-integration/          # NEW: OriginTrail DKG integration
│   │   ├── dkg-client.ts
│   │   ├── knowledge-asset-publisher.ts
│   │   ├── schemas/
│   │   │   └── reputation-schema.json
│   │   ├── examples/
│   │   │   └── publish-reputation-example.ts
│   │   └── package.json
│   ├── mcp-server/               # NEW: MCP server for AI agents
│   │   └── reputation-mcp.ts
│   ├── client/                   # Existing: React frontend
│   ├── server/                   # Existing: Node.js backend
│   └── package.json
├── pallets/
│   ├── reputation/
│   │   └── src/
│   │       ├── lib.rs            # Existing: Reputation pallet
│   │       ├── dkg_integration.rs # NEW: DKG integration
│   │       └── offchain.rs       # Existing: Off-chain workers
│   └── trust-layer/              # NEW: Trust layer pallet
│       └── src/
│           └── lib.rs            # x402 micropayments & staking
├── ORIGINTRAIL_DKG_INTEGRATION.md # NEW: Full documentation
├── QUICK_START_DKG.md            # NEW: Quick start guide
└── README.md                     # Existing: Original DotRep README
```

---

## Technical Highlights

### Innovation

1. **Verifiable Reputation**: First reputation system with DKG-backed verifiability
2. **AI-Ready**: Native MCP support for AI agent integration
3. **Economic Incentives**: x402 micropayments + token staking
4. **Multi-Chain**: Polkadot + NeuroWeb cross-chain architecture

### Technical Excellence

- **W3C Standards**: JSON-LD/RDF for Knowledge Assets
- **Substrate FRAME**: Production-ready Rust pallets
- **Type Safety**: Full TypeScript implementation
- **Testing**: Comprehensive test coverage
- **Documentation**: Extensive docs and examples

### Impact

- **Developers**: Portable, verifiable reputation across platforms
- **Employers**: Trustworthy hiring data with cryptographic proofs
- **AI Systems**: Verifiable context for LLM decision-making
- **Web3 Ecosystem**: Cross-chain reputation infrastructure

---

## Documentation

- **Full Integration Guide**: `ORIGINTRAIL_DKG_INTEGRATION.md`
- **Quick Start**: `QUICK_START_DKG.md`
- **Original DotRep**: `README.md`
- **Hackathon Requirements**: See uploaded documents

---

## Demo Video

[TODO: Add demo video link]

**Demo showcases**:
1. Publishing developer reputation to DKG
2. AI agent querying reputation via MCP
3. x402 micropayment for premium access
4. Token staking for credibility boost
5. Cross-chain reputation verification

---

## Team

**DotRep Team** - Building verifiable reputation infrastructure for Web3

---

## Resources

- **OriginTrail Docs**: https://docs.origintrail.io
- **DKG Node**: https://github.com/origintrail/dkg-node
- **DKG Engine**: https://github.com/origintrail/dkg-engine
- **Polkadot SDK**: https://github.com/paritytech/polkadot-sdk
- **MCP Spec**: https://modelcontextprotocol.io

---

## License

Apache 2.0 - See LICENSE file

---

## Acknowledgments

Special thanks to:
- **OriginTrail** - For the DKG infrastructure and support
- **Polkadot** - For the Substrate framework
- **Umanitek** - For the Guardian knowledge base
- **DoraHacks** - For hosting the hackathon

---

**Built for the "Scaling Trust in the Age of AI" Global Hackathon**  
*Supported by OriginTrail x Polkadot x Umanitek*

🏆 **Competing in**: Social Graph Reputation Track  
🎯 **Focus**: OriginTrail Integration (Main Sponsor)
