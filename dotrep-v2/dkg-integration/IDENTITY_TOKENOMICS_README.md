# Identity & Trust Tokenomics System

## Overview

The Identity & Trust Tokenomics system provides comprehensive Sybil resistance and identity verification for the DotRep platform. It combines multiple mechanisms to create a robust trust layer:

- **Proof-of-Personhood (PoP)**: Integration with Worldcoin, Humanity Protocol, and other PoP providers
- **Soulbound Tokens (SBTs)**: Non-transferable credentials stored on DKG
- **Economic Staking**: Require stake for account creation to raise Sybil attack costs
- **Token-Curated Registry (TCR)**: Community-driven verification with staking
- **On-Chain Behavior Analysis**: Detect Sybil accounts through transaction patterns

## Key Features

### 1. Account Creation with Staking

Require users to stake tokens upon account creation. This raises the economic cost of creating fake accounts:

```typescript
import { createIdentityTokenomicsService } from './identity-tokenomics';

const identityService = createIdentityTokenomicsService({
  accountCreation: {
    requireStake: true,
    minStakeAmount: BigInt(100) * BigInt(10 ** 18), // 100 tokens
    stakeLockPeriod: 30, // 30 days
    requirePoP: false, // Optional PoP requirement
    allowCommunityVouch: true
  }
});

// Create account with stake
const result = await identityService.createAccount(
  'did:polkadot:alice',
  '0x1234...',
  {
    stakeAmount: BigInt(100) * BigInt(10 ** 18)
  }
);
```

### 2. Proof-of-Personhood (PoP) Integration

Verify unique humanness using biometric or social verification:

```typescript
// Verify Worldcoin proof
const popResult = await identityService.verifyPoP(
  'worldcoin-proof-xyz',
  PoPProvider.WORLDCOIN
);

if (popResult.verified) {
  // Issue PoP credential
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

**Supported PoP Providers:**
- **Worldcoin**: Hardware Orb verification (strongest Sybil resistance)
- **Humanity Protocol**: Palm recognition (less invasive)
- **BrightID**: Social graph verification
- **Civic**: Government ID verification
- **Custom**: Custom verification methods

### 3. Soulbound Tokens (SBTs)

Issue non-transferable credentials that prove identity and achievements:

```typescript
// Issue verified account credential
const credential = await identityService.issueSBTCredential(
  'did:polkadot:alice',
  CredentialType.VERIFIED_ACCOUNT,
  {
    stakeAmount: BigInt(100) * BigInt(10 ** 18),
    issuedBy: 'did:dotrep:issuer'
  }
);

// Credential is automatically published to DKG
console.log(`Credential UAL: ${credential.dkgUAL}`);

// Verify credential
const verification = await identityService.verifyCredential(
  'did:polkadot:alice',
  CredentialType.VERIFIED_ACCOUNT
);
```

**Credential Types:**
- `PROOF_OF_HUMANITY`: Verified human via PoP
- `VERIFIED_ACCOUNT`: Account with stake/PoP verification
- `COMMUNITY_ENDORSED`: Endorsed by community via TCR
- `STAKE_VERIFIED`: Verified through staking
- `BEHAVIOR_VERIFIED`: Verified through on-chain behavior
- `PREMIUM_MEMBER`: Premium membership credential

### 4. Token-Curated Registry (TCR)

Community-driven verification where existing users stake tokens to vouch for new applicants:

```typescript
// Endorse a new applicant
const endorseResult = await identityService.tcrEndorse(
  'did:polkadot:newuser', // Applicant
  'did:polkadot:trusteduser', // Endorser
  BigInt(1000) * BigInt(10 ** 18) // Stake amount
);

// Challenge an entry (if suspicious)
const challengeResult = await identityService.tcrChallenge(
  'did:polkadot:suspicioususer',
  'did:polkadot:challenger',
  BigInt(500) * BigInt(10 ** 18),
  'Suspected Sybil account'
);
```

**TCR Mechanism:**
- Endorsers stake tokens to vouch for applicants
- Challengers can stake tokens to dispute entries
- If challenge succeeds, endorsers lose their stake (slashing)
- Aligns economic incentives with honest verification

### 5. On-Chain Behavior Analysis

Analyze transaction patterns to detect Sybil accounts:

```typescript
// Analyze account behavior
const analysis = await identityService.analyzeBehavior(
  '0x1234...', // Wallet address
  1 // Chain ID (optional)
);

console.log(`Sybil Risk Score: ${analysis.sybilRiskScore} (0-100, lower is better)`);
console.log(`Trust Signals: ${analysis.trustSignals.join(', ')}`);
console.log(`Risk Signals: ${analysis.riskSignals.join(', ')}`);
```

**Behavior Signals:**
- **High Diversity**: Account interacts with many unique addresses (good)
- **Long Account Age**: Account has existed for a long time (good)
- **Multiple Token Holdings**: Account holds various tokens (good)
- **Low Diversity**: All activity with single cluster (risk)
- **Zero External Interactions**: No interactions outside cluster (risk)

### 6. Comprehensive Trust Score

Calculate a multi-dimensional trust score combining all signals:

```typescript
const trustScore = await identityService.getTrustScore(
  'did:polkadot:alice',
  '0x1234...' // Optional wallet address
);

console.log(`Trust Score: ${trustScore.trustScore}/1000`);
console.log(`Components:`);
console.log(`  - Stake Score: ${trustScore.components.stakeScore}`);
console.log(`  - PoP Score: ${trustScore.components.popScore}`);
console.log(`  - Credential Score: ${trustScore.components.credentialScore}`);
console.log(`  - Behavior Score: ${trustScore.components.behaviorScore}`);
console.log(`  - Community Score: ${trustScore.components.communityScore}`);
```

**Trust Score Components:**
- **Stake Score (0-200)**: Based on staking tier and amount
- **PoP Score (0-200)**: Proof-of-Personhood verification
- **Credential Score (0-150)**: Verified credentials held
- **Behavior Score (0-200)**: On-chain behavior analysis
- **Community Score (0-250)**: TCR endorsements and community trust

**Total: 0-1000 points**

## API Endpoints

### Account Creation

```typescript
// tRPC endpoint: trust.createAccount
{
  userDID: string;
  walletAddress: string;
  stakeAmount?: string; // BigInt as string
  popProof?: string;
  popProvider?: 'worldcoin' | 'humanity' | 'brightid' | 'civic' | 'custom';
  vouchedBy?: string[]; // DIDs of vouchers
}
```

### PoP Verification

```typescript
// tRPC endpoint: trust.verifyPoP
{
  proof: string;
  provider: 'worldcoin' | 'humanity' | 'brightid' | 'civic' | 'custom';
}
```

### Credential Management

```typescript
// Issue credential: trust.issueCredential
{
  recipientDID: string;
  credentialType: 'proof_of_humanity' | 'verified_account' | 'community_endorsed' | ...;
  metadata?: Record<string, any>;
}

// Verify credential: trust.verifyCredential
{
  userDID: string;
  credentialType: 'proof_of_humanity' | 'verified_account' | ...;
}
```

### Token-Curated Registry

```typescript
// Endorse: trust.tcrEndorse
{
  applicantDID: string;
  endorserDID: string;
  stakeAmount: string; // BigInt as string
}

// Challenge: trust.tcrChallenge
{
  applicantDID: string;
  challengerDID: string;
  stakeAmount: string;
  reason?: string;
}
```

### Behavior Analysis

```typescript
// trust.analyzeBehavior
{
  accountAddress: string;
  chainId?: number;
}
```

### Trust Score

```typescript
// trust.getIdentityTrustScore
{
  userDID: string;
  walletAddress?: string;
}
```

## Configuration

```typescript
const config: IdentityTokenomicsConfig = {
  // DKG integration
  dkgClient: dkgClient,
  dkgConfig: dkgConfig,
  
  // Account creation requirements
  accountCreation: {
    requireStake: true,
    minStakeAmount: BigInt(100) * BigInt(10 ** 18), // 100 tokens
    stakeTokenAddress: '0x...', // Token contract address
    stakeLockPeriod: 30, // Days
    requirePoP: false, // Optional
    allowCommunityVouch: true
  },
  
  // SBT configuration
  sbtIssuerDID: 'did:key:dotrep-issuer',
  sbtContractAddress: '0x...', // SBT contract address
  
  // PoP providers
  popProviders: {
    [PoPProvider.WORLDCOIN]: {
      enabled: true,
      apiKey: process.env.WORLDCOIN_API_KEY,
      verificationThreshold: 80
    },
    [PoPProvider.HUMANITY_PROTOCOL]: {
      enabled: true,
      endpoint: 'https://api.humanityprotocol.org',
      verificationThreshold: 75
    }
  },
  
  // TCR configuration
  tcrConfig: {
    minStakeToEndorse: BigInt(1000) * BigInt(10 ** 18), // 1000 tokens
    minStakeToChallenge: BigInt(500) * BigInt(10 ** 18), // 500 tokens
    challengePeriod: 7, // Days
    votingPeriod: 3, // Days
    slashPercentage: 10 // 10% slash for wrong endorsement
  },
  
  // Behavior analysis
  behaviorAnalysis: {
    enabled: true,
    minTransactions: 5,
    minUniqueInteractions: 3,
    rpcEndpoints: {
      1: 'https://eth-mainnet.g.alchemy.com/v2/...',
      137: 'https://polygon-mainnet.g.alchemy.com/v2/...'
    }
  },
  
  // Token verification integration
  tokenVerification: tokenVerificationService,
  
  // Mock mode (for testing)
  useMockMode: process.env.IDENTITY_TOKENOMICS_MOCK === 'true'
};
```

## Integration with DKG

All credentials are stored as Verifiable Credentials on the OriginTrail DKG:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "dotrep": "https://dotrep.io/ontology/",
    "cred": "https://www.w3.org/2018/credentials/v1"
  },
  "@type": "cred:VerifiableCredential",
  "cred:credentialSubject": {
    "@id": "did:polkadot:alice",
    "cred:type": "verified_account"
  },
  "cred:issuer": {
    "@id": "did:key:dotrep-issuer"
  },
  "dotrep:nonTransferable": true,
  "cred:proof": {
    "@type": "Ed25519Signature2020",
    "created": "2025-01-01T00:00:00Z",
    "proofPurpose": "assertionMethod"
  }
}
```

## Sybil Attack Resistance

The system provides multiple layers of Sybil resistance:

1. **Economic Barrier**: Staking requirement makes Sybil attacks costly
2. **PoP Verification**: Biometric/social verification ensures unique humanness
3. **Community Curation**: TCR aligns incentives for honest verification
4. **Behavior Analysis**: Detects suspicious patterns in transaction history
5. **Credential System**: SBTs provide persistent, verifiable identity

## Best Practices

1. **Start with Staking**: Require minimum stake for all accounts
2. **Gradual Verification**: Allow accounts to upgrade with PoP/TCR over time
3. **Community Governance**: Let community decide on TCR parameters
4. **Regular Audits**: Periodically review and update behavior analysis thresholds
5. **Privacy**: Use zero-knowledge proofs where possible (World ID, Humanity Protocol)

## Future Enhancements

- [ ] Full Worldcoin World ID integration
- [ ] Humanity Protocol palm recognition
- [ ] BrightID social graph verification
- [ ] Advanced behavior analysis with ML
- [ ] Cross-chain behavior aggregation
- [ ] Reputation-weighted TCR voting
- [ ] Automated Sybil detection alerts

## License

MIT

