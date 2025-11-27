# Umanitek Guardian Integration

This document describes the integration of **Umanitek Guardian AI Agent** into the DotRep Social-Graph Reputation system.

## Overview

Umanitek Guardian provides privacy-preserving content verification using fingerprinting technology, built on the OriginTrail Decentralized Knowledge Graph (DKG). This integration enables:

- **Content Safety Verification**: Check images, videos, and text for harmful content (deepfakes, CSAM, illicit media, misinformation)
- **Verifiable Evidence**: All verification results are published as Knowledge Assets on the DKG
- **Reputation Impact**: Safety scores affect creator reputation
- **Automated Enforcement**: High-confidence flags can trigger slashing and takedowns

## Architecture

The integration spans three layers:

### 🤖 Agent Layer: MCP Server Tools

The MCP server exposes Guardian tools for AI agents:

- `verify_content`: Verify content using Guardian
- `create_verification_community_note`: Publish verification results as Community Notes
- `get_creator_safety_score`: Get safety score for a creator

**Location**: `dotrep-v2/mcp-server/reputation-mcp.ts`

### 🧠 Knowledge Layer: DKG Integration

Verification reports are published as Knowledge Assets:

- **ContentVerificationReport**: JSON-LD schema for verification results
- **Community Notes**: Link verification results to content
- **SPARQL Queries**: Query safety scores and verification history

**Location**: `dotrep-v2/dkg-integration/guardian-verification.ts`

### 🔗 Trust Layer: Polkadot/NeuroWeb

Enforcement mechanisms:

- **Slashing**: Automatic stake slashing for severe violations
- **Reputation Impact**: Safety scores integrated into reputation calculations
- **Verifiable Proofs**: All actions anchored on-chain

**Location**: `dotrep-v2/server/_core/polkadotApi.ts`

## Components

### 1. Guardian API Client

**File**: `dotrep-v2/server/_core/guardianApi.ts`

Provides:
- Content verification via Guardian API
- Privacy-preserving fingerprinting
- Mock mode for development/demo
- Automatic fallback to mock if API unavailable

**Usage**:
```typescript
import { getGuardianApi } from './server/_core/guardianApi';

const guardianApi = getGuardianApi();
const result = await guardianApi.verifyContent({
  contentUrl: 'https://example.com/image.jpg',
  contentType: 'image',
  checkType: 'all', // 'deepfake' | 'csam' | 'misinformation' | 'illicit' | 'all'
});

console.log(result.status); // 'verified' | 'flagged' | 'pending'
console.log(result.confidence); // 0-1
console.log(result.matches); // Array of matches
console.log(result.recommendedAction); // 'flag' | 'takedown' | 'monitor' | 'allow'
```

### 2. Guardian Verification Service

**File**: `dotrep-v2/dkg-integration/guardian-verification.ts`

Handles:
- Publishing verification reports to DKG
- Creating Community Notes from verification results
- Calculating creator safety scores
- SPARQL queries for safety insights

**Usage**:
```typescript
import { getGuardianVerificationService } from './dkg-integration/guardian-verification';

const service = getGuardianVerificationService();
const result = await service.publishVerificationReport(
  'https://example.com/content',
  'creator-did-123',
  verificationResult,
  2 // epochs
);

// Get safety score
const safetyScore = await service.calculateCreatorSafetyScore('creator-did-123');
console.log(safetyScore.safetyScore); // 0-1
```

### 3. MCP Server Integration

**File**: `dotrep-v2/mcp-server/reputation-mcp.ts`

New MCP tools:
- `verify_content`: Verify content via Guardian
- `create_verification_community_note`: Publish verification as Community Note
- `get_creator_safety_score`: Get creator safety metrics

**Example MCP call**:
```json
{
  "name": "verify_content",
  "arguments": {
    "content_url": "https://example.com/image.jpg",
    "content_type": "image",
    "check_type": "all"
  }
}
```

### 4. Polkadot API Slashing

**File**: `dotrep-v2/server/_core/polkadotApi.ts`

New method: `evaluateGuardianFlag()`

Evaluates Guardian verification reports and executes slashing if criteria are met:
- High confidence (>0.85)
- Severe violation (CSAM, illicit)
- Returns transaction for signing

**Usage**:
```typescript
const polkadotApi = getPolkadotApi();
const result = await polkadotApi.evaluateGuardianFlag(
  verificationUAL,
  creatorDID,
  slasherAccount
);

if (result.slashed) {
  console.log(`Slashed ${result.amount} TRAC`);
}
```

### 5. Impact Metrics

**File**: `dotrep-v2/server/_core/impactMetrics.ts`

New metrics tracked:
- Total verifications
- Flagged vs clean content
- Flags by type (deepfake, CSAM, illicit, misinformation)
- Average confidence
- Takedowns and slashes executed

**Usage**:
```typescript
import { getImpactMetrics } from './server/_core/impactMetrics';

const metrics = getImpactMetrics();
metrics.recordGuardianFlag('deepfake', 0.92);
metrics.recordGuardianSlash(1000000000000000000); // 1 TRAC
```

## Configuration

### Environment Variables

```bash
# Guardian API Configuration
UMANITEK_GUARDIAN_API_KEY=your_api_key_here
UMANITEK_GUARDIAN_API_URL=https://api.umanitek.ai/v1

# Mock Mode (for development/demo)
GUARDIAN_USE_MOCK=true
GUARDIAN_FALLBACK_TO_MOCK=true
```

### Mock Mode

The integration supports full mock mode for development and demos:

- **Deterministic flagging**: Same content always gets same result
- **Realistic responses**: Mock confidence scores and match types
- **No API dependency**: Works without Guardian API access

## Knowledge Asset Schema

### ContentVerificationReport

```json
{
  "@context": [
    "https://schema.org/",
    "https://guardian.umanitek.ai/schema/"
  ],
  "@type": "guardian:ContentVerificationReport",
  "@id": "ual:dkg:guardian-verification:abc123",
  "dateCreated": "2025-11-27T10:30:00Z",
  "about": "https://example.com/content",
  "generatedBy": {
    "@id": "did:dkg:umanitek-guardian",
    "@type": "guardian:GuardianAgent",
    "name": "Umanitek Guardian AI Agent"
  },
  "verificationResult": {
    "confidence": 0.94,
    "matchFound": true,
    "matchType": "deepfake",
    "originalFingerprint": "hex_string",
    "recommendedAction": "takedown"
  },
  "matches": [
    {
      "matchId": "match-123",
      "confidence": 0.94,
      "matchType": "deepfake",
      "sourceUAL": "ual:dkg:videntifier-db:xyz"
    }
  ]
}
```

## SPARQL Queries

### Find Safe Creators

```sparql
PREFIX schema: <https://schema.org/>
PREFIX dotrep: <https://dotrep.io/ontology/>
PREFIX guardian: <https://guardian.umanitek.ai/schema/>

SELECT ?creator ?name ?safetyScore ?totalVerifications
WHERE {
  ?profile a dotrep:TrustedUserProfile .
  ?profile dotrep:creator ?creator .
  OPTIONAL { ?profile schema:name ?name . }
  ?profile dotrep:reputationMetrics/dotrep:safetyScore ?safetyScore .
  ?profile dotrep:reputationMetrics/dotrep:totalVerifications ?totalVerifications .
  FILTER(?safetyScore >= 0.9 && ?totalVerifications > 0)
}
ORDER BY DESC(?safetyScore)
LIMIT 50
```

## Workflow Example

1. **Content Upload**: User uploads content
2. **Guardian Verification**: Content is verified via Guardian API
3. **DKG Publication**: Verification result published as Knowledge Asset
4. **Reputation Update**: Creator safety score updated
5. **Enforcement** (if flagged):
   - High confidence + severe violation → Slashing
   - Medium confidence → Flagging
   - Low confidence → Monitoring

## Integration with Reputation System

Safety scores are integrated into reputation calculations:

```typescript
const safetyScore = await service.calculateCreatorSafetyScore(creatorId);
const reputation = await polkadotApi.getReputation(creatorId);

// Combined reputation includes safety
const combinedScore = reputation.overall * safetyScore.safetyScore;
```

## Getting Real API Access

To use the real Guardian API:

1. Contact Umanitek via [umanitek.ai](https://umanitek.ai)
2. Request hackathon/pilot API access
3. Provide API key via `UMANITEK_GUARDIAN_API_KEY` environment variable
4. Set `GUARDIAN_USE_MOCK=false`

The system will automatically use the real API if available, with fallback to mock mode.

## Demo Strategy

For hackathon demos:

1. **Use Mock Mode**: Demonstrates full workflow without API dependency
2. **Show Real DKG Assets**: Publish actual verification reports to DKG testnet
3. **Demonstrate Flow**: Show agent → verification → DKG → reputation impact
4. **Highlight Innovation**: Privacy-preserving fingerprinting + verifiable proofs

## Example Usage

See `dkg-integration/examples/guardian-verification-example.ts` for a complete example showing:
- Content verification
- DKG publication
- Community Note creation
- Safety score calculation
- Reputation integration
- Slashing evaluation

Run the example:
```bash
npx tsx dkg-integration/examples/guardian-verification-example.ts
```

## Integration with Reputation Calculator

The `ReputationCalculator` now supports safety scores:

```typescript
const reputation = await reputationCalculator.calculateReputation({
  contributions: [...],
  algorithmWeights: {...},
  timeDecayFactor: 0.01,
  userId: creatorId,
  includeSafetyScore: true, // Enable Guardian safety score
});

// Result includes:
// - reputation.overall: Base reputation score
// - reputation.safetyScore: Guardian safety score (0-1)
// - reputation.combinedScore: overall * (0.7 + 0.3 * safetyScore)
```

The combined score formula ensures safety has meaningful impact (30% weight) while preserving reputation value (70% weight).

## Future Enhancements

- Real-time webhook integration
- Batch verification API
- Advanced fingerprinting algorithms
- Cross-platform content tracking
- Appeal and moderation workflows
- Integration with x402 payments for premium safety feeds

## References

- [Umanitek Guardian](https://umanitek.ai)
- [OriginTrail DKG](https://origintrail.io)
- [Videntifier Partnership](https://umanitek.ai)
- [ICMEC Partnership](https://umanitek.ai)

