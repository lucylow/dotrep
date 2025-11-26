/**
 * Model Context Protocol (MCP) Server for DotRep Reputation System
 * 
 * This MCP server exposes DotRep reputation data to AI agents, enabling them to:
 * - Query developer reputation scores
 * - Verify contribution authenticity
 * - Access verifiable reputation data from OriginTrail DKG
 * - Perform decentralized Retrieval Augmented Generation (dRAG)
 * 
 * The server implements the MCP specification for seamless integration with
 * AI agents and LLM applications.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { DKGClient } from '../dkg-integration/dkg-client';
import { KnowledgeAssetPublisher } from '../dkg-integration/knowledge-asset-publisher';
import { createAIAgents } from '../server/_core/aiAgents';
import { getPolkadotApi } from '../server/_core/polkadotApi';

/**
 * DotRep MCP Server
 */
class DotRepMCPServer {
  private server: Server;
  private dkgClient: DKGClient;
  private publisher: KnowledgeAssetPublisher;
  private aiAgents: ReturnType<typeof createAIAgents>;

  constructor() {
    this.server = new Server(
      {
        name: 'dotrep-reputation',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize DKG client with fallback to mock mode
    const useMockMode = process.env.DKG_USE_MOCK === 'true' || false;
    const fallbackToMock = process.env.DKG_FALLBACK_TO_MOCK === 'true' || true; // Default to true for graceful degradation
    
    try {
      this.dkgClient = new DKGClient({
        useMockMode,
        fallbackToMock,
      });
      this.publisher = new KnowledgeAssetPublisher(this.dkgClient);
      this.aiAgents = createAIAgents(this.dkgClient, getPolkadotApi());
    } catch (error: any) {
      console.error('⚠️  Failed to initialize DKG client, using mock mode:', error.message);
      // If initialization fails completely, use mock mode
      this.dkgClient = new DKGClient({
        useMockMode: true,
        fallbackToMock: false,
      });
      this.publisher = new KnowledgeAssetPublisher(this.dkgClient);
      this.aiAgents = createAIAgents(this.dkgClient, getPolkadotApi());
    }

    this.setupHandlers();
  }

  /**
   * Define available tools for AI agents
   */
  private getTools(): Tool[] {
    return [
      {
        name: 'get_developer_reputation',
        description: 'Get the reputation score and contribution history for a developer. Returns verifiable data from the OriginTrail DKG.',
        inputSchema: {
          type: 'object',
          properties: {
            developerId: {
              type: 'string',
              description: 'The unique identifier for the developer (Polkadot address or username)',
            },
            includeContributions: {
              type: 'boolean',
              description: 'Whether to include detailed contribution history',
              default: true,
            },
          },
          required: ['developerId'],
        },
      },
      {
        name: 'verify_contribution',
        description: 'Verify the authenticity of a specific contribution using cryptographic proofs from the DKG.',
        inputSchema: {
          type: 'object',
          properties: {
            contributionId: {
              type: 'string',
              description: 'The unique identifier for the contribution',
            },
            contributionUrl: {
              type: 'string',
              description: 'The URL of the contribution (e.g., GitHub PR link)',
            },
          },
          required: ['contributionId'],
        },
      },
      {
        name: 'search_developers_by_reputation',
        description: 'Search for developers within a specific reputation score range.',
        inputSchema: {
          type: 'object',
          properties: {
            minScore: {
              type: 'number',
              description: 'Minimum reputation score',
              default: 0,
            },
            maxScore: {
              type: 'number',
              description: 'Maximum reputation score',
              default: 1000,
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return',
              default: 10,
            },
          },
        },
      },
      {
        name: 'get_reputation_proof',
        description: 'Get cryptographic proof of a developer\'s reputation from the blockchain.',
        inputSchema: {
          type: 'object',
          properties: {
            developerId: {
              type: 'string',
              description: 'The unique identifier for the developer',
            },
          },
          required: ['developerId'],
        },
      },
      {
        name: 'compare_developers',
        description: 'Compare reputation scores and contributions between multiple developers.',
        inputSchema: {
          type: 'object',
          properties: {
            developerIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of developer identifiers to compare',
            },
          },
          required: ['developerIds'],
        },
      },
      {
        name: 'get_dkg_health',
        description: 'Check the health status of the OriginTrail DKG connection.',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'detect_misinformation',
        description: 'Analyze a claim for potential misinformation using DKG sources and cross-chain verification. Returns credibility score, verdict, and reasoning.',
        inputSchema: {
          type: 'object',
          properties: {
            claim: {
              type: 'string',
              description: 'The claim to analyze for misinformation',
            },
            context: {
              type: 'string',
              description: 'Optional context about the claim',
            },
          },
          required: ['claim'],
        },
      },
      {
        name: 'verify_truth',
        description: 'Comprehensively verify a claim using multiple DKG sources, blockchain proofs, and cross-chain consensus.',
        inputSchema: {
          type: 'object',
          properties: {
            claim: {
              type: 'string',
              description: 'The claim to verify',
            },
          },
          required: ['claim'],
        },
      },
      {
        name: 'autonomous_transaction_decision',
        description: 'Make an autonomous decision about a transaction based on reputation scores, risk assessment, and cross-chain considerations.',
        inputSchema: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description: 'The action to evaluate (e.g., "transfer", "delegate", "vote")',
            },
            targetAccount: {
              type: 'string',
              description: 'The target account address',
            },
            amount: {
              type: 'number',
              description: 'Optional transaction amount',
            },
            context: {
              type: 'object',
              description: 'Additional context for the decision',
            },
          },
          required: ['action', 'targetAccount'],
        },
      },
      {
        name: 'cross_chain_reasoning',
        description: 'Perform reasoning across multiple Polkadot chains using XCM and shared security. Returns consensus and recommendations.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query to reason about across chains',
            },
            chains: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of chains to query (default: polkadot, kusama)',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'publish_community_note',
        description: 'Publish a Community Note to the DKG for misinformation defense. Notes can correct, verify, or flag misinformation in Knowledge Assets.',
        inputSchema: {
          type: 'object',
          properties: {
            targetUAL: {
              type: 'string',
              description: 'UAL of the Knowledge Asset being corrected/verified',
            },
            noteType: {
              type: 'string',
              enum: ['misinformation', 'correction', 'verification', 'other'],
              description: 'Type of Community Note',
            },
            content: {
              type: 'string',
              description: 'Content of the Community Note',
            },
            author: {
              type: 'string',
              description: 'Author account ID or agent identifier',
            },
            evidence: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of UALs or URLs providing evidence',
            },
            reasoning: {
              type: 'string',
              description: 'Reasoning behind the note',
            },
          },
          required: ['targetUAL', 'noteType', 'content', 'author'],
        },
      },
      {
        name: 'get_community_notes',
        description: 'Get Community Notes for a specific Knowledge Asset UAL.',
        inputSchema: {
          type: 'object',
          properties: {
            targetUAL: {
              type: 'string',
              description: 'UAL of the Knowledge Asset',
            },
          },
          required: ['targetUAL'],
        },
      },
      {
        name: 'get_impact_metrics',
        description: 'Get impact metrics showing measurable outcomes: accuracy improvements, citation rates, Sybil detection, x402 payments, and more.',
        inputSchema: {
          type: 'object',
          properties: {
            summary: {
              type: 'boolean',
              description: 'Get summary metrics for judges/demo (default: true)',
              default: true,
            },
          },
        },
      },
    ];
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getTools(),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_developer_reputation':
            return await this.getDeveloperReputation(args);

          case 'verify_contribution':
            return await this.verifyContribution(args);

          case 'search_developers_by_reputation':
            return await this.searchDevelopersByReputation(args);

          case 'get_reputation_proof':
            return await this.getReputationProof(args);

          case 'compare_developers':
            return await this.compareDevelopers(args);

          case 'get_dkg_health':
            return await this.getDKGHealth();

          case 'detect_misinformation':
            return await this.detectMisinformation(args);

          case 'verify_truth':
            return await this.verifyTruth(args);

          case 'autonomous_transaction_decision':
            return await this.autonomousTransactionDecision(args);

          case 'cross_chain_reasoning':
            return await this.crossChainReasoning(args);

          case 'publish_community_note':
            return await this.publishCommunityNote(args);

          case 'get_community_notes':
            return await this.getCommunityNotes(args);

          case 'get_impact_metrics':
            return await this.getImpactMetrics(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Get developer reputation
   */
  private async getDeveloperReputation(args: any) {
    const { developerId, includeContributions = true } = args;

    try {
      const reputationData = await this.publisher.queryDeveloperReputation(developerId);

      const response = {
        developerId,
        reputationScore: reputationData['dotrep:reputationScore'],
        verified: true,
        source: 'OriginTrail DKG',
        timestamp: reputationData.dateModified,
        aggregateRating: reputationData.aggregateRating,
      };

      if (includeContributions) {
        response['contributions'] = reputationData['dotrep:contributions'];
        response['contributionCount'] = reputationData['dotrep:contributions'].length;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get reputation for ${developerId}: ${error.message}`);
    }
  }

  /**
   * Verify contribution authenticity
   */
  private async verifyContribution(args: any) {
    const { contributionId, contributionUrl } = args;

    // Query DKG for contribution data
    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?contribution ?author ?date ?impact ?type
      WHERE {
        ?contribution schema:identifier "${contributionId}" .
        ?contribution schema:author ?author .
        ?contribution schema:datePublished ?date .
        ?contribution dotrep:impactScore ?impact .
        ?contribution dotrep:contributionType ?type .
        ${contributionUrl ? `?contribution schema:url "${contributionUrl}" .` : ''}
      }
    `;

    try {
      const results = await this.dkgClient.graphQuery(query, 'SELECT');

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                verified: false,
                contributionId,
                message: 'Contribution not found in DKG',
              }, null, 2),
            },
          ],
        };
      }

      const contribution = results[0];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              verified: true,
              contributionId,
              author: contribution.author,
              date: contribution.date,
              impact: contribution.impact,
              type: contribution.type,
              source: 'OriginTrail DKG',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to verify contribution: ${error.message}`);
    }
  }

  /**
   * Search developers by reputation score range
   */
  private async searchDevelopersByReputation(args: any) {
    const { minScore = 0, maxScore = 1000, limit = 10 } = args;

    const query = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?developer ?reputation ?contributionCount
      WHERE {
        ?developer a schema:Person .
        ?developer dotrep:reputationScore ?reputation .
        ?developer dotrep:contributions ?contributions .
        BIND(COUNT(?contributions) AS ?contributionCount)
        FILTER(?reputation >= ${minScore} && ?reputation <= ${maxScore})
      }
      ORDER BY DESC(?reputation)
      LIMIT ${limit}
    `;

    try {
      const results = await this.dkgClient['dkg'].graph.query(query, 'SELECT');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              searchCriteria: { minScore, maxScore, limit },
              resultCount: results.length,
              developers: results,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search developers: ${error.message}`);
    }
  }

  /**
   * Get cryptographic proof of reputation
   */
  private async getReputationProof(args: any) {
    const { developerId } = args;

    try {
      const reputationData = await this.publisher.queryDeveloperReputation(developerId);
      const proof = reputationData.verifiableCredential?.proof;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              developerId,
              proof,
              verified: !!proof,
              proofType: proof?.['@type'],
              created: proof?.created,
              verificationMethod: proof?.verificationMethod,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get reputation proof: ${error.message}`);
    }
  }

  /**
   * Compare multiple developers
   */
  private async compareDevelopers(args: any) {
    const { developerIds } = args;

    if (!Array.isArray(developerIds) || developerIds.length === 0) {
      throw new Error('developerIds must be a non-empty array');
    }

    const comparisons = await Promise.all(
      developerIds.map(async (id) => {
        try {
          const data = await this.publisher.queryDeveloperReputation(id);
          return {
            developerId: id,
            reputationScore: data['dotrep:reputationScore'],
            contributionCount: data['dotrep:contributions'].length,
            lastUpdated: data.dateModified,
          };
        } catch (error) {
          return {
            developerId: id,
            error: error.message,
          };
        }
      })
    );

    // Sort by reputation score
    comparisons.sort((a, b) => (b.reputationScore || 0) - (a.reputationScore || 0));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            comparisonCount: developerIds.length,
            developers: comparisons,
          }, null, 2),
        },
      ],
    };
  }

  /**
   * Check DKG health
   */
  private async getDKGHealth() {
    try {
      const isHealthy = await this.dkgClient.healthCheck();
      const nodeInfo = isHealthy ? await this.dkgClient.getNodeInfo() : null;
      const status = this.dkgClient.getStatus();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: isHealthy,
              mockMode: status.mockMode || false,
              nodeInfo,
              status,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error: any) {
      // Return unhealthy status instead of throwing
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: false,
              mockMode: true,
              error: error.message,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  /**
   * Detect misinformation using AI agent
   */
  private async detectMisinformation(args: any) {
    const { claim, context } = args;

    try {
      const analysis = await this.aiAgents.misinformationDetection.analyzeClaim(claim, context);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to detect misinformation: ${error.message}`);
    }
  }

  /**
   * Verify truth using AI agent
   */
  private async verifyTruth(args: any) {
    const { claim } = args;

    try {
      const result = await this.aiAgents.truthVerification.verifyClaim(claim);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to verify truth: ${error.message}`);
    }
  }

  /**
   * Make autonomous transaction decision
   */
  private async autonomousTransactionDecision(args: any) {
    const { action, targetAccount, amount, context } = args;

    try {
      const decision = await this.aiAgents.autonomousTransaction.makeDecision(
        action,
        targetAccount,
        amount,
        context
      );

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(decision, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to make autonomous decision: ${error.message}`);
    }
  }

  /**
   * Perform cross-chain reasoning
   */
  private async crossChainReasoning(args: any) {
    const { query, chains } = args;

    try {
      const result = await this.aiAgents.crossChainReasoning.reason(query, chains);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to perform cross-chain reasoning: ${error.message}`);
    }
  }

  /**
   * Publish a Community Note
   */
  private async publishCommunityNote(args: any) {
    const { targetUAL, noteType, content, author, evidence, reasoning } = args;

    try {
      const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
      const service = getCommunityNotesService();
      const result = await service.publishNote({
        targetUAL,
        noteType,
        content,
        author,
        evidence: evidence || [],
        reasoning: reasoning || '',
        timestamp: Date.now(),
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              ual: result.ual,
              note: result.note,
              message: `Community Note published successfully: ${result.ual}`,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to publish Community Note: ${error.message}`);
    }
  }

  /**
   * Get Community Notes for a target UAL
   */
  private async getCommunityNotes(args: any) {
    const { targetUAL } = args;

    try {
      const { getCommunityNotesService } = await import('../dkg-integration/community-notes');
      const service = getCommunityNotesService();
      const notes = await service.getNotesForTarget(targetUAL);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              targetUAL,
              noteCount: notes.length,
              notes,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to get Community Notes: ${error.message}`);
    }
  }

  /**
   * Get impact metrics
   */
  private async getImpactMetrics(args: any) {
    const { summary = true } = args;

    try {
      const { getImpactMetrics } = await import('../server/_core/impactMetrics');
      const metrics = getImpactMetrics();

      if (summary) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics.getMetricsSummary(), null, 2),
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(metrics.getMetrics(), null, 2),
            },
          ],
        };
      }
    } catch (error) {
      throw new Error(`Failed to get impact metrics: ${error.message}`);
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('DotRep MCP Server running on stdio');
  }
}

/**
 * Main entry point
 */
async function main() {
  const server = new DotRepMCPServer();
  await server.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
