/**
 * Base Plugin Interface for MCP Server
 * 
 * All MCP plugins must implement this interface to be discoverable
 * and integrated into the MCP server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface MCPPluginConfig {
  name: string;
  version: string;
  description: string;
  enabled?: boolean;
}

export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Base class for all MCP plugins
 */
export abstract class BaseMCPPlugin {
  protected server: Server;
  protected config: MCPPluginConfig;

  constructor(server: Server, config: MCPPluginConfig) {
    this.server = server;
    this.config = {
      enabled: true,
      ...config,
    };
  }

  /**
   * Get plugin metadata
   */
  getMetadata(): MCPPluginConfig {
    return this.config;
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled === true;
  }

  /**
   * Get all tools exposed by this plugin
   */
  abstract getTools(): Tool[];

  /**
   * Initialize the plugin (register tools, setup handlers, etc.)
   */
  abstract initialize(): Promise<void> | void;

  /**
   * Cleanup resources when plugin is disabled
   */
  async cleanup(): Promise<void> {
    // Override in subclasses if needed
  }
}

