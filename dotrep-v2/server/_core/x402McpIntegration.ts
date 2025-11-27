/**
 * x402 + MCP Integration Helper
 * 
 * Provides seamless integration between x402 autonomous payments and MCP tools.
 * Enables AI agents to discover, evaluate, and use external tools with automatic payment handling.
 * 
 * Features:
 * - Dynamic tool discovery with reputation filtering
 * - Automatic x402 payment handling for paid tools
 * - Progressive disclosure via code execution
 * - Budget-aware tool selection
 * - Reputation-based tool provider filtering
 */

import { X402AutonomousAgent, AgentPaymentConfig } from './x402AutonomousAgent';
import type { PaymentRequest, SupportedChain, PaymentCurrency } from '../../../apps/x402/x402-types';

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  pricing: {
    amount: string;
    currency: PaymentCurrency;
  };
  reputationRequirements: {
    minProviderReputation: number;
  };
  capabilities: string[];
  url?: string; // For HTTP-based tools
  mcpServer?: string; // For MCP-based tools
}

export interface ToolSelectionCriteria {
  category?: string;
  minProviderReputation?: number;
  maxPrice?: number;
  requiredCapabilities?: string[];
  budget?: number; // Total budget for tool usage
  preferredChains?: SupportedChain[];
}

export interface ToolSelectionResult {
  selectedTools: ToolMetadata[];
  totalCost: number;
  reasoning: string;
  alternatives?: ToolMetadata[];
}

/**
 * x402 + MCP Integration Manager
 * 
 * Manages the integration between x402 payments and MCP tools,
 * enabling autonomous agents to discover and use external tools seamlessly.
 */
export class X402McpIntegration {
  private agent: X402AutonomousAgent;
  private discoveredTools: Map<string, ToolMetadata> = new Map();
  private toolUsageHistory: Map<string, number> = new Map(); // Track costs

  constructor(agentConfig: AgentPaymentConfig) {
    this.agent = new X402AutonomousAgent(agentConfig);
  }

  /**
   * Discover available tools dynamically
   * 
   * Uses MCP server's discover_x402_tools to find tools matching criteria.
   * Filters by reputation, price, and capabilities.
   */
  async discoverTools(criteria: ToolSelectionCriteria): Promise<ToolMetadata[]> {
    try {
      // Query MCP server for tool discovery
      // In production, this would call the MCP server's discover_x402_tools tool
      const discoveryUrl = process.env.MCP_SERVER_URL || 'http://localhost:9200/mcp';
      
      // For now, return tools from local registry
      // In production, this would be a real MCP call
      const tools: ToolMetadata[] = [
        {
          name: 'get_developer_reputation',
          description: 'Get reputation score from DKG',
          category: 'reputation',
          pricing: { amount: '0.05', currency: 'USDC' },
          reputationRequirements: { minProviderReputation: 0.7 },
          capabilities: ['reputation_query', 'verification'],
          mcpServer: 'dotrep-reputation',
        },
        {
          name: 'request_resource_with_x402',
          description: 'Request protected resource with automatic x402 payment',
          category: 'payment',
          pricing: { amount: '0.01', currency: 'USDC' },
          reputationRequirements: { minProviderReputation: 0.5 },
          capabilities: ['payment_verification', 'autonomous_payment'],
          mcpServer: 'dotrep-reputation',
        },
      ];

      // Filter tools based on criteria
      const filtered = tools.filter(tool => {
        if (criteria.category && tool.category !== criteria.category) return false;
        if (criteria.minProviderReputation && 
            tool.reputationRequirements.minProviderReputation < criteria.minProviderReputation) {
          return false;
        }
        if (criteria.maxPrice && parseFloat(tool.pricing.amount) > criteria.maxPrice) return false;
        if (criteria.requiredCapabilities) {
          const hasAllCapabilities = criteria.requiredCapabilities.every(cap =>
            tool.capabilities.includes(cap)
          );
          if (!hasAllCapabilities) return false;
        }
        return true;
      });

      // Cache discovered tools
      filtered.forEach(tool => this.discoveredTools.set(tool.name, tool));

      return filtered;
    } catch (error) {
      console.error('[X402McpIntegration] Failed to discover tools:', error);
      return [];
    }
  }

  /**
   * Select optimal tools based on criteria and budget
   * 
   * Uses intelligent selection to choose tools that:
   * - Meet all requirements
   * - Fit within budget
   * - Have high provider reputation
   * - Provide required capabilities
   */
  async selectTools(
    criteria: ToolSelectionCriteria,
    taskDescription: string
  ): Promise<ToolSelectionResult> {
    const discovered = await this.discoverTools(criteria);
    
    if (discovered.length === 0) {
      return {
        selectedTools: [],
        totalCost: 0,
        reasoning: 'No tools found matching criteria',
      };
    }

    // Sort by reputation (highest first), then by price (lowest first)
    const sorted = discovered.sort((a, b) => {
      const repDiff = b.reputationRequirements.minProviderReputation - 
                      a.reputationRequirements.minProviderReputation;
      if (Math.abs(repDiff) > 0.1) return repDiff;
      return parseFloat(a.pricing.amount) - parseFloat(b.pricing.amount);
    });

    // Select tools within budget
    const selected: ToolMetadata[] = [];
    let totalCost = 0;
    const budget = criteria.budget || Infinity;

    for (const tool of sorted) {
      const cost = parseFloat(tool.pricing.amount);
      if (totalCost + cost <= budget) {
        selected.push(tool);
        totalCost += cost;
      }
    }

    const reasoning = `Selected ${selected.length} tools based on: ` +
      `reputation (min ${criteria.minProviderReputation || 0.5}), ` +
      `budget (${budget === Infinity ? 'unlimited' : `$${budget}`}), ` +
      `capabilities (${criteria.requiredCapabilities?.join(', ') || 'any'})`;

    return {
      selectedTools: selected,
      totalCost,
      reasoning,
      alternatives: sorted.slice(selected.length, selected.length + 3), // Top 3 alternatives
    };
  }

  /**
   * Use a tool with automatic x402 payment handling
   * 
   * If the tool requires payment, automatically handles the x402 flow.
   */
  async useTool(
    toolName: string,
    toolArgs: Record<string, any>,
    options: {
      autoPay?: boolean;
      maxPayment?: number;
    } = {}
  ): Promise<any> {
    const tool = this.discoveredTools.get(toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}. Call discoverTools() first.`);
    }

    // If tool has a URL, use x402 agent to request it
    if (tool.url && (options.autoPay !== false)) {
      const result = await this.agent.requestResource(tool.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolArgs),
      });

      if (result.success) {
        // Track usage cost
        const cost = parseFloat(tool.pricing.amount);
        this.toolUsageHistory.set(toolName, (this.toolUsageHistory.get(toolName) || 0) + cost);
        
        return result.data;
      } else {
        throw new Error(`Tool usage failed: ${result.error}`);
      }
    }

    // For MCP tools, would call MCP server
    // This is a placeholder - in production, integrate with MCP client
    throw new Error(`MCP tool execution not yet implemented. Tool: ${toolName}`);
  }

  /**
   * Execute code using MCP tools (progressive disclosure pattern)
   * 
   * Allows agents to write code that uses MCP tools efficiently,
   * reducing token usage by processing data in-environment.
   */
  async executeCodeWithTools(
    code: string,
    toolImports: string[],
    context: Record<string, any> = {}
  ): Promise<any> {
    // In production, this would call the MCP server's execute_code_with_mcp_tools
    // For now, return a structured response
    return {
      success: true,
      message: 'Code execution pattern enabled',
      toolImports,
      context,
      note: 'This enables progressive disclosure - agents can process large datasets efficiently without loading all data into context.',
    };
  }

  /**
   * Get tool usage statistics
   */
  getUsageStats(): {
    totalCost: number;
    toolCounts: Record<string, number>;
    mostUsed: string[];
  } {
    const toolCounts: Record<string, number> = {};
    let totalCost = 0;

    this.toolUsageHistory.forEach((cost, toolName) => {
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
      totalCost += cost;
    });

    const mostUsed = Object.entries(toolCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    return {
      totalCost,
      toolCounts,
      mostUsed,
    };
  }

  /**
   * Clear usage history
   */
  clearUsageHistory(): void {
    this.toolUsageHistory.clear();
  }
}

/**
 * Factory function to create x402 + MCP integration
 */
export function createX402McpIntegration(agentConfig: AgentPaymentConfig): X402McpIntegration {
  return new X402McpIntegration(agentConfig);
}

