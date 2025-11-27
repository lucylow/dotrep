# OriginTrail DKG Integration for DotRep

## Overview

This document describes the integration of **OriginTrail Decentralized Knowledge Graph (DKG)** into the **DotRep** Polkadot-based reputation system. This integration implements a three-layer architecture (Agent-Knowledge-Trust) as required for the "Scaling Trust in the Age of AI" hackathon.

## Architecture

### Three-Layer Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT LAYER                               │
│  - AI Agents with Model Context Protocol (MCP)              │
│  - Decentralized Retrieval Augmented Generation (dRAG)      │
│  - Verifiable AI responses from DKG                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  KNOWLEDGE LAYER                             │
│  - OriginTrail DKG Edge Node                                 │
│  - Knowledge Assets (JSON-LD/RDF)                            │
│  - Reputation data as verifiable graph entities              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    TRUST LAYER                               │
│  - Polkadot Substrate Runtime (DotRep Parachain)            │
│  - NeuroWeb Blockchain (OriginTrail on Polkadot)            │
│  - x402 Micropayments for premium data access                │
│  - Token staking for reputation credibility                  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. DKG Integration Module (`dotrep-v2/dkg-integration/`)

#### `dkg-client.ts`
Core client for interacting with OriginTrail DKG:
- **Purpose**: Publish and query reputation data as Knowledge Assets
- **Key Features**:
  - Connect to OriginTrail testnet/mainnet
  - Publish reputation scores as JSON-LD Knowledge Assets
  - Query reputation using UAL (Uniform Asset Locator)
  - SPARQL queries for semantic graph searches
  - Health checks and node info

**Usage Example**:
```typescript
import { DKGClient } from './dkg-integration/dkg-client';

const client = new DKGClient({
  environment: 'testnet' // or 'mainnet', 'local'
});

// Publish reputation
const result = await client.publishReputationAsset({
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  reputationScore: 850,
  contributions: [...],
  timestamp: Date.now(),
  metadata: {}
});

console.log(`Published to DKG: ${result.UAL}`);

// Query reputation
const reputation = await client.queryReputation(result.UAL);
```

#### `knowledge-asset-publisher.ts`
High-level publisher for converting DotRep data to Knowledge Assets:
- **Purpose**: Automate conversion and publishing of reputation data
- **Key Features**:
  - Convert DotRep reputation format to JSON-LD
  - Batch publishing for multiple developers
  - UAL caching for efficient lookups
  - Update existing Knowledge Assets

**Usage Example**:
```typescript
import { KnowledgeAssetPublisher } from './dkg-integration/knowledge-asset-publisher';

const publisher = new KnowledgeAssetPublisher();

// Publish single developer
await publisher.publishDeveloperReputation({
  developer: {
    id: 'alice',
    address: '5GrwvaEF...',
    githubId: 'alice-dev'
  },
  score: 850,
  contributions: [...],
  lastUpdated: new Date()
});

// Batch publish
await publisher.batchPublish([dev1, dev2, dev3]);
```

### 2. MCP Server (`dotrep-v2/mcp-server/`)

#### `reputation-mcp.ts`
Model Context Protocol server for AI agent integration:
- **Purpose**: Expose reputation data to AI agents via MCP
- **Key Features**:
  - 6 MCP tools for AI agents
  - Verifiable reputation queries
  - Contribution verification
  - Developer comparison
  - DKG health monitoring

**Available MCP Tools**:

1. **`get_developer_reputation`**
   - Get reputation score and contribution history
   - Returns verifiable data from DKG
   
2. **`verify_contribution`**
   - Verify authenticity of a contribution
   - Uses cryptographic proofs from DKG

3. **`search_developers_by_reputation`**
   - Search developers by reputation score range
   - SPARQL-based semantic search

4. **`get_reputation_proof`**
   - Get blockchain proof of reputation
   - Cryptographic verification

5. **`compare_developers`**
   - Compare multiple developers
   - Side-by-side reputation analysis

6. **`get_dkg_health`**
   - Check DKG connection status
   - Node health monitoring

**Running the MCP Server**:
```bash
cd dotrep-v2/mcp-server
npm install
npm run build
node reputation-mcp.js
```

### 3. Substrate Pallets

#### Reputation Pallet DKG Integration (`pallets/reputation/src/dkg_integration.rs`)
Substrate runtime integration for DKG publishing:
- **Purpose**: On-chain integration with DKG
- **Key Features**:
  - UAL storage on-chain
  - Publishing queue for off-chain workers
  - DKG endpoint configuration
  - Event emission for off-chain processing

**Key Functions**:
```rust
// Queue reputation for DKG publishing
pub fn queue_for_publishing(origin, reputation_score: u32) -> DispatchResult

// Store UAL mapping on-chain
pub fn store_ual(origin, ual: Vec<u8>) -> DispatchResult

// Configure DKG endpoint
pub fn set_dkg_endpoint(origin, endpoint: Vec<u8>) -> DispatchResult
```

**Events**:
- `ReputationQueued`: Reputation added to publishing queue
- `UALStored`: UAL mapping stored on-chain
- `DKGPublished`: Reputation successfully published to DKG
- `DKGEndpointUpdated`: DKG endpoint configuration updated

#### Trust Layer Pallet (`pallets/trust-layer/src/lib.rs`)
x402 micropayment and token staking implementation:
- **Purpose**: Economic layer for premium reputation access
- **Key Features**:
  - Token staking for reputation credibility
  - x402 micropayments for premium queries
  - Payment channels for efficient micropayments
  - Custom pricing per Knowledge Asset

**Key Functions**:
```rust
// Stake tokens for credibility boost
pub fn stake_tokens(origin, amount: BalanceOf<T>) -> DispatchResult

// Pay for premium reputation query access
pub fn pay_for_query(origin, ual: Vec<u8>, access_duration: BlockNumberFor<T>) -> DispatchResult

// Open payment channel for micropayments
pub fn open_payment_channel(origin, payee: T::AccountId, deposit: BalanceOf<T>) -> DispatchResult

// Set custom query price
pub fn set_custom_query_price(origin, ual: Vec<u8>, price: BalanceOf<T>) -> DispatchResult
```

### 4. JSON-LD Schemas (`dotrep-v2/dkg-integration/schemas/`)

#### `reputation-schema.json`
W3C-compliant ontology for reputation Knowledge Assets:
- **Purpose**: Standardize reputation data format
- **Key Classes**:
  - `dotrep:DeveloperReputation`: Developer reputation entity
  - `dotrep:Contribution`: Verified contribution
  - `dotrep:BlockchainProof`: Cryptographic proof

**Example Knowledge Asset**:
```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "dotrep": "https://dotrep.io/ontology/"
  },
  "@type": "Person",
  "@id": "did:polkadot:5GrwvaEF...",
  "dotrep:reputationScore": 850,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 850,
    "ratingCount": 42
  },
  "dotrep:contributions": [...]
}
```

## Setup Instructions

### Prerequisites

1. **Node.js** >= 18
2. **Rust** >= 1.70
3. **OriginTrail DKG Account**:
   - Testnet wallet with TRAC tokens
   - Get testnet tokens from [OriginTrail Discord](https://discord.gg/origintrail)

### Environment Configuration

Create `.env` file in `dotrep-v2/`:

```env
# DKG Configuration
DKG_ENVIRONMENT=testnet
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900
DKG_BLOCKCHAIN=otp:20430
DKG_PUBLISH_WALLET=0x... # Your private key (testnet)

# Database
DATABASE_URL=./dotrep.db

# API Configuration
PORT=3000
API_URL=http://localhost:3000
```

### Installation

#### 1. Install DKG Integration Dependencies

```bash
cd dotrep-v2

# Install dkg.js SDK
npm install dkg.js

# Install MCP SDK
npm install @modelcontextprotocol/sdk

# Install TypeScript and build tools
npm install -D typescript @types/node

# Build DKG integration
npm run build:dkg
```

#### 2. Build Substrate Pallets

```bash
cd ../pallets

# Build reputation pallet with DKG integration
cargo build --release -p pallet-reputation

# Build trust layer pallet
cargo build --release -p pallet-trust-layer
```

#### 3. Run Tests

```bash
# Test DKG integration
cd dotrep-v2
npm test dkg-integration

# Test Substrate pallets
cd ../pallets
cargo test
```

## Usage Workflows

### Workflow 1: Publish Developer Reputation to DKG

```typescript
import { KnowledgeAssetPublisher } from './dkg-integration/knowledge-asset-publisher';

// Initialize publisher
const publisher = new KnowledgeAssetPublisher();

// Fetch developer data from DotRep database
const developerData = await fetchDeveloperFromDB('alice');

// Publish to DKG
const result = await publisher.publishDeveloperReputation({
  developer: {
    id: developerData.id,
    address: developerData.polkadotAddress,
    githubId: developerData.githubId
  },
  score: developerData.reputationScore,
  contributions: developerData.contributions,
  lastUpdated: new Date()
});

console.log(`Published to DKG: ${result.UAL}`);

// Store UAL on-chain (via Substrate extrinsic)
await storeUALOnChain(developerData.address, result.UAL);
```

### Workflow 2: AI Agent Queries Reputation

```typescript
// AI agent using MCP to query reputation
const mcpClient = new MCPClient('http://localhost:9200');

const reputation = await mcpClient.callTool('get_developer_reputation', {
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  includeContributions: true
});

console.log(`Reputation: ${reputation.reputationScore}`);
console.log(`Verified: ${reputation.verified}`);
console.log(`Source: ${reputation.source}`);
```

### Workflow 3: Premium Query with x402 Micropayment

```rust
// User pays for premium reputation access
let ual = b"did:dkg:otp/2043/0x1234...".to_vec();
let access_duration = 1000; // blocks

// Pay for query access
TrustLayer::pay_for_query(
    Origin::signed(user_account),
    ual.clone(),
    access_duration
)?;

// Check access
let has_access = TrustLayer::has_query_access(&user_account, &ual);
```

### Workflow 4: Stake Tokens for Credibility Boost

```rust
// Developer stakes tokens to boost reputation credibility
let stake_amount = 1000 * UNITS; // 1000 TRAC tokens

TrustLayer::stake_tokens(
    Origin::signed(developer_account),
    stake_amount
)?;

// Calculate credibility boost
let boost = TrustLayer::credibility_boost(&developer_account);
// Returns boost percentage (e.g., 10% for 10x minimum stake)
```

## Integration with Existing DotRep Features

### Off-Chain Workers
The existing off-chain worker in `pallets/reputation/src/offchain.rs` can be extended to:
1. Monitor the publishing queue
2. Fetch reputation data from on-chain storage
3. Call DKG client to publish Knowledge Assets
4. Submit UAL back to chain via signed transaction

### XCM Cross-Chain Messaging
The DKG integration enhances XCM capabilities:
- Query reputation from other parachains via DKG
- Share Knowledge Assets across Polkadot ecosystem
- NeuroWeb parachain integration for DKG anchoring

## Hackathon Alignment

### Challenge: Social Graph Reputation ✅
- **Requirement**: Compute reputation from social graph
- **Implementation**: DotRep reputation scores published as Knowledge Assets
- **Bonus**: PageRank + token staking for Sybil resistance

### Three-Layer Architecture ✅
- **Agent Layer**: MCP server with 6 AI agent tools
- **Knowledge Layer**: OriginTrail DKG with JSON-LD Knowledge Assets
- **Trust Layer**: Polkadot Substrate + x402 micropayments

### OriginTrail Integration ✅
- **DKG Edge Node**: Full integration via dkg.js SDK
- **Knowledge Assets**: W3C-compliant JSON-LD schemas
- **NeuroWeb**: Blockchain anchoring on Polkadot parachain
- **x402 Protocol**: Micropayments for premium data

### Polkadot Integration ✅
- **Substrate Runtime**: Custom pallets for DKG and trust layer
- **XCM**: Cross-chain reputation queries
- **Parachain**: NeuroWeb integration for DKG
- **Multi-chain**: Interoperability across Polkadot ecosystem

## Testing

### Test DKG Connection
```bash
cd dotrep-v2
npm run test:dkg-health
```

### Test Knowledge Asset Publishing
```bash
npm run test:publish-reputation
```

### Test MCP Server
```bash
npm run test:mcp-server
```

### Test Substrate Pallets
```bash
cd pallets
cargo test --package pallet-reputation
cargo test --package pallet-trust-layer
```

## Deployment

### Deploy to OriginTrail Testnet
```bash
# Set environment to testnet
export DKG_ENVIRONMENT=testnet

# Run DKG integration
cd dotrep-v2
npm run start:dkg
```

### Deploy MCP Server
```bash
cd dotrep-v2/mcp-server
npm run build
npm run start
```

### Deploy Substrate Node
```bash
cd ..
cargo build --release
./target/release/dotrep-node --dev
```

## Future Enhancements

1. **Advanced SPARQL Queries**: Complex graph traversals for reputation analysis
2. **AI Agent Swarms**: Multiple agents collaborating via shared DKG knowledge
3. **Cross-Parachain Reputation**: Query reputation across all Polkadot parachains
4. **Decentralized Governance**: DAO voting on reputation parameters
5. **Privacy-Preserving Reputation**: Zero-knowledge proofs for private reputation

## Resources

- **OriginTrail Docs**: https://docs.origintrail.io
- **DKG Node**: https://github.com/origintrail/dkg-node
- **DKG Engine**: https://github.com/origintrail/dkg-engine
- **Polkadot SDK**: https://github.com/paritytech/polkadot-sdk
- **MCP Specification**: https://modelcontextprotocol.io

## Support

For questions or issues:
- **GitHub Issues**: https://github.com/lucylow/dotrep/issues
- **OriginTrail Discord**: https://discord.gg/origintrail
- **Polkadot Forum**: https://forum.polkadot.network

## License

Apache 2.0 - See LICENSE file for details

---

**Built for the "Scaling Trust in the Age of AI" Hackathon**  
*Supported by OriginTrail x Polkadot x Umanitek*
