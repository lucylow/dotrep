/**
 * MCP Client Integration Utilities
 * 
 * Provides programmatic access to MCP servers for AI agents and applications.
 * Supports both direct server connections and client-server patterns.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

export interface MCPClientConfig {
  serverUrl?: string; // For SSE transport
  command?: string; // For stdio transport
  args?: string[]; // For stdio transport
  transport?: 'sse' | 'stdio';
  timeout?: number;
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

export interface EndorsementOpportunity {
  campaignId: string;
  brandDid: string;
  title: string;
  description: string;
  compensation: string;
  matchScore: number;
  estimatedROI: number;
}

/**
 * MCP Client for Social Credit Marketplace
 */
export class SocialCreditMCPClient {
  private client: Client;
  private config: MCPClientConfig;
  private connected: boolean = false;

  constructor(config: MCPClientConfig) {
    this.config = {
      transport: 'sse',
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Initialize and connect to MCP server
   */
  async initialize(): Promise<void> {
    if (this.connected) {
      return;
    }

    try {
      let transport;
      if (this.config.transport === 'stdio' && this.config.command) {
        transport = new StdioClientTransport({
          command: this.config.command,
          args: this.config.args || [],
        });
      } else if (this.config.transport === 'sse' && this.config.serverUrl) {
        transport = new SSEClientTransport(
          new URL(this.config.serverUrl)
        );
      } else {
        throw new Error('Invalid transport configuration');
      }

      this.client = new Client(
        {
          name: 'social-credit-mcp-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await this.client.connect(transport);
      this.connected = true;
    } catch (error: any) {
      throw new Error(`Failed to connect to MCP server: ${error.message}`);
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<any[]> {
    if (!this.connected) {
      await this.initialize();
    }

    const response = await this.client.listTools();
    return response.tools;
  }

  /**
   * Call an MCP tool
   */
  async callTool(toolName: string, arguments: Record<string, any>): Promise<any> {
    if (!this.connected) {
      await this.initialize();
    }

    const response = await this.client.callTool({
      name: toolName,
      arguments,
    });

    return response;
  }

  /**
   * Analyze user reputation
   */
  async analyzeUserReputation(
    userDid: string,
    graphData?: any,
    economicStake?: number
  ): Promise<ReputationAnalysis> {
    const result = await this.callTool('calculate_sybil_resistant_reputation', {
      userDid,
      graphData: graphData || (await this.getUserGraphData(userDid)),
      economicStake,
    });

    return JSON.parse(result.content[0].text);
  }

  /**
   * Find best campaigns for influencer
   */
  async findBestCampaigns(
    influencerDid: string,
    preferences?: {
      categories?: string[];
      minCompensation?: number;
      maxSybilRisk?: number;
    }
  ): Promise<EndorsementOpportunity[]> {
    const result = await this.callTool('find_endorsement_opportunities', {
      influencerDid,
      preferences,
    });

    const data = JSON.parse(result.content[0].text);
    return data.opportunities || [];
  }

  /**
   * Execute trusted deal
   */
  async executeTrustedDeal(
    campaignId: string,
    influencerDid: string,
    terms: {
      compensation: string;
      deliverables: string[];
      timeline: { start: string; end: string };
    }
  ): Promise<any> {
    const result = await this.callTool('execute_endorsement_deal', {
      campaignId,
      influencerDid,
      terms,
    });

    return JSON.parse(result.content[0].text);
  }

  /**
   * Detect Sybil clusters
   */
  async detectSybilClusters(
    graphData: any,
    sensitivity: number = 0.7
  ): Promise<any> {
    const result = await this.callTool('detect_sybil_clusters', {
      graphData,
      sensitivity,
    });

    return JSON.parse(result.content[0].text);
  }

  /**
   * Compare user reputations
   */
  async compareReputations(
    userDids: string[],
    metrics?: string[]
  ): Promise<any> {
    const result = await this.callTool('compare_reputations', {
      userDids,
      metrics,
    });

    return JSON.parse(result.content[0].text);
  }

  /**
   * Get user graph data (mock - replace with actual implementation)
   */
  private async getUserGraphData(userDid: string): Promise<any> {
    // In production, query DKG or graph service
    return {
      nodes: [{ id: userDid }],
      edges: [],
    };
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.connected && this.client) {
      await this.client.close();
      this.connected = false;
    }
  }
}

/**
 * Create MCP client instance
 */
export function createMCPClient(config: MCPClientConfig): SocialCreditMCPClient {
  return new SocialCreditMCPClient(config);
}

/**
 * Example usage function
 */
export async function demonstrateReputationAnalysis() {
  const client = createMCPClient({
    serverUrl: 'http://localhost:9200/mcp',
    transport: 'sse',
  });

  await client.initialize();

  // Analyze a user's reputation
  const analysis = await client.analyzeUserReputation(
    'did:dkg:user:influencer_123'
  );

  console.log('Reputation Analysis:', {
    score: analysis.reputationScore,
    sybilRisk: analysis.sybilRisk,
    confidence: analysis.confidence,
  });

  // If reputation is good, find matching campaigns
  if (analysis.reputationScore > 0.7 && analysis.sybilRisk < 0.3) {
    const opportunities = await client.findBestCampaigns(
      'did:dkg:user:influencer_123',
      {
        categories: ['technology', 'gaming'],
        minCompensation: 100,
      }
    );

    // Execute the top opportunity
    if (opportunities.length > 0) {
      const topOpportunity = opportunities[0];
      const dealResult = await client.executeTrustedDeal(
        topOpportunity.campaignId,
        'did:dkg:user:influencer_123',
        {
          compensation: topOpportunity.compensation,
          deliverables: ['content_creation', 'social_media_posts'],
          timeline: {
            start: new Date().toISOString(),
            end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }
      );

      console.log('Deal executed:', dealResult);
    }
  }

  await client.disconnect();
}

