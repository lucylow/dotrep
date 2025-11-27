# OriginTrail Hackathon Improvements

## Overview

This document describes the improvements made to align the DotRep Sybil-Resistant Social Credit Marketplace with the OriginTrail hackathon requirements. These enhancements implement the complete three-layer architecture (Agent-Knowledge-Trust) and integrate all required technologies.

## 🎯 Hackathon Alignment

### Three-Layer Architecture Implementation

#### 1. **Trust Layer** ✅
- **x402 Micropayment Protocol**: Premium API endpoints protected by x402 payments
- **Token Staking**: TRAC/NEURO staking for Sybil resistance
- **Sybil Detection**: Bot cluster detection using Guardian dataset
- **Reputation-Based Access Control**: Payment requirements based on reputation scores

#### 2. **Knowledge Layer** ✅
- **OriginTrail DKG Integration**: Automatic publishing of reputation scores as Knowledge Assets
- **JSON-LD/RDF Format**: Verifiable reputation data stored in standard formats
- **Provenance Tracking**: Reputation history with `prov:wasRevisionOf` links
- **SPARQL Queries**: Query reputation data using semantic queries

#### 3. **Agent Layer** ✅
- **MCP (Model Context Protocol)**: API responses compatible with AI agents
- **Autonomous Agent Payments**: x402 protocol enables AI agents to pay automatically
- **Verifiable AI Responses**: DKG-backed reputation data for trustworthy AI queries

## 🚀 Key Improvements

### 1. Premium API Endpoints with x402 Protection

**Location**: `server/_core/premiumApi.ts`

Three premium endpoints protected by x402 micropayments:

#### `GET /api/premium/reputation-score/:userId` ($0.10)
- Comprehensive reputation score calculation
- Guardian safety score integration
- Bot cluster detection
- Automatic DKG publishing
- MCP-compatible response format

**Example Request**:
```bash
curl "http://localhost:3000/api/premium/reputation-score/alice" \
  -H "X-PAYMENT: {\"txHash\":\"0x...\",\"chain\":\"base-sepolia\",\"amount\":\"0.10\",\"currency\":\"USDC\"}"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "userId": "alice",
    "reputation": {
      "overall": 850,
      "safetyScore": 0.9,
      "sybilRisk": 0.1,
      "highlyTrustedStatus": {
        "isHighlyTrusted": true,
        "confidence": 0.92
      }
    },
    "dkgUAL": "ual:reputation:alice:2024-01-01",
    "mcp": {
      "tool": "get_reputation_score",
      "version": "1.0.0",
      "verifiable": true
    }
  }
}
```

#### `GET /api/premium/sybil-analysis-report` ($0.25)
- Comprehensive Sybil analysis using Guardian dataset
- Bot cluster detection
- Graph analysis for coordinated attacks
- DKG publishing of analysis results

#### `GET /api/premium/influencer-recommendations` ($0.15)
- PageRank-based influencer identification
- Sybil-resistant filtering
- Guardian safety score integration
- Reputation-weighted recommendations

### 2. Enhanced Reputation Calculator

**Location**: `server/_core/reputationCalculator.ts`

**New Features**:
- **Automatic DKG Publishing**: Option to auto-publish reputation scores as Knowledge Assets
- **Guardian Integration**: Uses Umanitek Guardian dataset for safety scores
- **Sybil Resistance**: Bot cluster detection with reputation penalties
- **Three-Layer Support**: Metadata for Agent, Knowledge, and Trust layers

**Usage Example**:
```typescript
const calculator = new ReputationCalculator();
const dkgClient = createDKGClientV8({ useMockMode: false });

const score = await calculator.calculateReputation({
  contributions,
  algorithmWeights,
  timeDecayFactor: 0.01,
  userId: 'alice',
  includeSafetyScore: true, // Guardian dataset integration
  includeHighlyTrustedDetermination: true,
  publishToDKG: true, // Auto-publish to DKG
  dkgClient
});
```

### 3. Umanitek Guardian Dataset Integration

**Location**: `dkg-integration/guardian-verification.ts`

The Guardian dataset is used for:
- **Safety Score Calculation**: Content safety verification
- **Sybil Detection**: Identifying suspicious activity patterns
- **Risk Assessment**: Comprehensive risk analysis for users
- **Knowledge Asset Publishing**: Verification results stored on DKG

**Integration Points**:
- Premium reputation API endpoints
- Reputation calculator
- Sybil analysis reports
- Influencer recommendations

### 4. x402 Payment Flow

The x402 protocol enables autonomous agent payments:

1. **Client Request**: AI agent requests premium data
2. **HTTP 402 Response**: Server returns payment request with challenge
3. **Agent Payment**: Agent signs and submits payment via facilitator
4. **Payment Verification**: Server verifies payment proof
5. **Resource Access**: Agent receives premium data + payment evidence UAL

**Benefits**:
- **AI-Native**: Agents can pay automatically without human intervention
- **Micropayments**: Low-cost access to premium data ($0.10-$0.25)
- **Verifiable**: Payment evidence published to DKG
- **Trust Layer**: Economic incentives for reputation accuracy

### 5. DKG Knowledge Asset Publishing

All premium reputation data is automatically published to OriginTrail DKG as Knowledge Assets:

**Knowledge Asset Structure**:
```json
{
  "@context": ["https://schema.org", "https://www.w3.org/ns/prov#"],
  "@type": "ReputationScore",
  "developerId": "alice",
  "reputationScore": 850,
  "safetyScore": 0.9,
  "sybilRisk": 0.1,
  "metadata": {
    "mcp": {
      "tool": "reputation_score",
      "verifiable": true
    }
  }
}
```

**Benefits**:
- **Verifiability**: All reputation data is cryptographically verifiable
- **Queryability**: SPARQL queries for reputation insights
- **Provenance**: Complete history of reputation changes
- **Interoperability**: Standard JSON-LD format

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT LAYER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AI Agent (MCP Client)                                │  │
│  │  - Queries reputation via x402-protected API          │  │
│  │  - Automatically handles HTTP 402 payments             │  │
│  │  - Receives verifiable DKG-backed responses           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  KNOWLEDGE LAYER                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  OriginTrail DKG                                      │  │
│  │  - Reputation scores as Knowledge Assets (JSON-LD)    │  │
│  │  - Guardian verification results                      │  │
│  │  - Payment evidence                                   │  │
│  │  - SPARQL queries for reputation insights             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    TRUST LAYER                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  x402 Payments + Token Staking                        │  │
│  │  - Micropayments for premium data access              │  │
│  │  - TRAC/NEURO staking for credibility                 │  │
│  │  - Sybil-resistant reputation scoring                  │  │
│  │  - Guardian dataset for safety verification           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Configuration

### Environment Variables

```bash
# x402 Configuration
X402_WALLET_ADDRESS=0x... # Wallet to receive payments
X402_FACILITATOR_URL=https://x402.org/facilitator

# DKG Configuration
DKG_USE_MOCK=false # Set to true for testing
DKG_ENABLE_TOKEN_GATING=true

# Guardian Integration
GUARDIAN_API_URL=https://guardian.umanitek.com
GUARDIAN_API_KEY=...
```

### x402 Middleware Setup

The x402 middleware is automatically configured in `premiumApi.ts`:

```typescript
// Example: Protect endpoint with $0.10 payment
router.get(
  '/premium/reputation-score/:userId',
  createX402Middleware('reputation-score', '0.10', 'base-sepolia'),
  async (req, res) => {
    // Handler code
  }
);
```

## 📈 Usage Examples

### 1. AI Agent Querying Reputation

```typescript
// AI agent automatically handles x402 payment
const response = await fetch('/api/premium/reputation-score/alice', {
  headers: {
    'X-PAYMENT': JSON.stringify({
      txHash: '0x...',
      chain: 'base-sepolia',
      amount: '0.10',
      currency: 'USDC'
    })
  }
});

const data = await response.json();
// data.dkgUAL contains verifiable Knowledge Asset UAL
// data.mcp contains MCP metadata for agent processing
```

### 2. Publishing Reputation to DKG

```typescript
const calculator = new ReputationCalculator();
const dkgClient = createDKGClientV8({ useMockMode: false });

const score = await calculator.calculateReputation({
  // ... calculation params
  publishToDKG: true,
  dkgClient
});

// Reputation automatically published to DKG
// UAL available in DKG for SPARQL queries
```

### 3. Sybil Analysis with Guardian

```typescript
const guardianService = getGuardianVerificationService();
const safetyData = await guardianService.calculateCreatorSafetyScore(userId);

// safetyData.safetyScore: 0-1 safety score
// safetyData.riskFactors: Array of risk indicators
```

## 🎯 Hackathon Requirements Checklist

- ✅ **Compute reputation from social graph**: PageRank algorithms applied to Guardian dataset
- ✅ **Sybil-resistant weighting**: Token staking + bot cluster detection
- ✅ **Publish scores to DKG**: Automatic Knowledge Asset publishing
- ✅ **Power trusted feeds/APIs**: x402-protected premium endpoints
- ✅ **Three-layer integration**: Agent, Knowledge, Trust layers fully implemented
- ✅ **MCP integration**: MCP-compatible API responses
- ✅ **Guardian dataset**: Umanitek Guardian integration for safety scores
- ✅ **x402 micropayments**: Autonomous agent payment support

## 📚 Additional Resources

- [x402 Protocol Documentation](https://x402.org/docs)
- [OriginTrail DKG Documentation](https://docs.origintrail.io)
- [Model Context Protocol (MCP)](https://modelcontextprotocol.io)
- [Umanitek Guardian](https://guardian.umanitek.com)

## 🔄 Next Steps

1. **Production Deployment**: Configure production DKG node and x402 facilitator
2. **MCP Server**: Enhance MCP server with additional reputation tools
3. **Guardian Dataset**: Expand Guardian dataset integration for more safety signals
4. **Token Staking**: Implement on-chain token staking for reputation multipliers
5. **Analytics Dashboard**: Build dashboard for reputation insights and Sybil detection

