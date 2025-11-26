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

/**
 * DotRep MCP Server
 */
class DotRepMCPServer {
  private server: Server;
  private dkgClient: DKGClient;
  private publisher: KnowledgeAssetPublisher;

  constructor() {
    this.server = new Server(
      {
        name: 'dotrep-reputation',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.dkgClient = new DKGClient();
    this.publisher = new KnowledgeAssetPublisher(this.dkgClient);

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
      const results = await this.dkgClient['dkg'].graph.query(query, 'SELECT');

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

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              healthy: isHealthy,
              nodeInfo,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`DKG health check failed: ${error.message}`);
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
