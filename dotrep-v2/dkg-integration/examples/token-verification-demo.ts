/**
 * Token-Based Verification Demo
 * 
 * Demonstrates token-based verification and gating in the DotRep system:
 * - Token ownership verification (ERC-20, ERC-721, SBT)
 * - Action gating based on token requirements
 * - Reputation boost for token-holders
 * - Integration with DKG for verifiable proofs
 * - Graph algorithm enhancement with token weights
 * 
 * Run with: ts-node examples/token-verification-demo.ts
 */

import { createDKGClientV8, type DKGConfig } from '../dkg-client-v8';
import { createTokenVerificationService, TokenType, GatedAction } from '../token-verification-service';
import { createGraphReputationService } from '../graph-reputation-service';
import { GraphNode, GraphEdge, EdgeType } from '../graph-algorithms';

/**
 * Demo: Token-based verification and gating
 */
async function demonstrateTokenVerification() {
  console.log('🚀 Token-Based Verification Demo\n');
  console.log('='.repeat(60));

  // Initialize DKG client
  const dkgConfig: DKGConfig = {
    environment: 'testnet',
    useMockMode: true, // Use mock mode for demo
    enableTokenGating: true,
    tokenVerification: {
      useMockMode: true,
      publishProofsToDKG: true
    }
  };

  const dkgClient = createDKGClientV8(dkgConfig);
  console.log('✅ DKG Client initialized\n');

  // Initialize token verification service
  const tokenVerification = createTokenVerificationService({
    useMockMode: true,
    dkgClient,
    publishProofsToDKG: true
  });
  console.log('✅ Token Verification Service initialized\n');

  // Demo wallets
  const verifiedCreator = '0x1234567890123456789012345678901234567890';
  const regularUser = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const highStakeUser = '0x9876543210987654321098765432109876543210';

  console.log('📋 Demo Wallets:');
  console.log(`   Verified Creator: ${verifiedCreator}`);
  console.log(`   Regular User: ${regularUser}`);
  console.log(`   High Stake User: ${highStakeUser}\n`);

  // ==========================================
  // Demo 1: Token Ownership Verification
  // ==========================================
  console.log('🔐 Demo 1: Token Ownership Verification');
  console.log('-'.repeat(60));

  // Verify ERC-20 stake token balance
  const stakeVerification = await tokenVerification.verifyToken(highStakeUser, {
    tokenType: TokenType.ERC20,
    tokenAddress: '0x0000000000000000000000000000000000000000', // Mock address
    minBalance: BigInt(100) * BigInt(10 ** 18), // 100 tokens
    description: 'Minimum stake requirement'
  });

  console.log(`\n✅ Stake Token Verification:`);
  console.log(`   Wallet: ${stakeVerification.walletAddress}`);
  console.log(`   Verified: ${stakeVerification.verified}`);
  console.log(`   Balance: ${stakeVerification.balance?.toString() || 'N/A'}`);
  console.log(`   Required: ${stakeVerification.requiredBalance?.toString() || 'N/A'}`);
  if (stakeVerification.proof) {
    console.log(`   Proof Block: ${stakeVerification.proof.blockNumber}`);
  }

  // Verify ERC-721 NFT ownership
  const nftVerification = await tokenVerification.verifyToken(verifiedCreator, {
    tokenType: TokenType.ERC721,
    tokenAddress: '0x1111111111111111111111111111111111111111', // Mock NFT address
    tokenId: '1',
    mustOwn: true,
    description: 'Verified Creator NFT'
  });

  console.log(`\n✅ NFT Verification:`);
  console.log(`   Wallet: ${nftVerification.walletAddress}`);
  console.log(`   Verified: ${nftVerification.verified}`);
  console.log(`   Owns Token: ${nftVerification.ownsToken}`);
  console.log(`   Token ID: ${nftVerification.tokenId}`);

  // ==========================================
  // Demo 2: Action Gating
  // ==========================================
  console.log('\n\n🚪 Demo 2: Action Gating');
  console.log('-'.repeat(60));

  // Check if users can perform gated actions
  const actions = [
    GatedAction.PUBLISH_ENDORSEMENT,
    GatedAction.CREATE_VERIFIED_ENDORSEMENT,
    GatedAction.VOTE,
    GatedAction.ACCESS_PREMIUM
  ];

  for (const action of actions) {
    console.log(`\n📋 Action: ${action}`);
    
    // Check verified creator
    const creatorAccess = await tokenVerification.checkActionAccess(verifiedCreator, action);
    console.log(`   Verified Creator: ${creatorAccess.allowed ? '✅ Allowed' : '❌ Denied'}`);
    if (!creatorAccess.allowed && creatorAccess.reason) {
      console.log(`      Reason: ${creatorAccess.reason}`);
    }

    // Check regular user
    const regularAccess = await tokenVerification.checkActionAccess(regularUser, action);
    console.log(`   Regular User: ${regularAccess.allowed ? '✅ Allowed' : '❌ Denied'}`);
    if (!regularAccess.allowed && regularAccess.reason) {
      console.log(`      Reason: ${regularAccess.reason}`);
    }

    // Check high stake user
    const stakeAccess = await tokenVerification.checkActionAccess(highStakeUser, action);
    console.log(`   High Stake User: ${stakeAccess.allowed ? '✅ Allowed' : '❌ Denied'}`);
    if (!stakeAccess.allowed && stakeAccess.reason) {
      console.log(`      Reason: ${stakeAccess.reason}`);
    }
  }

  // ==========================================
  // Demo 3: Reputation Boost
  // ==========================================
  console.log('\n\n📈 Demo 3: Reputation Boost for Token-Holders');
  console.log('-'.repeat(60));

  for (const wallet of [verifiedCreator, regularUser, highStakeUser]) {
    const boost = await tokenVerification.getReputationBoost(wallet, GatedAction.PUBLISH_ENDORSEMENT);
    const stakeWeight = await tokenVerification.getStakeWeight(wallet, GatedAction.PUBLISH_ENDORSEMENT);
    
    console.log(`\n💰 ${wallet.substring(0, 10)}...`);
    console.log(`   Reputation Boost: +${boost}%`);
    console.log(`   Stake Weight Multiplier: ${stakeWeight}x`);
  }

  // ==========================================
  // Demo 4: DKG Integration - Token-Gated Publish
  // ==========================================
  console.log('\n\n📤 Demo 4: Token-Gated Publishing to DKG');
  console.log('-'.repeat(60));

  try {
    // Try to publish without token verification (should fail if gating enabled)
    console.log('\n❌ Attempting to publish without token verification...');
    try {
      await dkgClient.publishReputationAsset({
        developerId: regularUser,
        reputationScore: 750,
        contributions: [],
        timestamp: Date.now(),
        metadata: {}
      });
      console.log('   ⚠️  Published (token gating may be disabled)');
    } catch (error: any) {
      console.log(`   ✅ Correctly blocked: ${error.message}`);
    }

    // Publish with token verification
    console.log('\n✅ Publishing with token verification...');
    const publishResult = await dkgClient.publishReputationAsset(
      {
        developerId: verifiedCreator,
        reputationScore: 850,
        contributions: [],
        timestamp: Date.now(),
        metadata: {
          tokenVerified: true,
          verifiedCreator: true
        }
      },
      2,
      {
        walletAddress: verifiedCreator
      }
    );
    console.log(`   ✅ Published successfully!`);
    console.log(`   UAL: ${publishResult.UAL}`);
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // ==========================================
  // Demo 5: Graph Algorithm Enhancement
  // ==========================================
  console.log('\n\n🔗 Demo 5: Graph Algorithm Enhancement with Token Weights');
  console.log('-'.repeat(60));

  // Create sample graph
  const nodes: GraphNode[] = [
    { id: verifiedCreator, metadata: { stake: 1000, contentQuality: 90 } },
    { id: highStakeUser, metadata: { stake: 500, contentQuality: 80 } },
    { id: regularUser, metadata: { stake: 100, contentQuality: 70 } }
  ];

  const edges: GraphEdge[] = [
    {
      source: verifiedCreator,
      target: highStakeUser,
      weight: 0.8,
      edgeType: EdgeType.ENDORSE,
      timestamp: Date.now() - 86400000, // 1 day ago
      metadata: { endorsementStrength: 0.9 }
    },
    {
      source: highStakeUser,
      target: regularUser,
      weight: 0.6,
      edgeType: EdgeType.ENDORSE,
      timestamp: Date.now() - 172800000, // 2 days ago
      metadata: { endorsementStrength: 0.7 }
    },
    {
      source: regularUser,
      target: verifiedCreator,
      weight: 0.5,
      edgeType: EdgeType.ENDORSE,
      timestamp: Date.now() - 259200000, // 3 days ago
      metadata: { endorsementStrength: 0.6 }
    }
  ];

  console.log('\n📊 Original Graph:');
  console.log(`   Nodes: ${nodes.length}`);
  console.log(`   Edges: ${edges.length}`);
  edges.forEach(edge => {
    console.log(`   ${edge.source.substring(0, 10)}... -> ${edge.target.substring(0, 10)}... (weight: ${edge.weight})`);
  });

  // Enhance edges with token weights
  const enhancedEdges = await tokenVerification.enhanceEdgesWithTokenWeights(
    edges,
    GatedAction.PUBLISH_ENDORSEMENT
  );

  console.log('\n🔐 Enhanced Graph (with token weights):');
  enhancedEdges.forEach(edge => {
    const isTokenBacked = edge.metadata?.stakeBacked ? '🔐' : '';
    console.log(`   ${isTokenBacked} ${edge.source.substring(0, 10)}... -> ${edge.target.substring(0, 10)}... (weight: ${edge.weight.toFixed(3)})`);
  });

  // Compute reputation with token-enhanced graph
  const graphReputationService = createGraphReputationService(dkgClient);
  (graphReputationService as any).tokenVerification = tokenVerification; // Inject token verification

  console.log('\n📈 Computing reputation scores...');
  const reputationResult = await graphReputationService.computeReputation(
    { nodes, edges: enhancedEdges },
    {
      useTemporalPageRank: true,
      computeHybridScore: true,
      hybridWeights: {
        graph: 0.5,
        quality: 0.25,
        stake: 0.15,
        payment: 0.1
      }
    }
  );

  console.log('\n✅ Reputation Scores:');
  for (const [nodeId, score] of reputationResult.scores.entries()) {
    const walletLabel = nodeId === verifiedCreator ? 'Verified Creator' :
                       nodeId === highStakeUser ? 'High Stake User' :
                       'Regular User';
    console.log(`\n   ${walletLabel} (${nodeId.substring(0, 10)}...):`);
    console.log(`      Final Score: ${score.finalScore.toFixed(1)}`);
    console.log(`      Graph Score: ${score.graphScore.toFixed(1)}`);
    console.log(`      Stake Score: ${score.stakeScore.toFixed(1)}`);
    console.log(`      Percentile: ${score.percentile.toFixed(1)}%`);
  }

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ Token-Based Verification Demo Complete!');
  console.log('='.repeat(60));
  console.log('\n📝 Key Takeaways:');
  console.log('   1. Token ownership can be verified on-chain');
  console.log('   2. Actions can be gated based on token requirements');
  console.log('   3. Token-holders receive reputation boosts');
  console.log('   4. Graph algorithms weight token-backed edges higher');
  console.log('   5. All verification proofs can be published to DKG');
  console.log('\n🔐 This provides:');
  console.log('   - Sybil resistance (cost to create fake accounts)');
  console.log('   - Economic alignment (skin in the game)');
  console.log('   - Verifiable credentials (on-chain proof)');
  console.log('   - Transparent reputation (token-backed actions weighted higher)');
  console.log('\n');
}

// Run demo
if (require.main === module) {
  demonstrateTokenVerification().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { demonstrateTokenVerification };

