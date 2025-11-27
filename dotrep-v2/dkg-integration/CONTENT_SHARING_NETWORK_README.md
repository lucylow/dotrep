# Enhanced Content-Sharing Network Service

## Overview

This service implements advanced reputation models for content-sharing networks, incorporating research from **DeciTrustNET Framework** and **Comprehensive Reputation (CR) Model**. It provides sophisticated trust and reputation scoring with deception filtering and enhanced graph metrics.

## Key Features

### 🎯 DeciTrustNET Framework Features

1. **Double-Supervised Personalized Feedback**
   - Ratings affect both the user being rated (ratee) and the user providing the rating (rater)
   - Creates counter-incentive for malicious behavior
   - Rater reputation decreases if they consistently give ratings that differ from consensus

2. **Global vs Pairwise Trust**
   - **Global Reputation**: Based on all interactions and feedback across the network
   - **Pairwise Trust**: Specific trust level between two users based on their interaction history
   - Distinguishes between overall reputation and relationship-specific trust

3. **Long-Term Behavior Tracking**
   - Rewards long-term good behavior
   - Penalizes sudden negative changes
   - Time-decay factor for recent vs historical interactions

### 📊 Comprehensive Reputation (CR) Model Features

1. **Multi-Dimensional Reputation**
   - **Behavioral Activity Reputation**: Based on activity patterns, consistency, and engagement quality
   - **Social Relationship Reputation**: Based on position in social graph and quality of connections
   - **Comprehensive Reputation**: Weighted combination with trust factors

2. **Trust Factors**
   - **Consistency**: How consistent are interactions over time
   - **Longevity**: How long has the user been active
   - **Diversity**: How diverse are the user's interactions
   - **Reciprocity**: How reciprocal are interactions

3. **Deception Filtering**
   - **Bad-Mouthing Detection**: Identifies users who consistently give negative ratings
   - **Self-Promotion Detection**: Detects excessive self-references
   - **Personalized Distrust Metrics**: Identifies malicious content or service providers
   - Automatically filters out deceptive ratings

### 📈 Enhanced Graph Metrics

1. **Centrality Measures**
   - **Degree Centrality**: Number of direct connections
   - **Betweenness Centrality**: Brokerage power (bridge between communities)
   - **Closeness Centrality**: Information flow efficiency
   - **Eigenvector Centrality**: Influence based on quality of connections
   - **PageRank**: Overall influence score

2. **Clustering Analysis**
   - **Local Clustering Coefficient**: How well-connected a user's neighbors are
   - **Community Embeddedness**: How well a user is embedded in their community
   - Identifies tight-knit communities and potential echo chambers

3. **Custom Metrics**
   - **Information Flow Efficiency**: How efficiently a user can spread information
   - **Reach**: How many users can be reached through this user
   - **Average Path Length**: Average distance to other users

## Usage

### Basic Setup

```typescript
import { createDKGClientV8 } from './dkg-client-v8';
import { createContentSharingNetworkService } from './content-sharing-network';

// Initialize DKG client
const dkgClient = createDKGClientV8({
  environment: 'testnet',
  useMockMode: true
});

// Initialize content-sharing network service
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
```

### Recording Interactions

```typescript
// Record a content-sharing interaction
await networkService.recordInteraction({
  interactionId: 'int-1',
  fromUser: 'did:polkadot:alice',
  toUser: 'did:polkadot:bob',
  contentUAL: 'ual:org:dkg:content:123',
  interactionType: 'share',
  timestamp: Date.now(),
  weight: 0.8,
  metadata: {
    sentiment: 'positive',
    engagementDepth: 0.9
  }
});
```

### Recording Feedback (Ratings)

```typescript
// Record personalized feedback
await networkService.recordFeedback({
  raterId: 'did:polkadot:alice',
  rateeId: 'did:polkadot:bob',
  rating: 0.85, // 0-1 scale
  feedbackType: 'overall',
  timestamp: Date.now(),
  contentUAL: 'ual:org:dkg:content:123'
});

// This automatically:
// 1. Updates Bob's reputation (ratee effect)
// 2. Updates Alice's reputation (rater effect - double-supervised)
// 3. Filters out if detected as deceptive
```

### Getting Global Reputation

```typescript
const reputation = await networkService.getGlobalReputation('did:polkadot:alice');

console.log(reputation.globalReputation); // Overall reputation
console.log(reputation.behavioralActivityReputation); // Activity-based
console.log(reputation.socialRelationshipReputation); // Social graph-based
console.log(reputation.comprehensiveReputation); // CR Model combined score
console.log(reputation.trustFactors); // Consistency, longevity, diversity, reciprocity
```

### Getting Pairwise Trust

```typescript
const trust = await networkService.getPairwiseTrust(
  'did:polkadot:alice',
  'did:polkadot:bob'
);

console.log(trust.trustLevel); // 0-1 trust level
console.log(trust.interactionHistory); // Total, positive, negative interactions
console.log(trust.trustFactors); // Direct experience, mutual connections, etc.
```

### Getting Network Metrics

```typescript
const metrics = await networkService.getNetworkMetrics('did:polkadot:alice');

console.log(metrics.degreeCentrality);
console.log(metrics.betweennessCentrality);
console.log(metrics.closenessCentrality);
console.log(metrics.eigenvectorCentrality);
console.log(metrics.clusteringCoefficient);
console.log(metrics.pagerank);
console.log(metrics.communityEmbeddedness);
console.log(metrics.informationFlowEfficiency);
```

### Getting Deception Analysis

```typescript
const analysis = await networkService.getDeceptionAnalysis('did:polkadot:malicious');

console.log(analysis.badMouthingScore); // 0-1, likelihood of bad-mouthing
console.log(analysis.selfPromotionScore); // 0-1, likelihood of self-promotion
console.log(analysis.suspiciousPatterns); // Array of detected patterns
console.log(analysis.personalizedDistrust); // Map of distrust levels
console.log(analysis.filteredRatings); // Number of ratings filtered out
```

## Configuration Options

```typescript
interface ContentSharingNetworkConfig {
  enableDoubleSupervisedFeedback?: boolean; // Default: true
  enablePairwiseTrust?: boolean; // Default: true
  enableDeceptionFiltering?: boolean; // Default: true
  enableComprehensiveReputation?: boolean; // Default: true
  enableEnhancedMetrics?: boolean; // Default: true
  trustDecayFactor?: number; // Default: 0.1 (how quickly trust decays)
  minInteractionsForTrust?: number; // Default: 3
  deceptionThreshold?: number; // Default: 0.7 (threshold for filtering)
}
```

## How It Works

### Double-Supervised Feedback Flow

1. **User A rates User B**
   - User B's reputation is updated based on the rating (ratee effect)
   - User A's reputation is also updated based on rating quality (rater effect)

2. **Rating Quality Assessment**
   - Compare User A's rating to User B's current reputation
   - If deviation is large and User B has high reputation confidence:
     - **Penalize User A** (inconsistent rating)
   - If deviation is small and User B has high reputation confidence:
     - **Reward User A** (consistent rating)

3. **Counter-Incentive Effect**
   - Malicious users who give bad ratings see their own reputation decrease
   - Creates natural disincentive for bad-mouthing

### Comprehensive Reputation Calculation

```
Comprehensive Reputation = 
  (Behavioral Activity × 0.5 × (1 + Trust Factor Weight × 0.2)) +
  (Social Relationship × 0.5 × (1 + Trust Factor Weight × 0.2))

Trust Factor Weight =
  (Consistency × 0.3) +
  (Longevity × 0.25) +
  (Diversity × 0.25) +
  (Reciprocity × 0.2)
```

### Deception Detection

1. **Bad-Mouthing Detection**
   - Check ratio of negative ratings
   - Check if ratings consistently deviate below consensus
   - Score: `negativeRatio × 0.6 + avgPositiveDeviation × 0.4`

2. **Self-Promotion Detection**
   - Check for self-references in interactions
   - Check for self-ratings (shouldn't happen)
   - Score: `selfReferenceRatio × 0.7 + (selfRatings > 0 ? 0.3 : 0)`

3. **Filtering**
   - If deception score > threshold, filter out the rating
   - Update personalized distrust metrics

## Integration with DKG

The service integrates with OriginTrail DKG to:
- Query social graph data using SPARQL
- Publish reputation snapshots as Knowledge Assets
- Link interactions and feedback to content UALs
- Maintain provenance chains

## Performance Considerations

- **Caching**: Reputation scores and metrics are cached for 1 hour
- **Lazy Computation**: Metrics are computed on-demand
- **Batch Processing**: Multiple interactions can be recorded efficiently
- **Graph Size**: For very large graphs (>10k nodes), consider sampling for centrality measures

## Research References

1. **DeciTrustNET Framework**
   - Double-supervised personalized feedback
   - Global vs pairwise trust distinction
   - Long-term behavior tracking

2. **Comprehensive Reputation (CR) Model**
   - Behavioral activity reputation
   - Social relationship reputation
   - Deception filtering approach
   - Personalized distrust metrics

3. **Graph Analysis Metrics**
   - NetworkX algorithms for centrality
   - Clustering coefficient computation
   - Community detection techniques

## Example

See `content-sharing-network-example.ts` for a complete working example demonstrating all features.

## Future Enhancements

- [ ] Integration with Umanitek Guardian for content quality verification
- [ ] Real-time reputation updates via WebSocket
- [ ] Advanced community detection algorithms
- [ ] Temporal network analysis (how network evolves over time)
- [ ] Integration with payment evidence for TraceRank-style scoring
- [ ] Export to graph databases (Neo4j, PuppyGraph) for complex queries

