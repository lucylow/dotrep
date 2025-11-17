# Cloud Integration Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd dotrep-v2
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
- `CLOUD_API_KEY`: Your cloud service API key
- `PINATA_JWT`: Pinata JWT for IPFS pinning (optional for development)
- `GITHUB_TOKEN`: GitHub token for verification workers
- `DATABASE_URL`: MySQL connection string

### 3. Start Development Server

```bash
pnpm dev
```

## Cloud Features

### ✅ Implemented Features

1. **Cloud Verification Service**
   - Contribution verification via cloud workers
   - Batch verification support
   - Result caching

2. **Cloud Storage Service**
   - IPFS pinning via Pinata
   - Cloud backup storage
   - Proof retrieval with fallback

3. **Real-time Notifications**
   - EventSource-based notifications
   - Browser notification support
   - Notification management UI

4. **Real-time Reputation**
   - Live reputation score updates
   - Trend indicators
   - Score change tracking

5. **Serverless Reputation Calculation**
   - Time-decay algorithm
   - Percentile calculation
   - Ranking system

6. **Cloud Monitoring**
   - Event tracking
   - Analytics reports
   - Performance metrics

7. **Edge Computing**
   - Cloudflare Workers for caching
   - Edge-optimized reputation queries
   - Reduced latency

8. **Docker Deployment**
   - Multi-container setup
   - Auto-scaling workers
   - Redis caching
   - Grafana monitoring

## API Usage

### Verify Contribution

```typescript
import { trpc } from '@/lib/trpc';

const result = await trpc.cloud.verification.verify.mutate({
  contributionId: 'cont-123',
  proof: 'proof-data',
  type: 'github',
  metadata: { prNumber: 42 }
});
```

### Store Proof

```typescript
const storageResult = await trpc.cloud.storage.storeProof.mutate({
  contributionId: 'cont-123',
  proof: { /* proof data */ },
  metadata: { /* metadata */ }
});

console.log('IPFS Hash:', storageResult.ipfsHash);
console.log('Cloud URL:', storageResult.cloudUrl);
```

### Calculate Reputation

```typescript
const reputation = await trpc.cloud.reputation.calculate.mutate({
  contributions: [
    {
      id: 'cont-1',
      type: 'github_pr',
      weight: 10,
      timestamp: Date.now(),
      age: 0
    }
  ],
  algorithmWeights: {
    github_pr: 1.5,
    code_review: 1.2
  },
  timeDecayFactor: 0.01,
  userId: 'user-123'
});
```

## Component Usage

### Cloud Notification Bell

```tsx
import { CloudNotificationBell } from '@/components/cloud';

<CloudNotificationBell accountAddress="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" />
```

### Real-time Reputation

```tsx
import { RealTimeReputation } from '@/components/cloud';

<RealTimeReputation accountAddress="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" />
```

### Enhanced Dashboard

The `EnhancedDashboard` component now includes:
- Cloud dashboard header with notifications
- Real-time reputation display
- Cloud metrics
- Enhanced account cards

## Deployment

### Docker Compose

```bash
docker-compose -f docker-compose.cloud.yml up -d
```

Services:
- API: http://localhost:3001
- Grafana: http://localhost:3000
- Redis: localhost:6379
- MySQL: localhost:3306

### Cloudflare Workers

1. Install Wrangler:
```bash
npm install -g wrangler
```

2. Configure `wrangler.toml` with your KV namespace IDs

3. Deploy:
```bash
wrangler publish
```

## Testing

### Test Cloud Verification

```typescript
// In your component or test file
const testVerification = async () => {
  try {
    const result = await trpc.cloud.verification.verify.mutate({
      contributionId: 'test-123',
      proof: 'test-proof',
      type: 'github',
      metadata: {}
    });
    console.log('Verification result:', result);
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
```

### Test Notifications

1. Connect wallet in the app
2. The notification bell should appear in the header
3. Notifications will appear when events occur

## Troubleshooting

### Notifications Not Showing

1. Check browser console for EventSource errors
2. Verify `VITE_CLOUD_NOTIFICATIONS_ENDPOINT` is set
3. Check notification permissions in browser settings

### Verification Failing

1. Verify `CLOUD_API_KEY` is set correctly
2. Check `CLOUD_VERIFICATION_ENDPOINT` is accessible
3. Review network requests in browser DevTools

### Storage Issues

1. For development, storage will use mock hashes if `PINATA_JWT` is not set
2. Check `CLOUD_STORAGE_KEY` if using cloud backup
3. Verify network connectivity

## Next Steps

1. Set up your cloud service endpoints (or use mocks for development)
2. Configure Pinata for IPFS pinning
3. Set up Cloudflare Workers for edge caching
4. Deploy to production using Docker Compose
5. Monitor with Grafana

## Support

For issues or questions:
- Check `CLOUD_INTEGRATION.md` for detailed documentation
- Review server logs: `docker logs dotrep-api-1`
- Check worker logs: `docker logs dotrep-cloud-worker-1`


