/**
 * Polkadot + NeuroWeb + OriginTrail DKG Integration Demo
 * 
 * This demo showcases the complete integration flow as described in the
 * Polkadot integration guidance:
 * 
 * 1. Compute reputation off-chain
 * 2. Publish Reputation KA to DKG (anchored on NeuroWeb)
 * 3. Watch for anchor event on NeuroWeb
 * 4. Verify KA discoverability with SPARQL DESCRIBE
 * 5. Simulate XCM payment trigger
 * 6. Integrate Guardian verification
 * 
 * Usage:
 *   tsx dkg-integration/examples/polkadot-neuroweb-demo.ts
 */

import { KnowledgeAssetPublisherV8 } from '../knowledge-asset-publisher-v8';
import { DKGClientV8 } from '../dkg-client-v8';
import { NeuroWebEventWatcher } from '../neuroweb-event-watcher';
import { XCMIntegration } from '../xcm-integration';
import { SPARQLDescribeHelper } from '../sparql-describe-helper';
import { getGuardianApi } from '../../server/_core/guardianApi';
import { PolkadotApiService } from '../../server/_core/polkadotApi';

interface DemoConfig {
  developerId: string;
  developerAddress: string;
  reputationScore: number;
  contributions: any[];
  useMockMode?: boolean;
}

/**
 * Run the complete demo flow
 */
export async function runPolkadotNeuroWebDemo(config: DemoConfig): Promise<void> {
  console.log('\n🎬 Starting Polkadot + NeuroWeb + DKG Integration Demo\n');
  console.log('=' .repeat(60));

  const { developerId, developerAddress, reputationScore, contributions, useMockMode = true } = config;

  try {
    // Step 1: Initialize services
    console.log('\n📦 Step 1: Initializing services...');
    const dkgClient = new DKGClientV8({ useMockMode, fallbackToMock: true });
    const publisher = new KnowledgeAssetPublisherV8(dkgClient);
    const watcher = new NeuroWebEventWatcher({ 
      useMockMode,
      onAnchorDetected: (event) => {
        console.log(`\n✅ Anchor detected in callback!`);
        console.log(`   UAL: ${event.ual}`);
        console.log(`   Block: #${event.blockNumber}`);
      }
    });
    const xcmIntegration = new XCMIntegration({ useMockMode });
    const sparqlHelper = new SPARQLDescribeHelper(dkgClient);
    const guardianApi = getGuardianApi({ useMockMode, fallbackToMock: true });
    const polkadotApi = new PolkadotApiService();

    // Step 2: Compute reputation (off-chain)
    console.log('\n📊 Step 2: Computing reputation (off-chain)...');
    console.log(`   Developer: ${developerId} (${developerAddress})`);
    console.log(`   Score: ${reputationScore}`);
    console.log(`   Contributions: ${contributions.length}`);

    // Step 3: Publish Reputation KA to DKG
    console.log('\n📤 Step 3: Publishing Reputation KA to DKG...');
    const publishResult = await publisher.publishDeveloperReputation({
      developer: {
        id: developerId,
        address: developerAddress,
      },
      score: reputationScore,
      contributions,
      lastUpdated: new Date(),
    }, {
      epochs: 2,
      forceUpdate: false,
      includePII: false,
    });

    console.log(`✅ Published! UAL: ${publishResult.UAL}`);
    if (publishResult.transactionHash) {
      console.log(`   Transaction: ${publishResult.transactionHash}`);
    }

    // Step 4: Start watching for NeuroWeb anchor events
    console.log('\n👀 Step 4: Starting NeuroWeb event watcher...');
    await watcher.startWatching();
    console.log('✅ Event watcher started');

    // In a real scenario, the anchor event would be detected automatically
    // For demo, we'll wait a moment and then check
    await new Promise(resolve => setTimeout(resolve, 2000));

    const latestAnchor = watcher.getLatestAnchor();
    if (latestAnchor) {
      console.log(`\n📌 Latest anchor detected:`);
      console.log(`   UAL: ${latestAnchor.ual}`);
      console.log(`   Block: #${latestAnchor.blockNumber}`);
      console.log(`   Transaction: ${latestAnchor.transactionHash}`);
    } else {
      console.log('ℹ️  No anchor events detected yet (this is normal in mock mode)');
    }

    // Step 5: Verify KA discoverability with SPARQL DESCRIBE
    console.log('\n🔍 Step 5: Verifying KA discoverability with SPARQL DESCRIBE...');
    const discoverability = await sparqlHelper.verifyDiscoverability(publishResult.UAL);
    
    if (discoverability.discoverable && discoverability.result) {
      console.log(`✅ KA is discoverable on DKG!`);
      console.log(`   UAL: ${discoverability.result.ual}`);
      if (discoverability.result.provenance) {
        console.log(`   Created: ${discoverability.result.provenance.createdAt || 'N/A'}`);
        if (discoverability.result.provenance.previousVersion) {
          console.log(`   Previous version: ${discoverability.result.provenance.previousVersion}`);
        }
      }
    } else {
      console.log(`⚠️  KA discoverability check: ${discoverability.error || 'Unknown error'}`);
    }

    // Step 6: Simulate XCM payment trigger
    console.log('\n💸 Step 6: Simulating XCM payment trigger...');
    const brandAddress = '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty';
    const paymentAmount = 1000;

    const xcmFlow = await xcmIntegration.demoPaymentToReputationFlow(
      brandAddress,
      developerAddress,
      paymentAmount
    );

    console.log(`✅ XCM flow completed!`);
    console.log(`   Payment event: ${xcmFlow.paymentEvent.type}`);
    if (xcmFlow.reputationEvent) {
      console.log(`   Reputation event: ${xcmFlow.reputationEvent.type}`);
    }

    // Step 7: Guardian verification (optional)
    console.log('\n🛡️  Step 7: Running Guardian content verification...');
    const contentUrl = `https://example.com/user/${developerId}/post/123`;
    
    const guardianResult = await guardianApi.verifyContent({
      contentUrl,
      contentType: 'text',
      checkType: 'all',
    });

    console.log(`✅ Guardian verification completed!`);
    console.log(`   Status: ${guardianResult.status}`);
    console.log(`   Confidence: ${(guardianResult.confidence * 100).toFixed(1)}%`);
    console.log(`   Recommended action: ${guardianResult.recommendedAction}`);
    if (guardianResult.matches.length > 0) {
      console.log(`   Matches found: ${guardianResult.matches.length}`);
      guardianResult.matches.forEach(match => {
        console.log(`     - ${match.matchType}: ${(match.confidence * 100).toFixed(1)}% confidence`);
        if (match.sourceUAL) {
          console.log(`       Source UAL: ${match.sourceUAL}`);
        }
      });
    }

    // Step 8: Check NeuroWeb connection status
    console.log('\n🔌 Step 8: Checking NeuroWeb connection...');
    try {
      await polkadotApi.connect();
      const isNeuroWeb = await polkadotApi.isNeuroWeb();
      const neurowebInfo = await polkadotApi.getNeuroWebInfo();

      if (isNeuroWeb && neurowebInfo) {
        console.log(`✅ Connected to NeuroWeb parachain!`);
        console.log(`   Chain: ${neurowebInfo.chainName}`);
        console.log(`   Relay chain: ${neurowebInfo.relayChain}`);
        console.log(`   Current block: #${neurowebInfo.blockNumber}`);
      } else {
        console.log(`ℹ️  Connected to Polkadot (not NeuroWeb-specific)`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not connect to Polkadot/NeuroWeb: ${error.message}`);
      console.log(`   (This is expected in mock mode or without RPC access)`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   ✓ Reputation KA published: ${publishResult.UAL}`);
    console.log(`   ✓ NeuroWeb anchor: ${latestAnchor ? 'Detected' : 'Simulated'}`);
    console.log(`   ✓ DKG discoverability: ${discoverability.discoverable ? 'Verified' : 'Pending'}`);
    console.log(`   ✓ XCM flow: Completed`);
    console.log(`   ✓ Guardian verification: ${guardianResult.status}`);
    console.log('\n🎉 All integration points demonstrated!');

  } catch (error: any) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Example usage
 */
if (require.main === module) {
  const demoConfig: DemoConfig = {
    developerId: 'alice-dev',
    developerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    reputationScore: 850,
    contributions: [
      {
        id: 'contrib-1',
        type: 'github_pr',
        url: 'https://github.com/example/repo/pull/123',
        title: 'Fix critical bug',
        date: new Date().toISOString(),
        impact: 10,
      },
      {
        id: 'contrib-2',
        type: 'github_commit',
        url: 'https://github.com/example/repo/commit/abc123',
        title: 'Add new feature',
        date: new Date().toISOString(),
        impact: 8,
      },
    ],
    useMockMode: true,
  };

  runPolkadotNeuroWebDemo(demoConfig)
    .then(() => {
      console.log('\n✅ Demo script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo script failed:', error);
      process.exit(1);
    });
}

export default runPolkadotNeuroWebDemo;

