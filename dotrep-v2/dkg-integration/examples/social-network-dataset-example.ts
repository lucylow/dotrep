/**
 * Social Network Dataset Loading Example
 * 
 * Demonstrates how to load and process social network datasets from various formats
 * and use them with the Social Graph Reputation Service.
 * 
 * Supported datasets:
 * - Bitcoin-OTC (SNAP format)
 * - Bitcoin-Alpha (SNAP format)
 * - Reddit Hyperlinks (SNAP format)
 * - Facebook Ego (SNAP format)
 * - Custom JSON/CSV datasets
 */

import { createDKGClientV8 } from '../dkg-client-v8';
import { createSocialGraphReputationService } from '../social-graph-reputation-service';
import { 
  createSocialNetworkDatasetLoader, 
  SocialNetworkDatasetLoader,
  downloadDataset 
} from '../social-network-dataset-loader';
import * as path from 'path';

/**
 * Example 1: Load Bitcoin-OTC dataset and compute reputation
 * 
 * Demonstrates:
 * - Downloading dataset automatically
 * - Loading with enhanced statistics
 * - Signed network analysis (trust/distrust)
 */
async function exampleBitcoinOTCDataset() {
  console.log('\n📊 Example 1: Bitcoin-OTC Trust Network Dataset\n');
  console.log('=' .repeat(60));

  // Initialize services
  const dkgClient = createDKGClientV8({ useMockMode: true });
  const reputationService = createSocialGraphReputationService(dkgClient);
  const datasetLoader = createSocialNetworkDatasetLoader();

  // Get dataset info
  const datasetInfo = SocialNetworkDatasetLoader.getDatasetInfo('bitcoin-otc');
  if (datasetInfo) {
    console.log(`Dataset: ${datasetInfo.name}`);
    console.log(`URL: ${datasetInfo.url}`);
    console.log(`Description: ${datasetInfo.description}`);
    console.log(`Expected: ${datasetInfo.expectedNodes} nodes, ${datasetInfo.expectedEdges} edges`);
    if (datasetInfo.recommendedFor) {
      console.log(`Recommended for: ${datasetInfo.recommendedFor.join(', ')}`);
    }
    console.log();
  }

  // Try to download dataset if not exists
  let datasetPath = path.join(__dirname, '../../data/soc-sign-bitcoin-otc.txt');
  
  if (!require('fs').existsSync(datasetPath) && datasetInfo?.downloadUrl) {
    console.log('📥 Dataset not found locally. Attempting to download...');
    try {
      datasetPath = await downloadDataset('bitcoin-otc', {
        outputDir: path.join(__dirname, '../../data')
      });
    } catch (error: any) {
      console.log(`⚠️  Auto-download failed: ${error.message}`);
      console.log(`   Please download manually from: ${datasetInfo?.url}`);
    }
  }
  
  try {
    const dataset = await datasetLoader.loadFromFile(datasetPath, {
      format: 'snap',
      directed: true,
      weighted: true,
      signed: true,
      temporal: true,
      maxNodes: 1000, // Limit for demo
      normalizeWeights: true
    });

    console.log(`✅ Loaded: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges`);
    console.log(`   Statistics:`);
    console.log(`   - Density: ${dataset.statistics.density.toFixed(4)}`);
    console.log(`   - Average degree: ${dataset.statistics.averageDegree.toFixed(2)}`);
    console.log(`   - Weight range: ${dataset.statistics.weightRange?.min.toFixed(2)} - ${dataset.statistics.weightRange?.max.toFixed(2)}`);
    if (dataset.statistics.connectedComponents !== undefined) {
      console.log(`   - Connected components: ${dataset.statistics.connectedComponents}`);
    }
    if (dataset.statistics.averageClustering !== undefined) {
      console.log(`   - Average clustering: ${dataset.statistics.averageClustering.toFixed(4)}`);
    }
    if (dataset.metadata.signed && dataset.statistics.weightRange) {
      const wr = dataset.statistics.weightRange as any;
      if (wr.trustRatio !== undefined) {
        console.log(`   - Trust ratio: ${(wr.trustRatio * 100).toFixed(1)}% positive, ${(wr.distrustRatio * 100).toFixed(1)}% negative`);
      }
    }
    if (dataset.statistics.timestampRange) {
      const days = (dataset.statistics.timestampRange.max - dataset.statistics.timestampRange.min) / (1000 * 60 * 60 * 24);
      console.log(`   - Time span: ${days.toFixed(0)} days`);
    }

    // Compute reputation
    console.log('\n🧮 Computing reputation scores...');
    const { scores, sybilRisks } = await reputationService.computeReputation(
      { nodes: dataset.nodes, edges: dataset.edges },
      {
        enableSybilDetection: true,
        pagerankConfig: {
          dampingFactor: 0.85,
          maxIterations: 100
        }
      }
    );

    // Get top users
    const topUsers = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.log('\n🏆 Top 10 Users by Reputation:');
    topUsers.forEach(([userId, score], index) => {
      const sybilRisk = sybilRisks.get(userId) || 0;
      const flag = sybilRisk > 0.7 ? '⚠️ ' : '✅';
      console.log(`   ${index + 1}. ${flag} ${userId}: ${score.toFixed(4)} (Sybil risk: ${sybilRisk.toFixed(2)})`);
    });

    // Publish snapshot to DKG
    console.log('\n🔗 Publishing reputation snapshot to DKG...');
    const snapshot = await reputationService.publishReputationSnapshot(
      scores,
      sybilRisks,
      {
        algorithm: 'TrustWeightedPageRank',
        algorithmVersion: '1.2',
        includeSybilAnalysis: true
      }
    );

    console.log(`✅ Published snapshot: ${snapshot.UAL}`);

  } catch (error: any) {
    if (error.message.includes('not found')) {
      console.log('⚠️  Dataset file not found. Please download from:');
      console.log('   https://snap.stanford.edu/data/soc-sign-bitcoin-otc.html');
      console.log('   Save to: data/soc-sign-bitcoin-otc.txt');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

/**
 * Example 2: Load custom JSON dataset
 */
async function exampleCustomJSONDataset() {
  console.log('\n📊 Example 2: Custom JSON Dataset\n');
  console.log('=' .repeat(60));

  const datasetLoader = createSocialNetworkDatasetLoader();

  // Example JSON dataset structure
  const jsonDatasetPath = path.join(__dirname, '../../data/custom-social-network.json');
  
  // Create example dataset if it doesn't exist
  const exampleData = {
    name: 'Custom Social Network',
    description: 'Example social network dataset',
    nodes: [
      { id: 'user1', name: 'Alice', role: 'developer' },
      { id: 'user2', name: 'Bob', role: 'designer' },
      { id: 'user3', name: 'Charlie', role: 'developer' },
      { id: 'user4', name: 'Diana', role: 'manager' }
    ],
    edges: [
      { source: 'user1', target: 'user2', weight: 0.8, type: 'collaborates' },
      { source: 'user1', target: 'user3', weight: 0.9, type: 'collaborates' },
      { source: 'user2', target: 'user4', weight: 0.7, type: 'reports_to' },
      { source: 'user3', target: 'user1', weight: 0.85, type: 'endorses' }
    ],
    directed: true,
    weighted: true
  };

  try {
    const dataset = await datasetLoader.loadFromFile(jsonDatasetPath, {
      format: 'json',
      normalizeWeights: true
    });

    console.log(`✅ Loaded custom dataset: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges`);
    console.log(`   Metadata: ${dataset.metadata.name}`);
    
  } catch (error: any) {
    console.log('ℹ️  Custom dataset not found. This is expected for demo.');
    console.log('   To use this example, create a JSON file with the structure shown above.');
  }
}

/**
 * Example 3: Load Reddit Hyperlinks dataset
 */
async function exampleRedditDataset() {
  console.log('\n📊 Example 3: Reddit Hyperlinks Dataset\n');
  console.log('=' .repeat(60));

  const datasetLoader = createSocialNetworkDatasetLoader();
  const datasetInfo = SocialNetworkDatasetLoader.getDatasetInfo('reddit-hyperlinks');

  if (datasetInfo) {
    console.log(`Dataset: ${datasetInfo.name}`);
    console.log(`URL: ${datasetInfo.url}`);
    console.log(`Expected: ${datasetInfo.expectedNodes} nodes, ${datasetInfo.expectedEdges} edges\n`);
  }

  const datasetPath = path.join(__dirname, '../../data/soc-RedditHyperlinks.txt');

  try {
    const dataset = await datasetLoader.loadFromFile(datasetPath, {
      format: 'snap',
      directed: true,
      signed: true,
      temporal: true,
      maxNodes: 5000, // Limit for demo
      maxEdges: 50000
    });

    console.log(`✅ Loaded: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges`);
    console.log(`   Format: ${dataset.metadata.format}`);
    console.log(`   Signed: ${dataset.metadata.signed}, Temporal: ${dataset.metadata.temporal}`);

  } catch (error: any) {
    if (error.message.includes('not found')) {
      console.log('⚠️  Dataset file not found. Please download from:');
      console.log('   https://snap.stanford.edu/data/soc-RedditHyperlinks.html');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

/**
 * Example 4: Use dataset with reputation service directly
 */
async function exampleIntegratedWorkflow() {
  console.log('\n📊 Example 4: Integrated Dataset + Reputation Workflow\n');
  console.log('=' .repeat(60));

  const dkgClient = createDKGClientV8({ useMockMode: true });
  const reputationService = createSocialGraphReputationService(dkgClient);

  // Load dataset directly through reputation service
  const datasetPath = path.join(__dirname, '../../data/soc-sign-bitcoin-alpha.txt');

  try {
    // Ingest from dataset file
    const graphData = await reputationService.ingestSocialGraphData({
      datasetFile: datasetPath,
      datasetOptions: {
        format: 'snap',
        directed: true,
        weighted: true,
        signed: true,
        temporal: true,
        maxNodes: 500
      }
    });

    console.log(`✅ Ingested: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);

    // Compute reputation
    const { scores, sybilRisks } = await reputationService.computeReputation(graphData, {
      enableSybilDetection: true
    });

    console.log(`✅ Computed reputation for ${scores.size} users`);

    // Query specific user
    const topUser = Array.from(scores.entries())[0];
    if (topUser) {
      const userRep = await reputationService.queryUserReputation({
        userDID: topUser[0],
        includeSybilRisk: true
      });

      console.log(`\n👤 User: ${userRep.user}`);
      console.log(`   Reputation: ${userRep.reputationScore.toFixed(4)}`);
      console.log(`   Trust Level: ${userRep.trustLevel}`);
      console.log(`   Sybil Risk: ${userRep.sybilRisk.toFixed(2)}`);
    }

  } catch (error: any) {
    if (error.message.includes('not found')) {
      console.log('⚠️  Dataset file not found. Please download from:');
      console.log('   https://snap.stanford.edu/data/soc-sign-bitcoin-alpha.html');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

/**
 * Example 5: List all available datasets
 */
async function exampleListDatasets() {
  console.log('\n📋 Example 5: List Available Datasets\n');
  console.log('=' .repeat(60));

  const datasets = SocialNetworkDatasetLoader.listAvailableDatasets();
  
  console.log(`\n📊 Found ${datasets.length} available datasets:\n`);
  
  datasets.forEach((dataset, index) => {
    console.log(`${index + 1}. ${dataset.name}`);
    console.log(`   Key: ${dataset.key}`);
    console.log(`   Nodes: ${dataset.nodes.toLocaleString()}, Edges: ${dataset.edges.toLocaleString()}`);
    console.log(`   Type: ${dataset.type}`);
    console.log(`   Properties: ${dataset.properties.join(', ')}`);
    
    const info = SocialNetworkDatasetLoader.getDatasetInfo(dataset.key);
    if (info?.downloadUrl) {
      console.log(`   Download: ${info.downloadUrl}`);
    }
    console.log();
  });
}

/**
 * Main function to run all examples
 */
async function main() {
  console.log('\n🚀 Social Network Dataset Loading Examples\n');
  console.log('=' .repeat(60));

  try {
    // Run examples
    await exampleListDatasets();
    await exampleBitcoinOTCDataset();
    await exampleCustomJSONDataset();
    await exampleRedditDataset();
    await exampleIntegratedWorkflow();

    console.log('\n✅ All examples completed!\n');
  } catch (error: any) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  exampleBitcoinOTCDataset,
  exampleCustomJSONDataset,
  exampleRedditDataset,
  exampleIntegratedWorkflow
};

