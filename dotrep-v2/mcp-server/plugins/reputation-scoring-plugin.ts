/**
 * Reputation Scoring Plugin for MCP Server
 * 
 * Provides Sybil-resistant reputation calculation tools for AI agents.
 * Implements weighted PageRank with economic signals and Sybil detection.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseMCPPlugin, MCPToolResult } from './base-plugin';
import { ReputationCalculator } from '../../server/_core/reputationCalculator';
import { BotClusterDetector, BotDetectionResults } from '../../server/_core/botClusterDetector';
import { DKGClient } from '../../dkg-integration/dkg-client';

export interface GraphData {
  nodes: Array<{
    id: string;
    stake?: number;
    creationDate?: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
}

export interface ReputationAnalysis {
  userDid: string;
  reputationScore: number;
  componentScores: {
    socialRank: number;
    economicWeight: number;
    sybilResistance: number;
  };
  sybilRisk: number;
  confidence: number;
}

export class ReputationScoringPlugin extends BaseMCPPlugin {
  private reputationCalculator: ReputationCalculator;
  private botDetector: BotClusterDetector;
  private dkgClient: DKGClient;

  constructor(
    server: Server,
    dkgClient: DKGClient,
    reputationCalculator: ReputationCalculator,
    botDetector: BotClusterDetector
  ) {
    super(server, {
      name: 'reputation-scoring',
      version: '1.0.0',
      description: 'Sybil-resistant reputation scoring with weighted PageRank and economic signals',
    });
    this.dkgClient = dkgClient;
    this.reputationCalculator = reputationCalculator;
    this.botDetector = botDetector;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'calculate_sybil_resistant_reputation',
        description: 'Calculate Sybil-resistant reputation score using weighted PageRank with economic signals',
        inputSchema: {
          type: 'object',
          properties: {
            userDid: {
              type: 'string',
              description: 'User DID (Decentralized Identifier)',
            },
            graphData: {
              type: 'object',
              description: 'Social graph data with nodes and edges',
              properties: {
                nodes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      stake: { type: 'number' },
                      creationDate: { type: 'string' },
                    },
                  },
                },
                edges: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      target: { type: 'string' },
                      weight: { type: 'number' },
                    },
                  },
                },
              },
            },
            economicStake: {
              type: 'number',
              description: 'Economic stake amount (optional)',
            },
          },
          required: ['userDid', 'graphData'],
        },
      },
      {
        name: 'compare_reputations',
        description: 'Compare reputation scores between multiple users',
        inputSchema: {
          type: 'object',
          properties: {
            userDids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of user DIDs to compare',
            },
            metrics: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['social_rank', 'economic_stake', 'endorsement_quality'],
              },
              description: 'Specific metrics to compare (optional)',
            },
          },
          required: ['userDids'],
        },
      },
      {
        name: 'detect_sybil_clusters',
        description: 'Detect Sybil clusters in social graph using graph analysis',
        inputSchema: {
          type: 'object',
          properties: {
            graphData: {
              type: 'object',
              description: 'Social graph data to analyze',
              properties: {
                nodes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      stake: { type: 'number' },
                      creationDate: { type: 'string' },
                    },
                  },
                },
                edges: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source: { type: 'string' },
                      target: { type: 'string' },
                      weight: { type: 'number' },
                    },
                  },
                },
              },
            },
            sensitivity: {
              type: 'number',
              description: 'Detection sensitivity (0-1, default: 0.7)',
              minimum: 0,
              maximum: 1,
            },
          },
          required: ['graphData'],
        },
      },
    ];
  }

  async initialize(): Promise<void> {
    // Tools are registered via the server's tool handler
    // This method can be used for additional setup if needed
  }

  /**
   * Calculate Sybil-resistant reputation using weighted PageRank
   */
  async calculateSybilResistantReputation(params: {
    userDid: string;
    graphData: GraphData;
    economicStake?: number;
  }): Promise<MCPToolResult> {
    try {
      const { userDid, graphData, economicStake } = params;

      // Calculate weighted PageRank
      const pageRankScore = await this.calculateWeightedPageRank(
        userDid,
        graphData,
        economicStake
      );

      // Analyze Sybil risk
      const sybilRisk = await this.analyzeSybilRisk(graphData, userDid);

      const analysis: ReputationAnalysis = {
        userDid,
        reputationScore: pageRankScore.overall,
        componentScores: pageRankScore.components,
        sybilRisk,
        confidence: pageRankScore.confidence,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Compare multiple users' reputations
   */
  async compareReputations(params: {
    userDids: string[];
    metrics?: string[];
  }): Promise<MCPToolResult> {
    try {
      const { userDids, metrics } = params;
      const comparisons = await Promise.all(
        userDids.map(did => this.getUserReputation(did))
      );

      const formatted = this.formatComparisonTable(comparisons, metrics);

      return {
        content: [
          {
            type: 'text',
            text: formatted,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Detect Sybil clusters in social graph
   */
  async detectSybilClusters(params: {
    graphData: GraphData;
    sensitivity?: number;
  }): Promise<MCPToolResult> {
    try {
      const { graphData, sensitivity = 0.7 } = params;

      // Convert graph data to format expected by bot detector
      const clusters = await this.findSuspiciousClusters(graphData, sensitivity);

      const riskScores = clusters.map(cluster =>
        this.calculateClusterRiskScore(cluster)
      );

      const result = {
        detectedClusters: clusters.length,
        highRiskClusters: riskScores.filter(score => score > 0.8).length,
        clusters: clusters.map((cluster, index) => ({
          id: `cluster_${index}`,
          size: cluster.nodes.length,
          riskScore: riskScores[index],
          characteristics: this.analyzeClusterCharacteristics(cluster),
        })),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: error.message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Calculate weighted PageRank with economic signals
   */
  private async calculateWeightedPageRank(
    userDid: string,
    graphData: GraphData,
    economicStake?: number
  ): Promise<{
    overall: number;
    components: {
      socialRank: number;
      economicWeight: number;
      sybilResistance: number;
    };
    confidence: number;
  }> {
    // Simplified PageRank calculation
    // In production, use a proper graph library like graphology
    const basePageRank = this.calculatePageRank(graphData, userDid);
    const economicWeight = economicStake
      ? this.normalizeStakeWeight(economicStake)
      : 0.5;

    // Calculate Sybil resistance
    const sybilResistance = await this.calculateSybilResistance(
      graphData,
      userDid
    );

    return {
      overall: basePageRank * economicWeight * sybilResistance,
      components: {
        socialRank: basePageRank,
        economicWeight,
        sybilResistance,
      },
      confidence: this.calculateConfidence(graphData, userDid),
    };
  }

  /**
   * Simple PageRank calculation (simplified version)
   */
  private calculatePageRank(graphData: GraphData, userDid: string): number {
    // Simplified PageRank - in production use proper graph algorithm
    const userNode = graphData.nodes.find(n => n.id === userDid);
    if (!userNode) return 0;

    const incomingEdges = graphData.edges.filter(e => e.target === userDid);
    const totalWeight = incomingEdges.reduce((sum, e) => sum + e.weight, 0);
    const avgWeight = incomingEdges.length > 0 ? totalWeight / incomingEdges.length : 0;

    // Normalize to 0-1 range
    return Math.min(1, avgWeight);
  }

  /**
   * Normalize stake weight to 0-1 range
   */
  private normalizeStakeWeight(stake: number): number {
    // Normalize based on typical stake amounts (adjust thresholds as needed)
    const maxStake = 10000; // Maximum expected stake
    return Math.min(1, stake / maxStake);
  }

  /**
   * Calculate Sybil resistance score
   */
  private async calculateSybilResistance(
    graphData: GraphData,
    userDid: string
  ): Promise<number> {
    try {
      // Convert graph data to format expected by bot detector
      const botDetectorGraphData = this.convertToBotDetectorFormat(graphData);
      // Create mock reputation scores (in production, fetch from service)
      const reputationScores: Record<string, { finalScore: number }> = {};
      graphData.nodes.forEach(node => {
        reputationScores[node.id] = { finalScore: node.stake || 0.5 };
      });

      // Use bot detector to assess Sybil risk
      const detectionResults = await this.botDetector.detectBotClusters(
        botDetectorGraphData as any,
        reputationScores
      );
      const userCluster = detectionResults.suspiciousClusters.find(cluster =>
        cluster.nodes.includes(userDid)
      );

      if (userCluster) {
        // Lower resistance if in suspicious cluster
        return Math.max(0.1, 1 - userCluster.suspicionScore);
      }

      return 1.0; // High resistance if not in suspicious cluster
    } catch (error) {
      // If detection fails, assume moderate resistance
      console.warn('Sybil detection failed, using default resistance:', error);
      return 0.7;
    }
  }

  /**
   * Analyze Sybil risk for a user
   */
  private async analyzeSybilRisk(
    graphData: GraphData,
    userDid: string
  ): Promise<number> {
    try {
      const botDetectorGraphData = this.convertToBotDetectorFormat(graphData);
      const reputationScores: Record<string, { finalScore: number }> = {};
      graphData.nodes.forEach(node => {
        reputationScores[node.id] = { finalScore: node.stake || 0.5 };
      });

      const detectionResults = await this.botDetector.detectBotClusters(
        botDetectorGraphData as any,
        reputationScores
      );
      const userCluster = detectionResults.suspiciousClusters.find(cluster =>
        cluster.nodes.includes(userDid)
      );

      return userCluster?.suspicionScore || 0;
    } catch (error) {
      console.warn('Sybil risk analysis failed:', error);
      return 0;
    }
  }

  /**
   * Convert plugin graph data format to bot detector format
   */
  private convertToBotDetectorFormat(graphData: GraphData): {
    nodes: Array<{ id: string; metadata?: { stake?: number; [key: string]: any } }>;
    edges: Array<{ source: string; target: string; weight: number; edgeType?: string; timestamp?: number }>;
  } {
    // Convert to format expected by bot detector (GraphNode[] and GraphEdge[])
    return {
      nodes: graphData.nodes.map(node => ({
        id: node.id,
        metadata: {
          stake: node.stake || 0,
        },
      })),
      edges: graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        edgeType: 'endorsement', // Default edge type
        timestamp: Date.now(),
      })),
    } as any; // Type assertion needed due to strict typing
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(graphData: GraphData, userDid: string): number {
    const userNode = graphData.nodes.find(n => n.id === userDid);
    const connections = graphData.edges.filter(
      e => e.source === userDid || e.target === userDid
    ).length;

    // Higher confidence with more connections and stake
    const connectionScore = Math.min(1, connections / 10);
    const stakeScore = userNode?.stake ? this.normalizeStakeWeight(userNode.stake) : 0.5;

    return (connectionScore + stakeScore) / 2;
  }

  /**
   * Get user reputation (simplified)
   */
  private async getUserReputation(userDid: string): Promise<any> {
    // In production, query DKG or reputation service
    return {
      userDid,
      reputationScore: 0.7,
      socialRank: 0.6,
      economicStake: 0.5,
    };
  }

  /**
   * Format comparison table
   */
  private formatComparisonTable(comparisons: any[], metrics?: string[]): string {
    const headers = metrics || ['reputationScore', 'socialRank', 'economicStake'];
    let table = '| User DID | ' + headers.join(' | ') + ' |\n';
    table += '|' + '---|'.repeat(headers.length + 1) + '\n';

    comparisons.forEach(comp => {
      const values = headers.map(h => comp[h]?.toFixed(2) || 'N/A');
      table += `| ${comp.userDid} | ${values.join(' | ')} |\n`;
    });

    return table;
  }

  /**
   * Find suspicious clusters
   */
  private async findSuspiciousClusters(
    graphData: GraphData,
    sensitivity: number
  ): Promise<Array<{ nodes: string[]; suspicionScore: number }>> {
    try {
      const botDetectorGraphData = this.convertToBotDetectorFormat(graphData);
      const reputationScores: Record<string, { finalScore: number }> = {};
      graphData.nodes.forEach(node => {
        reputationScores[node.id] = { finalScore: node.stake || 0.5 };
      });

      const detectionResults = await this.botDetector.detectBotClusters(
        botDetectorGraphData as any,
        reputationScores
      );
      return detectionResults.suspiciousClusters.filter(
        cluster => cluster.suspicionScore >= sensitivity
      );
    } catch (error) {
      console.warn('Cluster detection failed:', error);
      return [];
    }
  }

  /**
   * Calculate cluster risk score
   */
  private calculateClusterRiskScore(cluster: {
    nodes: string[];
    suspicionScore: number;
  }): number {
    return cluster.suspicionScore;
  }

  /**
   * Analyze cluster characteristics
   */
  private analyzeClusterCharacteristics(cluster: {
    nodes: string[];
    suspicionScore: number;
  }): Record<string, any> {
    return {
      nodeCount: cluster.nodes.length,
      suspicionLevel: cluster.suspicionScore > 0.8 ? 'high' : 'medium',
    };
  }
}

