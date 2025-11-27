/**
 * MCP Tool Registry
 * 
 * Centralized registry for managing MCP tools with discovery, categorization,
 * and execution capabilities. Follows MCP standards for tool management.
 */

import {
  MCPStandardTool,
  MCPStandardToolResult,
  MCPToolHandler,
  MCPToolExecutionContext,
  MCPToolRegistry as IMCPToolRegistry,
} from '../types/mcp-standard';

/**
 * Implementation of MCP Tool Registry
 */
export class MCPToolRegistry implements IMCPToolRegistry {
  public tools: Map<string, {
    definition: MCPStandardTool;
    handler: MCPToolHandler;
    category?: string;
    tags?: string[];
  }> = new Map();

  /**
   * Register a new tool
   */
  register(
    tool: MCPStandardTool,
    handler: MCPToolHandler,
    options?: { category?: string; tags?: string[] }
  ): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting...`);
    }

    this.tools.set(tool.name, {
      definition: tool,
      handler,
      category: options?.category,
      tags: options?.tags || [],
    });
  }

  /**
   * Get tool definition and handler
   */
  getTool(name: string): { definition: MCPStandardTool; handler: MCPToolHandler } | null {
    const tool = this.tools.get(name);
    if (!tool) {
      return null;
    }

    return {
      definition: tool.definition,
      handler: tool.handler,
    };
  }

  /**
   * List all tools, optionally filtered by category or tags
   */
  listTools(category?: string, tags?: string[]): MCPStandardTool[] {
    const tools: MCPStandardTool[] = [];

    for (const tool of this.tools.values()) {
      // Filter by category
      if (category && tool.category !== category) {
        continue;
      }

      // Filter by tags
      if (tags && tags.length > 0) {
        const hasAllTags = tags.every(tag => tool.tags?.includes(tag));
        if (!hasAllTags) {
          continue;
        }
      }

      tools.push(tool.definition);
    }

    return tools;
  }

  /**
   * Execute a tool by name
   */
  async executeTool(
    name: string,
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult> {
    const tool = this.getTool(name);
    
    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'TOOL_NOT_FOUND',
                message: `Tool '${name}' is not registered`,
              },
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    try {
      return await tool.handler(args, context);
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: {
                code: 'TOOL_EXECUTION_ERROR',
                message: error.message || 'Tool execution failed',
                details: error.stack,
              },
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): MCPStandardTool[] {
    return this.listTools(category);
  }

  /**
   * Get tools by tag
   */
  getToolsByTag(tag: string): MCPStandardTool[] {
    const tools: MCPStandardTool[] = [];

    for (const tool of this.tools.values()) {
      if (tool.tags?.includes(tag)) {
        tools.push(tool.definition);
      }
    }

    return tools;
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }
}

/**
 * Global tool registry instance
 */
let globalRegistry: MCPToolRegistry | null = null;

/**
 * Get or create global tool registry
 */
export function getGlobalToolRegistry(): MCPToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new MCPToolRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (useful for testing)
 */
export function resetGlobalToolRegistry(): void {
  globalRegistry = null;
}

