/**
 * Reputation Algorithms Example
 * 
 * Demonstrates how to use the reputation algorithm system
 */

import {
  BasicPageRank,
  TrustWeightedPageRank,
  MultiDimensionalReputation,
  SybilDetector,
  BatchReputationEngine,
  DKGReputationPublisher,
  createReputationAlgorithmRunner,
  runReputationAlgorithms
} from '../reputation-algorithm-runner';
import { GraphNode, GraphEdge, EdgeType } from '../graph-algorithms';
import { createDKGClientV8 } from '../dkg-client-v8';

/**
 * Example 1: Basic PageRank
 */
export async function example1_BasicPageRank() {
  console.log('📊 Example 1: Basic PageRank\n');

  // Create sample graph
  const nodes: GraphNode[] = [
    { id: 'A', metadata: {} },
    { id: 'B', metadata: {} },
    { id: 'C', metadata: {} },
    { id: 'D', metadata: {} }
  ];

  const edges: GraphEdge[] = [
    { source: 'A', target: 'B', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
    { source: 'B', target: 'C', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
    { source: 'C', target: 'A', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
    { source: 'D', target: 'A', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() }
  ];

  // Compute PageRank
  const pagerank = new BasicPageRank({
    dampingFactor: 0.85,
    maxIterations: 100
  });

  const scores = pagerank.compute(nodes, edges);

  console.log('PageRank Scores:');
  scores.forEach((score, nodeId) => {
    console.log(`  ${nodeId}: ${(score * 100).toFixed(2)}%`);
  });
  console.log('');
}

/**
 * Example 2: Trust-Weighted PageRank
 */
export async function example2_TrustWeightedPageRank() {
  console.log('💰 Example 2: Trust-Weighted PageRank\n');

  const nodes: GraphNode[] = [
    { id: 'alice', metadata: { stake: 5000 } },
    { id: 'bob', metadata: { stake: 1000 } },
    { id: 'charlie', metadata: { stake: 200 } },
    { id: 'dave', metadata: { stake: 50 } }
  ];

  const edges: GraphEdge[] = [
    { source: 'alice', target: 'bob', weight: 1.0, edgeType: EdgeType.ENDORSE, timestamp: Date.now() },
    { source: 'bob', target: 'charlie', weight: 1.0, edgeType: EdgeType.ENDORSE, timestamp: Date.now() },
    { source: 'charlie', target: 'alice', weight: 1.0, edgeType: EdgeType.ENDORSE, timestamp: Date.now() },
    { source: 'dave', target: 'alice', weight: 1.0, edgeType: EdgeType.ENDORSE, timestamp: Date.now() }
  ];

  const stakeWeights = new Map([
    ['alice', 5000],
    ['bob', 1000],
    ['charlie', 200],
    ['dave', 50]
  ]);

  const trustPagerank = new TrustWeightedPageRank({
    dampingFactor: 0.85,
    stakeWeights
  });

  const scores = trustPagerank.compute(nodes, edges);

  console.log('Trust-Weighted PageRank Scores:');
  scores.forEach((score, nodeId) => {
    const stake = stakeWeights.get(nodeId) || 0;
    console.log(`  ${nodeId}: ${(score * 100).toFixed(2)}% (stake: ${stake})`);
  });
  console.log('');
}

/**
 * Example 3: Multi-Dimensional Reputation
 */
export async function example3_MultiDimensionalReputation() {
  console.log('🔍 Example 3: Multi-Dimensional Reputation\n');

  const graph = {
    nodes: [
      {
        id: 'alice',
        metadata: {
          stake: 5000,
          paymentHistory: 2000,
          contentQuality: 85
        }
      },
      {
        id: 'bob',
        metadata: {
          stake: 1000,
          paymentHistory: 500,
          contentQuality: 70
        }
      },
      {
        id: 'charlie',
        metadata: {
          stake: 200,
          paymentHistory: 100,
          contentQuality: 60
        }
      }
    ],
    edges: [
      {
        source: 'alice',
        target: 'bob',
        weight: 0.8,
        edgeType: EdgeType.ENDORSE,
        timestamp: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
      },
      {
        source: 'bob',
        target: 'charlie',
        weight: 0.6,
        edgeType: EdgeType.ENDORSE,
        timestamp: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago
      },
      {
        source: 'charlie',
        target: 'alice',
        weight: 0.9,
        edgeType: EdgeType.ENDORSE,
        timestamp: Date.now() - 1 * 24 * 60 * 60 * 1000 // 1 day ago
      }
    ]
  };

  const reputationEngine = new MultiDimensionalReputation(graph);

  for (const node of graph.nodes) {
    const result = await reputationEngine.computeUserReputation(node.id);

    console.log(`User: ${node.id}`);
    console.log(`  Final Score: ${(result.finalScore * 100).toFixed(1)}/100`);
    console.log(`  Structural: ${(result.componentScores.structural! * 100).toFixed(1)}/100`);
    console.log(`  Behavioral: ${(result.componentScores.behavioral! * 100).toFixed(1)}/100`);
    console.log(`  Economic: ${(result.componentScores.economic! * 100).toFixed(1)}/100`);
    console.log(`  Temporal: ${(result.componentScores.temporal! * 100).toFixed(1)}/100`);
    console.log(`  Sybil Risk: ${(result.sybilRisk * 100).toFixed(1)}%`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('');
  }
}

/**
 * Example 4: Sybil Detection
 */
export async function example4_SybilDetection() {
  console.log('🕵️ Example 4: Sybil Detection\n');

  // Create graph with potential Sybil cluster
  const graph = {
    nodes: [
      { id: 'legitimate_user', metadata: { stake: 5000 } },
      { id: 'sybil_1', metadata: {} },
      { id: 'sybil_2', metadata: {} },
      { id: 'sybil_3', metadata: {} },
      { id: 'sybil_4', metadata: {} }
    ],
    edges: [
      // Legitimate connections
      { source: 'legitimate_user', target: 'sybil_1', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
      
      // Sybil cluster (highly connected)
      { source: 'sybil_1', target: 'sybil_2', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
      { source: 'sybil_1', target: 'sybil_3', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
      { source: 'sybil_1', target: 'sybil_4', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
      { source: 'sybil_2', target: 'sybil_3', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
      { source: 'sybil_2', target: 'sybil_4', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() },
      { source: 'sybil_3', target: 'sybil_4', weight: 1.0, edgeType: EdgeType.FOLLOW, timestamp: Date.now() }
    ]
  };

  const detector = new SybilDetector(graph);

  for (const node of graph.nodes) {
    const risk = detector.analyzeUser(node.id);
    const status = risk > 0.7 ? '🚨 HIGH RISK' : risk > 0.3 ? '⚠️  MEDIUM RISK' : '✅ LOW RISK';
    
    console.log(`${node.id}: ${(risk * 100).toFixed(1)}% ${status}`);
  }
  console.log('');
}

/**
 * Example 5: Batch Processing
 */
export async function example5_BatchProcessing() {
  console.log('📦 Example 5: Batch Processing\n');

  // Create larger graph
  const nodes: GraphNode[] = Array.from({ length: 100 }, (_, i) => ({
    id: `user-${i}`,
    metadata: {
      stake: Math.random() * 10000,
      paymentHistory: Math.random() * 5000,
      contentQuality: Math.random() * 100
    }
  }));

  const edges: GraphEdge[] = [];
  for (let i = 0; i < 500; i++) {
    const source = `user-${Math.floor(Math.random() * 100)}`;
    const target = `user-${Math.floor(Math.random() * 100)}`;
    if (source !== target) {
      edges.push({
        source,
        target,
        weight: Math.random(),
        edgeType: EdgeType.FOLLOW,
        timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        metadata: {}
      });
    }
  }

  const graph = { nodes, edges };
  const reputationEngine = new MultiDimensionalReputation(graph);
  const batchEngine = new BatchReputationEngine(reputationEngine, {
    batchSize: 20,
    maxWorkers: 4
  });

  const userList = nodes.slice(0, 50).map(n => n.id);
  
  console.log(`Processing ${userList.length} users in batches...`);
  const startTime = Date.now();
  
  const result = await batchEngine.computeBatchReputation(userList);
  
  const elapsed = Date.now() - startTime;
  
  console.log(`✅ Processed ${result.totalProcessed} users in ${(elapsed / 1000).toFixed(2)}s`);
  console.log(`   Failed: ${result.totalFailed}`);
  console.log(`   Average: ${(elapsed / result.totalProcessed).toFixed(0)}ms per user\n`);
}

/**
 * Example 6: Complete Pipeline
 */
export async function example6_CompletePipeline() {
  console.log('🚀 Example 6: Complete Pipeline\n');

  const runner = createReputationAlgorithmRunner({
    useMockMode: true,
    enableMultiDimensional: true,
    enableBatchProcessing: true
  });

  // Create sample graph
  const sampleGraph = {
    nodes: Array.from({ length: 50 }, (_, i) => ({
      id: `user-${i}`,
      metadata: {
        stake: i < 10 ? Math.random() * 10000 : 0,
        paymentHistory: i < 20 ? Math.random() * 5000 : 0,
        contentQuality: Math.random() * 100
      }
    })),
    edges: [] as GraphEdge[]
  };

  // Generate random edges
  for (let i = 0; i < 200; i++) {
    const source = `user-${Math.floor(Math.random() * 50)}`;
    const target = `user-${Math.floor(Math.random() * 50)}`;
    if (source !== target) {
      sampleGraph.edges.push({
        source,
        target,
        weight: Math.random(),
        edgeType: EdgeType.FOLLOW,
        timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
        metadata: {}
      });
    }
  }

  const result = await runner.runCompletePipeline({
    graphData: sampleGraph,
    userList: sampleGraph.nodes.slice(0, 20).map(n => n.id),
    enableMultiDimensional: true,
    enableBatchProcessing: true,
    publishToDKG: false
  });

  console.log(`✅ Pipeline completed in ${(result.processingTime / 1000).toFixed(2)}s`);
  console.log(`   Processed ${result.scores.size} users\n`);

  // Display top 5
  const sorted = Array.from(result.scores.entries())
    .sort((a, b) => b[1].finalScore - a[1].finalScore)
    .slice(0, 5);

  console.log('Top 5 Users:');
  sorted.forEach(([userId, result], index) => {
    console.log(`  ${index + 1}. ${userId}: ${(result.finalScore * 100).toFixed(1)}/100`);
  });
  console.log('');
}

/**
 * Example 7: DKG Publishing
 */
export async function example7_DKGPublishing() {
  console.log('🔗 Example 7: DKG Publishing\n');

  const dkgClient = createDKGClientV8({ useMockMode: true });
  const publisher = new DKGReputationPublisher(dkgClient);

  // Create sample reputation scores
  const scores = new Map();
  scores.set('user1', {
    userDid: 'user1',
    finalScore: 0.85,
    componentScores: {
      structural: 0.8,
      behavioral: 0.9,
      economic: 0.7
    },
    sybilRisk: 0.1,
    confidence: 0.9,
    explanation: ['High reputation user']
  });

  scores.set('user2', {
    userDid: 'user2',
    finalScore: 0.65,
    componentScores: {
      structural: 0.6,
      behavioral: 0.7,
      economic: 0.5
    },
    sybilRisk: 0.2,
    confidence: 0.8,
    explanation: ['Moderate reputation user']
  });

  try {
    const publishResult = await publisher.publishReputationSnapshot(scores, {
      creator: 'did:dkg:reputation-engine:001',
      computationMethod: 'MultiDimensionalReputation',
      timestamp: Date.now()
    });

    console.log('✅ Reputation snapshot published!');
    console.log(`   UAL: ${publishResult.UAL}`);
    if (publishResult.transactionHash) {
      console.log(`   Transaction: ${publishResult.transactionHash}`);
    }
    console.log('');
  } catch (error: any) {
    console.error('❌ Failed to publish:', error.message);
    console.log('');
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('🚀 Reputation Algorithms Examples');
  console.log('='.repeat(60));
  console.log('');

  try {
    await example1_BasicPageRank();
    await example2_TrustWeightedPageRank();
    await example3_MultiDimensionalReputation();
    await example4_SybilDetection();
    await example5_BatchProcessing();
    await example6_CompletePipeline();
    await example7_DKGPublishing();

    console.log('='.repeat(60));
    console.log('✅ All examples completed successfully!');
    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('❌ Error running examples:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

