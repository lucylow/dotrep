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
import { TokenVerificationService, GatedAction } from './token-verification-service';
import { GuardianVerificationService } from './guardian-verification';

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
  enableDeceptionFiltering?: boolean; // Filter bad-mouthing and self-promotion
  enableGuardianIntegration?: boolean; // Integrate Umanitek Guardian content quality
  computeHybridScore?: boolean;
  hybridWeights?: {
    graph?: number;
    quality?: number;
    stake?: number;
    payment?: number;
    behavioral?: number; // Behavioral signals (engagement, consistency)
  };
  pageRankConfig?: PageRankConfig;
}

export interface ReputationComputationResult {
  scores: Map<string, HybridReputationScore>;
  fairnessMetrics?: FairnessMetrics;
  sensitivityAudits?: Map<string, SensitivityAuditResult>;
  sybilProbabilities?: Map<string, number>;
  deceptionProbabilities?: Map<string, number>; // Edge-level deception scores
  communities?: number[]; // Community assignments for each node
  computationTime: number;
  metadata: {
    nodeCount: number;
    edgeCount: number;
    algorithm: string;
    config: ReputationComputationOptions;
    guardianIntegrationEnabled?: boolean;
    deceptionFilteringEnabled?: boolean;
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
  private tokenVerification: TokenVerificationService | null = null;
  private guardianService: GuardianVerificationService | null = null;

  constructor(
    dkgClient: DKGClientV8,
    tokenVerification?: TokenVerificationService,
    guardianService?: GuardianVerificationService
  ) {
    this.dkgClient = dkgClient;
    this.tokenVerification = tokenVerification || dkgClient.getTokenVerificationService() || null;
    this.guardianService = guardianService || null;
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
      enableDeceptionFiltering = false,
      enableGuardianIntegration = false,
      hybridWeights = {
        graph: 0.5,
        quality: 0.25,
        stake: 0.15,
        payment: 0.1
      },
      pageRankConfig = {}
    } = options;

    console.log(`🔍 Computing reputation for ${graphData.nodes.length} nodes and ${graphData.edges.length} edges`);

    // Step 0: Enhance edges with token verification weights (if token verification is enabled)
    let enhancedEdges = graphData.edges;
    if (this.tokenVerification) {
      console.log('🔐 Enhancing edges with token verification weights...');
      enhancedEdges = await this.tokenVerification.enhanceEdgesWithTokenWeights(
        graphData.edges,
        GatedAction.PUBLISH_ENDORSEMENT
      );
      const tokenBackedCount = enhancedEdges.filter(e => e.metadata?.stakeBacked).length;
      console.log(`   ${tokenBackedCount}/${enhancedEdges.length} edges are token-backed`);
    }

    // Step 1: Compute PageRank
    let pagerankScores: Map<string, number>;
    
    if (useTemporalPageRank) {
      console.log('📊 Computing Temporal Weighted PageRank...');
      const pagerankResult = GraphAlgorithms.computeTemporalWeightedPageRank(
        graphData.nodes,
        enhancedEdges, // Use enhanced edges with token weights
        pageRankConfig
      );
      pagerankScores = pagerankResult.scores;
      console.log(`✅ PageRank converged in ${pagerankResult.iterations} iterations (${pagerankResult.computationTime}ms)`);
    } else {
      // Fallback to basic PageRank (would need basic implementation)
      throw new Error('Basic PageRank not yet implemented. Use temporal PageRank.');
    }

    // Step 2: Apply token-based reputation boosts to nodes
    if (this.tokenVerification && computeHybridScore) {
      console.log('🔐 Applying token-based reputation boosts...');
      const boostedNodes = await Promise.all(
        graphData.nodes.map(async (node) => {
          const boost = await this.tokenVerification!.getReputationBoost(
            node.id,
            GatedAction.PUBLISH_ENDORSEMENT
          );
          if (boost > 0) {
            return {
              ...node,
              metadata: {
                ...node.metadata,
                tokenReputationBoost: boost,
                tokenVerified: true
              }
            };
          }
          return node;
        })
      );
      graphData.nodes = boostedNodes;
    }

    // Step 3: Apply fairness adjustments if enabled
    if (applyFairnessAdjustments) {
      console.log('⚖️  Applying fairness adjustments...');
      pagerankScores = GraphAlgorithms.applyFairnessAdjustments(
        pagerankScores,
        graphData.nodes,
        fairnessAdjustmentStrength
      );
    }

    // Step 4: Compute hybrid scores
    let finalScores: Map<string, HybridReputationScore>;
    
    if (computeHybridScore) {
      console.log('🔗 Computing hybrid reputation scores...');
      finalScores = GraphAlgorithms.computeHybridReputation(
        pagerankScores,
        graphData.nodes,
        {
          graphWeight: hybridWeights.graph,
          qualityWeight: hybridWeights.quality,
          stakeWeight: hybridWeights.stake,
          paymentWeight: hybridWeights.payment
        }
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

    // Step 5: Compute fairness metrics
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

    // Step 6: Detect communities and Sybil clusters
    let communities: number[] | undefined;
    let sybilProbabilities: Map<string, number> | undefined;
    if (enableSybilDetection) {
      console.log('🛡️  Detecting communities and Sybil clusters...');
      communities = GraphAlgorithms.detectCommunities(graphData.nodes, enhancedEdges);
      sybilProbabilities = GraphAlgorithms.detectSybilClusters(
        graphData.nodes,
        enhancedEdges,
        pagerankScores
      );
      const sybilCount = Array.from(sybilProbabilities.values()).filter(p => p > 0.5).length;
      console.log(`   Detected ${sybilCount} potential Sybil nodes across ${new Set(communities).size} communities`);
    }

    // Step 6.5: Filter deceptive opinions (bad-mouthing and self-promotion)
    let deceptionProbabilities: Map<string, number> | undefined;
    if (enableDeceptionFiltering && communities) {
      console.log('🔍 Filtering deceptive opinions...');
      deceptionProbabilities = GraphAlgorithms.filterDeceptiveOpinions(
        graphData.nodes,
        enhancedEdges,
        communities
      );
      
      // Remove or downweight deceptive edges
      const deceptiveEdgeCount = Array.from(deceptionProbabilities.values()).filter(p => p > 0.5).length;
      console.log(`   Filtered ${deceptiveEdgeCount} potentially deceptive edges`);
      
      // Downweight deceptive edges in PageRank computation
      if (deceptiveEdgeCount > 0) {
        enhancedEdges = enhancedEdges.map(edge => {
          const edgeId = `${edge.source}->${edge.target}`;
          const deceptionProb = deceptionProbabilities!.get(edgeId) || 0;
          if (deceptionProb > 0.5) {
            return {
              ...edge,
              weight: edge.weight * (1 - deceptionProb * 0.8) // Reduce weight by up to 80%
            };
          }
          return edge;
        });
        
        // Recompute PageRank with filtered edges
        if (useTemporalPageRank) {
          const filteredPRResult = GraphAlgorithms.computeTemporalWeightedPageRank(
            graphData.nodes,
            enhancedEdges,
            pageRankConfig
          );
          pagerankScores = filteredPRResult.scores;
        }
      }
    }

    // Step 6.6: Integrate Guardian content quality signals
    // Note: Guardian service integration would require initialization
    if (enableGuardianIntegration && false) { // Disabled for now
      console.log('🛡️  Integrating Umanitek Guardian content quality signals...');
      const guardianEnhancedNodes = await Promise.all(
        graphData.nodes.map(async (node) => {
          try {
            // Query Guardian safety scores for this creator
            const safetyScore = await this.queryCreatorSafetyScore(node.id);
            
            if (safetyScore !== null) {
              return {
                ...node,
                metadata: {
                  ...node.metadata,
                  guardianSafetyScore: safetyScore,
                  contentQuality: (node.metadata?.contentQuality || 0) * 0.7 + safetyScore * 0.3
                }
              };
            }
          } catch (error) {
            console.warn(`   Failed to get Guardian score for ${node.id}:`, error);
          }
          return node;
        })
      );
      graphData.nodes = guardianEnhancedNodes;
    }

    // Step 7: Sensitivity auditing (optional, can be expensive)
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
          enhancedEdges, // Use enhanced edges
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
      deceptionProbabilities,
      communities,
      computationTime,
      metadata: {
        nodeCount: graphData.nodes.length,
        edgeCount: enhancedEdges.length, // Use enhanced edges count
        algorithm: useTemporalPageRank ? 'TemporalWeightedPageRank' : 'PageRank',
        config: options,
        guardianIntegrationEnabled: enableGuardianIntegration && !!this.guardianService,
        deceptionFilteringEnabled: enableDeceptionFiltering
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
   * Query graph data from DKG and compute reputation with Payment Evidence KAs
   * 
   * This method queries the DKG for social graph relationships and Payment Evidence KAs,
   * then computes TraceRank-style payment-weighted reputation scores.
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
      includePaymentEvidence?: boolean; // Enable payment-weighted TraceRank
      minPaymentAmount?: number; // Filter low-value payments (sybil resistance)
    } = {},
    computationOptions: ReputationComputationOptions = {}
  ): Promise<ReputationComputationResult> {
    console.log('🔍 Querying graph data from DKG...');

    const {
      includePaymentEvidence = true,
      minPaymentAmount = 0,
      developerIds = [],
      minEdgeWeight = 0
    } = queryOptions;

    // Step 1: Query Payment Evidence KAs if enabled (TraceRank)
    let paymentEdges: GraphEdge[] = [];
    if (includePaymentEvidence) {
      console.log('💰 Querying Payment Evidence KAs for payment-weighted reputation...');
      paymentEdges = await this.queryPaymentEvidenceAsEdges({
        minAmount: minPaymentAmount,
        recipientIds: developerIds.length > 0 ? developerIds : undefined
      });
      console.log(`   Found ${paymentEdges.length} payment edges`);
    }

    // Step 2: Query social graph relationships (endorsements, contributions, etc.)
    console.log('🔗 Querying social graph relationships...');
    const socialEdges = await this.querySocialGraphEdges({
      developerIds: developerIds.length > 0 ? developerIds : undefined,
      minEdgeWeight,
      relationshipTypes: queryOptions.relationshipTypes
    });
    console.log(`   Found ${socialEdges.length} social graph edges`);

    // Step 3: Combine all edges
    const allEdges = [...socialEdges, ...paymentEdges];

    // Step 4: Extract unique nodes from edges
    const nodeMap = new Map<string, GraphNode>();
    for (const edge of allEdges) {
      if (!nodeMap.has(edge.source)) {
        nodeMap.set(edge.source, {
          id: edge.source,
          metadata: {}
        });
      }
      if (!nodeMap.has(edge.target)) {
        nodeMap.set(edge.target, {
          id: edge.target,
          metadata: {}
        });
      }
    }

    // Step 5: Compute reputation with combined graph
    return this.computeReputation(
      {
        nodes: Array.from(nodeMap.values()),
        edges: allEdges
      },
      {
        ...computationOptions,
        // Increase payment weight if payment evidence included
        hybridWeights: includePaymentEvidence 
          ? {
              ...computationOptions.hybridWeights,
              payment: computationOptions.hybridWeights?.payment || 0.25
            }
          : computationOptions.hybridWeights
      }
    );
  }

  /**
   * Query Payment Evidence KAs from DKG and convert to graph edges
   * 
   * Creates edges from payer → recipient with payment amount as weight
   */
  private async queryPaymentEvidenceAsEdges(filters: {
    minAmount?: number;
    recipientIds?: string[];
    limit?: number;
  }): Promise<GraphEdge[]> {
    const { minAmount = 0, recipientIds, limit = 1000 } = filters;

    try {
      // Query Payment Evidence KAs
      const payments = await this.dkgClient.queryPaymentEvidence({
        minAmount,
        limit
      });

      const edges: GraphEdge[] = [];
      const seenPayments = new Set<string>(); // Deduplicate by txHash

      for (const payment of payments) {
        // Filter by recipient if specified
        if (recipientIds && recipientIds.length > 0 && 
            !recipientIds.includes(payment.recipient)) {
          continue;
        }

        // Deduplicate
        if (seenPayments.has(payment.txHash)) {
          continue;
        }
        seenPayments.add(payment.txHash);

        // Calculate edge weight from payment amount (logarithmic scale)
        const amount = parseFloat(payment.amount);
        const weight = amount > 0 ? Math.min(Math.log10(amount) * 10, 50) : 0;

        edges.push({
          source: payment.payer,
          target: payment.recipient,
          edgeType: EdgeType.ENDORSE, // Use ENDORSE type for payment edges
          weight,
          timestamp: new Date(payment.timestamp).getTime(),
          metadata: {
            paymentAmount: amount,
            currency: payment.currency,
            txHash: payment.txHash,
            chain: payment.chain,
            paymentWeight: weight,
            paymentBacked: true // Mark as payment-backed edge
          }
        });
      }

      return edges;
    } catch (error: any) {
      console.error('Error querying Payment Evidence KAs:', error);
      return [];
    }
  }

  /**
   * Query social graph edges from DKG using SPARQL
   * 
   * Queries the Umanitek Guardian knowledge base on DKG for:
   * - Follow relationships (foaf:knows)
   * - Endorsements (schema:Interaction with interactionType "endorse")
   * - Content interactions (likes, shares, comments)
   */
  private async querySocialGraphEdges(filters: {
    developerIds?: string[];
    minEdgeWeight?: number;
    relationshipTypes?: EdgeType[];
  }): Promise<GraphEdge[]> {
    const { developerIds = [], minEdgeWeight = 0 } = filters;

    try {
      const sparqlQuery = `
        PREFIX schema: <https://schema.org/>
        PREFIX foaf: <http://xmlns.com/foaf/0.1/>
        PREFIX prov: <http://www.w3.org/ns/prov#>
        
        SELECT ?from ?to ?edgeType ?connectionStrength ?timestamp WHERE {
          {
            ?obs a prov:Entity, schema:Observation ;
                 schema:about ?about ;
                 schema:dateCreated ?timestamp .
            ?obs foaf:knows ?person .
            ?person a foaf:Person .
            OPTIONAL {
              ?obs schema:additionalProperty ?addProp .
              ?addProp schema:name "connectionStrength" ;
                       schema:value ?connectionStrength .
            }
            BIND(?about AS ?from)
            BIND(?person AS ?to)
            BIND("follow" AS ?edgeType)
            ${developerIds.length > 0 ? `FILTER(?from IN (${developerIds.map(id => `"${id}"`).join(', ')}))` : ''}
          }
          UNION
          {
            ?edge a schema:Interaction ;
                  schema:agent ?from ;
                  schema:target ?to ;
                  schema:interactionType ?it ;
                  schema:dateCreated ?timestamp .
            FILTER(CONTAINS(LCASE(STR(?it)), "endorse") || CONTAINS(LCASE(STR(?it)), "recommend"))
            OPTIONAL {
              ?edge schema:additionalProperty ?ap .
              ?ap schema:name "strength" ;
                  schema:value ?connectionStrength .
            }
            BIND("endorse" AS ?edgeType)
            ${developerIds.length > 0 ? `FILTER(?from IN (${developerIds.map(id => `"${id}"`).join(', ')}))` : ''}
          }
        }
        ${minEdgeWeight > 0 ? `FILTER(?connectionStrength >= ${minEdgeWeight})` : ''}
        LIMIT 20000
      `;

      console.log('   Executing SPARQL query for social graph edges...');
      const results = await this.dkgClient.executeSafeQuery(sparqlQuery, 'SELECT');

      const edges: GraphEdge[] = [];
      const seenEdges = new Set<string>();

      for (const result of results) {
        const source = result.from?.value || result.from;
        const target = result.to?.value || result.to;
        const edgeTypeStr = result.edgeType?.value || result.edgeType || 'follow';
        const strength = parseFloat(result.connectionStrength?.value || result.connectionStrength || '0.5');
        const timestamp = result.timestamp?.value 
          ? new Date(result.timestamp.value).getTime() 
          : Date.now();

        const edgeKey = `${source}->${target}:${edgeTypeStr}`;
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);

        let edgeType: EdgeType = EdgeType.FOLLOW;
        if (edgeTypeStr === 'endorse') edgeType = EdgeType.ENDORSE;

        edges.push({
          source,
          target,
          edgeType: edgeType,
          weight: Math.min(1, Math.max(0, strength)),
          timestamp,
          metadata: {
            connectionStrength: strength,
            edgeType: edgeTypeStr
          }
        });
      }

      console.log(`   Found ${edges.length} social graph edges from DKG`);
      return edges;
    } catch (error: any) {
      console.error('Error querying social graph edges from DKG:', error);
      return [];
    }
  }

  /**
   * Query creator safety score from Guardian verification reports
   */
  private async queryCreatorSafetyScore(creatorId: string): Promise<number | null> {
    if (!this.guardianService) return null;

    try {
      const sparqlQuery = `
        PREFIX schema: <https://schema.org/>
        PREFIX dotrep: <https://dotrep.io/ontology/>
        
        SELECT ?confidence ?matchFound ?status WHERE {
          ?report a dotrep:ContentVerificationReport ;
                  schema:about ?content ;
                  dotrep:verificationResult ?result .
          ?content schema:author ?creator .
          ?creator dotrep:identifier "${creatorId}" .
          ?result dotrep:confidence ?confidence ;
                  dotrep:matchFound ?matchFound ;
                  dotrep:status ?status .
        }
        ORDER BY DESC(?confidence)
        LIMIT 50
      `;

      const results = await this.dkgClient.executeSafeQuery(sparqlQuery, 'SELECT');
      
      if (results.length === 0) {
        return null;
      }

      let verifiedCount = 0;
      let flaggedCount = 0;

      for (const result of results) {
        const matchFound = result.matchFound?.value === 'true' || result.matchFound === true;
        const status = result.status?.value || result.status || 'pending';

        if (status === 'verified' && !matchFound) {
          verifiedCount++;
        } else if (status === 'flagged' || matchFound) {
          flaggedCount++;
        }
      }

      const verifiedRatio = verifiedCount / results.length;
      const flaggedRatio = flaggedCount / results.length;
      
      const safetyScore = Math.max(0, Math.min(1, 
        verifiedRatio * 0.7 + (1 - flaggedRatio) * 0.3
      ));

      return safetyScore;
    } catch (error: any) {
      console.warn(`   Failed to query Guardian safety score for ${creatorId}:`, error.message);
      return null;
    }
  }
}

/**
 * Factory function to create a Graph Reputation Service
 */
export function createGraphReputationService(dkgClient: DKGClientV8): GraphReputationService {
  return new GraphReputationService(dkgClient);
}

export default GraphReputationService;

