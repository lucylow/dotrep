# Polkadot Cloud Integration Guide

This document describes the cloud features integrated into the DotRep project.

## Overview

The DotRep project now includes comprehensive cloud integration for:
- Contribution verification via cloud workers
- IPFS storage with cloud backup
- Real-time notifications
- Serverless reputation calculation
- Edge computing for performance
- Cloud monitoring and analytics

## Architecture

### Cloud Services

1. **Cloud Verification Service** (`server/_core/cloudVerification.ts`)
   - Verifies contributions via cloud workers
   - Supports batch verification
   - Caches verification results

2. **Cloud Storage Service** (`server/_core/cloudStorage.ts`)
   - Pins proofs to IPFS via Pinata
   - Backs up to cloud storage
   - Retrieves proofs with fallback

3. **Reputation Calculator** (`server/_core/reputationCalculator.ts`)
   - Serverless reputation calculation
   - Time-decay algorithm
   - Percentile and ranking

4. **Cloud Monitoring** (`server/_core/cloudMonitoring.ts`)
   - Event tracking
   - Analytics reports
   - Performance metrics

### Frontend Components

1. **Cloud Notification Bell** (`client/src/components/cloud/CloudNotificationBell.tsx`)
   - Real-time notifications
   - Browser notifications
   - Mark as read functionality

2. **Real-time Reputation** (`client/src/components/cloud/RealTimeReputation.tsx`)
   - Live reputation updates
   - Trend indicators
   - Score changes

3. **Polkadot Cloud Integration** (`client/src/components/cloud/PolkadotCloudIntegration.tsx`)
   - Enhanced account cards
   - Cloud dashboard header
   - Cloud metrics display

### Hooks

- **useCloudNotifications** (`client/src/hooks/useCloudNotifications.ts`)
  - Real-time notification subscription
  - Notification management
  - Permission handling

## API Endpoints

### Cloud Verification

```typescript
// Verify a contribution
trpc.cloud.verification.verify.mutate({
  contributionId: string,
  proof: string,
  type: 'github' | 'gitlab' | 'direct',
  metadata?: Record<string, any>
})

// Batch verify
trpc.cloud.verification.batchVerify.mutate({
  verifications: [...]
})

// Get status
trpc.cloud.verification.getStatus.query({
  contributionId: string
})
```

### Cloud Storage

```typescript
// Store proof
trpc.cloud.storage.storeProof.mutate({
  contributionId: string,
  proof: any,
  metadata?: Record<string, any>
})

// Retrieve proof
trpc.cloud.storage.retrieveProof.query({
  ipfsHash: string
})
```

### Reputation Calculation

```typescript
// Calculate reputation
trpc.cloud.reputation.calculate.mutate({
  contributions: Contribution[],
  algorithmWeights?: Record<string, number>,
  timeDecayFactor?: number,
  userId: string
})
```

### Monitoring

```typescript
// Track event
trpc.cloud.monitoring.trackEvent.mutate({
  type: 'reputation_update' | 'contribution_verified' | 'governance_proposal' | 'nft_minted',
  userId: string,
  score?: number,
  metadata?: Record<string, any>
})

// Generate report
trpc.cloud.monitoring.generateReport.query({
  userId: string
})
```

## Deployment

### Docker Compose

Deploy the full cloud stack using:

```bash
docker-compose -f docker-compose.cloud.yml up -d
```

This includes:
- API server (3 replicas)
- Verification workers (5 replicas)
- Redis cache
- MySQL database
- Grafana monitoring

### Cloudflare Workers (Edge Computing)

Deploy the edge worker for caching:

```bash
npm install -g wrangler
wrangler publish
```

Configure in `wrangler.toml`:
- KV namespace binding
- Routes
- Environment variables

## Environment Variables

See `.env.example` for all required environment variables:

- `CLOUD_API_KEY`: API key for cloud services
- `PINATA_JWT`: Pinata JWT for IPFS pinning
- `CLOUD_STORAGE_KEY`: Cloud storage access key
- `GITHUB_TOKEN`: GitHub token for verification
- `CLOUD_VERIFICATION_ENDPOINT`: Verification service URL
- `CLOUD_STORAGE_ENDPOINT`: Storage service URL
- `CLOUD_ANALYTICS_ENDPOINT`: Analytics service URL

## Usage Examples

### Using Cloud Notifications

```tsx
import { CloudNotificationBell } from '@/components/cloud';

function MyComponent() {
  return <CloudNotificationBell accountAddress="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" />;
}
```

### Using Real-time Reputation

```tsx
import { RealTimeReputation } from '@/components/cloud';

function MyComponent() {
  return <RealTimeReputation accountAddress="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" />;
}
```

### Using Cloud Verification

```tsx
const verifyContribution = async () => {
  const result = await trpc.cloud.verification.verify.mutate({
    contributionId: 'contribution-123',
    proof: 'proof-data',
    type: 'github',
    metadata: { prNumber: 42 }
  });
  
  console.log('Verified:', result.verified);
  console.log('Score:', result.score);
};
```

## Performance

- **Edge Caching**: Reputation data cached at edge for 5 minutes
- **Batch Processing**: Multiple verifications processed in parallel
- **Auto-scaling**: Workers scale based on queue length
- **CDN**: Static assets served via CDN

## Monitoring

Access Grafana at `http://localhost:3000` (default credentials: admin/admin)

Metrics tracked:
- API response times
- Verification queue length
- Cache hit rates
- Error rates
- Active workers

## Troubleshooting

### Notifications not working

1. Check browser notification permissions
2. Verify `VITE_CLOUD_NOTIFICATIONS_ENDPOINT` is set
3. Check EventSource connection in browser console

### Verification failing

1. Verify `CLOUD_API_KEY` is set
2. Check `CLOUD_VERIFICATION_ENDPOINT` is accessible
3. Review worker logs: `docker logs dotrep-cloud-worker-1`

### Storage issues

1. Verify `PINATA_JWT` is valid
2. Check `CLOUD_STORAGE_KEY` is set
3. Verify network connectivity to storage endpoints

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] GraphQL API for cloud services
- [ ] Multi-region deployment
- [ ] Advanced analytics dashboards
- [ ] Machine learning for reputation scoring
- [ ] Cross-chain reputation aggregation


