/**
 * Three-Layer Architecture Visualization
 * 
 * Visualizes the Agent-Knowledge-Trust three-layer architecture:
 * - Agent Layer: AI agents with MCP
 * - Knowledge Layer: OriginTrail DKG edge node
 * - Trust Layer: Polkadot Substrate + x402
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Database, 
  Shield, 
  Network, 
  Zap,
  CheckCircle2,
  Activity,
  ArrowDown,
  ArrowUp
} from "lucide-react";

export function ThreeLayerArchitecture() {
  const agentLayer = {
    name: 'Agent Layer',
    description: 'AI Agents with Model Context Protocol (MCP)',
    agents: [
      { name: 'Trust Navigator', status: 'active', queries: 124 },
      { name: 'Sybil Detective', status: 'active', queries: 89 },
      { name: 'Contract Negotiator', status: 'active', queries: 45 },
      { name: 'Campaign Optimizer', status: 'active', queries: 67 },
      { name: 'Trust Auditor', status: 'active', queries: 156 },
    ],
    metrics: {
      totalAgents: 9,
      activeAgents: 9,
      totalQueries: 1247,
      avgResponseTime: '1.2s',
    },
  };

  const knowledgeLayer = {
    name: 'Knowledge Layer',
    description: 'OriginTrail DKG Edge Node with JSON-LD Knowledge Assets',
    features: [
      'Reputation data as verifiable Knowledge Assets',
      'SPARQL queries for reputation insights',
      'Provenance chains for reputation history',
      'MCP integration for AI agent queries',
    ],
    metrics: {
      publishedAssets: 892,
      totalQueries: 1247,
      activeConnections: 3,
      avgQueryTime: '1.2s',
    },
    dkgNode: {
      status: 'connected',
      endpoint: 'https://v6-pegasus-node-02.origin-trail.network:8900',
      blockchain: 'otp:20430',
    },
  };

  const trustLayer = {
    name: 'Trust Layer',
    description: 'Polkadot Substrate + x402 Micropayments',
    features: [
      'On-chain reputation storage',
      'x402 protocol for autonomous payments',
      'Cross-chain reputation via XCM',
      'Sybil-resistant staking mechanisms',
    ],
    metrics: {
      onChainReputations: 1250,
      x402Payments: 456,
      crossChainQueries: 234,
      totalStaked: '125,000 DOT',
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Three-Layer Architecture</h2>
        <p className="text-muted-foreground">
          Agent-Knowledge-Trust architecture for scalable, verifiable social reputation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Layer */}
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Brain className="w-6 h-6 text-blue-500" />
              <CardTitle>{agentLayer.name}</CardTitle>
            </div>
            <CardDescription>{agentLayer.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {agentLayer.agents.map((agent, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{agent.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {agent.queries} queries
                  </Badge>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Agents:</span>
                <span className="font-semibold">{agentLayer.metrics.totalAgents}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active:</span>
                <span className="font-semibold text-green-500">{agentLayer.metrics.activeAgents}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Queries:</span>
                <span className="font-semibold">{agentLayer.metrics.totalQueries}</span>
              </div>
            </div>

            <div className="pt-2">
              <ArrowDown className="w-6 h-6 mx-auto text-blue-500 animate-bounce" />
            </div>
          </CardContent>
        </Card>

        {/* Knowledge Layer */}
        <Card className="border-2 border-purple-500">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-6 h-6 text-purple-500" />
              <CardTitle>{knowledgeLayer.name}</CardTitle>
            </div>
            <CardDescription>{knowledgeLayer.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {knowledgeLayer.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-muted rounded">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">DKG Node:</span>
                <Badge variant={knowledgeLayer.dkgNode.status === 'connected' ? 'default' : 'secondary'}>
                  {knowledgeLayer.dkgNode.status}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {knowledgeLayer.dkgNode.endpoint}
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Published Assets:</span>
                <span className="font-semibold">{knowledgeLayer.metrics.publishedAssets}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Queries:</span>
                <span className="font-semibold">{knowledgeLayer.metrics.totalQueries}</span>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <ArrowUp className="w-6 h-6 mx-auto text-purple-500" />
              <ArrowDown className="w-6 h-6 mx-auto text-purple-500 animate-bounce" />
            </div>
          </CardContent>
        </Card>

        {/* Trust Layer */}
        <Card className="border-2 border-green-500">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-green-500" />
              <CardTitle>{trustLayer.name}</CardTitle>
            </div>
            <CardDescription>{trustLayer.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {trustLayer.features.map((feature, i) => (
                <div key={i} className="flex items-start gap-2 p-2 bg-muted rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">On-Chain Reputations:</span>
                <span className="font-semibold">{trustLayer.metrics.onChainReputations}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">x402 Payments:</span>
                <span className="font-semibold">{trustLayer.metrics.x402Payments}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cross-Chain Queries:</span>
                <span className="font-semibold">{trustLayer.metrics.crossChainQueries}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Staked:</span>
                <span className="font-semibold">{trustLayer.metrics.totalStaked}</span>
              </div>
            </div>

            <div className="pt-2">
              <ArrowUp className="w-6 h-6 mx-auto text-green-500 animate-bounce" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Flow Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Data Flow</CardTitle>
          <CardDescription>How data flows through the three layers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500" />
              <span className="font-medium">Agent queries reputation</span>
            </div>
            <ArrowDown className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-500" />
              <span className="font-medium">DKG returns Knowledge Asset</span>
            </div>
            <ArrowDown className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              <span className="font-medium">Trust layer verifies on-chain</span>
            </div>
            <ArrowDown className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="font-medium">x402 payment executed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

