/**
 * Enhanced Graph Ranking Algorithms
 * 
 * Implements advanced graph ranking with temporal weighting, fairness,
 * and robustness features based on recent research (2018-2025).
 * 
 * Features:
 * - Temporal PageRank (UWUSRank-like): Recency-weighted ranking
 * - Weighted edges: Endorsement strength, stake, payments
 * - Sensitivity auditing: Detect which edges most influence rankings
 * - Fairness adjustments: Mitigate bias and inequality
 * - Hybrid scoring: Combine graph structure + economic signals + verification
 */

export interface GraphNode {
  id: string;
  activity?: number; // 0-1 activity score
  stake?: number;
  payments?: number;
  transactions?: number;
  verificationScore?: number; // 0-1 verification score
  label?: string; // For fairness analysis (e.g., 'minority', 'majority')
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  timestamp?: Date;
  type?: 'endorsement' | 'follow' | 'collaboration' | 'payment';
}

export interface PageRankConfig {
  alpha?: number; // Damping factor (default: 0.85)
  maxIterations?: number;
  tolerance?: number;
  recencyDecay?: number; // Decay factor per day (default: 0.95)
  activityWeight?: number; // Weight for user activity (default: 0.3)
}

export interface HybridRankingConfig {
  graphWeight?: number; // Weight for graph structure (default: 0.4)
  economicWeight?: number; // Weight for economic signals (default: 0.3)
  verificationWeight?: number; // Weight for verification (default: 0.2)
  temporalWeight?: number; // Weight for temporal signals (default: 0.1)
}

export interface FairnessConfig {
  minorityBoost?: number; // Boost for underrepresented nodes (default: 0.1)
  dampingFactor?: number; // Damping to reduce rich-get-richer (default: 0.9)
  minScoreFloor?: number; // Minimum score floor (default: 0.01)
}

export interface RankingResult {
  scores: Map<string, number>;
  topRanked: Array<{ node: string; score: number }>;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    timestamp: string;
    algorithm: string;
  };
}

export interface AuditingResult {
  edgeInfluence: Map<string, number>; // "source->target" -> influence score
  sensitiveNodes: Array<{ node: string; sensitivity: number }>;
  explanations: Map<string, {
    originalScore: number;
    topInfluencingEdges: Array<{ source: string; target: string; influence: number }>;
    incomingInfluence: number;
    outgoingInfluence: number;
  }>;
}

/**
 * Temporal PageRank implementation inspired by UWUSRank
 * Incorporates recency, activity, and interaction strength
 */
export class TemporalPageRank {
  private alpha: number;
  private recencyDecay: number;
  private activityWeight: number;
  private maxIterations: number;
  private tolerance: number;

  constructor(config: PageRankConfig = {}) {
    this.alpha = config.alpha ?? 0.85;
    this.recencyDecay = config.recencyDecay ?? 0.95;
    this.activityWeight = config.activityWeight ?? 0.3;
    this.maxIterations = config.maxIterations ?? 100;
    this.tolerance = config.tolerance ?? 1e-6;
  }

  /**
   * Compute temporal PageRank with recency weighting
   */
  compute(
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): Map<string, number> {
    if (nodes.length === 0) {
      return new Map();
    }

    // Build adjacency list with weighted edges
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach(node => nodeMap.set(node.id, node));

    const outgoing: Map<string, Array<{ target: string; weight: number }>> = new Map();
    const incoming: Map<string, Array<{ source: string; weight: number }>> = new Map();

    const now = Date.now();

    // Process edges with temporal weighting
    edges.forEach(edge => {
      let weight = edge.weight;

      // Apply recency decay
      if (edge.timestamp) {
        const daysOld = (now - edge.timestamp.getTime()) / (1000 * 60 * 60 * 24);
        const recencyFactor = Math.pow(this.recencyDecay, daysOld);
        weight *= recencyFactor;
      }

      // Apply activity weighting
      const sourceNode = nodeMap.get(edge.source);
      if (sourceNode?.activity !== undefined) {
        const activityBoost = 1.0 + (sourceNode.activity * this.activityWeight);
        weight *= activityBoost;
      }

      // Build adjacency lists
      if (!outgoing.has(edge.source)) {
        outgoing.set(edge.source, []);
      }
      outgoing.get(edge.source)!.push({ target: edge.target, weight });

      if (!incoming.has(edge.target)) {
        incoming.set(edge.target, []);
      }
      incoming.get(edge.target)!.push({ source: edge.source, weight });
    });

    // Initialize scores uniformly
    const scores = new Map<string, number>();
    const n = nodes.length;
    nodes.forEach(node => {
      scores.set(node.id, 1.0 / n);
    });

    // Iterate PageRank
    for (let iter = 0; iter < this.maxIterations; iter++) {
      const newScores = new Map<string, number>();
      let maxDiff = 0;

      nodes.forEach(node => {
        const nodeId = node.id;
        let newScore = (1 - this.alpha) / n;

        // Sum contributions from incoming edges
        const incomingEdges = incoming.get(nodeId) || [];
        incomingEdges.forEach(({ source, weight }) => {
          const sourceScore = scores.get(source) || 0;
          const sourceOutgoing = outgoing.get(source) || [];
          const totalOutgoingWeight = sourceOutgoing.reduce((sum, e) => sum + e.weight, 0);

          if (totalOutgoingWeight > 0) {
            newScore += this.alpha * sourceScore * (weight / totalOutgoingWeight);
          }
        });

        newScores.set(nodeId, newScore);
        maxDiff = Math.max(maxDiff, Math.abs(newScore - (scores.get(nodeId) || 0)));
      });

      scores.clear();
      newScores.forEach((score, nodeId) => scores.set(nodeId, score));

      if (maxDiff < this.tolerance) {
        break;
      }
    }

    return scores;
  }
}

/**
 * Hybrid PageRank that combines graph structure, economic signals,
 * content verification, and temporal signals
 */
export class WeightedHybridPageRank {
  private graphWeight: number;
  private economicWeight: number;
  private verificationWeight: number;
  private temporalWeight: number;

  constructor(config: HybridRankingConfig = {}) {
    this.graphWeight = config.graphWeight ?? 0.4;
    this.economicWeight = config.economicWeight ?? 0.3;
    this.verificationWeight = config.verificationWeight ?? 0.2;
    this.temporalWeight = config.temporalWeight ?? 0.1;

    // Normalize weights to sum to 1.0
    const total = this.graphWeight + this.economicWeight + 
                  this.verificationWeight + this.temporalWeight;
    if (Math.abs(total - 1.0) > 0.01) {
      this.graphWeight /= total;
      this.economicWeight /= total;
      this.verificationWeight /= total;
      this.temporalWeight /= total;
    }
  }

  /**
   * Compute hybrid reputation score
   */
  compute(
    pagerankScores: Map<string, number>,
    nodes: GraphNode[]
  ): Map<string, number> {
    const hybridScores = new Map<string, number>();

    // Normalize PageRank scores to [0, 1]
    const maxPR = Math.max(...Array.from(pagerankScores.values()));
    const normalizedPR = new Map<string, number>();
    pagerankScores.forEach((score, nodeId) => {
      normalizedPR.set(nodeId, maxPR > 0 ? score / maxPR : 0.0);
    });

    nodes.forEach(node => {
      // Graph component
      const graphScore = normalizedPR.get(node.id) || 0.0;

      // Economic component
      let economicScore = 0.0;
      if (node.stake !== undefined || node.payments !== undefined || node.transactions !== undefined) {
        const stake = node.stake || 0.0;
        const payments = node.payments || 0.0;
        const transactions = node.transactions || 0.0;

        economicScore = Math.min(1.0, (
          Math.min(1.0, stake / 1000.0) * 0.5 +  // Stake normalized to 1000
          Math.min(1.0, payments / 100.0) * 0.3 +  // Payments normalized to 100
          Math.min(1.0, transactions / 50.0) * 0.2  // Transactions normalized to 50
        ));
      }

      // Verification component
      const verificationScore = node.verificationScore ?? 0.5;

      // Temporal component (activity)
      const temporalScore = node.activity ?? 0.5;

      // Combine all components
      const hybridScore = (
        graphScore * this.graphWeight +
        economicScore * this.economicWeight +
        verificationScore * this.verificationWeight +
        temporalScore * this.temporalWeight
      );

      hybridScores.set(node.id, Math.min(1.0, Math.max(0.0, hybridScore)));
    });

    return hybridScores;
  }
}

/**
 * Fairness adjustments to mitigate bias and inequality in rankings
 */
export class FairnessAdjuster {
  private minorityBoost: number;
  private dampingFactor: number;
  private minScoreFloor: number;

  constructor(config: FairnessConfig = {}) {
    this.minorityBoost = config.minorityBoost ?? 0.1;
    this.dampingFactor = config.dampingFactor ?? 0.9;
    this.minScoreFloor = config.minScoreFloor ?? 0.01;
  }

  /**
   * Apply fairness adjustments to scores
   */
  adjustForFairness(
    scores: Map<string, number>,
    nodeLabels?: Map<string, string>  // node -> label (e.g., 'minority', 'majority')
  ): Map<string, number> {
    const adjusted = new Map(scores);

    // Identify minority nodes
    const minorityNodes = new Set<string>();
    if (nodeLabels) {
      nodeLabels.forEach((label, nodeId) => {
        if (label === 'minority' || label === 'low_connectivity') {
          minorityNodes.add(nodeId);
        }
      });
    }

    // Apply damping to reduce rich-get-richer effect
    const maxScore = Math.max(...Array.from(adjusted.values()));
    adjusted.forEach((score, nodeId) => {
      if (score > maxScore * 0.5) {
        adjusted.set(nodeId, score * this.dampingFactor);
      }
    });

    // Boost minority nodes
    minorityNodes.forEach(nodeId => {
      const currentScore = adjusted.get(nodeId);
      if (currentScore !== undefined) {
        adjusted.set(nodeId, Math.min(1.0, currentScore * (1.0 + this.minorityBoost)));
      }
    });

    // Apply minimum floor
    adjusted.forEach((score, nodeId) => {
      adjusted.set(nodeId, Math.max(this.minScoreFloor, score));
    });

    // Renormalize
    const total = Array.from(adjusted.values()).reduce((sum, s) => sum + s, 0);
    if (total > 0) {
      adjusted.forEach((score, nodeId) => {
        adjusted.set(nodeId, score / total);
      });
    }

    return adjusted;
  }

  /**
   * Detect bias in rankings across groups
   */
  detectBias(
    scores: Map<string, number>,
    nodeGroups: Map<string, string>  // node -> group label
  ): {
    groupStatistics: Map<string, {
      mean: number;
      median: number;
      std: number;
      count: number;
      max: number;
      min: number;
    }>;
    inequalityMetrics: Map<string, {
      relativeMean: number;
      representationRatio: number;
    }>;
    overallMean: number;
  } {
    const groupScores = new Map<string, number[]>();

    scores.forEach((score, nodeId) => {
      const group = nodeGroups.get(nodeId);
      if (group) {
        if (!groupScores.has(group)) {
          groupScores.set(group, []);
        }
        groupScores.get(group)!.push(score);
      }
    });

    const groupStats = new Map<string, {
      mean: number;
      median: number;
      std: number;
      count: number;
      max: number;
      min: number;
    }>();

    groupScores.forEach((scoreList, group) => {
      const sorted = [...scoreList].sort((a, b) => a - b);
      const mean = scoreList.reduce((sum, s) => sum + s, 0) / scoreList.length;
      const variance = scoreList.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scoreList.length;
      const std = Math.sqrt(variance);

      groupStats.set(group, {
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        std,
        count: scoreList.length,
        max: Math.max(...scoreList),
        min: Math.min(...scoreList)
      });
    });

    const overallMean = Array.from(scores.values()).reduce((sum, s) => sum + s, 0) / scores.size;

    const inequalityMetrics = new Map<string, {
      relativeMean: number;
      representationRatio: number;
    }>();

    groupStats.forEach((stats, group) => {
      inequalityMetrics.set(group, {
        relativeMean: overallMean > 0 ? stats.mean / overallMean : 0.0,
        representationRatio: stats.count / scores.size
      });
    });

    return {
      groupStatistics: groupStats,
      inequalityMetrics,
      overallMean
    };
  }
}

/**
 * Comprehensive reputation computation with all enhancements
 */
export function computeEnhancedReputation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: {
    useTemporal?: boolean;
    useHybrid?: boolean;
    enableFairness?: boolean;
    enableAuditing?: boolean;
    pagerankConfig?: PageRankConfig;
    hybridConfig?: HybridRankingConfig;
    fairnessConfig?: FairnessConfig;
  } = {}
): RankingResult {
  const {
    useTemporal = true,
    useHybrid = true,
    enableFairness = true,
    enableAuditing = false,
    pagerankConfig = {},
    hybridConfig = {},
    fairnessConfig = {}
  } = options;

  // 1. Compute temporal PageRank
  const temporalPR = new TemporalPageRank(pagerankConfig);
  let pagerankScores = temporalPR.compute(nodes, edges);

  // 2. Compute hybrid scores if economic/verification data available
  let finalScores = pagerankScores;
  if (useHybrid && nodes.some(n => n.stake !== undefined || n.verificationScore !== undefined)) {
    const hybridPR = new WeightedHybridPageRank(hybridConfig);
    finalScores = hybridPR.compute(pagerankScores, nodes);
  }

  // 3. Apply fairness adjustments
  if (enableFairness) {
    const fairnessAdjuster = new FairnessAdjuster(fairnessConfig);
    const nodeLabels = new Map<string, string>();
    nodes.forEach(node => {
      if (node.label) {
        nodeLabels.set(node.id, node.label);
      }
    });
    finalScores = fairnessAdjuster.adjustForFairness(finalScores, nodeLabels.size > 0 ? nodeLabels : undefined);
  }

  // 4. Generate top ranked nodes
  const sortedNodes = Array.from(finalScores.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([node, score]) => ({ node, score }));

  return {
    scores: finalScores,
    topRanked: sortedNodes,
    metadata: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      timestamp: new Date().toISOString(),
      algorithm: useHybrid ? 'hybrid-temporal-pagerank' : 'temporal-pagerank'
    }
  };
}

/**
 * PageRank auditing tool to identify which edges most influence rankings
 */
export class PageRankAuditor {
  private nodes: GraphNode[];
  private edges: GraphEdge[];
  private originalScores: Map<string, number>;
  private edgeInfluence: Map<string, number> = new Map();

  constructor(
    nodes: GraphNode[],
    edges: GraphEdge[],
    originalScores: Map<string, number>
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.originalScores = originalScores;
  }

  /**
   * Compute influence score for each edge
   */
  computeEdgeInfluence(
    topK: number = 50,
    sampleSize?: number
  ): Map<string, number> {
    const edgesToTest = sampleSize && this.edges.length > sampleSize
      ? this.edges.slice(0, sampleSize)
      : this.edges;

    const influenceScores = new Map<string, number>();

    edgesToTest.forEach(edge => {
      // Temporarily remove edge
      const filteredEdges = this.edges.filter(
        e => !(e.source === edge.source && e.target === edge.target)
      );

      // Recompute PageRank
      const temporalPR = new TemporalPageRank();
      const newScores = temporalPR.compute(this.nodes, filteredEdges);

      // Calculate influence as change in target node's score
      const originalScore = this.originalScores.get(edge.target) || 0.0;
      const newScore = newScores.get(edge.target) || 0.0;
      const influence = Math.abs(originalScore - newScore);

      const edgeKey = `${edge.source}->${edge.target}`;
      influenceScores.set(edgeKey, influence);
    });

    // Sort by influence and keep top K
    const sorted = Array.from(influenceScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, topK);

    this.edgeInfluence = new Map(sorted);
    return this.edgeInfluence;
  }

  /**
   * Generate explainability report for a node's ranking
   */
  generateExplanation(
    nodeId: string,
    topKEdges: number = 5
  ): {
    node: string;
    originalScore: number;
    topInfluencingEdges: Array<{ source: string; target: string; influence: number }>;
    incomingInfluence: number;
    outgoingInfluence: number;
    sensitivityScore: number;
  } {
    if (this.edgeInfluence.size === 0) {
      this.computeEdgeInfluence();
    }

    // Find edges affecting this node
    const affectingEdges = Array.from(this.edgeInfluence.entries())
      .filter(([edgeKey]) => {
        const [source, target] = edgeKey.split('->');
        return target === nodeId || source === nodeId;
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, topKEdges)
      .map(([edgeKey, influence]) => {
        const [source, target] = edgeKey.split('->');
        return { source, target, influence };
      });

    const incomingInfluence = affectingEdges
      .filter(e => e.target === nodeId)
      .reduce((sum, e) => sum + e.influence, 0);

    const outgoingInfluence = affectingEdges
      .filter(e => e.source === nodeId)
      .reduce((sum, e) => sum + e.influence, 0);

    return {
      node: nodeId,
      originalScore: this.originalScores.get(nodeId) || 0.0,
      topInfluencingEdges: affectingEdges,
      incomingInfluence,
      outgoingInfluence,
      sensitivityScore: incomingInfluence + outgoingInfluence
    };
  }

  /**
   * Detect nodes whose rankings are highly sensitive to edge changes
   */
  detectSensitiveNodes(threshold: number = 0.01): Array<{ node: string; sensitivity: number }> {
    if (this.edgeInfluence.size === 0) {
      this.computeEdgeInfluence();
    }

    const nodeSensitivity = new Map<string, number>();

    this.edgeInfluence.forEach((influence, edgeKey) => {
      if (influence >= threshold) {
        const [source, target] = edgeKey.split('->');
        
        // Target node is more affected
        nodeSensitivity.set(target, (nodeSensitivity.get(target) || 0) + influence);
        // Source node is less affected
        nodeSensitivity.set(source, (nodeSensitivity.get(source) || 0) + influence * 0.5);
      }
    });

    return Array.from(nodeSensitivity.entries())
      .map(([node, sensitivity]) => ({ node, sensitivity }))
      .sort((a, b) => b.sensitivity - a.sensitivity);
  }
}

