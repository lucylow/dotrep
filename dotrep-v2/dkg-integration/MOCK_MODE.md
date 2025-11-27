# DKG Mock Mode Documentation

## Overview

The OriginTrail DKG integration now supports **mock mode**, which allows the system to function even when the DKG connection is unavailable or for development/testing purposes. Mock mode uses realistic mock data to simulate DKG operations.

## Features

### ✅ Fully Functional Mock Mode

- **Automatic fallback**: If DKG connection fails, automatically switches to mock mode (if enabled)
- **Realistic mock data**: Pre-populated reputation data for multiple developers
- **All operations supported**: Publish, query, search, update, batch operations
- **Health checks**: Mock mode health checks always return healthy status
- **UAL generation**: Generates realistic mock UALs (Uniform Asset Locators)

### 🔧 Configuration

#### Environment Variables

```bash
# Enable mock mode explicitly
DKG_USE_MOCK=true

# Enable automatic fallback to mock mode on errors (recommended)
DKG_FALLBACK_TO_MOCK=true

# DKG connection settings (if not using mock mode)
DKG_ENVIRONMENT=testnet  # or 'mainnet' or 'local'
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900
DKG_BLOCKCHAIN=otp:20430
DKG_PUBLISH_WALLET=your_private_key_here
```

#### Programmatic Configuration

```typescript
import { DKGClientV8 } from './dkg-integration/dkg-client-v8';

// Explicitly enable mock mode
const client = new DKGClientV8({
  useMockMode: true,
});

// Enable automatic fallback to mock mode
const client = new DKGClientV8({
  fallbackToMock: true,
  environment: 'testnet',
});

// Check status
const status = client.getStatus();
console.log('Mock mode:', status.mockMode);
```

## Mock Data

### Included Mock Developers

The mock data includes reputation information for the following developers:

1. **Alice Developer** (`5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY`)
   - Reputation Score: 850
   - Contributions: 4 (GitHub PRs, commits)
   - Percentile: 85

2. **Bob Developer** (`5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty`)
   - Reputation Score: 720
   - Contributions: 2
   - Percentile: 72

3. **Charlie Developer** (`5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy`)
   - Reputation Score: 680
   - Contributions: 2 (GitHub commits, GitLab MRs)
   - Percentile: 68

4. **David Developer** (`5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y`)
   - Reputation Score: 920
   - Contributions: 5
   - Percentile: 92

### Mock Data Structure

Each mock reputation asset includes:
- Developer ID (Polkadot address)
- Reputation score (0-1000)
- Contribution history with:
  - Contribution ID
  - Type (GitHub PR, commit, GitLab MR, etc.)
  - URL
  - Title
  - Date
  - Impact score
- Metadata (username, GitHub ID, timestamps, etc.)
- Verifiable credentials (with mock proof)

## Usage Examples

### Basic Usage with Mock Mode

```typescript
import { DKGClientV8 } from './dkg-integration/dkg-client-v8';
import { KnowledgeAssetPublisherV8 } from './dkg-integration/knowledge-asset-publisher-v8';

// Create client with mock mode
const dkgClient = new DKGClientV8({
  useMockMode: true,
});

// Create publisher
const publisher = new KnowledgeAssetPublisherV8(dkgClient);

// Query mock reputation
const reputation = await dkgClient.queryReputation(
  'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678'
);

// Search for developer
const results = await dkgClient.searchByDeveloper(
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'
);
```

### Auto-Fallback Example

```typescript
// This will try to connect to DKG, but fallback to mock if unavailable
const client = new DKGClientV8({
  fallbackToMock: true,  // Automatically use mock mode on errors
  environment: 'testnet',
});

// Check health (will use mock if DKG unavailable)
const isHealthy = await client.healthCheck();  // Always returns true in mock mode

// Check actual mode
const status = client.getStatus();
if (status.mockMode) {
  console.log('Running in mock mode');
}
```

### Publishing in Mock Mode

```typescript
const client = new DKGClientV8({ useMockMode: true });

const result = await client.publishReputationAsset({
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  reputationScore: 850,
  contributions: [
    {
      id: 'contrib-001',
      type: 'github_pr',
      url: 'https://github.com/example/repo/pull/123',
      title: 'Add feature',
      date: '2025-11-20T10:00:00Z',
      impact: 85,
    },
  ],
  timestamp: Date.now(),
  metadata: {},
});

console.log('Published UAL:', result.UAL);  // Mock UAL generated
```

## MCP Server Integration

The MCP server automatically uses mock mode if DKG is unavailable:

```typescript
// MCP server automatically handles mock mode
const server = new DotRepMCPServer();

// All tools work with mock data
// - get_developer_reputation
// - verify_contribution
// - search_developers_by_reputation
// - get_reputation_proof
// - compare_developers
// - get_dkg_health (returns mock mode status)
```

## Mock Data Functions

### Available Helper Functions

```typescript
import {
  MOCK_REPUTATION_ASSETS,      // Map of all mock reputation assets
  getMockJSONLD,                // Get JSON-LD representation
  getMockUAL,                   // Get UAL for a developer
  generateMockUAL,              // Generate a new mock UAL
  searchMockReputations,        // Search by score range
  getMockNodeInfo,              // Get mock DKG node info
  hasMockData,                  // Check if developer has mock data
  findDeveloperByUAL,           // Find developer by UAL
  getAllMockDeveloperIds,       // Get all mock developer IDs
} from './mock-data';
```

## Benefits

1. **Development**: Develop and test without DKG connection
2. **Testing**: Consistent test data for automated tests
3. **Reliability**: System continues to work if DKG is down
4. **Demo**: Show features without requiring DKG setup
5. **CI/CD**: Run tests in environments without DKG access

## Limitations

While mock mode is fully functional, note that:

- Mock data is not persisted between sessions
- Mock UALs are not real blockchain assets
- Mock proofs are not cryptographically verifiable
- Published assets in mock mode are only stored in memory

For production use, ensure DKG connection is properly configured and mock mode is disabled or used only as a fallback.

## Best Practices

1. **Development**: Use `useMockMode: true` explicitly
2. **Production**: Use `fallbackToMock: true` for graceful degradation
3. **Testing**: Use mock mode for unit tests
4. **Monitoring**: Check `getStatus().mockMode` to monitor if system is using mock data

## Troubleshooting

### Mock mode not working?

1. Check environment variables are set correctly
2. Verify `useMockMode` or `fallbackToMock` is enabled
3. Check console logs for mock mode indicators (`🔧 [MOCK]`)

### Want to disable mock mode?

```typescript
// Explicitly disable mock mode and fallback
const client = new DKGClientV8({
  useMockMode: false,
  fallbackToMock: false,
  environment: 'testnet',
});
```

This will throw errors if DKG is unavailable, which may be desired for strict production environments.

