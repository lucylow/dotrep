/**
 * Universal MCP Client Utilities
 * 
 * Framework-agnostic utilities for connecting to MCP servers,
 * following MCP standards for client-server communication.
 * 
 * This can be used with any MCP-compatible framework:
 * - Google ADK
 * - OpenAI Agents SDK
 * - Claude Agent SDK
 * - LangChain
 * - Microsoft Agent Framework
 */

import {
  MCPStandardTool,
  MCPStandardToolResult,
  MCPToolExecutionContext,
} from '../types/mcp-standard';

/**
 * MCP Connection Configuration
 */
export interface MCPConnectionConfig {
  url: string;
  transport?: 'stdio' | 'sse' | 'websocket';
  authentication?: {
    type: 'oauth2' | 'bearer' | 'api-key';
    token?: string;
    clientId?: string;
    clientSecret?: string;
  };
  timeout?: number;
  retries?: number;
}

/**
 * MCP Connection
 * Abstract connection interface
 */
export interface MCPConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<MCPStandardTool[]>;
  callTool(name: string, args: Record<string, any>, context?: MCPToolExecutionContext): Promise<MCPStandardToolResult>;
  isConnected(): boolean;
}

/**
 * Universal MCP Client
 * Framework-agnostic client for MCP servers
 */
export class UniversalMCPClient {
  private connections: Map<string, MCPConnection> = new Map();
  private configs: Map<string, MCPConnectionConfig> = new Map();

  /**
   * Connect to an MCP server
   */
  async connectToServer(name: string, config: MCPConnectionConfig): Promise<MCPConnection> {
    this.configs.set(name, config);

    // Create connection based on transport type
    const connection = this.createConnection(config);
    await connection.connect();

    this.connections.set(name, connection);
    return connection;
  }

  /**
   * Create connection based on transport type
   */
  private createConnection(config: MCPConnectionConfig): MCPConnection {
    const transport = config.transport || 'sse';

    switch (transport) {
      case 'sse':
        return new SSEMCPConnection(config);
      case 'websocket':
        return new WebSocketMCPConnection(config);
      case 'stdio':
        return new StdioMCPConnection(config);
      default:
        throw new Error(`Unsupported transport type: ${transport}`);
    }
  }

  /**
   * Execute a tool on a specific server
   */
  async executeTool(
    serverName: string,
    toolName: string,
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    const connection = this.connections.get(serverName);
    if (!connection) {
      throw new Error(`Server ${serverName} is not connected`);
    }

    return await connection.callTool(toolName, args, context);
  }

  /**
   * Route to the best tool for a task
   */
  async routeToBestTool(
    taskDescription: string,
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    // Find capable servers
    const capableServers = await this.findCapableServers(taskDescription);

    if (capableServers.length === 0) {
      throw new Error(`No capable servers found for: ${taskDescription}`);
    }

    // Use the most specific server
    const bestServer = this.rankServersBySpecificity(capableServers, taskDescription);
    return await this.executeTool(bestServer.name, bestServer.tool, args, context);
  }

  /**
   * Find servers capable of handling a task
   */
  private async findCapableServers(taskDescription: string): Promise<Array<{
    name: string;
    tool: string;
    relevance: number;
  }>> {
    const capable: Array<{ name: string; tool: string; relevance: number }> = [];

    for (const [serverName, connection] of this.connections.entries()) {
      try {
        const tools = await connection.listTools();
        
        for (const tool of tools) {
          const relevance = this.calculateToolRelevance(tool, taskDescription);
          if (relevance > 0.3) { // Threshold for relevance
            capable.push({
              name: serverName,
              tool: tool.name,
              relevance,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to list tools from ${serverName}:`, error);
      }
    }

    return capable;
  }

  /**
   * Calculate tool relevance to task description
   */
  private calculateToolRelevance(tool: MCPStandardTool, taskDescription: string): number {
    const description = taskDescription.toLowerCase();
    const toolName = tool.name.toLowerCase();
    const toolDesc = tool.description.toLowerCase();

    let score = 0;

    // Exact name match
    if (description.includes(toolName)) {
      score += 0.5;
    }

    // Description keywords
    const keywords = description.split(/\s+/);
    for (const keyword of keywords) {
      if (toolDesc.includes(keyword)) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  /**
   * Rank servers by specificity
   */
  private rankServersBySpecificity(
    servers: Array<{ name: string; tool: string; relevance: number }>,
    taskDescription: string
  ): { name: string; tool: string } {
    // Sort by relevance (descending)
    servers.sort((a, b) => b.relevance - a.relevance);
    return {
      name: servers[0].name,
      tool: servers[0].tool,
    };
  }

  /**
   * Disconnect from a server
   */
  async disconnectFromServer(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      await connection.disconnect();
      this.connections.delete(name);
      this.configs.delete(name);
    }
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(name =>
      this.disconnectFromServer(name)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Get connected servers
   */
  getConnectedServers(): string[] {
    return Array.from(this.connections.keys());
  }
}

/**
 * SSE MCP Connection
 * Server-Sent Events transport
 */
class SSEMCPConnection implements MCPConnection {
  private config: MCPConnectionConfig;
  private connected: boolean = false;
  private eventSource?: EventSource;

  constructor(config: MCPConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // In production, implement SSE connection
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
    }
    this.connected = false;
  }

  async listTools(): Promise<MCPStandardTool[]> {
    // In production, implement tool listing via SSE
    return [];
  }

  async callTool(
    name: string,
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    // In production, implement tool calling via SSE
    throw new Error('SSE transport not fully implemented');
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * WebSocket MCP Connection
 */
class WebSocketMCPConnection implements MCPConnection {
  private config: MCPConnectionConfig;
  private connected: boolean = false;
  private ws?: WebSocket;

  constructor(config: MCPConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // In production, implement WebSocket connection
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
    }
    this.connected = false;
  }

  async listTools(): Promise<MCPStandardTool[]> {
    // In production, implement tool listing via WebSocket
    return [];
  }

  async callTool(
    name: string,
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    // In production, implement tool calling via WebSocket
    throw new Error('WebSocket transport not fully implemented');
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Stdio MCP Connection
 */
class StdioMCPConnection implements MCPConnection {
  private config: MCPConnectionConfig;
  private connected: boolean = false;

  constructor(config: MCPConnectionConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // In production, implement stdio connection
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listTools(): Promise<MCPStandardTool[]> {
    // In production, implement tool listing via stdio
    return [];
  }

  async callTool(
    name: string,
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    // In production, implement tool calling via stdio
    throw new Error('Stdio transport not fully implemented');
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Create universal MCP client instance
 */
export function createUniversalMCPClient(): UniversalMCPClient {
  return new UniversalMCPClient();
}

export default UniversalMCPClient;

