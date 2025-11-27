/**
 * Enhanced Bot Cluster Detection Service
 * 
 * Multi-dimensional bot cluster detection from reputation algorithms.
 * Detects coordinated fake accounts and Sybil attacks by analyzing:
 * - Reputation patterns within clusters
 * - Graph structure (density, connectivity, reciprocity)
 * - Behavioral patterns (activity synchronization, content similarity)
 * - Temporal patterns (account age distribution, activity timing)
 * 
 * Based on research-backed bot detection methodologies.
 */

import { AccountClusteringService, type Account } from '../../dkg-integration/account-clustering';
import { GraphNode, GraphEdge } from '../../dkg-integration/graph-algorithms';
import { ReputationScore } from './reputationCalculator';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ReputationScores {
  [nodeId: string]: {
    finalScore: number;
    sybilRisk?: number;
    breakdown?: Record<string, number>;
    percentile?: number;
  };
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ClusterAnalysis {
  clusterId: string;
  nodeCount: number;
  nodes: string[];
  metrics: {
    reputationAnalysis: ReputationAnalysis;
    graphAnalysis: GraphAnalysis;
    behavioralAnalysis: BehavioralAnalysis;
    temporalAnalysis?: TemporalAnalysis;
  };
  suspicionScore: number;
  riskFactors: string[];
}

export interface ReputationAnalysis {
  avgReputation: number;
  maxReputation: number;
  minReputation: number;
  reputationVariance: number;
  lowReputationScore: number;
  uniformityScore: number;
}

export interface GraphAnalysis {
  density: number;
  avgClustering: number;
  externalConnectivity: number;
  reciprocity: number;
}

export interface BehavioralAnalysis {
  activitySynchronization: number;
  contentSimilarity: number;
  interactionReciprocity: number;
  accountAgeDistribution?: number;
}

export interface TemporalAnalysis {
  burstScore: number;
  regularityScore: number;
  timeClusteringScore: number;
}

export interface IndividualBot {
  node: string;
  reputationScore: number;
  sybilRisk: number;
  reason: string;
}

export interface BotDetectionResults {
  suspiciousClusters: ClusterAnalysis[];
  confirmedBotClusters: ClusterAnalysis[];
  individualBots: IndividualBot[];
  riskMetrics: RiskMetrics;
}

export interface RiskMetrics {
  totalSuspiciousClusters: number;
  totalConfirmedClusters: number;
  totalIndividualBots: number;
  avgSuspicionScore: number;
  highRiskNodes: number;
  affectedReputationRange: {
    min: number;
    max: number;
    avg: number;
  };
}

export interface BotDetectionConfig {
  minClusterSize?: number;
  suspicionThreshold?: number;
  confirmedThreshold?: number;
  lowReputationThreshold?: number;
  highSybilRiskThreshold?: number;
  detectionWeights?: {
    reputationBased?: number;
    graphStructure?: number;
    behavioralPatterns?: number;
    temporalPatterns?: number;
  };
}

// ============================================================================
// Bot Cluster Detector
// ============================================================================

export class BotClusterDetector {
  private clusteringService: AccountClusteringService;
  private config: Required<BotDetectionConfig>;
  private graphData: GraphData | null = null;
  private reputationScores: ReputationScores | null = null;

  constructor(config: BotDetectionConfig = {}) {
    this.config = {
      minClusterSize: config.minClusterSize ?? 3,
      suspicionThreshold: config.suspicionThreshold ?? 0.5,
      confirmedThreshold: config.confirmedThreshold ?? 0.7,
      lowReputationThreshold: config.lowReputationThreshold ?? 0.3,
      highSybilRiskThreshold: config.highSybilRiskThreshold ?? 0.7,
      detectionWeights: {
        reputationBased: config.detectionWeights?.reputationBased ?? 0.25,
        graphStructure: config.detectionWeights?.graphStructure ?? 0.35,
        behavioralPatterns: config.detectionWeights?.behavioralPatterns ?? 0.30,
        temporalPatterns: config.detectionWeights?.temporalPatterns ?? 0.10,
      },
    };

    // Initialize clustering service optimized for bot detection
    this.clusteringService = new AccountClusteringService({
      method: 'connectivity',
      minSimilarity: 0.3,
      minClusterSize: this.config.minClusterSize,
      maxClusterSize: 1000,
      featureWeights: {
        sharedConnections: 0.35,
        connectionOverlap: 0.3,
        temporalSimilarity: 0.2,
        metadataSimilarity: 0.1,
        graphDistance: 0.05,
      },
    });
  }

  /**
   * Main entry point for bot cluster detection
   */
  async detectBotClusters(
    graphData: GraphData,
    reputationScores: ReputationScores
  ): Promise<BotDetectionResults> {
    console.log('🔍 Starting bot cluster detection...');

    this.graphData = graphData;
    this.reputationScores = reputationScores;

    const detectionResults: BotDetectionResults = {
      suspiciousClusters: [],
      confirmedBotClusters: [],
      individualBots: [],
      riskMetrics: {
        totalSuspiciousClusters: 0,
        totalConfirmedClusters: 0,
        totalIndividualBots: 0,
        avgSuspicionScore: 0,
        highRiskNodes: 0,
        affectedReputationRange: { min: 0, max: 0, avg: 0 },
      },
    };

    // 1. Run community detection to find clusters
    const communities = await this.detectCommunities();

    // 2. Analyze each community for bot-like characteristics
    for (const community of communities) {
      if (community.length >= this.config.minClusterSize) {
        const clusterAnalysis = await this.analyzeCluster(community, reputationScores);

        if (clusterAnalysis.suspicionScore > this.config.confirmedThreshold) {
          detectionResults.confirmedBotClusters.push(clusterAnalysis);
        } else if (clusterAnalysis.suspicionScore > this.config.suspicionThreshold) {
          detectionResults.suspiciousClusters.push(clusterAnalysis);
        }
      }
    }

    // 3. Detect individual bots (not in clusters but high risk)
    detectionResults.individualBots = this.detectIndividualBots(reputationScores, communities);

    // 4. Calculate overall risk metrics
    detectionResults.riskMetrics = this.calculateRiskMetrics(detectionResults, reputationScores);

    return detectionResults;
  }

  /**
   * Detect communities using clustering algorithms
   */
  private async detectCommunities(): Promise<string[][]> {
    if (!this.graphData) return [];

    // Convert graph to Account format for clustering
    const accounts: Account[] = this.graphData.nodes.map(node => {
      const connections = this.graphData!.edges
        .filter(e => e.source === node.id)
        .map(e => ({
          target: e.target,
          weight: e.weight,
        }));

      return {
        accountId: node.id,
        reputation: this.reputationScores?.[node.id]?.finalScore || 0,
        contributions: [],
        connections,
        metadata: {
          stake: node.metadata?.stake,
          paymentHistory: node.metadata?.paymentHistory,
          ...node.metadata,
        },
      };
    });

    // Use clustering service to find clusters
    const clusters = this.clusteringService.findClusters(accounts);

    // Convert to array of node ID arrays
    return clusters.map(cluster => cluster.accounts);
  }

  /**
   * Comprehensive analysis of a potential bot cluster
   */
  private async analyzeCluster(
    clusterNodes: string[],
    reputationScores: ReputationScores
  ): Promise<ClusterAnalysis> {
    // Build subgraph for this cluster
    const clusterSubgraph = this.buildClusterSubgraph(clusterNodes);

    const analysis: ClusterAnalysis = {
      clusterId: `cluster_${clusterNodes.length}_nodes_${Date.now()}`,
      nodeCount: clusterNodes.length,
      nodes: clusterNodes,
      metrics: {
        reputationAnalysis: this.analyzeClusterReputation(clusterNodes, reputationScores),
        graphAnalysis: this.analyzeClusterStructure(clusterNodes, clusterSubgraph),
        behavioralAnalysis: await this.analyzeClusterBehavior(clusterNodes),
        temporalAnalysis: await this.analyzeTemporalPatterns(clusterNodes),
      },
      suspicionScore: 0.0,
      riskFactors: [],
    };

    // Calculate overall suspicion score
    analysis.suspicionScore = this.calculateSuspicionScore(analysis.metrics);
    analysis.riskFactors = this.identifyRiskFactors(analysis.metrics);

    return analysis;
  }

  /**
   * Analyze reputation patterns within cluster
   */
  private analyzeClusterReputation(
    clusterNodes: string[],
    reputationScores: ReputationScores
  ): ReputationAnalysis {
    const clusterReputations = clusterNodes
      .map(nodeId => reputationScores[nodeId]?.finalScore ?? 0)
      .filter(score => score >= 0);

    if (clusterReputations.length === 0) {
      return {
        avgReputation: 0,
        maxReputation: 0,
        minReputation: 0,
        reputationVariance: 0,
        lowReputationScore: 1.0,
        uniformityScore: 1.0,
      };
    }

    const avgReputation =
      clusterReputations.reduce((sum, score) => sum + score, 0) / clusterReputations.length;
    const maxReputation = Math.max(...clusterReputations);
    const minReputation = Math.min(...clusterReputations);

    // Calculate variance
    const variance =
      clusterReputations.reduce((sum, score) => sum + Math.pow(score - avgReputation, 2), 0) /
      clusterReputations.length;

    // Low reputation is suspicious (normalized to 0-1)
    const lowReputationScore = Math.min(1.0, 1.0 - avgReputation / 1000);

    // Very uniform reputations are suspicious (all bots created together)
    // Higher variance = less suspicious (more natural distribution)
    const uniformityScore = variance > 0 ? 1.0 / (1.0 + variance) : 1.0;

    return {
      avgReputation,
      maxReputation,
      minReputation,
      reputationVariance: variance,
      lowReputationScore,
      uniformityScore,
    };
  }

  /**
   * Analyze graph structure of the cluster
   */
  private analyzeClusterStructure(
    clusterNodes: string[],
    clusterSubgraph: { nodes: Set<string>; edges: GraphEdge[] }
  ): GraphAnalysis {
    const nodeSet = clusterSubgraph.nodes;
    const edges = clusterSubgraph.edges;
    const nodeArray = Array.from(nodeSet);

    // Calculate density: actual edges / possible edges
    const n = nodeArray.length;
    const possibleEdges = n * (n - 1); // Directed graph
    const actualEdges = edges.length;
    const density = possibleEdges > 0 ? actualEdges / possibleEdges : 0;

    // Calculate average clustering coefficient
    // For each node, find triangles it's part of
    const clusteringScores: number[] = [];
    for (const node of nodeArray) {
      const neighbors = new Set<string>();
      edges.forEach(edge => {
        if (edge.source === node) neighbors.add(edge.target);
        if (edge.target === node) neighbors.add(edge.source);
      });

      if (neighbors.size < 2) {
        clusteringScores.push(0);
        continue;
      }

      // Count triangles (triplets of connected neighbors)
      let triangles = 0;
      const neighborArray = Array.from(neighbors);
      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const hasEdge =
            edges.some(
              e =>
                (e.source === neighborArray[i] && e.target === neighborArray[j]) ||
                (e.source === neighborArray[j] && e.target === neighborArray[i])
            ) || false;
          if (hasEdge) triangles++;
        }
      }

      const possibleTriangles = (neighbors.size * (neighbors.size - 1)) / 2;
      clusteringScores.push(possibleTriangles > 0 ? triangles / possibleTriangles : 0);
    }

    const avgClustering =
      clusteringScores.length > 0
        ? clusteringScores.reduce((sum, score) => sum + score, 0) / clusteringScores.length
        : 0;

    // Calculate external connectivity
    const externalConnectivity = this.calculateExternalConnectivity(clusterNodes);

    // Calculate reciprocity (mutual connections)
    const reciprocity = this.calculateReciprocity(edges);

    return {
      density,
      avgClustering,
      externalConnectivity,
      reciprocity,
    };
  }

  /**
   * Calculate how connected the cluster is to the rest of the graph
   */
  private calculateExternalConnectivity(clusterNodes: string[]): number {
    if (!this.graphData) return 0;

    const clusterNodeSet = new Set(clusterNodes);
    let externalConnections = 0;
    let totalPossibleExternal = 0;

    for (const nodeId of clusterNodes) {
      // Count connections to nodes outside the cluster
      const outgoing = this.graphData.edges.filter(e => e.source === nodeId);
      const externalNeighbors = outgoing.filter(e => !clusterNodeSet.has(e.target));

      externalConnections += externalNeighbors.length;
      totalPossibleExternal += this.graphData.nodes.length - clusterNodes.length;
    }

    return totalPossibleExternal > 0 ? externalConnections / totalPossibleExternal : 0.0;
  }

  /**
   * Calculate reciprocity (mutual connections) in the cluster
   */
  private calculateReciprocity(edges: GraphEdge[]): number {
    if (edges.length === 0) return 0;

    let reciprocalPairs = 0;
    const edgeSet = new Set<string>();

    // Store edges as "source->target" strings
    edges.forEach(edge => {
      edgeSet.add(`${edge.source}->${edge.target}`);
    });

    // Count reciprocal edges
    edges.forEach(edge => {
      if (edgeSet.has(`${edge.target}->${edge.source}`)) {
        reciprocalPairs++;
      }
    });

    return edges.length > 0 ? reciprocalPairs / edges.length : 0;
  }

  /**
   * Build subgraph for cluster nodes
   */
  private buildClusterSubgraph(clusterNodes: string[]): {
    nodes: Set<string>;
    edges: GraphEdge[];
  } {
    if (!this.graphData) {
      return { nodes: new Set(), edges: [] };
    }

    const clusterNodeSet = new Set(clusterNodes);
    const clusterEdges = this.graphData.edges.filter(
      edge => clusterNodeSet.has(edge.source) && clusterNodeSet.has(edge.target)
    );

    return {
      nodes: clusterNodeSet,
      edges: clusterEdges,
    };
  }

  /**
   * Analyze behavioral patterns within cluster
   */
  private async analyzeClusterBehavior(clusterNodes: string[]): Promise<BehavioralAnalysis> {
    // Activity synchronization: Check if accounts have similar activity patterns
    const activitySynchronization = this.analyzeActivitySynchronization(clusterNodes);

    // Content similarity: Analyze similarity of content/behavior
    const contentSimilarity = this.analyzeContentSimilarity(clusterNodes);

    // Interaction reciprocity: How reciprocal are interactions within cluster
    const interactionReciprocity = this.analyzeInteractionReciprocity(clusterNodes);

    // Account age distribution: Are accounts created around the same time?
    const accountAgeDistribution = this.analyzeAccountAges(clusterNodes);

    return {
      activitySynchronization,
      contentSimilarity,
      interactionReciprocity,
      accountAgeDistribution,
    };
  }

  /**
   * Detect synchronized posting/activity patterns
   */
  private analyzeActivitySynchronization(clusterNodes: string[]): number {
    if (!this.graphData || clusterNodes.length < 2) return 0;

    // In a real implementation, analyze timestamps of activities
    // For now, analyze connection timestamps as proxy
    const nodeTimestamps = new Map<string, number[]>();

    clusterNodes.forEach(nodeId => {
      const nodeEdges = this.graphData!.edges.filter(e => e.source === nodeId || e.target === nodeId);
      const timestamps = nodeEdges.map(e => e.timestamp || 0).sort((a, b) => a - b);
      nodeTimestamps.set(nodeId, timestamps);
    });

    // Calculate pairwise correlation of activity patterns
    let totalCorrelation = 0;
    let pairCount = 0;

    for (let i = 0; i < clusterNodes.length; i++) {
      for (let j = i + 1; j < clusterNodes.length; j++) {
        const timestamps1 = nodeTimestamps.get(clusterNodes[i]) || [];
        const timestamps2 = nodeTimestamps.get(clusterNodes[j]) || [];

        if (timestamps1.length > 0 && timestamps2.length > 0) {
          // Simple time window correlation
          const correlation = this.calculateTimeCorrelation(timestamps1, timestamps2);
          totalCorrelation += correlation;
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? Math.max(0, totalCorrelation / pairCount) : 0;
  }

  /**
   * Calculate correlation between two timestamp arrays
   */
  private calculateTimeCorrelation(timestamps1: number[], timestamps2: number[]): number {
    if (timestamps1.length === 0 || timestamps2.length === 0) return 0;

    // Use a time window (e.g., 1 hour) to detect synchronized activities
    const windowMs = 60 * 60 * 1000; // 1 hour
    let matches = 0;
    let total1 = 0;

    timestamps1.forEach(ts1 => {
      total1++;
      const hasNearbyMatch = timestamps2.some(ts2 => Math.abs(ts1 - ts2) < windowMs);
      if (hasNearbyMatch) matches++;
    });

    return total1 > 0 ? matches / total1 : 0;
  }

  /**
   * Analyze similarity of content/behavior
   */
  private analyzeContentSimilarity(clusterNodes: string[]): number {
    if (!this.reputationScores || clusterNodes.length < 2) return 0;

    // Analyze reputation breakdown similarity as proxy for behavior similarity
    const breakdowns = clusterNodes
      .map(nodeId => this.reputationScores![nodeId]?.breakdown)
      .filter((bd): bd is Record<string, number> => !!bd);

    if (breakdowns.length < 2) return 0;

    // Calculate pairwise similarity of reputation breakdowns
    let totalSimilarity = 0;
    let pairCount = 0;

    for (let i = 0; i < breakdowns.length; i++) {
      for (let j = i + 1; j < breakdowns.length; j++) {
        const similarity = this.calculateBreakdownSimilarity(breakdowns[i], breakdowns[j]);
        totalSimilarity += similarity;
        pairCount++;
      }
    }

    return pairCount > 0 ? totalSimilarity / pairCount : 0;
  }

  /**
   * Calculate similarity between two reputation breakdowns
   */
  private calculateBreakdownSimilarity(
    breakdown1: Record<string, number>,
    breakdown2: Record<string, number>
  ): number {
    const allKeys = new Set([...Object.keys(breakdown1), ...Object.keys(breakdown2)]);
    if (allKeys.size === 0) return 0;

    let similarity = 0;
    let total = 0;

    allKeys.forEach(key => {
      const val1 = breakdown1[key] || 0;
      const val2 = breakdown2[key] || 0;
      const max = Math.max(Math.abs(val1), Math.abs(val2), 1);
      similarity += 1 - Math.abs(val1 - val2) / max;
      total++;
    });

    return total > 0 ? similarity / total : 0;
  }

  /**
   * Analyze interaction reciprocity within cluster
   */
  private analyzeInteractionReciprocity(clusterNodes: string[]): number {
    if (!this.graphData) return 0;

    const clusterNodeSet = new Set(clusterNodes);
    const clusterEdges = this.graphData.edges.filter(
      e => clusterNodeSet.has(e.source) && clusterNodeSet.has(e.target)
    );

    if (clusterEdges.length === 0) return 0;

    // Count reciprocal pairs
    const edgeSet = new Set<string>();
    clusterEdges.forEach(e => {
      edgeSet.add(`${e.source}->${e.target}`);
    });

    let reciprocalCount = 0;
    clusterEdges.forEach(e => {
      if (edgeSet.has(`${e.target}->${e.source}`)) {
        reciprocalCount++;
      }
    });

    return clusterEdges.length > 0 ? reciprocalCount / clusterEdges.length : 0;
  }

  /**
   * Analyze if accounts were created around the same time
   */
  private analyzeAccountAges(clusterNodes: string[]): number {
    if (!this.graphData || clusterNodes.length < 2) return 0;

    // Extract account creation dates from metadata
    const accountAges: number[] = [];

    clusterNodes.forEach(nodeId => {
      const node = this.graphData!.nodes.find(n => n.id === nodeId);
      if (node?.metadata?.activityRecency) {
        // Use activity recency as proxy for account age
        accountAges.push(node.metadata.activityRecency);
      }
    });

    if (accountAges.length < 2) return 0;

    // Calculate variance in account ages
    const avgAge = accountAges.reduce((sum, age) => sum + age, 0) / accountAges.length;
    const variance =
      accountAges.reduce((sum, age) => sum + Math.pow(age - avgAge, 2), 0) / accountAges.length;

    // Low variance = accounts created around same time = suspicious
    // Normalize: higher variance = lower suspicion
    return variance > 0 ? 1.0 / (1.0 + variance / (24 * 60 * 60 * 1000)) : 1.0; // Normalize by 1 day
  }

  /**
   * Analyze temporal patterns in cluster activity
   */
  private async analyzeTemporalPatterns(clusterNodes: string[]): Promise<TemporalAnalysis> {
    if (!this.graphData) {
      return {
        burstScore: 0,
        regularityScore: 0,
        timeClusteringScore: 0,
      };
    }

    // Collect all timestamps from cluster edges
    const allTimestamps: number[] = [];
    const clusterNodeSet = new Set(clusterNodes);

    this.graphData.edges.forEach(edge => {
      if (
        (clusterNodeSet.has(edge.source) || clusterNodeSet.has(edge.target)) &&
        edge.timestamp
      ) {
        allTimestamps.push(edge.timestamp);
      }
    });

    if (allTimestamps.length < 2) {
      return {
        burstScore: 0,
        regularityScore: 0,
        timeClusteringScore: 0,
      };
    }

    // Analyze burst patterns
    const burstScore = this.analyzeBurstPatterns(allTimestamps);

    // Analyze regularity
    const regularityScore = this.analyzeRegularity(allTimestamps);

    // Time clustering score
    const timeClusteringScore = (burstScore + regularityScore) / 2;

    return {
      burstScore,
      regularityScore,
      timeClusteringScore,
    };
  }

  /**
   * Analyze burst patterns in timestamps
   */
  private analyzeBurstPatterns(timestamps: number[]): number {
    if (timestamps.length < 2) return 0;

    const sorted = [...timestamps].sort((a, b) => a - b);
    const windowMs = 60 * 60 * 1000; // 1 hour window

    let maxBurst = 0;
    let currentBurst = 1;
    let windowStart = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - windowStart < windowMs) {
        currentBurst++;
        maxBurst = Math.max(maxBurst, currentBurst);
      } else {
        currentBurst = 1;
        windowStart = sorted[i];
      }
    }

    // Normalize by total count
    return Math.min(1.0, maxBurst / sorted.length);
  }

  /**
   * Analyze regularity of timestamps (suspicious if too regular)
   */
  private analyzeRegularity(timestamps: number[]): number {
    if (timestamps.length < 3) return 0;

    const sorted = [...timestamps].sort((a, b) => a - b);
    const intervals: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      intervals.push(sorted[i] - sorted[i - 1]);
    }

    if (intervals.length === 0) return 0;

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance =
      intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
      intervals.length;

    // Low variance = very regular = suspicious
    // Normalize by average interval
    const normalizedVariance = avgInterval > 0 ? variance / avgInterval : 0;
    return normalizedVariance > 0 ? 1.0 / (1.0 + normalizedVariance) : 1.0;
  }

  /**
   * Calculate overall suspicion score for a cluster
   */
  private calculateSuspicionScore(metrics: {
    reputationAnalysis: ReputationAnalysis;
    graphAnalysis: GraphAnalysis;
    behavioralAnalysis: BehavioralAnalysis;
    temporalAnalysis?: TemporalAnalysis;
  }): number {
    const weights = this.config.detectionWeights;

    // Reputation-based score
    const reputationScore =
      metrics.reputationAnalysis.lowReputationScore * 0.6 +
      metrics.reputationAnalysis.uniformityScore * 0.4;

    // Graph structure score
    const structureScore =
      metrics.graphAnalysis.density * 0.3 +
      metrics.graphAnalysis.avgClustering * 0.2 +
      (1 - metrics.graphAnalysis.externalConnectivity) * 0.3 +
      metrics.graphAnalysis.reciprocity * 0.2;

    // Behavioral score
    const behavioralScore =
      metrics.behavioralAnalysis.activitySynchronization * 0.4 +
      metrics.behavioralAnalysis.contentSimilarity * 0.4 +
      metrics.behavioralAnalysis.interactionReciprocity * 0.2;

    // Temporal score (if available)
    let temporalScore = 0;
    if (metrics.temporalAnalysis) {
      temporalScore = metrics.temporalAnalysis.timeClusteringScore;
    }

    // Weighted combination
    const overallScore =
      reputationScore * weights.reputationBased +
      structureScore * weights.graphStructure +
      behavioralScore * weights.behavioralPatterns +
      temporalScore * weights.temporalPatterns;

    return Math.min(1.0, overallScore);
  }

  /**
   * Identify specific risk factors for the cluster
   */
  private identifyRiskFactors(metrics: {
    reputationAnalysis: ReputationAnalysis;
    graphAnalysis: GraphAnalysis;
    behavioralAnalysis: BehavioralAnalysis;
    temporalAnalysis?: TemporalAnalysis;
  }): string[] {
    const riskFactors: string[] = [];

    if (metrics.reputationAnalysis.avgReputation < this.config.lowReputationThreshold * 1000) {
      riskFactors.push('LOW_REPUTATION_CLUSTER');
    }

    if (metrics.graphAnalysis.density > 0.8) {
      riskFactors.push('HIGH_INTERNAL_DENSITY');
    }

    if (metrics.graphAnalysis.externalConnectivity < 0.2) {
      riskFactors.push('LOW_EXTERNAL_CONNECTIVITY');
    }

    if (metrics.behavioralAnalysis.activitySynchronization > 0.7) {
      riskFactors.push('SYNCHRONIZED_ACTIVITY');
    }

    if (metrics.behavioralAnalysis.contentSimilarity > 0.6) {
      riskFactors.push('SIMILAR_CONTENT_PATTERNS');
    }

    if (metrics.graphAnalysis.reciprocity > 0.8) {
      riskFactors.push('HIGH_RECIPROCITY');
    }

    if (metrics.behavioralAnalysis.accountAgeDistribution !== undefined) {
      if (metrics.behavioralAnalysis.accountAgeDistribution > 0.7) {
        riskFactors.push('SIMILAR_ACCOUNT_AGES');
      }
    }

    if (metrics.temporalAnalysis?.burstScore > 0.7) {
      riskFactors.push('BURST_ACTIVITY_PATTERN');
    }

    if (metrics.temporalAnalysis?.regularityScore > 0.7) {
      riskFactors.push('REGULAR_ACTIVITY_PATTERN');
    }

    return riskFactors;
  }

  /**
   * Detect individual bots not part of clusters
   */
  private detectIndividualBots(
    reputationScores: ReputationScores,
    communities: string[][]
  ): IndividualBot[] {
    const individualBots: IndividualBot[] = [];
    const clusteredNodes = new Set<string>();

    // Collect all clustered nodes
    communities.forEach(community => {
      community.forEach(nodeId => clusteredNodes.add(nodeId));
    });

    // Check unclustered nodes for high risk
    Object.entries(reputationScores).forEach(([nodeId, scoreData]) => {
      if (clusteredNodes.has(nodeId)) return; // Skip clustered nodes

      const finalScore = scoreData.finalScore ?? 0;
      const sybilRisk = scoreData.sybilRisk ?? 0;

      // High suspicion individual accounts
      if ((finalScore < 200 && sybilRisk > this.config.highSybilRiskThreshold) || sybilRisk > 0.9) {
        individualBots.push({
          node: nodeId,
          reputationScore: finalScore,
          sybilRisk,
          reason: sybilRisk > 0.7 ? 'HIGH_SYBIL_RISK' : 'VERY_LOW_REPUTATION',
        });
      }
    });

    return individualBots;
  }

  /**
   * Calculate overall risk metrics
   */
  private calculateRiskMetrics(
    results: BotDetectionResults,
    reputationScores: ReputationScores
  ): RiskMetrics {
    const allClusters = [...results.confirmedBotClusters, ...results.suspiciousClusters];
    const allSuspicionScores = allClusters.map(c => c.suspicionScore);
    const avgSuspicionScore =
      allSuspicionScores.length > 0
        ? allSuspicionScores.reduce((sum, score) => sum + score, 0) / allSuspicionScores.length
        : 0;

    // Collect all affected node reputations
    const affectedReputations: number[] = [];

    allClusters.forEach(cluster => {
      cluster.nodes.forEach(nodeId => {
        const score = reputationScores[nodeId]?.finalScore ?? 0;
        affectedReputations.push(score);
      });
    });

    results.individualBots.forEach(bot => {
      affectedReputations.push(bot.reputationScore);
    });

    const highRiskNodes =
      results.confirmedBotClusters.reduce((sum, c) => sum + c.nodeCount, 0) +
      results.individualBots.filter(b => b.sybilRisk > 0.8).length;

    const affectedReputationRange = {
      min: affectedReputations.length > 0 ? Math.min(...affectedReputations) : 0,
      max: affectedReputations.length > 0 ? Math.max(...affectedReputations) : 0,
      avg:
        affectedReputations.length > 0
          ? affectedReputations.reduce((sum, r) => sum + r, 0) / affectedReputations.length
          : 0,
    };

    return {
      totalSuspiciousClusters: results.suspiciousClusters.length,
      totalConfirmedClusters: results.confirmedBotClusters.length,
      totalIndividualBots: results.individualBots.length,
      avgSuspicionScore,
      highRiskNodes,
      affectedReputationRange,
    };
  }
}

