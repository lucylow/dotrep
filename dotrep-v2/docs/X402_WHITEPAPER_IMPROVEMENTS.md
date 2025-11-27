# x402 Whitepaper Compliance Improvements

This document describes the improvements made to align the x402 payment implementation with the official x402 whitepaper specifications.

## Overview

The implementation has been updated to fully comply with the x402 protocol whitepaper, specifically:
- **Section 9.1**: Payment Request Format
- **Section 9.2**: Payment Authorization (EIP-712)
- **Section 9.3**: Transaction Settlement

## Key Changes

### 1. Payment Request Format (Section 9.1)

**Before:**
```typescript
{
  amount: "0.10",
  currency: "USDC",
  recipient: "0x...",
  challenge: "x402-..."
}
```

**After (Whitepaper-compliant):**
```typescript
{
  maxAmountRequired: "0.10",
  assetType: "ERC20",
  assetAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  paymentAddress: "0xRECEIVER_WALLET_ADDRESS",
  network: "base-mainnet",
  expiresAt: "2024-05-20T12:00:00Z",
  nonce: "unique-identifier-123",
  paymentId: "req-5678"
}
```

**Key Fields:**
- `maxAmountRequired`: Maximum payment amount required
- `assetType`: Token type (e.g., "ERC20")
- `assetAddress`: Smart contract address of payment token (e.g., USDC)
- `paymentAddress`: Where to send the payment (marketplace wallet)
- `network`: Blockchain network (e.g., "base-mainnet", "base-sepolia")
- `expiresAt`: ISO 8601 timestamp for payment expiry
- `nonce`: Unique identifier to prevent replay attacks
- `paymentId`: Request identifier for tracking individual payments

### 2. Payment Authorization (Section 9.2)

**Enhanced Payment Proof:**
```typescript
interface PaymentProof {
  // From payment request
  maxAmountRequired: string;
  assetType: string;
  assetAddress: string;
  paymentAddress: string;
  network: string;
  expiresAt: string;
  nonce: string;
  paymentId: string;
  
  // Payment authorization fields
  amount: string; // Actual amount (must be ≤ maxAmountRequired)
  payer: string; // Wallet address of payer
  timestamp: number; // Timestamp of authorization
  signature: string; // EIP-712 cryptographic signature
  
  // Transaction settlement
  txHash?: string; // Transaction hash (if settled on-chain)
}
```

**EIP-712 Signature Verification:**
- All payment authorizations use EIP-712 standard for secure, typed structured data signing
- Signatures are verified against the payer address
- Timestamp and expiry validation prevents replay attacks

### 3. HTTP 402 Response Format

**Whitepaper-compliant response:**
```json
{
  "error": "Payment Required",
  "code": "X402_PAYMENT_REQUIRED",
  "maxAmountRequired": "0.10",
  "assetType": "ERC20",
  "assetAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  "paymentAddress": "0xRECEIVER_WALLET_ADDRESS",
  "network": "base-mainnet",
  "expiresAt": "2024-05-20T12:00:00Z",
  "nonce": "unique-identifier-123",
  "paymentId": "req-5678",
  "instructions": { /* full payment request */ },
  "reason": "Payment is required to access this resource",
  "documentation": "https://x402.org/docs/client-integration"
}
```

### 4. Enhanced Payment Validation

**Validation checks:**
1. ✅ Payment amount ≤ maxAmountRequired
2. ✅ Asset address matches expected token
3. ✅ Payment address (recipient) matches
4. ✅ Network matches
5. ✅ Expiry timestamp validation
6. ✅ Nonce/paymentId replay protection
7. ✅ EIP-712 signature verification
8. ✅ Facilitator or on-chain settlement verification

### 5. Reputation Calculator Integration

**Enhanced VerifiedPayment interface:**
```typescript
interface VerifiedPayment {
  // Standard fields
  txHash: string;
  chain: string;
  amount: number;
  currency: string;
  timestamp: number;
  verified: boolean;
  
  // x402 Whitepaper fields (for enhanced tracking)
  maxAmountRequired?: string;
  assetType?: string;
  assetAddress?: string;
  paymentAddress?: string;
  network?: string;
  payer?: string;
  paymentId?: string;
  nonce?: string;
  signature?: string;
  isX402Payment?: boolean; // Flag for x402 protocol payments
}
```

**Benefits:**
- Better identification of x402 protocol payments
- Enhanced reputation signals from autonomous agent commerce
- Improved trust scoring based on payment metadata

## Implementation Files

### Updated Files:
1. **`dotrep-v2/server/_core/m2mCommerce/x402PaymentMiddleware.ts`**
   - Complete rewrite to match whitepaper Section 9.1 and 9.2
   - Enhanced payment request format
   - EIP-712 signature verification support
   - Whitepaper-compliant HTTP 402 responses

2. **`dotrep-v2/server/_core/premiumApi.ts`**
   - Updated to use new whitepaper-compliant middleware
   - Enhanced payment proof tracking

3. **`dotrep-v2/server/_core/reputationCalculator.ts`**
   - Enhanced VerifiedPayment interface with x402 fields
   - Better tracking of x402 protocol payments for reputation scoring

## Usage Example

```typescript
import { x402PaymentMiddleware } from './m2mCommerce/x402PaymentMiddleware';

// Protect endpoint with x402 payment (whitepaper-compliant)
app.get('/api/premium/reputation-score/:userId',
  x402PaymentMiddleware({
    maxAmountRequired: "0.10",
    assetType: "ERC20",
    assetAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
    paymentAddress: process.env.X402_WALLET_ADDRESS,
    network: "base-sepolia",
    resource: "reputation-score",
    description: "Premium reputation analytics report",
    expiresAtMinutes: 15
  }),
  async (req, res) => {
    // Access payment proof from request
    const paymentProof = req.paymentProof;
    
    // Calculate reputation with x402 payment tracking
    const reputation = await calculateReputation({
      // ... other params
      verifiedPayments: [{
        txHash: paymentProof.txHash,
        chain: paymentProof.network,
        amount: parseFloat(paymentProof.amount),
        currency: 'USDC',
        timestamp: paymentProof.timestamp,
        verified: true,
        // x402 fields
        maxAmountRequired: paymentProof.maxAmountRequired,
        assetType: paymentProof.assetType,
        assetAddress: paymentProof.assetAddress,
        paymentAddress: paymentProof.paymentAddress,
        network: paymentProof.network,
        payer: paymentProof.payer,
        paymentId: paymentProof.paymentId,
        nonce: paymentProof.nonce,
        signature: paymentProof.signature,
        isX402Payment: true
      }]
    });
    
    res.json(reputation);
  }
);
```

## Benefits

1. **Whitepaper Compliance**: Full alignment with x402 protocol specification
2. **Better Security**: EIP-712 signatures, nonce replay protection, expiry validation
3. **Enhanced Tracking**: Complete payment metadata for reputation scoring
4. **Autonomous Agent Support**: Proper handling of machine-to-machine payments
5. **Future-Proof**: Ready for facilitator services and on-chain settlement

## Testing

To test the implementation:

1. **Request without payment:**
   ```bash
   curl http://localhost:3000/api/premium/reputation-score/0xUSER123
   ```
   Should return HTTP 402 with whitepaper-compliant payment request.

2. **Request with payment:**
   ```bash
   curl -H "X-Payment-Authorization: <payment-proof-json>" \
        http://localhost:3000/api/premium/reputation-score/0xUSER123
   ```
   Should return reputation data if payment is valid.

## References

- [x402 Whitepaper](https://www.x402.org/x402-whitepaper.pdf)
- [EIP-712 Standard](https://eips.ethereum.org/EIPS/eip-712)
- [x402 Documentation](https://x402.org/docs/client-integration)

