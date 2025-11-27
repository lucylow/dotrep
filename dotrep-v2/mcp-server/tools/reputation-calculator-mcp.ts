/**
 * MCP Tools for Reputation Calculator
 * 
 * Standardized MCP tool definitions for the ReputationCalculator service,
 * following MCP specification for AI agent integration.
 */

import { ReputationCalculator } from '../../server/_core/reputationCalculator';
import {
  ReputationCalculationRequest,
  ReputationScore,
  HighlyTrustedUserStatus,
} from '../../server/_core/reputationCalculator';
import {
  MCPStandardTool,
  MCPStandardToolResult,
  MCPToolHandler,
  MCPToolExecutionContext,
  createMCPTool,
  createMCPProperty,
  createMCPToolResult,
  createMCPError,
} from '../types/mcp-standard';

/**
 * MCP Tools for Reputation Calculator Service
 */
export class ReputationCalculatorMCPTools {
  private calculator: ReputationCalculator;

  constructor(calculator?: ReputationCalculator) {
    this.calculator = calculator || new ReputationCalculator();
  }

  /**
   * Get all available MCP tools for reputation calculation
   */
  getToolDefinitions(): MCPStandardTool[] {
    return [
      this.getCalculateReputationTool(),
      this.getDetermineHighlyTrustedTool(),
      this.getCompareReputationsTool(),
      this.getReputationBreakdownTool(),
      this.getReputationHistoryTool(),
    ];
  }

  /**
   * Get tool handlers map
   */
  getToolHandlers(): Map<string, MCPToolHandler> {
    const handlers = new Map<string, MCPToolHandler>();
    
    handlers.set('calculate_reputation', this.handleCalculateReputation.bind(this));
    handlers.set('determine_highly_trusted', this.handleDetermineHighlyTrusted.bind(this));
    handlers.set('compare_reputations', this.handleCompareReputations.bind(this));
    handlers.set('get_reputation_breakdown', this.handleGetReputationBreakdown.bind(this));
    handlers.set('get_reputation_history', this.handleGetReputationHistory.bind(this));
    
    return handlers;
  }

  /**
   * Tool: Calculate Reputation Score
   */
  private getCalculateReputationTool(): MCPStandardTool {
    return createMCPTool(
      'calculate_reputation',
      'Calculate comprehensive reputation score for a user with time decay, verification boosts, and Sybil resistance analysis. Supports x402 protocol integration.',
      {
        userId: createMCPProperty('string', 'The unique identifier for the user (DID, wallet address, or username)', {
          examples: ['did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK'],
        }),
        contributions: createMCPProperty('array', 'Array of user contributions with weights and timestamps', {
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Contribution identifier' },
              type: { type: 'string', description: 'Contribution type (e.g., "code_contribution", "review")' },
              weight: { type: 'number', description: 'Contribution weight', minimum: 0 },
              timestamp: { type: 'number', description: 'Unix timestamp in milliseconds' },
              verified: { type: 'boolean', description: 'Whether contribution is verified on-chain' },
            },
          },
        }),
        algorithmWeights: createMCPProperty('object', 'Weights for different contribution types', {
          properties: {},
          additionalProperties: { type: 'number', minimum: 0 },
        }),
        timeDecayFactor: createMCPProperty('number', 'Time decay factor for contribution aging', {
          default: 0.01,
          minimum: 0,
          maximum: 1,
        }),
        includeSafetyScore: createMCPProperty('boolean', 'Include Guardian safety score in calculation', {
          default: false,
        }),
        includeHighlyTrustedDetermination: createMCPProperty('boolean', 'Calculate highly trusted user status (x402 protocol)', {
          default: false,
        }),
        onChainIdentity: createMCPProperty('object', 'On-chain identity verification (NFT/SBT)', {
          properties: {
            nftIdentity: {
              type: 'object',
              properties: {
                tokenId: { type: 'string' },
                contractAddress: { type: 'string' },
                chain: { type: 'string' },
                verified: { type: 'boolean' },
              },
            },
            sbtCredential: {
              type: 'object',
              properties: {
                tokenId: { type: 'string' },
                issuer: { type: 'string' },
                credentialType: { type: 'string' },
                verified: { type: 'boolean' },
              },
            },
          },
        }),
        verifiedPayments: createMCPProperty('array', 'Verified payment transactions (x402 protocol)', {
          items: {
            type: 'object',
            properties: {
              txHash: { type: 'string' },
              chain: { type: 'string' },
              amount: { type: 'number', minimum: 0 },
              currency: { type: 'string' },
              timestamp: { type: 'number' },
              verified: { type: 'boolean' },
            },
          },
        }),
        reputationRegistry: createMCPProperty('object', 'Transaction-verified feedback and ratings', {
          properties: {
            ratings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  fromUser: { type: 'string' },
                  rating: { type: 'number', minimum: 0, maximum: 1 },
                  timestamp: { type: 'number' },
                  verified: { type: 'boolean' },
                },
              },
            },
          },
        }),
        botDetectionResults: createMCPProperty('object', 'Bot cluster detection results for Sybil resistance', {
          properties: {
            confirmedBotClusters: { type: 'array' },
            suspiciousClusters: { type: 'array' },
            individualBots: { type: 'array' },
          },
        }),
      },
      ['userId', 'contributions', 'algorithmWeights', 'timeDecayFactor']
    );
  }

  /**
   * Tool: Determine Highly Trusted User Status
   */
  private getDetermineHighlyTrustedTool(): MCPStandardTool {
    return createMCPTool(
      'determine_highly_trusted',
      'Determine if a user qualifies as "highly trusted" based on x402 protocol standards. Evaluates on-chain identity, verified payments, reputation registry, and Sybil resistance.',
      {
        userId: createMCPProperty('string', 'The unique identifier for the user'),
        overall: createMCPProperty('number', 'Current overall reputation score', {
          minimum: 0,
          maximum: 1000,
        }),
        onChainIdentity: createMCPProperty('object', 'On-chain identity verification data'),
        verifiedPayments: createMCPProperty('array', 'Array of verified payment transactions'),
        reputationRegistry: createMCPProperty('object', 'Reputation registry with verified ratings'),
        contributions: createMCPProperty('array', 'Recent user contributions for temporal analysis'),
      },
      ['userId', 'overall']
    );
  }

  /**
   * Tool: Compare Reputations
   */
  private getCompareReputationsTool(): MCPStandardTool {
    return createMCPTool(
      'compare_reputations',
      'Compare reputation scores and trust factors between multiple users. Useful for ranking, selection, and competitive analysis.',
      {
        userIds: createMCPProperty('array', 'Array of user IDs to compare', {
          items: { type: 'string' },
          minItems: 2,
        }),
        includeBreakdown: createMCPProperty('boolean', 'Include detailed breakdown of reputation components', {
          default: false,
        }),
        includeTrustFactors: createMCPProperty('boolean', 'Include trust factor analysis', {
          default: true,
        }),
      },
      ['userIds']
    );
  }

  /**
   * Tool: Get Reputation Breakdown
   */
  private getReputationBreakdownTool(): MCPStandardTool {
    return createMCPTool(
      'get_reputation_breakdown',
      'Get detailed breakdown of reputation score components including contribution types, safety scores, and trust factors.',
      {
        userId: createMCPProperty('string', 'User identifier'),
        includePercentile: createMCPProperty('boolean', 'Include percentile rank', {
          default: true,
        }),
        includeRank: createMCPProperty('boolean', 'Include absolute rank', {
          default: true,
        }),
      },
      ['userId']
    );
  }

  /**
   * Tool: Get Reputation History
   */
  private getReputationHistoryTool(): MCPStandardTool {
    return createMCPTool(
      'get_reputation_history',
      'Get historical reputation scores and trends for a user over time. Useful for analyzing reputation growth and identifying patterns.',
      {
        userId: createMCPProperty('string', 'User identifier'),
        timeRange: createMCPProperty('string', 'Time range for history (e.g., "7d", "30d", "90d", "1y")', {
          enum: ['7d', '30d', '90d', '180d', '1y', 'all'],
          default: '90d',
        }),
        includeBreakdown: createMCPProperty('boolean', 'Include breakdown for each historical point', {
          default: false,
        }),
      },
      ['userId']
    );
  }

  /**
   * Handler: Calculate Reputation
   */
  private async handleCalculateReputation(
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    try {
      const startTime = Date.now();
      
      const request: ReputationCalculationRequest = {
        userId: args.userId,
        contributions: args.contributions || [],
        algorithmWeights: args.algorithmWeights || {},
        timeDecayFactor: args.timeDecayFactor ?? 0.01,
        includeSafetyScore: args.includeSafetyScore || false,
        includeHighlyTrustedDetermination: args.includeHighlyTrustedDetermination || false,
        onChainIdentity: args.onChainIdentity,
        verifiedPayments: args.verifiedPayments || [],
        reputationRegistry: args.reputationRegistry,
        botDetectionResults: args.botDetectionResults,
      };

      const result = await this.calculator.calculateReputation(request);
      const executionTime = Date.now() - startTime;

      return createMCPToolResult(
        {
          userId: request.userId,
          reputationScore: result.overall,
          breakdown: result.breakdown,
          percentile: result.percentile,
          rank: result.rank,
          safetyScore: result.safetyScore,
          combinedScore: result.combinedScore,
          highlyTrustedStatus: result.highlyTrustedStatus,
          botDetectionPenalty: result.botDetectionPenalty,
          sybilRisk: result.sybilRisk,
          lastUpdated: result.lastUpdated,
        },
        {
          metadata: {
            executionTime,
            dataProvenance: {
              source: 'reputation-calculator',
              timestamp: Date.now(),
              verified: true,
            },
          },
        }
      );
    } catch (error: any) {
      return createMCPError(error, 'REPUTATION_CALCULATION_ERROR');
    }
  }

  /**
   * Handler: Determine Highly Trusted
   */
  private async handleDetermineHighlyTrusted(
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    try {
      const request: ReputationCalculationRequest = {
        userId: args.userId,
        contributions: args.contributions || [],
        algorithmWeights: args.algorithmWeights || {},
        timeDecayFactor: 0.01,
        includeHighlyTrustedDetermination: true,
        onChainIdentity: args.onChainIdentity,
        verifiedPayments: args.verifiedPayments || [],
        reputationRegistry: args.reputationRegistry,
      };

      const result = await this.calculator.calculateReputation(request);
      
      if (!result.highlyTrustedStatus) {
        return createMCPError(
          'Highly trusted determination not available',
          'HIGHLY_TRUSTED_UNAVAILABLE'
        );
      }

      return createMCPToolResult(result.highlyTrustedStatus, {
        metadata: {
          dataProvenance: {
            source: 'reputation-calculator',
            timestamp: Date.now(),
            verified: true,
          },
        },
      });
    } catch (error: any) {
      return createMCPError(error, 'HIGHLY_TRUSTED_DETERMINATION_ERROR');
    }
  }

  /**
   * Handler: Compare Reputations
   */
  private async handleCompareReputations(
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    try {
      const userIds: string[] = args.userIds;
      if (!Array.isArray(userIds) || userIds.length < 2) {
        return createMCPError(
          'At least 2 user IDs required for comparison',
          'INVALID_INPUT'
        );
      }

      // This is a simplified comparison - in production, you'd fetch actual data
      const comparisons = await Promise.all(
        userIds.map(async (userId) => {
          // Mock request - in production, fetch actual user data
          const request: ReputationCalculationRequest = {
            userId,
            contributions: [],
            algorithmWeights: {},
            timeDecayFactor: 0.01,
          };
          
          try {
            const result = await this.calculator.calculateReputation(request);
            return {
              userId,
              reputationScore: result.overall,
              percentile: result.percentile,
              rank: result.rank,
              breakdown: args.includeBreakdown ? result.breakdown : undefined,
              highlyTrustedStatus: result.highlyTrustedStatus,
            };
          } catch (error) {
            return {
              userId,
              error: 'Failed to calculate reputation',
            };
          }
        })
      );

      // Sort by reputation score (descending)
      comparisons.sort((a, b) => {
        const scoreA = a.reputationScore || 0;
        const scoreB = b.reputationScore || 0;
        return scoreB - scoreA;
      });

      return createMCPToolResult({
        comparisons,
        summary: {
          total: comparisons.length,
          topUser: comparisons[0]?.userId,
          averageScore: comparisons.reduce((sum, c) => sum + (c.reputationScore || 0), 0) / comparisons.length,
        },
      });
    } catch (error: any) {
      return createMCPError(error, 'REPUTATION_COMPARISON_ERROR');
    }
  }

  /**
   * Handler: Get Reputation Breakdown
   */
  private async handleGetReputationBreakdown(
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    try {
      // This would typically fetch from a database or cache
      // For now, we'll use a mock calculation
      const request: ReputationCalculationRequest = {
        userId: args.userId,
        contributions: [],
        algorithmWeights: {},
        timeDecayFactor: 0.01,
        includeSafetyScore: true,
      };

      const result = await this.calculator.calculateReputation(request);

      return createMCPToolResult({
        userId: args.userId,
        breakdown: result.breakdown,
        overall: result.overall,
        percentile: args.includePercentile !== false ? result.percentile : undefined,
        rank: args.includeRank !== false ? result.rank : undefined,
        safetyScore: result.safetyScore,
        combinedScore: result.combinedScore,
      });
    } catch (error: any) {
      return createMCPError(error, 'REPUTATION_BREAKDOWN_ERROR');
    }
  }

  /**
   * Handler: Get Reputation History
   */
  private async handleGetReputationHistory(
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    try {
      // In production, this would query a time-series database
      // For now, return a mock response indicating the feature
      return createMCPToolResult({
        userId: args.userId,
        timeRange: args.timeRange || '90d',
        message: 'Reputation history feature requires time-series database integration',
        note: 'This tool requires historical data storage to be implemented',
      });
    } catch (error: any) {
      return createMCPError(error, 'REPUTATION_HISTORY_ERROR');
    }
  }
}

/**
 * Create Reputation Calculator MCP Tools instance
 */
export function createReputationCalculatorMCPTools(
  calculator?: ReputationCalculator
): ReputationCalculatorMCPTools {
  return new ReputationCalculatorMCPTools(calculator);
}

export default ReputationCalculatorMCPTools;

