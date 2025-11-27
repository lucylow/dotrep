/**
 * DKG-Based AI Agent Launcher Example
 * 
 * Demonstrates how to launch and use DKG-based AI agents with:
 * - dRAG (Decentralized Retrieval-Augmented Generation)
 * - Collective memory and knowledge sharing
 * - Agent swarm orchestration
 * - Neuro-symbolic AI queries
 * 
 * This example shows the complete workflow for launching agents
 * that can verify content authenticity using the Umanitek Guardian
 * knowledge base, as mentioned in the research brief.
 */

import { createAgentLauncher, createDKGAIAgent, AgentConfig } from '../dkg-agent-launcher';
import { DKGConfig } from '../dkg-client-v8';

/**
 * Example 1: Launch a single agent for content verification
 */
export async function exampleSingleAgent() {
  console.log('\n=== Example 1: Single Agent for Content Verification ===\n');

  // Configure agent for content authenticity verification
  const agentConfig: AgentConfig = {
    agentId: 'content-verifier-001',
    agentName: 'Content Authenticity Verifier',
    purpose: 'Verify content authenticity using the Umanitek Guardian knowledge base',
    capabilities: [
      'content_verification',
      'provenance_checking',
      'misinformation_detection',
      'source_verification'
    ],
    dkgConfig: {
      environment: 'testnet',
      enableSigning: true,
      enableTokenGating: false
    },
    enableDRAG: true,
    enableCollectiveMemory: true,
    enableKnowledgeSharing: true,
    memoryRetentionDays: 30,
    maxMemorySize: 10 * 1024 * 1024 // 10MB
  };

  // Create and initialize agent
  const agent = createDKGAIAgent(agentConfig);
  await agent.initialize();

  // Process a verification query
  const query = 'Verify if the claim "Polkadot supports cross-chain messaging via XCM" is accurate';
  
  const response = await agent.processQuery(query, {
    useHybrid: true,
    minProvenanceScore: 60,
    topK: 5,
    requireCitations: true
  });

  console.log('\n📋 Agent Response:');
  console.log(response.response);
  console.log(`\n📊 Confidence: ${(response.confidence * 100).toFixed(1)}%`);
  console.log(`🔗 Citations: ${response.citations.length} Knowledge Assets`);
  response.citations.forEach((ual, i) => {
    console.log(`   [${i + 1}] ${ual}`);
  });

  // Store learned knowledge
  const knowledgeUAL = await agent.storeKnowledge({
    title: 'XCM Cross-Chain Messaging Verification',
    content: {
      claim: 'Polkadot supports cross-chain messaging via XCM',
      verified: true,
      sources: response.citations,
      confidence: response.confidence
    },
    type: 'insight',
    tags: ['polkadot', 'xcm', 'cross-chain', 'verification'],
    relatedUALs: response.citations
  });

  console.log(`\n✅ Knowledge stored with UAL: ${knowledgeUAL}`);

  // Get agent status
  const status = agent.getStatus();
  console.log(`\n📊 Agent Status:`);
  console.log(`   Memory: ${status.memoryCount} entries, ${(status.memorySize / 1024).toFixed(2)} KB`);
  console.log(`   DKG Status: ${status.dkgStatus.environment}`);

  await agent.shutdown();
}

/**
 * Example 2: Launch agent swarm for collective intelligence
 */
export async function exampleAgentSwarm() {
  console.log('\n=== Example 2: Agent Swarm for Collective Intelligence ===\n');

  // Create orchestrator
  const orchestrator = createAgentLauncher('reputation-swarm-001');

  // Launch multiple specialized agents
  const agents = [
    {
      agentId: 'reputation-analyzer-001',
      agentName: 'Reputation Analyzer',
      purpose: 'Analyze developer reputation scores and patterns',
      capabilities: ['reputation_analysis', 'pattern_detection', 'trend_analysis']
    },
    {
      agentId: 'sybil-detector-001',
      agentName: 'Sybil Detector',
      purpose: 'Detect Sybil attacks and fake accounts',
      capabilities: ['sybil_detection', 'cluster_analysis', 'anomaly_detection']
    },
    {
      agentId: 'trust-verifier-001',
      agentName: 'Trust Verifier',
      purpose: 'Verify trust signals and credentials',
      capabilities: ['trust_verification', 'credential_checking', 'provenance_verification']
    }
  ];

  // Launch all agents
  for (const agentSpec of agents) {
    const agentConfig: AgentConfig = {
      ...agentSpec,
      dkgConfig: {
        environment: 'testnet'
      },
      enableDRAG: true,
      enableCollectiveMemory: true,
      enableKnowledgeSharing: true,
      memoryRetentionDays: 30
    };

    await orchestrator.launchAgent(agentConfig);
  }

  // Route tasks to different agents
  console.log('\n📋 Routing tasks to agents...\n');

  // Task 1: Analyze reputation
  const task1 = await orchestrator.routeTask({
    agentId: 'reputation-analyzer-001',
    taskType: 'query',
    input: {
      query: 'What are the top 5 developers by reputation score in the last 30 days?',
      options: {
        useHybrid: true,
        topK: 5
      }
    }
  });

  console.log(`✅ Task 1 completed: ${task1.taskId}`);
  console.log(`   Citations: ${task1.citations?.length || 0}`);

  // Task 2: Detect Sybil patterns
  const task2 = await orchestrator.routeTask({
    agentId: 'sybil-detector-001',
    taskType: 'verification',
    input: {
      claim: 'Account 0x1234... shows suspicious clustering patterns',
      options: {
        useHybrid: true,
        minProvenanceScore: 70
      }
    }
  });

  console.log(`✅ Task 2 completed: ${task2.taskId}`);

  // Task 3: Query collective memory across all agents
  const collectiveMemory = await orchestrator.querySwarmMemory({
    query: 'reputation patterns and sybil detection',
    memoryTypes: ['knowledge', 'insight']
  });

  console.log(`\n📚 Collective Memory Results:`);
  console.log(`   Found memories from ${collectiveMemory.length} agents`);
  collectiveMemory.forEach((memory, i) => {
    console.log(`   [${i + 1}] Agent ${memory.agentId}: ${memory.memories.length} memories`);
  });

  // Get orchestrator status
  const status = orchestrator.getStatus();
  console.log(`\n📊 Swarm Status:`);
  console.log(`   Swarm ID: ${status.swarmId}`);
  console.log(`   Agents: ${status.agentCount} total, ${status.activeAgents} active`);
  console.log(`   Tasks: ${status.completedTasks}/${status.totalTasks} completed`);

  await orchestrator.shutdown();
}

/**
 * Example 3: Custom agent for specific domain
 */
export async function exampleCustomDomainAgent() {
  console.log('\n=== Example 3: Custom Domain-Specific Agent ===\n');

  // Create agent for social graph reputation analysis
  const agentConfig: AgentConfig = {
    agentId: 'social-graph-agent-001',
    agentName: 'Social Graph Reputation Agent',
    purpose: 'Analyze social graph connections and reputation propagation',
    capabilities: [
      'graph_analysis',
      'reputation_propagation',
      'influence_scoring',
      'community_detection'
    ],
    dkgConfig: {
      environment: 'testnet',
      enableSigning: true
    },
    enableDRAG: true,
    enableCollectiveMemory: true,
    enableKnowledgeSharing: true,
    memoryRetentionDays: 60,
    maxMemorySize: 50 * 1024 * 1024 // 50MB for graph data
  };

  const agent = createDKGAIAgent(agentConfig);
  await agent.initialize();

  // Process complex graph query
  const graphQuery = `
    Analyze the social graph to find:
    1. Most influential developers (by connection count and reputation)
    2. Communities or clusters of developers
    3. Reputation propagation patterns
  `;

  const response = await agent.processQuery(graphQuery, {
    useHybrid: true,
    minProvenanceScore: 50,
    topK: 10,
    requireCitations: true
  });

  console.log('📊 Graph Analysis Results:');
  console.log(response.response);
  console.log(`\n🔗 Verified with ${response.citations.length} Knowledge Assets`);

  // Store graph insights
  await agent.storeKnowledge({
    title: 'Social Graph Analysis Insights',
    content: {
      analysis: 'Graph structure and community patterns',
      insights: response.response,
      timestamp: Date.now()
    },
    type: 'pattern',
    tags: ['social-graph', 'reputation', 'community-detection'],
    relatedUALs: response.citations
  });

  await agent.shutdown();
}

/**
 * Example 4: Agent with ElizaOS-style integration
 * 
 * Demonstrates how to structure an agent that could integrate
 * with ElizaOS framework patterns while using DKG directly
 */
export async function exampleElizaOSStyleAgent() {
  console.log('\n=== Example 4: ElizaOS-Style Agent Pattern ===\n');

  // Agent configuration following ElizaOS patterns
  const agentConfig: AgentConfig = {
    agentId: 'elizaos-style-agent-001',
    agentName: 'ElizaOS-Compatible Agent',
    purpose: 'Agent with ElizaOS-style memory management and knowledge sharing',
    capabilities: [
      'memory_management',
      'knowledge_sharing',
      'agent_communication',
      'task_orchestration'
    ],
    dkgConfig: {
      environment: 'testnet'
    },
    enableDRAG: true,
    enableCollectiveMemory: true,
    enableKnowledgeSharing: true,
    memoryRetentionDays: 90, // Longer retention like ElizaOS
    maxMemorySize: 100 * 1024 * 1024 // 100MB
  };

  const agent = createDKGAIAgent(agentConfig);
  await agent.initialize();

  // Simulate agent conversation/memory
  const conversations = [
    'User asked about Polkadot staking rewards',
    'User wants to verify a developer\'s reputation',
    'User is interested in cross-chain DeFi protocols'
  ];

  for (const conversation of conversations) {
    // Store as interaction memory
    await agent.storeKnowledge({
      title: 'User Interaction',
      content: {
        type: 'conversation',
        content: conversation,
        timestamp: Date.now()
      },
      type: 'interaction',
      tags: ['user-interaction', 'conversation']
    });
  }

  // Query collective memory (like ElizaOS memory retrieval)
  const memory = await agent.queryCollectiveMemory({
    query: 'user interactions about Polkadot',
    memoryTypes: ['interaction']
  });

  console.log(`📚 Retrieved ${memory.length} memory entries from collective memory`);

  // Process query using accumulated knowledge
  const response = await agent.processQuery(
    'Based on previous interactions, what topics has the user shown interest in?',
    {
      useHybrid: true,
      topK: 5
    }
  );

  console.log('\n💬 Agent Response:');
  console.log(response.response);

  await agent.shutdown();
}

/**
 * Main example runner
 */
export async function runAllExamples() {
  try {
    await exampleSingleAgent();
    await exampleAgentSwarm();
    await exampleCustomDomainAgent();
    await exampleElizaOSStyleAgent();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Example failed:', error);
    throw error;
  }
}

// Run examples if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export default {
  exampleSingleAgent,
  exampleAgentSwarm,
  exampleCustomDomainAgent,
  exampleElizaOSStyleAgent,
  runAllExamples
};

