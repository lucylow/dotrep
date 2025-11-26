/**
 * Graph Reputation Service
 * 
 * Integrates advanced graph algorithms with DKG to compute and publish
 * reputation scores based on social graph structure, quality signals, stake, and payments.
 */

import { DKGClientV8 } from './dkg-client-v8';
import {
  GraphAlgorithms,
  GraphNode,
  GraphEdge,
  EdgeType,
  PageRankConfig,
  HybridReputationScore,
  SensitivityAuditResult,
  FairnessMetrics
} from './graph-algorithms';

export interface ReputationGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ReputationComputationOptions {
  useTemporalPageRank?: boolean;
  applyFairnessAdjustments?: boolean;
  fairnessAdjustmentStrength?: number;
  enableSensitivityAudit?: boolean;
  enableSybilDetection?: boolean;
  computeHybridScore?: boolean;
  hybridWeights?: {
    graph?: number;
    quality?: number;
    stake?: number;
    payment?: number;
  };
  pageRankConfig?: PageRankConfig;
}

export interface ReputationComputationResult {
  scores: Map<string, HybridReputationScore>;
  fairnessMetrics?: FairnessMetrics;
  sensitivityAudits?: Map<string, SensitivityAuditResult>;
  sybilProbabilities?: Map<string, number>;
  computationTime: number;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    algorithm: string;
    config: ReputationComputationOptions;
  };
}

/**
 * Graph Reputation Service
 * 
 * Computes reputation scores using advanced graph algorithms and publishes
 * results to the DKG as ReputationAssets.
 */
export class GraphReputationService {
  private dkgClient: DKGClientV8;

  constructor(dkgClient: DKGClientV8) {
    this.dkgClient = dkgClient;
  }

  /**
   * Compute reputation scores from graph data
   * 
   * @param graphData - Graph nodes and edges
   * @param options - Computation options
   * @returns Reputation computation results
   */
  async computeReputation(
    graphData: ReputationGraphData,
    options: ReputationComputationOptions = {}
  ): Promise<ReputationComputationResult> {
    const startTime = Date.now();

    const {
      useTemporalPageRank = true,
      applyFairnessAdjustments = true,
      fairnessAdjustmentStrength = 0.2,
      enableSensitivityAudit = false,
      enableSybilDetection = true,
      computeHybridScore = true,
      hybridWeights = {
        graph: 0.5,
        quality: 0.25,
        stake: 0.15,
        payment: 0.1
      },
      pageRankConfig = {}
    } = options;

    console.log(`🔍 Computing reputation for ${graphData.nodes.length} nodes and ${graphData.edges.length} edges`);

    // Step 1: Compute PageRank
    let pagerankScores: Map<string, number>;
    
    if (useTemporalPageRank) {
      console.log('📊 Computing Temporal Weighted PageRank...');
      const pagerankResult = GraphAlgorithms.computeTemporalWeightedPageRank(
        graphData.nodes,
        graphData.edges,
        pageRankConfig
      );
      pagerankScores = pagerankResult.scores;
      console.log(`✅ PageRank converged in ${pagerankResult.iterations} iterations (${pagerankResult.computationTime}ms)`);
    } else {
      // Fallback to basic PageRank (would need basic implementation)
      throw new Error('Basic PageRank not yet implemented. Use temporal PageRank.');
    }

    // Step 2: Apply fairness adjustments if enabled
    if (applyFairnessAdjustments) {
      console.log('⚖️  Applying fairness adjustments...');
      pagerankScores = GraphAlgorithms.applyFairnessAdjustments(
        pagerankScores,
        graphData.nodes,
        fairnessAdjustmentStrength
      );
    }

    // Step 3: Compute hybrid scores
    let finalScores: Map<string, HybridReputationScore>;
    
    if (computeHybridScore) {
      console.log('🔗 Computing hybrid reputation scores...');
      finalScores = GraphAlgorithms.computeHybridReputation(
        pagerankScores,
        graphData.nodes,
        hybridWeights
      );
    } else {
      // Convert PageRank scores to HybridReputationScore format
      finalScores = new Map();
      for (const [nodeId, score] of pagerankScores.entries()) {
        finalScores.set(nodeId, {
          nodeId,
          graphScore: score * 1000, // normalize
          qualityScore: 0,
          stakeScore: 0,
          paymentScore: 0,
          finalScore: score * 1000,
          percentile: 0,
          explanation: [`Graph score: ${(score * 1000).toFixed(1)}`]
        });
      }
    }

    // Step 4: Compute fairness metrics
    let fairnessMetrics: FairnessMetrics | undefined;
    if (applyFairnessAdjustments) {
      console.log('📈 Computing fairness metrics...');
      fairnessMetrics = GraphAlgorithms.computeFairnessMetrics(
        pagerankScores,
        graphData.nodes
      );
      console.log(`   Gini coefficient: ${fairnessMetrics.giniCoefficient.toFixed(3)}`);
      console.log(`   Minority representation: ${(fairnessMetrics.minorityRepresentation * 100).toFixed(1)}%`);
      console.log(`   Bias score: ${fairnessMetrics.biasScore.toFixed(3)}`);
    }

    // Step 5: Detect Sybil clusters
    let sybilProbabilities: Map<string, number> | undefined;
    if (enableSybilDetection) {
      console.log('🛡️  Detecting Sybil clusters...');
      sybilProbabilities = GraphAlgorithms.detectSybilClusters(
        graphData.nodes,
        graphData.edges,
        pagerankScores
      );
      const sybilCount = Array.from(sybilProbabilities.values()).filter(p => p > 0.5).length;
      console.log(`   Detected ${sybilCount} potential Sybil nodes`);
    }

    // Step 6: Sensitivity auditing (optional, can be expensive)
    let sensitivityAudits: Map<string, SensitivityAuditResult> | undefined;
    if (enableSensitivityAudit) {
      console.log('🔬 Performing sensitivity audits (this may take a while)...');
      sensitivityAudits = new Map();
      
      // Audit top 10 nodes by score
      const topNodes = Array.from(finalScores.entries())
        .sort((a, b) => b[1].finalScore - a[1].finalScore)
        .slice(0, 10)
        .map(([id]) => id);

      for (const nodeId of topNodes) {
        const audit = GraphAlgorithms.auditPageRankSensitivity(
          nodeId,
          graphData.nodes,
          graphData.edges,
          pagerankScores,
          pageRankConfig
        );
        sensitivityAudits.set(nodeId, audit);
      }
      console.log(`   Completed sensitivity audits for ${topNodes.length} nodes`);
    }

    const computationTime = Date.now() - startTime;

    console.log(`✅ Reputation computation complete (${computationTime}ms)`);

    return {
      scores: finalScores,
      fairnessMetrics,
      sensitivityAudits,
      sybilProbabilities,
      computationTime,
      metadata: {
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
        algorithm: useTemporalPageRank ? 'TemporalWeightedPageRank' : 'PageRank',
        config: options
      }
    };
  }

  /**
   * Publish reputation scores to DKG
   * 
   * @param results - Reputation computation results
   * @param options - Publishing options
   * @returns Array of publish results
   */
  async publishReputationScores(
    results: ReputationComputationResult,
    options: {
      batchSize?: number;
      epochs?: number;
      includeFairnessMetrics?: boolean;
      includeSensitivityAudit?: boolean;
    } = {}
  ): Promise<Array<{ nodeId: string; ual?: string; error?: string }>> {
    const {
      batchSize = 10,
      epochs = 2,
      includeFairnessMetrics = false,
      includeSensitivityAudit = false
    } = options;

    console.log(`📤 Publishing ${results.scores.size} reputation scores to DKG...`);

    const publishResults: Array<{ nodeId: string; ual?: string; error?: string }> = [];
    const scoresArray = Array.from(results.scores.entries());

    // Process in batches
    for (let i = 0; i < scoresArray.length; i += batchSize) {
      const batch = scoresArray.slice(i, i + batchSize);
      console.log(`\n📦 Publishing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(scoresArray.length / batchSize)}`);

      for (const [nodeId, score] of batch) {
        try {
          // Find corresponding node for metadata
          const node = results.metadata.nodeCount > 0
            ? undefined // Would need to pass nodes array
            : undefined;

          const reputationAsset = {
            developerId: nodeId,
            reputationScore: Math.round(score.finalScore),
            contributions: [], // Would be populated from actual data
            timestamp: Date.now(),
            metadata: {
              graphScore: score.graphScore,
              qualityScore: score.qualityScore,
              stakeScore: score.stakeScore,
              paymentScore: score.paymentScore,
              percentile: score.percentile,
              explanation: score.explanation,
              algorithm: results.metadata.algorithm,
              ...(includeFairnessMetrics && results.fairnessMetrics
                ? { fairnessMetrics: results.fairnessMetrics }
                : {}),
              ...(includeSensitivityAudit && results.sensitivityAudits?.has(nodeId)
                ? {
                    sensitivityAudit: {
                      topInfluencingEdges: results.sensitivityAudits.get(nodeId)!.topInfluencingEdges
                    }
                  }
                : {}),
              ...(results.sybilProbabilities?.has(nodeId)
                ? { sybilProbability: results.sybilProbabilities!.get(nodeId) }
                : {})
            },
            provenance: {
              computedBy: 'GraphReputationService',
              method: results.metadata.algorithm,
              sourceAssets: []
            }
          };

          const publishResult = await this.dkgClient.publishReputationAsset(
            reputationAsset,
            epochs
          );

          publishResults.push({
            nodeId,
            ual: publishResult.UAL
          });

          console.log(`✅ Published: ${nodeId} (score: ${score.finalScore.toFixed(1)}) -> ${publishResult.UAL}`);
        } catch (error: any) {
          console.error(`❌ Failed to publish ${nodeId}:`, error.message);
          publishResults.push({
            nodeId,
            error: error.message
          });
        }
      }

      // Delay between batches
      if (i + batchSize < scoresArray.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = publishResults.filter(r => r.ual).length;
    const failed = publishResults.filter(r => r.error).length;

    console.log(`\n✅ Publishing complete: ${successful} succeeded, ${failed} failed`);

    return publishResults;
  }

  /**
   * Query graph data from DKG and compute reputation
   * 
   * This method queries the DKG for social graph relationships and computes
   * reputation scores from the retrieved data.
   * 
   * @param queryOptions - Options for querying graph data
   * @param computationOptions - Options for reputation computation
   * @returns Reputation computation results
   */
  async computeReputationFromDKG(
    queryOptions: {
      developerIds?: string[];
      includeAllNodes?: boolean;
      relationshipTypes?: EdgeType[];
      minEdgeWeight?: number;
    } = {},
    computationOptions: ReputationComputationOptions = {}
  ): Promise<ReputationComputationResult> {
    console.log('🔍 Querying graph data from DKG...');

    // This would query the DKG using SPARQL to get nodes and edges
    // For now, this is a placeholder that would need to be implemented
    // based on your specific DKG schema and query capabilities

    throw new Error('computeReputationFromDKG not yet implemented. Please provide graph data directly using computeReputation().');

    // Example implementation would:
    // 1. Query nodes (developers) from DKG
    // 2. Query edges (relationships) from DKG
    // 3. Transform to GraphNode and GraphEdge format
    // 4. Call computeReputation()
  }
}

/**
 * Factory function to create a Graph Reputation Service
 */
export function createGraphReputationService(dkgClient: DKGClientV8): GraphReputationService {
  return new GraphReputationService(dkgClient);
}

export default GraphReputationService;

