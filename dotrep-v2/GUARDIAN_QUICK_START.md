# Guardian Integration Quick Start

## 🚀 Quick Start (5 minutes)

### 1. Verify Content

```typescript
import { getGuardianApi } from './server/_core/guardianApi';

const guardianApi = getGuardianApi();
const result = await guardianApi.verifyContent({
  contentUrl: 'https://example.com/image.jpg',
  contentType: 'image',
  checkType: 'all',
});

console.log(result.status); // 'verified' | 'flagged'
console.log(result.confidence); // 0-1
```

### 2. Publish to DKG

```typescript
import { getGuardianVerificationService } from './dkg-integration/guardian-verification';

const service = getGuardianVerificationService();
const report = await service.publishVerificationReport(
  contentUrl,
  creatorId,
  verificationResult
);

console.log(report.ual); // DKG UAL
```

### 3. Get Safety Score

```typescript
const safetyScore = await service.calculateCreatorSafetyScore(creatorId);
console.log(safetyScore.safetyScore); // 0-1
```

### 4. Use in Reputation

```typescript
import { ReputationCalculator } from './server/_core/reputationCalculator';

const calculator = new ReputationCalculator();
const reputation = await calculator.calculateReputation({
  contributions: [...],
  algorithmWeights: {...},
  timeDecayFactor: 0.01,
  userId: creatorId,
  includeSafetyScore: true, // ✨ Enable Guardian safety
});

console.log(reputation.combinedScore); // Reputation * Safety
```

## 📋 MCP Tools

Use these tools in your AI agents:

### `verify_content`
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

### `get_creator_safety_score`
```json
{
  "name": "get_creator_safety_score",
  "arguments": {
    "creator_id": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Optional: Real API (defaults to mock mode)
UMANITEK_GUARDIAN_API_KEY=your_key
UMANITEK_GUARDIAN_API_URL=https://api.umanitek.ai/v1

# Mock mode (default: true)
GUARDIAN_USE_MOCK=true
GUARDIAN_FALLBACK_TO_MOCK=true
```

### Mock Mode

Works out of the box! No API key needed for demos.

- Deterministic results (same content = same result)
- Realistic confidence scores
- Full workflow demonstration

## 📊 What Gets Tracked

- ✅ Total verifications
- ✅ Flagged vs clean content
- ✅ Flags by type (deepfake, CSAM, illicit, misinformation)
- ✅ Average confidence
- ✅ Takedowns executed
- ✅ Slashes executed
- ✅ Total slashed amount

View metrics:
```typescript
import { getImpactMetrics } from './server/_core/impactMetrics';
const metrics = getImpactMetrics();
console.log(metrics.getMetrics().guardian);
```

## 🎯 Workflow

```
Content Upload
    ↓
Guardian Verification
    ↓
Publish to DKG (Knowledge Asset)
    ↓
Update Safety Score
    ↓
Impact Reputation
    ↓
Enforcement (if flagged)
    ├─ High confidence + severe → Slashing
    ├─ Medium confidence → Flagging
    └─ Low confidence → Monitoring
```

## 📚 Full Example

See `dkg-integration/examples/guardian-verification-example.ts` for complete example.

## 🔗 Learn More

- Full documentation: `GUARDIAN_INTEGRATION.md`
- Schema: `dkg-integration/schemas/guardian-verification-schema.json`
- API Client: `server/_core/guardianApi.ts`
- Verification Service: `dkg-integration/guardian-verification.ts`

