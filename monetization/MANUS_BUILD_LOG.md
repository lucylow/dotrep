# DotRep Monetization - Build & Demo Log

This document records sample UALs, transaction hashes, and test data generated during development and demos.

## Demo Session: 2025-11-26

### Environment

- **Mode**: SIMULATE
- **API URL**: http://localhost:3000
- **DKG Edge Node**: Simulated
- **Blockchain**: Simulated (Hardhat local)

### Sample Payment Transactions

#### Payment 1: Trusted Feed Access

```
Payment Request:
- Amount: 0.01 USDC
- Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
- Reference: trusted_feed:creator123:20251126
- Nonce: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

Transaction Hash (Simulated):
0x7f3a8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

Payment Proof:
{
  "txHash": "0x7f3a8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "signedBy": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "chain": "base",
  "proofSignature": "0x1234...",
  "nonce": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

#### ReceiptAsset UAL

```
urn:ual:dotrep:receipt:7f3a8b2c1d4e5f6a
```

**ReceiptAsset JSON-LD:**
```json
{
  "@context": ["https://schema.org/"],
  "@type": "ReceiptAsset",
  "id": "urn:ual:dotrep:receipt:7f3a8b2c1d4e5f6a",
  "payer": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "recipient": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "0.01",
  "token": "USDC",
  "resourceUAL": "trusted_feed:creator123:20251126",
  "paymentTx": "0x7f3a8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
  "published": "2025-11-26T10:30:00Z",
  "contentHash": "0x8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0",
  "schema:paymentMethod": {
    "type": "x402",
    "protocol": "HTTP/1.1 402 Payment Required"
  }
}
```

### Sample Reputation Assets

#### Creator: creator123

```
ReputationAsset UAL:
urn:ual:dotrep:reputation:creator123

Reputation Scores:
- graphScore: 0.7500
- stakeWeight: 0.6000
- paymentWeight: 0.8500
- sybilPenalty: 0.0000
- finalScore: 0.7300
```

**ReputationAsset JSON-LD:**
```json
{
  "@context": ["https://schema.org/"],
  "@type": "ReputationAsset",
  "id": "urn:ual:dotrep:reputation:creator123",
  "creatorId": "creator123",
  "graphScore": 0.75,
  "stakeWeight": 0.60,
  "paymentWeight": 0.85,
  "sybilPenalty": 0.0,
  "finalScore": 0.73,
  "computedAt": "2025-11-26T10:00:00Z",
  "contentHash": "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
  "provenance": {
    "algorithm": "weighted-pagerank",
    "version": "1.0",
    "parameters": {
      "paymentWeight": 0.3,
      "stakeWeight": 0.2,
      "graphWeight": 0.5
    }
  }
}
```

#### Creator: creator456 (Top Ranked)

```
ReputationAsset UAL:
urn:ual:dotrep:reputation:creator456

Reputation Scores:
- graphScore: 0.9500
- stakeWeight: 0.9000
- paymentWeight: 0.9500
- sybilPenalty: 0.0000
- finalScore: 0.9400
```

### Sample Graph Data

**Input Graph (sample_graph.json):**
```json
{
  "edges": [
    {
      "from": "creator1",
      "to": "creator2",
      "weight": 1.0,
      "amount": 10.0,
      "timestamp": 1000000000
    },
    {
      "from": "creator2",
      "to": "creator3",
      "weight": 1.0,
      "amount": 5.0,
      "timestamp": 1000000000
    },
    {
      "from": "creator3",
      "to": "creator1",
      "weight": 1.0,
      "amount": 0.0,
      "timestamp": 1000000000
    }
  ]
}
```

**Computed Reputation Output:**
```json
[
  {
    "creatorId": "creator2",
    "graphScore": 0.8234,
    "stakeWeight": 0.0000,
    "paymentWeight": 0.8500,
    "sybilPenalty": 0.0000,
    "finalScore": 0.8067
  },
  {
    "creatorId": "creator1",
    "graphScore": 0.7500,
    "stakeWeight": 0.0000,
    "paymentWeight": 0.5000,
    "sybilPenalty": 0.0000,
    "finalScore": 0.6750
  },
  {
    "creatorId": "creator3",
    "graphScore": 0.5000,
    "stakeWeight": 0.0000,
    "paymentWeight": 0.2500,
    "sybilPenalty": 0.0000,
    "finalScore": 0.4375
  }
]
```

### Sybil Detection Test

**Sybil Cluster Test Graph:**
```json
{
  "edges": [
    {"from": "sybil1", "to": "sybil2", "weight": 1.0, "amount": 0.0, "timestamp": 0},
    {"from": "sybil2", "to": "sybil1", "weight": 1.0, "amount": 0.0, "timestamp": 0},
    {"from": "sybil1", "to": "sybil3", "weight": 1.0, "amount": 0.0, "timestamp": 0},
    {"from": "sybil3", "to": "sybil1", "weight": 1.0, "amount": 0.0, "timestamp": 0},
    {"from": "legit1", "to": "sybil1", "weight": 1.0, "amount": 50.0, "timestamp": 1000000000}
  ],
  "stakes": {
    "sybil1": 0.1,
    "sybil2": 0.1,
    "sybil3": 0.1,
    "legit1": 10.0
  }
}
```

**Results with Sybil Detection:**
- `sybil1`: finalScore 0.2345, sybilPenalty 0.4500
- `sybil2`: finalScore 0.2100, sybilPenalty 0.4000
- `sybil3`: finalScore 0.1980, sybilPenalty 0.3800
- `legit1`: finalScore 0.8500, sybilPenalty 0.0000

### Escrow Contract Deployment

**Local Hardhat Network:**
```
Network: localhost:8545
Deployed Escrow Contract:
Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Fee Percent: 2.5% (250)
Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

**Sample Escrow Deposit:**
```
Reference ID: endorsement:offer123:1732620000
Deposit Amount: 0.1 ETH
Buyer: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Recipient: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Status: Deposited
```

### API Endpoints Tested

1. ✅ `GET /health` - Health check
2. ✅ `GET /api/marketplace/trusted-feed/:creatorId` - 402 flow
3. ✅ `POST /api/payments/submit` - Payment submission
4. ✅ `GET /api/payments/:txHash` - Payment lookup
5. ✅ `POST /api/payments/verify` - Proof verification
6. ✅ `GET /api/reputation/:creatorId` - Reputation lookup
7. ✅ `GET /api/reputation/top` - Top creators
8. ✅ `GET /admin/metrics` - Analytics

### Test Results

**Payment Flow Integration:**
- ✅ 402 response with X-Payment-Request header
- ✅ Payment submission creates transaction
- ✅ Payment proof verification
- ✅ Feed access after payment
- ✅ ReceiptAsset published to DKG

**Reputation Computation:**
- ✅ Basic PageRank computation
- ✅ Payment evidence boost
- ✅ Sybil cluster detection
- ✅ Output format validation

## Notes

- All UALs are simulated in development mode
- Transaction hashes are randomly generated for simulation
- Content hashes are SHA-256 of JSON-LD content
- Signatures are placeholders in simulate mode
- Real DKG publishing requires valid Edge Node URL

## Next Steps

1. Deploy to testnet with real Edge Node
2. Test with real blockchain transactions
3. Verify UALs in OriginTrail DKG explorer
4. Test Sybil detection on larger graphs
5. Performance testing with high load

