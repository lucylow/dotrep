# Identity & Trust Tokenomics Implementation Summary

## Overview

This document summarizes the implementation of comprehensive tokenomics for identity and trust in the DotRep Social Graph Reputation system. The implementation provides multiple layers of Sybil resistance and trust signals through economic mechanisms, verifiable credentials, and community curation.

## Implementation Date

January 2025

## Components Implemented

### 1. Identity Tokenomics Service (`identity-tokenomics.ts`)

**Location**: `dotrep-v2/dkg-integration/identity-tokenomics.ts`

**Features**:
- ✅ Account creation with staking requirements
- ✅ Proof-of-Personhood (PoP) verification framework
- ✅ Soulbound Token (SBT) credential issuance and verification
- ✅ Token-Curated Registry (TCR) for community verification
- ✅ On-chain behavior analysis for Sybil detection
- ✅ Comprehensive trust score calculation
- ✅ DKG integration for storing verifiable credentials

**Key Classes**:
- `IdentityTokenomicsService`: Main service class
- `PoPProvider`: Enum for PoP providers (Worldcoin, Humanity Protocol, etc.)
- `CredentialType`: Enum for credential types
- `SBTCredential`: Interface for SBT credentials
- `TCREntry`: Interface for TCR entries
- `BehaviorAnalysis`: Interface for behavior analysis results

### 2. API Integration (`routers.ts`)

**Location**: `dotrep-v2/server/routers.ts`

**New Endpoints Added**:
- `trust.createAccount`: Create account with identity verification
- `trust.verifyPoP`: Verify Proof-of-Personhood
- `trust.issueCredential`: Issue SBT credential
- `trust.verifyCredential`: Verify credential
- `trust.tcrEndorse`: Endorse applicant via TCR
- `trust.tcrChallenge`: Challenge TCR entry
- `trust.analyzeBehavior`: Analyze on-chain behavior
- `trust.getIdentityTrustScore`: Get comprehensive trust score
- `trust.getUserCredentials`: Get all user credentials

### 3. DKG Client Integration

**Location**: `dotrep-v2/dkg-integration/dkg-client-v8.ts`

**New Method**:
- `getIdentityTokenomicsService()`: Factory method to get identity tokenomics service instance

## Mechanisms Implemented

### 1. Economic Staking for Account Creation

**Purpose**: Raise the cost of creating fake accounts

**Implementation**:
- Require minimum stake (default: 100 tokens) upon account creation
- Stake is locked for a period (default: 30 days)
- Stake can be slashed if account is proven fraudulent
- Integrates with existing staking system

**Configuration**:
```typescript
accountCreation: {
  requireStake: true,
  minStakeAmount: BigInt(100) * BigInt(10 ** 18),
  stakeLockPeriod: 30,
  requirePoP: false,
  allowCommunityVouch: true
}
```

### 2. Proof-of-Personhood (PoP) Integration

**Purpose**: Verify unique humanness

**Supported Providers**:
- Worldcoin (World ID) - Hardware Orb verification
- Humanity Protocol - Palm recognition
- BrightID - Social graph verification
- Civic - Government ID verification
- Custom - Custom verification methods

**Implementation**:
- Framework for PoP verification
- Integration points for external PoP providers
- ZK proof support (for privacy-preserving verification)
- Credential issuance upon successful verification

**Status**: Framework implemented, provider integrations pending

### 3. Soulbound Tokens (SBTs)

**Purpose**: Non-transferable credentials proving identity and achievements

**Credential Types**:
- `PROOF_OF_HUMANITY`: Verified human via PoP
- `VERIFIED_ACCOUNT`: Account with stake/PoP verification
- `COMMUNITY_ENDORSED`: Endorsed by community via TCR
- `STAKE_VERIFIED`: Verified through staking
- `BEHAVIOR_VERIFIED`: Verified through on-chain behavior
- `PREMIUM_MEMBER`: Premium membership credential

**Implementation**:
- Credentials stored as Verifiable Credentials on DKG
- Non-transferable by design
- Includes metadata (PoP proof, stake amount, endorsers, etc.)
- Queryable via DKG SPARQL

**DKG Storage**:
- Credentials published as JSON-LD Knowledge Assets
- Follows W3C Verifiable Credentials standard
- Includes cryptographic signatures
- UAL (Uniform Asset Locator) for retrieval

### 4. Token-Curated Registry (TCR)

**Purpose**: Community-driven verification with economic incentives

**Mechanism**:
- Existing trusted users stake tokens to vouch for new applicants
- Challengers can stake tokens to dispute entries
- If challenge succeeds, endorsers lose their stake (slashing)
- Aligns economic incentives with honest verification

**Configuration**:
```typescript
tcrConfig: {
  minStakeToEndorse: BigInt(1000) * BigInt(10 ** 18), // 1000 tokens
  minStakeToChallenge: BigInt(500) * BigInt(10 ** 18), // 500 tokens
  challengePeriod: 7, // Days
  votingPeriod: 3, // Days
  slashPercentage: 10 // 10% slash for wrong endorsement
}
```

**Status**: Basic TCR implemented, voting mechanism can be enhanced

### 5. On-Chain Behavior Analysis

**Purpose**: Detect Sybil accounts through transaction patterns

**Signals Analyzed**:
- Total transactions
- Unique interactions (number of unique addresses)
- Transaction diversity (0-1 score)
- Account age
- Token holdings
- Sybil risk score (0-100, lower is better)

**Trust Signals**:
- High transaction diversity
- Long account age
- Multiple token holdings
- Diverse interaction patterns

**Risk Signals**:
- Low transaction diversity
- Zero external interactions
- All activity with single cluster
- Suspicious patterns

**Status**: Framework implemented, blockchain RPC integration pending

### 6. Comprehensive Trust Score

**Purpose**: Quantify trustworthiness through multiple dimensions

**Components** (Total: 0-1000 points):
- **Stake Score (0-200)**: Based on staking tier and amount
- **PoP Score (0-200)**: Proof-of-Personhood verification
- **Credential Score (0-150)**: Verified credentials held
- **Behavior Score (0-200)**: On-chain behavior analysis
- **Community Score (0-250)**: TCR endorsements and community trust

**Usage**:
```typescript
const trustScore = await identityService.getTrustScore(
  userDID,
  walletAddress
);
// Returns: { trustScore: 750, components: {...}, credentials: [...], ... }
```

## Integration Points

### With Existing Systems

1. **Staking System**: Uses existing `SybilResistantStaking` for stake management
2. **Token Verification**: Integrates with `TokenVerificationService` for token checks
3. **DKG Client**: Uses `DKGClientV8` for storing credentials
4. **Trust Layer**: Complements existing trust layer with identity verification

### DKG Storage

All credentials are stored as Verifiable Credentials on the OriginTrail DKG:
- JSON-LD format following W3C standards
- Cryptographic signatures for authenticity
- Queryable via SPARQL
- Immutable and tamper-proof

## Usage Examples

### Create Account with Stake

```typescript
const result = await identityService.createAccount(
  'did:polkadot:alice',
  '0x1234...',
  {
    stakeAmount: BigInt(100) * BigInt(10 ** 18)
  }
);
```

### Issue PoP Credential

```typescript
const popResult = await identityService.verifyPoP(
  'worldcoin-proof-xyz',
  PoPProvider.WORLDCOIN
);

if (popResult.verified) {
  await identityService.issueSBTCredential(
    userDID,
    CredentialType.PROOF_OF_HUMANITY,
    {
      popProvider: PoPProvider.WORLDCOIN,
      popProof: 'worldcoin-proof-xyz'
    }
  );
}
```

### Community Endorsement via TCR

```typescript
await identityService.tcrEndorse(
  'did:polkadot:newuser',
  'did:polkadot:trusteduser',
  BigInt(1000) * BigInt(10 ** 18)
);
```

### Get Trust Score

```typescript
const trustScore = await identityService.getTrustScore(
  'did:polkadot:alice',
  '0x1234...'
);
```

## Configuration

### Environment Variables

```bash
# Enable mock mode for testing
IDENTITY_TOKENOMICS_MOCK=true

# PoP Provider API Keys
WORLDCOIN_API_KEY=...
HUMANITY_PROTOCOL_API_KEY=...

# DKG Configuration
DKG_USE_MOCK=true
DKG_ENVIRONMENT=testnet
```

### Service Configuration

See `IDENTITY_TOKENOMICS_README.md` for full configuration options.

## Future Enhancements

1. **Full PoP Provider Integration**:
   - [ ] Worldcoin World ID integration
   - [ ] Humanity Protocol palm recognition
   - [ ] BrightID social graph verification

2. **Advanced Behavior Analysis**:
   - [ ] Machine learning for pattern detection
   - [ ] Cross-chain behavior aggregation
   - [ ] Real-time monitoring and alerts

3. **TCR Enhancements**:
   - [ ] Reputation-weighted voting
   - [ ] Automated challenge resolution
   - [ ] Governance token integration

4. **Privacy Enhancements**:
   - [ ] Zero-knowledge proofs for PoP
   - [ ] Private credential verification
   - [ ] Selective disclosure

## Testing

The system includes mock mode for testing:

```typescript
const identityService = createIdentityTokenomicsService({
  useMockMode: true,
  // ... other config
});
```

## Documentation

- **Main README**: `IDENTITY_TOKENOMICS_README.md`
- **Implementation Summary**: This document
- **API Documentation**: See `routers.ts` for endpoint definitions

## Security Considerations

1. **Stake Slashing**: Wrong endorsements result in stake loss
2. **Credential Verification**: All credentials cryptographically signed
3. **DKG Immutability**: Credentials stored on immutable DKG
4. **Privacy**: PoP providers use ZK proofs where possible
5. **Sybil Resistance**: Multiple layers of verification

## Performance

- **Caching**: Behavior analysis results cached
- **Batch Operations**: Support for batch credential issuance
- **Async Operations**: All DKG operations are async
- **Mock Mode**: Fast testing without blockchain calls

## License

MIT

