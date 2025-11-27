# 🚀 DKG-Based AI Agent Launcher

A comprehensive framework for launching and managing AI agents powered by the OriginTrail Decentralized Knowledge Graph (DKG). This implementation provides a complete solution for building verifiable, trustworthy AI agents with collective intelligence capabilities.

## 📋 Overview

This framework implements the **neuro-symbolic AI stack** from OriginTrail:

1. **🧠 Knowledge Base Layer (Symbolic AI)**: Structured Knowledge Assets with UALs (Uniform Asset Locators)
2. **🛡️ Trust Layer (Blockchain)**: Cryptographically secured, tamper-proof audit trail
3. **🤖 Verifiable AI Layer (Neural AI)**: Decentralized Retrieval-Augmented Generation (dRAG)

## ✨ Key Features

### Core Capabilities

- **dRAG (Decentralized RAG)**: Agents retrieve verifiable knowledge from DKG with full provenance
- **Collective Memory**: Agents share knowledge across a swarm, creating persistent, collective intelligence
- **Neuro-Symbolic Queries**: Combines structured SPARQL queries with semantic search
- **UAL Citations**: Every response includes verifiable citations to Knowledge Assets
- **Agent Orchestration**: Manage multiple agents in a coordinated swarm
- **Knowledge Sharing**: Agents publish insights to DKG for other agents to discover

### Advantages

- **Combat AI Hallucinations**: Ground responses in verifiable DKG Knowledge Assets
- **Enable Verifiable Provenance**: Every fact traceable to its blockchain source
- **Foster Collective Intelligence**: Agents learn from each other's discoveries
- **Persistent Memory**: Knowledge survives agent restarts via DKG storage

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Agent Orchestrator (Swarm)                  │
│  - Task routing and coordination                         │
│  - Collective memory queries                            │
│  - Agent lifecycle management                            │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Agent 1    │  │   Agent 2    │  │   Agent N    │
│              │  │              │  │              │
│ - dRAG       │  │ - dRAG       │  │ - dRAG       │
│ - Memory     │  │ - Memory     │  │ - Memory     │
│ - Knowledge  │  │ - Knowledge  │  │ - Knowledge  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   DKG Client     │
              │  (OriginTrail)   │
              │                  │
              │ - Knowledge      │
              │   Assets (UALs)  │
              │ - Provenance     │
              │ - Blockchain     │
              └──────────────────┘
```

## 🚀 Quick Start

### Installation

```typescript
import { createAgentLauncher, createDKGAIAgent, AgentConfig } from './dkg-integration/dkg-agent-launcher';
```

### Example 1: Launch a Single Agent

```typescript
// Configure agent for content verification
const agentConfig: AgentConfig = {
  agentId: 'content-verifier-001',
  agentName: 'Content Authenticity Verifier',
  purpose: 'Verify content authenticity using the Umanitek Guardian knowledge base',
  capabilities: [
    'content_verification',
    'provenance_checking',
    'misinformation_detection'
  ],
  dkgConfig: {
    environment: 'testnet',
    enableSigning: true
  },
  enableDRAG: true,
  enableCollectiveMemory: true,
  enableKnowledgeSharing: true,
  memoryRetentionDays: 30
};

// Create and initialize agent
const agent = createDKGAIAgent(agentConfig);
await agent.initialize();

// Process a query
const response = await agent.processQuery(
  'Verify if the claim "Polkadot supports cross-chain messaging via XCM" is accurate',
  {
    useHybrid: true,
    minProvenanceScore: 60,
    topK: 5,
    requireCitations: true
  }
);

console.log(response.response);
console.log(`Citations: ${response.citations.length}`);
console.log(`Confidence: ${(response.confidence * 100).toFixed(1)}%`);
```

### Example 2: Launch Agent Swarm

```typescript
// Create orchestrator
const orchestrator = createAgentLauncher('reputation-swarm-001');

// Launch multiple specialized agents
await orchestrator.launchAgent({
  agentId: 'reputation-analyzer-001',
  agentName: 'Reputation Analyzer',
  purpose: 'Analyze developer reputation scores',
  capabilities: ['reputation_analysis', 'pattern_detection'],
  enableDRAG: true,
  enableCollectiveMemory: true,
  enableKnowledgeSharing: true
});

await orchestrator.launchAgent({
  agentId: 'sybil-detector-001',
  agentName: 'Sybil Detector',
  purpose: 'Detect Sybil attacks',
  capabilities: ['sybil_detection', 'cluster_analysis'],
  enableDRAG: true,
  enableCollectiveMemory: true,
  enableKnowledgeSharing: true
});

// Route task to specific agent
const task = await orchestrator.routeTask({
  agentId: 'reputation-analyzer-001',
  taskType: 'query',
  input: {
    query: 'What are the top 5 developers by reputation?',
    options: { useHybrid: true, topK: 5 }
  }
});

// Query collective memory across all agents
const memories = await orchestrator.querySwarmMemory({
  query: 'reputation patterns',
  memoryTypes: ['knowledge', 'insight']
});
```

## 📚 API Reference

### `DKGAIAgent`

Main agent class for individual AI agents.

#### Methods

- **`initialize()`**: Initialize and activate the agent
- **`processQuery(query, options)`**: Process a query using dRAG
- **`storeKnowledge(knowledge)`**: Store knowledge in DKG for sharing
- **`queryCollectiveMemory(query)`**: Query memories from agent swarm
- **`getStatus()`**: Get agent status and metrics
- **`shutdown()`**: Gracefully shutdown the agent

#### Query Options

```typescript
{
  useHybrid?: boolean;           // Use neuro-symbolic hybrid query (default: true)
  minProvenanceScore?: number;   // Minimum provenance score (default: 50)
  topK?: number;                 // Number of results (default: 5)
  requireCitations?: boolean;    // Require UAL citations (default: true)
}
```

### `AgentOrchestrator`

Manages multiple agents in a swarm.

#### Methods

- **`launchAgent(config)`**: Launch a new agent
- **`getAgent(agentId)`**: Get agent by ID
- **`routeTask(task)`**: Route task to appropriate agent
- **`querySwarmMemory(query)`**: Query collective memory across swarm
- **`getStatus()`**: Get orchestrator status
- **`shutdown()`**: Shutdown all agents

## 🔧 Configuration

### Agent Configuration

```typescript
interface AgentConfig {
  agentId: string;                    // Unique agent identifier
  agentName: string;                  // Human-readable name
  purpose: string;                   // Agent's primary purpose
  capabilities: string[];             // List of capabilities
  dkgConfig?: DKGConfig;             // DKG client configuration
  enableDRAG?: boolean;              // Enable dRAG (default: true)
  enableCollectiveMemory?: boolean;  // Enable collective memory (default: true)
  memoryRetentionDays?: number;      // Memory retention period
  maxMemorySize?: number;            // Maximum memory size in bytes
  enableKnowledgeSharing?: boolean;   // Enable knowledge publishing (default: true)
  agentSwarmId?: string;            // Swarm ID for collective intelligence
}
```

### DKG Configuration

```typescript
interface DKGConfig {
  environment?: 'testnet' | 'mainnet' | 'local';
  endpoint?: string;
  blockchain?: {
    name?: string;
    publicKey?: string;
    privateKey?: string;
  };
  enableSigning?: boolean;
  enableTokenGating?: boolean;
  // ... see dkg-client-v8.ts for full options
}
```

## 🎯 Use Cases

### 1. Content Verification Agent

Verify content authenticity using knowledge bases like Umanitek Guardian:

```typescript
const verifier = createDKGAIAgent({
  agentId: 'content-verifier',
  agentName: 'Content Verifier',
  purpose: 'Verify content authenticity',
  capabilities: ['verification', 'provenance_checking'],
  enableDRAG: true
});

const result = await verifier.processQuery(
  'Is this claim verified in the Guardian knowledge base?',
  { requireCitations: true }
);
```

### 2. Reputation Analysis Swarm

Multiple agents working together to analyze reputation:

```typescript
const swarm = createAgentLauncher('reputation-swarm');

// Launch specialized agents
await swarm.launchAgent({ /* reputation analyzer */ });
await swarm.launchAgent({ /* sybil detector */ });
await swarm.launchAgent({ /* trust verifier */ });

// Agents share knowledge and collaborate
```

### 3. ElizaOS-Style Agent

Agent with persistent memory and knowledge sharing:

```typescript
const agent = createDKGAIAgent({
  agentId: 'elizaos-agent',
  agentName: 'ElizaOS-Compatible Agent',
  enableCollectiveMemory: true,
  enableKnowledgeSharing: true,
  memoryRetentionDays: 90
});

// Store interactions
await agent.storeKnowledge({
  title: 'User Interaction',
  content: { /* interaction data */ },
  type: 'interaction'
});

// Query collective memory
const memories = await agent.queryCollectiveMemory({
  query: 'user preferences',
  memoryTypes: ['interaction']
});
```

## 🔍 How It Works

### dRAG (Decentralized RAG) Process

1. **Query Processing**: Agent receives natural language query
2. **Hybrid Search**: 
   - **Symbolic**: SPARQL query on structured graph
   - **Neural**: Semantic search with embeddings
3. **Provenance Verification**: Check blockchain proofs for each result
4. **Response Generation**: Format response with UAL citations
5. **Memory Storage**: Store interaction in collective memory

### Collective Memory

- Agents publish insights to DKG as Knowledge Assets
- Other agents can discover and learn from these assets
- Memory persists across agent restarts
- Enables "agentic swarm" with shared intelligence

### Neuro-Symbolic AI Stack

- **Symbolic Layer**: Structured queries, logical reasoning, verifiable facts
- **Neural Layer**: Semantic understanding, context awareness, similarity matching
- **Hybrid**: Combines both for comprehensive understanding

## 📊 Response Format

```typescript
interface AgentResponse {
  agentId: string;
  response: string;              // Formatted response with citations
  confidence: number;            // 0-1 confidence score
  citations: string[];           // UALs of Knowledge Assets used
  provenanceScore: number;      // Average provenance score (0-100)
  reasoning?: string;            // Explanation of reasoning process
  metadata?: Record<string, any>; // Additional metadata
}
```

## 🔐 Security & Trust

- **Provenance Verification**: All sources verified via blockchain
- **UAL Citations**: Every fact traceable to its source
- **Cryptographic Signing**: Optional signing of agent responses
- **Token Gating**: Optional token-based access control
- **Sybil Resistance**: Built-in mechanisms for detecting fake accounts

## 🚧 Advanced Features

### Custom Knowledge Assets

Agents can publish custom Knowledge Assets:

```typescript
const ual = await agent.storeKnowledge({
  title: 'Custom Insight',
  content: { /* your data */ },
  type: 'insight',
  tags: ['custom', 'insight'],
  relatedUALs: ['ual:...'] // Link to related assets
});
```

### Memory Management

- Automatic cleanup of old memories
- Size-based memory limits
- Retention policies
- Memory indexing for fast retrieval

### Task Orchestration

Route tasks to appropriate agents:

```typescript
const task = await orchestrator.routeTask({
  agentId: 'specialist-agent',
  taskType: 'query' | 'reasoning' | 'verification' | 'publish',
  input: { /* task data */ }
});
```

## 📖 Examples

See `examples/dkg-agent-launcher-example.ts` for complete examples:

- Single agent for content verification
- Agent swarm for collective intelligence
- Custom domain-specific agents
- ElizaOS-style agent patterns

## 🔗 Integration with Existing Code

This launcher integrates seamlessly with:

- `dkg-client-v8.ts`: DKG client for publishing/querying
- `drag-retriever.ts`: Provenance-aware retrieval
- `neuro-symbolic-kg.ts`: Hybrid query engine
- `agents/`: Existing agent implementations

## 🎓 Best Practices

1. **Define Clear Purpose**: Each agent should have a specific purpose
2. **Enable Collective Memory**: Allow agents to learn from each other
3. **Require Citations**: Always require UAL citations for verifiability
4. **Set Provenance Thresholds**: Filter low-provenance sources
5. **Monitor Memory Usage**: Set appropriate memory limits
6. **Use Hybrid Queries**: Combine symbolic and neural for best results

## 🐛 Troubleshooting

### Agent Not Initializing

- Check DKG connection: `await dkgClient.healthCheck()`
- Verify DKG configuration
- Check network connectivity

### No Results from Queries

- Lower `minProvenanceScore` threshold
- Increase `topK` value
- Check if Knowledge Assets exist in DKG
- Verify query syntax

### Memory Issues

- Reduce `maxMemorySize`
- Lower `memoryRetentionDays`
- Enable automatic cleanup

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please ensure:
- TypeScript types are properly defined
- Error handling is comprehensive
- Documentation is updated
- Examples are included for new features

## 🔗 References

- [OriginTrail DKG Documentation](https://docs.origintrail.io/)
- [DKG AI Agents Guide](https://docs.origintrail.io/build-with-dkg/ai-agents)
- [ElizaOS Framework](https://github.com/elizaos/elizaos)
- [dRAG Research](https://docs.origintrail.io/to-be-repositioned/ai-agents)

---

**Built with ❤️ for the OriginTrail DKG ecosystem**

