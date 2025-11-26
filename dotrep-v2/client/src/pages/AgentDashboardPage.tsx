/**
 * Social Credit Marketplace AI Agent Dashboard
 * 
 * Provides a conversational interface for interacting with the 5 specialized AI agents:
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
import { 
  Search, 
  Shield, 
  Handshake, 
  TrendingUp, 
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  DollarSign
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AgentDashboardPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "You are an AI assistant helping with the Social Credit Marketplace. You can help find influencers, detect Sybil accounts, negotiate deals, optimize campaigns, and verify reputation.",
    },
    {
      role: "assistant",
      content: "👋 Welcome to the Social Credit Marketplace Agent Dashboard!\n\nI can help you with:\n\n🔍 **Trust Navigator** - Find influencers matching your campaign\n🛡️ **Sybil Detective** - Detect fake accounts and clusters\n🤝 **Contract Negotiator** - Negotiate endorsement deals\n📈 **Campaign Optimizer** - Optimize campaign performance\n✅ **Trust Auditor** - Verify reputation and generate reports\n\nWhat would you like to do?",
    },
  ]);

  const [activeAgent, setActiveAgent] = useState<string>("navigator");
  const [influencerQuery, setInfluencerQuery] = useState("");
  const [campaignId, setCampaignId] = useState("");

  // Agent queries
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

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);

    // Parse intent and route to appropriate agent
    const lowerContent = content.toLowerCase();

    if (lowerContent.includes("find") || lowerContent.includes("influencer") || lowerContent.includes("search")) {
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
        content: "I can help you with:\n\n- Finding influencers: \"Find tech influencers with >0.8 reputation\"\n- Detecting Sybils: \"Detect fake accounts\"\n- Optimizing campaigns: \"Optimize campaign performance\"\n- Verifying reputation: \"Verify reputation for did:example:1\"\n\nWhat would you like to do?" 
      }]);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Interact with specialized AI agents for the Social Credit Marketplace
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Sparkles className="w-4 h-4 mr-2" />
          Agent Layer Active
        </Badge>
      </div>

      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat">Conversational Interface</TabsTrigger>
          <TabsTrigger value="agents">Agent Tools</TabsTrigger>
          <TabsTrigger value="dashboard">Trust Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AIChatBox
                messages={messages}
                onSendMessage={handleSendMessage}
                placeholder="Ask me to find influencers, detect Sybils, optimize campaigns..."
                suggestedPrompts={[
                  "Find tech influencers with >0.8 reputation for gadget reviews",
                  "Detect Sybil clusters in the network",
                  "Optimize campaign performance",
                  "Verify reputation for did:example:1",
                ]}
                height="700px"
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
                    onClick={() => handleSendMessage("Find gaming influencers for product launch")}
                  >
                    <Search className="w-4 h-4 mr-2" />
                    Find Influencers
                  </Button>
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
                    onClick={() => handleSendMessage("Show campaign performance")}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Optimize Campaign
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => handleSendMessage("Generate transparency report")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Audit Report
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campaign ID</CardTitle>
                  <CardDescription>Enter campaign ID for optimization</CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    type="text"
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    placeholder="campaign-123"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            />
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-4">
          <TrustDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AgentCard({
  icon: Icon,
  title,
  description,
  color,
  features,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  features: string[];
}) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-500 bg-blue-50 dark:bg-blue-950",
    red: "border-red-500 bg-red-50 dark:bg-red-950",
    green: "border-green-500 bg-green-50 dark:bg-green-950",
    purple: "border-purple-500 bg-purple-50 dark:bg-purple-950",
    orange: "border-orange-500 bg-orange-50 dark:bg-orange-950",
  };

  return (
    <Card className={colorClasses[color] || ""}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1 text-sm">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TrustDashboard() {
  const [selectedDid, setSelectedDid] = useState("did:example:1");
  
  const verifyReputationQuery = trpc.agents.verifyReputation.useQuery(
    { did: selectedDid, includeHistory: false },
    { enabled: !!selectedDid }
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Reputation Verification</CardTitle>
          <CardDescription>Real-time reputation verification</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">DID to Verify</label>
              <input
                type="text"
                value={selectedDid}
                onChange={(e) => setSelectedDid(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md"
                placeholder="did:example:1"
              />
            </div>
            
            {verifyReputationQuery.data?.success && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Current Reputation</span>
                  <Badge variant="outline">
                    {verifyReputationQuery.data.verification.currentReputation.toFixed(0)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Verified</span>
                  {verifyReputationQuery.data.verification.verified ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Audit Trail</h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-1 text-xs">
                      {verifyReputationQuery.data.verification.auditTrail.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span>{entry.action}</span>
                          {entry.verified ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Metrics</CardTitle>
          <CardDescription>Real-time marketplace metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <MetricItem
              label="Active Campaigns"
              value="12"
              icon={TrendingUp}
              trend="+3"
            />
            <MetricItem
              label="Verified Influencers"
              value="1,234"
              icon={CheckCircle2}
              trend="+45"
            />
            <MetricItem
              label="Sybil Detections"
              value="23"
              icon={Shield}
              trend="-5"
            />
            <MetricItem
              label="x402 Payments"
              value="567"
              icon={DollarSign}
              trend="+89"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricItem({
  label,
  value,
  icon: Icon,
  trend,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend: string;
}) {
  const isPositive = trend.startsWith("+");
  
  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-muted-foreground" />
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
      <Badge variant={isPositive ? "default" : "secondary"}>
        {trend}
      </Badge>
    </div>
  );
}

