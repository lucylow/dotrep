/**
 * MCP Metrics Collector
 * 
 * Collects and tracks metrics for MCP tool usage, performance, and errors.
 * Provides observability for AI agent interactions.
 */

import {
  MCPMetrics as IMCPMetrics,
} from '../types/mcp-standard';

/**
 * Implementation of MCP Metrics
 */
export class MCPMetrics implements IMCPMetrics {
  public toolCalls: Map<string, {
    calls: number;
    errors: number;
    averageExecutionTime: number;
    lastCalled: number;
    totalExecutionTime: number;
  }> = new Map();

  /**
   * Track a tool call
   */
  trackToolCall(
    toolName: string,
    executionTime: number,
    success: boolean
  ): void {
    const existing = this.toolCalls.get(toolName) || {
      calls: 0,
      errors: 0,
      averageExecutionTime: 0,
      lastCalled: 0,
      totalExecutionTime: 0,
    };

    existing.calls++;
    existing.lastCalled = Date.now();
    existing.totalExecutionTime += executionTime;
    
    if (!success) {
      existing.errors++;
    }

    // Calculate rolling average
    existing.averageExecutionTime = existing.totalExecutionTime / existing.calls;

    this.toolCalls.set(toolName, existing);
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    mostUsedTools: Array<{ name: string; calls: number }>;
    averageResponseTimes: Map<string, number>;
    errorRates: Map<string, number>;
  } {
    const mostUsedTools: Array<{ name: string; calls: number }> = [];
    const averageResponseTimes = new Map<string, number>();
    const errorRates = new Map<string, number>();

    for (const [toolName, metrics] of this.toolCalls.entries()) {
      mostUsedTools.push({
        name: toolName,
        calls: metrics.calls,
      });

      averageResponseTimes.set(toolName, metrics.averageExecutionTime);
      
      const errorRate = metrics.calls > 0 
        ? metrics.errors / metrics.calls 
        : 0;
      errorRates.set(toolName, errorRate);
    }

    // Sort by calls (descending)
    mostUsedTools.sort((a, b) => b.calls - a.calls);

    return {
      mostUsedTools,
      averageResponseTimes,
      errorRates,
    };
  }

  /**
   * Get metrics for a specific tool
   */
  getToolMetrics(toolName: string): {
    calls: number;
    errors: number;
    averageExecutionTime: number;
    errorRate: number;
    lastCalled: number;
  } | null {
    const metrics = this.toolCalls.get(toolName);
    if (!metrics) {
      return null;
    }

    return {
      calls: metrics.calls,
      errors: metrics.errors,
      averageExecutionTime: metrics.averageExecutionTime,
      errorRate: metrics.calls > 0 ? metrics.errors / metrics.calls : 0,
      lastCalled: metrics.lastCalled,
    };
  }

  /**
   * Reset metrics for a tool
   */
  resetToolMetrics(toolName: string): void {
    this.toolCalls.delete(toolName);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.toolCalls.clear();
  }

  /**
   * Export metrics as JSON
   */
  export(): string {
    const report = this.getPerformanceReport();
    return JSON.stringify({
      toolCalls: Array.from(this.toolCalls.entries()).map(([name, metrics]) => ({
        name,
        ...metrics,
        errorRate: metrics.calls > 0 ? metrics.errors / metrics.calls : 0,
      })),
      summary: {
        totalTools: this.toolCalls.size,
        mostUsedTools: report.mostUsedTools.slice(0, 10),
        totalCalls: report.mostUsedTools.reduce((sum, tool) => sum + tool.calls, 0),
      },
    }, null, 2);
  }
}

/**
 * Global metrics instance
 */
let globalMetrics: MCPMetrics | null = null;

/**
 * Get or create global metrics instance
 */
export function getGlobalMetrics(): MCPMetrics {
  if (!globalMetrics) {
    globalMetrics = new MCPMetrics();
  }
  return globalMetrics;
}

/**
 * Reset global metrics (useful for testing)
 */
export function resetGlobalMetrics(): void {
  globalMetrics = null;
}

