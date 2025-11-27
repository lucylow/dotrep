# Frontend Examples Guide: Decentralized Knowledge Graphs for Social Reputation

This guide provides a comprehensive overview of frontend examples demonstrating decentralized knowledge graphs (DKG) for social reputation, mock data, and working AI agents.

## 📍 Key Frontend Pages

### 1. **Knowledge Assets Page** (`/knowledge-assets`)
**File:** `dotrep-v2/client/src/pages/KnowledgeAssetsPage.tsx`

**Features:**
- ✅ Verifiable on-chain knowledge assets published to OriginTrail DKG
- ✅ On-chain verification via Polkadot parachains (blockchain anchoring)
- ✅ AI agents querying and using knowledge assets
- ✅ Social reputation integration
- ✅ JSON-LD structure visualization
- ✅ Interactive asset browsing and querying

**What it demonstrates:**
- Knowledge assets with UALs (Uniform Asset Locators)
- On-chain verification with merkle roots and content hashes
- AI agent interactions (query, verify, publish, analyze)
- Social reputation profiles linked to knowledge assets
- Real-time DKG queries

**Mock Data Used:**
- `mockDKGAssets` from `@/data/enhancedMockData`
- `mockSocialReputationProfiles` from `@/data/socialReputationMockData`

---

### 2. **DKG Interaction Page** (`/dkg-interaction`)
**File:** `dotrep-v2/client/src/pages/DKGInteractionPage.tsx`

**Features:**
- ✅ **Social Profiles Tab**: Browse and search social reputation profiles
- ✅ **Publish Asset Tab**: Publish reputation assets to DKG
- ✅ **Query by UAL Tab**: Query knowledge assets using Uniform Asset Locators
- ✅ **Search Assets Tab**: Search for assets by developer ID or UAL
- ✅ **Social Graph Tab**: Visualize social network connections
- ✅ **History Tab**: View publication and query history

**What it demonstrates:**
- Complete DKG interaction workflow
- Social reputation profiles with comprehensive metrics
- Social graph connections (follows, interactsWith, endorses, collaborates)
- Campaign participation history
- Provenance, authorship, and auditability data

**Mock Data Used:**
- `mockSocialReputationProfiles` - 3 influencer profiles
- `mockSocialConnections` - Social network relationships
- `mockCampaignParticipations` - Campaign history
- `mockDKGAssets` - Published knowledge assets

---

### 3. **AI Agents DKG Demo Page** (`/ai-agents-dkg-demo`)
**File:** `dotrep-v2/client/src/pages/AIAgentsDKGDemoPage.tsx`

**Features:**
- ✅ Multi-agent orchestration
- ✅ DKG edge node integration
- ✅ Real-time agent status monitoring
- ✅ Social reputation analysis workflows

**What it demonstrates:**
- AI agents working with DKG knowledge assets
- Multi-agent coordination for complex tasks
- Real-time DKG queries during workflow execution

---

### 4. **Social Reputation Dashboard** (`/social-reputation-dashboard`)
**File:** `dotrep-v2/client/src/pages/SocialReputationDashboard.tsx`

**Features:**
- ✅ Social reputation profiles overview
- ✅ Social graph visualization
- ✅ Multi-agent reputation analysis
- ✅ DKG integration for real-time queries
- ✅ Reputation trends and insights

---

## 📊 Mock Data Files

### 1. **Social Reputation Mock Data**
**File:** `dotrep-v2/client/src/data/socialReputationMockData.ts`

**Contains:**
- 3 social reputation profiles:
  - **Tech Guru Alex** - High reputation (89%), 125K followers
  - **Crypto Insider** - Medium reputation (76%), 89K followers
  - **Blockchain Developer** - Top reputation (92%), 45K followers
- Social connections (follows, interactsWith, endorses, collaborates)
- Campaign participations with performance metrics
- Provenance, authorship, and auditability data

**Key Interfaces:**
```typescript
interface SocialReputationProfile {
  did: string;
  ual: string; // DKG Uniform Asset Locator
  username: string;
  displayName: string;
  reputationMetrics: {
    overallScore: number;
    socialRank: number;
    economicStake: number;
    endorsementQuality: number;
    temporalConsistency: number;
  };
  socialMetrics: {
    followerCount: number;
    engagementRate: number;
    totalPosts: number;
  };
  sybilResistance: {
    sybilRisk: number;
    connectionDiversity: number;
  };
  provenance?: ProvenanceData;
  authorship?: AuthorshipData;
  auditability?: AuditabilityData;
}
```

---

### 2. **DKG Social Reputation Knowledge Assets**
**File:** `dotrep-v2/client/src/data/dkgSocialReputationMockData.ts`

**Contains:**
- Valid JSON-LD/RDF format knowledge assets (W3C standards compliant)
- Discoverable assets with UALs
- Linked knowledge assets (cross-referenced)
- Blockchain anchoring metadata (NeuroWeb/Polkadot)

**Key Assets:**
- `socialReputationAsset1` - Tech Guru Alex profile
- `socialReputationAsset2` - Crypto Insider profile
- `socialReputationAsset3` - Blockchain Developer profile
- `campaignAsset1` - Campaign participation asset
- `socialConnectionAsset1` - Social connection relationship

**JSON-LD Structure:**
- Uses `@context`, `@type`, `@id` (W3C JSON-LD 1.1)
- Includes `dotrep:`, `dkg:`, `neuroweb:` ontologies
- Verifiable credentials (VC) with proofs
- Provenance tracking (PROV-O)

---

### 3. **Enhanced Mock Data**
**File:** `dotrep-v2/client/src/data/enhancedMockData.ts`

**Contains:**
- DKG assets with reputation scores
- DKG queries history
- DKG publish operations

---

## 🤖 AI Agent Components

### 1. **Multi-Agent Orchestrator**
**File:** `dotrep-v2/client/src/components/agents/MultiAgentOrchestrator.tsx`

**Features:**
- Workflow coordination between multiple AI agents
- Agent status monitoring (active, task count, success rate)
- Task routing to appropriate agents
- DKG integration for real-time queries
- Visual representation of agent-to-agent communication

**Available Agents:**
- Trust Navigator Agent
- Sybil Detective Agent
- Contract Negotiator Agent
- Campaign Optimizer Agent
- Trust Auditor Agent
- Misinformation Detection Agent
- Truth Verification Agent

---

### 2. **Social Reputation Dashboard Component**
**File:** `dotrep-v2/client/src/components/agents/SocialReputationDashboard.tsx`

**Features:**
- Social reputation profiles with metrics
- Social graph visualization
- Multi-agent reputation analysis
- DKG queries for real-time data
- Reputation trends and insights

---

### 3. **Three-Layer Architecture**
**File:** `dotrep-v2/client/src/components/agents/ThreeLayerArchitecture.tsx`

**Features:**
- **Agent Layer**: 9 AI agents with MCP integration
- **Knowledge Layer**: OriginTrail DKG edge node connection
- **Trust Layer**: Polkadot Substrate + x402 micropayment metrics
- Data flow visualization between layers

---

## 🚀 How to Use

### 1. **View Knowledge Assets**
Navigate to `/knowledge-assets` to see:
- Verifiable on-chain knowledge assets
- AI agent interactions
- Social reputation integration
- On-chain verification details

### 2. **Interact with DKG**
Navigate to `/dkg-interaction` to:
- Browse social reputation profiles
- Publish new assets to DKG
- Query assets by UAL
- View social graph connections
- See campaign participation history

### 3. **Explore AI Agents**
Navigate to `/ai-agents-dkg-demo` to:
- Create multi-agent workflows
- Monitor agent status
- Execute social reputation analysis
- View DKG query results

---

## 📝 Example Workflows

### Workflow 1: Query Social Reputation Profile
1. Go to `/dkg-interaction`
2. Click "Query by UAL" tab
3. Enter UAL: `did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678`
4. Click "Query Asset"
5. View social reputation metrics, social metrics, and sybil resistance data

### Workflow 2: Browse Social Profiles
1. Go to `/dkg-interaction`
2. Click "Social Profiles" tab
3. Browse all profiles or search by username/specialty
4. Click on a profile to view detailed information
5. See reputation metrics, social metrics, provenance, and auditability

### Workflow 3: View Social Graph
1. Go to `/dkg-interaction`
2. Click "Social Graph" tab
3. Select a profile from the list
4. View all connections (follows, interactsWith, endorses, collaborates)
5. Scroll down to see campaign participation history

### Workflow 4: AI Agent Knowledge Query
1. Go to `/knowledge-assets`
2. Click "AI Agents" tab
3. Enter a UAL in the query interface
4. Click "Query with AI Agent"
5. View the agent interaction result with reputation data

---

## 🔗 Key Data Structures

### Knowledge Asset Structure
```typescript
interface VerifiableKnowledgeAsset {
  ual: string; // Uniform Asset Locator
  developerId: string;
  reputationScore: number;
  contributions: number;
  parachain?: string;
  onChainVerified: boolean;
  blockNumber?: number;
  merkleRoot?: string;
  contentHash?: string;
  jsonLd?: any; // JSON-LD structure
  aiAgentQueries?: number;
  socialReputation?: {
    profile?: SocialReputationProfile;
    integrated: boolean;
  };
}
```

### Social Reputation Profile Structure
```typescript
interface SocialReputationProfile {
  did: string;
  ual: string; // DKG UAL
  username: string;
  displayName: string;
  reputationMetrics: {
    overallScore: number; // 0-1
    socialRank: number; // 0-1
    economicStake: number; // 0-1
    endorsementQuality: number; // 0-1
    temporalConsistency: number; // 0-1
  };
  socialMetrics: {
    followerCount: number;
    engagementRate: number;
    totalPosts: number;
  };
  sybilResistance: {
    sybilRisk: number; // 0-1 (lower is better)
    connectionDiversity: number; // 0-1
  };
  provenance?: ProvenanceData;
  authorship?: AuthorshipData;
  auditability?: AuditabilityData;
}
```

---

## 🎯 Key Features Demonstrated

1. **Decentralized Knowledge Graphs**
   - OriginTrail DKG integration
   - JSON-LD/RDF compliant assets
   - UAL-based asset discovery
   - Linked knowledge assets

2. **Social Reputation**
   - Comprehensive reputation metrics
   - Social graph connections
   - Campaign participation tracking
   - Sybil resistance indicators

3. **AI Agents**
   - Multi-agent orchestration
   - Real-time DKG queries
   - Workflow coordination
   - Agent status monitoring

4. **On-Chain Verification**
   - Polkadot parachain anchoring
   - Merkle root verification
   - Content hash validation
   - Block number tracking

5. **Mock Data**
   - Realistic social reputation profiles
   - Valid JSON-LD structures
   - Complete provenance chains
   - Auditability trails

---

## 📚 Related Documentation

- `dotrep-v2/docs/frontend/SOCIAL_REPUTATION_FRONTEND_IMPROVEMENTS.md`
- `dotrep-v2/docs/frontend/FRONTEND_AI_AGENTS_IMPROVEMENTS.md`
- `dotrep-v2/docs/frontend/MOCK_DATA_SUMMARY.md`
- `dotrep-v2/docs/frontend/FRONTEND_CROSSCHAIN_DKG_IMPROVEMENTS.md`

---

## 🛠️ Development

All mock data is located in:
- `dotrep-v2/client/src/data/socialReputationMockData.ts`
- `dotrep-v2/client/src/data/dkgSocialReputationMockData.ts`
- `dotrep-v2/client/src/data/enhancedMockData.ts`

All frontend pages are in:
- `dotrep-v2/client/src/pages/`

All AI agent components are in:
- `dotrep-v2/client/src/components/agents/`

