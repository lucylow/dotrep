/**
 * Multi-Agent Orchestrator Component
 * 
 * Enables coordination between multiple AI agents for complex workflows.
 * Integrates with DKG edge node for knowledge layer queries and social reputation analysis.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Network, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity,
  Brain,
  Database,
  Shield,
  TrendingUp,
  MessageSquare,
  Zap
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface AgentTask {
  taskId: string;
  agentId: string;
  agentName: string;
  taskType: 'query' | 'reasoning' | 'verification' | 'publish' | 'social_reputation';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  input: any;
  result?: any;
  startedAt?: number;
  completedAt?: number;
  dkgQuery?: {
    ual?: string;
    queryType: string;
    timestamp: number;
  };
}

export interface AgentWorkflow {
  workflowId: string;
  name: string;
  description: string;
  tasks: AgentTask[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

export function MultiAgentOrchestrator() {
  const [workflows, setWorkflows] = useState<AgentWorkflow[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<AgentWorkflow | null>(null);
  const [agentStatus, setAgentStatus] = useState<Record<string, {
    isActive: boolean;
    taskCount: number;
    successRate: number;
    avgResponseTime: number;
  }>>({});

  // Agent definitions
  const agents = [
    { id: 'trust-navigator', name: 'Trust Navigator', icon: Network, color: 'blue' },
    { id: 'sybil-detective', name: 'Sybil Detective', icon: Shield, color: 'red' },
    { id: 'contract-negotiator', name: 'Contract Negotiator', icon: MessageSquare, color: 'green' },
    { id: 'campaign-optimizer', name: 'Campaign Optimizer', icon: TrendingUp, color: 'purple' },
    { id: 'trust-auditor', name: 'Trust Auditor', icon: CheckCircle2, color: 'orange' },
    { id: 'misinformation-detection', name: 'Misinformation Detection', icon: Brain, color: 'yellow' },
    { id: 'truth-verification', name: 'Truth Verification', icon: Database, color: 'cyan' },
  ];

  // Initialize agent status
  useEffect(() => {
    const status: Record<string, any> = {};
    agents.forEach(agent => {
      status[agent.id] = {
        isActive: true,
        taskCount: Math.floor(Math.random() * 20),
        successRate: 0.85 + Math.random() * 0.15,
        avgResponseTime: 500 + Math.random() * 1000,
      };
    });
    setAgentStatus(status);
  }, []);

  const createSocialReputationWorkflow = async () => {
    const workflowId = `workflow-${Date.now()}`;
    const workflow: AgentWorkflow = {
      workflowId,
      name: 'Social Reputation Analysis',
      description: 'Multi-agent analysis of social reputation using DKG queries',
      status: 'pending',
      createdAt: Date.now(),
      tasks: [
        {
          taskId: `task-${Date.now()}-1`,
          agentId: 'trust-navigator',
          agentName: 'Trust Navigator',
          taskType: 'social_reputation',
          status: 'pending',
          input: { query: 'Find influencers with high social reputation', limit: 10 },
        },
        {
          taskId: `task-${Date.now()}-2`,
          agentId: 'sybil-detective',
          agentName: 'Sybil Detective',
          taskType: 'verification',
          status: 'pending',
          input: { analysisDepth: 3 },
        },
        {
          taskId: `task-${Date.now()}-3`,
          agentId: 'trust-auditor',
          agentName: 'Trust Auditor',
          taskType: 'verification',
          status: 'pending',
          input: { includeHistory: true },
        },
      ],
    };

    setWorkflows([workflow, ...workflows]);
    setActiveWorkflow(workflow);
    
    // Execute workflow
    await executeWorkflow(workflow);
  };

  const executeWorkflow = async (workflow: AgentWorkflow) => {
    workflow.status = 'running';
    setActiveWorkflow({ ...workflow });

    for (const task of workflow.tasks) {
      task.status = 'in_progress';
      task.startedAt = Date.now();
      setActiveWorkflow({ ...workflow });

      // Simulate agent execution with DKG integration
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

      // Simulate DKG query
      if (task.taskType === 'social_reputation') {
        task.dkgQuery = {
          ual: `did:dkg:otp:20430:0x${Math.random().toString(16).substr(2, 40)}`,
          queryType: 'reputation_graph',
          timestamp: Date.now(),
        };
      }

      task.status = 'completed';
      task.completedAt = Date.now();
      task.result = {
        success: true,
        data: generateMockResult(task),
      };

      // Update agent status
      const agent = agentStatus[task.agentId];
      if (agent) {
        setAgentStatus({
          ...agentStatus,
          [task.agentId]: {
            ...agent,
            taskCount: agent.taskCount + 1,
            successRate: Math.min(1, agent.successRate + 0.01),
          },
        });
      }

      setActiveWorkflow({ ...workflow });
    }

    workflow.status = 'completed';
    workflow.completedAt = Date.now();
    setActiveWorkflow(null);
    toast.success(`Workflow "${workflow.name}" completed successfully!`);
  };

  const generateMockResult = (task: AgentTask): any => {
    switch (task.taskType) {
      case 'social_reputation':
        return {
          matches: [
            { did: 'did:example:1', reputation: 0.89, matchScore: 0.92 },
            { did: 'did:example:2', reputation: 0.85, matchScore: 0.88 },
          ],
          dkgQueries: 3,
          totalNodes: 1250,
        };
      case 'verification':
        return {
          verified: true,
          confidence: 0.92,
          clusters: task.agentId === 'sybil-detective' ? 2 : 0,
        };
      default:
        return { success: true };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Multi-Agent Orchestrator</h2>
          <p className="text-muted-foreground">
            Coordinate multiple AI agents for complex workflows with DKG integration
          </p>
        </div>
        <Button onClick={createSocialReputationWorkflow}>
          <Play className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
      </div>

      <Tabs defaultValue="agents" className="space-y-4">
        <TabsList>
          <TabsTrigger value="agents">Agent Status</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="dkg">DKG Integration</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => {
              const status = agentStatus[agent.id] || {
                isActive: false,
                taskCount: 0,
                successRate: 0,
                avgResponseTime: 0,
              };
              const Icon = agent.icon;

              return (
                <Card key={agent.id} className={status.isActive ? 'border-2 border-primary' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                      </div>
                      <Badge variant={status.isActive ? 'default' : 'secondary'}>
                        {status.isActive ? 'Active' : 'Idle'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tasks:</span>
                      <span className="font-semibold">{status.taskCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Success Rate:</span>
                      <span className="font-semibold">{(status.successRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Avg Response:</span>
                      <span className="font-semibold">{status.avgResponseTime.toFixed(0)}ms</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          {activeWorkflow && (
            <Card className="border-2 border-primary">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{activeWorkflow.name}</CardTitle>
                    <CardDescription>{activeWorkflow.description}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    <Activity className="w-3 h-3 mr-1" />
                    Running
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeWorkflow.tasks.map(task => (
                  <div
                    key={task.taskId}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {task.status === 'completed' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="w-5 h-5 text-blue-500 animate-spin" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <div className="font-semibold">{task.agentName}</div>
                        <div className="text-sm text-muted-foreground">{task.taskType}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {task.dkgQuery && (
                        <Badge variant="outline" className="mr-2">
                          <Database className="w-3 h-3 mr-1" />
                          DKG Query
                        </Badge>
                      )}
                      {task.status === 'completed' && task.completedAt && task.startedAt && (
                        <span>{(task.completedAt - task.startedAt)}ms</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold">Workflow History</h3>
            {workflows.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No workflows yet. Create a new workflow to get started.
                </CardContent>
              </Card>
            ) : (
              workflows.map(workflow => (
                <Card key={workflow.workflowId}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{workflow.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {workflow.tasks.length} tasks • {workflow.status}
                        </div>
                      </div>
                      <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
                        {workflow.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="dkg" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DKG Edge Node Integration</CardTitle>
              <CardDescription>
                Real-time queries to OriginTrail DKG for social reputation data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Queries</div>
                  <div className="text-2xl font-bold">1,247</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Published Assets</div>
                  <div className="text-2xl font-bold">892</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Active Connections</div>
                  <div className="text-2xl font-bold">3</div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Avg Query Time</div>
                  <div className="text-2xl font-bold">1.2s</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Recent DKG Queries</h4>
                <div className="space-y-2">
                  {[
                    { type: 'reputation_graph', ual: 'did:dkg:otp:20430:0x1234...', time: '2s ago' },
                    { type: 'social_rank', ual: 'did:dkg:otp:20430:0x5678...', time: '5s ago' },
                    { type: 'sybil_analysis', ual: 'did:dkg:otp:20430:0x9abc...', time: '12s ago' },
                  ].map((query, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        <span className="text-sm">{query.type}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{query.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

