# Token-Based Verification Service

## Overview

The Token-Based Verification Service provides cryptographic, blockchain-native verification and gating for the DotRep reputation system. It enables:

- **Token ownership verification** (ERC-20, ERC-721, SBT)
- **Action gating** based on token requirements
- **Reputation boosts** for token-holders
- **On-chain proof generation** (verifiable without centralized databases)
- **DKG integration** for publishing verification proofs
- **Graph algorithm enhancement** with token-weighted edges

## Key Features

### 1. Token Verification

Verify token ownership or balance for any wallet:

```typescript
import { createTokenVerificationService, TokenType } from './token-verification-service';

const tokenVerification = createTokenVerificationService({
  useMockMode: true, // For testing
  publishProofsToDKG: true
});

// Verify ERC-20 balance
const result = await tokenVerification.verifyToken(
  '0x1234...',
  {
    tokenType: TokenType.ERC20,
    tokenAddress: '0x...',
    minBalance: BigInt(100) * BigInt(10 ** 18), // 100 tokens
    description: 'Minimum stake requirement'
  }
);

console.log(`Verified: ${result.verified}`);
console.log(`Balance: ${result.balance}`);
```

### 2. Action Gating

Gate actions based on token requirements:

```typescript
// Check if user can perform an action
const accessCheck = await tokenVerification.checkActionAccess(
  '0x1234...',
  GatedAction.PUBLISH_ENDORSEMENT
);

if (accessCheck.allowed) {
  console.log('User can publish endorsement');
} else {
  console.log(`Blocked: ${accessCheck.reason}`);
}
```

### 3. Reputation Boost

Token-holders receive reputation boosts:

```typescript
const boost = await tokenVerification.getReputationBoost(
  '0x1234...',
  GatedAction.PUBLISH_ENDORSEMENT
);

console.log(`Reputation boost: +${boost}%`);
```

### 4. DKG Integration

Token verification is integrated into the DKG client:

```typescript
import { createDKGClientV8 } from './dkg-client-v8';

const dkgClient = createDKGClientV8({
  enableTokenGating: true,
  tokenVerification: {
    useMockMode: true,
    publishProofsToDKG: true
  }
});

// Publishing requires token verification
const result = await dkgClient.publishReputationAsset(
  {
    developerId: 'alice',
    reputationScore: 850,
    contributions: [],
    timestamp: Date.now(),
    metadata: {}
  },
  2,
  {
    walletAddress: '0x1234...' // Required for token verification
  }
);
```

### 5. Graph Algorithm Enhancement

Token-backed edges are weighted higher in reputation calculations:

```typescript
import { createGraphReputationService } from './graph-reputation-service';

const graphService = createGraphReputationService(dkgClient);

// Edges from token-holders are automatically weighted higher
const result = await graphService.computeReputation(
  { nodes, edges },
  {
    useTemporalPageRank: true,
    computeHybridScore: true
  }
);
```

## Action Gating Policies

Default policies are configured for common actions:

### Verified Creator Endorsements
- **Action**: `CREATE_VERIFIED_ENDORSEMENT`
- **Requirement**: Must own Verified Creator NFT (ERC-721)
- **Reputation Boost**: +20%
- **Stake Weight**: 1.3x

### Publishing Endorsements
- **Action**: `PUBLISH_ENDORSEMENT`
- **Requirement**: Minimum 100 stake tokens (ERC-20)
- **Reputation Boost**: +10%
- **Stake Weight**: 1.2x

### Voting
- **Action**: `VOTE`
- **Requirement**: Minimum 1 governance token (ERC-20)
- **Reputation Boost**: +5%

### Premium Access
- **Action**: `ACCESS_PREMIUM`
- **Requirement**: Premium NFT OR 1000+ stake tokens
- **Reputation Boost**: +15%

## Custom Policies

You can define custom action gating policies:

```typescript
tokenVerification.setActionPolicy({
  action: GatedAction.CUSTOM_ACTION,
  requirements: [
    {
      tokenType: TokenType.ERC20,
      tokenAddress: '0x...',
      minBalance: BigInt(50) * BigInt(10 ** 18),
      description: 'Custom requirement'
    }
  ],
  description: 'Custom action policy',
  reputationBoost: 15,
  stakeWeight: 1.25
});
```

## Token Types Supported

- **ERC-20**: Fungible tokens (e.g., TRAC, stake tokens)
- **ERC-721**: Non-fungible tokens (e.g., Verified Creator NFT)
- **ERC-1155**: Multi-token standard
- **SBT**: Soul-bound tokens (non-transferable credentials)
- **NATIVE**: Native blockchain tokens (e.g., NEURO, DOT)

## Benefits

### Sybil Resistance
Requiring tokens to perform actions raises the cost for attackers attempting to flood the system with fake accounts.

### Economic Alignment
Token-holders have "skin in the game," ensuring reputation and endorsements come from economically committed participants.

### Verifiable Credentials
Token ownership is verifiable on-chain without relying on centralized identity databases.

### Transparent Reputation
Token-backed actions are weighted higher in reputation algorithms, providing transparent trust signals.

### On-Chain Proof
All verification proofs can be published to the DKG, creating an auditable trail of token-backed actions.

## Configuration

```typescript
const tokenVerification = createTokenVerificationService({
  // RPC endpoints for different chains
  rpcEndpoints: {
    1: 'https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY',
    137: 'https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY',
    20430: 'https://otp-testnet.origin-trail.network'
  },
  
  // Default chain ID
  defaultChainId: 20430,
  
  // Enable mock mode for testing
  useMockMode: false,
  
  // DKG integration
  dkgClient: dkgClient,
  publishProofsToDKG: true,
  
  // Cache settings
  cacheEnabled: true,
  cacheTTL: 60000 // 1 minute
});
```

## Environment Variables

```bash
# Token addresses
VERIFIED_CREATOR_NFT_ADDRESS=0x...
STAKE_TOKEN_ADDRESS=0x...
GOVERNANCE_TOKEN_ADDRESS=0x...
PREMIUM_NFT_ADDRESS=0x...

# Token verification
TOKEN_VERIFICATION_MOCK=true  # Use mock mode
```

## Demo

See `examples/token-verification-demo.ts` for a complete demonstration of all features.

Run with:
```bash
ts-node examples/token-verification-demo.ts
```

## Integration Points

1. **DKG Client**: Token-gated publishing
2. **Graph Algorithms**: Token-weighted edge enhancement
3. **Reputation Service**: Token-based reputation boosts
4. **Access Control**: Token verification for premium access

## Security Considerations

- **Token Transferability**: Consider using soul-bound tokens (SBT) for credentials to prevent gaming
- **Capital Bias**: Token-based gating can create wealth inequality; balance with reputation-based access
- **Regulatory Compliance**: Token sales/trading may be subject to securities regulations
- **Usability**: Requiring wallets/tokens can create UX barriers for non-crypto users

## Future Enhancements

- [ ] Support for multi-chain token verification
- [ ] DID-based token binding for identity verification
- [ ] Dynamic policy updates via governance
- [ ] Token staking/locking mechanisms
- [ ] Integration with decentralized identity (DID) standards

