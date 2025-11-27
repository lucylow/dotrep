# x402 Micropayment Improvements

This document describes the improvements made to the x402 micropayment implementation for API paywalls.

## New Features

### 1. EIP-712 Structured Data Signing (`eip712-signing.js`)

**What it does:**
- Implements EIP-712 standard for secure, typed structured data signing
- Provides better security and user experience compared to raw message signing
- Ensures signatures are only valid for x402 protocol payments

**Key Functions:**
- `signPaymentAuthorization()` - Sign payment authorization using EIP-712
- `verifyPaymentAuthorizationSignature()` - Verify EIP-712 signatures
- `createPaymentProof()` - Create payment proof from signed authorization
- `validateAuthorizationTiming()` - Validate time-bounded authorizations

**Usage:**
```javascript
const { signPaymentAuthorization } = require('./eip712-signing');
const signature = await signPaymentAuthorization(paymentRequest, wallet);
```

### 2. Enhanced Facilitator Client (`facilitator-client.js`)

**What it does:**
- Supports multiple facilitators: Coinbase CDP, Cloudflare Workers, and custom facilitators
- Provides gasless payment execution and instant verification
- Automatic facilitator selection based on chain support

**Key Features:**
- Coinbase CDP integration for Base networks
- Cloudflare Workers support for multiple chains
- Custom facilitator support
- Automatic retry with exponential backoff
- Payment verification via facilitators

**Usage:**
```javascript
const { createFacilitatorClient } = require('./facilitator-client');
const facilitator = createFacilitatorClient({
  coinbaseUrl: 'https://api.developer.coinbase.com/facilitator',
  cloudflareUrl: 'https://your-cloudflare-worker.workers.dev'
});

const result = await facilitator.pay(paymentRequest, payerAddress);
```

### 3. Session-Based Billing (`session-billing.js`)

**What it does:**
- Enables deferred billing where multiple API calls within a session are aggregated
- Supports time-based access and usage-based billing with periodic settlement
- Perfect for streaming data access or multiple API calls in a single session

**Key Features:**
- Session creation and management
- Call tracking and aggregation
- Automatic billing at intervals or session end
- Minimum billing amount enforcement
- Expired session cleanup

**Usage:**
```javascript
const { createSessionBillingManager } = require('./session-billing');
const billing = createSessionBillingManager({
  sessionTimeout: 3600000, // 1 hour
  billingInterval: 300000, // Bill every 5 minutes
  minBillingAmount: '0.01'
});

const session = billing.createSession(payerAddress);
billing.recordCall(session.sessionId, { amount: '0.001', endpoint: '/api/data' });
const bill = billing.billSession(session.sessionId);
```

### 4. Enhanced Client SDK (`x402-client-sdk.js`)

**What it does:**
- High-level client library for interacting with x402-protected APIs
- Automatically handles the complete payment flow
- Supports EIP-712 signing and facilitator payments

**Key Features:**
- Automatic payment flow handling
- EIP-712 signing support
- Facilitator and on-chain payment support
- Automatic retry logic
- Payment caching for reuse
- Callback hooks for payment events

**Usage:**
```javascript
const { createX402Client } = require('./x402-client-sdk');
const { ethers } = require('ethers');

const wallet = new ethers.Wallet(privateKey);
const client = createX402Client({
  wallet,
  facilitator: 'coinbase',
  apiUrl: 'https://api.example.com'
});

// Automatically handles payment if needed
const data = await client.request('/api/premium-data');
```

### 5. XDC Blockchain Support

**What it does:**
- Adds support for XDC blockchain (XinFin Network)
- Includes both mainnet and Apothem testnet support
- USDC token addresses for XDC networks

**Changes:**
- Updated `blockchain-payment-service.js` with XDC RPC endpoints
- Added XDC USDC token addresses
- Updated chain validation to include XDC

## Integration Examples

### Example 1: Using EIP-712 Signing with Middleware

```javascript
const { x402Middleware } = require('./x402-middleware');
const { signPaymentAuthorization } = require('./eip712-signing');

// Server-side: Middleware automatically validates EIP-712 signatures
app.get('/api/premium', x402Middleware('premium-resource'), (req, res) => {
  res.json({ data: 'premium content' });
});
```

### Example 2: Client-Side Payment Flow

```javascript
const { createX402Client } = require('./x402-client-sdk');
const { ethers } = require('ethers');

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const client = createX402Client({
  wallet,
  facilitator: 'auto', // Automatically selects best facilitator
  onPaymentRequired: (paymentRequest) => {
    console.log(`Payment required: ${paymentRequest.amount} ${paymentRequest.currency}`);
  },
  onPaymentComplete: (proof, response) => {
    console.log(`Payment complete: ${proof.txHash}`);
  }
});

// Request automatically handles payment
const result = await client.request('/api/premium-data');
console.log(result.data);
```

### Example 3: Session-Based Billing

```javascript
const { createSessionBillingManager } = require('./session-billing');

const billing = createSessionBillingManager({
  sessionTimeout: 3600000, // 1 hour
  billingInterval: 300000, // Bill every 5 minutes
  minBillingAmount: '0.01',
  currency: 'USDC'
});

// Create session
const session = billing.createSession(payerAddress, {
  recipient: '0x...',
  chains: ['base']
});

// Record multiple API calls
for (let i = 0; i < 10; i++) {
  billing.recordCall(session.sessionId, {
    amount: '0.001',
    endpoint: `/api/data/${i}`
  });
}

// Bill session (or automatic if interval is set)
const bill = billing.billSession(session.sessionId);
console.log(`Total: ${bill.paymentRequest.amount} ${bill.paymentRequest.currency}`);
```

## Best Practices

1. **Always use EIP-712 signing** for better security and user experience
2. **Use facilitators for gasless payments** when possible (Coinbase CDP, Cloudflare)
3. **Implement session billing** for high-frequency API access
4. **Cache payment proofs** to avoid unnecessary re-payments
5. **Handle errors gracefully** with retry logic and user-friendly messages
6. **Validate payment timing** to prevent expired authorizations

## Migration Guide

### From Basic x402 to Enhanced Version

1. **Update middleware usage:**
   ```javascript
   // Old
   app.get('/api/data', x402Middleware('resource'), handler);
   
   // New (same, but now supports EIP-712 automatically)
   app.get('/api/data', x402Middleware('resource'), handler);
   ```

2. **Update client code:**
   ```javascript
   // Old: Manual payment flow
   const response = await axios.get('/api/data');
   if (response.status === 402) {
     // Manual payment handling...
   }
   
   // New: Automatic payment handling
   const client = createX402Client({ wallet });
   const result = await client.request('/api/data');
   ```

3. **Add EIP-712 signing:**
   ```javascript
   // Old: No signing or raw message signing
   
   // New: EIP-712 signing
   const signature = await signPaymentAuthorization(paymentRequest, wallet);
   ```

## Resources

- [x402 Protocol Specification](https://www.x402.org)
- [EIP-712 Standard](https://eips.ethereum.org/EIPS/eip-712)
- [Coinbase CDP Documentation](https://docs.cdp.coinbase.com/x402/welcome)
- [XDC Network Documentation](https://www.xdc.dev)

## Testing

All new features include error handling and can be tested with:

```bash
# Test EIP-712 signing
node -e "const { signPaymentAuthorization } = require('./eip712-signing'); ..."

# Test facilitator client
node -e "const { createFacilitatorClient } = require('./facilitator-client'); ..."

# Test session billing
node -e "const { createSessionBillingManager } = require('./session-billing'); ..."

# Test client SDK
node -e "const { createX402Client } = require('./x402-client-sdk'); ..."
```

## Future Enhancements

- [ ] Multi-chain payment aggregation
- [ ] Payment subscription support
- [ ] Refund handling
- [ ] Payment analytics and reporting
- [ ] Webhook support for payment events
- [ ] Rate limiting based on payment history

