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
   */
  compute(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
    const nodeIds = nodes.map(n => n.id);
    const n = nodeIds.length;
    
    if (n === 0) {
      return new Map();
    }

    // Build adjacency list
    const adjacencyList = new Map<string, string[]>();
    const outDegree = new Map<string, number>();

    nodeIds.forEach(id => {
      adjacencyList.set(id, []);
      outDegree.set(id, 0);
    });

    // Build graph structure
    for (const edge of edges) {
      if (adjacencyList.has(edge.source) && adjacencyList.has(edge.target)) {
        adjacencyList.get(edge.source)!.push(edge.target);
        outDegree.set(edge.source, outDegree.get(edge.source)! + 1);
      }
    }

    // Initialize scores uniformly
    let scores = new Map<string, number>();
    nodeIds.forEach(id => {
      scores.set(id, 1.0 / n);
    });

    // Iterative PageRank computation
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      const newScores = new Map<string, number>();
      let totalChange = 0;

      for (const nodeId of nodeIds) {
        let rankSum = 0;

        // Sum contributions from incoming links
        for (const [source, targets] of adjacencyList.entries()) {
          if (targets.includes(nodeId)) {
            const outDeg = outDegree.get(source)!;
            if (outDeg > 0) {
              rankSum += scores.get(source)! / outDeg;
            }
          }
        }

        // PageRank formula
        const newScore = (1 - this.dampingFactor) / n + this.dampingFactor * rankSum;
        newScores.set(nodeId, newScore);
        totalChange += Math.abs(newScore - scores.get(nodeId)!);
      }

      scores = newScores;

      // Check convergence
      if (totalChange < this.tolerance) {
        console.log(`✅ PageRank converged after ${iteration + 1} iterations`);
        break;
      }
    }

    return this.normalizeScores(scores);
  }

  /**
   * Normalize scores to 0-1 range
   */
  private normalizeScores(scores: Map<string, number>): Map<string, number> {
    const values = Array.from(scores.values());
    const maxScore = Math.max(...values);
    const minScore = Math.min(...values);

    if (maxScore === minScore) {
      const normalized = new Map<string, number>();
      scores.forEach((_, key) => normalized.set(key, 0.5));
      return normalized;
    }

    const normalized = new Map<string, number>();
    scores.forEach((score, key) => {
      normalized.set(key, (score - minScore) / (maxScore - minScore));
    });

    return normalized;
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
   */
  compute(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
    // Apply trust weights to edges
    const weightedEdges = this.applyTrustWeights(edges, nodes);
    
    // Run standard PageRank on weighted graph
    return super.compute(nodes, weightedEdges);
  }

  /**
   * Apply trust-based weights to graph edges
   */
  private applyTrustWeights(edges: GraphEdge[], nodes: GraphNode[]): GraphEdge[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    return edges.map(edge => {
      const baseWeight = edge.weight || 1.0;
      const trustWeight = this.calculateTrustWeight(edge.source, nodeMap);
      
      return {
        ...edge,
        weight: Math.min(2.0, baseWeight * trustWeight) // Cap at 2.0x
      };
    });
  }

  /**
   * Calculate trust weight based on stake and reputation
   */
  private calculateTrustWeight(nodeId: string, nodeMap: Map<string, GraphNode>): number {
    let weight = 1.0; // Base weight

    const node = nodeMap.get(nodeId);
    
    // Economic stake weighting
    if (this.stakeWeights.has(nodeId)) {
      const stakeWeight = Math.min(1.0, (this.stakeWeights.get(nodeId)! / 10000)); // Normalize
      weight *= (1.0 + stakeWeight * 0.5); // 50% boost for high stake
    } else if (node?.metadata?.stake) {
      const stakeWeight = Math.min(1.0, (node.metadata.stake / 10000));
      weight *= (1.0 + stakeWeight * 0.5);
    }

    // Reputation-based weighting
    if (this.reputationWeights.has(nodeId)) {
      const repWeight = this.reputationWeights.get(nodeId)!;
      weight *= (1.0 + repWeight * 0.3); // 30% boost for high reputation
    }

    return Math.min(weight, 2.0); // Cap maximum weight
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
      incoming.some(in => in.source === out.target)
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

