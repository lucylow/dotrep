/**
 * Plugin Manager for MCP Server
 * 
 * Manages plugin discovery, registration, and tool routing.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, Tool } from '@modelcontextprotocol/sdk/types.js';
import { BaseMCPPlugin } from './plugins/base-plugin';
import { ReputationScoringPlugin } from './plugins/reputation-scoring-plugin';
import { MarketplacePlugin } from './plugins/marketplace-plugin';
import { DKGClient } from '../dkg-integration/dkg-client';
import { KnowledgeAssetPublisher } from '../dkg-integration/knowledge-asset-publisher';
import { ReputationCalculator } from '../server/_core/reputationCalculator';
import { BotClusterDetector } from '../server/_core/botClusterDetector';

export class MCPPluginManager {
  private server: Server;
  private plugins: Map<string, BaseMCPPlugin> = new Map();
  private toolHandlers: Map<string, (args: any) => Promise<any>> = new Map();

  constructor(server: Server) {
    this.server = server;
  }

  /**
   * Register a plugin
   */
  async registerPlugin(plugin: BaseMCPPlugin): Promise<void> {
    if (!plugin.isEnabled()) {
      console.log(`Plugin ${plugin.getMetadata().name} is disabled, skipping registration`);
      return;
    }

    const metadata = plugin.getMetadata();
    this.plugins.set(metadata.name, plugin);

    // Initialize plugin
    await plugin.initialize();

    // Register tools
    const tools = plugin.getTools();
    for (const tool of tools) {
      this.toolHandlers.set(tool.name, async (args: any) => {
        // Route to appropriate plugin method
        return await this.routeToolCall(tool.name, args, plugin);
      });
    }

    console.log(`Registered plugin: ${metadata.name} (${tools.length} tools)`);
  }

  /**
   * Register core plugins
   */
  async registerCorePlugins(
    dkgClient: DKGClient,
    publisher: KnowledgeAssetPublisher,
    reputationCalculator: ReputationCalculator,
    botDetector: BotClusterDetector,
    x402GatewayUrl?: string
  ): Promise<void> {
    // Register Reputation Scoring Plugin
    const reputationPlugin = new ReputationScoringPlugin(
      this.server,
      dkgClient,
      reputationCalculator,
      botDetector
    );
    await this.registerPlugin(reputationPlugin);

    // Register Marketplace Plugin
    const marketplacePlugin = new MarketplacePlugin(
      this.server,
      dkgClient,
      publisher,
      x402GatewayUrl
    );
    await this.registerPlugin(marketplacePlugin);
  }

  /**
   * Get all tools from all plugins
   */
  getAllTools(): Tool[] {
    const tools: Tool[] = [];
    for (const plugin of this.plugins.values()) {
      tools.push(...plugin.getTools());
    }
    return tools;
  }

  /**
   * Handle tool call
   */
  async handleToolCall(toolName: string, args: any): Promise<any> {
    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      throw new Error(`Tool ${toolName} not found`);
    }

    return await handler(args);
  }

  /**
   * Route tool call to appropriate plugin method
   */
  private async routeToolCall(
    toolName: string,
    args: any,
    plugin: BaseMCPPlugin
  ): Promise<any> {
    if (plugin instanceof ReputationScoringPlugin) {
      switch (toolName) {
        case 'calculate_sybil_resistant_reputation':
          return await plugin.calculateSybilResistantReputation(args);
        case 'compare_reputations':
          return await plugin.compareReputations(args);
        case 'detect_sybil_clusters':
          return await plugin.detectSybilClusters(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    }

    if (plugin instanceof MarketplacePlugin) {
      switch (toolName) {
        case 'find_endorsement_opportunities':
          return await plugin.findEndorsementOpportunities(args);
        case 'execute_endorsement_deal':
          return await plugin.executeEndorsementDeal(args);
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    }

    throw new Error(`Tool ${toolName} not handled by any plugin`);
  }

  /**
   * Get plugin by name
   */
  getPlugin(name: string): BaseMCPPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): BaseMCPPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Cleanup all plugins
   */
  async cleanup(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      await plugin.cleanup();
    }
    this.plugins.clear();
    this.toolHandlers.clear();
  }
}

