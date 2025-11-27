/**
 * Social Graph Reputation System - Complete Demo Implementation
 * 
 * Demonstrates the full flow:
 * 1. Data ingestion from DKG
 * 2. Reputation computation with Sybil detection
 * 3. Snapshot publishing to DKG
 * 4. x402 payment integration
 * 5. MCP agent queries
 * 6. Experiments and metrics
 */

import { DKGClientV8, createDKGClientV8 } from './dkg-client-v8';
import {
  SocialGraphReputationService,
  createSocialGraphReputationService
} from './social-graph-reputation-service';
import { MCPReputationTools, createMCPReputationTools } from './mcp-reputation-tools';

export interface DemoConfig {
  dkgEndpoint?: string;
  useMockMode?: boolean;
  graphSize?: number;
  enableExperiments?: boolean;
}

export interface DemoResults {
  snapshotUAL?: string;
  topCreators?: any[];
  sybilDetectionMetrics?: any;
  performanceBenchmarks?: any[];
  paymentFlowResult?: any;
  agentQueryResult?: any;
}

/**
 * Hackathon Demo Runner
 * 
 * Executes the complete demo scenario for judges
 */
export class ReputationDemo {
  private dkgClient: DKGClientV8;
  private reputationService: SocialGraphReputationService;
  private mcpTools: MCPReputationTools;

  constructor(config: DemoConfig = {}) {
    // Initialize DKG client
    this.dkgClient = createDKGClientV8({
      environment: 'testnet',
      endpoint: config.dkgEndpoint,
      useMockMode: config.useMockMode || false,
      fallbackToMock: true
    });

    // Initialize reputation service
    this.reputationService = createSocialGraphReputationService(this.dkgClient);

    // Initialize MCP tools
    this.mcpTools = createMCPReputationTools(this.dkgClient);
  }

  /**
   * Run complete demo flow
   */
  async runCompleteDemo(): Promise<DemoResults> {
    console.log('🚀 Starting Social Graph Reputation Demo\n');
    console.log('=' .repeat(60));

    const results: DemoResults = {};

    try {
      // Step 1: Data Ingestion
      console.log('\n📥 Step 1: Ingesting social graph from DKG...');
      const graphData = await this.reputationService.ingestSocialGraphData({
        limit: 5000,
        useExistingData: true
      });
      console.log(`✅ Ingested ${graphData.nodes.length} nodes and ${graphData.edges.length} edges\n`);

      // Step 2: Reputation Computation
      console.log('🧮 Step 2: Computing reputation scores with Sybil detection...');
      const { scores, sybilRisks, hybridScores } = await this.reputationService.computeReputation(
        graphData,
        {
          enableSybilDetection: true,
          applyStakeWeighting: false,
          pagerankConfig: {
            dampingFactor: 0.85,
            maxIterations: 100
          }
        }
      );
      console.log(`✅ Computed reputation for ${scores.size} users\n`);

      // Step 3: DKG Publishing
      console.log('🔗 Step 3: Publishing reputation snapshot to DKG...');
      const publishResult = await this.reputationService.publishReputationSnapshot(
        scores,
        sybilRisks,
        {
          algorithm: 'TrustWeightedPageRank',
          algorithmVersion: '1.2',
          includeSybilAnalysis: true,
          includeProvenance: true
        }
      );
      results.snapshotUAL = publishResult.UAL;
      console.log(`✅ Snapshot published: ${publishResult.UAL}\n`);

      // Step 4: Get Top Creators
      console.log('⭐ Step 4: Retrieving top creators...');
      const topCreators = await this.reputationService.getTopCreators(10);
      results.topCreators = topCreators;
      console.log(`✅ Found ${topCreators.length} top creators\n`);
      topCreators.slice(0, 5).forEach((creator, i) => {
        console.log(`   ${i + 1}. ${creator['schema:user']}: ${creator['reputation:value'].toFixed(3)} (${creator['reputation:percentile']?.toFixed(1)}th percentile)`);
      });

      // Step 5: Sybil Detection Demo
      console.log('\n🕵️ Step 5: Demonstrating Sybil detection...');
      const sybilExperiment = await this.reputationService.runSybilInjectionTest(
        graphData,
        10, // cluster size
        0.8 // connection density
      );
      results.sybilDetectionMetrics = sybilExperiment;
      console.log(`✅ Sybil Detection Metrics:`);
      console.log(`   Precision: ${sybilExperiment.precision.toFixed(3)}`);
      console.log(`   Recall: ${sybilExperiment.recall.toFixed(3)}`);
      console.log(`   F1-Score: ${sybilExperiment.f1Score.toFixed(3)}`);
      console.log(`   True Positives: ${sybilExperiment.truePositives}`);
      console.log(`   False Positives: ${sybilExperiment.falsePositives}`);
      console.log(`   False Negatives: ${sybilExperiment.falseNegatives}\n`);

      // Step 6: x402 Payment Flow
      console.log('💸 Step 6: Demonstrating x402 micropayment integration...');
      const paymentResult = await this.reputationService.handlePremiumDataRequest(
        'did:dkg:influencer:tech_guru_alex',
        publishResult.UAL,
        '5.00',
        'USDC'
      );
      results.paymentFlowResult = paymentResult;
      
      if (paymentResult.status === 'payment_required') {
        console.log(`✅ Payment request generated:`);
        console.log(`   Amount: ${paymentResult.paymentRequest?.amount} ${paymentResult.paymentRequest?.currency}`);
        console.log(`   Recipient: ${paymentResult.paymentRequest?.recipient}`);
        console.log(`   Challenge: ${paymentResult.paymentRequest?.challenge}`);
      } else if (paymentResult.status === 'access_granted') {
        console.log(`✅ Access granted to resource\n`);
      }

      // Step 7: MCP Agent Integration
      console.log('🤖 Step 7: Demonstrating AI agent reputation queries...');
      const agentQuery = await this.mcpTools.executeTool('get_user_reputation', {
        userDID: 'did:dkg:influencer:tech_guru_alex',
        includeSybilRisk: true,
        includeConfidence: true
      });
      results.agentQueryResult = agentQuery;
      
      if (agentQuery.success) {
        console.log(`✅ Agent Query Result:`);
        console.log(`   User: ${agentQuery.data.user}`);
        console.log(`   Reputation Score: ${agentQuery.data.reputationScore.toFixed(3)}`);
        console.log(`   Trust Level: ${agentQuery.data.trustLevel}`);
        console.log(`   Sybil Risk: ${agentQuery.data.sybilRisk?.toFixed(3)}`);
        console.log(`   Confidence: ${agentQuery.data.confidence?.toFixed(3)}\n`);
      }

      // Step 8: Performance Benchmarking (optional)
      console.log('⚡ Step 8: Performance benchmarking...');
      const benchmarks = await this.reputationService.benchmarkPerformance([1000, 5000, 10000]);
      results.performanceBenchmarks = benchmarks;
      console.log(`✅ Performance Benchmarks:`);
      benchmarks.forEach(b => {
        console.log(`   ${b.graphSize} nodes: ${b.computationTimeSeconds.toFixed(2)}s (density: ${b.graphDensity.toFixed(4)})`);
      });

      console.log('\n' + '='.repeat(60));
      console.log('✅ Demo completed successfully!\n');

      return results;
    } catch (error: any) {
      console.error('\n❌ Demo failed:', error);
      throw error;
    }
  }

  /**
   * Run quick demo (without experiments)
   */
  async runQuickDemo(): Promise<DemoResults> {
    console.log('🚀 Running Quick Demo (no experiments)...\n');

    // Step 1: Ingest data
    const graphData = await this.reputationService.ingestSocialGraphData({ limit: 1000 });

    // Step 2: Compute reputation
    const { scores, sybilRisks } = await this.reputationService.computeReputation(graphData);

    // Step 3: Publish snapshot
    const publishResult = await this.reputationService.publishReputationSnapshot(scores, sybilRisks);

    // Step 4: Get top creators
    const topCreators = await this.reputationService.getTopCreators(10);

    return {
      snapshotUAL: publishResult.UAL,
      topCreators
    };
  }

  /**
   * Run experiments only
   */
  async runExperiments(): Promise<{
    sybilInjection: any;
    performance: any[];
  }> {
    console.log('🧪 Running Experiments...\n');

    // Generate test graph
    const testGraph = {
      nodes: Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        metadata: {}
      })),
      edges: [] as any[]
    };

    // Generate edges
    for (let i = 0; i < 5000; i++) {
      const source = `node-${Math.floor(Math.random() * 1000)}`;
      const target = `node-${Math.floor(Math.random() * 1000)}`;
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
    const sybilInjection = await this.reputationService.runSybilInjectionTest(testGraph, 10, 0.8);

    // Run performance benchmarks
    const performance = await this.reputationService.benchmarkPerformance([1000, 5000, 10000]);

    return {
      sybilInjection,
      performance
    };
  }
}

/**
 * Main demo entry point
 */
export async function runReputationDemo(config: DemoConfig = {}): Promise<DemoResults> {
  const demo = new ReputationDemo(config);
  return await demo.runCompleteDemo();
}

export default ReputationDemo;

