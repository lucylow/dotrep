/**
 * Example: Publishing Developer Reputation to OriginTrail DKG (V8)
 * 
 * This example demonstrates how to:
 * 1. Initialize the DKG client (V8 compatible)
 * 2. Create reputation data for a developer
 * 3. Publish reputation as a Knowledge Asset
 * 4. Query the published reputation
 * 5. Update reputation data
 * 
 * Usage:
 *   npx ts-node examples/publish-reputation-example-v8.ts
 */

import { DKGClientV8 } from '../dkg-client-v8';
import { KnowledgeAssetPublisherV8, ReputationData } from '../knowledge-asset-publisher-v8';

async function main() {
  console.log('🚀 DotRep + OriginTrail DKG Integration Example (V8)\n');

  try {
    // Step 1: Initialize DKG Client
    console.log('📡 Step 1: Initializing DKG Client...\n');
    const dkgClient = new DKGClientV8({
      environment: 'testnet',
      // Optional: Override default settings
      // endpoint: 'https://v6-pegasus-node-02.origin-trail.network:8900',
      // blockchain: {
      //   name: 'otp:20430',
      //   privateKey: 'your_private_key_here'
      // }
    });

    // Check DKG connection health
    const isHealthy = await dkgClient.healthCheck();
    if (!isHealthy) {
      throw new Error('DKG connection is not healthy. Please check your configuration.');
    }

    // Get node info
    const nodeInfo = await dkgClient.getNodeInfo();
    console.log(`✅ Connected to DKG Node v${nodeInfo.version}\n`);

    // Step 2: Create Publisher
    console.log('📝 Step 2: Creating Knowledge Asset Publisher...\n');
    const publisher = new KnowledgeAssetPublisherV8(dkgClient);

    // Step 3: Prepare Reputation Data
    console.log('📊 Step 3: Preparing reputation data...\n');
    
    const developerReputation: ReputationData = {
      developer: {
        id: 'dev-001',
        address: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
        username: 'alice_developer',
        githubId: 'alice-dev',
        email: 'alice@example.com'
      },
      score: 850,
      contributions: [
        {
          id: 'contrib-001',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/1234',
          title: 'Add new consensus mechanism',
          date: '2025-11-15T10:30:00Z',
          impact: 95
        },
        {
          id: 'contrib-002',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/1235',
          title: 'Fix critical security vulnerability',
          date: '2025-11-10T14:20:00Z',
          impact: 100
        },
        {
          id: 'contrib-003',
          type: 'github_commit',
          url: 'https://github.com/paritytech/substrate/commit/abc123',
          title: 'Improve runtime performance',
          date: '2025-11-05T09:15:00Z',
          impact: 75
        }
      ],
      lastUpdated: new Date()
    };

    console.log(`Developer: ${developerReputation.developer.username}`);
    console.log(`Address: ${developerReputation.developer.address}`);
    console.log(`Reputation Score: ${developerReputation.score}`);
    console.log(`Contributions: ${developerReputation.contributions.length}\n`);

    // Step 4: Publish Reputation to DKG
    console.log('📤 Step 4: Publishing reputation to DKG...\n');
    
    const publishResult = await publisher.publishDeveloperReputation(
      developerReputation,
      {
        epochs: 2,
        includePII: false // Don't include email in public data
      }
    );

    console.log('\n✅ Reputation published successfully!');
    console.log(`🔗 UAL: ${publishResult.UAL}`);
    if (publishResult.transactionHash) {
      console.log(`📝 Transaction Hash: ${publishResult.transactionHash}`);
    }
    if (publishResult.blockNumber) {
      console.log(`🔢 Block Number: ${publishResult.blockNumber}`);
    }

    // Step 5: Query the Published Reputation
    console.log('\n🔍 Step 5: Querying published reputation...\n');
    
    const queriedReputation = await dkgClient.queryReputation(publishResult.UAL);
    
    console.log('Retrieved reputation data:');
    console.log(`  Developer ID: ${queriedReputation.identifier}`);
    console.log(`  Reputation Score: ${queriedReputation['dotrep:reputationScore']}`);
    console.log(`  Contributions: ${queriedReputation['dotrep:contributions'].length}`);
    console.log(`  Last Modified: ${queriedReputation.dateModified}`);

    // Step 6: Search by Developer ID
    console.log('\n🔎 Step 6: Searching for developer by ID...\n');
    
    const searchResults = await dkgClient.searchByDeveloper(
      developerReputation.developer.address
    );
    
    console.log(`Found ${searchResults.length} reputation asset(s) for this developer`);

    // Step 7: Update Reputation (Example)
    console.log('\n🔄 Step 7: Updating reputation (example)...\n');
    
    const updatedReputation: ReputationData = {
      ...developerReputation,
      score: 900, // Increased score
      contributions: [
        ...developerReputation.contributions,
        {
          id: 'contrib-004',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/1236',
          title: 'Implement new feature',
          date: '2025-11-20T16:45:00Z',
          impact: 85
        }
      ],
      lastUpdated: new Date()
    };

    const updateResult = await publisher.updateDeveloperReputation(
      developerReputation.developer.id,
      updatedReputation
    );

    console.log(`✅ Reputation updated!`);
    console.log(`🔗 New UAL: ${updateResult.UAL}`);

    // Step 8: Batch Publish Example
    console.log('\n📦 Step 8: Batch publishing example...\n');
    
    const batchReputations: ReputationData[] = [
      {
        developer: {
          id: 'dev-002',
          address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
          username: 'bob_developer',
          githubId: 'bob-dev'
        },
        score: 720,
        contributions: [
          {
            id: 'contrib-b001',
            type: 'github_pr',
            url: 'https://github.com/example/repo/pull/100',
            title: 'Add documentation',
            date: '2025-11-18T12:00:00Z',
            impact: 60
          }
        ],
        lastUpdated: new Date()
      },
      {
        developer: {
          id: 'dev-003',
          address: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
          username: 'charlie_developer',
          githubId: 'charlie-dev'
        },
        score: 680,
        contributions: [
          {
            id: 'contrib-c001',
            type: 'github_commit',
            url: 'https://github.com/example/repo/commit/xyz789',
            title: 'Fix bug',
            date: '2025-11-17T10:30:00Z',
            impact: 55
          }
        ],
        lastUpdated: new Date()
      }
    ];

    const batchResults = await publisher.batchPublish(batchReputations, {
      epochs: 2,
      includePII: false
    });

    console.log(`\n✅ Batch publish complete: ${batchResults.length} assets published`);
    batchResults.forEach((result, index) => {
      if (result.UAL) {
        console.log(`  ${index + 1}. ${batchReputations[index].developer.username}: ${result.UAL}`);
      }
    });

    // Step 9: Cache Statistics
    console.log('\n📊 Step 9: Cache statistics...\n');
    
    const cacheStats = publisher.getCacheStats();
    console.log(`Cache size: ${cacheStats.size} developers`);
    console.log(`Cached developers: ${cacheStats.developers.join(', ')}`);

    // Step 10: Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Example completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📚 What you learned:');
    console.log('  ✓ Initialize DKG Client V8');
    console.log('  ✓ Publish reputation as Knowledge Asset');
    console.log('  ✓ Query reputation from DKG');
    console.log('  ✓ Update existing reputation');
    console.log('  ✓ Batch publish multiple reputations');
    console.log('  ✓ Search for developers');
    console.log('\n🔗 Next steps:');
    console.log('  • Integrate with your DotRep backend');
    console.log('  • Set up MCP server for AI agents');
    console.log('  • Deploy to production with mainnet');
    console.log('  • Add x402 micropayments for premium access');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Error occurred:', error.message);
    console.error('\n📋 Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the example
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
