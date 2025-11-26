/**
 * Example Usage of Advanced Graph Algorithms
 * 
 * Demonstrates how to use the improved graph algorithms for reputation computation
 * with temporal PageRank, fairness adjustments, sensitivity auditing, and hybrid scoring.
 */

import { DKGClientV8, createDKGClientV8 } from './dkg-client-v8';
import { GraphReputationService, createGraphReputationService } from './graph-reputation-service';
import {
  GraphNode,
  GraphEdge,
  EdgeType,
  PageRankConfig
} from './graph-algorithms';

/**
 * Example: Compute reputation from social graph data
 */
async function exampleComputeReputation() {
  // Initialize DKG client
  const dkgClient = createDKGClientV8({
    environment: 'testnet',
    useMockMode: false
  });

  // Create reputation service
  const reputationService = createGraphReputationService(dkgClient);

  // Example graph data (in production, this would come from DKG queries)
  const graphData = {
    nodes: [
      {
        id: 'alice',
        metadata: {
          stake: 1000,
          paymentHistory: 5000,
          verifiedEndorsements: 10,
          contentQuality: 85,
          activityRecency: Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days ago
        }
      },
      {
        id: 'bob',
        metadata: {
          stake: 500,
          paymentHistory: 2000,
          verifiedEndorsements: 5,
          contentQuality: 75,
          activityRecency: Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days ago
        }
      },
      {
        id: 'charlie',
        metadata: {
          stake: 200,
          paymentHistory: 1000,
          verifiedEndorsements: 2,
          contentQuality: 60,
          activityRecency: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
          minorityGroup: true // for fairness analysis
        }
      }
    ],
    edges: [
      {
        source: 'alice',
        target: 'bob',
        weight: 0.8,
        edgeType: EdgeType.ENDORSE,
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
        metadata: {
          endorsementStrength: 0.9,
          stakeBacked: true,
          verified: true
        }
      },
      {
        source: 'bob',
        target: 'alice',
        weight: 0.7,
        edgeType: EdgeType.ENDORSE,
        timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, // 5 days ago
        metadata: {
          endorsementStrength: 0.8,
          verified: true
        }
      },
      {
        source: 'alice',
        target: 'charlie',
        weight: 0.5,
        edgeType: EdgeType.COLLABORATE,
        timestamp: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60 days ago
        metadata: {
          verified: false
        }
      },
      {
        source: 'bob',
        target: 'charlie',
        weight: 0.4,
        edgeType: EdgeType.FOLLOW,
        timestamp: Date.now() - 120 * 24 * 60 * 60 * 1000, // 120 days ago
        metadata: {}
      }
    ]
  };

  // Compute reputation with advanced options
  const results = await reputationService.computeReputation(graphData, {
    useTemporalPageRank: true,
    applyFairnessAdjustments: true,
    fairnessAdjustmentStrength: 0.2,
    enableSensitivityAudit: true, // Enable for top nodes
    enableSybilDetection: true,
    computeHybridScore: true,
    hybridWeights: {
      graph: 0.5,
      quality: 0.25,
      stake: 0.15,
      payment: 0.1
    },
    pageRankConfig: {
      dampingFactor: 0.85,
      temporalDecay: 0.1,
      recencyWeight: 0.3,
      stakeWeight: 0.2,
      paymentWeight: 0.15
    }
  });

  // Display results
  console.log('\n📊 Reputation Scores:');
  for (const [nodeId, score] of results.scores.entries()) {
    console.log(`\n${nodeId}:`);
    console.log(`  Final Score: ${score.finalScore.toFixed(1)}`);
    console.log(`  Percentile: ${score.percentile.toFixed(1)}%`);
    console.log(`  Graph Score: ${score.graphScore.toFixed(1)}`);
    console.log(`  Quality Score: ${score.qualityScore.toFixed(1)}`);
    console.log(`  Stake Score: ${score.stakeScore.toFixed(1)}`);
    console.log(`  Payment Score: ${score.paymentScore.toFixed(1)}`);
    console.log(`  Explanation: ${score.explanation.join(', ')}`);
  }

  // Display fairness metrics
  if (results.fairnessMetrics) {
    console.log('\n⚖️  Fairness Metrics:');
    console.log(`  Gini Coefficient: ${results.fairnessMetrics.giniCoefficient.toFixed(3)}`);
    console.log(`  Minority Representation: ${(results.fairnessMetrics.minorityRepresentation * 100).toFixed(1)}%`);
    console.log(`  Top Decile Diversity: ${results.fairnessMetrics.topDecileDiversity.toFixed(3)}`);
    console.log(`  Bias Score: ${results.fairnessMetrics.biasScore.toFixed(3)}`);
  }

  // Display Sybil detection results
  if (results.sybilProbabilities) {
    console.log('\n🛡️  Sybil Detection:');
    for (const [nodeId, probability] of results.sybilProbabilities.entries()) {
      if (probability > 0.1) {
        console.log(`  ${nodeId}: ${(probability * 100).toFixed(1)}% probability`);
      }
    }
  }

  // Display sensitivity audit results
  if (results.sensitivityAudits) {
    console.log('\n🔬 Sensitivity Audits (Top Influencing Edges):');
    for (const [nodeId, audit] of results.sensitivityAudits.entries()) {
      console.log(`\n  ${nodeId} (base score: ${audit.baseScore.toFixed(6)}):`);
      for (const edge of audit.topInfluencingEdges.slice(0, 3)) {
        console.log(`    ${edge.edge.source} -> ${edge.edge.target}: impact = ${edge.impact.toFixed(6)}`);
      }
    }
  }

  // Publish results to DKG
  console.log('\n📤 Publishing reputation scores to DKG...');
  const publishResults = await reputationService.publishReputationScores(results, {
    batchSize: 5,
    epochs: 2,
    includeFairnessMetrics: true,
    includeSensitivityAudit: true
  });

  console.log(`\n✅ Published ${publishResults.filter(r => r.ual).length} reputation assets`);

  return results;
}

/**
 * Example: Compare baseline PageRank vs hybrid scoring
 */
async function exampleCompareAlgorithms() {
  const dkgClient = createDKGClientV8({ environment: 'testnet' });
  const reputationService = createGraphReputationService(dkgClient);

  // Load graph data (example)
  const graphData = {
    nodes: [], // would load from DKG
    edges: [] // would load from DKG
  };

  // Compute with baseline PageRank (no hybrid scoring)
  const baselineResults = await reputationService.computeReputation(graphData, {
    useTemporalPageRank: false,
    computeHybridScore: false,
    applyFairnessAdjustments: false
  });

  // Compute with hybrid scoring
  const hybridResults = await reputationService.computeReputation(graphData, {
    useTemporalPageRank: true,
    computeHybridScore: true,
    applyFairnessAdjustments: true
  });

  // Compare rankings
  const baselineRanking = Array.from(baselineResults.scores.entries())
    .sort((a, b) => b[1].finalScore - a[1].finalScore)
    .map(([id], index) => ({ id, rank: index + 1 }));

  const hybridRanking = Array.from(hybridResults.scores.entries())
    .sort((a, b) => b[1].finalScore - a[1].finalScore)
    .map(([id], index) => ({ id, rank: index + 1 }));

  console.log('\n📊 Ranking Comparison:');
  console.log('Baseline vs Hybrid:');
  for (const baseline of baselineRanking.slice(0, 10)) {
    const hybrid = hybridRanking.find(h => h.id === baseline.id);
    const rankChange = hybrid ? baseline.rank - hybrid.rank : 0;
    console.log(`  ${baseline.id}: ${baseline.rank} -> ${hybrid?.rank || 'N/A'} (${rankChange > 0 ? '+' : ''}${rankChange})`);
  }

  return { baselineResults, hybridResults };
}

/**
 * Example: Run Sybil attack simulation
 */
async function exampleSybilTest() {
  const dkgClient = createDKGClientV8({ environment: 'testnet' });
  const reputationService = createGraphReputationService(dkgClient);

  // Create legitimate graph
  const legitimateNodes: GraphNode[] = Array.from({ length: 10 }, (_, i) => ({
    id: `legit_${i}`,
    metadata: {
      stake: 100 + i * 10,
      contentQuality: 70 + i * 2
    }
  }));

  const legitimateEdges: GraphEdge[] = [];
  for (let i = 0; i < 10; i++) {
    legitimateEdges.push({
      source: `legit_${i}`,
      target: `legit_${(i + 1) % 10}`,
      weight: 0.7,
      edgeType: EdgeType.ENDORSE,
      timestamp: Date.now() - i * 7 * 24 * 60 * 60 * 1000
    });
  }

  // Inject Sybil cluster
  const sybilNodes: GraphNode[] = Array.from({ length: 20 }, (_, i) => ({
    id: `sybil_${i}`,
    metadata: {
      stake: 10,
      contentQuality: 30
    }
  }));

  const sybilEdges: GraphEdge[] = [];
  // Create dense cluster
  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < 5; j++) {
      sybilEdges.push({
        source: `sybil_${i}`,
        target: `sybil_${(i + j + 1) % 20}`,
        weight: 0.9,
        edgeType: EdgeType.ENDORSE,
        timestamp: Date.now()
      });
    }
  }
  // Connect one Sybil to legitimate graph
  sybilEdges.push({
    source: 'sybil_0',
    target: 'legit_0',
    weight: 0.1,
    edgeType: EdgeType.FOLLOW,
    timestamp: Date.now()
  });

  const graphData = {
    nodes: [...legitimateNodes, ...sybilNodes],
    edges: [...legitimateEdges, ...sybilEdges]
  };

  // Compute reputation with Sybil detection
  const results = await reputationService.computeReputation(graphData, {
    enableSybilDetection: true,
    computeHybridScore: true
  });

  // Analyze results
  const detectedSybils = Array.from(results.sybilProbabilities?.entries() || [])
    .filter(([_, prob]) => prob > 0.5)
    .map(([id]) => id);

  const truePositives = detectedSybils.filter(id => id.startsWith('sybil_')).length;
  const falsePositives = detectedSybils.filter(id => id.startsWith('legit_')).length;
  const precision = detectedSybils.length > 0 ? truePositives / detectedSybils.length : 0;
  const recall = detectedSybils.length > 0 ? truePositives / 20 : 0;

  console.log('\n🛡️  Sybil Detection Results:');
  console.log(`  Detected: ${detectedSybils.length} nodes`);
  console.log(`  True Positives: ${truePositives}/20`);
  console.log(`  False Positives: ${falsePositives}`);
  console.log(`  Precision: ${(precision * 100).toFixed(1)}%`);
  console.log(`  Recall: ${(recall * 100).toFixed(1)}%`);

  return results;
}

// Export examples
export {
  exampleComputeReputation,
  exampleCompareAlgorithms,
  exampleSybilTest
};

