/**
 * Example: Publishing Developer Reputation to OriginTrail DKG
 * 
 * This example demonstrates how to publish a developer's reputation
 * as a Knowledge Asset on the OriginTrail Decentralized Knowledge Graph.
 */

import { DKGClient, ReputationAsset } from '../dkg-client';
import { KnowledgeAssetPublisher } from '../knowledge-asset-publisher';

async function main() {
  console.log('=== DotRep + OriginTrail DKG Integration Example ===\n');

  // Step 1: Initialize DKG Client
  console.log('Step 1: Initializing DKG Client...');
  const dkgClient = new DKGClient({
    environment: 'testnet',
    // Optionally override with custom config:
    // endpoint: 'https://v6-pegasus-node-02.origin-trail.network:8900',
    // blockchain: 'otp:20430',
    // wallet: process.env.DKG_PUBLISH_WALLET
  });

  // Check DKG health
  const isHealthy = await dkgClient.healthCheck();
  console.log(`DKG Connection: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`);

  if (!isHealthy) {
    console.error('DKG connection failed. Please check your configuration.');
    process.exit(1);
  }

  // Step 2: Create sample reputation data
  console.log('Step 2: Creating sample reputation data...');
  const sampleReputation: ReputationAsset = {
    developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    reputationScore: 850,
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
        type: 'github_commit',
        url: 'https://github.com/paritytech/substrate/commit/abc123',
        title: 'Fix critical security vulnerability',
        date: '2025-11-10T14:20:00Z',
        impact: 100
      },
      {
        id: 'contrib-003',
        type: 'github_pr',
        url: 'https://github.com/w3f/polkadot-spec/pull/567',
        title: 'Update runtime specification',
        date: '2025-11-05T09:15:00Z',
        impact: 80
      }
    ],
    timestamp: Date.now(),
    metadata: {
      githubUsername: 'alice-dev',
      totalPRs: 42,
      totalCommits: 256,
      languages: ['Rust', 'TypeScript', 'Go'],
      specializations: ['Consensus', 'Runtime', 'Security']
    }
  };

  console.log(`Developer ID: ${sampleReputation.developerId}`);
  console.log(`Reputation Score: ${sampleReputation.reputationScore}/1000`);
  console.log(`Contributions: ${sampleReputation.contributions.length}\n`);

  // Step 3: Publish to DKG
  console.log('Step 3: Publishing reputation to OriginTrail DKG...');
  try {
    const result = await dkgClient.publishReputationAsset(sampleReputation, 2);
    
    console.log('✅ Successfully published to DKG!');
    console.log(`UAL: ${result.UAL}`);
    if (result.transactionHash) {
      console.log(`Transaction Hash: ${result.transactionHash}`);
    }
    if (result.blockNumber) {
      console.log(`Block Number: ${result.blockNumber}`);
    }
    console.log('');

    // Step 4: Query the published reputation
    console.log('Step 4: Querying published reputation from DKG...');
    const queriedReputation = await dkgClient.queryReputation(result.UAL);
    
    console.log('✅ Successfully queried reputation!');
    console.log(`Reputation Score: ${queriedReputation['dotrep:reputationScore']}`);
    console.log(`Contribution Count: ${queriedReputation['dotrep:contributions'].length}`);
    console.log(`Last Modified: ${queriedReputation.dateModified}\n`);

    // Step 5: Demonstrate high-level publisher
    console.log('Step 5: Using Knowledge Asset Publisher...');
    const publisher = new KnowledgeAssetPublisher(dkgClient);

    const developerData = {
      developer: {
        id: 'bob',
        address: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
        username: 'bob-dev',
        githubId: 'bob-github'
      },
      score: 720,
      contributions: [
        {
          id: 'contrib-004',
          type: 'gitlab_mr',
          url: 'https://gitlab.com/project/merge_requests/789',
          title: 'Implement new feature',
          date: '2025-11-20T11:00:00Z',
          impact: 75
        }
      ],
      lastUpdated: new Date()
    };

    const publishResult = await publisher.publishDeveloperReputation(developerData);
    console.log(`✅ Published via Publisher: ${publishResult.UAL}\n`);

    // Step 6: Search for developers
    console.log('Step 6: Searching for developers by ID...');
    const searchResults = await dkgClient.searchByDeveloper(sampleReputation.developerId);
    console.log(`Found ${searchResults.length} reputation records for developer\n`);

    // Summary
    console.log('=== Summary ===');
    console.log('✅ DKG connection established');
    console.log('✅ Reputation published as Knowledge Asset');
    console.log('✅ UAL stored for future queries');
    console.log('✅ Reputation data verified on DKG');
    console.log('\nNext steps:');
    console.log('1. Store UAL on Polkadot chain via Substrate extrinsic');
    console.log('2. Enable AI agents to query via MCP server');
    console.log('3. Implement x402 micropayments for premium access');
    console.log('4. Set up automatic publishing for new contributions\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Check DKG_PUBLISH_WALLET environment variable');
    console.error('2. Ensure wallet has TRAC tokens for testnet');
    console.error('3. Verify DKG_OTNODE_URL is accessible');
    console.error('4. Check network connectivity\n');
    process.exit(1);
  }
}

// Run the example
main().catch(console.error);
