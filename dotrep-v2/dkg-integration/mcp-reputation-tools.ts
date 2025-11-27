/**
 * MCP (Model Context Protocol) Tools for Reputation Queries
 * 
 * Provides AI agents with tools to query reputation data from the DKG.
 * These tools can be integrated with MCP-compatible AI agents.
 * 
 * Updated to follow MCP standardization patterns.
 */

import { SocialGraphReputationService, MCPReputationQuery } from './social-graph-reputation-service';
import { DKGClientV8 } from './dkg-client-v8';
import {
  MCPStandardTool,
  MCPStandardToolResult,
  createMCPTool,
  createMCPProperty,
  createMCPToolResult,
  createMCPError,
} from '../mcp-server/types/mcp-standard';

// Legacy interface for backward compatibility
export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

// Legacy interface for backward compatibility
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
   * Get available MCP tools (standardized format)
   */
  getToolDefinitions(): MCPStandardTool[] {
    return [
      createMCPTool(
        'get_user_reputation',
        'Query reputation score and trust assessment for a user by their DID. Returns verifiable data from the OriginTrail DKG with Sybil resistance analysis.',
        {
          userDID: createMCPProperty('string', 'The user\'s Decentralized Identifier (DID)', {
            examples: ['did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'],
          }),
          includeSybilRisk: createMCPProperty('boolean', 'Whether to include Sybil risk assessment', {
            default: true,
          }),
          includeConfidence: createMCPProperty('boolean', 'Whether to include confidence score', {
            default: true,
          }),
        },
        ['userDID']
      ),
      createMCPTool(
        'get_top_creators',
        'Get top N creators by reputation score, filtered for Sybil accounts. Returns ranked list with reputation metrics.',
        {
          limit: createMCPProperty('number', 'Number of top creators to return', {
            default: 10,
            minimum: 1,
            maximum: 100,
          }),
        }
      ),
      createMCPTool(
        'get_latest_snapshot',
        'Get the latest reputation snapshot from the DKG. Returns snapshot metadata, algorithm version, and provenance information.',
        {}
      ),
      createMCPTool(
        'assess_trust_level',
        'Assess trust level for a user based on reputation score. Provides trust level classification and recommendations.',
        {
          userDID: createMCPProperty('string', 'The user\'s Decentralized Identifier (DID)'),
        },
        ['userDID']
      ),
    ];
  }

  /**
   * Get legacy tool definitions (for backward compatibility)
   */
  getLegacyToolDefinitions(): MCPToolDefinition[] {
    return this.getToolDefinitions().map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  /**
   * Execute MCP tool (standardized format)
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<MCPStandardToolResult> {
    try {
      const startTime = Date.now();
      let result: MCPStandardToolResult;

      switch (toolName) {
        case 'get_user_reputation':
          result = await this.getUserReputationStandardized(parameters as {
            userDID: string;
            includeSybilRisk?: boolean;
            includeConfidence?: boolean;
          });
          break;
        
        case 'get_top_creators':
          result = await this.getTopCreatorsStandardized(parameters as { limit?: number });
          break;
        
        case 'get_latest_snapshot':
          result = await this.getLatestSnapshotStandardized(parameters);
          break;
        
        case 'assess_trust_level':
          result = await this.assessTrustLevelStandardized(parameters as { userDID: string });
          break;
        
        default:
          return createMCPError(`Unknown tool: ${toolName}`, 'TOOL_NOT_FOUND');
      }

      // Add execution metadata
      if (result.metadata) {
        result.metadata.executionTime = Date.now() - startTime;
      } else {
        result.metadata = {
          executionTime: Date.now() - startTime,
        };
      }

      return result;
    } catch (error: any) {
      return createMCPError(error, 'TOOL_EXECUTION_ERROR');
    }
  }

  /**
   * Execute MCP tool (legacy format for backward compatibility)
   */
  async executeToolLegacy(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<MCPToolResult> {
    try {
      const result = await this.executeTool(toolName, parameters);
      
      if (result.isError) {
        const errorText = result.content[0]?.text || 'Unknown error';
        const errorData = JSON.parse(errorText);
        return {
          success: false,
          error: errorData.error?.message || 'Tool execution failed',
        };
      }

      const dataText = result.content[0]?.text || '{}';
      const data = JSON.parse(dataText);

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tool execution failed',
      };
    }
  }

  /**
   * Tool: Get user reputation (standardized)
   */
  private async getUserReputationStandardized(params: {
    userDID: string;
    includeSybilRisk?: boolean;
    includeConfidence?: boolean;
  }): Promise<MCPStandardToolResult> {
    return await this.getUserReputation(params);
  }

  /**
   * Tool: Get user reputation (legacy)
   */
  private async getUserReputation(params: {
    userDID: string;
    includeSybilRisk?: boolean;
    includeConfidence?: boolean;
  }): Promise<MCPStandardToolResult> {
    const query: MCPReputationQuery = {
      userDID: params.userDID,
      includeSybilRisk: params.includeSybilRisk !== false,
      includeConfidence: params.includeConfidence !== false
    };

    const result = await this.reputationService.queryUserReputation(query);

    const data: any = {
      user: result.user,
      reputationScore: result.reputationScore,
      trustLevel: result.trustLevel,
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

    return createMCPToolResult(data, {
      metadata: {
        dataProvenance: result.dataProvenance || {
          source: 'dkg-reputation-service',
          timestamp: Date.now(),
          verified: true,
        },
      },
    });
  }

  /**
   * Tool: Get top creators (standardized)
   */
  private async getTopCreatorsStandardized(params: { limit?: number }): Promise<MCPStandardToolResult> {
    return await this.getTopCreators(params);
  }

  /**
   * Tool: Get top creators
   */
  private async getTopCreators(params: { limit?: number }): Promise<MCPStandardToolResult> {
    const limit = Math.min(Math.max(1, params.limit || 10), 100);
    
    const creators = await this.reputationService.getTopCreators(limit);

    return createMCPToolResult({
      creators: creators.map(c => ({
        user: c['schema:user'],
        reputationScore: c['reputation:value'],
        percentile: c['reputation:percentile'],
        confidence: c['reputation:confidence'],
        stakeAmount: c['reputation:stakeAmount'],
      })),
      count: creators.length,
    });
  }

  /**
   * Tool: Get latest snapshot (standardized)
   */
  private async getLatestSnapshotStandardized(_params: {}): Promise<MCPStandardToolResult> {
    return await this.getLatestSnapshot(_params);
  }

  /**
   * Tool: Get latest snapshot
   */
  private async getLatestSnapshot(_params: {}): Promise<MCPStandardToolResult> {
    const snapshot = await this.reputationService.getLatestReputationSnapshot();

    if (!snapshot) {
      return createMCPError('No reputation snapshot found', 'SNAPSHOT_NOT_FOUND');
    }

    return createMCPToolResult({
      snapshotId: snapshot['@id'],
      dateCreated: snapshot['schema:dateCreated'],
      algorithm: snapshot['reputation:algorithm'],
      totalScores: snapshot['reputation:scores']?.length || 0,
      sybilAnalysis: snapshot['reputation:sybilAnalysis'],
      provenance: snapshot['reputation:provenance'],
    });
  }

  /**
   * Tool: Assess trust level (standardized)
   */
  private async assessTrustLevelStandardized(params: { userDID: string }): Promise<MCPStandardToolResult> {
    return await this.assessTrustLevel(params);
  }

  /**
   * Tool: Assess trust level
   */
  private async assessTrustLevel(params: { userDID: string }): Promise<MCPStandardToolResult> {
    const query: MCPReputationQuery = {
      userDID: params.userDID,
      includeSybilRisk: true,
      includeConfidence: true,
    };

    const result = await this.reputationService.queryUserReputation(query);

    return createMCPToolResult({
      user: result.user,
      trustLevel: result.trustLevel,
      reputationScore: result.reputationScore,
      sybilRisk: result.sybilRisk,
      confidence: result.confidence,
      recommendation: this.getTrustRecommendation(result.trustLevel, result.sybilRisk),
    });
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


