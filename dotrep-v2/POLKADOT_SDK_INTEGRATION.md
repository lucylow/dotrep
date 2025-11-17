# Polkadot SDK Integration Guide

This document describes the complete Polkadot SDK integration in DotRep v2, demonstrating thorough usage of Polkadot technology stack.

## Overview

DotRep v2 leverages the Polkadot SDK to build a decentralized reputation system with:

- **FRAME Pallets**: Custom runtime logic for reputation, identity, governance, and NFTs
- **XCM (Cross-Consensus Messaging)**: Cross-chain reputation queries
- **On-Chain Storage**: Transparent and immutable reputation data
- **Governance**: Community-driven parameter updates
- **Soulbound NFTs**: Non-transferable achievement tokens

## Architecture

### Core Components

1. **Reputation Pallet** (`pallet_reputation`)
   - Tracks contributions and calculates reputation scores
   - Supports multiple contribution types with weighted scoring
   - Implements time decay and sybil resistance
   - Off-chain worker integration for external data fetching

2. **Identity Pallet** (`pallet_identity`)
   - Links multiple external accounts (GitHub, GitLab, etc.)
   - Verifies account ownership
   - Manages decentralized identity

3. **XCM Gateway Pallet** (`pallet_xcm_gateway`)
   - Handles cross-chain reputation queries
   - Manages supported chains and configurations
   - Processes XCM messages and responses

4. **Governance Pallet** (`pallet_governance`)
   - On-chain proposal system
   - Voting mechanisms
   - Parameter updates

5. **NFT Pallet** (`pallet_nft`)
   - Soulbound achievement tokens
   - Achievement types and criteria
   - Metadata storage

## Frontend Integration

### New Pages

#### 1. Governance Page (`/governance`)
- View active proposals
- Vote on proposals
- Create new proposals
- View proposal history

#### 2. XCM Gateway Page (`/xcm-gateway`)
- Query reputation across chains
- View supported chains
- Monitor cross-chain queries
- View query history

#### 3. Identity Page (`/identity`)
- Link external accounts
- Manage identity settings
- View linked accounts
- Configure privacy settings

#### 4. NFT Gallery Page (`/nft-gallery`)
- View all achievement NFTs
- Filter by rarity
- View NFT details
- Track achievement progress

#### 5. Analytics Page (`/analytics`)
- Contribution statistics
- Reputation growth charts
- Performance metrics
- Contribution breakdown

## Backend Integration

### Polkadot.js API Service

The `PolkadotApiService` class provides a clean interface to interact with the DotRep parachain:

```typescript
import { getPolkadotApi } from "./_core/polkadotApi";

const api = getPolkadotApi();
await api.connect();

// Get reputation
const reputation = await api.getReputation(accountId);

// Initiate XCM query
const queryId = await api.initiateXcmQuery(signer, targetChain, targetAccount);

// Get governance proposals
const proposals = await api.getProposals();

// Get NFTs
const nfts = await api.getNfts(accountId);
```

### tRPC Routers

New tRPC routers for Polkadot SDK integration:

- `polkadot.reputation.*` - Reputation queries
- `polkadot.xcm.*` - Cross-chain operations
- `polkadot.governance.*` - Governance operations
- `polkadot.nft.*` - NFT operations
- `polkadot.chain.*` - Chain information

## Configuration

### Environment Variables

```bash
# Polkadot WebSocket endpoint
POLKADOT_WS_ENDPOINT=wss://rpc.polkadot.io

# For local development
POLKADOT_WS_ENDPOINT=ws://127.0.0.1:9944
```

### Deployment Configuration

See `config/create.remote.sample-dotrep-cloud.json` for complete Polkadot Cloud deployment configuration.

Key settings:
- Polkadot node endpoints
- XCM configuration
- Governance parameters
- Chain-specific settings

## Usage Examples

### Query Reputation

```typescript
// Frontend
const { data } = await trpc.polkadot.reputation.get.query({
  accountId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
});

console.log(data.overall); // Reputation score
console.log(data.percentile); // Percentile rank
```

### Initiate Cross-Chain Query

```typescript
// Frontend
const queryId = await trpc.polkadot.xcm.initiateQuery.mutate({
  signer: accountId,
  targetChain: "polkadot",
  targetAccount: targetAccountId
});
```

### Get Governance Proposals

```typescript
// Frontend
const proposals = await trpc.polkadot.governance.getProposals.query();

proposals.forEach(proposal => {
  console.log(proposal.title);
  console.log(`Votes: ${proposal.votesFor} for, ${proposal.votesAgainst} against`);
});
```

## Testing

### Local Development

1. Start local Polkadot node:
```bash
polkadot --dev --ws-external --rpc-external
```

2. Set environment variable:
```bash
export POLKADOT_WS_ENDPOINT=ws://127.0.0.1:9944
```

3. Run development server:
```bash
cd dotrep-v2
pnpm dev
```

### Integration Testing

The Polkadot API service includes error handling and fallbacks for development. In production, ensure:

1. Valid WebSocket endpoint
2. Correct chain types configured
3. Proper error handling for network issues
4. Connection pooling for multiple requests

## Production Deployment

### Polkadot Cloud Deployment

1. Configure deployment file:
```bash
cp config/create.remote.sample-dotrep-cloud.json config/my-deployment.json
# Edit with your project details
```

2. Set environment variables:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
export CLOUDFLARE_EMAIL=your-email@example.com
export CLOUDFLARE_API_KEY=your-api-key
```

3. Deploy:
```bash
node . create --config config/my-deployment.json --verbose
```

### Health Checks

The deployment includes health check endpoints:
- `/health` - Liveness probe
- `/ready` - Readiness probe (checks Polkadot connection)

### Monitoring

Enable monitoring in deployment config:
```json
{
  "monitoring": {
    "enabled": true
  }
}
```

This deploys:
- Prometheus for metrics
- Grafana for dashboards
- Substrate telemetry

## Best Practices

1. **Connection Management**: Use singleton pattern for API connections
2. **Error Handling**: Always handle connection failures gracefully
3. **Type Safety**: Use TypeScript types for all Polkadot interactions
4. **Caching**: Cache chain state queries when appropriate
5. **Rate Limiting**: Implement rate limiting for public endpoints

## Troubleshooting

### Connection Issues

If you see connection errors:
1. Verify WebSocket endpoint is accessible
2. Check firewall rules
3. Verify node is running and accepting connections
4. Check network connectivity

### Type Errors

If you see type errors:
1. Ensure custom types are properly configured
2. Check runtime metadata matches
3. Verify API version compatibility

### XCM Query Failures

If XCM queries fail:
1. Verify target chain is supported
2. Check XCM configuration
3. Ensure sufficient balance for fees
4. Check chain connectivity

## Resources

- [Polkadot SDK Documentation](https://docs.substrate.io/)
- [Polkadot.js API Documentation](https://polkadot.js.org/docs/)
- [XCM Documentation](https://wiki.polkadot.network/docs/xcm-overview)
- [FRAME Documentation](https://docs.substrate.io/reference/frame-pallets/)

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review Polkadot SDK documentation
3. Open an issue on GitHub
4. Join the DotRep community


