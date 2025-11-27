/**
 * Example: Social Graph Reputation System Usage
 * 
 * This example demonstrates how to use the social graph reputation service
 * to compute and publish reputation scores from social graph data on the DKG.
 */

import { createDKGClientV8 } from '../dkg-client-v8';
import { createSocialGraphReputationService } from '../social-graph-reputation-service';
import { createMCPReputationTools } from '../mcp-reputation-tools';
import { runReputationDemo } from '../reputation-demo';

/**
 * Example 1: Basic reputation computation and publishing
 */
export async function example1_BasicReputationFlow() {
  console.log('Example 1: Basic Reputation Flow\n');

  // Initialize DKG client
  const dkgClient = createDKGClientV8({
    environment: 'testnet',
    useMockMode: true // Use mock mode for testing
  });

  // Initialize reputation service
  const reputationService = createSocialGraphReputationService(dkgClient);

  // Step 1: Ingest social graph data
  const graphData = await reputationService.ingestSocialGraphData({
    limit: 1000,
    useExistingData: true
  });

  // Step 2: Compute reputation
  const { scores, sybilRisks } = await reputationService.computeReputation(graphData, {
    enableSybilDetection: true
  });

  // Step 3: Publish snapshot
  const result = await reputationService.publishReputationSnapshot(scores, sybilRisks);

  console.log(`✅ Published snapshot: ${result.UAL}`);
}

/**
 * Example 2: Query top creators
 */
export async function example2_QueryTopCreators() {
  console.log('Example 2: Query Top Creators\n');

  const dkgClient = createDKGClientV8({ environment: 'testnet', useMockMode: true });
  const reputationService = createSocialGraphReputationService(dkgClient);

  // Get top 10 creators
  const topCreators = await reputationService.getTopCreators(10);

  console.log('Top Creators:');
  topCreators.forEach((creator, i) => {
    console.log(`${i + 1}. ${creator['schema:user']}: ${creator['reputation:value'].toFixed(3)}`);
  });
}

/**
 * Example 3: MCP Agent Tools
 */
export async function example3_MCPAgentTools() {
  console.log('Example 3: MCP Agent Tools\n');

  const dkgClient = createDKGClientV8({ environment: 'testnet', useMockMode: true });
  const mcpTools = createMCPReputationTools(dkgClient);

  // Get available tools
  const tools = mcpTools.getToolDefinitions();
  console.log('Available MCP Tools:');
  tools.forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });

  // Execute a tool
  const result = await mcpTools.executeTool('get_user_reputation', {
    userDID: 'did:dkg:user:123',
    includeSybilRisk: true
  });

  console.log('\nTool Result:', result);
}

/**
 * Example 4: x402 Payment Flow
 */
export async function example4_X402PaymentFlow() {
  console.log('Example 4: x402 Payment Flow\n');

  const dkgClient = createDKGClientV8({ environment: 'testnet', useMockMode: true });
  const reputationService = createSocialGraphReputationService(dkgClient);

  // Request premium data access
  const paymentResult = await reputationService.handlePremiumDataRequest(
    'did:dkg:user:123',
    'ual:dkg:reputation:snapshot:123',
    '5.00',
    'USDC'
  );

  if (paymentResult.status === 'payment_required') {
    console.log('Payment Required:');
    console.log(`  Amount: ${paymentResult.paymentRequest?.amount} ${paymentResult.paymentRequest?.currency}`);
    console.log(`  Challenge: ${paymentResult.paymentRequest?.challenge}`);
  } else if (paymentResult.status === 'access_granted') {
    console.log('Access Granted!');
  }
}

/**
 * Example 5: Run Experiments
 */
export async function example5_Experiments() {
  console.log('Example 5: Experiments\n');

  const dkgClient = createDKGClientV8({ environment: 'testnet', useMockMode: true });
  const reputationService = createSocialGraphReputationService(dkgClient);

  // Generate test graph
  const testGraph = {
    nodes: Array.from({ length: 500 }, (_, i) => ({
      id: `node-${i}`,
      metadata: {}
    })),
    edges: [] as any[]
  };

  // Generate edges
  for (let i = 0; i < 2000; i++) {
    const source = `node-${Math.floor(Math.random() * 500)}`;
    const target = `node-${Math.floor(Math.random() * 500)}`;
    if (source !== target) {
      testGraph.edges.push({
        source,
        target,
        weight: Math.random(),
        edgeType: 'follow' as any,
        timestamp: Date.now(),
        metadata: {}
      });
    }
  }

  // Run Sybil injection test
  const sybilResult = await reputationService.runSybilInjectionTest(testGraph, 10, 0.8);
  console.log('Sybil Detection Results:');
  console.log(`  Precision: ${sybilResult.precision.toFixed(3)}`);
  console.log(`  Recall: ${sybilResult.recall.toFixed(3)}`);
  console.log(`  F1-Score: ${sybilResult.f1Score.toFixed(3)}`);

  // Run performance benchmark
  const benchmarks = await reputationService.benchmarkPerformance([1000, 5000]);
  console.log('\nPerformance Benchmarks:');
  benchmarks.forEach(b => {
    console.log(`  ${b.graphSize} nodes: ${b.computationTimeSeconds.toFixed(2)}s`);
  });
}

/**
 * Example 6: Complete Demo
 */
export async function example6_CompleteDemo() {
  console.log('Example 6: Complete Demo\n');

  const results = await runReputationDemo({
    useMockMode: true,
    enableExperiments: true
  });

  console.log('\nDemo Results Summary:');
  console.log(`  Snapshot UAL: ${results.snapshotUAL}`);
  console.log(`  Top Creators: ${results.topCreators?.length || 0}`);
  console.log(`  Sybil Detection F1: ${results.sybilDetectionMetrics?.f1Score.toFixed(3)}`);
}

// Run examples
if (require.main === module) {
  (async () => {
    try {
      await example1_BasicReputationFlow();
      // await example2_QueryTopCreators();
      // await example3_MCPAgentTools();
      // await example4_X402PaymentFlow();
      // await example5_Experiments();
      // await example6_CompleteDemo();
    } catch (error) {
      console.error('Example failed:', error);
      process.exit(1);
    }
  })();
}

