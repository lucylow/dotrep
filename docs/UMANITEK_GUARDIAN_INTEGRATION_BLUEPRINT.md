# Umanitek Guardian Integration - Technical Blueprint

This document provides the complete technical implementation guide for integrating **Umanitek Guardian** into the DotRep three-layer trust architecture for the Social-Graph Reputation system.

## 🎯 Overview

Umanitek Guardian acts as a verifiable **truth and safety oracle** for the system. It provides content and identity verification against a decentralized database of known harmful material, all while preserving privacy through fingerprinting technology.

## 📊 Three-Layer Architecture Integration

### 🤖 Agent Layer: The "Safety Inspector" MCP Server

The MCP server wraps the Umanitek Guardian API, allowing AI agents to easily request content verification.

**Location**: `dotrep-v2/mcp-server/reputation-mcp.ts`

**Core MCP Tools:**

1. **`verify_content`**: Primary tool for checking content
   - Parameters:
     - `content_url` (required): URL of content to verify
     - `content_type` (optional): 'image' | 'video' | 'text' (default: 'image')
     - `check_type` (optional): 'deepfake' | 'csam' | 'misinformation' | 'illicit' | 'all' (default: 'all')
   - Returns:
     - `status`: 'verified' | 'flagged' | 'pending' | 'error'
     - `confidence`: 0-1 confidence score
     - `matches`: Array of matched harmful content
     - `recommendedAction`: 'flag' | 'takedown' | 'monitor' | 'allow'
     - `evidenceUAL`: UAL of the verification report on DKG

2. **`create_verification_community_note`**: Automates publishing verification results to DKG
   - Parameters:
     - `target_ual` (required): UAL of the content being verified
     - `verification_result` (required): Result from `verify_content`
     - `author` (optional): Author DID (default: 'did:dkg:umanitek-guardian')
   - Returns:
     - `ual`: UAL of the published Community Note
     - `note`: The Community Note JSON-LD object

3. **`get_creator_safety_score`**: Get safety score for a creator
   - Parameters:
     - `creator_id` (required): Creator account ID or DID
   - Returns:
     - `safetyScore`: 0-1 safety score
     - `totalVerifications`: Total number of verifications
     - `flaggedCount`: Number of flagged items
     - `averageConfidence`: Average confidence of verifications

**Implementation Files:**
- `dotrep-v2/server/_core/guardianApi.ts` - Guardian API client
- `dotrep-v2/mcp-server/reputation-mcp.ts` - MCP tool handlers

### 🧠 Knowledge Layer: Verifiable Safety Data on DKG

Guardian's outputs become verifiable Knowledge Assets that enrich the social graph.

**Key Knowledge Asset Schemas:**

1. **Content Verification Report** (`templates/content_verification_report.jsonld`)
   ```json
   {
     "@type": "guardian:ContentVerificationReport",
     "@id": "ual:dkg:verification-report:abc123",
     "dateCreated": "2025-11-27T10:30:00Z",
     "about": "https://socialplatform.com/post/12345",
     "generatedBy": {
       "@id": "did:dkg:umanitek-guardian",
       "@type": "guardian:GuardianAgent"
     },
     "verificationResult": {
       "confidence": 0.94,
       "matchFound": true,
       "matchType": "deepfake",
       "originalFingerprint": "hex_string_of_fingerprint"
     }
   }
   ```

2. **Enhanced Creator Profile** (`templates/trusted_user_profile.jsonld`)
   ```json
   {
     "@type": "dotrep:TrustedUserProfile",
     "creator": "did:dkg:user123",
     "reputationMetrics": {
       "overallScore": 0.85,
       "safetyScore": 0.92,
       "engagementQuality": 0.81,
       "totalVerifications": 15
     },
     "verificationHistory": [
       {
         "report": "ual:dkg:verification-report:abc123",
         "outcome": "flagged",
         "impactOnReputation": -5
       }
     ]
   }
   ```

**SPARQL Query for Safety Insights:**

Find creators with high safety scores for premium campaigns:
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

**Implementation Files:**
- `dotrep-v2/dkg-integration/guardian-verification.ts` - Verification service
- `templates/content_verification_report.jsonld` - Verification report template
- `templates/trusted_user_profile.jsonld` - Enhanced profile template

### 🔗 Trust Layer: Enforcing Consequences with Verifiable Proof

Guardian's verifiable outputs directly impact the economic and reputational layer.

**1. Staking and Slashing:**

When a creator's content is flagged by Guardian with high confidence, slashing can be triggered.

**Implementation**: `dotrep-v2/server/_core/polkadotApi.ts`

```typescript
async function evaluateGuardianFlag(verificationUAL, creatorDID) {
  // 1. Fetch the verification report from the DKG
  const report = await dkg.getAsset(verificationUAL);
  
  // 2. Check if it meets slashing criteria
  if (report.verificationResult.confidence > 0.85 && 
      report.verificationResult.matchType === "deepfake") {
    
    // 3. Execute slash on NeuroWeb
    const tx = api.tx.stakingModule.slashStake(
      creatorDID,
      "1000000000000000000", // 1 TRAC
      `Deepfake violation: ${verificationUAL}`
    );
    await tx.signAndSend(slasherAccount);
  }
}
```

**Slashing Criteria:**
- High confidence (>0.85)
- Severe violation (CSAM, illicit) OR repeated deepfake violations
- Slash amount: 1 TRAC (1000000000000000000) for severe violations

**2. x402 for Premium Safety Feeds:**

The x402 protocol monetizes access to a "Certified Safe Creator" list built using Guardian's data.

**Endpoint**: `GET /api/verified-creators` (x402 protected)

**Implementation**: `apps/x402/server.js`

```javascript
app.get('/api/verified-creators', x402.middleware(10), async (req, res) => {
  // 10 USDC payment required
  const safeCreators = await runSparqlQuery(SAFETY_QUERY);
  res.json(safeCreators);
});
```

**Payment Flow:**
1. Client requests `/api/verified-creators`
2. Server responds with HTTP 402 Payment Required
3. Client includes `X-Payment-Proof` header with payment transaction
4. Server validates proof and returns safe creators list
5. Server publishes ReceiptAsset to DKG

## 🚀 Implementation Strategy

### 1. Build the MCP Server First

The "Safety Inspector" MCP server is implemented with mocked `call_umanitek_guardian()` functions. This demonstrates the architecture and agent integration cleanly.

**Status**: ✅ Complete
- Guardian API client with mock mode (`dotrep-v2/server/_core/guardianApi.ts`)
- MCP tools implemented (`dotrep-v2/mcp-server/reputation-mcp.ts`)
- Graceful fallback to mock mode if API unavailable

### 2. Generate Real Knowledge Assets

Even with a mock, **real JSON-LD Community Notes and Verification Reports are published to the DKG Testnet**. This proves the verifiable data layer works.

**Status**: ✅ Complete
- Verification report publishing (`dotrep-v2/dkg-integration/guardian-verification.ts`)
- Community Note creation from verification results
- JSON-LD templates for all asset types

### 3. Show the Complete Flow

The demo clearly shows:
- ✅ An agent using the MCP tool to "verify" content
- ✅ The resulting Knowledge Asset being published to the DKG and its UAL being returned
- ✅ A subsequent SPARQL query that fetches this data to update a user's reputation score
- ✅ Slashing functionality for severe violations
- ✅ x402 premium safety feed endpoint

### 4. Reach Out to Umanitek

Parallel to building, use the contact form on [umanitek.ai](https://umanitek.ai) to inquire about hackathon API access or test credentials. Mentioning the specific hackathon might help.

## 📁 File Structure

```
dotrep/
├── dotrep-v2/
│   ├── server/_core/
│   │   ├── guardianApi.ts          # Guardian API client
│   │   └── polkadotApi.ts          # Slashing functionality
│   ├── dkg-integration/
│   │   └── guardian-verification.ts # Verification service
│   └── mcp-server/
│       └── reputation-mcp.ts       # MCP tools
├── apps/x402/
│   └── server.js                    # Premium safety feed endpoint
└── templates/
    ├── content_verification_report.jsonld
    └── trusted_user_profile.jsonld
```

## 🔧 Configuration

### Environment Variables

```bash
# Guardian API Configuration
UMANITEK_GUARDIAN_API_KEY=your_api_key_here
UMANITEK_GUARDIAN_API_URL=https://api.umanitek.ai/v1

# Mock Mode (for development/demo)
GUARDIAN_USE_MOCK=true
GUARDIAN_FALLBACK_TO_MOCK=true

# x402 Configuration
X402_RECIPIENT=0x0000000000000000000000000000000000000000
```

## 📝 Usage Examples

### Example 1: Verify Content via MCP

```typescript
// Agent calls MCP tool
const result = await mcp.callTool('verify_content', {
  content_url: 'https://example.com/image.jpg',
  content_type: 'image',
  check_type: 'all'
});

// Result:
// {
//   status: 'flagged',
//   confidence: 0.94,
//   matches: [...],
//   recommendedAction: 'takedown',
//   evidenceUAL: 'ual:dkg:guardian-verification:abc123'
// }
```

### Example 2: Publish Verification Report

```typescript
const service = getGuardianVerificationService();
const report = await service.publishVerificationReport(
  'https://example.com/content',
  'did:dkg:creator:123',
  verificationResult,
  2 // epochs
);

// Returns: { ual: 'ual:dkg:verification-report:...', ... }
```

### Example 3: Get Creator Safety Score

```typescript
const safetyScore = await service.calculateCreatorSafetyScore('did:dkg:creator:123');

// Returns:
// {
//   safetyScore: 0.92,
//   totalVerifications: 15,
//   flaggedCount: 1,
//   averageConfidence: 0.88
// }
```

### Example 4: Access Premium Safety Feed (x402)

```bash
# Request without payment
curl http://localhost:4001/api/verified-creators

# Response: HTTP 402 Payment Required
# {
#   "error": "Payment Required",
#   "paymentRequest": {
#     "amount": "10",
#     "token": "USDC",
#     "recipient": "0x...",
#     "resourceUAL": "urn:ual:trusted:feed:verified-creators"
#   }
# }

# Request with payment proof
curl -H "X-Payment-Proof: {\"tx\":\"0x...\",\"signed_by\":\"did:...\"}" \
     http://localhost:4001/api/verified-creators

# Response: List of safe creators
```

## 🎯 Integration Benefits

By integrating Umanitek Guardian this way, the system directly leverages a production-grade system for detecting harmful content, providing a powerful "digital immune system" for the social graph reputation marketplace.

**Key Benefits:**
1. **Privacy-Preserving**: Uses fingerprinting, not raw media
2. **Verifiable**: All results published as Knowledge Assets on DKG
3. **Automated Enforcement**: High-confidence flags trigger slashing
4. **Reputation Impact**: Safety scores integrated into reputation calculations
5. **Premium Access**: x402 monetizes access to verified safe creators

## 🔗 References

- [Umanitek Guardian](https://umanitek.ai)
- [OriginTrail DKG](https://origintrail.io)
- [Videntifier Partnership](https://umanitek.ai)
- [Model Context Protocol](https://modelcontextprotocol.io)

