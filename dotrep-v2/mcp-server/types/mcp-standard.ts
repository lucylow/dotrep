/**
 * Model Context Protocol (MCP) Standard Types and Interfaces
 * 
 * This file defines standardized types following the MCP specification
 * to ensure consistent tool definitions, error handling, and resource management
 * across all MCP integrations.
 */

/**
 * Standard MCP Tool Definition
 * Follows MCP specification for tool schema
 */
export interface MCPStandardTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, MCPToolProperty>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * MCP Tool Property Definition
 */
export interface MCPToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: (string | number)[];
  default?: any;
  minimum?: number;
  maximum?: number;
  items?: MCPToolProperty | { type: string };
  properties?: Record<string, MCPToolProperty>;
  format?: string; // e.g., 'uri', 'date-time', 'email'
  examples?: any[];
}

/**
 * Standard MCP Tool Result
 * Consistent result format for all tool executions
 */
export interface MCPStandardToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
    uri?: string;
  }>;
  isError?: boolean;
  metadata?: {
    executionTime?: number;
    tokenUsage?: number;
    cacheHit?: boolean;
    dataProvenance?: {
      source: string;
      timestamp: number;
      verified: boolean;
    };
  };
}

/**
 * MCP Resource Definition
 * For exposing data as resources (not just tools)
 */
export interface MCPStandardResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

/**
 * MCP Prompt Template Definition
 * For reusable prompt templates
 */
export interface MCPStandardPrompt {
  name: string;
  description: string;
  arguments?: {
    type: 'object';
    properties: Record<string, MCPToolProperty>;
    required?: string[];
  };
}

/**
 * MCP Tool Execution Context
 * Provides context for tool execution
 */
export interface MCPToolExecutionContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * MCP Error Response
 * Standardized error format
 */
export interface MCPError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
}

/**
 * MCP Tool Handler Function
 * Standard signature for tool handlers
 */
export type MCPToolHandler = (
  args: Record<string, any>,
  context?: MCPToolExecutionContext
) => Promise<MCPStandardToolResult>;

/**
 * MCP Tool Registry
 * For managing and discovering tools
 */
export interface MCPToolRegistry {
  tools: Map<string, {
    definition: MCPStandardTool;
    handler: MCPToolHandler;
    category?: string;
    tags?: string[];
  }>;
  
  register(
    tool: MCPStandardTool,
    handler: MCPToolHandler,
    options?: { category?: string; tags?: string[] }
  ): void;
  
  getTool(name: string): { definition: MCPStandardTool; handler: MCPToolHandler } | null;
  
  listTools(category?: string, tags?: string[]): MCPStandardTool[];
  
  executeTool(
    name: string,
    args: Record<string, any>,
    context?: MCPToolExecutionContext
  ): Promise<MCPStandardToolResult>;
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  description?: string;
  capabilities: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
  transport?: 'stdio' | 'sse' | 'websocket';
  endpoint?: string;
  authentication?: {
    type: 'oauth2' | 'bearer' | 'api-key';
    config: Record<string, any>;
  };
}

/**
 * MCP Metrics
 * For observability and monitoring
 */
export interface MCPMetrics {
  toolCalls: Map<string, {
    calls: number;
    errors: number;
    averageExecutionTime: number;
    lastCalled: number;
  }>;
  
  trackToolCall(
    toolName: string,
    executionTime: number,
    success: boolean
  ): void;
  
  getPerformanceReport(): {
    mostUsedTools: Array<{ name: string; calls: number }>;
    averageResponseTimes: Map<string, number>;
    errorRates: Map<string, number>;
  };
}

/**
 * Helper function to create standardized tool property
 */
export function createMCPProperty(
  type: MCPToolProperty['type'],
  description: string,
  options?: Partial<MCPToolProperty>
): MCPToolProperty {
  return {
    type,
    description,
    ...options,
  };
}

/**
 * Helper function to create standardized tool
 */
export function createMCPTool(
  name: string,
  description: string,
  properties: Record<string, MCPToolProperty>,
  required?: string[]
): MCPStandardTool {
  return {
    name,
    description,
    inputSchema: {
      type: 'object',
      properties,
      required: required || [],
      additionalProperties: false,
    },
  };
}

/**
 * Helper function to create standardized tool result
 */
export function createMCPToolResult(
  data: any,
  options?: {
    isError?: boolean;
    mimeType?: string;
    metadata?: MCPStandardToolResult['metadata'];
  }
): MCPStandardToolResult {
  const content = typeof data === 'string' 
    ? [{ type: 'text' as const, text: data }]
    : [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }];
  
  if (options?.mimeType) {
    content[0].mimeType = options.mimeType;
  }
  
  return {
    content,
    isError: options?.isError || false,
    metadata: options?.metadata,
  };
}

/**
 * Helper function to create error result
 */
export function createMCPError(
  error: Error | string,
  code?: string,
  retryable?: boolean
): MCPStandardToolResult {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorCode = code || 'TOOL_EXECUTION_ERROR';
  
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          error: {
            code: errorCode,
            message: errorMessage,
            retryable: retryable || false,
          },
        }, null, 2),
      },
    ],
    isError: true,
  };
}

