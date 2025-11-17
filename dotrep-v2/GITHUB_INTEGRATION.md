# GitHub Integration Guide

This document describes the enhanced GitHub integration features for DotRep, including webhook handling, worker processing, batch anchoring, and backfilling capabilities.

## Features

### 1. GitHub Account Claiming
- OAuth-based authentication with GitHub
- Wallet signature verification for cryptographic binding
- Secure token storage (encrypted in production)

### 2. Real-Time Webhook Processing
- GitHub webhook endpoint with signature verification
- Automatic event normalization and queuing
- Support for: push, pull_request, issue, comment events

### 3. Worker System
- Background worker processes GitHub events
- Verification and anti-abuse checks
- Contribution record creation
- Proof generation and queuing

### 4. Batch Anchoring
- Batches proofs into IPFS payloads
- On-chain anchor submission
- Database record tracking

### 5. Historical Backfilling
- GraphQL-based contribution fetching
- Configurable time range (1-24 months)
- Bulk import of past contributions

## Setup

### Prerequisites

1. **Redis** - Required for queue management
   ```bash
   docker run -d -p 6379:6379 redis:6
   ```

2. **IPFS** - Required for proof storage (optional, can use cloud IPFS)
   ```bash
   ipfs daemon
   ```

3. **GitHub OAuth App** - Create at https://github.com/settings/developers
   - Set callback URL: `https://your-domain.com/auth/github/callback`
   - Required scopes: `read:user`, `repo` (optional, for private repos)

4. **GitHub Webhook** - Configure in repository settings
   - Webhook URL: `https://your-domain.com/api/integrations/github/webhook`
   - Secret: Set `GITHUB_WEBHOOK_SECRET` in environment
   - Events: `push`, `pull_request`, `issues`, `issue_comment`, `pull_request_review`

### Environment Variables

Add to your `.env` file:

```bash
# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
OAUTH_CALLBACK_URL=https://your-domain.com/auth/github/callback

# GitHub Webhook
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# Redis (for queues)
REDIS_URL=redis://127.0.0.1:6379

# IPFS
IPFS_API_URL=http://127.0.0.1:5001

# Optional: Anchor Service
ANCHOR_SERVICE_URL=https://anchor-service.local/api/anchor
ANCHOR_SERVICE_API_KEY=your_api_key

# Optional: Enable batch anchoring
ENABLE_BATCH_ANCHORING=true

# Optional: GitHub token for GraphQL backfilling
GITHUB_TOKEN=your_github_personal_access_token
```

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Run database migrations:
   ```bash
   pnpm db:push
   ```

3. Start the server:
   ```bash
   pnpm dev
   ```

4. Start the worker (in a separate terminal):
   ```bash
   pnpm dev:worker
   ```

## Usage

### Frontend Component

Use the `GitHubClaimEnhanced` component in your React app:

```tsx
import { GitHubClaimEnhanced } from "@/components/GitHubClaimEnhanced";

function MyPage() {
  return (
    <GitHubClaimEnhanced
      onSuccess={() => {
        console.log("GitHub account linked!");
      }}
    />
  );
}
```

### Backfilling Contributions

Use the tRPC mutation to backfill historical contributions:

```tsx
const backfill = trpc.github.backfill.useMutation();

await backfill.mutateAsync({
  githubUsername: "octocat",
  monthsBack: 12, // Optional, default: 12
});
```

### Webhook Health Check

Check webhook queue status:

```tsx
const health = trpc.github.webhookHealth.useQuery();
```

## Architecture

### Data Flow

1. **GitHub Webhook** → `/api/integrations/github/webhook`
   - Verifies signature
   - Normalizes event
   - Queues to `github-ingest` queue

2. **Worker** → Processes queued events
   - Verifies contributor exists and is linked
   - Creates contribution records
   - Generates proofs
   - Queues to `github-proofs` queue

3. **Batch Anchor Service** → Runs periodically
   - Batches proofs (default: 50 per batch)
   - Pins to IPFS
   - Submits to anchor service
   - Updates database records

### Database Schema

New tables added:
- `github_accounts` - OAuth tokens and account links
- `proofs` - Proof payloads before batching

Enhanced tables:
- `contributions` - Now includes `proofCid` and `merkleRoot`
- `anchors` - Tracks batch anchors with IPFS CIDs

## Security Considerations

### Production Checklist

- [ ] Store `GITHUB_CLIENT_SECRET` and `GITHUB_WEBHOOK_SECRET` in secure vault (KMS/Vault)
- [ ] Encrypt OAuth tokens in database (use KMS for encryption keys)
- [ ] Use HTTPS for all webhook endpoints
- [ ] Implement rate limiting on webhook endpoint
- [ ] Add monitoring and alerting for failed verifications
- [ ] Rotate webhook secrets periodically
- [ ] Use least-privilege GitHub OAuth scopes
- [ ] Implement request size limits
- [ ] Add audit logging for all operations

### Anti-Abuse Measures

The worker includes basic anti-abuse checks:
- Contributor verification requirement
- Commit hash format validation
- Event deduplication via job IDs

Additional measures to implement:
- Burst detection (too many events in short time)
- Bot detection (account age, activity patterns)
- Sybil resistance (one wallet per GitHub account)
- Reputation thresholds for verification

## Monitoring

### Key Metrics

- Webhook delivery success rate
- Worker processing latency
- Verification failure ratio
- Batch anchoring success rate
- Queue depth (pending jobs)

### Logs

The system logs important events:
- `📥 Received GitHub webhook` - Webhook received
- `🔄 Processing event` - Event being processed
- `✅ Event verified` - Event passed verification
- `📦 Batching proofs` - Batch anchor starting
- `✅ Batch anchored` - Batch anchor complete

## Troubleshooting

### Webhook Not Receiving Events

1. Check webhook configuration in GitHub repository settings
2. Verify `GITHUB_WEBHOOK_SECRET` matches GitHub webhook secret
3. Check server logs for signature verification errors
4. Ensure endpoint is publicly accessible

### Worker Not Processing Events

1. Verify Redis connection: `REDIS_URL` is correct
2. Check worker is running: `pnpm dev:worker`
3. Check queue status: `trpc.github.webhookHealth.useQuery()`
4. Review worker logs for errors

### IPFS Pinning Fails

1. Verify IPFS daemon is running: `ipfs daemon`
2. Check `IPFS_API_URL` is correct
3. For production, consider using cloud IPFS (Pinata, Infura, etc.)
4. Review batch anchor service logs

### Backfill Fails

1. Verify `GITHUB_TOKEN` is set and valid
2. Check token has required scopes: `read:user`, `repo` (if needed)
3. Verify GitHub username is correct
4. Check GraphQL API rate limits

## API Reference

### Webhook Endpoint

**POST** `/api/integrations/github/webhook`

Headers:
- `X-Hub-Signature-256`: GitHub webhook signature
- `X-Github-Event`: Event type (push, pull_request, etc.)
- `X-Github-Delivery`: Unique delivery ID

### tRPC Endpoints

**github.backfill**
```typescript
input: {
  githubUsername: string;
  monthsBack?: number; // 1-24, default: 12
}
output: {
  processed: number;
  errors: number;
}
```

**github.webhookHealth**
```typescript
output: {
  ok: boolean;
  queue: {
    name: string;
    connected: boolean;
  };
}
```

## Contributing

When adding new event types or features:

1. Update `normalizeGitHubEvent` in `githubWebhook.ts`
2. Add verification logic in `githubIngestWorker.ts`
3. Update database schema if needed
4. Add tests for new functionality
5. Update this documentation

## License

MIT


