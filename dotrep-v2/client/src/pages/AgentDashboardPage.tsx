/**
 * AI Agent Dashboard
 * 
 * Comprehensive dashboard for interacting with all 9 specialized AI agents:
 * 
 * Core Agents:
 * - Misinformation Detection: Detect and analyze false claims
 * - Truth Verification: Verify claims with blockchain proofs
 * - Autonomous Transaction: Make reputation-based transaction decisions
 * - Cross-Chain Reasoning: Reason across multiple Polkadot chains
 * 
 * Social Credit Marketplace Agents:
 * - Trust Navigator: Find influencers
 * - Sybil Detective: Detect fake accounts
 * - Contract Negotiator: Negotiate deals
 * - Campaign Optimizer: Optimize performance
 * - Trust Auditor: Verify reputation
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Shield, 
  Handshake, 
  TrendingUp, 
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  DollarSign,
  Bug,
  Scale,
  Zap,
  Network,
  Brain,
  Clock,
  Settings,
  History
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HumanApprovalDialog, type PendingAction, type AgentActionType } from "@/components/HumanApprovalDialog";
import { PendingActionsQueue } from "@/components/PendingActionsQueue";
import { ApprovalHistory, type ApprovalHistoryEntry } from "@/components/ApprovalHistory";
import { ApprovalSettings, type ApprovalSettings as ApprovalSettingsType, defaultSettings } from "@/components/ApprovalSettings";
import { MultiAgentOrchestrator } from "@/components/agents/MultiAgentOrchestrator";
import { ThreeLayerArchitecture } from "@/components/agents/ThreeLayerArchitecture";
import { SocialReputationDashboard } from "@/components/agents/SocialReputationDashboard";
import { CrossChainDataSources } from "@/components/agents/CrossChainDataSources";
import { toast } from "sonner";

export default function AgentDashboardPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "You are an AI assistant helping users interact with the DotRep AI Agent system. You can help with misinformation detection, truth verification, autonomous transactions, cross-chain reasoning, finding influencers, detecting Sybil accounts, negotiating deals, optimizing campaigns, and verifying reputation.",
    },
    {
      role: "assistant",
      content: "👋 Welcome to the AI Agent Dashboard!\n\nI can help you interact with **9 specialized AI agents**:\n\n**Core Agents:**\n🔍 **Misinformation Detection** - Analyze claims for false information\n✅ **Truth Verification** - Verify claims with blockchain proofs\n⚡ **Autonomous Transaction** - Make reputation-based decisions\n🌐 **Cross-Chain Reasoning** - Reason across multiple chains\n\n**Social Credit Marketplace Agents:**\n🔎 **Trust Navigator** - Find influencers matching campaigns\n🛡️ **Sybil Detective** - Detect fake accounts and clusters\n🤝 **Contract Negotiator** - Negotiate endorsement deals\n📈 **Campaign Optimizer** - Optimize campaign performance\n✅ **Trust Auditor** - Verify reputation and generate reports\n\nWhat would you like to do?",
    },
  ]);

  // Human-in-the-loop state
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [selectedAction, setSelectedAction] = useState<PendingAction | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalSettings, setApprovalSettings] = useState<ApprovalSettingsType>(defaultSettings);

  const [claim, setClaim] = useState("");
  const [truthClaim, setTruthClaim] = useState("");
  const [targetAccount, setTargetAccount] = useState("");
  const [action, setAction] = useState("");
  const [crossChainQuery, setCrossChainQuery] = useState("");
  const [influencerQuery, setInfluencerQuery] = useState("");
  const [campaignId, setCampaignId] = useState("");

  // Core Agent queries
  const detectMisinformationQuery = trpc.agents.detectMisinformation.useQuery(
    { claim, context: undefined },
    { enabled: false }
  );

  const verifyTruthQuery = trpc.agents.verifyTruth.useQuery(
    { claim: truthClaim },
    { enabled: false }
  );

  const autonomousDecisionQuery = trpc.agents.makeAutonomousDecision.useQuery(
    { action, targetAccount, amount: undefined, context: undefined },
    { enabled: false }
  );

  const crossChainReasoningQuery = trpc.agents.crossChainReasoning.useQuery(
    { query: crossChainQuery, chains: undefined },
    { enabled: false }
  );

  // Social Credit Agent queries
  const findInfluencersQuery = trpc.agents.findInfluencers.useQuery(
    { query: influencerQuery, limit: 10 },
    { enabled: false }
  );

  const detectSybilQuery = trpc.agents.detectSybilClusters.useQuery(
    { analysisDepth: 3 },
    { enabled: false }
  );

  const optimizeCampaignQuery = trpc.agents.optimizeCampaign.useQuery(
    { campaignId, dealIds: [] },
    { enabled: false }
  );

  const verifyReputationQuery = trpc.agents.verifyReputation.useQuery(
    { did: "did:example:1", includeHistory: false },
    { enabled: false }
  );

  // Helper function to check if action requires approval
  const requiresApproval = (
    actionType: AgentActionType,
    confidence: number,
    riskLevel: "low" | "medium" | "high",
    amount?: number,
    isFirstInteraction?: boolean,
    isCrossChain?: boolean
  ): boolean => {
    const settings = approvalSettings;
    
    // Check action type requirement
    if (!settings.requireApprovalFor[actionType]) {
      return false;
    }
    
    // Check confidence threshold
    if (confidence < settings.confidenceThreshold) {
      return true;
    }
    
    // Check risk level threshold
    const riskLevels = ["low", "medium", "high"];
    const currentRiskIndex = riskLevels.indexOf(riskLevel);
    const thresholdIndex = riskLevels.indexOf(settings.riskLevelThreshold);
    if (currentRiskIndex >= thresholdIndex) {
      return true;
    }
    
    // Check amount threshold
    if (amount !== undefined && amount > settings.amountThreshold) {
      return true;
    }
    
    // Check first interaction
    if (isFirstInteraction && settings.requireApprovalForFirstInteraction) {
      return true;
    }
    
    // Check cross-chain
    if (isCrossChain && settings.requireApprovalForCrossChain) {
      return true;
    }
    
    return false;
  };

  // Helper function to create pending action
  const createPendingAction = (
    type: AgentActionType,
    agentName: string,
    title: string,
    description: string,
    details: Record<string, any>,
    reasoning: string,
    confidence: number,
    riskLevel: "low" | "medium" | "high",
    estimatedImpact?: number
  ): PendingAction => {
    return {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      agentName,
      title,
      description,
      details,
      reasoning,
      confidence,
      riskLevel,
      timestamp: Date.now(),
      estimatedImpact,
      affectedAccounts: details.targetAccount ? [details.targetAccount] : undefined,
      amount: details.amount,
      chain: details.chain,
    };
  };

  const handleApproveAction = (actionId: string, notes?: string) => {
    const action = pendingActions.find((a) => a.id === actionId);
    if (!action) return;

    // Remove from pending
    setPendingActions((prev) => prev.filter((a) => a.id !== actionId));

    // Add to history
    const historyEntry: ApprovalHistoryEntry = {
      id: `history-${Date.now()}`,
      actionId: action.id,
      type: action.type,
      agentName: action.agentName,
      title: action.title,
      decision: "approved",
      timestamp: action.timestamp,
      decisionTime: Date.now() - action.timestamp,
      confidence: action.confidence,
      riskLevel: action.riskLevel,
      notes,
    };
    setApprovalHistory((prev) => [historyEntry, ...prev]);

    // Close dialog
    setApprovalDialogOpen(false);
    setSelectedAction(null);

    toast.success("Action approved", {
      description: `${action.title} has been approved and will be executed.`,
    });

    // In a real implementation, you would call the backend to execute the action
    // await trpc.agents.executeApprovedAction.mutate({ actionId, notes });
  };

  const handleRejectAction = (actionId: string, reason?: string) => {
    const action = pendingActions.find((a) => a.id === actionId);
    if (!action) return;

    // Remove from pending
    setPendingActions((prev) => prev.filter((a) => a.id !== actionId));

    // Add to history
    const historyEntry: ApprovalHistoryEntry = {
      id: `history-${Date.now()}`,
      actionId: action.id,
      type: action.type,
      agentName: action.agentName,
      title: action.title,
      decision: "rejected",
      timestamp: action.timestamp,
      decisionTime: Date.now() - action.timestamp,
      confidence: action.confidence,
      riskLevel: action.riskLevel,
      reason,
    };
    setApprovalHistory((prev) => [historyEntry, ...prev]);

    // Close dialog
    setApprovalDialogOpen(false);
    setSelectedAction(null);

    toast.error("Action rejected", {
      description: `${action.title} has been rejected.`,
    });
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);

    const lowerContent = content.toLowerCase();

    // Route to appropriate agent based on keywords
    if (lowerContent.includes("misinformation") || lowerContent.includes("false") || lowerContent.includes("claim")) {
      // Misinformation Detection
      setClaim(content);
      const result = await detectMisinformationQuery.refetch();
      
      if (result.data?.success) {
        const analysis = result.data.analysis;
        const response = `🔍 **Misinformation Analysis:**\n\n` +
          `**Claim:** ${analysis.claim}\n\n` +
          `**Verdict:** ${analysis.verdict.toUpperCase()}\n` +
          `**Credibility Score:** ${(analysis.credibility * 100).toFixed(1)}%\n` +
          `**Confidence:** ${(analysis.confidence * 100).toFixed(1)}%\n\n` +
          `**Sources Found:** ${analysis.sources.length}\n` +
          (analysis.sources.length > 0 ? analysis.sources.map((s, i) => 
            `${i + 1}. Reputation: ${s.reputation.toFixed(0)}, Status: ${s.verification}`
          ).join("\n") : "") + "\n\n" +
          `**Reasoning:** ${analysis.reasoning}`;
        
        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      }
    } else if (lowerContent.includes("verify truth") || lowerContent.includes("verify claim")) {
      // Truth Verification
      setTruthClaim(content.replace(/verify truth|verify claim/gi, "").trim());
      const result = await verifyTruthQuery.refetch();
      
      if (result.data?.success) {
        const verification = result.data.result;
        const response = `✅ **Truth Verification:**\n\n` +
          `**Claim:** ${verification.claim}\n\n` +
          `**Verified:** ${verification.verified ? "✅ YES" : "❌ NO"}\n` +
          `**Confidence:** ${(verification.confidence * 100).toFixed(1)}%\n\n` +
          `**Evidence Sources:** ${verification.evidence.length}\n` +
          `**Cross-Chain Consensus:** ${(verification.crossChainConsensus.agreement * 100).toFixed(1)}% agreement\n` +
          (verification.blockchainProof ? `**Blockchain Proof:** Block ${verification.blockchainProof.blockNumber}` : "");
        
        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      }
    } else if (lowerContent.includes("autonomous") || lowerContent.includes("transaction") || lowerContent.includes("decision")) {
      // Autonomous Transaction
      if (!targetAccount || !action) {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: "Please provide a target account and action. Use the form on the right to enter details." 
        }]);
        return;
      }
      
      const result = await autonomousDecisionQuery.refetch();
      
      if (result.data?.success) {
        const decision = result.data.decision;
        const needsApproval = requiresApproval(
          "autonomous_transaction",
          decision.confidence,
          decision.riskAssessment.level,
          undefined,
          false,
          decision.crossChainConsiderations?.consensusRequired
        );

        const response = `⚡ **Autonomous Decision:**\n\n` +
          `**Action:** ${decision.action.toUpperCase()}\n` +
          `**Confidence:** ${(decision.confidence * 100).toFixed(1)}%\n` +
          `**Target Reputation:** ${decision.targetReputation.toFixed(0)}\n` +
          `**Risk Level:** ${decision.riskAssessment.level.toUpperCase()}\n` +
          `**Estimated Impact:** ${(decision.estimatedImpact * 100).toFixed(1)}%\n\n` +
          `**Reasoning:** ${decision.reasoning}`;

        if (needsApproval && decision.action === "execute") {
          // Create pending action
          const pendingAction = createPendingAction(
            "autonomous_transaction",
            "Autonomous Transaction Agent",
            `Execute ${action}`,
            `Execute transaction: ${action} to ${targetAccount}`,
            { targetAccount, action, amount: undefined },
            decision.reasoning,
            decision.confidence,
            decision.riskAssessment.level,
            decision.estimatedImpact
          );
          setPendingActions((prev) => [...prev, pendingAction]);

          // Add message with pending action
          setMessages((prev) => [...prev, {
            role: "assistant",
            content: response + `\n\n⚠️ **This action requires your approval before execution.**`,
            pendingAction: {
              id: pendingAction.id,
              type: pendingAction.type,
              title: pendingAction.title,
              requiresApproval: true,
            },
          }]);
        } else {
          setMessages((prev) => [...prev, { role: "assistant", content: response }]);
        }
      }
    } else if (lowerContent.includes("cross-chain") || lowerContent.includes("reasoning") || lowerContent.includes("multiple chains")) {
      // Cross-Chain Reasoning
      setCrossChainQuery(content);
      const result = await crossChainReasoningQuery.refetch();
      
      if (result.data?.success) {
        const reasoning = result.data.result;
        const response = `🌐 **Cross-Chain Reasoning:**\n\n` +
          `**Query:** ${reasoning.query}\n\n` +
          `**Chains Analyzed:** ${reasoning.chainData.length}\n` +
          `**Consensus Agreement:** ${(reasoning.consensus.agreement * 100).toFixed(1)}%\n` +
          `**Confidence:** ${(reasoning.consensus.confidence * 100).toFixed(1)}%\n\n` +
          `**Reasoning:** ${reasoning.reasoning}\n\n` +
          `**Recommendation:** ${reasoning.recommendation}`;
        
        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      }
    } else if (lowerContent.includes("find") || lowerContent.includes("influencer") || lowerContent.includes("search")) {
      // Trust Navigator
      setInfluencerQuery(content);
      const result = await findInfluencersQuery.refetch();
      
      if (result.data?.success && result.data.matches.length > 0) {
        const matches = result.data.matches;
        const response = `🔍 **Found ${matches.length} influencers:**\n\n` +
          matches.map((match, i) => 
            `${i + 1}. **Reputation:** ${match.influencer.reputation.toFixed(0)}\n` +
            `   **Match Score:** ${(match.matchScore * 100).toFixed(1)}%\n` +
            `   **Estimated ROI:** ${match.estimatedROI.toFixed(0)}\n` +
            `   **Recommended Payment:** ${match.recommendedPayment.toFixed(2)} DOT\n` +
            `   **Reasoning:** ${match.reasoning}`
          ).join("\n\n");
        
        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      } else {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: "I couldn't find any influencers matching your criteria. Try adjusting your search terms or requirements." 
        }]);
      }
    } else if (lowerContent.includes("sybil") || lowerContent.includes("fake") || lowerContent.includes("detect")) {
      // Sybil Detective
      const result = await detectSybilQuery.refetch();
      
      if (result.data?.success) {
        const clusters = result.data.clusters;
        const response = clusters.length > 0
          ? `🛡️ **Detected ${clusters.length} Sybil clusters:**\n\n` +
            clusters.map((cluster, i) =>
              `**Cluster ${i + 1}:**\n` +
              `- Risk Level: ${cluster.riskLevel.toUpperCase()}\n` +
              `- Confidence: ${(cluster.confidence * 100).toFixed(1)}%\n` +
              `- Accounts: ${cluster.accounts.length}\n` +
              `- Patterns: ${cluster.patterns.join(", ")}`
            ).join("\n\n")
          : "✅ No Sybil clusters detected. The network appears clean.";
        
        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      }
    } else if (lowerContent.includes("optimize") || lowerContent.includes("campaign") || lowerContent.includes("performance")) {
      // Campaign Optimizer
      if (!campaignId) {
        setMessages((prev) => [...prev, { 
          role: "assistant", 
          content: "Please provide a campaign ID to optimize. You can also enter it in the Campaign ID field above." 
        }]);
        return;
      }
      
      const result = await optimizeCampaignQuery.refetch();
      
      if (result.data?.success) {
        const opt = result.data.optimization;
        const response = `📈 **Campaign Optimization Results:**\n\n` +
          `**Performance:**\n` +
          `- Total Engagement: ${opt.performance.totalEngagement}\n` +
          `- ROI: ${opt.performance.roi.toFixed(2)}%\n\n` +
          `**Recommendations:**\n` +
          opt.recommendations.map(r => `- ${r}`).join("\n") + "\n\n" +
          `**Optimizations:**\n` +
          opt.optimizations.map(o => 
            `- Deal ${o.dealId}: ${o.action} (Expected Impact: ${(o.expectedImpact * 100).toFixed(0)}%)`
          ).join("\n");
        
        setMessages((prev) => [...prev, { role: "assistant", content: response }]);
      }
    } else {
      // General response
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: "I can help you with:\n\n**Core Agents:**\n- Misinformation detection: \"Analyze this claim for misinformation\"\n- Truth verification: \"Verify truth of this claim\"\n- Autonomous decisions: Use the form to enter transaction details\n- Cross-chain reasoning: \"Query reputation across chains\"\n\n**Social Credit Agents:**\n- Finding influencers: \"Find tech influencers with >0.8 reputation\"\n- Detecting Sybils: \"Detect fake accounts\"\n- Optimizing campaigns: \"Optimize campaign performance\"\n- Verifying reputation: \"Verify reputation for did:example:1\"\n\nWhat would you like to do?" 
      }]);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Interact with 9 specialized AI agents for trust, verification, and reputation management
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Sparkles className="w-4 h-4 mr-2" />
          9 Agents Active
        </Badge>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="orchestrator">Orchestrator</TabsTrigger>
          <TabsTrigger value="reputation">Social Reputation</TabsTrigger>
          <TabsTrigger value="architecture">Architecture</TabsTrigger>
          <TabsTrigger value="cross-chain">Cross-Chain</TabsTrigger>
          <TabsTrigger value="demo">Demos</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AIChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                placeholder="Try: 'Analyze this claim for misinformation' or 'Find tech influencers'..."
                suggestedPrompts={[
                  "Analyze this claim for misinformation: 'Bitcoin will reach $1M'",
                  "Verify truth: 'The Earth is round'",
                  "Find tech influencers with >0.8 reputation",
                  "Detect Sybil clusters in the network",
                  "Query reputation across multiple chains",
                ]}
                height="700px"
                onApproveAction={(actionId) => {
                  const action = pendingActions.find((a) => a.id === actionId);
                  if (action) {
                    setSelectedAction(action);
                    setApprovalDialogOpen(true);
                  }
                }}
                onRejectAction={(actionId) => {
                  handleRejectAction(actionId);
                }}
              />
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("Detect Sybil accounts")}
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Detect Sybils
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("Find gaming influencers for product launch")}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Find Influencers
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("Analyze this claim for misinformation")}
                  >
                    <Bug className="w-4 h-4 mr-2" />
                    Check Misinformation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("Verify truth of this claim")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Verify Truth
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-4">Core AI Agents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <AgentCard
                icon={Bug}
                title="Misinformation Detection"
                description="Detect and analyze false claims using DKG knowledge"
                color="red"
                features={[
                  "DKG-powered analysis",
                  "Credibility scoring",
                  "Cross-chain verification",
                  "Source reputation tracking",
                ]}
                category="core"
              />
              <AgentCard
                icon={Scale}
                title="Truth Verification"
                description="Verify claims with blockchain proofs and multi-source evidence"
                color="green"
                features={[
                  "Multi-source evidence",
                  "Blockchain proof generation",
                  "Cross-chain consensus",
                  "Transparency tracking",
                ]}
                category="core"
              />
              <AgentCard
                icon={Zap}
                title="Autonomous Transaction"
                description="Make reputation-based transaction decisions autonomously"
                color="yellow"
                features={[
                  "Reputation-based decisions",
                  "Risk assessment",
                  "Cross-chain impact analysis",
                  "Transparent reasoning",
                ]}
                category="core"
              />
              <AgentCard
                icon={Network}
                title="Cross-Chain Reasoning"
                description="Reason across multiple Polkadot chains using XCM"
                color="purple"
                features={[
                  "Multi-chain queries",
                  "XCM integration",
                  "Consensus calculation",
                  "Shared security",
                ]}
                category="core"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Social Credit Marketplace Agents</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <AgentCard
                icon={Search}
                title="Trust Navigator"
                description="Find influencers matching campaign requirements"
                color="blue"
                features={[
                  "Natural language queries",
                  "Real-time reputation matching",
                  "ROI estimation",
                  "Multi-platform support",
                ]}
                category="social"
              />
              <AgentCard
                icon={Shield}
                title="Sybil Detective"
                description="Automated fake account detection"
                color="red"
                features={[
                  "Cluster analysis",
                  "Behavioral anomaly detection",
                  "Risk scoring",
                  "Visual graph representation",
                ]}
                category="social"
              />
              <AgentCard
                icon={Handshake}
                title="Contract Negotiator"
                description="Autonomous endorsement deal-making"
                color="green"
                features={[
                  "AI-powered negotiation",
                  "Reputation-based pricing",
                  "x402 payment automation",
                  "Performance bonuses",
                ]}
                category="social"
              />
              <AgentCard
                icon={TrendingUp}
                title="Campaign Optimizer"
                description="Endorsement ROI maximization"
                color="purple"
                features={[
                  "Predictive analytics",
                  "Real-time tracking",
                  "A/B testing",
                  "Payment optimization",
                ]}
                category="social"
              />
              <AgentCard
                icon={CheckCircle2}
                title="Trust Auditor"
                description="Continuous reputation verification"
                color="orange"
                features={[
                  "Real-time score updates",
                  "Fraud detection",
                  "Transparency reports",
                  "DKG audit trails",
                ]}
                category="social"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="orchestrator" className="space-y-4">
          <MultiAgentOrchestrator />
        </TabsContent>

        <TabsContent value="reputation" className="space-y-4">
          <SocialReputationDashboard />
        </TabsContent>

        <TabsContent value="architecture" className="space-y-4">
          <ThreeLayerArchitecture />
        </TabsContent>

        <TabsContent value="cross-chain" className="space-y-4">
          <CrossChainDataSources />
        </TabsContent>

        <TabsContent value="demo" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InteractiveDemoCard
              title="Misinformation Detection"
              icon={Bug}
              description="Analyze claims for potential misinformation"
              inputPlaceholder="Enter a claim to analyze..."
              inputValue={claim}
              onInputChange={setClaim}
              onDemoClick={async () => {
                if (!claim) return;
                const result = await detectMisinformationQuery.refetch();
                if (result.data?.success) {
                  // Handle result display
                }
              }}
              demoQuery={detectMisinformationQuery}
              renderResult={(data) => data?.analysis && (
                <div className="space-y-2 text-sm">
                  <div><strong>Verdict:</strong> {data.analysis.verdict.toUpperCase()}</div>
                  <div><strong>Credibility:</strong> {(data.analysis.credibility * 100).toFixed(1)}%</div>
                  <div><strong>Sources:</strong> {data.analysis.sources.length}</div>
                </div>
              )}
            />

            <InteractiveDemoCard
              title="Truth Verification"
              icon={Scale}
              description="Verify claims with blockchain proofs"
              inputPlaceholder="Enter a claim to verify..."
              inputValue={truthClaim}
              onInputChange={setTruthClaim}
              onDemoClick={async () => {
                if (!truthClaim) return;
                const result = await verifyTruthQuery.refetch();
              }}
              demoQuery={verifyTruthQuery}
              renderResult={(data) => data?.result && (
                <div className="space-y-2 text-sm">
                  <div><strong>Verified:</strong> {data.result.verified ? "✅ Yes" : "❌ No"}</div>
                  <div><strong>Confidence:</strong> {(data.result.confidence * 100).toFixed(1)}%</div>
                  <div><strong>Evidence:</strong> {data.result.evidence.length} sources</div>
                </div>
              )}
            />

            <InteractiveDemoCard
              title="Autonomous Transaction"
              icon={Zap}
              description="Make reputation-based transaction decisions"
              inputPlaceholder="Target account address..."
              inputValue={targetAccount}
              onInputChange={setTargetAccount}
              secondaryInputPlaceholder="Action description..."
              secondaryInputValue={action}
              onSecondaryInputChange={setAction}
              onDemoClick={async () => {
                if (!targetAccount || !action) return;
                const result = await autonomousDecisionQuery.refetch();
              }}
              demoQuery={autonomousDecisionQuery}
              renderResult={(data) => data?.decision && (
                <div className="space-y-2 text-sm">
                  <div><strong>Action:</strong> {data.decision.action.toUpperCase()}</div>
                  <div><strong>Confidence:</strong> {(data.decision.confidence * 100).toFixed(1)}%</div>
                  <div><strong>Risk:</strong> {data.decision.riskAssessment.level}</div>
                </div>
              )}
            />

            <InteractiveDemoCard
              title="Cross-Chain Reasoning"
              icon={Network}
              description="Reason across multiple Polkadot chains"
              inputPlaceholder="Enter query for cross-chain reasoning..."
              inputValue={crossChainQuery}
              onInputChange={setCrossChainQuery}
              onDemoClick={async () => {
                if (!crossChainQuery) return;
                const result = await crossChainReasoningQuery.refetch();
              }}
              demoQuery={crossChainReasoningQuery}
              renderResult={(data) => data?.result && (
                <div className="space-y-2 text-sm">
                  <div><strong>Consensus:</strong> {(data.result.consensus.agreement * 100).toFixed(1)}%</div>
                  <div><strong>Confidence:</strong> {(data.result.consensus.confidence * 100).toFixed(1)}%</div>
                  <div><strong>Chains:</strong> {data.result.chainData.length}</div>
                </div>
              )}
            />
          </div>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <PendingActionsQueue
            actions={pendingActions}
            onActionClick={(action) => {
              setSelectedAction(action);
              setApprovalDialogOpen(true);
            }}
            onQuickApprove={(actionId) => {
              const action = pendingActions.find((a) => a.id === actionId);
              if (action) {
                handleApproveAction(actionId);
              }
            }}
            onQuickReject={(actionId) => {
              handleRejectAction(actionId);
            }}
            emptyMessage="No actions pending approval. All agent actions are proceeding automatically."
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ApprovalHistory
            history={approvalHistory}
            onFilterChange={(filter) => {
              // Filter logic can be added here if needed
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <ApprovalSettings
            settings={approvalSettings}
            onSettingsChange={setApprovalSettings}
            onSave={() => {
              // In a real implementation, save to backend/localStorage
              localStorage.setItem("approvalSettings", JSON.stringify(approvalSettings));
              toast.success("Settings saved", {
                description: "Your approval settings have been saved.",
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <HumanApprovalDialog
        action={selectedAction}
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        onApprove={handleApproveAction}
        onReject={handleRejectAction}
      />
    </div>
  );
}

function AgentCard({
  icon: Icon,
  title,
  description,
  color,
  features,
  category,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  features: string[];
  category?: "core" | "social";
}) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-500 bg-blue-50 dark:bg-blue-950",
    red: "border-red-500 bg-red-50 dark:bg-red-950",
    green: "border-green-500 bg-green-50 dark:bg-green-950",
    purple: "border-purple-500 bg-purple-50 dark:bg-purple-950",
    orange: "border-orange-500 bg-orange-50 dark:bg-orange-950",
    yellow: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
  };

  return (
    <Card className={`${colorClasses[color] || ""} hover:shadow-lg transition-shadow`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-xs">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function InteractiveDemoCard({
  title,
  icon: Icon,
  description,
  inputPlaceholder,
  inputValue,
  onInputChange,
  secondaryInputPlaceholder,
  secondaryInputValue,
  onSecondaryInputChange,
  onDemoClick,
  demoQuery,
  renderResult,
}: {
  title: string;
  icon: React.ElementType;
  description: string;
  inputPlaceholder: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  secondaryInputPlaceholder?: string;
  secondaryInputValue?: string;
  onSecondaryInputChange?: (value: string) => void;
  onDemoClick: () => void;
  demoQuery: any;
  renderResult: (data: any) => React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
          />
          {secondaryInputPlaceholder && onSecondaryInputChange && (
            <Input
              placeholder={secondaryInputPlaceholder}
              value={secondaryInputValue || ""}
              onChange={(e) => onSecondaryInputChange(e.target.value)}
            />
          )}
          <Button
            onClick={onDemoClick}
            disabled={demoQuery.isLoading || !inputValue || (secondaryInputPlaceholder && !secondaryInputValue)}
            className="w-full"
          >
            {demoQuery.isLoading ? "Processing..." : "Run Demo"}
          </Button>
        </div>

        {demoQuery.data?.success && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Result:</h4>
            {renderResult(demoQuery.data)}
          </div>
        )}

        {demoQuery.error && (
          <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg text-sm text-red-600 dark:text-red-400">
            Error: {demoQuery.error.message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
