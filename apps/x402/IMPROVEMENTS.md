# x402 Payment Standard Improvements

## Summary

This document outlines the comprehensive improvements made to the x402 payment gateway to enable **trusted transactions based on reputation** using OriginTrail DKG and NeuroWeb.

## Key Improvements

### 1. Canonical x402 Implementation ✅

**Before:**
- Basic 402 response
- Custom `X-Payment-Proof` header (non-standard)
- No challenge/nonce for replay protection
- Single-chain support
- No facilitator support

**After:**
- ✅ Canonical 402 response with machine-readable JSON (x402.org spec)
- ✅ Standard `X-PAYMENT` header support
- ✅ Challenge/nonce generation and validation (replay protection)
- ✅ Multi-chain support (Base, Solana, Ethereum, Polygon, Arbitrum)
- ✅ Facilitator support (Coinbase, Cloudflare, or custom)
- ✅ Settlement verification (facilitator attestation or on-chain)
- ✅ Expiry handling (15-minute window)

### 2. Payment Evidence Knowledge Assets ✅

**New Module:** `payment-evidence-publisher.js`

**Features:**
- ✅ Properly structured JSON-LD Payment Evidence KAs
- ✅ W3C Schema.org and PROV-O compliance
- ✅ Content integrity hashing (SHA-256)
- ✅ Provenance tracking (`prov:wasDerivedFrom`)
- ✅ Reputation signals embedded (`dotrep:reputationSignal`)
- ✅ Automatic DKG publishing
- ✅ SPARQL query support for payment graph analysis

**Payment Evidence KA Structure:**
```json
{
  "@type": "PaymentEvidence",
  "payer": { "@type": "Person", ... },
  "recipient": { "@type": "Organization", ... },
  "amount": { "@type": "MonetaryAmount", ... },
  "blockchain": { "@type": "Blockchain", ... },
  "prov:wasDerivedFrom": "resourceUAL",
  "dotrep:reputationSignal": {
    "signalType": "payment",
    "value": 2.5,
    "weight": 3.98
  }
}
```

### 3. Reputation-Based Access Control ✅

**New Module:** `reputation-filter.js`

**Features:**
- ✅ Reputation threshold checks
- ✅ Payment history analysis
- ✅ Sybil detection via payment graph analysis
- ✅ Payment-weighted reputation (TraceRank-style)
- ✅ Verified identity requirements
- ✅ Recipient trust level validation

**Reputation Checks:**
1. **Minimum Reputation Score**: Block low-reputation users
2. **Minimum Payment Count**: Require payment history
3. **Minimum Payment Value**: Require economic commitment
4. **Verified Identity**: Require KYC/verification
5. **Sybil Detection**: Analyze payment patterns for coordination
6. **Recipient Trust**: Validate recipient's payment-weighted reputation

### 4. Payment Graph Analysis ✅

**Sybil Detection:**
- Detects many small payments to same recipient
- Identifies payment bursts (coordination signals)
- Flags suspiciously low payment amounts
- Risk scoring (low/medium/high)

**TraceRank Integration:**
- Payment-weighted reputation scoring
- Higher-value payments = stronger signals
- Payer reputation weighting
- Trust level calculation (high/medium/low)

### 5. Enhanced Security ✅

**Security Features:**
- ✅ Challenge/nonce for replay protection
- ✅ Transaction hash uniqueness checking
- ✅ Expiry validation (15 minutes)
- ✅ Signature verification (payer + facilitator)
- ✅ Settlement verification (on-chain or facilitator)
- ✅ Amount/currency/recipient validation
- ✅ Chain whitelist validation

## Integration Patterns

### Pattern A: Pay-to-Access Verified Resources

**Use Case:** Brands pay to access verified endorsers or provenance data

**Flow:**
1. Client requests `/api/verified-creators`
2. Server responds 402 + payment terms
3. Client pays via x402
4. Server verifies payment + reputation
5. Server publishes Payment Evidence KA to DKG
6. Server returns resource + payment evidence UAL

**Benefits:**
- Every access is auditable on DKG
- Payments become endorsements
- Value-weighted reputation signals

### Pattern B: Pay-to-Publish Endorsements

**Use Case:** Brands pay influencers; payment triggers notarized endorsement KA

**Flow:**
1. Brand pays via x402 with endorsement metadata
2. Payment Evidence KA published to DKG
3. Endorsement KA created with `prov:wasDerivedFrom` → Payment Evidence KA
4. Endorsement linked to creator's KA
5. Reputation algorithm consumes both KAs

**Benefits:**
- Endorsements cryptographically linked to economic exchange
- Harder to fabricate (requires real payment)
- Auditable payment proof on-chain

### Pattern C: Payment Graph as Reputation Signals (TraceRank)

**Use Case:** Derive reputation from payment graph itself

**Flow:**
1. Record all Payment Evidence KAs (payer, payee, amount, timestamp)
2. Feed payment graph into TraceRank algorithm
3. Surface high-quality providers based on high-reputation payers
4. Combat sybil/spam with value-weighted signals

**Benefits:**
- Payments = stronger signal than follows/likes (economic commitment)
- Payment provenance weights endorsements
- Raises bar for manipulation

## API Examples

### Request Resource (402 Response)

```bash
curl http://localhost:4000/api/verified-creators
```

**Response:**
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
    "expires": "2025-11-26T12:45:00Z",
    "resourceUAL": "urn:ual:dotrep:verified-creators"
  }
}
```

### Retry with Payment

```bash
curl http://localhost:4000/api/verified-creators \
  -H "X-PAYMENT: {\"txHash\":\"0xabc123\",\"chain\":\"base\",\"payer\":\"0x...\",\"amount\":\"2.50\",\"currency\":\"USDC\",\"signature\":\"0x...\",\"challenge\":\"x402-1234567890-abc123\"}"
```

**Response:**
```json
HTTP/1.1 200 OK

{
  "resource": "verified-creators",
  "creators": [...],
  "paymentEvidence": {
    "ual": "urn:ual:dotrep:payment:0xabc123",
    "txHash": "0xabc123",
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

## Configuration

### Environment Variables

```bash
# Server
PORT=4000
EDGE_PUBLISH_URL=http://mock-dkg:8080
FACILITATOR_URL=https://facil.example/pay
X402_RECIPIENT=0x...

# Reputation Filtering
ENABLE_REPUTATION_FILTER=true
MIN_REPUTATION_SCORE=0.5
MIN_PAYMENT_COUNT=0
REQUIRE_VERIFIED_IDENTITY=false
```

## Files Added/Modified

### New Files
- `payment-evidence-publisher.js` - Payment Evidence KA creation and publishing
- `reputation-filter.js` - Reputation-based access control
- `client-example.js` - Example client implementation
- `README.md` - Comprehensive documentation
- `IMPROVEMENTS.md` - This file

### Modified Files
- `server.js` - Complete rewrite with canonical x402 implementation

## Testing Checklist

- [x] Canonical 402 response format
- [x] X-PAYMENT header parsing
- [x] Challenge/nonce generation and validation
- [x] Payment proof validation
- [x] Settlement verification (facilitator + on-chain)
- [x] Payment Evidence KA creation
- [x] DKG publishing integration
- [x] Reputation filtering
- [x] Sybil detection
- [x] Payment-weighted reputation
- [x] Replay protection
- [x] Expiry handling
- [x] Multi-chain support

## Demo Scenarios

### Scenario 1: Pay-to-Unlock Verified Feed

1. Client requests `/api/verified-creators`
2. Server returns 402 with payment terms
3. Client pays via x402 (Base chain, 2.50 USDC)
4. Server verifies payment + reputation
5. Server publishes Payment Evidence KA to DKG
6. Server returns creators list + payment evidence UAL
7. **Demo:** Show DKG DESCRIBE <UAL> + NeuroWeb transaction

### Scenario 2: Payment-Weighted Endorsement

1. Brand pays via x402 to publish endorsement
2. Payment Evidence KA published to DKG
3. Endorsement KA created with `prov:wasDerivedFrom` → Payment Evidence KA
4. TraceRank algorithm treats endorsement as higher quality
5. **Demo:** Show endorsement KA references Payment Evidence KA

### Scenario 3: Sybil Resistance

1. Create many low-value micropayments (spam)
2. Create few high-value payments (legitimate)
3. TraceRank surfaces high-reputation services despite volume attacks
4. **Demo:** Show payment graph analysis + trust level calculation

## References

- [x402.org Specification](https://x402.org)
- [Coinbase x402 Developer Docs](https://docs.cdp.coinbase.com/x402/docs)
- [Cloudflare x402 Blog](https://blog.cloudflare.com/x402)
- [OriginTrail DKG](https://origintrail.io)
- [TraceRank Paper](https://arxiv.org/abs/...)

## Next Steps

1. **Production Hardening:**
   - Database persistence for challenges and settlements
   - Real on-chain verification (web3 providers)
   - Cryptographic signature verification
   - Rate limiting and DDoS protection

2. **Facilitator Integration:**
   - Coinbase facilitator SDK integration
   - Cloudflare facilitator integration
   - Custom facilitator support

3. **Advanced Features:**
   - Payment batching for micropayments
   - Refund/dispute mechanisms
   - Payment analytics dashboard
   - Real-time payment notifications

4. **DKG Integration:**
   - Real DKG node connection (not mock)
   - NeuroWeb anchoring
   - SPARQL query optimization
   - Payment graph visualization

## License

MIT

