# x402 Payment Gateway - Enhanced Implementation

## Overview

This is an enhanced implementation of the **x402 Payment Standard** that enables trusted transactions based on reputation. It integrates with OriginTrail DKG and NeuroWeb to create a reputation-backed payment system.

## 🚀 New Features

### Pay-per-API for Reputation Data
- **Top Reputable Users**: Get top-N users by category (`GET /api/top-reputable-users`)
- **User Reputation Profiles**: Detailed reputation metrics from DKG (`GET /api/user-reputation-profile`)
- **Micropayments**: Low-cost access ($0.01-$0.05) to premium reputation data

### Decentralized Data Marketplace
- **Discovery**: Free discovery of data products (`GET /api/marketplace/discover`)
- **Direct Payments**: Peer-to-peer payments with no platform fees (`POST /api/marketplace/purchase`)
- **Reputation-Gated**: Only high-reputation providers can list products

### Quality Data via Microtransactions
- **Verified Info Service**: Pay-per-query for verified information (`POST /api/verified-info`)
- **Provenance-Backed**: All answers backed by high-reputation sources
- **Micropayment Model**: $0.01 per query, no subscriptions needed

### Agent-Driven E-Commerce
- **Autonomous Purchases**: AI agents can purchase products autonomously (`POST /api/agent/purchase`)
- **Reputation Verification**: Agents verify seller reputation before purchasing
- **Budget Management**: Agents respect maximum price constraints

## Features

### ✅ Canonical x402 Implementation

- **HTTP 402 Payment Required** status code with machine-readable JSON
- **X-PAYMENT header** support (standard)
- **Challenge/nonce** for replay protection
- **Facilitator support** (Coinbase, Cloudflare, or custom)
- **Multi-chain support** (Base, Solana, Ethereum, Polygon, Arbitrum)
- **Settlement verification** (facilitator attestation or on-chain)

### ✅ Payment Evidence Knowledge Assets

- **JSON-LD structured** Payment Evidence KAs
- **DKG integration** for publishing payment evidence
- **Provenance tracking** (prov:wasDerivedFrom)
- **Content integrity** (SHA-256 hashing)
- **Reputation signals** embedded in payment data

### ✅ Reputation-Based Access Control

- **Reputation threshold checks** before allowing transactions
- **Payment graph analysis** for sybil detection
- **TraceRank-style** payment-weighted reputation scoring
- **Trust level validation** for recipients

## Architecture

```
Client Request
    ↓
Server: 402 Payment Required + payment terms
    ↓
Client: X-PAYMENT header with signed proof
    ↓
Server: Verify payment + reputation check
    ↓
Server: Publish Payment Evidence KA to DKG
    ↓
Server: Return resource + payment evidence UAL
```

## 📚 API Endpoints

### Pay-per-API Endpoints

#### GET /api/top-reputable-users
Get list of top-N reputable users by category.

**Query Parameters:**
- `category` (optional): Filter by category (tech, finance, all). Default: 'all'
- `limit` (optional): Number of users to return. Default: 10

**Example:**
```bash
curl "http://localhost:4000/api/top-reputable-users?category=tech&limit=5"
# Returns 402 Payment Required

# With payment:
curl "http://localhost:4000/api/top-reputable-users?category=tech&limit=5" \
  -H "X-PAYMENT: {\"txHash\":\"0x...\",\"chain\":\"base\",\"payer\":\"0x...\",\"amount\":\"0.01\",\"currency\":\"USDC\",\"challenge\":\"x402-...\"}"
```

#### GET /api/user-reputation-profile
Get detailed reputation profile for a specific user account.

**Query Parameters:**
- `account` (required): User account ID or DID

**Example:**
```bash
curl "http://localhost:4000/api/user-reputation-profile?account=did:dkg:user:alice"
# Returns 402 Payment Required ($0.05)
```

### Quality Data Endpoints

#### POST /api/verified-info
Query verified information backed by high-reputation sources.

**Request Body:**
```json
{
  "query": "What is the current price of Bitcoin?",
  "sourceReputation": 0.8
}
```

**Example:**
```bash
curl -X POST "http://localhost:4000/api/verified-info" \
  -H "Content-Type: application/json" \
  -d '{"query":"What is the current price of Bitcoin?","sourceReputation":0.8}'
# Returns 402 Payment Required ($0.01)
```

### Data Marketplace Endpoints

#### GET /api/marketplace/discover
Discover data products in the marketplace. **Free** (no payment required).

**Query Parameters:**
- `type` (optional): Filter by type (dataset, report, etc.)
- `minReputation` (optional): Minimum provider reputation. Default: 0.7
- `limit` (optional): Maximum results. Default: 20
- `category` (optional): Filter by category

**Example:**
```bash
curl "http://localhost:4000/api/marketplace/discover?type=dataset&minReputation=0.8&limit=10"
# Free - no payment required
```

#### POST /api/marketplace/purchase
Purchase a data product via x402. Payments go directly to the provider.

**Request Body:**
```json
{
  "productUAL": "urn:ual:dotrep:product:dataset:tech-trends",
  "buyer": "0x...",
  "paymentMethod": "x402"
}
```

**Example:**
```bash
curl -X POST "http://localhost:4000/api/marketplace/purchase" \
  -H "Content-Type: application/json" \
  -d '{"productUAL":"urn:ual:dotrep:product:dataset:tech-trends","buyer":"0x...","paymentMethod":"x402"}'
# Returns 402 with payment request
```

### Agent-Driven E-Commerce

#### POST /api/agent/purchase
AI agent-driven purchase with reputation verification.

**Request Body:**
```json
{
  "productUAL": "urn:ual:dotrep:product:report:marketing-trends",
  "agentId": "agent-ai-assistant-001",
  "buyer": "0x...",
  "maxPrice": "20.00",
  "minSellerReputation": 0.9
}
```

**Example:**
```bash
curl -X POST "http://localhost:4000/api/agent/purchase" \
  -H "Content-Type: application/json" \
  -d '{"productUAL":"urn:ual:dotrep:product:report:marketing-trends","agentId":"agent-001","buyer":"0x...","maxPrice":"20.00","minSellerReputation":0.9}'
# Returns 402 or 403 (if seller reputation insufficient)
```

## API Endpoints (Original)

### GET /api/verified-creators

Returns a list of verified creators with high reputation scores. Requires x402 payment.

**Request:**
```bash
GET /api/verified-creators
```

**Response (402 Payment Required):**
```json
{
  "error": "Payment Required",
  "paymentRequest": {
    "x402": "1.0",
    "amount": "2.50",
    "currency": "USDC",
    "recipient": "0x...",
    "chains": ["base", "solana"],
    "facilitator": "https://facil.example/pay",
    "challenge": "x402-1234567890-abc123",
    "expires": "2025-11-26T12:45:00Z",
    "resourceUAL": "urn:ual:dotrep:verified-creators"
  }
}
```

**Request with Payment:**
```bash
GET /api/verified-creators
X-PAYMENT: {
  "txHash": "0xabc123...",
  "chain": "base",
  "payer": "0xpayer...",
  "amount": "2.50",
  "currency": "USDC",
  "signature": "0xsigned...",
  "facilitatorSig": "0xfacil...",
  "challenge": "x402-1234567890-abc123"
}
```

**Response (200 OK):**
```json
{
  "resource": "verified-creators",
  "creators": [...],
  "paymentEvidence": {
    "ual": "urn:ual:dotrep:payment:0xabc123...",
    "txHash": "0xabc123...",
    "chain": "base",
    "verified": true,
    "dkgTransactionHash": "0x..."
  },
  "reputationCheck": {
    "allowed": true,
    "payerReputation": "verified"
  }
}
```

### GET /api/:resource

Generic x402-protected endpoint. Replace `:resource` with any resource from access policies.

### GET /payment-evidence/:identifier

Query payment evidence by transaction hash or UAL.

### GET /stats

Get payment gateway statistics.

## Configuration

Environment variables:

```bash
PORT=4000                                    # Server port
EDGE_PUBLISH_URL=http://mock-dkg:8080       # DKG edge node URL
FACILITATOR_URL=https://facil.example/pay   # x402 facilitator URL
X402_RECIPIENT=0x...                         # Payment recipient address
ENABLE_REPUTATION_FILTER=true                # Enable reputation filtering
MIN_REPUTATION_SCORE=0.5                     # Minimum reputation score
MIN_PAYMENT_COUNT=0                          # Minimum payment count
REQUIRE_VERIFIED_IDENTITY=false              # Require verified identity
```

## Payment Flow Example

### 1. Client requests resource

```bash
curl http://localhost:4000/api/verified-creators
```

### 2. Server responds with 402

```json
HTTP/1.1 402 Payment Required
Retry-After: 60

{
  "error": "Payment Required",
  "paymentRequest": {
    "x402": "1.0",
    "amount": "2.50",
    "currency": "USDC",
    "recipient": "0x...",
    "chains": ["base", "solana"],
    "facilitator": "https://facil.example/pay",
    "challenge": "x402-1234567890-abc123",
    "expires": "2025-11-26T12:45:00Z"
  }
}
```

### 3. Client pays and retries with X-PAYMENT header

```bash
curl http://localhost:4000/api/verified-creators \
  -H "X-PAYMENT: {\"txHash\":\"0xabc123\",\"chain\":\"base\",\"payer\":\"0x...\",\"amount\":\"2.50\",\"currency\":\"USDC\",\"signature\":\"0x...\",\"challenge\":\"x402-1234567890-abc123\"}"
```

### 4. Server verifies and serves resource

The server:
1. Validates payment proof
2. Verifies settlement (facilitator or on-chain)
3. Checks reputation requirements (if enabled)
4. Publishes Payment Evidence KA to DKG
5. Returns resource with payment evidence UAL

## Payment Evidence Knowledge Asset Structure

```json
{
  "@context": [
    "https://schema.org/",
    "https://www.w3.org/ns/prov#",
    "https://dotrep.io/ontology/"
  ],
  "@type": "PaymentEvidence",
  "@id": "urn:ual:dotrep:payment:0xabc123...",
  "schema:identifier": "0xabc123...",
  "payer": {
    "@type": "Person",
    "@id": "did:key:0xpayer...",
    "identifier": "0xpayer..."
  },
  "recipient": {
    "@type": "Organization",
    "@id": "did:key:0xrecipient...",
    "identifier": "0xrecipient..."
  },
  "amount": {
    "@type": "MonetaryAmount",
    "value": "2.50",
    "currency": "USDC"
  },
  "blockchain": {
    "@type": "Blockchain",
    "name": "base",
    "transactionHash": "0xabc123...",
    "blockNumber": "12345"
  },
  "resourceUAL": "urn:ual:dotrep:verified-creators",
  "prov:wasDerivedFrom": "urn:ual:dotrep:verified-creators",
  "dotrep:reputationSignal": {
    "@type": "ReputationSignal",
    "signalType": "payment",
    "value": 2.5,
    "weight": 3.98
  }
}
```

## Reputation-Based Filtering

The gateway can filter transactions based on:

1. **Reputation Score**: Minimum reputation required
2. **Payment History**: Minimum number of previous payments
3. **Payment Value**: Minimum total payment value
4. **Verified Identity**: Require verified identity
5. **Sybil Detection**: Analyze payment graph for coordinated attacks
6. **Recipient Trust**: Payment-weighted reputation of recipient

### Example: High-Trust Endpoint

```javascript
// In server.js, add to accessPolicies:
'premium-data': {
  amount: '10.00',
  currency: 'USDC',
  recipient: '0x...',
  chains: ['base'],
  resourceUAL: 'urn:ual:dotrep:premium-data',
  reputationRequirements: {
    minReputationScore: 0.8,
    minPaymentCount: 5,
    requireVerifiedIdentity: true
  }
}
```

## Integration with DKG

### Publishing Payment Evidence

Payment Evidence KAs are automatically published to DKG after successful payment verification. The UAL is returned to the client for verification.

### Querying Payment Graph

Use SPARQL to query payment evidence:

```sparql
PREFIX schema: <https://schema.org/>
PREFIX dotrep: <https://dotrep.io/ontology/>

SELECT ?payment ?payer ?recipient ?amount
WHERE {
  ?payment a dotrep:PaymentEvidence .
  ?payment payer/schema:identifier ?payer .
  ?payment recipient/schema:identifier ?recipient .
  ?payment amount/schema:value ?amount .
  FILTER(?payer = "0xpayer...")
}
```

## TraceRank Integration

Payment Evidence KAs can be used for TraceRank-style reputation scoring:

- **Payment-weighted endorsements**: Higher-value payments = stronger signals
- **Payer reputation weighting**: Payments from high-reputation payers = more trust
- **Sybil resistance**: Payment graph analysis detects coordinated attacks

## Security Features

1. **Challenge/Nonce**: Prevents replay attacks
2. **Expiry**: Payment requests expire after 15 minutes
3. **Signature Verification**: Cryptographic signature validation
4. **Settlement Verification**: On-chain or facilitator attestation
5. **Replay Protection**: Transaction hash tracking
6. **Sybil Detection**: Payment pattern analysis

## Demo Checklist

- [x] Canonical 402 response with payment terms
- [x] X-PAYMENT header support
- [x] Challenge/nonce generation and validation
- [x] Payment settlement verification
- [x] Payment Evidence KA publishing
- [x] Reputation-based filtering
- [x] Payment graph analysis
- [x] TraceRank-style scoring

## 🤖 MCP Tool Integration

The gateway includes MCP (Model Context Protocol) tools for AI agent integration:

### Available MCP Tools

1. **list_datasets**: List available datasets/resources (free discovery)
2. **request_dataset_access**: Request access to a dataset (auto-handles x402 payment)
3. **query_verified_info**: Query verified information (pay-per-query)
4. **get_top_reputable_users**: Get top-N reputable users (pay-per-API)

### Usage Example

```javascript
const { listDatasets, requestDatasetAccess, queryVerifiedInfo } = require('./mcp-tools');

// List available datasets
const datasets = await listDatasets({ type: 'dataset', minReputation: 0.8 });

// Request access (automatically handles payment)
const access = await requestDatasetAccess(
  'urn:ual:dotrep:product:dataset:tech-trends',
  '0x...',
  true // use facilitator
);

// Query verified info
const info = await queryVerifiedInfo(
  'What is the current price of Bitcoin?',
  '0x...',
  0.8 // min source reputation
);
```

## 🛠️ Middleware

Use the x402 middleware to easily protect any endpoint:

```javascript
const { x402Middleware } = require('./x402-middleware');

// Protect endpoint with x402
app.get('/api/premium-data', 
  x402Middleware('premium-data', {
    reputationRequirements: {
      minReputationScore: 0.8,
      minPaymentCount: 5
    }
  }),
  (req, res) => {
    // Payment evidence available in req.paymentEvidence
    res.json({ 
      data: 'premium content',
      paymentEvidence: req.paymentEvidence 
    });
  }
);
```

## 📖 Client Examples

See `client-example.js` for comprehensive examples:

- Pay-per-API for reputation data
- Quality data microtransactions
- Data marketplace purchases
- AI agent-driven purchases

Run examples:
```bash
node client-example.js
```

## 🔧 Implementation Patterns

### Pattern 1: Pay-per-API
Monetize direct queries to reputation API or DKG knowledge assets.

**Flow:**
1. Client requests resource → 402 with payment terms
2. Client pays via facilitator or on-chain
3. Client retries with X-PAYMENT header
4. Server verifies payment and serves resource

### Pattern 2: Decentralized Data Marketplace
Enable high-reputation users to become data vendors.

**Flow:**
1. Provider lists product (free discovery)
2. Buyer discovers product
3. Buyer purchases via x402 (direct payment to provider)
4. Payment Evidence KA published to DKG
5. Data access granted

### Pattern 3: Agent-Driven E-Commerce
AI agents autonomously purchase products with reputation verification.

**Flow:**
1. Agent searches for product
2. Agent verifies seller reputation
3. Agent checks price against budget
4. Agent pays via x402
5. Product delivered with provenance

### Pattern 4: Quality Data Microtransactions
Pay-per-query for verified information.

**Flow:**
1. Client queries verified info
2. Server responds with 402
3. Client pays $0.01
4. Server returns answer backed by high-reputation sources
5. Payment Evidence KA published

## 🔐 Security Features

1. **Challenge/Nonce**: Prevents replay attacks
2. **Expiry**: Payment requests expire after 15 minutes
3. **Signature Verification**: Cryptographic signature validation
4. **Settlement Verification**: On-chain or facilitator attestation
5. **Replay Protection**: Transaction hash tracking
6. **Sybil Detection**: Payment pattern analysis
7. **Reputation Gating**: Transactions filtered by reputation scores

## 📊 Payment Evidence

All successful payments result in Payment Evidence Knowledge Assets published to DKG:

- **UAL**: Universal Asset Locator for the payment evidence
- **Transaction Hash**: On-chain transaction hash
- **Provenance**: Links to resource being paid for
- **Reputation Signals**: Payment-weighted reputation data

## 🎯 Use Cases

1. **Influencer Marketplace**: High-reputation influencers sell recommendations
2. **Data Analytics**: Pay for access to verified analytics reports
3. **AI Agent Commerce**: Autonomous agents purchase data/services
4. **Quality Content**: Monetize high-quality, verified content
5. **Reputation Services**: Sell reputation scores and trust metrics

## References

- [x402.org Specification](https://x402.org)
- [Coinbase x402 Docs](https://docs.cdp.coinbase.com/x402/docs)
- [Cloudflare x402 Blog](https://blog.cloudflare.com/x402)
- [OriginTrail DKG](https://origintrail.io)
- [TraceRank Paper](https://arxiv.org/abs/...)
- [MCP Specification](https://modelcontextprotocol.io)

## License

MIT

