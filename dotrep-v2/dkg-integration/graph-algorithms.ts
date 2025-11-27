/**
 * Advanced Graph Algorithms for Reputation Scoring
 * 
 * Implements research-backed graph algorithms including:
 * - Temporal Weighted PageRank (UWUSRank-inspired)
 * - Fairness-adjusted ranking
 * - Sensitivity auditing
 * - Hybrid graph + quality + stake scoring
 * 
 * Based on research:
 * - PageRank & centrality for social network influence
 * - Temporal centrality algorithms (UWUSRank)
 * - Auditing PageRank on large graphs (AURORA)
 * - Fairness in network-based ranking
 */

import { AccountClusteringService, type Account } from './account-clustering';

export interface GraphNode {
  id: string;
  metadata?: {
    stake?: number;
    paymentHistory?: number;
    verifiedEndorsements?: number;
    contentQuality?: number;
    activityRecency?: number; // timestamp of last activity
    minorityGroup?: boolean; // for fairness analysis
    [key: string]: any;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number; // base weight (0-1)
  edgeType: EdgeType;
  timestamp: number; // when the edge was created/updated
  metadata?: {
    endorsementStrength?: number;
    stakeBacked?: boolean;
    paymentAmount?: number;
    verified?: boolean;
    [key: string]: any;
  };
}

export enum EdgeType {
  FOLLOW = 'follow',
  ENDORSE = 'endorse',
  COLLABORATE = 'collaborate',
  REVIEW = 'review',
  PAYMENT = 'payment',
  STAKE = 'stake',
  TRUST = 'trust'
}

export interface PageRankConfig {
  dampingFactor?: number; // alpha (default: 0.85)
  maxIterations?: number; // max iterations (default: 100)
  tolerance?: number; // convergence tolerance (default: 1e-6)
  temporalDecay?: number; // decay factor for old edges (default: 0.1)
  recencyWeight?: number; // weight for recent activity (default: 0.3)
  stakeWeight?: number; // weight for stake in edge weighting (default: 0.2)
  paymentWeight?: number; // weight for payments in edge weighting (default: 0.15)
  qualityWeight?: number; // weight for content quality (default: 0.1)
}

export interface PageRankResult {
  scores: Map<string, number>;
  iterations: number;
  converged: boolean;
  computationTime: number;
}

export interface SensitivityAuditResult {
  nodeId: string;
  baseScore: number;
  edgeSensitivity: Array<{
    edge: { source: string; target: string };
    impact: number; // how much removing this edge changes the score
    relativeImpact: number; // impact as percentage of base score
  }>;
  topInfluencingEdges: Array<{
    edge: { source: string; target: string };
    impact: number;
  }>;
}

export interface FairnessMetrics {
  giniCoefficient: number; // inequality measure (0 = perfect equality, 1 = perfect inequality)
  minorityRepresentation: number; // percentage of minority nodes in top 10%
  topDecileDiversity: number; // diversity index of top 10%
  biasScore: number; // overall bias measure (0 = no bias, 1 = maximum bias)
}

export interface HybridReputationScore {
  nodeId: string;
  graphScore: number; // PageRank score
  qualityScore: number; // content/contribution quality
  stakeScore: number; // stake-weighted score
  paymentScore: number; // payment history score
  finalScore: number; // combined hybrid score
  percentile: number; // percentile rank
  explanation: string[]; // explainable breakdown
}

/**
 * Advanced Graph Algorithms for Reputation Computation
 */
export class GraphAlgorithms {
  /**
   * Compute Temporal Weighted PageRank
   * 
   * Similar to UWUSRank, this algorithm:
   * - Accounts for edge recency (recent interactions weighted higher)
   * - Incorporates edge weights (endorsement strength, stake, payments)
   * - Applies temporal decay to older edges
   * 
   * @param nodes - Graph nodes
   * @param edges - Graph edges with weights and timestamps
   * @param config - PageRank configuration
   * @returns PageRank scores for each node
   */
  static computeTemporalWeightedPageRank(
    nodes: GraphNode[],
    edges: GraphEdge[],
    config: PageRankConfig = {}
  ): PageRankResult {
    const startTime = Date.now();
    
    const {
      dampingFactor = 0.85,
      maxIterations = 100,
      tolerance = 1e-6,
      temporalDecay = 0.1,
      recencyWeight = 0.3,
      stakeWeight = 0.2,
      paymentWeight = 0.15,
      qualityWeight = 0.1
    } = config;

    const nodeIds = nodes.map(n => n.id);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const now = Date.now();
    const maxAge = 365 * 24 * 60 * 60 * 1000; // 1 year in ms

    // Build adjacency list with temporal and weighted edges
    const adjacencyList = new Map<string, Array<{ target: string; weight: number }>>();
    const outDegree = new Map<string, number>();

    // Initialize adjacency list
    nodeIds.forEach(id => {
      adjacencyList.set(id, []);
      outDegree.set(id, 0);
    });

    // Process edges with temporal decay and weight enhancement
    for (const edge of edges) {
      if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target)) {
        continue; // Skip edges with missing nodes
      }

      // Calculate temporal decay factor
      const age = now - edge.timestamp;
      const ageInYears = age / maxAge;
      const temporalFactor = Math.exp(-temporalDecay * ageInYears);

      // Calculate enhanced weight based on edge metadata
      let enhancedWeight = edge.weight;

      // Boost for stake-backed edges
      if (edge.metadata?.stakeBacked) {
        enhancedWeight *= (1 + stakeWeight);
      }

      // Boost for payment-backed edges
      if (edge.metadata?.paymentAmount) {
        const paymentBoost = Math.min(1, Math.log(1 + (edge.metadata.paymentAmount || 0) / 1000) / 10);
        enhancedWeight *= (1 + paymentWeight * paymentBoost);
      }

      // Boost for verified endorsements
      if (edge.metadata?.verified) {
        enhancedWeight *= 1.2;
      }

      // Apply temporal decay
      const finalWeight = enhancedWeight * (recencyWeight + (1 - recencyWeight) * temporalFactor);

      adjacencyList.get(edge.source)!.push({
        target: edge.target,
        weight: finalWeight
      });

      outDegree.set(edge.source, outDegree.get(edge.source)! + finalWeight);
    }

    // Initialize PageRank scores uniformly
    const n = nodeIds.length;
    let scores = new Map<string, number>();
    nodeIds.forEach(id => {
      scores.set(id, 1.0 / n);
    });

    // Iterative PageRank computation
    let iterations = 0;
    let converged = false;

    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1;
      const newScores = new Map<string, number>();

      // Initialize new scores with damping factor
      nodeIds.forEach(id => {
        newScores.set(id, (1 - dampingFactor) / n);
      });

      // Distribute scores based on incoming edges
      for (const [source, targets] of adjacencyList.entries()) {
        const sourceScore = scores.get(source)!;
        const outDeg = outDegree.get(source)!;

        if (outDeg > 0) {
          for (const { target, weight } of targets) {
            const contribution = (dampingFactor * sourceScore * weight) / outDeg;
            newScores.set(target, newScores.get(target)! + contribution);
          }
        } else {
          // Handle dangling nodes (no outgoing edges)
          // Distribute score uniformly
          const contribution = (dampingFactor * sourceScore) / n;
          nodeIds.forEach(id => {
            newScores.set(id, newScores.get(id)! + contribution);
          });
        }
      }

      // Check for convergence
      let maxDiff = 0;
      for (const id of nodeIds) {
        const diff = Math.abs(newScores.get(id)! - scores.get(id)!);
        maxDiff = Math.max(maxDiff, diff);
      }

      scores = newScores;

      if (maxDiff < tolerance) {
        converged = true;
        break;
      }
    }

    const computationTime = Date.now() - startTime;

    return {
      scores,
      iterations,
      converged,
      computationTime
    };
  }

  /**
   * Compute hybrid reputation score
   * 
   * Combines graph structure (PageRank) with quality signals, stake, and payments
   * to create a more robust and less gameable reputation score.
   * 
   * @param pagerankScores - PageRank scores from graph algorithm
   * @param nodes - Graph nodes with metadata
   * @param config - Weighting configuration
   * @returns Hybrid reputation scores
   */
  static computeHybridReputation(
    pagerankScores: Map<string, number>,
    nodes: GraphNode[],
    config: {
      graphWeight?: number;
      qualityWeight?: number;
      stakeWeight?: number;
      paymentWeight?: number;
    } = {}
  ): Map<string, HybridReputationScore> {
    const {
      graphWeight = 0.5,
      qualityWeight = 0.25,
      stakeWeight = 0.15,
      paymentWeight = 0.1
    } = config;

    const results = new Map<string, HybridReputationScore>();
    const allScores: number[] = [];

    // Normalize PageRank scores to 0-1000 range
    const prValues = Array.from(pagerankScores.values());
    const prMin = Math.min(...prValues);
    const prMax = Math.max(...prValues);
    const prRange = prMax - prMin || 1;

    for (const node of nodes) {
      const graphScore = pagerankScores.get(node.id) || 0;
      const normalizedGraphScore = ((graphScore - prMin) / prRange) * 1000;

      // Extract quality signals
      const qualityScore = (node.metadata?.contentQuality || 0) * 10; // scale 0-100 to 0-1000
      const stakeScore = Math.min(1000, Math.log(1 + (node.metadata?.stake || 0) / 100) * 200);
      const paymentScore = Math.min(1000, Math.log(1 + (node.metadata?.paymentHistory || 0) / 1000) * 200);

      // Compute weighted hybrid score
      const finalScore =
        normalizedGraphScore * graphWeight +
        qualityScore * qualityWeight +
        stakeScore * stakeWeight +
        paymentScore * paymentWeight;

      const explanation = [
        `Graph score: ${normalizedGraphScore.toFixed(1)} (${(graphWeight * 100).toFixed(0)}% weight)`,
        `Quality score: ${qualityScore.toFixed(1)} (${(qualityWeight * 100).toFixed(0)}% weight)`,
        `Stake score: ${stakeScore.toFixed(1)} (${(stakeWeight * 100).toFixed(0)}% weight)`,
        `Payment score: ${paymentScore.toFixed(1)} (${(paymentWeight * 100).toFixed(0)}% weight)`
      ];

      results.set(node.id, {
        nodeId: node.id,
        graphScore: normalizedGraphScore,
        qualityScore,
        stakeScore,
        paymentScore,
        finalScore,
        percentile: 0, // will be computed after all scores
        explanation
      });

      allScores.push(finalScore);
    }

    // Compute percentiles
    allScores.sort((a, b) => b - a);
    for (const [nodeId, result] of results.entries()) {
      const rank = allScores.findIndex(score => score <= result.finalScore);
      result.percentile = ((allScores.length - rank) / allScores.length) * 100;
    }

    return results;
  }

  /**
   * Audit PageRank sensitivity
   * 
   * Inspired by AURORA research, this identifies which edges have the most
   * impact on a node's PageRank score. Useful for transparency and detecting
   * manipulation.
   * 
   * @param nodeId - Node to audit
   * @param nodes - All graph nodes
   * @param edges - All graph edges
   * @param baseScores - Base PageRank scores
   * @param config - PageRank configuration
   * @returns Sensitivity audit results
   */
  static auditPageRankSensitivity(
    nodeId: string,
    nodes: GraphNode[],
    edges: GraphEdge[],
    baseScores: Map<string, number>,
    config: PageRankConfig = {}
  ): SensitivityAuditResult {
    const baseScore = baseScores.get(nodeId) || 0;
    const edgeSensitivity: Array<{
      edge: { source: string; target: string };
      impact: number;
      relativeImpact: number;
    }> = [];

    // Test removing each incoming edge
    const incomingEdges = edges.filter(e => e.target === nodeId);

    for (const edge of incomingEdges) {
      // Create modified edge set without this edge
      const modifiedEdges = edges.filter(e => !(e.source === edge.source && e.target === edge.target));

      // Recompute PageRank
      const modifiedResult = this.computeTemporalWeightedPageRank(nodes, modifiedEdges, config);
      const modifiedScore = modifiedResult.scores.get(nodeId) || 0;

      const impact = baseScore - modifiedScore;
      const relativeImpact = baseScore > 0 ? (impact / baseScore) * 100 : 0;

      edgeSensitivity.push({
        edge: { source: edge.source, target: edge.target },
        impact,
        relativeImpact
      });
    }

    // Sort by impact and get top influencing edges
    edgeSensitivity.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
    const topInfluencingEdges = edgeSensitivity
      .slice(0, 10)
      .map(e => ({
        edge: e.edge,
        impact: e.impact
      }));

    return {
      nodeId,
      baseScore,
      edgeSensitivity,
      topInfluencingEdges
    };
  }

  /**
   * Compute fairness metrics
   * 
   * Analyzes the distribution of PageRank scores to detect bias and inequality.
   * Based on research on fairness in network-based ranking.
   * 
   * @param scores - PageRank scores
   * @param nodes - Graph nodes with metadata
   * @returns Fairness metrics
   */
  static computeFairnessMetrics(
    scores: Map<string, number>,
    nodes: GraphNode[]
  ): FairnessMetrics {
    const scoreArray = Array.from(scores.values()).sort((a, b) => b - a);
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    // Compute Gini coefficient (inequality measure)
    const n = scoreArray.length;
    if (n === 0) {
      return {
        giniCoefficient: 0,
        minorityRepresentation: 0,
        topDecileDiversity: 0,
        biasScore: 0
      };
    }

    let giniSum = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        giniSum += Math.abs(scoreArray[i] - scoreArray[j]);
      }
    }
    const mean = scoreArray.reduce((a, b) => a + b, 0) / n;
    const giniCoefficient = giniSum / (2 * n * n * mean);

    // Compute minority representation in top 10%
    const topDecileSize = Math.max(1, Math.floor(n * 0.1));
    const topDecileNodes = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topDecileSize)
      .map(([id]) => nodeMap.get(id))
      .filter(Boolean) as GraphNode[];

    const minorityInTop = topDecileNodes.filter(n => n.metadata?.minorityGroup).length;
    const totalMinority = nodes.filter(n => n.metadata?.minorityGroup).length;
    const minorityRepresentation = totalMinority > 0
      ? (minorityInTop / topDecileSize) / (totalMinority / n)
      : 1;

    // Compute diversity index (Shannon entropy) of top decile
    const groupCounts = new Map<string, number>();
    topDecileNodes.forEach(node => {
      const group = node.metadata?.minorityGroup ? 'minority' : 'majority';
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    });

    let diversity = 0;
    for (const count of groupCounts.values()) {
      const p = count / topDecileSize;
      if (p > 0) {
        diversity -= p * Math.log2(p);
      }
    }
    const maxDiversity = Math.log2(Math.min(2, topDecileSize)); // max for 2 groups
    const topDecileDiversity = maxDiversity > 0 ? diversity / maxDiversity : 1;

    // Compute overall bias score
    // Higher bias = lower minority representation + higher inequality
    const biasScore = (1 - minorityRepresentation) * 0.5 + (1 - topDecileDiversity) * 0.5;

    return {
      giniCoefficient,
      minorityRepresentation,
      topDecileDiversity,
      biasScore
    };
  }

  /**
   * Apply fairness adjustments to PageRank scores
   * 
   * Adjusts scores to reduce bias while maintaining relative ordering where possible.
   * 
   * @param scores - Original PageRank scores
   * @param nodes - Graph nodes with metadata
   * @param adjustmentStrength - How much to adjust (0 = no adjustment, 1 = maximum)
   * @returns Adjusted scores
   */
  static applyFairnessAdjustments(
    scores: Map<string, number>,
    nodes: GraphNode[],
    adjustmentStrength: number = 0.2
  ): Map<string, number> {
    const adjustedScores = new Map<string, number>();

    // Compute baseline statistics
    const scoreArray = Array.from(scores.values());
    const mean = scoreArray.reduce((a, b) => a + b, 0) / scoreArray.length;
    const minorityScores = nodes
      .filter(n => n.metadata?.minorityGroup)
      .map(n => scores.get(n.id) || 0);
    const minorityMean = minorityScores.length > 0
      ? minorityScores.reduce((a, b) => a + b, 0) / minorityScores.length
      : mean;

    // Apply boost to underrepresented groups
    const boostFactor = mean > 0 && minorityMean < mean
      ? (mean / minorityMean - 1) * adjustmentStrength
      : 0;

    for (const node of nodes) {
      let score = scores.get(node.id) || 0;

      // Apply boost to minority groups if they're underrepresented
      if (node.metadata?.minorityGroup && boostFactor > 0) {
        score = score * (1 + boostFactor);
      }

      adjustedScores.set(node.id, score);
    }

    // Renormalize to preserve total score mass
    const totalOriginal = Array.from(scores.values()).reduce((a, b) => a + b, 0);
    const totalAdjusted = Array.from(adjustedScores.values()).reduce((a, b) => a + b, 0);
    const normalizationFactor = totalOriginal / totalAdjusted;

    for (const [id, score] of adjustedScores.entries()) {
      adjustedScores.set(id, score * normalizationFactor);
    }

    return adjustedScores;
  }

  /**
   * Detect Sybil clusters using community detection
   * 
   * Enhanced Sybil detection using:
   * - Community detection (Louvain algorithm) to find tightly-knit clusters
   * - Graph structure analysis (degree anomalies, reciprocity)
   * - Economic signals (stake, payments) to identify bot accounts
   * 
   * @param nodes - Graph nodes
   * @param edges - Graph edges
   * @param scores - PageRank scores
   * @returns Map of node ID to Sybil probability (0-1)
   */
  static detectSybilClusters(
    nodes: GraphNode[],
    edges: GraphEdge[],
    scores: Map<string, number>
  ): Map<string, number> {
    const sybilProbabilities = new Map<string, number>();

    // Build adjacency lists
    const inEdges = new Map<string, Array<{ source: string; weight: number }>>();
    const outEdges = new Map<string, Array<{ target: string; weight: number }>>();
    const neighbors = new Map<string, Set<string>>();

    nodes.forEach(n => {
      inEdges.set(n.id, []);
      outEdges.set(n.id, []);
      neighbors.set(n.id, new Set());
    });

    edges.forEach(edge => {
      inEdges.get(edge.target)!.push({ source: edge.source, weight: edge.weight });
      outEdges.get(edge.source)!.push({ target: edge.target, weight: edge.weight });
      neighbors.get(edge.source)!.add(edge.target);
      neighbors.get(edge.target)!.add(edge.source);
    });

    // Step 1: Enhanced community detection using advanced clustering
    // Convert to Account format for clustering service
    const accounts: Account[] = nodes.map(node => {
      const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);
      return {
        accountId: node.id,
        reputation: scores.get(node.id) || 0,
        contributions: [],
        connections: nodeEdges
          .filter(e => e.source === node.id)
          .map(e => ({
            target: e.target,
            weight: e.weight,
          })),
        metadata: {
          stake: node.metadata?.stake,
          paymentHistory: node.metadata?.paymentHistory,
          ...node.metadata,
        },
      };
    });

    // Use hierarchical clustering for better community detection
    const clusteringService = new AccountClusteringService({
      method: 'hierarchical',
      minSimilarity: 0.25,
      minClusterSize: 3,
      maxClusterSize: 1000,
      featureWeights: {
        sharedConnections: 0.3,
        connectionOverlap: 0.3,
        temporalSimilarity: 0.15,
        metadataSimilarity: 0.15,
        graphDistance: 0.1,
      },
    });

    const clusters = clusteringService.findClusters(accounts);
    
    // Map clusters to community IDs (compatible with existing code)
    const nodeToCommunity = new Map<string, number>();
    const communitySizes = new Map<number, number>();
    clusters.forEach((cluster, clusterIdx) => {
      cluster.accounts.forEach(accountId => {
        nodeToCommunity.set(accountId, clusterIdx);
      });
      communitySizes.set(clusterIdx, cluster.size);
    });

    // Assign unclustered nodes to their own communities
    let nextCommunityId = clusters.length;
    nodes.forEach(node => {
      if (!nodeToCommunity.has(node.id)) {
        nodeToCommunity.set(node.id, nextCommunityId);
        communitySizes.set(nextCommunityId, 1);
        nextCommunityId++;
      }
    });

    // Step 2: Calculate community metrics (existing logic continues)

    // Step 3: Compute external connection ratio for each community
    const communityExternalConnections = new Map<number, number>();
    const communityInternalConnections = new Map<number, number>();

    edges.forEach(edge => {
      const sourceCommunity = nodeToCommunity.get(edge.source);
      const targetCommunity = nodeToCommunity.get(edge.target);
      
      if (sourceCommunity === targetCommunity) {
        communityInternalConnections.set(
          sourceCommunity!,
          (communityInternalConnections.get(sourceCommunity!) || 0) + 1
        );
      } else {
        communityExternalConnections.set(
          sourceCommunity!,
          (communityExternalConnections.get(sourceCommunity!) || 0) + 1
        );
        communityExternalConnections.set(
          targetCommunity!,
          (communityExternalConnections.get(targetCommunity!) || 0) + 1
        );
      }
    });

    // Step 4: Identify suspicious communities (high internal, low external connections)
    const suspiciousCommunities = new Set<number>();
    communitySizes.forEach((size, communityId) => {
      if (size < 3) return; // Skip very small communities
      
      const internal = communityInternalConnections.get(communityId) || 0;
      const external = communityExternalConnections.get(communityId) || 0;
      const externalRatio = external / (internal + external + 1); // +1 to avoid division by zero
      
      // Suspicious: high internal connections but very few external connections
      if (externalRatio < 0.1 && size >= 5) {
        suspiciousCommunities.add(communityId);
      }
    });

    // Step 5: Calculate Sybil probability for each node
    const meanScore = Array.from(scores.values()).reduce((a, b) => a + b, 0) / scores.size;
    const scoreStd = Math.sqrt(
      Array.from(scores.values())
        .map(s => Math.pow(s - meanScore, 2))
        .reduce((a, b) => a + b, 0) / scores.size
    );

    for (const node of nodes) {
      const inDegree = inEdges.get(node.id)!.length;
      const outDegree = outEdges.get(node.id)!.length;
      const score = scores.get(node.id) || 0;
      const zScore = scoreStd > 0 ? (score - meanScore) / scoreStd : 0;
      const nodeCommunity = nodeToCommunity.get(node.id) || -1;
      const isInSuspiciousCommunity = suspiciousCommunities.has(nodeCommunity);

      let sybilProbability = 0;

      // Pattern 1: In suspicious community
      if (isInSuspiciousCommunity) {
        sybilProbability += 0.5;
      }

      // Pattern 2: High in-degree but low PageRank (z-score < -1)
      if (zScore < -1 && inDegree > 5) {
        sybilProbability += 0.3;
      }

      // Pattern 3: Very high out-degree (potential spam)
      if (outDegree > 20 && inDegree < 2) {
        sybilProbability += 0.2;
      }

      // Pattern 4: Low reciprocity (many incoming but few outgoing)
      if (inDegree > 10 && outDegree < 2) {
        sybilProbability += 0.2;
      }

      // Pattern 5: No economic signals (no stake, no payments) but high connections
      const hasStake = (node.metadata?.stake || 0) > 0;
      const hasPayments = (node.metadata?.paymentHistory || 0) > 0;
      if (!hasStake && !hasPayments && (inDegree + outDegree) > 10) {
        sybilProbability += 0.2;
      }

      // Pattern 6: Low connection diversity (all connections to same community)
      const neighborCommunities = new Set<number>();
      neighbors.get(node.id)!.forEach(neighborId => {
        const neighborCommunity = nodeToCommunity.get(neighborId);
        if (neighborCommunity !== undefined) {
          neighborCommunities.add(neighborCommunity);
        }
      });
      if (neighborCommunities.size === 1 && neighborCommunities.has(nodeCommunity) && inDegree > 5) {
        sybilProbability += 0.2;
      }

      sybilProbabilities.set(node.id, Math.min(1, sybilProbability));
    }

    return sybilProbabilities;
  }

  /**
   * Detect communities using a simplified Louvain-like algorithm
   * 
   * Groups nodes into communities based on connection density.
   * Returns an array where each index corresponds to a node's community ID.
   * 
   * @param nodes - Graph nodes
   * @param edges - Graph edges
   * @returns Array of community IDs (one per node)
   */
  static detectCommunities(
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): number[] {
    // Simplified community detection using label propagation
    // In production, would use a proper Louvain implementation
    
    const nodeToCommunity = new Map<string, number>();
    const nodeIndex = new Map<string, number>();
    
    nodes.forEach((node, index) => {
      nodeToCommunity.set(node.id, index); // Start with each node in its own community
      nodeIndex.set(node.id, index);
    });

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    nodes.forEach(node => {
      adjacency.set(node.id, []);
    });
    
    edges.forEach(edge => {
      adjacency.get(edge.source)!.push(edge.target);
      adjacency.get(edge.target)!.push(edge.source);
    });

    // Label propagation: assign each node to the most common community among its neighbors
    let changed = true;
    let iterations = 0;
    const maxIterations = 10;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const node of nodes) {
        const neighbors = adjacency.get(node.id) || [];
        if (neighbors.length === 0) continue;

        // Count community frequencies among neighbors
        const communityCounts = new Map<number, number>();
        neighbors.forEach(neighborId => {
          const neighborCommunity = nodeToCommunity.get(neighborId)!;
          communityCounts.set(
            neighborCommunity,
            (communityCounts.get(neighborCommunity) || 0) + 1
          );
        });

        // Find most common community
        let maxCount = 0;
        let mostCommonCommunity = nodeToCommunity.get(node.id)!;
        
        communityCounts.forEach((count, community) => {
          if (count > maxCount) {
            maxCount = count;
            mostCommonCommunity = community;
          }
        });

        // Update if changed
        if (mostCommonCommunity !== nodeToCommunity.get(node.id)) {
          nodeToCommunity.set(node.id, mostCommonCommunity);
          changed = true;
        }
      }
    }

    // Return as array indexed by node order
    return nodes.map(node => nodeToCommunity.get(node.id)!);
  }

  /**
   * Filter deceptive opinions (bad-mouthing and self-promotion)
   * 
   * Detects and filters manipulated opinions:
   * - Bad-mouthing: Unfair negative reviews from colluding accounts
   * - Self-promotion: Colluding positive reviews within a cluster
   * 
   * @param nodes - Graph nodes
   * @param edges - Graph edges (endorsements/reviews)
   * @param communities - Community assignments from detectCommunities
   * @returns Map of edge ID to deception probability (0-1)
   */
  static filterDeceptiveOpinions(
    nodes: GraphNode[],
    edges: GraphEdge[],
    communities: number[]
  ): Map<string, number> {
    const deceptionProbabilities = new Map<string, number>();
    const nodeToCommunity = new Map<string, number>();
    
    nodes.forEach((node, index) => {
      nodeToCommunity.set(node.id, communities[index]);
    });

    // Build community membership
    const communityMembers = new Map<number, Set<string>>();
    nodes.forEach((node, index) => {
      const communityId = communities[index];
      if (!communityMembers.has(communityId)) {
        communityMembers.set(communityId, new Set());
      }
      communityMembers.get(communityId)!.add(node.id);
    });

    // Analyze each edge for deception patterns
    edges.forEach(edge => {
      if (edge.edgeType !== EdgeType.ENDORSE && edge.edgeType !== EdgeType.REVIEW) {
        return; // Only analyze endorsements and reviews
      }

      const sourceCommunity = nodeToCommunity.get(edge.source);
      const targetCommunity = nodeToCommunity.get(edge.target);
      const edgeId = `${edge.source}->${edge.target}`;
      
      let deceptionProbability = 0;

      // Pattern 1: Self-promotion (positive reviews within same community)
      if (sourceCommunity === targetCommunity && edge.weight > 0.8) {
        const communitySize = communityMembers.get(sourceCommunity!)?.size || 0;
        if (communitySize >= 3 && communitySize <= 20) { // Suspicious cluster size
          deceptionProbability += 0.4;
        }
      }

      // Pattern 2: Bad-mouthing (negative reviews from different communities)
      if (sourceCommunity !== targetCommunity && edge.weight < 0.2) {
        const sourceCommunitySize = communityMembers.get(sourceCommunity!)?.size || 0;
        if (sourceCommunitySize >= 3) {
          // Check if source community has many negative reviews for target
          const negativeReviewsFromCommunity = edges.filter(e =>
            nodeToCommunity.get(e.source) === sourceCommunity &&
            e.target === edge.target &&
            e.weight < 0.3
          ).length;
          
          if (negativeReviewsFromCommunity >= 3) {
            deceptionProbability += 0.5;
          }
        }
      }

      // Pattern 3: Suspicious timing (many reviews in short time)
      // This would require temporal analysis - simplified here
      const recentSimilarEdges = edges.filter(e =>
        e.source === edge.source &&
        Math.abs(e.timestamp - edge.timestamp) < 24 * 60 * 60 * 1000 // Within 24 hours
      ).length;
      
      if (recentSimilarEdges > 10) {
        deceptionProbability += 0.3;
      }

      deceptionProbabilities.set(edgeId, Math.min(1, deceptionProbability));
    });

    return deceptionProbabilities;
  }

  /**
   * Compute rolling average scores for stability
   * 
   * Smooths PageRank scores over time to reduce volatility from small graph changes.
   * 
   * @param currentScores - Current PageRank scores
   * @param historicalScores - Previous scores (array of score maps)
   * @param windowSize - Number of historical scores to consider
   * @param decayFactor - Exponential decay factor for older scores
   * @returns Smoothed scores
   */
  static computeRollingAverage(
    currentScores: Map<string, number>,
    historicalScores: Array<Map<string, number>>,
    windowSize: number = 5,
    decayFactor: number = 0.8
  ): Map<string, number> {
    const smoothedScores = new Map<string, number>();

    // Take most recent historical scores
    const recentHistory = historicalScores.slice(-windowSize);

    for (const nodeId of currentScores.keys()) {
      let weightedSum = 0;
      let totalWeight = 0;

      // Current score gets full weight
      const currentScore = currentScores.get(nodeId) || 0;
      weightedSum += currentScore;
      totalWeight += 1;

      // Historical scores get decayed weight
      for (let i = recentHistory.length - 1; i >= 0; i--) {
        const historicalScore = recentHistory[i].get(nodeId) || 0;
        const weight = Math.pow(decayFactor, recentHistory.length - i);
        weightedSum += historicalScore * weight;
        totalWeight += weight;
      }

      smoothedScores.set(nodeId, weightedSum / totalWeight);
    }

    return smoothedScores;
  }
}

export default GraphAlgorithms;

