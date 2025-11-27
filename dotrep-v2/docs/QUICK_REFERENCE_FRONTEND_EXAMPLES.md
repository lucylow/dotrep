# Quick Reference: Frontend Examples

## 🎯 Main Pages for DKG + Social Reputation + AI Agents

| Route | Page | Key Features |
|-------|------|--------------|
| `/knowledge-assets` | KnowledgeAssetsPage | ✅ Verifiable on-chain knowledge assets<br>✅ AI agent interactions<br>✅ Social reputation integration<br>✅ JSON-LD visualization |
| `/dkg-interaction` | DKGInteractionPage | ✅ Social reputation profiles<br>✅ Publish/Query DKG assets<br>✅ Social graph visualization<br>✅ Campaign participation |
| `/ai-agents-dkg-demo` | AIAgentsDKGDemoPage | ✅ Multi-agent orchestration<br>✅ DKG integration<br>✅ Workflow execution |
| `/social-reputation-dashboard` | SocialReputationDashboard | ✅ Social reputation analysis<br>✅ Multi-agent queries<br>✅ DKG real-time data |

---

## 📊 Mock Data Quick Access

### Social Reputation Profiles
**File:** `dotrep-v2/client/src/data/socialReputationMockData.ts`

**3 Profiles Available:**
1. **Tech Guru Alex**
   - UAL: `did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678`
   - Reputation: 89% | Followers: 125K
   - Platforms: Twitter, LinkedIn, YouTube

2. **Crypto Insider**
   - UAL: `did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12`
   - Reputation: 76% | Followers: 89K
   - Platforms: Twitter, YouTube, TikTok

3. **Blockchain Developer**
   - UAL: `did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432`
   - Reputation: 92% | Followers: 45K
   - Platforms: LinkedIn, Twitter, GitHub

### DKG Knowledge Assets
**File:** `dotrep-v2/client/src/data/dkgSocialReputationMockData.ts`

**5 Assets Available:**
- 3 Social Reputation Profile assets (JSON-LD format)
- 1 Campaign Participation asset
- 1 Social Connection asset

All assets include:
- Valid JSON-LD/RDF structure
- Blockchain anchoring metadata
- Linked assets (cross-references)
- Verifiable credentials

---

## 🤖 AI Agents Available

| Agent | Purpose | Status |
|-------|---------|--------|
| Trust Navigator | Real-time reputation discovery | ✅ Active |
| Sybil Detective | Fake account detection | ✅ Active |
| Contract Negotiator | Autonomous deal-making | ✅ Active |
| Campaign Optimizer | ROI maximization | ✅ Active |
| Trust Auditor | Continuous verification | ✅ Active |
| Misinformation Detection | Claim verification | ✅ Active |
| Truth Verification | Multi-source evidence | ✅ Active |

---

## 🚀 Quick Start Examples

### Example 1: View Social Reputation Profile
```
1. Navigate to: /dkg-interaction
2. Click: "Social Profiles" tab
3. Click on: "Tech Guru Alex"
4. View: Reputation metrics, social metrics, provenance
```

### Example 2: Query Knowledge Asset
```
1. Navigate to: /knowledge-assets
2. Click: "Query Assets" tab
3. Enter UAL: did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678
4. Click: "Query with AI Agent"
5. View: Agent interaction result
```

### Example 3: View Social Graph
```
1. Navigate to: /dkg-interaction
2. Click: "Social Graph" tab
3. Select: "Tech Guru Alex"
4. View: Connections and campaign history
```

### Example 4: AI Agent Workflow
```
1. Navigate to: /ai-agents-dkg-demo
2. Click: "Create Workflow"
3. Select: "Social Reputation Analysis"
4. Execute: Watch agents coordinate
5. View: DKG query results
```

---

## 📁 File Locations

### Frontend Pages
- `dotrep-v2/client/src/pages/KnowledgeAssetsPage.tsx`
- `dotrep-v2/client/src/pages/DKGInteractionPage.tsx`
- `dotrep-v2/client/src/pages/AIAgentsDKGDemoPage.tsx`
- `dotrep-v2/client/src/pages/SocialReputationDashboard.tsx`

### Mock Data
- `dotrep-v2/client/src/data/socialReputationMockData.ts`
- `dotrep-v2/client/src/data/dkgSocialReputationMockData.ts`
- `dotrep-v2/client/src/data/enhancedMockData.ts`

### AI Agent Components
- `dotrep-v2/client/src/components/agents/MultiAgentOrchestrator.tsx`
- `dotrep-v2/client/src/components/agents/SocialReputationDashboard.tsx`
- `dotrep-v2/client/src/components/agents/ThreeLayerArchitecture.tsx`

---

## 🔍 What Each Page Demonstrates

### Knowledge Assets Page
- ✅ Decentralized knowledge graphs (DKG)
- ✅ On-chain verification (Polkadot)
- ✅ AI agents querying assets
- ✅ Social reputation integration
- ✅ JSON-LD structure

### DKG Interaction Page
- ✅ Social reputation profiles
- ✅ DKG publish/query operations
- ✅ Social graph connections
- ✅ Campaign participation
- ✅ Provenance & auditability

### AI Agents Demo Page
- ✅ Multi-agent orchestration
- ✅ DKG edge node integration
- ✅ Workflow coordination
- ✅ Real-time agent status

---

## 💡 Key Concepts

### UAL (Uniform Asset Locator)
Format: `did:dkg:otp:20430:0x...`
- Used to uniquely identify DKG knowledge assets
- Can be queried across the DKG network
- Links to blockchain anchors

### JSON-LD Structure
- W3C standards compliant
- Uses `@context`, `@type`, `@id`
- Includes ontologies: `dotrep:`, `dkg:`, `neuroweb:`
- Supports verifiable credentials

### Social Reputation Metrics
- **Overall Score**: 0-1 (aggregate reputation)
- **Social Rank**: 0-1 (social graph position)
- **Economic Stake**: 0-1 (financial commitment)
- **Endorsement Quality**: 0-1 (peer validation)
- **Temporal Consistency**: 0-1 (time-based stability)

---

## 📖 Full Documentation

See `FRONTEND_EXAMPLES_GUIDE.md` for comprehensive documentation.

