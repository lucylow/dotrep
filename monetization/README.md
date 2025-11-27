# DotRep Monetization Features

**Sybil-Resistant Social Credit Marketplace with x402 HTTP Micropayments**

This repository implements business monetization features for DotRep TrustLayer, including x402 protocol payment flows, reputation-weighted marketplace, OriginTrail DKG integration, and escrow smart contracts.

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (Browser/  │
│    SDK)     │
└──────┬──────┘
       │
       │ HTTP 402 Payment Required
       │ X-Payment-Request header
       ▼
┌─────────────────────────────────────┐
│     Express API Server              │
│  ┌──────────────────────────────┐  │
│  │  Payment Middleware (x402)   │  │
│  │  - requirePayment()          │  │
│  │  - verifyPaymentProof()      │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Services                     │  │
│  │  - paymentFacilitator         │  │
│  │  - dkgPublisher              │  │
│  │  - reputationService         │  │
│  │  - escrowService             │  │
│  └──────────────────────────────┘  │
└──────┬──────────────────────────────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌────────┐ ┌──────────────────┐
│  DKG   │ │  Blockchain      │
│ Edge   │ │  (Escrow)        │
│ Node   │ │                  │
└────────┘ └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- (Optional) Hardhat for local blockchain testing
- (Optional) OriginTrail Edge Node for DKG publishing

### Installation

```bash
# Clone repository
cd monetization

# Install Node.js dependencies
npm install

# Install Python dependencies
cd python
pip install -r requirements.txt
cd ..

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration
```

### Development Mode (Simulate)

Run in simulate mode (no blockchain or DKG required):

```bash
# Start API server
npm run dev

# Server runs on http://localhost:3000
```

The server will automatically use simulate mode if `EDGE_NODE_URL` is not set or `SIMULATE=true`.

### Running Tests

```bash
# Node.js tests
npm test

# Python tests
cd python
python test/reputation.test.py
```

## 📖 Usage

### 1. x402 Payment Flow

#### Client Request (No Payment)

```bash
curl http://localhost:3000/api/marketplace/trusted-feed/creator123
```

**Response (402 Payment Required):**

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json
X-Payment-Request: {"amount":"0.01","token":"USDC","recipient":"0x...","nonce":"...","expiresAt":...}

{
  "message": "Payment required",
  "paymentRequest": {
    "amount": "0.01",
    "token": "USDC",
    "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "reference": "trusted_feed:creator123:20251126",
    "nonce": "...",
    "expiresAt": "2025-11-26T12:00:00Z"
  }
}
```

#### Client Submits Payment

```bash
curl -X POST http://localhost:3000/api/payments/submit \
  -H "Content-Type: application/json" \
  -d '{
    "paymentRequest": {
      "amount": "0.01",
      "token": "USDC",
      "recipient": "0x...",
      "nonce": "...",
      "reference": "..."
    }
  }'
```

**Response:**

```json
{
  "success": true,
  "txHash": "0xabc123...",
  "status": "confirmed",
  "simulated": true
}
```

#### Client Retries with Payment Proof

```bash
curl http://localhost:3000/api/marketplace/trusted-feed/creator123 \
  -H "X-Payment-Proof: {\"txHash\":\"0xabc123...\",\"signedBy\":\"0x...\",\"proofSignature\":\"0x...\"}"
```

**Response (200 OK):**

```json
{
  "feed": [...],
  "receiptUAL": "urn:ual:dotrep:receipt:0xabc123...",
  "payment": {
    "txHash": "0xabc123...",
    "amount": "0.01",
    "token": "USDC"
  }
}
```

### 2. Reputation Computation

Compute reputation scores from graph data:

```bash
cd python

# Create sample graph data
cat > sample_graph.json << EOF
{
  "edges": [
    {"from": "creator1", "to": "creator2", "weight": 1.0, "amount": 10.0, "timestamp": 1000000000},
    {"from": "creator2", "to": "creator3", "weight": 1.0, "amount": 5.0, "timestamp": 1000000000}
  ]
}
EOF

# Compute reputation
python compute_reputation.py sample_graph.json --output reputation_scores.json

# Output:
# ✅ Computed reputation for 3 creators
# 📊 Top 5 creators:
#   1. creator2: 0.8234 (graph: 0.7500, stake: 0.0000, payment: 0.8500, sybil: 0.0000)
```

### 3. Publish Knowledge Asset to DKG

```bash
cd python

# Publish ReceiptAsset
python publish_sample_asset.py \
  --type receipt \
  --tx-hash 0xabc123... \
  --payer 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --amount 0.01 \
  --token USDC \
  --recipient 0xdead... \
  --simulate

# Publish ReputationAsset
python publish_sample_asset.py \
  --type reputation \
  --creator-id creator123 \
  --graph-score 0.75 \
  --stake-weight 0.60 \
  --payment-weight 0.85 \
  --final-score 0.73 \
  --simulate
```

### 4. Using the SDK

```javascript
import { DotRepSDK } from './src/sdk/index.js';
import { ethers } from 'ethers';

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);

const sdk = new DotRepSDK({
  apiUrl: 'http://localhost:3000',
  wallet: wallet,
});

// Get reputation
const reputation = await sdk.getReputationFor('creator123');

// Request trusted feed (handles payment automatically)
const result = await sdk.requestTrustedFeed('creator123');
console.log('Feed:', result.feed);
console.log('Receipt UAL:', result.receiptUAL);

// Get top creators
const topCreators = await sdk.getTopCreators('web3', 10);
```

### 5. React UI Demo

```bash
cd ui
npm install
npm run dev

# Open http://localhost:5173
```

The UI demonstrates:
- Reputation leaderboard
- Payment flow (402 → pay → verify → feed)
- Receipt UAL display

## 🔧 Configuration

### Environment Variables

See `.env.example` for all configuration options:

- `EDGE_NODE_URL`: OriginTrail DKG Edge Node URL
- `NEUROWEB_RPC`: NeuroWeb RPC endpoint (optional)
- `ESCROW_CONTRACT_ADDRESS`: Deployed Escrow contract address
- `RECIPIENT_ADDRESS`: Payment recipient address
- `PRIVATE_KEY`: Private key for facilitator (never commit!)
- `SIMULATE`: Set to `true` for development (default if EDGE_NODE_URL not set)

### Escrow Contract Deployment

```bash
# Start local Hardhat node (in separate terminal)
npx hardhat node

# Deploy Escrow contract
bash scripts/deploy_escrow.sh

# Add contract address to .env
echo "ESCROW_CONTRACT_ADDRESS=0x..." >> .env
```

## 🧪 Testing

### Payment Flow Test

```bash
npm test

# Tests:
# ✅ GET /api/marketplace/trusted-feed returns 402
# ✅ POST /api/payments/submit creates payment
# ✅ GET /api/payments/:txHash returns payment details
# ✅ GET /api/marketplace/trusted-feed with proof returns feed
```

### Reputation Computation Test

```bash
cd python
python test/reputation.test.py

# Tests:
# ✅ Basic PageRank computation
# ✅ Payment evidence boost
# ✅ Sybil cluster detection
# ✅ Output format validation
```

## 📁 Project Structure

```
monetization/
├── src/
│   ├── api/
│   │   ├── server.js              # Express app entry
│   │   └── routes/
│   │       ├── payments.js        # Payment endpoints
│   │       ├── reputation.js      # Reputation endpoints
│   │       └── marketplace.js     # Marketplace endpoints
│   ├── middleware/
│   │   ├── paymentMiddleware.js   # HTTP 402 middleware
│   │   └── verifyPaymentMiddleware.js  # Proof verification
│   ├── services/
│   │   ├── paymentFacilitator.js  # Payment submission
│   │   ├── dkgPublisher.js        # DKG publishing
│   │   ├── reputationService.js   # Reputation queries
│   │   └── escrowService.js       # Escrow interactions
│   ├── utils/
│   │   ├── x402Helpers.js        # x402 protocol helpers
│   │   ├── cryptoHelpers.js       # EIP-712 signing
│   │   └── config.js              # Configuration
│   └── sdk/
│       └── index.js               # Client SDK
├── python/
│   ├── compute_reputation.py     # Reputation computation
│   ├── publish_sample_asset.py   # DKG publishing
│   ├── verify_asset.py           # Asset verification
│   └── requirements.txt
├── contracts/
│   └── Escrow.sol                 # Solidity escrow contract
├── templates/
│   ├── ReputationAsset.jsonld     # JSON-LD template
│   ├── ReceiptAsset.jsonld        # JSON-LD template
│   └── CommunityNote.jsonld       # JSON-LD template
├── ui/
│   └── src/                       # React demo UI
├── test/
│   ├── payments.test.js           # Payment integration tests
│   └── reputation.test.py         # Reputation unit tests
├── scripts/
│   └── deploy_escrow.sh           # Contract deployment
├── README.md                      # This file
├── ethics.md                      # Privacy & ethics guidelines
└── MANUS_BUILD_LOG.md             # Demo log with sample UALs
```

## 🔐 Security & Privacy

- **Nonces**: Payment requests include nonces to prevent replay attacks
- **Expiry**: Payment requests expire after 15 minutes (configurable)
- **Signatures**: Payment proofs use EIP-712 typed data signing
- **PII**: Never publish raw PII to DKG; hash sensitive identifiers
- **Rate Limiting**: Premium endpoints are rate-limited
- **Private Keys**: Never commit private keys; use environment variables

See `ethics.md` for detailed privacy rules and opt-out procedures.

## 📊 Analytics

Access metrics endpoint:

```bash
curl http://localhost:3000/admin/metrics
```

Returns:
- `paymentsReceived`: Total payments processed
- `receiptsPublished`: ReceiptAssets published to DKG
- `queriesByApiKey`: API usage by key
- `reputationComputeJobs`: Reputation computation jobs
- `sybilAlerts`: Sybil detection alerts

## 🎯 Demo Script (4 minutes)

1. **Start server**: `npm run dev`
2. **Load leaderboard**: Open UI at http://localhost:5173
3. **Request feed**: Click "View Feed" on any creator
4. **Observe 402 flow**: See payment request in UI
5. **Payment submitted**: Watch payment status update
6. **Feed displayed**: See trusted feed content
7. **Receipt UAL**: Copy receipt UAL for verification

See `MANUS_BUILD_LOG.md` for sample UALs generated during demo.

## 🤝 Integration with Existing DotRep

This monetization module integrates with the existing DotRep system:

- Uses existing reputation calculator patterns
- Compatible with OriginTrail DKG integration
- Follows x402 protocol standards
- Can be deployed alongside existing services

## 📝 License

MIT

## 🙏 Acknowledgments

- x402 Protocol: HTTP-native micropayments
- OriginTrail: Decentralized Knowledge Graph
- NeuroWeb: Trust layer anchoring

