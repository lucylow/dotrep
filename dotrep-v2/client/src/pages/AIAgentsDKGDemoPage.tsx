/**
 * AI Agents DKG Demo Page
 * 
 * Comprehensive demonstration of:
 * 1. AI Agents querying DKG for reputation data
 * 2. AI Agents verifying reputation data from DKG
 * 3. AI Agents publishing reputation data to DKG
 * 4. Social reputation demonstration with mock data
 * 
 * Uses mock data for clear demonstration purposes
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Search, 
  Upload, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Activity,
  Shield,
  TrendingUp,
  Users,
  Network,
  Zap,
  FileCheck,
  Brain,
  ArrowRight,
  Copy,
  Eye,
  CheckCircle,
  AlertCircle,
  Bot,
  Workflow,
  Link as LinkIcon,
  Blocks,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { 
  mockSocialReputationProfiles,
  mockSocialConnections,
  type SocialReputationProfile 
} from "@/data/socialReputationMockData";
import {
  mockAIAgents,
  mockDKGKnowledgeAssets,
  mockNeuroWebTransactions,
  mockAgentWorkflows,
  mockAgentDKGActions,
  getAIAgent,
  getDKGAsset,
  getNeuroWebTransaction,
  getAgentActions,
  getAgentWorkflow,
  getActiveAgentWorkflows,
  getRecentDKGActions,
  getNeuroWebTransactionsForUAL,
  getVerifiedDKGAssets,
  getAgentStatistics,
  getDKGStatistics,
  getWorkflowStatistics,
  type AIAgent,
  type DKGKnowledgeAsset,
  type NeuroWebTransaction,
  type AgentWorkflow,
  type AgentDKGAction,
} from "@/data/aiAgentsDKGNeuroWebMockData";

// Mock DKG operations
interface DKGQueryResult {
  ual: string;
  queryType: string;
  timestamp: number;
  status: "completed" | "failed" | "in_progress";
  result?: any;
  duration: number;
}

interface DKGPublishResult {
  ual: string;
  developerId: string;
  reputationScore: number;
  timestamp: number;
  status: "published" | "pending" | "failed";
  transactionHash?: string;
}

interface VerificationResult {
  ual: string;
  verified: boolean;
  confidence: number;
  sources: string[];
  blockchainProof?: {
    blockNumber: number;
    transactionHash: string;
  };
  timestamp: number;
}

export default function AIAgentsDKGDemoPage() {
  // Query state
  const [queryUAL, setQueryUAL] = useState("");
  const [querying, setQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState<DKGQueryResult[]>([]);

  // Publish state
  const [publishDeveloperId, setPublishDeveloperId] = useState("");
  const [publishReputationScore, setPublishReputationScore] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResults, setPublishResults] = useState<DKGPublishResult[]>([]);

  // Verify state
  const [verifyUAL, setVerifyUAL] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<VerificationResult[]>([]);

  // Social reputation demo state
  const [selectedProfile, setSelectedProfile] = useState<SocialReputationProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock query DKG operation
  const handleQueryDKG = async () => {
    if (!queryUAL.trim()) {
      toast.error("Please enter a UAL to query");
      return;
    }

    setQuerying(true);

    // Simulate query delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find matching profile or create mock result
    const profile = mockSocialReputationProfiles.find(p => p.ual === queryUAL);
    
    const queryResult: DKGQueryResult = {
      ual: queryUAL,
      queryType: "social_reputation",
      timestamp: Date.now(),
      status: profile ? "completed" : "failed",
      duration: 1800,
      result: profile ? {
        displayName: profile.displayName,
        reputationScore: profile.reputationMetrics.overallScore,
        socialRank: profile.reputationMetrics.socialRank,
        followers: profile.socialMetrics.followerCount,
        engagementRate: profile.socialMetrics.engagementRate,
        sybilRisk: profile.sybilResistance.sybilRisk,
      } : null,
    };

    setQueryResults([queryResult, ...queryResults]);
    setQuerying(false);

    if (profile) {
      toast.success("Query completed successfully!");
      setSelectedProfile(profile);
    } else {
      toast.error("Asset not found in DKG");
    }
  };

  // Mock publish to DKG operation
  const handlePublishToDKG = async () => {
    if (!publishDeveloperId || !publishReputationScore) {
      toast.error("Please fill in all fields");
      return;
    }

    setPublishing(true);

    // Simulate publish delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newUAL = `did:dkg:otp:20430:0x${Math.random().toString(16).slice(2, 42)}`;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    const publishResult: DKGPublishResult = {
      ual: newUAL,
      developerId: publishDeveloperId,
      reputationScore: parseFloat(publishReputationScore),
      timestamp: Date.now(),
      status: "published",
      transactionHash: txHash,
    };

    setPublishResults([publishResult, ...publishResults]);
    setPublishing(false);
    setPublishDeveloperId("");
    setPublishReputationScore("");

    toast.success("Reputation asset published to DKG successfully!");
  };

  // Mock verify DKG operation
  const handleVerifyDKG = async () => {
    if (!verifyUAL.trim()) {
      toast.error("Please enter a UAL to verify");
      return;
    }

    setVerifying(true);

    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    const profile = mockSocialReputationProfiles.find(p => p.ual === verifyUAL);
    
    const verificationResult: VerificationResult = {
      ual: verifyUAL,
      verified: !!profile,
      confidence: profile ? 0.95 : 0.1,
      sources: profile ? [
        "Polkadot blockchain",
        "OriginTrail DKG",
        "Social network analysis",
        "On-chain reputation registry"
      ] : [],
      blockchainProof: profile ? {
        blockNumber: Math.floor(Math.random() * 1000000) + 1000000,
        transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      } : undefined,
      timestamp: Date.now(),
    };

    setVerificationResults([verificationResult, ...verificationResults]);
    setVerifying(false);

    if (profile) {
      toast.success("Verification completed - Asset is verified!");
      setSelectedProfile(profile);
    } else {
      toast.error("Verification failed - Asset not found");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const filteredProfiles = mockSocialReputationProfiles.filter(profile =>
    !searchQuery || 
    profile.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    profile.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agents with OriginTrail DKG & NeuroWeb</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive demonstration of AI agents leveraging OriginTrail DKG (Decentralized Knowledge Graph) 
            with NeuroWeb parachain on Polkadot for verifiable reputation data
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-sm">
            <Brain className="w-4 h-4 mr-2" />
            AI Agents
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Database className="w-4 h-4 mr-2" />
            OriginTrail DKG
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Blocks className="w-4 h-4 mr-2" />
            NeuroWeb Parachain
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="agents">
            <Bot className="w-4 h-4 mr-2" />
            AI Agents
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <Workflow className="w-4 h-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="query">
            <Search className="w-4 h-4 mr-2" />
            Query DKG
          </TabsTrigger>
          <TabsTrigger value="verify">
            <FileCheck className="w-4 h-4 mr-2" />
            Verify Asset
          </TabsTrigger>
          <TabsTrigger value="publish">
            <Upload className="w-4 h-4 mr-2" />
            Publish Asset
          </TabsTrigger>
          <TabsTrigger value="social">
            <Users className="w-4 h-4 mr-2" />
            Social Reputation
          </TabsTrigger>
        </TabsList>

        {/* AI Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {mockAIAgents.map((agent) => (
              <Card key={agent.agentId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{agent.agentName}</CardTitle>
                    <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                      {agent.status}
                    </Badge>
                  </div>
                  <CardDescription>{agent.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <Badge variant="outline">{agent.agentType}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Operations:</span>
                    <span className="font-semibold">{agent.totalOperations.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Success Rate:</span>
                    <span className="font-semibold">{(agent.successRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    {agent.dkgEnabled && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        DKG
                      </Badge>
                    )}
                    {agent.neuroWebConnected && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Blocks className="w-3 h-3" />
                        NeuroWeb
                      </Badge>
                    )}
                  </div>
                  <div className="pt-2">
                    <div className="text-xs text-muted-foreground mb-1">Capabilities:</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <Badge key={cap} variant="outline" className="text-xs">
                          {cap}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Agent Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Agent Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const stats = getAgentStatistics();
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalAgents}</div>
                      <div className="text-sm text-muted-foreground">Total Agents</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.activeAgents}</div>
                      <div className="text-sm text-muted-foreground">Active Agents</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalOperations.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Total Operations</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{(stats.averageSuccessRate * 100).toFixed(1)}%</div>
                      <div className="text-sm text-muted-foreground">Avg Success Rate</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Recent Agent Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Actions</CardTitle>
              <CardDescription>Latest DKG operations performed by AI agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getRecentDKGActions(5).map((action) => {
                  const agent = getAIAgent(action.agentId);
                  return (
                    <div key={action.actionId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-muted-foreground" />
                          <span className="font-semibold">{agent?.agentName || action.agentId}</span>
                          <Badge variant="outline">{action.actionType}</Badge>
                        </div>
                        <Badge variant={action.status === "completed" ? "default" : "secondary"}>
                          {action.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{action.description}</p>
                      {action.output?.ual && (
                        <div className="text-xs font-mono bg-muted p-2 rounded mb-1">
                          UAL: {action.output.ual.slice(0, 50)}...
                        </div>
                      )}
                      {action.output?.txHash && (
                        <div className="text-xs font-mono bg-muted p-2 rounded">
                          TX: {action.output.txHash.slice(0, 50)}...
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(action.timestamp).toLocaleString()} • Duration: {action.duration}ms
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Workflows Tab */}
        <TabsContent value="workflows" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {mockAgentWorkflows.map((workflow) => (
              <Card key={workflow.workflowId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{workflow.workflowName}</CardTitle>
                      <CardDescription>{workflow.description}</CardDescription>
                    </div>
                    <Badge variant={workflow.status === "completed" ? "default" : "secondary"}>
                      {workflow.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Workflow Steps */}
                  <div className="space-y-2">
                    {workflow.steps.map((step, index) => {
                      const agent = getAIAgent(step.agentId);
                      return (
                        <div key={step.stepId} className="flex items-start gap-4">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            step.status === "completed" ? "bg-green-500 text-white" :
                            step.status === "failed" ? "bg-red-500 text-white" :
                            step.status === "running" ? "bg-blue-500 text-white animate-pulse" :
                            "bg-gray-300 text-gray-600"
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold">{step.stepName}</h4>
                              <Badge variant="outline">{step.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Agent: {agent?.agentName || step.agentId}
                            </p>
                            {step.dkgOperationId && (
                              <div className="text-xs text-muted-foreground mb-1">
                                DKG Operation: {step.dkgOperationId}
                              </div>
                            )}
                            {step.neuroWebTxHash && (
                              <div className="text-xs font-mono bg-muted p-1 rounded mb-1">
                                NeuroWeb TX: {step.neuroWebTxHash.slice(0, 42)}...
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {new Date(step.timestamp).toLocaleString()}
                              {step.duration && ` • ${step.duration}ms`}
                            </div>
                          </div>
                          {index < workflow.steps.length - 1 && (
                            <ArrowRight className="absolute left-4 mt-10 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Workflow Results */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm font-semibold mb-2">DKG Assets Created</div>
                      <div className="space-y-1">
                        {workflow.dkgAssetsCreated.map((ual) => (
                          <div key={ual} className="text-xs font-mono bg-muted p-2 rounded flex items-center justify-between">
                            <span className="truncate">{ual}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(ual)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-2">NeuroWeb Transactions</div>
                      <div className="space-y-1">
                        {workflow.neuroWebTransactions.map((txHash) => {
                          const tx = getNeuroWebTransaction(txHash);
                          return (
                            <div key={txHash} className="text-xs font-mono bg-muted p-2 rounded flex items-center justify-between">
                              <div className="flex-1">
                                <div className="truncate">{txHash.slice(0, 30)}...</div>
                                {tx && (
                                  <div className="text-muted-foreground">
                                    Block: {tx.blockNumber} • ParaID: {tx.paraId}
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(txHash)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Started: {new Date(workflow.startedAt).toLocaleString()}
                    {workflow.completedAt && ` • Completed: ${new Date(workflow.completedAt).toLocaleString()}`}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Workflow Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5" />
                Workflow Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const stats = getWorkflowStatistics();
                return (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalWorkflows}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.completedWorkflows}</div>
                      <div className="text-sm text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.runningWorkflows}</div>
                      <div className="text-sm text-muted-foreground">Running</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalDKGAssetsCreated}</div>
                      <div className="text-sm text-muted-foreground">DKG Assets</div>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{stats.totalNeuroWebTransactions}</div>
                      <div className="text-sm text-muted-foreground">NeuroWeb TXs</div>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Query DKG Tab */}
        <TabsContent value="query" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Query Reputation from DKG
                </CardTitle>
                <CardDescription>
                  AI agents can query the DKG to retrieve reputation data using UALs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    UAL (Uniform Asset Locator)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="did:dkg:otp:20430:0x1234..."
                      value={queryUAL}
                      onChange={(e) => setQueryUAL(e.target.value)}
                      className="font-mono"
                    />
                    {queryUAL && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(queryUAL)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Try: {mockSocialReputationProfiles[0]?.ual}
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleQueryDKG}
                  disabled={querying || !queryUAL}
                >
                  {querying ? (
                    <>
                      <Activity className="mr-2 w-4 h-4 animate-spin" />
                      Querying DKG...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 w-4 h-4" />
                      Query Asset
                    </>
                  )}
                </Button>

                {/* Latest Query Result */}
                {queryResults.length > 0 && queryResults[0].status === "completed" && (
                  <Card className="bg-green-50 dark:bg-green-950 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Query Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {queryResults[0].result && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-sm text-muted-foreground">Profile</div>
                              <div className="font-bold">{queryResults[0].result.displayName}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Reputation Score</div>
                              <div className="font-bold">
                                {(queryResults[0].result.reputationScore * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Social Rank</div>
                              <div className="font-bold">
                                {(queryResults[0].result.socialRank * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Followers</div>
                              <div className="font-bold">
                                {(queryResults[0].result.followers / 1000).toFixed(0)}K
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Engagement Rate</div>
                              <div className="font-bold">
                                {(queryResults[0].result.engagementRate * 100).toFixed(2)}%
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Sybil Risk</div>
                              <Badge variant={queryResults[0].result.sybilRisk < 0.2 ? "default" : "destructive"}>
                                {(queryResults[0].result.sybilRisk * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {queryResults.length > 0 && queryResults[0].status === "failed" && (
                  <Card className="bg-red-50 dark:bg-red-950 border-red-200">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="w-5 h-5" />
                        <span>Asset not found in DKG</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Query History */}
            <Card>
              <CardHeader>
                <CardTitle>Query History</CardTitle>
                <CardDescription>Recent DKG queries by AI agents</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {queryResults.slice(0, 5).map((query, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Database className="w-4 h-4 text-muted-foreground" />
                          <code className="text-xs font-mono">
                            {query.ual.slice(0, 30)}...
                          </code>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(query.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge variant={query.status === "completed" ? "default" : "destructive"}>
                        {query.status}
                      </Badge>
                    </div>
                  ))}
                  {queryResults.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No queries yet. Try querying an asset above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available DKG Assets with NeuroWeb Anchors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Available DKG Knowledge Assets
              </CardTitle>
              <CardDescription>
                DKG assets anchored on NeuroWeb parachain with blockchain verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockDKGKnowledgeAssets.map((asset) => {
                  const neuroWebTx = getNeuroWebTransaction(asset.neuroWebAnchor.transactionHash);
                  return (
                    <div key={asset.ual} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{asset.title}</h4>
                            <Badge variant="outline">{asset.assetType}</Badge>
                            <Badge variant={asset.verificationStatus === "verified" ? "default" : "secondary"}>
                              {asset.verificationStatus}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{asset.description}</p>
                          <div className="text-xs font-mono bg-muted p-2 rounded mb-2">
                            UAL: {asset.ual}
                          </div>
                          {asset.developerId && (
                            <div className="text-xs text-muted-foreground mb-2">
                              Developer: {asset.developerId.slice(0, 30)}...
                            </div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQueryUAL(asset.ual);
                            toast.info("UAL copied to query field");
                          }}
                        >
                          <Search className="w-4 h-4 mr-2" />
                          Query
                        </Button>
                      </div>
                      
                      {/* NeuroWeb Anchor Information */}
                      <div className="pt-3 border-t space-y-2">
                        <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                          <Blocks className="w-4 h-4" />
                          NeuroWeb Blockchain Anchor
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Block Number:</span>
                            <div className="font-mono">{asset.neuroWebAnchor.blockNumber.toLocaleString()}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">ParaID:</span>
                            <div className="font-semibold">{asset.neuroWebAnchor.paraId}</div>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Transaction Hash:</span>
                            <div className="font-mono bg-muted p-1 rounded mt-1 truncate">
                              {asset.neuroWebAnchor.transactionHash}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Chain ID:</span>
                            <div className="font-semibold">{asset.neuroWebAnchor.chainId}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Anchored:</span>
                            <div>{new Date(asset.neuroWebAnchor.anchorTimestamp).toLocaleString()}</div>
                          </div>
                        </div>
                        {neuroWebTx && (
                          <div className="mt-2 pt-2 border-t">
                            <div className="text-xs text-muted-foreground">
                              Gas Used: {neuroWebTx.gasUsed?.toLocaleString()} • 
                              Status: <Badge variant="outline" className="ml-1">{neuroWebTx.status}</Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Agent Behavior Demo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Agent Query Process
              </CardTitle>
              <CardDescription>
                How AI agents query the DKG for reputation data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Agent Receives Query Request</h4>
                    <p className="text-sm text-muted-foreground">
                      AI agent receives a request to query reputation data for a UAL
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Connect to DKG Edge Node</h4>
                    <p className="text-sm text-muted-foreground">
                      Agent connects to OriginTrail DKG Edge Node and submits SPARQL query
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Retrieve Knowledge Asset</h4>
                    <p className="text-sm text-muted-foreground">
                      DKG returns structured reputation data in JSON-LD format with full provenance
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Return Results</h4>
                    <p className="text-sm text-muted-foreground">
                      Agent processes and returns reputation data with confidence scores
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verify Asset Tab */}
        <TabsContent value="verify" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5" />
                  Verify DKG Asset
                </CardTitle>
                <CardDescription>
                  AI agents verify the authenticity and integrity of reputation data from DKG
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    UAL to Verify
                  </label>
                  <Input
                    placeholder="did:dkg:otp:20430:0x1234..."
                    value={verifyUAL}
                    onChange={(e) => setVerifyUAL(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Try: {mockSocialReputationProfiles[0]?.ual}
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleVerifyDKG}
                  disabled={verifying || !verifyUAL}
                >
                  {verifying ? (
                    <>
                      <Activity className="mr-2 w-4 h-4 animate-spin" />
                      Verifying Asset...
                    </>
                  ) : (
                    <>
                      <Shield className="mr-2 w-4 h-4" />
                      Verify Asset
                    </>
                  )}
                </Button>

                {/* Latest Verification Result */}
                {verificationResults.length > 0 && (
                  <Card className={verificationResults[0].verified 
                    ? "bg-green-50 dark:bg-green-950 border-green-200" 
                    : "bg-red-50 dark:bg-red-950 border-red-200"
                  }>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {verificationResults[0].verified ? (
                          <>
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Verification Successful
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 text-red-600" />
                            Verification Failed
                          </>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {verificationResults[0].verified ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <div className="text-sm text-muted-foreground">Verification Status</div>
                              <Badge variant="default">Verified</Badge>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Confidence</div>
                              <div className="font-bold">
                                {(verificationResults[0].confidence * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                          {verificationResults[0].blockchainProof && (
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Blockchain Proof</div>
                              <div className="text-xs font-mono bg-muted p-2 rounded">
                                Block: {verificationResults[0].blockchainProof.blockNumber}
                              </div>
                              <div className="text-xs font-mono bg-muted p-2 rounded mt-1">
                                TX: {verificationResults[0].blockchainProof.transactionHash.slice(0, 42)}...
                              </div>
                            </div>
                          )}
                          <div>
                            <div className="text-sm text-muted-foreground mb-2">Verification Sources</div>
                            <div className="space-y-1">
                              {verificationResults[0].sources.map((source, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  {source}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-600">
                          Asset could not be verified. It may not exist in the DKG or blockchain.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Verification History */}
            <Card>
              <CardHeader>
                <CardTitle>Verification History</CardTitle>
                <CardDescription>Recent asset verifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {verificationResults.slice(0, 5).map((verify, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs font-mono">
                          {verify.ual.slice(0, 30)}...
                        </code>
                        <Badge variant={verify.verified ? "default" : "destructive"}>
                          {verify.verified ? "Verified" : "Failed"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {(verify.confidence * 100).toFixed(1)}% • {new Date(verify.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  {verificationResults.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No verifications yet. Try verifying an asset above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                AI Agent Verification Process
              </CardTitle>
              <CardDescription>
                How AI agents verify reputation data from DKG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Retrieve Asset from DKG</h4>
                    <p className="text-sm text-muted-foreground">
                      Agent queries DKG using UAL to retrieve the Knowledge Asset
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Check Blockchain Anchoring</h4>
                    <p className="text-sm text-muted-foreground">
                      Verify content hash is anchored on Polkadot/NeuroWeb blockchain
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Validate Data Integrity</h4>
                    <p className="text-sm text-muted-foreground">
                      Check cryptographic signatures and data structure compliance
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Return Verification Result</h4>
                    <p className="text-sm text-muted-foreground">
                      Agent returns verification status with confidence score and proof
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Publish Asset Tab */}
        <TabsContent value="publish" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Publish to DKG
                </CardTitle>
                <CardDescription>
                  AI agents publish reputation data to DKG as verifiable Knowledge Assets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Developer ID / Address
                  </label>
                  <Input
                    placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                    value={publishDeveloperId}
                    onChange={(e) => setPublishDeveloperId(e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reputation Score (0-1000)
                  </label>
                  <Input
                    type="number"
                    placeholder="850"
                    value={publishReputationScore}
                    onChange={(e) => setPublishReputationScore(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handlePublishToDKG}
                  disabled={publishing || !publishDeveloperId || !publishReputationScore}
                >
                  {publishing ? (
                    <>
                      <Activity className="mr-2 w-4 h-4 animate-spin" />
                      Publishing to DKG...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 w-4 h-4" />
                      Publish to DKG
                    </>
                  )}
                </Button>

                {/* Latest Publish Result */}
                {publishResults.length > 0 && publishResults[0].status === "published" && (
                  <Card className="bg-green-50 dark:bg-green-950 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        Published Successfully
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">UAL</div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono bg-muted p-2 rounded flex-1">
                              {publishResults[0].ual}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(publishResults[0].ual)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {publishResults[0].transactionHash && (
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Transaction Hash</div>
                            <code className="text-xs font-mono bg-muted p-2 rounded block">
                              {publishResults[0].transactionHash}
                            </code>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="text-sm text-muted-foreground">Reputation Score</div>
                            <div className="font-bold">{publishResults[0].reputationScore}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Published</div>
                            <div className="text-sm">
                              {new Date(publishResults[0].timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Publish History */}
            <Card>
              <CardHeader>
                <CardTitle>Publish History</CardTitle>
                <CardDescription>Recently published assets</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {publishResults.slice(0, 5).map((publish, index) => (
                    <div
                      key={index}
                      className="p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-xs font-mono">
                          {publish.ual.slice(0, 30)}...
                        </code>
                        <Badge variant={publish.status === "published" ? "default" : "secondary"}>
                          {publish.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Score: {publish.reputationScore}</div>
                        <div>{new Date(publish.timestamp).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  ))}
                  {publishResults.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No published assets yet. Try publishing above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Publish Process */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                AI Agent Publishing Process
              </CardTitle>
              <CardDescription>
                How AI agents publish reputation data to DKG
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Prepare Knowledge Asset</h4>
                    <p className="text-sm text-muted-foreground">
                      Agent converts reputation data to JSON-LD format following W3C standards
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Publish to DKG Edge Node</h4>
                    <p className="text-sm text-muted-foreground">
                      Submit Knowledge Asset to OriginTrail DKG network via Edge Node
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Blockchain Anchoring</h4>
                    <p className="text-sm text-muted-foreground">
                      Content hash is anchored on Polkadot/NeuroWeb for tamper-proof verification
                    </p>
                  </div>
                </div>
                <ArrowRight className="ml-4 text-muted-foreground" />
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">Receive UAL</h4>
                    <p className="text-sm text-muted-foreground">
                      Agent receives Uniform Asset Locator (UAL) for the published asset
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Reputation Tab */}
        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Social Reputation Demonstration
              </CardTitle>
              <CardDescription>
                Browse social reputation profiles with DKG integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search by name, username, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Profile List */}
            <div className="space-y-4">
              {filteredProfiles.map((profile) => (
                <Card
                  key={profile.did}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedProfile?.did === profile.did ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedProfile(
                    selectedProfile?.did === profile.did ? null : profile
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                        {profile.displayName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-lg">{profile.displayName}</h3>
                            <p className="text-sm text-muted-foreground">{profile.username}</p>
                          </div>
                          <Badge variant="outline">
                            {(profile.reputationMetrics.overallScore * 100).toFixed(0)}%
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {profile.platforms.slice(0, 3).map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <div className="text-muted-foreground">Followers</div>
                            <div className="font-bold">{(profile.socialMetrics.followerCount / 1000).toFixed(0)}K</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Engagement</div>
                            <div className="font-bold">{(profile.socialMetrics.engagementRate * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Campaigns</div>
                            <div className="font-bold">{profile.campaignsParticipated}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Selected Profile Details */}
            {selectedProfile && (
              <Card className="sticky top-4 h-fit">
                <CardHeader>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-3xl font-bold">
                      {selectedProfile.displayName.charAt(0)}
                    </div>
                    <div>
                      <CardTitle>{selectedProfile.displayName}</CardTitle>
                      <CardDescription>{selectedProfile.username}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Reputation Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Overall Score</div>
                        <div className="font-bold">
                          {(selectedProfile.reputationMetrics.overallScore * 100).toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Social Rank</div>
                        <div className="font-bold">
                          {(selectedProfile.reputationMetrics.socialRank * 100).toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Economic Stake</div>
                        <div className="font-bold">
                          {(selectedProfile.reputationMetrics.economicStake * 100).toFixed(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Endorsement Quality</div>
                        <div className="font-bold">
                          {(selectedProfile.reputationMetrics.endorsementQuality * 100).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Social Metrics</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-muted-foreground">Followers</div>
                        <div className="font-bold">
                          {selectedProfile.socialMetrics.followerCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Following</div>
                        <div className="font-bold">
                          {selectedProfile.socialMetrics.followingCount.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Engagement Rate</div>
                        <div className="font-bold">
                          {(selectedProfile.socialMetrics.engagementRate * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Total Posts</div>
                        <div className="font-bold">
                          {selectedProfile.socialMetrics.totalPosts.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Sybil Resistance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sybil Risk</span>
                        <Badge variant={selectedProfile.sybilResistance.sybilRisk < 0.2 ? "default" : "secondary"}>
                          {(selectedProfile.sybilResistance.sybilRisk * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connection Diversity</span>
                        <span className="font-bold">
                          {(selectedProfile.sybilResistance.connectionDiversity * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Specialties</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.specialties.map((specialty) => (
                        <Badge key={specialty} variant="outline">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-semibold">Total Earnings</span>
                      <span className="text-xl font-bold text-green-600">
                        ${selectedProfile.totalEarnings.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {selectedProfile.campaignsParticipated} campaigns participated
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">DKG UAL</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-muted p-2 rounded flex-1 break-all">
                        {selectedProfile.ual}
                      </code>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedProfile.ual)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => {
                        setQueryUAL(selectedProfile.ual);
                        toast.info("UAL copied to Query tab");
                      }}
                    >
                      <Search className="w-4 h-4 mr-2" />
                      Query This Asset
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => {
                        setVerifyUAL(selectedProfile.ual);
                        toast.info("UAL copied to Verify tab");
                      }}
                    >
                      <FileCheck className="w-4 h-4 mr-2" />
                      Verify This Asset
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!selectedProfile && (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Select a profile to view detailed information
                </CardContent>
              </Card>
            )}
          </div>

          {/* Social Graph Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="w-5 h-5" />
                Social Graph Overview
              </CardTitle>
              <CardDescription>
                Network connections and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{mockSocialReputationProfiles.length}</div>
                  <div className="text-sm text-muted-foreground">Total Profiles</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{mockSocialConnections.length}</div>
                  <div className="text-sm text-muted-foreground">Connections</div>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {mockSocialReputationProfiles.reduce((sum, p) => sum + p.campaignsParticipated, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Campaigns</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

