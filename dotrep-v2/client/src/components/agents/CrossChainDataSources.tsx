/**
 * Cross-Chain Data Sources Visualization
 * 
 * Visualizes AI agents tapping into multiple cross-chain data sources
 * with real-time mock data updates and connection animations.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Network, 
  Database,
  Activity,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Shield,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Play,
  Pause
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChainData {
  chainId: string;
  name: string;
  icon: string;
  color: string;
  status: 'connected' | 'connecting' | 'disconnected';
  blockHeight: number;
  lastUpdate: number;
  dataPoints: {
    type: string;
    value: string;
    timestamp: number;
  }[];
}

interface AgentConnection {
  agentId: string;
  agentName: string;
  chainId: string;
  queryType: string;
  status: 'querying' | 'success' | 'error';
  dataReceived?: any;
  timestamp: number;
}

interface MockDataPoint {
  id: string;
  chain: string;
  type: 'reputation' | 'transaction' | 'identity' | 'stake' | 'governance';
  data: any;
  timestamp: number;
}

const CHAINS: ChainData[] = [
  {
    chainId: 'polkadot',
    name: 'Polkadot',
    icon: '🔴',
    color: 'rgb(230, 0, 122)',
    status: 'connected',
    blockHeight: 18543291,
    lastUpdate: Date.now(),
    dataPoints: []
  },
  {
    chainId: 'kusama',
    name: 'Kusama',
    icon: '🟡',
    color: 'rgb(0, 0, 0)',
    status: 'connected',
    blockHeight: 20345123,
    lastUpdate: Date.now(),
    dataPoints: []
  },
  {
    chainId: 'ethereum',
    name: 'Ethereum',
    icon: '💎',
    color: 'rgb(98, 126, 234)',
    status: 'connected',
    blockHeight: 19876543,
    lastUpdate: Date.now(),
    dataPoints: []
  },
  {
    chainId: 'polygon',
    name: 'Polygon',
    icon: '🟣',
    color: 'rgb(130, 71, 229)',
    status: 'connected',
    blockHeight: 65432109,
    lastUpdate: Date.now(),
    dataPoints: []
  },
  {
    chainId: 'solana',
    name: 'Solana',
    icon: '🟢',
    color: 'rgb(0, 255, 135)',
    status: 'connected',
    blockHeight: 234567890,
    lastUpdate: Date.now(),
    dataPoints: []
  },
  {
    chainId: 'neuroweb',
    name: 'NeuroWeb',
    icon: '🧠',
    color: 'rgb(139, 92, 246)',
    status: 'connected',
    blockHeight: 1234567,
    lastUpdate: Date.now(),
    dataPoints: []
  },
  {
    chainId: 'moonbeam',
    name: 'Moonbeam',
    icon: '🌙',
    color: 'rgb(53, 162, 235)',
    status: 'connected',
    blockHeight: 5432109,
    lastUpdate: Date.now(),
    dataPoints: []
  },
  {
    chainId: 'acala',
    name: 'Acala',
    icon: '🌊',
    color: 'rgb(0, 191, 255)',
    status: 'connected',
    blockHeight: 8765432,
    lastUpdate: Date.now(),
    dataPoints: []
  }
];

const AGENTS = [
  { id: 'trust-navigator', name: 'Trust Navigator', icon: Network, color: 'blue', colorClass: 'text-blue-500' },
  { id: 'sybil-detective', name: 'Sybil Detective', icon: Shield, color: 'red', colorClass: 'text-red-500' },
  { id: 'contract-negotiator', name: 'Contract Negotiator', icon: MessageSquare, color: 'green', colorClass: 'text-green-500' },
  { id: 'campaign-optimizer', name: 'Campaign Optimizer', icon: TrendingUp, color: 'purple', colorClass: 'text-purple-500' },
  { id: 'trust-auditor', name: 'Trust Auditor', icon: CheckCircle2, color: 'orange', colorClass: 'text-orange-500' },
  { id: 'misinformation-detection', name: 'Misinformation Detection', icon: Brain, color: 'yellow', colorClass: 'text-yellow-500' },
  { id: 'truth-verification', name: 'Truth Verification', icon: Database, color: 'cyan', colorClass: 'text-cyan-500' },
  { id: 'cross-chain-reasoning', name: 'Cross-Chain Reasoning', icon: Zap, color: 'pink', colorClass: 'text-pink-500' },
];

const QUERY_TYPES = [
  'reputation_score',
  'transaction_history',
  'identity_verification',
  'stake_amount',
  'governance_votes',
  'cross_chain_attestation',
  'reputation_sync',
  'trust_metrics'
];

export function CrossChainDataSources() {
  const [isActive, setIsActive] = useState(true);
  const [chains, setChains] = useState<ChainData[]>(CHAINS);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [mockData, setMockData] = useState<MockDataPoint[]>([]);
  const [stats, setStats] = useState({
    totalQueries: 0,
    activeConnections: 0,
    dataPointsReceived: 0,
    avgResponseTime: 0
  });

  // Generate mock data
  const generateMockData = (chainId: string): MockDataPoint => {
    const types: MockDataPoint['type'][] = ['reputation', 'transaction', 'identity', 'stake', 'governance'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const dataGenerators = {
      reputation: () => ({
        address: `5${Math.random().toString(36).substr(2, 47)}`,
        score: (Math.random() * 100).toFixed(2),
        context: ['open_source', 'governance', 'development'][Math.floor(Math.random() * 3)],
        lastUpdated: Date.now() - Math.random() * 86400000
      }),
      transaction: () => ({
        txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: `5${Math.random().toString(36).substr(2, 47)}`,
        to: `5${Math.random().toString(36).substr(2, 47)}`,
        amount: (Math.random() * 1000).toFixed(4),
        timestamp: Date.now() - Math.random() * 3600000
      }),
      identity: () => ({
        did: `did:polkadot:${Math.random().toString(36).substr(2, 47)}`,
        verified: Math.random() > 0.3,
        credentials: Math.floor(Math.random() * 5),
        lastVerified: Date.now() - Math.random() * 604800000
      }),
      stake: () => ({
        validator: `5${Math.random().toString(36).substr(2, 47)}`,
        amount: (Math.random() * 10000).toFixed(2),
        era: Math.floor(Math.random() * 1000),
        commission: (Math.random() * 20).toFixed(2)
      }),
      governance: () => ({
        proposalId: Math.floor(Math.random() * 1000),
        voter: `5${Math.random().toString(36).substr(2, 47)}`,
        vote: ['aye', 'nay', 'abstain'][Math.floor(Math.random() * 3)],
        conviction: Math.floor(Math.random() * 7)
      })
    };

    return {
      id: `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      chain: chainId,
      type,
      data: dataGenerators[type](),
      timestamp: Date.now()
    };
  };

  // Simulate agent querying chains
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      // Randomly select an agent and chain
      const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
      const chain = chains[Math.floor(Math.random() * chains.length)];
      const queryType = QUERY_TYPES[Math.floor(Math.random() * QUERY_TYPES.length)];

      // Create connection
      const connection: AgentConnection = {
        agentId: agent.id,
        agentName: agent.name,
        chainId: chain.chainId,
        queryType,
        status: 'querying',
        timestamp: Date.now()
      };

      setConnections(prev => [...prev.slice(-19), connection]);
      setStats(prev => ({ ...prev, totalQueries: prev.totalQueries + 1, activeConnections: prev.activeConnections + 1 }));

      // Simulate query delay
      setTimeout(() => {
        const mockDataPoint = generateMockData(chain.chainId);
        setMockData(prev => [...prev.slice(-49), mockDataPoint]);
        
        setConnections(prev => prev.map(conn => 
          conn.timestamp === connection.timestamp
            ? { ...conn, status: 'success' as const, dataReceived: mockDataPoint.data }
            : conn
        ));

        // Update chain data
        setChains(prev => prev.map(c => 
          c.chainId === chain.chainId
            ? {
                ...c,
                blockHeight: c.blockHeight + Math.floor(Math.random() * 10),
                lastUpdate: Date.now(),
                dataPoints: [...c.dataPoints.slice(-4), {
                  type: queryType,
                  value: JSON.stringify(mockDataPoint.data).substring(0, 50),
                  timestamp: Date.now()
                }]
              }
            : c
        ));

        setStats(prev => ({
          ...prev,
          activeConnections: Math.max(0, prev.activeConnections - 1),
          dataPointsReceived: prev.dataPointsReceived + 1,
          avgResponseTime: (prev.avgResponseTime * (prev.totalQueries - 1) + (Math.random() * 2000 + 500)) / prev.totalQueries
        }));
      }, Math.random() * 2000 + 500);
    }, 1500);

    return () => clearInterval(interval);
  }, [isActive, chains]);

  // Clean up old connections
  useEffect(() => {
    const interval = setInterval(() => {
      const fiveSecondsAgo = Date.now() - 5000;
      setConnections(prev => prev.filter(conn => conn.timestamp > fiveSecondsAgo));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Cross-Chain Data Sources</h2>
          <p className="text-muted-foreground">
            AI agents tapping into multiple blockchain networks for real-time data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsActive(!isActive)}
          >
            {isActive ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setConnections([]);
              setMockData([]);
              setStats({
                totalQueries: 0,
                activeConnections: 0,
                dataPointsReceived: 0,
                avgResponseTime: 0
              });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Queries</p>
                <p className="text-2xl font-bold">{stats.totalQueries}</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-bold text-green-500">{stats.activeConnections}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">{stats.dataPointsReceived}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">{stats.avgResponseTime.toFixed(0)}ms</p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI Agents
            </CardTitle>
            <CardDescription>Active agents querying chains</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {AGENTS.map(agent => {
                  const Icon = agent.icon;
                  const agentConnections = connections.filter(c => c.agentId === agent.id);
                  const activeQueries = agentConnections.filter(c => c.status === 'querying').length;
                  
                  return (
                    <div
                      key={agent.id}
                      className="p-3 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${agent.colorClass}`} />
                          <span className="font-medium text-sm">{agent.name}</span>
                        </div>
                        {activeQueries > 0 && (
                          <Badge variant="default" className="text-xs">
                            {activeQueries} active
                          </Badge>
                        )}
                      </div>
                      {agentConnections.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {agentConnections.slice(-2).map((conn, idx) => (
                            <div key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                              <ArrowRight className="w-3 h-3" />
                              <span className="truncate">{conn.chainId}</span>
                              {conn.status === 'querying' && (
                                <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                              )}
                              {conn.status === 'success' && (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Blockchain Networks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Blockchain Networks
            </CardTitle>
            <CardDescription>Connected chains and data sources</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {chains.map(chain => {
                  const chainConnections = connections.filter(c => c.chainId === chain.chainId);
                  const isActive = chainConnections.some(c => c.status === 'querying');
                  
                  return (
                    <div
                      key={chain.chainId}
                      className={`p-3 border rounded-lg transition-all ${
                        isActive ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{chain.icon}</span>
                          <span className="font-medium text-sm">{chain.name}</span>
                        </div>
                        <Badge
                          variant={chain.status === 'connected' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {chain.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Block: {chain.blockHeight.toLocaleString()}</div>
                        {chain.dataPoints.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="font-medium text-xs">Recent Data:</div>
                            {chain.dataPoints.slice(-2).map((dp, idx) => (
                              <div key={idx} className="truncate pl-2">
                                {dp.type}: {dp.value}...
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {isActive && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
                          <Activity className="w-3 h-3 animate-pulse" />
                          <span>Querying...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Data Stream */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Live Data Stream
            </CardTitle>
            <CardDescription>Real-time data from cross-chain queries</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {mockData.slice().reverse().map((dataPoint) => {
                  const chain = chains.find(c => c.chainId === dataPoint.chain);
                  const typeColors = {
                    reputation: 'text-blue-500',
                    transaction: 'text-green-500',
                    identity: 'text-purple-500',
                    stake: 'text-orange-500',
                    governance: 'text-pink-500'
                  };

                  return (
                    <div
                      key={dataPoint.id}
                      className="p-3 border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{chain?.icon}</span>
                          <Badge variant="outline" className="text-xs">
                            {dataPoint.type}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(dataPoint.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs space-y-1 font-mono">
                        {Object.entries(dataPoint.data).slice(0, 3).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="truncate">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {mockData.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Waiting for data queries...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Active Connections Visualization */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Connections</CardTitle>
            <CardDescription>Real-time agent-to-chain connections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {connections.slice().reverse().slice(0, 10).map((conn, idx) => {
                const agent = AGENTS.find(a => a.id === conn.agentId);
                const chain = chains.find(c => c.chainId === conn.chainId);
                const Icon = agent?.icon || Brain;

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <Icon className="w-4 h-4 text-blue-500" />
                    <span className="font-medium text-sm flex-1">{agent?.name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{chain?.icon} {chain?.name}</span>
                    <Badge
                      variant={
                        conn.status === 'querying'
                          ? 'default'
                          : conn.status === 'success'
                          ? 'default'
                          : 'destructive'
                      }
                      className="text-xs"
                    >
                      {conn.status === 'querying' && (
                        <>
                          <Activity className="w-3 h-3 mr-1 animate-pulse" />
                          Querying
                        </>
                      )}
                      {conn.status === 'success' && (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Success
                        </>
                      )}
                      {conn.status === 'error' && (
                        <>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Error
                        </>
                      )}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-2">
                      {conn.queryType.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

