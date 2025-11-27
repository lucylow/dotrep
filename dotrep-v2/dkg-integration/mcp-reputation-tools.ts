/**
 * MCP (Model Context Protocol) Tools for Reputation Queries
 * 
 * Provides AI agents with tools to query reputation data from the DKG.
 * These tools can be integrated with MCP-compatible AI agents.
 */

import { SocialGraphReputationService, MCPReputationQuery } from './social-graph-reputation-service';
import { DKGClientV8 } from './dkg-client-v8';

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * MCP Reputation Tools
 * 
 * Provides standardized tools for AI agents to query reputation data
 */
export class MCPReputationTools {
  private reputationService: SocialGraphReputationService;

  constructor(reputationService: SocialGraphReputationService) {
    this.reputationService = reputationService;
  }

  /**
   * Get available MCP tools
   */
  getToolDefinitions(): MCPToolDefinition[] {
    return [
      {
        name: 'get_user_reputation',
        description: 'Query reputation score and trust assessment for a user by their DID',
        inputSchema: {
          type: 'object',
          properties: {
            userDID: {
              type: 'string',
              description: 'The user\'s Decentralized Identifier (DID)'
            },
            includeSybilRisk: {
              type: 'boolean',
              description: 'Whether to include Sybil risk assessment (default: true)',
              default: true
            },
            includeConfidence: {
              type: 'boolean',
              description: 'Whether to include confidence score (default: true)',
              default: true
            }
          },
          required: ['userDID']
        }
      },
      {
        name: 'get_top_creators',
        description: 'Get top N creators by reputation score, filtered for Sybil accounts',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Number of top creators to return (default: 10, max: 100)',
              default: 10,
              minimum: 1,
              maximum: 100
            }
          }
        }
      },
      {
        name: 'get_latest_snapshot',
        description: 'Get the latest reputation snapshot from the DKG',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'assess_trust_level',
        description: 'Assess trust level for a user based on reputation score',
        inputSchema: {
          type: 'object',
          properties: {
            userDID: {
              type: 'string',
              description: 'The user\'s Decentralized Identifier (DID)'
            }
          },
          required: ['userDID']
        }
      }
    ];
  }

  /**
   * Execute MCP tool
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<MCPToolResult> {
    try {
      switch (toolName) {
        case 'get_user_reputation':
          return await this.getUserReputation(parameters);
        
        case 'get_top_creators':
          return await this.getTopCreators(parameters);
        
        case 'get_latest_snapshot':
          return await this.getLatestSnapshot(parameters);
        
        case 'assess_trust_level':
          return await this.assessTrustLevel(parameters);
        
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tool execution failed'
      };
    }
  }

  /**
   * Tool: Get user reputation
   */
  private async getUserReputation(params: {
    userDID: string;
    includeSybilRisk?: boolean;
    includeConfidence?: boolean;
  }): Promise<MCPToolResult> {
    const query: MCPReputationQuery = {
      userDID: params.userDID,
      includeSybilRisk: params.includeSybilRisk !== false,
      includeConfidence: params.includeConfidence !== false
    };

    const result = await this.reputationService.queryUserReputation(query);

    const data: any = {
      user: result.user,
      reputationScore: result.reputationScore,
      trustLevel: result.trustLevel
    };

    if (query.includeSybilRisk) {
      data.sybilRisk = result.sybilRisk;
    }
    if (query.includeConfidence) {
      data.confidence = result.confidence;
    }
    if (result.dataProvenance) {
      data.dataProvenance = result.dataProvenance;
    }

    return {
      success: true,
      data
    };
  }

  /**
   * Tool: Get top creators
   */
  private async getTopCreators(params: { limit?: number }): Promise<MCPToolResult> {
    const limit = Math.min(Math.max(1, params.limit || 10), 100);
    
    const creators = await this.reputationService.getTopCreators(limit);

    return {
      success: true,
      data: {
        creators: creators.map(c => ({
          user: c['schema:user'],
          reputationScore: c['reputation:value'],
          percentile: c['reputation:percentile'],
          confidence: c['reputation:confidence'],
          stakeAmount: c['reputation:stakeAmount']
        })),
        count: creators.length
      }
    };
  }

  /**
   * Tool: Get latest snapshot
   */
  private async getLatestSnapshot(_params: {}): Promise<MCPToolResult> {
    const snapshot = await this.reputationService.getLatestReputationSnapshot();

    if (!snapshot) {
      return {
        success: false,
        error: 'No reputation snapshot found'
      };
    }

    return {
      success: true,
      data: {
        snapshotId: snapshot['@id'],
        dateCreated: snapshot['schema:dateCreated'],
        algorithm: snapshot['reputation:algorithm'],
        totalScores: snapshot['reputation:scores'].length,
        sybilAnalysis: snapshot['reputation:sybilAnalysis'],
        provenance: snapshot['reputation:provenance']
      }
    };
  }

  /**
   * Tool: Assess trust level
   */
  private async assessTrustLevel(params: { userDID: string }): Promise<MCPToolResult> {
    const query: MCPReputationQuery = {
      userDID: params.userDID,
      includeSybilRisk: true,
      includeConfidence: true
    };

    const result = await this.reputationService.queryUserReputation(query);

    return {
      success: true,
      data: {
        user: result.user,
        trustLevel: result.trustLevel,
        reputationScore: result.reputationScore,
        sybilRisk: result.sybilRisk,
        confidence: result.confidence,
        recommendation: this.getTrustRecommendation(result.trustLevel, result.sybilRisk)
      }
    };
  }

  /**
   * Get trust recommendation based on trust level and Sybil risk
   */
  private getTrustRecommendation(
    trustLevel: string,
    sybilRisk: number
  ): string {
    if (sybilRisk > 0.7) {
      return 'High Sybil risk detected. Exercise caution.';
    }

    switch (trustLevel) {
      case 'highly_trusted':
        return 'User is highly trusted. Safe to interact with.';
      case 'trusted':
        return 'User is trusted. Generally safe to interact with.';
      case 'moderate':
        return 'User has moderate reputation. Use standard precautions.';
      case 'caution':
        return 'User has low reputation. Exercise caution.';
      case 'untrusted':
        return 'User is untrusted. Avoid interaction.';
      default:
        return 'Unable to assess trust level.';
    }
  }
}

/**
 * Create MCP Reputation Tools instance
 */
export function createMCPReputationTools(
  dkgClient: DKGClientV8
): MCPReputationTools {
  const { createSocialGraphReputationService } = require('./social-graph-reputation-service');
  const reputationService = createSocialGraphReputationService(dkgClient);
  return new MCPReputationTools(reputationService);
}

export default MCPReputationTools;

