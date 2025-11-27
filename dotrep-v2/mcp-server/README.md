# MCP Standardization for DotRep

This directory contains standardized MCP (Model Context Protocol) implementations for the DotRep reputation system, following MCP specification standards for AI agent integration.

## 📁 Directory Structure

```
mcp-server/
├── types/
│   └── mcp-standard.ts          # Standardized MCP types and interfaces
├── tools/
│   └── reputation-calculator-mcp.ts  # MCP tools for ReputationCalculator
├── resources/
│   └── reputation-resources.ts  # MCP resources (data sources)
├── prompts/
│   └── reputation-prompts.ts   # MCP prompt templates
├── utils/
│   ├── mcp-tool-registry.ts     # Centralized tool registry
│   ├── mcp-metrics.ts           # Metrics and observability
│   └── universal-mcp-client.ts # Framework-agnostic client utilities
└── plugins/
    └── base-plugin.ts           # Base plugin interface
```

## 🎯 Key Features

### 1. Standardized Tool Definitions
All tools follow MCP specification with:
- Consistent JSON Schema input definitions
- Standardized result formats
- Error handling patterns
- Metadata and provenance tracking

### 2. Tool Registry
Centralized registry for managing tools:
- Tool discovery and categorization
- Tag-based filtering
- Execution tracking
- Performance metrics

### 3. Resources
Expose data as resources (not just tools):
- User reputation profiles
- Reputation snapshots
- Leaderboards
- Network statistics
- Trust graphs

### 4. Prompts
Reusable prompt templates:
- Reputation trend analysis
- User comparison
- Trust assessment
- Reputation explanation
- Sybil risk analysis

### 5. Universal Client
Framework-agnostic utilities for:
- Connecting to MCP servers
- Tool discovery and execution
- Smart routing to best tools
- Multi-server coordination

## 🚀 Usage Examples

### Using Reputation Calculator MCP Tools

```typescript
import { createReputationCalculatorMCPTools } from './tools/reputation-calculator-mcp';
import { ReputationCalculator } from '../server/_core/reputationCalculator';

const calculator = new ReputationCalculator();
const mcpTools = createReputationCalculatorMCPTools(calculator);

// Get tool definitions
const tools = mcpTools.getToolDefinitions();

// Get tool handlers
const handlers = mcpTools.getToolHandlers();

// Execute a tool
const result = await handlers.get('calculate_reputation')!({
  userId: 'did:key:z6Mk...',
  contributions: [...],
  algorithmWeights: {...},
  timeDecayFactor: 0.01,
  includeHighlyTrustedDetermination: true,
});
```

### Using Tool Registry

```typescript
import { getGlobalToolRegistry } from './utils/mcp-tool-registry';
import { createReputationCalculatorMCPTools } from './tools/reputation-calculator-mcp';

const registry = getGlobalToolRegistry();
const mcpTools = createReputationCalculatorMCPTools();

// Register tools
const tools = mcpTools.getToolDefinitions();
const handlers = mcpTools.getToolHandlers();

tools.forEach((tool, index) => {
  const handler = Array.from(handlers.values())[index];
  registry.register(tool, handler, {
    category: 'reputation',
    tags: ['calculation', 'trust'],
  });
});

// List tools by category
const reputationTools = registry.getToolsByCategory('reputation');

// Execute tool
const result = await registry.executeTool('calculate_reputation', {
  userId: 'did:key:z6Mk...',
  contributions: [],
  algorithmWeights: {},
  timeDecayFactor: 0.01,
});
```

### Using Universal MCP Client

```typescript
import { createUniversalMCPClient } from './utils/universal-mcp-client';

const client = createUniversalMCPClient();

// Connect to DKG node MCP server
await client.connectToServer('dkg-node', {
  url: 'http://localhost:9200/mcp',
  transport: 'sse',
  authentication: {
    type: 'oauth2',
    clientId: 'your-client-id',
    clientSecret: 'your-client-secret',
  },
});

// Execute tool
const result = await client.executeTool('dkg-node', 'query_user_reputation', {
  userDID: 'did:key:z6Mk...',
});

// Smart routing
const result = await client.routeToBestTool(
  'Find top creators by reputation',
  { limit: 10 }
);
```

### Using Resources

```typescript
import { createReputationResources } from './resources/reputation-resources';

const resources = createReputationResources();

// List available resources
const availableResources = resources.getResources();

// Read a resource
const userProfile = await resources.readResource('reputation://user/did:key:z6Mk...');
```

### Using Prompts

```typescript
import { createReputationPrompts } from './prompts/reputation-prompts';

const prompts = createReputationPrompts();

// Get available prompts
const availablePrompts = prompts.getPrompts();

// Generate prompt text
const promptText = prompts.generatePrompt('analyze_reputation_trends', {
  timeRange: '30d',
  metrics: ['overall', 'contributions'],
  userId: 'did:key:z6Mk...',
});
```

## 🔌 Framework Integration

### Google ADK

```python
from google.adk.tools.mcp import McpToolset, SseServerParams

toolset = McpToolset.from_server(SseServerParams(
    url="http://localhost:9200/mcp"
))

tools = await toolset.get_tools_async()
agent = LlmAgent(tools=tools)
```

### OpenAI Agents SDK

```javascript
import { MCPServerSse } from '@openai/agents/mcp';

const server = new MCPServerSse({
  url: 'http://localhost:9200/mcp',
  name: 'dotrep-reputation'
});

await server.connect();
const tools = await server.listTools();
```

### Claude Desktop

```json
{
  "mcpServers": {
    "dotrep-reputation": {
      "command": "node",
      "args": ["./dotrep-v2/mcp-server/reputation-mcp.ts"],
      "env": {
        "DKG_NODE_ENV": "production"
      }
    }
  }
}
```

## 📊 Metrics and Observability

```typescript
import { getGlobalMetrics } from './utils/mcp-metrics';

const metrics = getGlobalMetrics();

// Track tool call
metrics.trackToolCall('calculate_reputation', 150, true);

// Get performance report
const report = metrics.getPerformanceReport();
console.log(report.mostUsedTools);
console.log(report.averageResponseTimes);
console.log(report.errorRates);
```

## 🎨 Standardization Benefits

1. **Consistency**: All tools follow the same patterns and interfaces
2. **Interoperability**: Works with any MCP-compatible framework
3. **Discoverability**: Tools are self-documenting with schemas
4. **Observability**: Built-in metrics and monitoring
5. **Extensibility**: Easy to add new tools following the same patterns
6. **Type Safety**: Full TypeScript support with proper types

## 📚 References

- [MCP Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)

