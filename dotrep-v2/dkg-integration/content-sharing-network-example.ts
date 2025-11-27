/**
 * Content-Sharing Network Service - Usage Example
 * 
 * Demonstrates how to use the enhanced content-sharing network service
 * with DeciTrustNET and Comprehensive Reputation (CR) Model features.
 */

import { createDKGClientV8 } from './dkg-client-v8';
import { createContentSharingNetworkService, ContentSharingInteraction, PersonalizedFeedback } from './content-sharing-network';

async function main() {
  console.log('🚀 Content-Sharing Network Service Example\n');

  // Initialize DKG client
  const dkgClient = createDKGClientV8({
    environment: 'testnet',
    useMockMode: true // Use mock mode for demo
  });

  // Initialize content-sharing network service with all features enabled
  const networkService = createContentSharingNetworkService(dkgClient, {
    enableDoubleSupervisedFeedback: true,
    enablePairwiseTrust: true,
    enableDeceptionFiltering: true,
    enableComprehensiveReputation: true,
    enableEnhancedMetrics: true,
    trustDecayFactor: 0.1,
    minInteractionsForTrust: 3,
    deceptionThreshold: 0.7
  });

  console.log('✅ Content-Sharing Network Service initialized\n');

  // Example 1: Record content-sharing interactions
  console.log('📝 Example 1: Recording content-sharing interactions');
  
  const interactions: ContentSharingInteraction[] = [
    {
      interactionId: 'int-1',
      fromUser: 'did:polkadot:alice',
      toUser: 'did:polkadot:bob',
      contentUAL: 'ual:org:dkg:content:123',
      interactionType: 'share',
      timestamp: Date.now() - 86400000, // 1 day ago
      weight: 0.8,
      metadata: {
        sentiment: 'positive',
        engagementDepth: 0.9
      }
    },
    {
      interactionId: 'int-2',
      fromUser: 'did:polkadot:alice',
      toUser: 'did:polkadot:charlie',
      contentUAL: 'ual:org:dkg:content:456',
      interactionType: 'like',
      timestamp: Date.now() - 172800000, // 2 days ago
      weight: 0.6
    },
    {
      interactionId: 'int-3',
      fromUser: 'did:polkadot:bob',
      toUser: 'did:polkadot:alice',
      contentUAL: 'ual:org:dkg:content:789',
      interactionType: 'comment',
      timestamp: Date.now() - 432000000, // 5 days ago
      weight: 0.9,
      metadata: {
        commentText: 'Great content!',
        sentiment: 'positive'
      }
    },
    {
      interactionId: 'int-4',
      fromUser: 'did:polkadot:charlie',
      toUser: 'did:polkadot:alice',
      contentUAL: 'ual:org:dkg:content:789',
      interactionType: 'endorse',
      timestamp: Date.now() - 259200000, // 3 days ago
      weight: 0.95
    }
  ];

  for (const interaction of interactions) {
    await networkService.recordInteraction(interaction);
    console.log(`   ✓ Recorded ${interaction.interactionType} from ${interaction.fromUser} to ${interaction.toUser}`);
  }

  console.log('\n');

  // Example 2: Record personalized feedback (ratings)
  console.log('⭐ Example 2: Recording personalized feedback (double-supervised)');
  
  const feedbacks: PersonalizedFeedback[] = [
    {
      raterId: 'did:polkadot:alice',
      rateeId: 'did:polkadot:bob',
      rating: 0.85,
      feedbackType: 'overall',
      timestamp: Date.now() - 86400000,
      contentUAL: 'ual:org:dkg:content:123'
    },
    {
      raterId: 'did:polkadot:bob',
      rateeId: 'did:polkadot:alice',
      rating: 0.90,
      feedbackType: 'content_quality',
      timestamp: Date.now() - 172800000
    },
    {
      raterId: 'did:polkadot:charlie',
      rateeId: 'did:polkadot:alice',
      rating: 0.75,
      feedbackType: 'trustworthiness',
      timestamp: Date.now() - 259200000
    },
    // Example of potentially deceptive feedback (will be filtered)
    {
      raterId: 'did:polkadot:malicious',
      rateeId: 'did:polkadot:alice',
      rating: 0.1, // Very low rating despite high reputation
      feedbackType: 'overall',
      timestamp: Date.now() - 3600000
    }
  ];

  for (const feedback of feedbacks) {
    await networkService.recordFeedback(feedback);
    console.log(`   ✓ Recorded feedback from ${feedback.raterId} to ${feedback.rateeId}: ${feedback.rating}`);
  }

  console.log('\n');

  // Example 3: Get global reputation
  console.log('🌐 Example 3: Getting global reputation (CR Model)');
  
  const aliceReputation = await networkService.getGlobalReputation('did:polkadot:alice');
  console.log(`   Alice's Global Reputation:`);
  console.log(`     - Global Reputation: ${aliceReputation.globalReputation.toFixed(3)}`);
  console.log(`     - Behavioral Activity: ${aliceReputation.behavioralActivityReputation.toFixed(3)}`);
  console.log(`     - Social Relationship: ${aliceReputation.socialRelationshipReputation.toFixed(3)}`);
  console.log(`     - Comprehensive (CR): ${aliceReputation.comprehensiveReputation.toFixed(3)}`);
  console.log(`     - Trust Factors:`);
  console.log(`       * Consistency: ${aliceReputation.trustFactors.consistency.toFixed(3)}`);
  console.log(`       * Longevity: ${aliceReputation.trustFactors.longevity.toFixed(3)}`);
  console.log(`       * Diversity: ${aliceReputation.trustFactors.diversity.toFixed(3)}`);
  console.log(`       * Reciprocity: ${aliceReputation.trustFactors.reciprocity.toFixed(3)}`);

  console.log('\n');

  // Example 4: Get pairwise trust
  console.log('🤝 Example 4: Getting pairwise trust (DeciTrustNET)');
  
  const aliceBobTrust = await networkService.getPairwiseTrust('did:polkadot:alice', 'did:polkadot:bob');
  console.log(`   Alice → Bob Trust:`);
  console.log(`     - Trust Level: ${aliceBobTrust.trustLevel.toFixed(3)}`);
  console.log(`     - Total Interactions: ${aliceBobTrust.interactionHistory.totalInteractions}`);
  console.log(`     - Positive: ${aliceBobTrust.interactionHistory.positiveInteractions}`);
  console.log(`     - Negative: ${aliceBobTrust.interactionHistory.negativeInteractions}`);
  console.log(`     - Average Rating: ${aliceBobTrust.interactionHistory.averageRating.toFixed(3)}`);
  console.log(`     - Trust Factors:`);
  console.log(`       * Direct Experience: ${aliceBobTrust.trustFactors.directExperience.toFixed(3)}`);
  console.log(`       * Mutual Connections: ${aliceBobTrust.trustFactors.mutualConnections.toFixed(3)}`);
  console.log(`       * Temporal Consistency: ${aliceBobTrust.trustFactors.temporalConsistency.toFixed(3)}`);
  console.log(`       * Content Alignment: ${aliceBobTrust.trustFactors.contentAlignment.toFixed(3)}`);

  console.log('\n');

  // Example 5: Get network metrics
  console.log('📊 Example 5: Getting network metrics (enhanced centrality)');
  
  const aliceMetrics = await networkService.getNetworkMetrics('did:polkadot:alice');
  console.log(`   Alice's Network Metrics:`);
  console.log(`     - Degree Centrality: ${aliceMetrics.degreeCentrality.toFixed(3)}`);
  console.log(`     - Betweenness Centrality: ${aliceMetrics.betweennessCentrality.toFixed(3)}`);
  console.log(`     - Closeness Centrality: ${aliceMetrics.closenessCentrality.toFixed(3)}`);
  console.log(`     - Eigenvector Centrality: ${aliceMetrics.eigenvectorCentrality.toFixed(3)}`);
  console.log(`     - Clustering Coefficient: ${aliceMetrics.clusteringCoefficient.toFixed(3)}`);
  console.log(`     - PageRank: ${aliceMetrics.pagerank.toFixed(6)}`);
  console.log(`     - Community Embeddedness: ${aliceMetrics.communityEmbeddedness.toFixed(3)}`);
  console.log(`     - Information Flow Efficiency: ${aliceMetrics.informationFlowEfficiency.toFixed(3)}`);

  console.log('\n');

  // Example 6: Get deception analysis
  console.log('🕵️ Example 6: Getting deception analysis');
  
  const maliciousAnalysis = await networkService.getDeceptionAnalysis('did:polkadot:malicious');
  console.log(`   Malicious User's Deception Analysis:`);
  console.log(`     - Bad-Mouthing Score: ${maliciousAnalysis.badMouthingScore.toFixed(3)}`);
  console.log(`     - Self-Promotion Score: ${maliciousAnalysis.selfPromotionScore.toFixed(3)}`);
  console.log(`     - Suspicious Patterns: ${maliciousAnalysis.suspiciousPatterns.join(', ') || 'none'}`);
  console.log(`     - Filtered Ratings: ${maliciousAnalysis.filteredRatings}`);

  console.log('\n');

  // Example 7: Demonstrate double-supervised feedback effect
  console.log('🔄 Example 7: Double-supervised feedback effect');
  console.log('   When Alice rates Bob:');
  console.log('     - Bob\'s reputation is updated (ratee effect)');
  console.log('     - Alice\'s reputation is also updated (rater effect)');
  console.log('     - This creates counter-incentive for malicious behavior');
  
  const aliceRepAfter = await networkService.getGlobalReputation('did:polkadot:alice');
  const bobRepAfter = await networkService.getGlobalReputation('did:polkadot:bob');
  
  console.log(`   After feedback:`);
  console.log(`     - Alice's reputation: ${aliceRepAfter.comprehensiveReputation.toFixed(3)}`);
  console.log(`     - Bob's reputation: ${bobRepAfter.comprehensiveReputation.toFixed(3)}`);

  console.log('\n✅ Example complete!');
}

// Run example if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as runContentSharingNetworkExample };

