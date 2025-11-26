# DotRep + OriginTrail DKG Integration

## Overview

This module provides seamless integration between DotRep reputation system and OriginTrail Decentralized Knowledge Graph (DKG) V8. It enables publishing developer reputation data as verifiable Knowledge Assets on the DKG, making reputation data AI-ready, verifiable, and interoperable.

## Features

✅ **DKG V8 Compatible** - Updated for the latest dkg.js 8.2.0 SDK  
✅ **Automatic Retry Logic** - Robust error handling with configurable retries  
✅ **Batch Operations** - Publish multiple reputation assets efficiently  
✅ **UAL Caching** - Fast lookups with intelligent caching  
✅ **W3C Standards** - JSON-LD/RDF formatted Knowledge Assets  
✅ **Type Safety** - Full TypeScript implementation  
✅ **Health Monitoring** - Built-in connection health checks  
✅ **Multiple Environments** - Support for testnet, mainnet, and local development  

## Installation

```bash
# Navigate to dkg-integration directory
cd dotrep-v2/dkg-integration

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# DKG Environment
DKG_ENVIRONMENT=testnet

# DKG Node Endpoint
DKG_OTNODE_URL=https://v6-pegasus-node-02.origin-trail.network:8900

# Blockchain Configuration
DKG_BLOCKCHAIN=otp:20430

# Your wallet private key (KEEP SECRET!)
DKG_PUBLISH_WALLET=your_private_key_here
```

### Supported Environments

| Environment | Endpoint | Blockchain ID |
|------------|----------|---------------|
| **Testnet** | `https://v6-pegasus-node-02.origin-trail.network:8900` | `otp:20430` |
| **Mainnet** | `https://positron.origin-trail.network` | `otp:2043` |
| **Local** | `http://localhost:8900` | `hardhat1:31337` |

## Quick Start

### 1. Basic Usage

```typescript
import { DKGClientV8 } from './dkg-client-v8';

// Initialize client
const dkgClient = new DKGClientV8({
  environment: 'testnet'
});

// Check connection
const isHealthy = await dkgClient.healthCheck();
console.log('DKG Connection:', isHealthy ? '✅ Healthy' : '❌ Unhealthy');

// Publish reputation
const result = await dkgClient.publishReputationAsset({
  developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
  reputationScore: 850,
  contributions: [
    {
      id: 'contrib-001',
      type: 'github_pr',
      url: 'https://github.com/paritytech/polkadot-sdk/pull/1234',
      title: 'Add new feature',
      date: '2025-11-15T10:30:00Z',
      impact: 95
    }
  ],
  timestamp: Date.now(),
  metadata: {}
});

console.log('Published UAL:', result.UAL);
```

### 2. Using the Publisher

```typescript
import { KnowledgeAssetPublisherV8 } from './knowledge-asset-publisher-v8';

const publisher = new KnowledgeAssetPublisherV8();

// Publish developer reputation
const result = await publisher.publishDeveloperReputation({
  developer: {
    id: 'dev-001',
    address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    username: 'alice_developer',
    githubId: 'alice-dev'
  },
  score: 850,
  contributions: [...],
  lastUpdated: new Date()
});
```

### 3. Run the Example

```bash
# Run the comprehensive example
npx ts-node examples/publish-reputation-example-v8.ts
```

## API Reference

### DKGClientV8

#### Constructor

```typescript
new DKGClientV8(config?: DKGConfig)
```

**Config Options:**
- `environment`: `'testnet' | 'mainnet' | 'local'`
- `endpoint`: Custom DKG node endpoint
- `blockchain.name`: Blockchain identifier
- `blockchain.privateKey`: Wallet private key
- `maxRetries`: Maximum retry attempts (default: 3)
- `retryDelay`: Delay between retries in ms (default: 1000)

#### Methods

##### `publishReputationAsset(data, epochs?)`
Publish reputation data as a Knowledge Asset.

**Parameters:**
- `data: ReputationAsset` - Reputation data to publish
- `epochs: number` - Storage duration (default: 2)

**Returns:** `Promise<PublishResult>`

##### `queryReputation(ual)`
Query reputation data by UAL.

**Parameters:**
- `ual: string` - Uniform Asset Locator

**Returns:** `Promise<any>` - Reputation data

##### `searchByDeveloper(developerId)`
Search for reputation assets by developer ID.

**Parameters:**
- `developerId: string` - Developer identifier

**Returns:** `Promise<any[]>` - Array of matching assets

##### `healthCheck()`
Check DKG connection health.

**Returns:** `Promise<boolean>`

##### `getNodeInfo()`
Get DKG node information.

**Returns:** `Promise<any>` - Node info including version

### KnowledgeAssetPublisherV8

#### Constructor

```typescript
new KnowledgeAssetPublisherV8(dkgClient?: DKGClientV8)
```

#### Methods

##### `publishDeveloperReputation(data, options?)`
Publish a developer's reputation.

**Parameters:**
- `data: ReputationData` - Developer reputation data
- `options: PublishOptions` - Publishing options
  - `epochs?: number` - Storage duration
  - `forceUpdate?: boolean` - Force republish even if cached
  - `includePII?: boolean` - Include personally identifiable information

**Returns:** `Promise<PublishResult>`

##### `batchPublish(dataList, options?)`
Batch publish multiple reputations.

**Parameters:**
- `dataList: ReputationData[]` - Array of reputation data
- `options: PublishOptions` - Publishing options

**Returns:** `Promise<PublishResult[]>`

##### `updateDeveloperReputation(developerId, updatedData)`
Update existing reputation.

**Parameters:**
- `developerId: string` - Developer identifier
- `updatedData: Partial<ReputationData>` - Updated data

**Returns:** `Promise<PublishResult>`

##### `queryDeveloperReputation(developerId)`
Query developer reputation.

**Parameters:**
- `developerId: string` - Developer identifier

**Returns:** `Promise<any>` - Reputation data

##### `getCacheStats()`
Get cache statistics.

**Returns:** `{ size: number; developers: string[] }`

## Data Structures

### ReputationAsset

```typescript
interface ReputationAsset {
  developerId: string;
  reputationScore: number;
  contributions: Contribution[];
  timestamp: number;
  metadata: Record<string, any>;
}
```

### Contribution

```typescript
interface Contribution {
  id: string;
  type: 'github_pr' | 'github_commit' | 'gitlab_mr' | 'other';
  url: string;
  title: string;
  date: string;
  impact: number;
}
```

### PublishResult

```typescript
interface PublishResult {
  UAL: string;
  transactionHash?: string;
  blockNumber?: number;
}
```

## JSON-LD Schema

Reputation data is published in W3C-compliant JSON-LD format:

```json
{
  "@context": {
    "@vocab": "https://schema.org/",
    "dotrep": "https://dotrep.io/ontology/",
    "polkadot": "https://polkadot.network/ontology/"
  },
  "@type": "Person",
  "@id": "did:polkadot:5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "identifier": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
  "dotrep:reputationScore": 850,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 850,
    "bestRating": 1000,
    "worstRating": 0,
    "ratingCount": 10
  },
  "dotrep:contributions": [...]
}
```

## Error Handling

The client includes automatic retry logic for transient failures:

```typescript
// Automatic retries with exponential backoff
const client = new DKGClientV8({
  environment: 'testnet',
  maxRetries: 3,
  retryDelay: 1000
});

try {
  const result = await client.publishReputationAsset(data);
} catch (error) {
  console.error('Failed after 3 retries:', error.message);
}
```

## Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Format code
npm run format
```

## Troubleshooting

### Connection Issues

```typescript
// Check DKG connection
const client = new DKGClientV8({ environment: 'testnet' });
const isHealthy = await client.healthCheck();

if (!isHealthy) {
  console.error('DKG connection failed. Check:');
  console.error('1. Network connectivity');
  console.error('2. DKG node endpoint');
  console.error('3. Firewall settings');
}
```

### Publishing Failures

Common issues:
1. **Invalid private key** - Check `DKG_PUBLISH_WALLET` in `.env`
2. **Insufficient gas** - Ensure wallet has enough tokens
3. **Network timeout** - Increase `retryDelay` or `maxRetries`
4. **Invalid JSON-LD** - Validate data structure

### Version Compatibility

This module requires:
- **Node.js** >= 20.0.0
- **dkg.js** >= 8.2.0
- **TypeScript** >= 5.0.0

Check versions:
```bash
node --version  # Should be >= 20.0.0
npm list dkg.js  # Should be >= 8.2.0
```

## Migration from V6

If upgrading from dkg.js v6:

1. **Update dependencies:**
   ```bash
   npm install dkg.js@8.2.0
   ```

2. **Update client initialization:**
   ```typescript
   // OLD (v6)
   const dkg = new DKG({
     endpoint: '...',
     blockchain: '...',
     wallet: '...',
     publicKey: '...'  // No longer needed
   });

   // NEW (v8)
   const dkg = new DKG({
     endpoint: '...',
     blockchain: {
       name: '...',
       privateKey: '...'
     }
     // publicKey auto-derived
   });
   ```

3. **Update API calls:**
   - `asset.create()` now takes options object
   - Environment derived from blockchain name
   - Check updated examples

## Resources

- [OriginTrail DKG Docs](https://docs.origintrail.io)
- [dkg.js GitHub](https://github.com/OriginTrail/dkg.js)
- [DKG V8 Update Guide](https://docs.origintrail.io/build-with-dkg/dkg-v8-update-guidebook)
- [W3C JSON-LD](https://www.w3.org/TR/json-ld11/)

## Support

For issues or questions:
- GitHub Issues: [DotRep Repository](https://github.com/dotrep/dotrep)
- Discord: [OriginTrail Community](https://discord.gg/origintrail)
- Documentation: See `ORIGINTRAIL_DKG_INTEGRATION.md`

## License

Apache-2.0 - See LICENSE file

---

**Built for the "Scaling Trust in the Age of AI" Global Hackathon**  
*Supported by OriginTrail x Polkadot x Umanitek*
