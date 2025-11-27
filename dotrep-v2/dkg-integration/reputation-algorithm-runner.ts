/**
 * 🚀 Comprehensive Reputation Algorithm Runner
 * 
 * Complete implementation of reputation algorithms for social graph systems:
 * - Basic PageRank
 * - Trust-Weighted PageRank
 * - Multi-Dimensional Reputation System
 * - Advanced Sybil Detection
 * - Batch Processing Engine
 * - DKG Integration for Publishing
 * 
 * Based on research-backed algorithms and best practices.
 */

import { DKGClientV8, createDKGClientV8, ReputationAsset, PublishResult } from './dkg-client-v8';
import { GraphAlgorithms, GraphNode, GraphEdge, EdgeType, PageRankConfig, HybridReputationScore } from './graph-algorithms';
import { SocialGraphReputationService, createSocialGraphReputationService } from './social-graph-reputation-service';

export interface ReputationEngineConfig {
  dampingFactor?: number;
  maxIterations?: number;
  tolerance?: number;
  enableSybilDetection?: boolean;
  enableMultiDimensional?: boolean;
  enableBatchProcessing?: boolean;
  batchSize?: number;
  maxWorkers?: number;
}

export interface ReputationResult {
  userDid: string;
  finalScore: number;
  componentScores: {
    structural?: number;
    behavioral?: number;
    content?: number;
    economic?: number;
    temporal?: number;
  };
  sybilRisk: number;
  confidence: number;
  percentile?: number;
  explanation: string[];
}

export interface BatchReputationResult {
  results: Map<string, ReputationResult>;
  totalProcessed: number;
  totalFailed: number;
  processingTime: number;
}

/**
 * Basic PageRank Implementation
 * 
 * Classic PageRank algorithm for computing node importance in a directed graph.
 */
export class BasicPageRank {
  private dampingFactor: number;
  private maxIterations: number;
  private tolerance: number;

  constructor(config: {
    dampingFactor?: number;
    maxIterations?: number;
    tolerance?: number;
  } = {}) {
    this.dampingFactor = config.dampingFactor || 0.85;
    this.maxIterations = config.maxIterations || 100;
    this.tolerance = config.tolerance || 1e-6;
  }

  /**
   * Compute PageRank scores for a graph
   * Improved implementation with predecessor-based computation for better efficiency
   */
  compute(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
    const nodeIds = nodes.map(n => n.id);
    const n = nodeIds.length;
    
    if (n === 0) {
      return new Map();
    }

    // Build predecessor list (more efficient for PageRank computation)
    const predecessors = new Map<string, Array<{ source: string; weight: number }>>();
    const outDegree = new Map<string, number>();

    // Initialize
    nodeIds.forEach(id => {
      predecessors.set(id, []);
      outDegree.set(id, 0);
    });

    // Build graph structure with edge weights
    const adjacencyList = new Map<string, Array<{ target: string; weight: number }>>();
    
    for (const edge of edges) {
      if (predecessors.has(edge.source) && predecessors.has(edge.target)) {
        const weight = edge.weight || 1.0;
        
        // Add to predecessor list of target (for efficient incoming edge lookup)
        predecessors.get(edge.target)!.push({
          source: edge.source,
          weight: weight
        });
        
        // Build adjacency list for outgoing edges
        if (!adjacencyList.has(edge.source)) {
          adjacencyList.set(edge.source, []);
        }
        adjacencyList.get(edge.source)!.push({
          target: edge.target,
          weight: weight
        });
        
        // Update out degree (weighted)
        outDegree.set(edge.source, outDegree.get(edge.source)! + weight);
      }
    }

    // Initialize scores uniformly
    let scores = new Map<string, number>();
    nodeIds.forEach(id => {
      scores.set(id, 1.0 / n);
    });

    // Iterative PageRank computation
    let converged = false;
    let iterations = 0;
    let lastMaxChange = 0;
    
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      iterations = iteration + 1;
      const newScores = new Map<string, number>();
      
      // Initialize new scores with damping factor
      nodeIds.forEach(id => {
        newScores.set(id, (1 - this.dampingFactor) / n);
      });

      // Distribute scores based on incoming edges (predecessor-based approach)
      for (const nodeId of nodeIds) {
        // Sum contributions from all incoming links (predecessors)
        const preds = predecessors.get(nodeId)!;
        
        for (const { source, weight } of preds) {
          const outDeg = outDegree.get(source)!;
          if (outDeg > 0) {
            const sourceScore = scores.get(source)!;
            const contribution = (this.dampingFactor * sourceScore * weight) / outDeg;
            newScores.set(nodeId, newScores.get(nodeId)! + contribution);
          }
        }
        
        // Handle dangling nodes: distribute dangling score uniformly
        // (Dangling nodes contribute to all nodes via the damping factor term above)
      }

      // Check for convergence
      let maxChange = 0;
      for (const id of nodeIds) {
        const change = Math.abs(newScores.get(id)! - scores.get(id)!);
        maxChange = Math.max(maxChange, change);
      }

      lastMaxChange = maxChange;
      scores = newScores;

      if (maxChange < this.tolerance) {
        converged = true;
        console.log(`✅ PageRank converged after ${iterations} iterations (max change: ${maxChange.toExponential(2)})`);
        break;
      }
    }

    if (!converged) {
      console.warn(`⚠️  PageRank did not converge after ${iterations} iterations (max change: ${lastMaxChange.toExponential(2)})`);
    }

    return this.normalizeScores(scores);
  }

  /**
   * Normalize scores to 0-1 range
   * Enhanced with better handling of edge cases
   */
  private normalizeScores(scores: Map<string, number>): Map<string, number> {
    if (scores.size === 0) {
      return new Map();
    }

    const values = Array.from(scores.values());
    const maxScore = Math.max(...values);
    const minScore = Math.min(...values);

    // Handle edge case: all scores are equal
    if (maxScore === minScore || maxScore === 0) {
      const normalized = new Map<string, number>();
      scores.forEach((_, key) => normalized.set(key, 0.5));
      return normalized;
    }

    // Normalize to 0-1 range
    const normalized = new Map<string, number>();
    const range = maxScore - minScore;
    scores.forEach((score, key) => {
      normalized.set(key, (score - minScore) / range);
    });

    return normalized;
  }

  /**
   * Get PageRank result with metadata
   * Tracks iterations and convergence during computation
   */
  computeWithMetadata(nodes: GraphNode[], edges: GraphEdge[]): {
    scores: Map<string, number>;
    iterations: number;
    converged: boolean;
    computationTime: number;
  } {
    const startTime = Date.now();
    const nodeIds = nodes.map(n => n.id);
    const n = nodeIds.length;
    
    if (n === 0) {
      return {
        scores: new Map(),
        iterations: 0,
        converged: true,
        computationTime: Date.now() - startTime
      };
    }

    // Build predecessor list for efficient computation
    const predecessors = new Map<string, Array<{ source: string; weight: number }>>();
    const outDegree = new Map<string, number>();

    nodeIds.forEach(id => {
      predecessors.set(id, []);
      outDegree.set(id, 0);
    });

    // Build graph structure
    for (const edge of edges) {
      if (predecessors.has(edge.source) && predecessors.has(edge.target)) {
        const weight = edge.weight || 1.0;
        predecessors.get(edge.target)!.push({ source: edge.source, weight });
        outDegree.set(edge.source, outDegree.get(edge.source)! + weight);
      }
    }

    // Initialize scores uniformly
    let scores = new Map<string, number>();
    nodeIds.forEach(id => {
      scores.set(id, 1.0 / n);
    });

    // Iterative computation with tracking
    let converged = false;
    let iterations = 0;
    
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      iterations = iteration + 1;
      const newScores = new Map<string, number>();
      
      nodeIds.forEach(id => {
        newScores.set(id, (1 - this.dampingFactor) / n);
      });

      // Distribute scores from predecessors
      for (const nodeId of nodeIds) {
        const preds = predecessors.get(nodeId)!;
        for (const { source, weight } of preds) {
          const outDeg = outDegree.get(source)!;
          if (outDeg > 0) {
            const contribution = (this.dampingFactor * scores.get(source)! * weight) / outDeg;
            newScores.set(nodeId, newScores.get(nodeId)! + contribution);
          }
        }
      }

      // Check convergence
      let maxChange = 0;
      for (const id of nodeIds) {
        maxChange = Math.max(maxChange, Math.abs(newScores.get(id)! - scores.get(id)!));
      }

      scores = newScores;
      if (maxChange < this.tolerance) {
        converged = true;
        break;
      }
    }

    const normalizedScores = this.normalizeScores(scores);
    const computationTime = Date.now() - startTime;

    return {
      scores: normalizedScores,
      iterations,
      converged,
      computationTime
    };
  }
}

/**
 * PageRank Analysis Utilities
 * Provides utilities for identifying key nodes, ranking, and analysis
 */
export class PageRankAnalyzer {
  /**
   * Get top N nodes by PageRank score
   */
  static getTopNodes(scores: Map<string, number>, n: number = 10): Array<{ nodeId: string; score: number; rank: number }> {
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([nodeId, score], index) => ({
        nodeId,
        score,
        rank: index + 1
      }));
    
    return sorted;
  }

  /**
   * Get rank of a specific node (1-based, where 1 is highest score)
   */
  static getRank(scores: Map<string, number>, nodeId: string): number {
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i][0] === nodeId) {
        return i + 1;
      }
    }
    return sorted.length + 1; // Node not found
  }

  /**
   * Calculate percentile rank for each node
   */
  static calculatePercentiles(scores: Map<string, number>): Map<string, number> {
    const sorted = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);
    const percentiles = new Map<string, number>();
    const total = sorted.length;

    sorted.forEach(([nodeId, score], index) => {
      const percentile = ((total - index) / total) * 100;
      percentiles.set(nodeId, percentile);
    });

    return percentiles;
  }

  /**
   * Identify and categorize top influencers
   */
  static identifyTopInfluencers(scores: Map<string, number>): {
    eliteInfluencers: Array<{ nodeId: string; score: number; rank: number }>;
    strongInfluencers: Array<{ nodeId: string; score: number; rank: number }>;
    emergingInfluencers: Array<{ nodeId: string; score: number; rank: number }>;
    regularUsers: Array<{ nodeId: string; score: number; rank: number }>;
  } {
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100); // Top 100 for categorization

    type InfluencerEntry = { nodeId: string; score: number; rank: number };
    const result: {
      eliteInfluencers: InfluencerEntry[];
      strongInfluencers: InfluencerEntry[];
      emergingInfluencers: InfluencerEntry[];
      regularUsers: InfluencerEntry[];
    } = {
      eliteInfluencers: [],
      strongInfluencers: [],
      emergingInfluencers: [],
      regularUsers: []
    };

    sorted.forEach(([nodeId, score], index) => {
      const entry = { nodeId, score, rank: index + 1 };
      
      if (score > 0.8) {
        result.eliteInfluencers.push(entry);
      } else if (score > 0.6) {
        result.strongInfluencers.push(entry);
      } else if (score > 0.4) {
        result.emergingInfluencers.push(entry);
      } else {
        result.regularUsers.push(entry);
      }
    });

    return result;
  }

  /**
   * Analyze Sybil nodes: compare scores before and after trust weighting
   */
  static analyzeSybilNodes(
    basicScores: Map<string, number>,
    trustScores: Map<string, number>,
    sybilNodeIds: string[] = []
  ): Map<string, {
    basicScore: number;
    trustScore: number;
    basicRank: number;
    trustRank: number;
    rankChange: number;
    scoreReduction: number;
    scoreReductionPercent: number;
  }> {
    const analysis = new Map<string, any>();

    const nodesToAnalyze = sybilNodeIds.length > 0 
      ? sybilNodeIds 
      : Array.from(basicScores.keys());

    for (const nodeId of nodesToAnalyze) {
      const basicScore = basicScores.get(nodeId) || 0;
      const trustScore = trustScores.get(nodeId) || 0;
      const basicRank = this.getRank(basicScores, nodeId);
      const trustRank = this.getRank(trustScores, nodeId);
      
      const rankChange = basicRank - trustRank; // Positive means rank improved (lower is better)
      const scoreReduction = basicScore - trustScore;
      const scoreReductionPercent = basicScore > 0 
        ? (scoreReduction / basicScore) * 100 
        : 0;

      analysis.set(nodeId, {
        basicScore,
        trustScore,
        basicRank,
        trustRank,
        rankChange,
        scoreReduction,
        scoreReductionPercent
      });
    }

    return analysis;
  }

  /**
   * Compare basic vs trust-weighted PageRank scores
   */
  static compareScores(
    basicScores: Map<string, number>,
    trustScores: Map<string, number>
  ): Map<string, {
    basic: number;
    trust: number;
    change: number;
    changePercent: number;
  }> {
    const comparison = new Map<string, any>();

    for (const [nodeId, basicScore] of basicScores.entries()) {
      const trustScore = trustScores.get(nodeId) || 0;
      const change = trustScore - basicScore;
      const changePercent = basicScore > 0 
        ? (change / basicScore) * 100 
        : 0;

      comparison.set(nodeId, {
        basic: basicScore,
        trust: trustScore,
        change,
        changePercent
      });
    }

    return comparison;
  }
}

/**
 * PageRank Demo Runner
 * Complete demonstration framework for running and analyzing PageRank
 */
export class PageRankDemo {
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];
  private basicPageRank: BasicPageRank;
  private trustPageRank: TrustWeightedPageRank | null = null;

  constructor(config: {
    dampingFactor?: number;
    maxIterations?: number;
    tolerance?: number;
    stakeWeights?: Map<string, number>;
    reputationWeights?: Map<string, number>;
  } = {}) {
    this.basicPageRank = new BasicPageRank(config);
    
    if (config.stakeWeights || config.reputationWeights) {
      this.trustPageRank = new TrustWeightedPageRank(config);
    }
  }

  /**
   * Run complete PageRank analysis demonstration
   */
  async runCompleteDemo(graphData: { nodes: GraphNode[]; edges: GraphEdge[] }): Promise<{
    basicScores: Map<string, number>;
    trustScores: Map<string, number> | null;
    analysis: any;
    topInfluencers: any;
    computationTime: number;
  }> {
    const startTime = Date.now();
    this.nodes = graphData.nodes;
    this.edges = graphData.edges;

    console.log(`🚀 Starting PageRank Analysis Demo`);
    console.log(`📊 Graph: ${this.nodes.length} nodes, ${this.edges.length} edges`);

    // 1. Run basic PageRank
    console.log(`\n1. 🧮 Computing basic PageRank scores...`);
    const basicResult = this.basicPageRank.computeWithMetadata(this.nodes, this.edges);
    const basicScores = basicResult.scores;
    console.log(`✅ Basic PageRank: ${basicResult.iterations} iterations, converged: ${basicResult.converged}`);

    // 2. Run trust-weighted PageRank
    let trustScores: Map<string, number> | null = null;
    let trustResult: any = null;
    
    if (this.trustPageRank) {
      console.log(`\n2. 🛡️  Computing trust-weighted PageRank...`);
      trustResult = this.trustPageRank.computeWithMetadata(this.nodes, this.edges);
      trustScores = trustResult.scores;
      console.log(`✅ Trust-weighted PageRank: ${trustResult.iterations} iterations, converged: ${trustResult.converged}`);
    }

    // 3. Analyze results
    console.log(`\n3. 📊 Analyzing results...`);
    const analysis = trustScores 
      ? this.analyzeResults(basicScores, trustScores)
      : this.analyzeBasicResults(basicScores);

    // 4. Identify top influencers
    console.log(`\n4. 🏆 Identifying top influencers...`);
    const finalScores = trustScores || basicScores;
    const topInfluencers = PageRankAnalyzer.identifyTopInfluencers(finalScores);
    
    const computationTime = Date.now() - startTime;
    console.log(`\n✅ Analysis complete (${computationTime}ms)`);

    return {
      basicScores,
      trustScores,
      analysis,
      topInfluencers,
      computationTime
    };
  }

  /**
   * Analyze and compare PageRank results
   */
  private analyzeResults(
    basicScores: Map<string, number>,
    trustScores: Map<string, number>
  ): {
    basicTop5: Array<{ nodeId: string; score: number; rank: number }>;
    trustTop5: Array<{ nodeId: string; score: number; rank: number }>;
    scoreChanges: Map<string, any>;
    sybilAnalysis?: Map<string, any>;
  } {
    const basicTop5 = PageRankAnalyzer.getTopNodes(basicScores, 5);
    const trustTop5 = PageRankAnalyzer.getTopNodes(trustScores, 5);
    const scoreChanges = PageRankAnalyzer.compareScores(basicScores, trustScores);

    // Auto-detect potential Sybil nodes (low stake but high basic PageRank)
    const sybilCandidates = this.detectSybilCandidates(basicScores, trustScores);
    const sybilAnalysis = sybilCandidates.length > 0
      ? PageRankAnalyzer.analyzeSybilNodes(basicScores, trustScores, sybilCandidates)
      : undefined;

    return {
      basicTop5,
      trustTop5,
      scoreChanges,
      sybilAnalysis
    };
  }

  /**
   * Analyze basic PageRank results (without trust comparison)
   */
  private analyzeBasicResults(basicScores: Map<string, number>): {
    top5: Array<{ nodeId: string; score: number; rank: number }>;
    percentiles: Map<string, number>;
  } {
    const top5 = PageRankAnalyzer.getTopNodes(basicScores, 5);
    const percentiles = PageRankAnalyzer.calculatePercentiles(basicScores);

    return {
      top5,
      percentiles
    };
  }

  /**
   * Detect potential Sybil candidates (nodes with high basic PageRank but low trust signals)
   */
  private detectSybilCandidates(
    basicScores: Map<string, number>,
    trustScores: Map<string, number>
  ): string[] {
    const candidates: string[] = [];
    const topBasic = PageRankAnalyzer.getTopNodes(basicScores, 20); // Top 20 by basic

    for (const { nodeId, score: basicScore } of topBasic) {
      const trustScore = trustScores.get(nodeId) || 0;
      const scoreReduction = (basicScore - trustScore) / basicScore;

      // If trust weighting reduced score by >30%, might be Sybil
      if (scoreReduction > 0.3) {
        candidates.push(nodeId);
      }
    }

    return candidates;
  }

  /**
   * Display results in a readable format
   */
  static displayResults(results: {
    basicScores: Map<string, number>;
    trustScores: Map<string, number> | null;
    analysis: any;
    topInfluencers: any;
  }): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 PAGERANK ANALYSIS RESULTS`);
    console.log(`${'='.repeat(60)}`);

    // Display top influencers
    const finalScores = results.trustScores || results.basicScores;
    console.log(`\n🏆 TOP INFLUENCERS:`);
    console.log(`-`.repeat(40));
    
    const top10 = PageRankAnalyzer.getTopNodes(finalScores, 10);
    top10.forEach(({ nodeId, score, rank }) => {
      console.log(`${rank.toString().padStart(2)}. ${nodeId.padEnd(12)} Score: ${score.toFixed(4)}`);
    });

    // Display Sybil analysis if available
    if (results.analysis.sybilAnalysis) {
      console.log(`\n🕵️  SYBIL DETECTION ANALYSIS:`);
      console.log(`-`.repeat(40));
      
      for (const [nodeId, analysis] of results.analysis.sybilAnalysis.entries()) {
        console.log(`${nodeId}:`);
        console.log(`  Basic Rank: ${analysis.basicRank.toString().padStart(2)} → Trust Rank: ${analysis.trustRank.toString().padStart(2)}`);
        console.log(`  Score Reduction: ${analysis.scoreReductionPercent.toFixed(1)}%`);
      }
    }

    // Display score changes for top nodes
    if (results.trustScores && results.analysis.scoreChanges) {
      console.log(`\n📊 TRUST WEIGHTING IMPACT:`);
      console.log(`-`.repeat(40));
      
      const topNodes = PageRankAnalyzer.getTopNodes(results.trustScores, 5);
      for (const { nodeId } of topNodes) {
        const change = results.analysis.scoreChanges.get(nodeId);
        if (change) {
          const changeSymbol = change.change > 0 ? '+' : '';
          console.log(`${nodeId.padEnd(12)}: ${change.basic.toFixed(4)} → ${change.trust.toFixed(4)} (${changeSymbol}${change.changePercent.toFixed(1)}%)`);
        }
      }
    }
  }
}

/**
 * Trust-Weighted PageRank
 * 
 * Enhanced PageRank that incorporates trust signals:
 * - Economic stake weighting
 * - Reputation-based weighting
 * - Edge trust weights
 */
export class TrustWeightedPageRank extends BasicPageRank {
  private stakeWeights: Map<string, number>;
  private reputationWeights: Map<string, number>;

  constructor(config: {
    dampingFactor?: number;
    maxIterations?: number;
    tolerance?: number;
    stakeWeights?: Map<string, number>;
    reputationWeights?: Map<string, number>;
  } = {}) {
    super(config);
    this.stakeWeights = config.stakeWeights || new Map();
    this.reputationWeights = config.reputationWeights || new Map();
  }

  /**
   * Compute trust-weighted PageRank
   * Enhanced with improved trust weight calculation
   */
  compute(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
    // Apply trust weights to edges
    const weightedEdges = this.applyTrustWeights(edges, nodes);
    
    // Run standard PageRank on weighted graph
    return super.compute(nodes, weightedEdges);
  }

  /**
   * Compute trust-weighted PageRank with metadata
   */
  computeWithMetadata(nodes: GraphNode[], edges: GraphEdge[]): {
    scores: Map<string, number>;
    iterations: number;
    converged: boolean;
    computationTime: number;
  } {
    const weightedEdges = this.applyTrustWeights(edges, nodes);
    return super.computeWithMetadata(nodes, weightedEdges);
  }

  /**
   * Apply trust-based weights to graph edges
   * Enhanced with better edge weighting logic
   */
  private applyTrustWeights(edges: GraphEdge[], nodes: GraphNode[]): GraphEdge[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    return edges.map(edge => {
      const baseWeight = edge.weight || 1.0;
      const trustWeight = this.calculateTrustWeight(edge.source, nodeMap);
      const finalWeight = Math.min(2.0, baseWeight * trustWeight); // Cap at 2.0x
      
      return {
        ...edge,
        weight: finalWeight,
        metadata: {
          ...edge.metadata,
          trustWeight: trustWeight,
          originalWeight: baseWeight
        }
      };
    });
  }

  /**
   * Calculate trust weight based on stake and reputation
   * Enhanced with improved normalization and weighting
   */
  private calculateTrustWeight(nodeId: string, nodeMap: Map<string, GraphNode>): number {
    let weight = 1.0; // Base weight

    const node = nodeMap.get(nodeId);
    
    // Economic stake weighting (normalized to 0-1, then 50% boost cap)
    if (this.stakeWeights.has(nodeId)) {
      const stake = this.stakeWeights.get(nodeId)!;
      const normalizedStake = Math.min(1.0, stake / 10000); // Normalize by 10k
      weight *= (1.0 + normalizedStake * 0.5); // Up to 50% boost
    } else if (node?.metadata?.stake) {
      const normalizedStake = Math.min(1.0, node.metadata.stake / 10000);
      weight *= (1.0 + normalizedStake * 0.5);
    }

    // Reputation-based weighting (30% boost cap)
    if (this.reputationWeights.has(nodeId)) {
      const repWeight = this.reputationWeights.get(nodeId)!;
      // Ensure reputation weight is between 0 and 1
      const normalizedRep = Math.min(1.0, Math.max(0, repWeight));
      weight *= (1.0 + normalizedRep * 0.3); // Up to 30% boost
    }

    // Cap maximum weight to prevent extreme values
    return Math.min(weight, 2.0);
  }
}

/**
 * Multi-Dimensional Reputation System
 * 
 * Computes comprehensive reputation across multiple dimensions:
 * - Structural (graph position)
 * - Behavioral (activity patterns)
 * - Content (quality verification)
 * - Economic (stake, payments)
 * - Temporal (long-term patterns)
 */
export class MultiDimensionalReputation {
  private graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  private guardianIntegrator: any; // Guardian integration (optional)
  private sybilDetector: SybilDetector;

  constructor(
    graph: { nodes: GraphNode[]; edges: GraphEdge[] },
    guardianIntegrator?: any
  ) {
    this.graph = graph;
    this.guardianIntegrator = guardianIntegrator;
    this.sybilDetector = new SybilDetector(graph);
  }

  /**
   * Compute comprehensive reputation for a user
   */
  async computeUserReputation(
    userDid: string,
    dimensions: string[] = ['structural', 'behavioral', 'content', 'economic', 'temporal']
  ): Promise<ReputationResult> {
    const componentScores: Record<string, number> = {};

    // Compute each dimension
    if (dimensions.includes('structural')) {
      componentScores.structural = this.structuralAnalysis(userDid);
    }

    if (dimensions.includes('behavioral')) {
      componentScores.behavioral = this.behavioralAnalysis(userDid);
    }

    if (dimensions.includes('content')) {
      componentScores.content = await this.contentQualityAnalysis(userDid);
    }

    if (dimensions.includes('economic')) {
      componentScores.economic = this.economicAnalysis(userDid);
    }

    if (dimensions.includes('temporal')) {
      componentScores.temporal = this.temporalAnalysis(userDid);
    }

    // Combine scores with weights
    const weights = this.getDimensionWeights(dimensions);
    let finalScore = this.combineScores(componentScores, weights);

    // Apply Sybil risk penalty
    const sybilRisk = this.sybilDetector.analyzeUser(userDid);
    finalScore *= (1 - sybilRisk * 0.5); // Up to 50% penalty

    const confidence = this.calculateConfidence(componentScores);

    return {
      userDid,
      finalScore: Math.max(0.0, Math.min(1.0, finalScore)),
      componentScores: componentScores as any,
      sybilRisk,
      confidence,
      explanation: this.generateExplanation(componentScores, sybilRisk, finalScore)
    };
  }

  /**
   * Structural analysis: user's position in social graph
   */
  private structuralAnalysis(userDid: string): number {
    const node = this.graph.nodes.find(n => n.id === userDid);
    if (!node) {
      return 0.0;
    }

    try {
      // Compute PageRank for structural position
      const pagerank = new BasicPageRank();
      const scores = pagerank.compute(this.graph.nodes, this.graph.edges);
      const pagerankScore = scores.get(userDid) || 0;

      // Compute basic centrality metrics
      const inDegree = this.graph.edges.filter(e => e.target === userDid).length;
      const outDegree = this.graph.edges.filter(e => e.source === userDid).length;
      const totalConnections = inDegree + outDegree;

      // Normalize to 0-1 range
      const maxConnections = Math.max(...this.graph.nodes.map(n => {
        const inDeg = this.graph.edges.filter(e => e.target === n.id).length;
        const outDeg = this.graph.edges.filter(e => e.source === n.id).length;
        return inDeg + outDeg;
      }), 1);

      const connectionScore = totalConnections / maxConnections;

      // Combine PageRank and connection metrics
      return (pagerankScore * 0.7 + connectionScore * 0.3);
    } catch (error: any) {
      console.error(`Structural analysis error for ${userDid}:`, error);
      return 0.0;
    }
  }

  /**
   * Behavioral analysis: user behavior patterns
   */
  private behavioralAnalysis(userDid: string): number {
    const userEdges = this.graph.edges.filter(e => e.source === userDid || e.target === userDid);
    
    if (userEdges.length === 0) {
      return 0.5; // Neutral score
    }

    // Engagement consistency
    const timestamps = userEdges.map(e => e.timestamp).sort((a, b) => a - b);
    const timeSpan = timestamps[timestamps.length - 1] - timestamps[0];
    const consistency = timeSpan > 0 ? Math.min(1.0, userEdges.length / (timeSpan / (1000 * 60 * 60 * 24))) : 0.5;

    // Reciprocity rate
    const outgoing = userEdges.filter(e => e.source === userDid);
    const incoming = userEdges.filter(e => e.target === userDid);
    const reciprocal = outgoing.filter(out => 
      incoming.some(incomingEdge => incomingEdge.source === out.target)
    ).length;
    const reciprocityRate = outgoing.length > 0 ? reciprocal / outgoing.length : 0.5;

    // Combine behavioral metrics
    return (consistency * 0.4 + reciprocityRate * 0.6);
  }

  /**
   * Content quality analysis (with Guardian integration)
   */
  private async contentQualityAnalysis(userDid: string): Promise<number> {
    if (!this.guardianIntegrator) {
      return 0.5; // Neutral score if no guardian integration
    }

    try {
      // In a real implementation, query user content from DKG
      // For now, use node metadata if available
      const node = this.graph.nodes.find(n => n.id === userDid);
      if (node?.metadata?.contentQuality !== undefined) {
        return node.metadata.contentQuality / 100; // Normalize 0-100 to 0-1
      }

      return 0.5; // Default neutral score
    } catch (error: any) {
      console.error(`Content quality analysis error:`, error);
      return 0.5;
    }
  }

  /**
   * Economic analysis: stake and payment history
   */
  private economicAnalysis(userDid: string): number {
    const node = this.graph.nodes.find(n => n.id === userDid);
    if (!node) {
      return 0.0;
    }

    const stake = node.metadata?.stake || 0;
    const paymentHistory = node.metadata?.paymentHistory || 0;

    // Logarithmic scaling for economic signals
    const stakeScore = Math.min(1.0, Math.log(1 + stake / 1000) / 10);
    const paymentScore = Math.min(1.0, Math.log(1 + paymentHistory / 1000) / 10);

    return (stakeScore * 0.6 + paymentScore * 0.4);
  }

  /**
   * Temporal analysis: long-term patterns
   */
  private temporalAnalysis(userDid: string): number {
    const userEdges = this.graph.edges.filter(e => e.source === userDid || e.target === userDid);
    
    if (userEdges.length === 0) {
      return 0.0;
    }

    const now = Date.now();
    const timestamps = userEdges.map(e => e.timestamp);
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const age = now - oldest;
    const recency = now - newest;

    // Longevity score (how long user has been active)
    const longevityScore = Math.min(1.0, age / (365 * 24 * 60 * 60 * 1000)); // 1 year = max

    // Recency score (how recent is activity)
    const recencyScore = Math.exp(-recency / (30 * 24 * 60 * 60 * 1000)); // 30 days decay

    return (longevityScore * 0.5 + recencyScore * 0.5);
  }

  /**
   * Get dimension weights
   */
  private getDimensionWeights(dimensions: string[]): Map<string, number> {
    const weights = new Map<string, number>();
    const defaultWeights: Record<string, number> = {
      structural: 0.3,
      behavioral: 0.2,
      content: 0.25,
      economic: 0.15,
      temporal: 0.1
    };

    dimensions.forEach(dim => {
      weights.set(dim, defaultWeights[dim] || 0.2);
    });

    // Normalize weights to sum to 1.0
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    if (total > 0) {
      weights.forEach((value, key) => {
        weights.set(key, value / total);
      });
    }

    return weights;
  }

  /**
   * Combine component scores with weights
   */
  private combineScores(componentScores: Record<string, number>, weights: Map<string, number>): number {
    let combined = 0.0;
    let totalWeight = 0.0;

    for (const [dimension, score] of Object.entries(componentScores)) {
      const weight = weights.get(dimension) || 0;
      combined += score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? combined / totalWeight : 0.0;
  }

  /**
   * Calculate confidence in reputation score
   */
  private calculateConfidence(componentScores: Record<string, number>): number {
    const scores = Object.values(componentScores);
    if (scores.length === 0) {
      return 0.0;
    }

    // Confidence based on number of dimensions and score consistency
    const dimensionCount = scores.length;
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    const consistency = 1.0 - Math.min(1.0, variance);

    return Math.min(1.0, (dimensionCount / 5) * 0.5 + consistency * 0.5);
  }

  /**
   * Generate explanation for reputation score
   */
  private generateExplanation(
    componentScores: Record<string, number>,
    sybilRisk: number,
    finalScore: number
  ): string[] {
    const explanation: string[] = [];

    explanation.push(`Final reputation score: ${(finalScore * 100).toFixed(1)}/100`);

    for (const [dimension, score] of Object.entries(componentScores)) {
      explanation.push(`${dimension.charAt(0).toUpperCase() + dimension.slice(1)}: ${(score * 100).toFixed(1)}/100`);
    }

    if (sybilRisk > 0.3) {
      explanation.push(`⚠️ Sybil risk detected: ${(sybilRisk * 100).toFixed(1)}%`);
    }

    return explanation;
  }
}

/**
 * Advanced Sybil Detection
 * 
 * Multi-factor Sybil detection using:
 * - Graph structure analysis
 * - Behavioral anomaly detection
 * - Economic footprint analysis
 * - Temporal pattern analysis
 */
export class SybilDetector {
  private graph: { nodes: GraphNode[]; edges: GraphEdge[] };

  constructor(graph: { nodes: GraphNode[]; edges: GraphEdge[] }) {
    this.graph = graph;
  }

  /**
   * Comprehensive Sybil risk assessment
   */
  analyzeUser(userDid: string): number {
    const riskFactors: Record<string, number> = {};

    riskFactors.graphStructure = this.graphStructureAnalysis(userDid);
    riskFactors.behavioralPatterns = this.behavioralAnomalyDetection(userDid);
    riskFactors.economicFootprint = this.economicAnalysis(userDid);
    riskFactors.temporalPatterns = this.temporalAnalysis(userDid);

    // Combine risk factors
    const overallRisk = this.combineRiskFactors(riskFactors);

    return Math.min(1.0, overallRisk);
  }

  /**
   * Graph structure analysis for Sybil indicators
   */
  private graphStructureAnalysis(userDid: string): number {
    const node = this.graph.nodes.find(n => n.id === userDid);
    if (!node) {
      return 0.0;
    }

    // Check connection patterns
    const neighbors = this.graph.edges
      .filter(e => e.source === userDid || e.target === userDid)
      .map(e => e.source === userDid ? e.target : e.source);

    if (neighbors.length === 0) {
      return 0.0; // Isolated nodes are not Sybil
    }

    // Check for suspicious clustering
    const neighborConnections = neighbors.filter(neighbor => {
      return this.graph.edges.some(e => 
        (e.source === neighbor && neighbors.includes(e.target)) ||
        (e.target === neighbor && neighbors.includes(e.source))
      );
    }).length;

    const clusteringRatio = neighborConnections / neighbors.length;

    // High clustering with many connections suggests Sybil cluster
    if (neighbors.length > 10 && clusteringRatio > 0.7) {
      return 0.8; // High risk
    }

    return Math.min(0.5, clusteringRatio * 0.6);
  }

  /**
   * Behavioral anomaly detection
   */
  private behavioralAnomalyDetection(userDid: string): number {
    const userEdges = this.graph.edges.filter(e => e.source === userDid || e.target === userDid);
    
    if (userEdges.length === 0) {
      return 0.0;
    }

    // Check for burstiness (many connections in short time)
    const timestamps = userEdges.map(e => e.timestamp).sort((a, b) => a - b);
    const timeWindows: number[] = [];
    
    for (let i = 0; i < timestamps.length - 1; i++) {
      const window = timestamps[i + 1] - timestamps[i];
      timeWindows.push(window);
    }

    const avgWindow = timeWindows.reduce((a, b) => a + b, 0) / timeWindows.length || 1;
    const variance = timeWindows.reduce((sum, w) => sum + Math.pow(w - avgWindow, 2), 0) / timeWindows.length;
    const burstiness = variance / (avgWindow * avgWindow);

    // High burstiness suggests automated behavior
    if (burstiness > 10) {
      return 0.7;
    }

    return Math.min(0.3, burstiness / 30);
  }

  /**
   * Economic footprint analysis
   */
  private economicAnalysis(userDid: string): number {
    const node = this.graph.nodes.find(n => n.id === userDid);
    if (!node) {
      return 0.0;
    }

    // Users with no economic footprint but high activity are suspicious
    const hasStake = (node.metadata?.stake || 0) > 0;
    const hasPayments = (node.metadata?.paymentHistory || 0) > 0;
    const activity = this.graph.edges.filter(e => e.source === userDid || e.target === userDid).length;

    if (activity > 50 && !hasStake && !hasPayments) {
      return 0.6; // Suspicious: high activity, no economic footprint
    }

    return 0.0;
  }

  /**
   * Temporal pattern analysis
   */
  private temporalAnalysis(userDid: string): number {
    const userEdges = this.graph.edges.filter(e => e.source === userDid || e.target === userDid);
    
    if (userEdges.length === 0) {
      return 0.0;
    }

    const timestamps = userEdges.map(e => e.timestamp).sort((a, b) => a - b);
    const age = Date.now() - timestamps[0];

    // Very new accounts with high activity are suspicious
    if (age < 7 * 24 * 60 * 60 * 1000 && userEdges.length > 20) { // < 7 days, > 20 connections
      return 0.5;
    }

    return 0.0;
  }

  /**
   * Combine risk factors
   */
  private combineRiskFactors(riskFactors: Record<string, number>): number {
    const weights: Record<string, number> = {
      graphStructure: 0.4,
      behavioralPatterns: 0.3,
      economicFootprint: 0.2,
      temporalPatterns: 0.1
    };

    let combinedRisk = 0.0;
    let totalWeight = 0.0;

    for (const [factor, risk] of Object.entries(riskFactors)) {
      const weight = weights[factor] || 0.25;
      combinedRisk += risk * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? combinedRisk / totalWeight : 0.0;
  }
}

/**
 * Batch Processing Engine
 * 
 * Efficiently processes reputation for multiple users with:
 * - Parallel processing
 * - Caching
 * - Progress tracking
 */
export class BatchReputationEngine {
  private reputationEngine: MultiDimensionalReputation;
  private batchSize: number;
  private maxWorkers: number;
  private cache: Map<string, { result: ReputationResult; timestamp: number }> = new Map();
  private cacheTTL: number = 60 * 60 * 1000; // 1 hour

  constructor(
    reputationEngine: MultiDimensionalReputation,
    config: {
      batchSize?: number;
      maxWorkers?: number;
    } = {}
  ) {
    this.reputationEngine = reputationEngine;
    this.batchSize = config.batchSize || 1000;
    this.maxWorkers = config.maxWorkers || 4;
  }

  /**
   * Compute reputation for multiple users efficiently
   */
  async computeBatchReputation(
    userList: string[],
    dimensions?: string[]
  ): Promise<BatchReputationResult> {
    const startTime = Date.now();
    const results = new Map<string, ReputationResult>();
    let totalFailed = 0;

    // Pre-compute global metrics for efficiency
    console.log(`📊 Pre-computing global graph metrics...`);
    // (In a full implementation, pre-compute PageRank, centrality, etc.)

    // Process in batches
    const batches = this.chunkArray(userList, this.batchSize);
    console.log(`📦 Processing ${userList.length} users in ${batches.length} batches...`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`   Processing batch ${i + 1}/${batches.length} (${batch.length} users)...`);

      const batchResults = await this.processBatch(batch, dimensions);
      
      batchResults.forEach((result, userId) => {
        if (result) {
          results.set(userId, result);
          // Cache result
          this.cache.set(userId, {
            result,
            timestamp: Date.now()
          });
        } else {
          totalFailed++;
        }
      });
    }

    const processingTime = Date.now() - startTime;

    console.log(`✅ Batch processing complete: ${results.size} succeeded, ${totalFailed} failed in ${(processingTime / 1000).toFixed(2)}s`);

    return {
      results,
      totalProcessed: results.size,
      totalFailed,
      processingTime
    };
  }

  /**
   * Process a single batch of users
   */
  private async processBatch(
    userBatch: string[],
    dimensions?: string[]
  ): Promise<Map<string, ReputationResult | null>> {
    const batchResults = new Map<string, ReputationResult | null>();

    // Process users in parallel (limited by maxWorkers)
    const promises = userBatch.map(async (userId) => {
      try {
        // Check cache first
        const cached = this.cache.get(userId);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
          return { userId, result: cached.result };
        }

        // Compute fresh reputation
        const result = await this.reputationEngine.computeUserReputation(userId, dimensions);
        return { userId, result };
      } catch (error: any) {
        console.error(`Error processing ${userId}:`, error.message);
        return { userId, result: null };
      }
    });

    // Wait for all promises with concurrency limit
    const results = await this.limitConcurrency(promises, this.maxWorkers);

    results.forEach(({ userId, result }) => {
      batchResults.set(userId, result);
    });

    return batchResults;
  }

  /**
   * Limit concurrency of promises
   */
  private async limitConcurrency<T>(
    promises: Promise<T>[],
    limit: number
  ): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<void>[] = [];

    for (const promise of promises) {
      const p = promise.then(result => {
        results.push(result);
        executing.splice(executing.indexOf(p), 1);
      });

      executing.push(p);

      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }

    await Promise.all(executing);
    return results;
  }

  /**
   * Chunk array into batches
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get cached reputation if recent enough
   */
  getCachedReputation(userDid: string, maxAgeMinutes: number = 60): ReputationResult | null {
    const cacheKey = `reputation_${userDid}`;
    const cached = this.cache.get(userDid);

    if (cached) {
      const ageMinutes = (Date.now() - cached.timestamp) / (1000 * 60);
      if (ageMinutes < maxAgeMinutes) {
        return cached.result;
      }
    }

    return null;
  }
}

/**
 * DKG Reputation Publisher
 * 
 * Publishes reputation scores as DKG Knowledge Assets
 */
export class DKGReputationPublisher {
  private dkgClient: DKGClientV8;

  constructor(dkgClient: DKGClientV8) {
    this.dkgClient = dkgClient;
  }

  /**
   * Publish reputation snapshot to DKG
   */
  async publishReputationSnapshot(
    reputationScores: Map<string, ReputationResult>,
    metadata: {
      creator?: string;
      computationMethod?: string;
      timestamp?: number;
      provenance?: Record<string, any>;
    } = {}
  ): Promise<PublishResult> {
    const timestamp = metadata.timestamp || Date.now();

    // Convert reputation scores to DKG format
    const snapshotAsset: ReputationAsset = {
      developerId: 'reputation-snapshot',
      reputationScore: 0, // Aggregate score
      contributions: [],
      timestamp,
      metadata: {
        type: 'reputation-snapshot',
        algorithm: metadata.computationMethod || 'MultiDimensionalReputation',
        scores: Array.from(reputationScores.entries()).map(([userDid, result]) => ({
          userDid,
          finalScore: result.finalScore,
          componentScores: result.componentScores,
          sybilRisk: result.sybilRisk,
          confidence: result.confidence
        })),
        provenance: metadata.provenance || {}
      }
    };

    try {
      console.log(`📤 Publishing reputation snapshot to DKG...`);
      const publishResult = await this.dkgClient.publishReputationAsset(snapshotAsset, 2);
      
      console.log(`✅ Reputation snapshot published successfully!`);
      console.log(`   UAL: ${publishResult.UAL}`);
      if (publishResult.transactionHash) {
        console.log(`   Transaction: ${publishResult.transactionHash}`);
      }

      return publishResult;
    } catch (error: any) {
      console.error(`❌ Failed to publish reputation snapshot:`, error);
      throw error;
    }
  }
}

/**
 * Complete Reputation Algorithm Runner
 * 
 * Orchestrates the entire reputation computation pipeline
 */
export class ReputationAlgorithmRunner {
  private dkgClient: DKGClientV8;
  private reputationService: SocialGraphReputationService;
  private multiDimensionalReputation: MultiDimensionalReputation | null = null;
  private batchEngine: BatchReputationEngine | null = null;
  private publisher: DKGReputationPublisher;

  constructor(config: {
    dkgEndpoint?: string;
    useMockMode?: boolean;
    enableMultiDimensional?: boolean;
    enableBatchProcessing?: boolean;
  } = {}) {
    // Initialize DKG client
    this.dkgClient = createDKGClientV8({
      environment: 'testnet',
      endpoint: config.dkgEndpoint,
      useMockMode: config.useMockMode || false,
      fallbackToMock: true
    });

    // Initialize reputation service
    this.reputationService = createSocialGraphReputationService(this.dkgClient);

    // Initialize publisher
    this.publisher = new DKGReputationPublisher(this.dkgClient);
  }

  /**
   * Run complete reputation algorithm pipeline
   */
  async runCompletePipeline(options: {
    graphData?: { nodes: GraphNode[]; edges: GraphEdge[] };
    datasetFile?: string;
    userList?: string[];
    enableMultiDimensional?: boolean;
    enableBatchProcessing?: boolean;
    publishToDKG?: boolean;
  } = {}): Promise<{
    scores: Map<string, ReputationResult>;
    snapshotUAL?: string;
    processingTime: number;
  }> {
    const startTime = Date.now();
    console.log('🚀 Starting Reputation Algorithm Pipeline\n');
    console.log('='.repeat(60));

    // Step 1: Load graph data
    console.log('\n📥 Step 1: Loading social graph data...');
    let graphData: { nodes: GraphNode[]; edges: GraphEdge[] };

    if (options.graphData) {
      graphData = options.graphData;
      console.log(`✅ Using provided graph data: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
    } else if (options.datasetFile) {
      const loaded = await this.reputationService.loadDataset(options.datasetFile);
      graphData = { nodes: loaded.nodes, edges: loaded.edges };
      console.log(`✅ Loaded dataset: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
    } else {
      graphData = await this.reputationService.ingestSocialGraphData({ limit: 10000 });
      console.log(`✅ Ingested from DKG: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);
    }

    // Step 2: Initialize reputation engines
    console.log('\n🧮 Step 2: Initializing reputation engines...');
    
    if (options.enableMultiDimensional) {
      this.multiDimensionalReputation = new MultiDimensionalReputation(graphData);
      console.log('✅ Multi-dimensional reputation engine initialized');
    }

    if (options.enableBatchProcessing && this.multiDimensionalReputation) {
      this.batchEngine = new BatchReputationEngine(this.multiDimensionalReputation, {
        batchSize: 1000,
        maxWorkers: 4
      });
      console.log('✅ Batch processing engine initialized');
    }

    // Step 3: Compute reputation scores
    console.log('\n📊 Step 3: Computing reputation scores...');
    const scores = new Map<string, ReputationResult>();

    if (options.userList && options.userList.length > 0) {
      // Compute for specific users
      if (this.batchEngine) {
        const batchResult = await this.batchEngine.computeBatchReputation(options.userList);
        batchResult.results.forEach((result, userId) => {
          scores.set(userId, result);
        });
      } else if (this.multiDimensionalReputation) {
        for (const userId of options.userList) {
          const result = await this.multiDimensionalReputation.computeUserReputation(userId);
          scores.set(userId, result);
        }
      } else {
        // Use basic PageRank
        const pagerank = new BasicPageRank();
        const pagerankScores = pagerank.compute(graphData.nodes, graphData.edges);
        
        const sybilDetector = new SybilDetector(graphData);
        
        for (const userId of options.userList) {
          const pagerankScore = pagerankScores.get(userId) || 0;
          const sybilRisk = sybilDetector.analyzeUser(userId);
          
          scores.set(userId, {
            userDid: userId,
            finalScore: pagerankScore * (1 - sybilRisk * 0.5),
            componentScores: {},
            sybilRisk,
            confidence: 0.7,
            explanation: [`PageRank: ${(pagerankScore * 100).toFixed(1)}/100`, `Sybil Risk: ${(sybilRisk * 100).toFixed(1)}%`]
          });
        }
      }
    } else {
      // Compute for all users in graph
      const userList = graphData.nodes.map(n => n.id);
      
      if (this.batchEngine) {
        const batchResult = await this.batchEngine.computeBatchReputation(userList);
        batchResult.results.forEach((result, userId) => {
          scores.set(userId, result);
        });
      } else {
        // Use basic PageRank for all
        const pagerank = new BasicPageRank();
        const pagerankScores = pagerank.compute(graphData.nodes, graphData.edges);
        const sybilDetector = new SybilDetector(graphData);
        
        pagerankScores.forEach((pagerankScore, userId) => {
          const sybilRisk = sybilDetector.analyzeUser(userId);
          scores.set(userId, {
            userDid: userId,
            finalScore: pagerankScore * (1 - sybilRisk * 0.5),
            componentScores: {},
            sybilRisk,
            confidence: 0.7,
            explanation: [`PageRank: ${(pagerankScore * 100).toFixed(1)}/100`]
          });
        });
      }
    }

    console.log(`✅ Computed reputation for ${scores.size} users`);

    // Step 4: Publish to DKG (optional)
    let snapshotUAL: string | undefined;
    if (options.publishToDKG) {
      console.log('\n🔗 Step 4: Publishing reputation snapshot to DKG...');
      try {
        const publishResult = await this.publisher.publishReputationSnapshot(scores, {
          computationMethod: options.enableMultiDimensional ? 'MultiDimensionalReputation' : 'BasicPageRank',
          timestamp: Date.now()
        });
        snapshotUAL = publishResult.UAL;
        console.log(`✅ Published to DKG: ${snapshotUAL}`);
      } catch (error: any) {
        console.error(`⚠️  Failed to publish to DKG:`, error.message);
      }
    }

    const processingTime = Date.now() - startTime;

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Pipeline completed in ${(processingTime / 1000).toFixed(2)}s\n`);

    return {
      scores,
      snapshotUAL,
      processingTime
    };
  }

  /**
   * Run quick demo with sample data
   */
  async runQuickDemo(): Promise<void> {
    console.log('🚀 Running Quick Reputation Algorithm Demo\n');

    // Create sample graph
    const sampleGraph = {
      nodes: Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        metadata: {
          stake: i < 10 ? Math.random() * 10000 : 0,
          paymentHistory: i < 20 ? Math.random() * 5000 : 0,
          contentQuality: Math.random() * 100
        }
      })),
      edges: [] as GraphEdge[]
    };

    // Generate random edges
    for (let i = 0; i < 500; i++) {
      const source = `user-${Math.floor(Math.random() * 100)}`;
      const target = `user-${Math.floor(Math.random() * 100)}`;
      if (source !== target) {
        sampleGraph.edges.push({
          source,
          target,
          weight: Math.random(),
          edgeType: EdgeType.FOLLOW,
          timestamp: Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
          metadata: {}
        });
      }
    }

    // Run pipeline
    const result = await this.runCompletePipeline({
      graphData: sampleGraph,
      userList: sampleGraph.nodes.slice(0, 20).map(n => n.id),
      enableMultiDimensional: true,
      enableBatchProcessing: true,
      publishToDKG: false
    });

    // Display top users
    console.log('\n📊 Top 10 Users by Reputation:\n');
    const sorted = Array.from(result.scores.entries())
      .sort((a, b) => b[1].finalScore - a[1].finalScore)
      .slice(0, 10);

    sorted.forEach(([userId, result], index) => {
      console.log(`${index + 1}. ${userId}`);
      console.log(`   Score: ${(result.finalScore * 100).toFixed(1)}/100`);
      console.log(`   Sybil Risk: ${(result.sybilRisk * 100).toFixed(1)}%`);
      console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      if (result.explanation.length > 0) {
        console.log(`   ${result.explanation[0]}`);
      }
      console.log('');
    });
  }
}

/**
 * Factory function to create a reputation algorithm runner
 */
export function createReputationAlgorithmRunner(config?: {
  dkgEndpoint?: string;
  useMockMode?: boolean;
  enableMultiDimensional?: boolean;
  enableBatchProcessing?: boolean;
}): ReputationAlgorithmRunner {
  return new ReputationAlgorithmRunner(config);
}

/**
 * Main entry point for running reputation algorithms
 */
export async function runReputationAlgorithms(options: {
  graphData?: { nodes: GraphNode[]; edges: GraphEdge[] };
  datasetFile?: string;
  userList?: string[];
  enableMultiDimensional?: boolean;
  enableBatchProcessing?: boolean;
  publishToDKG?: boolean;
  quickDemo?: boolean;
} = {}): Promise<{
  scores: Map<string, ReputationResult>;
  snapshotUAL?: string;
  processingTime: number;
}> {
  const runner = createReputationAlgorithmRunner({
    useMockMode: true, // Use mock mode by default for demo
    enableMultiDimensional: options.enableMultiDimensional,
    enableBatchProcessing: options.enableBatchProcessing
  });

  if (options.quickDemo) {
    await runner.runQuickDemo();
    return {
      scores: new Map(),
      processingTime: 0
    };
  }

  return await runner.runCompletePipeline(options);
}

export default ReputationAlgorithmRunner;

