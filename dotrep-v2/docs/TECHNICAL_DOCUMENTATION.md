# Technical Documentation: Origin DKG, AI Agents Three-Layer Architecture, and Social Reputation

## Table of Contents

1. [OriginTrail Decentralized Knowledge Graph (DKG)](#origintrail-decentralized-knowledge-graph-dkg)
2. [Three-Layer Architecture (Agent-Knowledge-Trust)](#three-layer-architecture-agent-knowledge-trust)
3. [Social Reputation System](#social-reputation-system)
4. [Integration and Data Flow](#integration-and-data-flow)
5. [Technical Implementation Details](#technical-implementation-details)

---

## OriginTrail Decentralized Knowledge Graph (DKG)

### Overview

The **OriginTrail Decentralized Knowledge Graph (DKG)** is a blockchain-anchored, decentralized network for storing and querying verifiable knowledge assets. In the DotRep system, DKG serves as the **Knowledge Layer** that provides cryptographically verifiable storage and retrieval of reputation data.

### Key Concepts

#### 1. Knowledge Assets

**Knowledge Assets** are structured data entities stored in the DKG that represent verifiable information. In DotRep, reputation scores, contributions, and developer profiles are published as Knowledge Assets.

**Characteristics:**
- **W3C Standards Compliant**: Uses JSON-LD (JavaScript Object Notation for Linked Data) and RDF (Resource Description Framework)
- **Uniform Asset Locator (UAL)**: Each Knowledge Asset has a unique identifier (UAL) that enables verifiable addressing
- **Blockchain Anchored**: Content hashes are stored on-chain (NeuroWeb/Polkadot) for tamper-proof verification
- **Provenance Tracking**: Full history and source tracking for all data

**Example Knowledge Asset Structure:**
```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "dotrep": "https://dotrep.io/ontology/"
  },
  "@type": "Person",
  "@id": "did:polkadot:5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "dotrep:reputationScore": 850,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 850,
    "ratingCount": 42,
    "bestRating": 1000
  },
  "dotrep:contributions": [
    {
      "@type": "dotrep:Contribution",
      "id": "contrib-001",
      "type": "github_pr",
      "url": "https://github.com/paritytech/polkadot-sdk/pull/1234",
      "title": "Add new consensus mechanism",
      "date": "2025-11-15T10:30:00Z",
      "impact": 95,
      "verified": true
    }
  ],
  "dotrep:verifiedPayments": [
    {
      "@type": "dotrep:VerifiedPayment",
      "txHash": "0x1234...",
      "chain": "polkadot",
      "amount": 100.0,
      "currency": "USDC",
      "timestamp": 1731686400000,
      "verified": true
    }
  ],
  "dotrep:onChainIdentity": {
    "@type": "dotrep:OnChainIdentity",
    "nftIdentity": {
      "tokenId": "123",
      "contractAddress": "0x...",
      "chain": "polkadot",
      "verified": true
    }
  }
}
```

#### 2. Uniform Asset Locator (UAL)

**UAL** is a unique identifier for Knowledge Assets in the DKG. It follows the format:
```
did:dkg:{blockchain}/{blockchain_id}/{asset_id}
```

**Example UAL:**
```
did:dkg:otp/2043/0x1234567890abcdef...
```

**UAL Properties:**
- **Persistent**: UAL remains constant even if the asset is updated
- **Verifiable**: Can be resolved to retrieve the asset and verify its integrity
- **Cross-Chain**: Works across different blockchain networks
- **Queryable**: Can be used in SPARQL queries for semantic searches

#### 3. DKG Edge Node

The **DKG Edge Node** is the interface between applications and the DKG network. In DotRep, the edge node:

- **Publishes Knowledge Assets**: Converts reputation data to JSON-LD and publishes to DKG
- **Queries Knowledge Assets**: Retrieves reputation data using UAL or SPARQL queries
- **Manages Storage**: Handles storage epochs and blockchain anchoring
- **Provides APIs**: RESTful and GraphQL APIs for accessing DKG data

**DKG Client Integration:**
```typescript
import { DKGClient } from './dkg-integration/dkg-client';

const client = new DKGClient({
  environment: 'testnet', // or 'mainnet', 'local'
  otnodeUrl: 'https://v6-pegasus-node-02.origin-trail.network:8900',
  blockchain: 'otp:20430',
  publishWallet: '0x...' // Private key for publishing
});

// Publish reputation as Knowledge Asset
const result = await client.publishReputationAsset({
  developerId: '5GrwvaEF...',
  reputationScore: 850,
  contributions: [...],
  timestamp: Date.now(),
  metadata: {}
});

console.log(`Published to DKG: ${result.UAL}`);
```

#### 4. SPARQL Queries

**SPARQL** (SPARQL Protocol and RDF Query Language) enables semantic graph queries over Knowledge Assets. DotRep uses SPARQL to:

- Search developers by reputation score range
- Find developers with specific contribution types
- Query reputation history and trends
- Discover relationships between developers

**Example SPARQL Query:**
```sparql
PREFIX dotrep: <https://dotrep.io/ontology/>
PREFIX schema: <https://schema.org/>

SELECT ?developer ?score ?contributions
WHERE {
  ?developer a schema:Person ;
             dotrep:reputationScore ?score ;
             dotrep:contributions ?contributions .
  FILTER (?score >= 800 && ?score <= 1000)
}
ORDER BY DESC(?score)
LIMIT 10
```

#### 5. Blockchain Anchoring

**Blockchain Anchoring** provides cryptographic proof of Knowledge Asset existence and integrity:

- **Content Hash**: SHA-256 hash of the Knowledge Asset content
- **On-Chain Storage**: Hash stored on NeuroWeb (OriginTrail's Polkadot parachain)
- **Verification**: Anyone can verify asset integrity by comparing content hash with on-chain hash
- **Tamper-Proof**: Any modification to the asset will result in a different hash

**Anchoring Process:**
1. Knowledge Asset is created with JSON-LD content
2. Content hash is calculated (SHA-256)
3. Hash is submitted to NeuroWeb blockchain via transaction
4. Transaction receipt contains proof of anchoring
5. UAL includes blockchain reference for verification

---

## Three-Layer Architecture (Agent-Knowledge-Trust)

### Overview

The **Three-Layer Architecture** is a comprehensive framework for building trusted AI systems. DotRep implements this architecture to provide verifiable, AI-ready reputation data with cryptographic guarantees.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AGENT LAYER                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  AI Agents & Model Context Protocol (MCP)                        │  │
│  │                                                                   │  │
│  │  • Misinformation Detection Agent                                │  │
│  │  • Truth Verification Agent                                      │  │
│  │  • Trust Navigator Agent                                         │  │
│  │  • Sybil Detective Agent                                         │  │
│  │  • Smart Contract Negotiator Agent                               │  │
│  │  • Campaign Performance Optimizer Agent                           │  │
│  │  • Trust Auditor Agent                                           │  │
│  │                                                                   │  │
│  │  MCP Server Tools:                                               │  │
│  │  - get_developer_reputation                                      │  │
│  │  - verify_contribution                                           │  │
│  │  - search_developers_by_reputation                               │  │
│  │  - get_reputation_proof                                          │  │
│  │  - compare_developers                                            │  │
│  │  - get_dkg_health                                                │  │
│  │                                                                   │  │
│  │  Decentralized RAG (dRAG):                                        │  │
│  │  - Verifiable knowledge retrieval from DKG                       │  │
│  │  - UAL citations for all responses                               │  │
│  │  - Provenance tracking                                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE LAYER                                    │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  OriginTrail Decentralized Knowledge Graph (DKG)                 │  │
│  │                                                                   │  │
│  │  • Knowledge Assets (JSON-LD/RDF)                                │  │
│  │  • Uniform Asset Locators (UALs)                                 │  │
│  │  • SPARQL Semantic Queries                                       │  │
│  │  • Blockchain-Anchored Provenance                                │  │
│  │  • Verifiable Reputation Data                                    │  │
│  │  • Contribution History                                          │  │
│  │  • Payment Records                                                │  │
│  │  • Identity Verification                                          │  │
│  │                                                                   │  │
│  │  DKG Edge Node:                                                  │  │
│  │  - Publish/Query Knowledge Assets                                │  │
│  │  - Manage storage epochs                                         │  │
│  │  - Handle blockchain anchoring                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                         TRUST LAYER                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Blockchain & Economic Layer                                      │  │
│  │                                                                   │  │
│  │  • Polkadot Substrate Runtime                                    │  │
│  │  • DotRep Parachain                                               │  │
│  │  • NeuroWeb Blockchain (OriginTrail on Polkadot)                  │  │
│  │  • x402 Micropayment Protocol                                     │  │
│  │  • Token Staking (TRAC/NEURO)                                     │  │
│  │  • XCM Cross-Chain Messaging                                      │  │
│  │  • Cryptographic Proofs                                           │  │
│  │  • Sybil Resistance Mechanisms                                    │  │
│  │                                                                   │  │
│  │  Trust Mechanisms:                                                │  │
│  │  - On-chain identity verification                                 │  │
│  │  - Verified payment transactions                                  │  │
│  │  - Token staking for credibility                                  │  │
│  │  - Economic penalties for misbehavior                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Layer 1: Agent Layer

The **Agent Layer** provides the interface for AI agents and users to interact with the reputation system. It implements the Model Context Protocol (MCP) to enable AI agents to query and verify reputation data.

#### Components

**1. Model Context Protocol (MCP) Server**

The MCP server exposes reputation data to AI agents through standardized tools:

- **`get_developer_reputation`**: Retrieve reputation score, contributions, and verification status
- **`verify_contribution`**: Verify the authenticity of a specific contribution
- **`search_developers_by_reputation`**: Search developers by reputation score range
- **`get_reputation_proof`**: Get cryptographic proof of reputation from blockchain
- **`compare_developers`**: Compare multiple developers side-by-side
- **`get_dkg_health`**: Monitor DKG connection and health status

**MCP Tool Example:**
```typescript
// AI agent queries reputation via MCP
const reputation = await mcpClient.callTool('get_developer_reputation', {
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  includeContributions: true,
  includeProofs: true
});

// Response includes:
// - reputationScore: 850
// - contributions: [...]
// - verified: true
// - source: "OriginTrail DKG"
// - ual: "did:dkg:otp/2043/0x..."
// - blockchainProof: {...}
```

**2. Decentralized RAG (dRAG)**

**Decentralized Retrieval Augmented Generation (dRAG)** enables AI agents to retrieve verifiable knowledge from the DKG:

- **Verifiable Knowledge Retrieval**: All knowledge comes from DKG Knowledge Assets
- **UAL Citations**: Every response includes UALs for verification
- **Provenance Tracking**: Full history of where information came from
- **Anti-Hallucination**: Grounds AI responses in verifiable facts

**dRAG Flow:**
1. AI agent receives query
2. dRAG queries DKG using SPARQL or UAL
3. Retrieves relevant Knowledge Assets
4. Generates response grounded in retrieved knowledge
5. Includes UAL citations in response
6. User can verify response by checking UALs

**3. Specialized AI Agents**

DotRep includes several specialized AI agents for different tasks:

- **Trust Navigator Agent**: Real-time reputation discovery and matching
- **Sybil Detective Agent**: Automated fake account detection
- **Smart Contract Negotiator Agent**: Autonomous endorsement deal-making
- **Campaign Performance Optimizer Agent**: Endorsement ROI maximization
- **Trust Auditor Agent**: Continuous reputation verification
- **Misinformation Detection Agent**: Content authenticity verification
- **Truth Verification Agent**: Cross-reference information with DKG

### Layer 2: Knowledge Layer

The **Knowledge Layer** is implemented using OriginTrail DKG and provides verifiable storage and retrieval of reputation data.

#### Key Features

**1. Knowledge Asset Publishing**

Reputation data is published as Knowledge Assets with:
- JSON-LD format (W3C standard)
- Unique UAL identifier
- Blockchain anchoring for integrity
- Full provenance tracking

**2. Semantic Querying**

SPARQL queries enable complex graph traversals:
- Find developers by reputation range
- Discover relationships between developers
- Analyze contribution patterns
- Track reputation trends over time

**3. Verifiable Retrieval**

All data retrieved from DKG includes:
- Content hash for integrity verification
- Blockchain proof of anchoring
- UAL for persistent addressing
- Timestamp and provenance information

### Layer 3: Trust Layer

The **Trust Layer** provides cryptographic guarantees and economic incentives through blockchain technology.

#### Components

**1. Polkadot Substrate Runtime**

- **DotRep Parachain**: Custom blockchain for reputation operations
- **NeuroWeb Integration**: OriginTrail's Polkadot parachain for DKG anchoring
- **XCM Support**: Cross-chain reputation queries

**2. x402 Micropayment Protocol**

**x402** is an HTTP-native micropayment protocol that enables:
- **HTTP 402 Payment Required**: Standard HTTP status code for payment requests
- **Stateless Verification**: Each payment is independently verifiable
- **Cryptographic Security**: On-chain verification via facilitator
- **Autonomous Agent Commerce**: AI-to-AI economic interactions

**x402 Payment Flow:**
1. Client requests premium reputation data
2. Server responds with HTTP 402 Payment Required
3. Client initiates payment via x402 facilitator
4. Payment is verified on-chain
5. Server delivers content and publishes ReceiptAsset to DKG

**3. Token Staking**

Developers can stake tokens (TRAC/NEURO) to:
- **Boost Credibility**: Higher stake = higher reputation credibility
- **Economic Commitment**: Demonstrate commitment to accurate reputation
- **Sybil Resistance**: Make Sybil attacks economically expensive
- **Slashing Risk**: Misbehavior can result in stake slashing

**Staking Mechanism:**
```rust
// Developer stakes tokens for credibility boost
TrustLayer::stake_tokens(
    Origin::signed(developer_account),
    1000 * UNITS // 1000 TRAC tokens
)?;

// Calculate credibility boost
let boost = TrustLayer::credibility_boost(&developer_account);
// Returns percentage boost (e.g., 10% for 10x minimum stake)
```

**4. On-Chain Identity Verification**

- **NFT Identity**: Non-fungible tokens representing developer identity
- **SBT Credentials**: Soulbound tokens for verified credentials
- **Cross-Chain Verification**: Identity verified across multiple chains
- **Wallet Address Linking**: Connect wallet addresses to reputation

**5. Sybil Resistance**

Multiple mechanisms prevent Sybil attacks:
- **Bot Cluster Detection**: Identifies coordinated fake accounts
- **Payment Pattern Analysis**: Detects suspicious payment patterns
- **Economic Barriers**: Token staking requirements
- **Graph Analysis**: PageRank-based node identification

---

## Social Reputation System

### Overview

The **Social Reputation System** computes reputation scores from social graph data (GitHub, GitLab, etc.) using advanced algorithms that combine graph analysis, economic signals, and verification mechanisms.

### Reputation Calculation Components

#### 1. Base Reputation Score

The base reputation is calculated from contributions using a weighted scoring system:

**Contribution Types:**
- **GitHub Pull Requests**: Merged PRs with impact scoring
- **Code Reviews**: Review quality and frequency
- **Issues**: Issue creation and resolution
- **Commits**: Code contributions and frequency
- **Documentation**: Documentation contributions
- **Community Engagement**: Discussions, comments, etc.

**Scoring Formula:**
```typescript
// Base score calculation with time decay
const ageInDays = (now - contribution.timestamp) / msPerDay;
const decayFactor = Math.exp(-timeDecayFactor * ageInDays);
const weight = algorithmWeights[contribution.type] || 1;

// Verification boost (25% for verified contributions)
const verificationBoost = contribution.verified ? 1.25 : 1.0;

// Verifier boost (up to 25% for 5+ verifiers)
const verifierBoost = contribution.verifierCount 
  ? 1 + (Math.min(contribution.verifierCount, 5) * 0.05)
  : 1.0;

const score = contribution.weight * weight * decayFactor * verificationBoost * verifierBoost;
```

#### 2. PageRank-Based Graph Analysis

**PageRank** algorithm identifies influential nodes in the social graph:

- **Influence Scoring**: Developers with more connections and higher-quality connections get higher scores
- **Recursive Calculation**: Reputation propagates through the network
- **Bot Detection**: PageRank helps identify bot clusters (low PageRank despite high activity)

**PageRank Implementation:**
```python
def compute_pagerank(graph, damping_factor=0.85, iterations=100):
    """
    Compute PageRank scores for all nodes in the graph.
    
    Args:
        graph: NetworkX graph with nodes (developers) and edges (contributions)
        damping_factor: Probability of following links (default 0.85)
        iterations: Number of iterations for convergence
    
    Returns:
        Dictionary mapping node IDs to PageRank scores
    """
    # Initialize all nodes with equal probability
    n = len(graph.nodes())
    pagerank = {node: 1.0 / n for node in graph.nodes()}
    
    for _ in range(iterations):
        new_pagerank = {}
        for node in graph.nodes():
            # Calculate contribution from incoming links
            incoming = sum(
                pagerank[neighbor] / graph.out_degree(neighbor)
                for neighbor in graph.predecessors(node)
                if graph.out_degree(neighbor) > 0
            )
            # Apply damping factor
            new_pagerank[node] = (1 - damping_factor) / n + damping_factor * incoming
        
        pagerank = new_pagerank
    
    return pagerank
```

#### 3. Payment-Weighted Boost

**Verified payments** (especially x402 protocol payments) provide strong trust signals:

**Payment Boost Calculation:**
```typescript
// TraceRank-style payment weighting
// Higher-value payments from high-reputation payers = stronger signal
const weightedSum = payments.reduce((sum, payment) => {
  const value = payment.amount;
  const payerRep = payment.payerReputation || 0.5;
  return sum + (value * payerRep);
}, 0);

const totalValue = payments.reduce((sum, p) => sum + p.amount, 0);
const weightedAverage = totalValue > 0 ? weightedSum / totalValue : 0;

// Base boost: (weighted_average - 0.5) * 0.2 (max 10%)
let baseBoost = Math.max(0, (weightedAverage - 0.5) * 0.2);

// x402 payment boost (up to 5% extra)
// x402 payments are cryptographically secured and represent autonomous agent commerce
const x402PaymentRatio = x402Payments.length / totalPayments;
const x402ValueRatio = x402PaymentValue / totalValue;
const x402Boost = Math.min(0.05, (x402PaymentRatio * 0.03) + (x402ValueRatio * 0.02));

return baseBoost + x402Boost;
```

**x402 Payment Benefits:**
- **HTTP-Native**: No special blockchain RPC required for initial handshake
- **Stateless**: Each payment is independently verifiable
- **Cryptographically Secured**: On-chain verification via facilitator
- **Autonomous Agent Commerce**: Represents AI-to-AI economic interactions

#### 4. Reputation Registry Boost

**Transaction-verified feedback** from other users provides additional reputation signals:

**Registry Boost Calculation:**
```typescript
// Verified ratings boost
const verifiedRatings = registry.ratings.filter(r => r.verified);
const avgRating = verifiedRatings.reduce((sum, r) => sum + r.rating, 0) / verifiedRatings.length;

// Boost = (avg_rating - 0.5) * 0.15 (max 7.5% for perfect average)
const registryBoost = Math.max(0, (avgRating - 0.5) * 0.15);
```

**Registry Components:**
- **Ratings**: 0-1 scale ratings from verified users
- **Feedback**: Text feedback linked to verified transactions
- **Validations**: Cryptographic proofs, TEE attestations, zk proofs

#### 5. Identity Verification Score

**On-chain identity verification** contributes to reputation:

**Identity Components:**
- **NFT Identity** (40% weight): Verified NFT representing developer identity
- **SBT Credential** (30% weight): Soulbound token credentials
- **Wallet Address** (10% weight): Verified wallet address
- **Cross-Chain Verification** (20% weight): Identity verified on multiple chains

**Identity Score Calculation:**
```typescript
let score = 0;

if (identity.nftIdentity?.verified) {
  score += 0.4; // NFT Identity
}

if (identity.sbtCredential?.verified) {
  score += 0.3; // SBT Credential
}

if (identity.walletAddress) {
  score += 0.1; // Wallet Address
}

// Cross-chain bonus
if (identity.verifiedChains && identity.verifiedChains.length >= 2) {
  const crossChainBonus = Math.min(0.2, identity.verifiedChains.length * 0.05);
  score += crossChainBonus;
}

return Math.max(0, Math.min(1.0, score));
```

#### 6. Bot Detection Penalty

**Bot cluster detection** applies penalties to suspicious accounts:

**Penalty Calculation:**
```typescript
// Check if user is in confirmed bot cluster
const confirmedCluster = botDetectionResults.confirmedBotClusters.find(
  cluster => cluster.nodes.includes(userId)
);

if (confirmedCluster) {
  // Significant penalty for confirmed bots (70% penalty)
  penalty = Math.min(0.7, confirmedCluster.suspicionScore * 0.7);
  sybilRisk = confirmedCluster.suspicionScore;
} else if (suspiciousCluster) {
  // Smaller penalty for suspicious clusters (30% penalty)
  penalty = Math.min(0.3, suspiciousCluster.suspicionScore * 0.3);
  sybilRisk = suspiciousCluster.suspicionScore;
}

// Apply penalty to reputation
finalReputation = baseReputation * (1 - penalty);
```

**Bot Detection Methods:**
- **Cluster Analysis**: Identifies groups of accounts with similar behavior
- **Behavioral Anomalies**: Detects unusual patterns (burst activity, same recipient patterns)
- **Graph Analysis**: Low PageRank despite high activity indicates bots
- **Economic Analysis**: Suspicious payment patterns

#### 7. Time Decay

**Time decay** ensures recent contributions are weighted more heavily:

```typescript
const ageInDays = (now - contribution.timestamp) / msPerDay;
const decayFactor = Math.exp(-timeDecayFactor * ageInDays);
// Older contributions contribute less to reputation
```

**Decay Benefits:**
- Encourages continuous activity
- Prevents reputation from becoming stale
- Rewards recent contributions more than old ones

### Highly Trusted User Determination

The system determines "highly trusted" status based on multiple criteria:

**Requirements:**
1. **On-Chain Identity Verified**: Identity verification score ≥ 0.85
2. **Minimum Reputation Score**: Overall score ≥ 800 (out of 1000)
3. **Verified Payments**: ≥ 10 verified payments with total value ≥ $100
4. **Verified Ratings**: ≥ 5 verified ratings with average ≥ 0.8
5. **Recent Activity**: Positive activity within last 30 days
6. **Sybil Resistant**: Payment patterns indicate low Sybil risk

**Trust Level Classification:**
- **Highly Trusted**: Score ≥ 850, confidence ≥ 0.85, all requirements met
- **Trusted**: Score ≥ 700, confidence ≥ 0.70
- **Moderate**: Score ≥ 500, confidence ≥ 0.50
- **Caution**: Score ≥ 300, confidence ≥ 0.30
- **Untrusted**: Below thresholds

### Reputation Score Breakdown

The final reputation score includes:

```typescript
interface ReputationScore {
  overall: number;              // 0-1000 overall reputation score
  breakdown: {
    contributions: number;      // Contribution-based score
    payments: number;           // Payment-weighted score
    registry: number;           // Registry feedback score
    identity: number;           // Identity verification score
  };
  percentile: number;           // Percentile rank (0-100)
  rank: number;                 // Overall rank (lower is better)
  safetyScore?: number;         // Guardian safety score (0-1)
  combinedScore?: number;       // Reputation * safety score
  highlyTrustedStatus?: {
    isHighlyTrusted: boolean;
    confidence: number;
    trustLevel: 'highly_trusted' | 'trusted' | 'moderate' | 'caution' | 'untrusted';
  };
  botDetectionPenalty?: number; // Penalty from bot detection (0-1)
  sybilRisk?: number;           // Sybil risk score (0-1)
}
```

---

## Integration and Data Flow

### Complete Data Flow

```
┌──────────────┐
│ Social Graph │
│  (GitHub,    │
│   GitLab)    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────┐
│  Reputation Calculator          │
│  - PageRank Analysis            │
│  - Contribution Scoring         │
│  - Payment Weighting            │
│  - Bot Detection                │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  Reputation Score               │
│  - Overall Score                │
│  - Breakdown                    │
│  - Highly Trusted Status        │
└──────┬──────────────────────────┘
       │
       ├──────────────────────────┐
       │                          │
       ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│  DKG Publishing  │    │  Blockchain      │
│  - JSON-LD       │    │  - UAL Storage   │
│  - Knowledge     │    │  - Anchoring     │
│    Asset         │    │  - Proofs        │
│  - UAL           │    │                  │
└──────┬───────────┘    └──────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  OriginTrail DKG                │
│  - Knowledge Assets             │
│  - SPARQL Queries               │
│  - Blockchain Anchoring         │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  MCP Server                     │
│  - AI Agent Tools               │
│  - dRAG Queries                  │
│  - Verifiable Responses         │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  AI Agents / Users              │
│  - Reputation Queries           │
│  - Verification                 │
│  - Decision Making               │
└─────────────────────────────────┘
```

### Publishing Workflow

1. **Data Collection**: Gather contributions, payments, and identity data
2. **Reputation Calculation**: Compute reputation score using all components
3. **DKG Publishing**: Convert to JSON-LD Knowledge Asset and publish to DKG
4. **Blockchain Anchoring**: Anchor content hash on NeuroWeb
5. **UAL Storage**: Store UAL on-chain for easy lookup
6. **MCP Exposure**: Make available via MCP server for AI agents

### Query Workflow

1. **AI Agent Query**: Agent requests reputation via MCP tool
2. **MCP Server**: Routes query to appropriate handler
3. **DKG Query**: Retrieves Knowledge Asset using UAL or SPARQL
4. **Verification**: Verifies content hash against blockchain
5. **Response**: Returns reputation data with UAL citations
6. **Agent Decision**: Agent uses verifiable data for decision-making

---

## Technical Implementation Details

### DKG Client Implementation

**Key Methods:**
- `publishReputationAsset()`: Publish reputation as Knowledge Asset
- `queryReputation()`: Query reputation by UAL
- `sparqlQuery()`: Execute SPARQL queries
- `getNodeInfo()`: Get DKG node information
- `healthCheck()`: Check DKG connection health

**Error Handling:**
- Network timeouts
- Invalid UAL handling
- Blockchain anchoring failures
- Storage epoch management

### Reputation Calculator Implementation

**Key Methods:**
- `calculateReputation()`: Main calculation method
- `calculateContributionScores()`: Base contribution scoring
- `applyPaymentBoost()`: Payment-weighted boost
- `applyRegistryBoost()`: Registry feedback boost
- `determineHighlyTrustedUser()`: Highly trusted determination
- `calculateBotDetectionPenalty()`: Bot penalty application
- `publishReputationToDKG()`: Auto-publish to DKG

**Configuration:**
- Algorithm weights (configurable per contribution type)
- Time decay factor
- Thresholds for highly trusted status
- Bot detection parameters

### MCP Server Implementation

**Tool Handlers:**
- Each MCP tool has a dedicated handler function
- Handlers query DKG and return verifiable data
- All responses include UAL citations
- Error handling with informative messages

**dRAG Integration:**
- Semantic search over DKG Knowledge Assets
- UAL citation generation
- Provenance tracking
- Response verification

### Trust Layer Implementation

**Substrate Pallets:**
- `pallet-reputation`: Reputation storage and DKG integration
- `pallet-trust-layer`: x402 payments and token staking
- `pallet-identity`: On-chain identity verification

**x402 Protocol:**
- HTTP 402 Payment Required responses
- Payment facilitator integration
- ReceiptAsset publishing to DKG
- Access control based on payments

**Token Staking:**
- Staking mechanism with slashing
- Credibility boost calculation
- Economic barrier for Sybil attacks
- Stake withdrawal with time locks

---

## Conclusion

This technical documentation provides a comprehensive overview of:

1. **OriginTrail DKG**: The decentralized knowledge graph that stores verifiable reputation data
2. **Three-Layer Architecture**: Agent-Knowledge-Trust layers working together
3. **Social Reputation System**: How reputation is calculated from social graph data

The integration of these components creates a robust, verifiable, and AI-ready reputation system that provides cryptographic guarantees and economic incentives for accurate reputation data.

---

## References

- **OriginTrail Documentation**: https://docs.origintrail.io
- **DKG Node**: https://github.com/origintrail/dkg-node
- **Polkadot SDK**: https://github.com/paritytech/polkadot-sdk
- **Model Context Protocol**: https://modelcontextprotocol.io
- **x402 Protocol**: HTTP 402 Payment Required specification

---

**Last Updated**: 2025-11-26  
**Version**: 1.0.0  
**Maintained by**: DotRep Team

