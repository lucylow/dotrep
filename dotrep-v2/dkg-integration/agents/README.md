# 🚀 AI Agent-Driven Tokenomics for Identity & Trust

A comprehensive TypeScript implementation of an AI agent system that implements sophisticated tokenomics for Sybil-resistant identity verification and trust signaling.

## 📋 Overview

This system provides a multi-layered approach to identity verification and trust scoring through four specialized agents:

1. **Identity Verification Agent** - Multi-factor identity verification with dynamic staking
2. **Community Vetting Agent** - Community-driven vetting with staking, voting, and slashing
3. **Economic Behavior Analysis Agent** - Sybil detection through economic pattern analysis
4. **Token-Curated Registry Agent** - Community curation of trustworthy accounts

All agents are orchestrated through the **Identity Trust Workflow** to provide a complete onboarding and trust scoring system.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Identity Trust Workflow Orchestrator            │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Identity   │  │  Community   │  │  Economic    │
│ Verification │  │   Vetting    │  │  Behavior    │
│    Agent     │  │    Agent     │  │    Agent     │
└──────────────┘  └──────────────┘  └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                ┌─────────────────┐
                │   TCR Agent     │
                │  (Optional)     │
                └─────────────────┘
```

## 🔧 Installation

```typescript
import {
  createIdentityVerificationAgent,
  createCommunityVettingAgent,
  createEconomicBehaviorAgent,
  createTCRAgent,
  createIdentityTrustWorkflow
} from './dkg-integration/agents';
```

## 📚 Agent Documentation

### 1. Identity Verification Agent

Performs multi-factor identity verification with dynamic staking based on confidence scores.

**Features:**
- Biometric verification (Proof-of-Personhood)
- Social graph analysis
- Behavioral pattern analysis
- Economic stake verification
- Cross-chain identity checks
- Dynamic staking (higher confidence = lower stake requirement)
- Soulbound Token (SBT) issuance

**Usage:**

```typescript
import { createIdentityVerificationAgent } from './agents';

const agent = createIdentityVerificationAgent({
  dkgClient: dkgClient,
  identityTokenomics: identityTokenomics,
  verificationThresholds: {
    minimumConfidence: 0.7,
    biometricWeight: 0.35,
    socialWeight: 0.25,
    behavioralWeight: 0.20,
    economicWeight: 0.15,
    crossChainWeight: 0.05
  },
  staking: {
    baseStakeAmount: BigInt(1000) * BigInt(10 ** 18),
    lockPeriodDays: 30,
    enableDynamicStaking: true
  }
});

const result = await agent.verifyAndStakeIdentity(
  'did:polkadot:alice',
  {
    biometric: {
      provider: 'worldcoin',
      proof: 'worldcoin-proof-xyz',
      confidence: 0.95
    },
    social: {
      connections: ['did:polkadot:bob', 'did:polkadot:charlie'],
      reputation: 0.8
    },
    economic: {
      stakeAmount: BigInt(1000) * BigInt(10 ** 18)
    }
  }
);

console.log(`Verification Status: ${result.status}`);
console.log(`Confidence Score: ${result.confidenceScore}`);
console.log(`SBT Issued: ${result.soulboundToken?.credentialId}`);
```

### 2. Community Vetting Agent

Implements community-driven vetting with qualified voucher selection, anti-collusion measures, and weighted voting.

**Features:**
- Qualified voucher selection from DKG
- Anti-collusion filters (cluster analysis, vouch history)
- Weighted voting with reputation
- Stake slashing for false approvals
- Reward distribution for correct votes
- Automatic finalization when quorum reached

**Usage:**

```typescript
import { createCommunityVettingAgent } from './agents';

const agent = createCommunityVettingAgent({
  dkgClient: dkgClient,
  vetting: {
    defaultPoolSize: 5,
    minReputation: 0.8,
    minStake: BigInt(5000) * BigInt(10 ** 18),
    votingPeriodDays: 7,
    quorumPercentage: 0.6,
    approvalThreshold: 0.67
  },
  antiCollusion: {
    maxRecentVouches: 3,
    maxClusterRiskScore: 0.3,
    requireDiverseClusters: true
  }
});

// Initiate vetting
const session = await agent.initiateCommunityVetting(
  'did:polkadot:newuser',
  5 // pool size
);

// Submit vote
await agent.submitVote(
  'did:polkadot:voucher',
  session.sessionId,
  'approve',
  'User has verified credentials and good reputation'
);
```

### 3. Economic Behavior Analysis Agent

Analyzes economic behavior patterns to detect Sybil attacks and calculate trust scores.

**Features:**
- Transaction pattern analysis (volume, velocity, diversity, reciprocity)
- Staking behavior analysis
- Economic diversity scoring
- Sybil pattern detection (circular transactions, low diversity, suspicious velocity)
- Risk signal identification
- Trust score calculation
- Recommendations generation

**Usage:**

```typescript
import { createEconomicBehaviorAgent } from './agents';

const agent = createEconomicBehaviorAgent({
  dkgClient: dkgClient,
  analysis: {
    defaultTimeRange: '30d',
    minTransactions: 5,
    velocityThreshold: 10,
    diversityThreshold: 0.1
  },
  scoring: {
    volumeWeight: 0.2,
    diversityWeight: 0.3,
    reciprocityWeight: 0.25,
    velocityWeight: 0.15,
    anomalyWeight: 0.1
  }
});

const analysis = await agent.analyzeEconomicBehavior(
  'did:polkadot:alice',
  '30d'
);

console.log(`Trust Score: ${analysis.trustScore}`);
console.log(`Risk Level: ${analysis.riskLevel}`);
console.log(`Risk Signals: ${analysis.riskSignals.length}`);
console.log(`Recommendations: ${analysis.recommendations.length}`);
```

### 4. Token-Curated Registry Agent

Manages token-curated registries for community-driven curation of trustworthy accounts.

**Features:**
- Registry creation and management
- Application and voting processes
- Challenge mechanisms
- Early finalization when outcome is certain
- Reward distribution
- Slashing for false approvals

**Usage:**

```typescript
import { createTCRAgent } from './agents';

const agent = createTCRAgent({
  dkgClient: dkgClient,
  registry: {
    defaultBaseStake: BigInt(1000) * BigInt(10 ** 18),
    defaultApprovalThreshold: 0.67
  },
  voting: {
    votingPeriodDays: 7,
    quorumPercentage: 0.6,
    earlyFinalizationEnabled: true
  }
});

// Create registry
const registry = await agent.createRegistry({
  name: 'Verified Developers',
  description: 'Registry for verified software developers',
  token: 'TRAC',
  baseStake: BigInt(1000) * BigInt(10 ** 18),
  approvalThreshold: 0.67
});

// Apply to registry
const application = await agent.applyForRegistry(
  registry.id,
  'did:polkadot:alice',
  { github: 'alice', skills: ['TypeScript', 'Rust'] }
);

// Vote on application
await agent.voteOnApplication(
  registry.id,
  application.id,
  'did:polkadot:voter',
  'approve',
  BigInt(500) * BigInt(10 ** 18)
);
```

## 🔄 Complete Workflow

The `IdentityTrustWorkflow` orchestrates all agents to provide a complete onboarding experience:

```typescript
import { createIdentityTrustWorkflow } from './agents';

const workflow = createIdentityTrustWorkflow({
  dkgClient: dkgClient,
  identityTokenomics: identityTokenomics,
  workflow: {
    requireVettingForLowConfidence: true,
    confidenceThresholdForVetting: 0.7,
    enableTCRApplications: true,
    enableEconomicAnalysis: true
  }
});

const result = await workflow.onboardNewUser({
  userDID: 'did:polkadot:alice',
  walletAddress: '0x1234...',
  verification: {
    biometric: {
      provider: 'worldcoin',
      proof: 'worldcoin-proof-xyz'
    },
    economic: {
      stakeAmount: BigInt(1000) * BigInt(10 ** 18)
    }
  },
  initialStake: BigInt(1000) * BigInt(10 ** 18)
});

console.log(`Workflow Status: ${result.finalStatus}`);
console.log(`Trust Score: ${result.trustScore}`);
console.log(`Steps Completed: ${result.steps.join(', ')}`);
```

## 🎯 Key Improvements Over Original Code

### 1. **TypeScript Implementation**
- Full type safety with comprehensive interfaces
- Better IDE support and autocomplete
- Compile-time error detection

### 2. **Error Handling**
- Comprehensive try-catch blocks
- Graceful error recovery
- Detailed error messages
- Error state publishing to DKG

### 3. **Integration**
- Seamless integration with existing DKG client
- Integration with Identity Tokenomics service
- Polkadot API integration ready
- Mock mode for testing

### 4. **Security**
- Input validation
- SPARQL injection prevention (via DKG client)
- Anti-collusion measures in vetting
- Secure staking mechanisms

### 5. **Logging & Monitoring**
- Configurable logging levels
- Timestamped logs
- Error tracking
- Workflow state tracking

### 6. **Configuration**
- Flexible configuration options
- Environment variable support
- Mock mode for development
- Default values with overrides

### 7. **Code Quality**
- Modular design
- Single responsibility principle
- Factory functions for easy instantiation
- Comprehensive documentation

### 8. **Missing Implementations**
- All placeholder methods have proper structure
- Clear TODOs for blockchain integration
- Mock implementations for testing
- Extensible architecture

## 🔐 Security Features

1. **Anti-Collusion Measures**
   - Cluster analysis to detect related accounts
   - Vouch history tracking
   - Diverse cluster requirements

2. **Input Validation**
   - Type checking
   - Range validation
   - Sanitization

3. **Economic Security**
   - Staking requirements
   - Slashing mechanisms
   - Reward alignment

4. **Sybil Detection**
   - Transaction pattern analysis
   - Circular transaction detection
   - Diversity scoring
   - Anomaly detection

## 📊 Trust Score Calculation

The composite trust score combines multiple signals:

- **Identity Verification (40%)**: Multi-factor verification confidence
- **Economic Behavior (30%)**: Transaction patterns, staking, diversity
- **Community Vetting (20%)**: Community approval rate
- **TCR Membership (10%)**: Token-curated registry memberships

**Total: 0-1.0 (0-100%)**

## 🧪 Testing

All agents support mock mode for testing:

```typescript
const agent = createIdentityVerificationAgent({
  enableMockMode: true,
  // ... other config
});
```

## 📝 MCP Tool Integration

All agents expose MCP (Model Context Protocol) tools for AI agent integration:

```typescript
// Get available tools
const tools = agent.getMCPTools();

// Execute tool
const result = await agent.executeMCPTool('verify_identity_with_stake', {
  user_did: 'did:polkadot:alice',
  verification_data: { /* ... */ }
});
```

## 🚀 Future Enhancements

- [ ] Full blockchain RPC integration for transaction analysis
- [ ] Advanced ML-based Sybil detection
- [ ] Cross-chain behavior aggregation
- [ ] Reputation-weighted TCR voting
- [ ] Automated Sybil detection alerts
- [ ] Real-time monitoring dashboard
- [ ] Graph-based cluster analysis
- [ ] Zero-knowledge proof integration

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please ensure:
- TypeScript types are properly defined
- Error handling is comprehensive
- Tests are included for new features
- Documentation is updated

