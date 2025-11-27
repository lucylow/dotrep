# DotRep Monetization - Ethics & Privacy Guidelines

## Privacy Principles

### 1. Data Minimization

- **Never publish raw PII** to OriginTrail DKG
- Hash sensitive identifiers before publishing
- Store minimal metadata in Knowledge Assets
- Only include necessary fields in ReceiptAssets and ReputationAssets

### 2. User Consent

- Users must explicitly consent to reputation scoring
- Payment data is only published with user consent
- Users can opt-out of reputation computation
- Users can request deletion of their data

### 3. Transparency

- All reputation algorithms are open-source
- Users can query their own reputation data
- Payment receipts are publicly verifiable
- Sybil detection methods are documented

### 4. Anonymity Options

- Users can use pseudonymous identifiers
- Payment addresses don't need to link to real identity
- Reputation scores can be computed without identity disclosure

## Opt-Out Procedures

### For Users

1. **Reputation Opt-Out**: Contact support to exclude your creator ID from reputation computation
2. **Payment Receipt Opt-Out**: Set `publishReceipt: false` in payment request (if supported)
3. **Data Deletion**: Request deletion via support email

### For Creators

1. **Marketplace Listing Removal**: Remove offers via API or dashboard
2. **Reputation Score Removal**: Request removal of ReputationAsset from DKG
3. **Account Deletion**: Full account deletion removes all associated data

## Data Handling

### Payment Data

- Transaction hashes are public by design (blockchain)
- Payment amounts are stored in ReceiptAssets
- Recipient addresses are public
- Payer addresses are hashed if privacy is required

### Reputation Data

- Graph scores are computed from public interactions
- Stake weights use on-chain data (public)
- Payment weights aggregate from payment evidence
- Sybil penalties are applied transparently

### Knowledge Assets

- All KAs published to DKG are publicly queryable
- Content hashes ensure integrity
- Signatures provide authenticity
- Provenance tracks computation method

## Security Measures

### Rate Limiting

- Premium endpoints are rate-limited
- Prevents abuse and DoS attacks
- Configurable per API key

### Signature Verification

- All payment proofs require EIP-712 signatures
- Prevents replay attacks via nonces
- Expiry timestamps prevent stale requests

### Sybil Detection

- Detects dense clusters of low-stake nodes
- Applies penalties transparently
- Users can appeal Sybil penalties
- Detection algorithms are auditable

## Compliance

### GDPR

- Right to access: Users can query their data
- Right to deletion: Users can request data removal
- Data portability: Export reputation data as JSON
- Privacy by design: Minimal data collection

### CCPA

- Do not sell personal information
- Users can opt-out of data sharing
- Transparent data practices
- User rights respected

## Reporting Issues

If you discover privacy or security issues:

1. **Security**: security@dotrep.io (encrypted)
2. **Privacy**: privacy@dotrep.io
3. **Ethics**: ethics@dotrep.io

## Code of Conduct

- Respect user privacy
- Transparent algorithms
- Fair reputation scoring
- No discrimination
- Open source where possible

## Updates

This document is updated as needed. Last updated: 2025-11-26

