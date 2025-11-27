import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Network, 
  Search, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ArrowRight,
  Globe,
  Shield,
  Zap,
  Activity
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useDotRepWallet } from "@/_core/hooks/useDotRepWallet";
import { toast } from "sonner";
import { 
  mockCrossChainMessages,
  mockChainConnections,
  mockCrossChainReputations,
  type CrossChainMessage,
  type ChainConnection
} from "@/data/enhancedMockData";

interface ChainInfo {
  id: string;
  name: string;
  status: "connected" | "pending" | "disconnected";
  reputationScore?: number;
  lastQuery?: number;
  supportedQueries: string[];
}

interface CrossChainQuery {
  id: string;
  targetChain: string;
  targetAccount: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  initiatedAt: number;
  completedAt?: number;
  result?: {
    score: number;
    percentile: number;
    verifiedContributions: number;
  };
}

export default function XcmGatewayPage() {
  const [queryChain, setQueryChain] = useState("");
  const [queryAccount, setQueryAccount] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const { connectionResult } = useDotRepWallet();
  
  const [verifyChain, setVerifyChain] = useState("");
  const [verifyAccount, setVerifyAccount] = useState("");
  const [verifyTxHash, setVerifyTxHash] = useState("");
  
  const [crossChainMessages] = useState<CrossChainMessage[]>(mockCrossChainMessages);
  const [chainConnections] = useState<ChainConnection[]>(mockChainConnections);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const initiateQueryMutation = trpc.polkadot.xcm.initiateQuery.useMutation({
    onSuccess: () => {
      toast.success("XCM query initiated successfully!");
      setIsQuerying(false);
    },
    onError: (error) => {
      toast.error(`Query failed: ${error.message}`);
      setIsQuerying(false);
    },
  });

  const verifyCrossChainMutation = trpc.polkadot.xcm.verifyCrossChain.useMutation({
    onSuccess: (data) => {
      toast.success("Cross-chain verification completed!");
      setVerifyChain("");
      setVerifyAccount("");
      setVerifyTxHash("");
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const supportedChains: ChainInfo[] = [
    {
      id: "polkadot",
      name: "Polkadot Relay Chain",
      status: "connected",
      reputationScore: 8500,
      lastQuery: Date.now() - 3600000,
      supportedQueries: ["ReputationScore", "ContributionCount", "VerificationStatus"]
    },
    {
      id: "kusama",
      name: "Kusama Relay Chain",
      status: "connected",
      reputationScore: 7200,
      lastQuery: Date.now() - 7200000,
      supportedQueries: ["ReputationScore", "ContributionCount"]
    },
    {
      id: "asset-hub",
      name: "Asset Hub",
      status: "connected",
      reputationScore: 9100,
      lastQuery: Date.now() - 1800000,
      supportedQueries: ["ReputationScore", "IdentityVerification"]
    },
    {
      id: "moonbeam",
      name: "Moonbeam",
      status: "pending",
      supportedQueries: ["ReputationScore"]
    },
    {
      id: "acala",
      name: "Acala",
      status: "disconnected",
      supportedQueries: ["ReputationScore", "ContributionCount"]
    }
  ];

  const recentQueries: CrossChainQuery[] = [
    {
      id: "1",
      targetChain: "polkadot",
      targetAccount: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      status: "completed",
      initiatedAt: Date.now() - 300000,
      completedAt: Date.now() - 240000,
      result: {
        score: 8500,
        percentile: 92,
        verifiedContributions: 156
      }
    },
    {
      id: "2",
      targetChain: "asset-hub",
      targetAccount: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      status: "in_progress",
      initiatedAt: Date.now() - 60000
    },
    {
      id: "3",
      targetChain: "kusama",
      targetAccount: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      status: "failed",
      initiatedAt: Date.now() - 1200000
    }
  ];

  const handleQuery = async () => {
    if (!queryChain || !queryAccount) {
      toast.error("Please select a chain and enter an account address");
      return;
    }
    if (!connectionResult?.address) {
      toast.error("Please connect your wallet first");
      return;
    }
    setIsQuerying(true);
    try {
      await initiateQueryMutation.mutateAsync({
        signer: connectionResult.address,
        targetChain: queryChain,
        targetAccount: queryAccount,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getStatusBadge = (status: ChainInfo["status"] | CrossChainQuery["status"]) => {
    const variants = {
      connected: "bg-green-100 text-green-800 border-green-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      disconnected: "bg-red-100 text-red-800 border-red-300",
      completed: "bg-green-100 text-green-800 border-green-300",
      in_progress: "bg-blue-100 text-blue-800 border-blue-300",
      failed: "bg-red-100 text-red-800 border-red-300"
    };
    return (
      <Badge className={variants[status]}>
        {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  const getStatusIcon = (status: ChainInfo["status"]) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case "disconnected":
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Network className="w-8 h-8 text-[#6C3CF0]" />
              <h1 className="text-4xl font-extrabold text-[#131313]">XCM Gateway</h1>
            </div>
            <p className="text-[#4F4F4F]">
              Query and verify reputation scores across the Polkadot ecosystem using Cross-Consensus Messaging
            </p>
          </div>

          <Tabs defaultValue="query" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="query">Query Reputation</TabsTrigger>
              <TabsTrigger value="verify">Verify Cross-Chain</TabsTrigger>
              <TabsTrigger value="chains">Supported Chains</TabsTrigger>
              <TabsTrigger value="history">Query History</TabsTrigger>
            </TabsList>

            <TabsContent value="query">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#131313] mb-2">
                      Cross-Chain Reputation Query
                    </h2>
                    <p className="text-[#4F4F4F]">
                      Query reputation scores from other parachains in the Polkadot ecosystem
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Target Chain
                      </label>
                      <select 
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        value={queryChain}
                        onChange={(e) => setQueryChain(e.target.value)}
                      >
                        <option value="">Select a chain...</option>
                        {supportedChains
                          .filter(c => c.status === "connected")
                          .map(chain => (
                            <option key={chain.id} value={chain.id}>
                              {chain.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Account Address
                      </label>
                      <Input
                        placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                        value={queryAccount}
                        onChange={(e) => setQueryAccount(e.target.value)}
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">How XCM Queries Work</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>XCM messages are sent to the target parachain</li>
                            <li>The target chain verifies and responds with reputation data</li>
                            <li>Results are cryptographically signed and stored on-chain</li>
                            <li>Typical query time: 30-60 seconds</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                      size="lg"
                      onClick={handleQuery}
                      disabled={!queryChain || !queryAccount || isQuerying}
                    >
                      {isQuerying ? (
                        <>
                          <Activity className="mr-2 w-5 h-5 animate-spin" />
                          Querying...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 w-5 h-5" />
                          Initiate XCM Query
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="verify">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#131313] mb-2">
                      Verify Cross-Chain Transaction
                    </h2>
                    <p className="text-[#4F4F4F]">
                      Verify a cross-chain reputation query transaction
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Source Chain
                      </label>
                      <select 
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        value={verifyChain}
                        onChange={(e) => setVerifyChain(e.target.value)}
                      >
                        <option value="">Select a chain...</option>
                        {supportedChains
                          .filter(c => c.status === "connected")
                          .map(chain => (
                            <option key={chain.id} value={chain.id}>
                              {chain.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Account Address
                      </label>
                      <Input
                        placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                        value={verifyAccount}
                        onChange={(e) => setVerifyAccount(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Transaction Hash
                      </label>
                      <Input
                        placeholder="0x..."
                        value={verifyTxHash}
                        onChange={(e) => setVerifyTxHash(e.target.value)}
                        className="font-mono"
                      />
                    </div>

                    <Button 
                      className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                      size="lg"
                      onClick={() => {
                        if (!verifyChain || !verifyAccount || !verifyTxHash) {
                          toast.error("Please fill in all fields");
                          return;
                        }
                        verifyCrossChainMutation.mutate({
                          sourceChain: verifyChain,
                          targetAccount: verifyAccount,
                          txHash: verifyTxHash,
                        });
                      }}
                      disabled={verifyCrossChainMutation.isPending || !verifyChain || !verifyAccount || !verifyTxHash}
                    >
                      {verifyCrossChainMutation.isPending ? (
                        <>
                          <Activity className="mr-2 w-5 h-5 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 w-5 h-5" />
                          Verify Cross-Chain Transaction
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="chains">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {supportedChains.map((chain) => (
                  <Card key={chain.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Globe className="w-6 h-6 text-[#6C3CF0]" />
                        <div>
                          <h3 className="text-lg font-bold text-[#131313]">{chain.name}</h3>
                          <p className="text-xs text-[#4F4F4F]">Chain ID: {chain.id}</p>
                        </div>
                      </div>
                      {getStatusIcon(chain.status)}
                    </div>

                    <div className="space-y-3">
                      {getStatusBadge(chain.status)}
                      
                      {chain.reputationScore && (
                        <div>
                          <p className="text-sm text-[#4F4F4F] mb-1">Average Reputation</p>
                          <p className="text-2xl font-bold text-[#131313]">
                            {chain.reputationScore.toLocaleString()}
                          </p>
                        </div>
                      )}

                      {chain.lastQuery && (
                        <div className="text-sm text-[#4F4F4F]">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Last query: {Math.floor((Date.now() - chain.lastQuery) / 60000)} min ago
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-[#131313] mb-2">
                          Supported Queries
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {chain.supportedQueries.map((query) => (
                            <Badge key={query} variant="outline" className="text-xs">
                              {query}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Cross-Chain Message Flow</h3>
                  <p className="text-sm text-[#4F4F4F]">
                    Visualize cross-chain data flow and message routing
                  </p>
                </div>
                
                {crossChainMessages.map((message) => (
                  <Card 
                    key={message.id}
                    className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                      selectedMessage === message.id ? "ring-2 ring-[#6C3CF0]" : ""
                    }`}
                    onClick={() => setSelectedMessage(
                      selectedMessage === message.id ? null : message.id
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#131313] mb-1">
                          {message.sourceChain} → {message.targetChain}
                        </h3>
                        <p className="text-sm text-[#4F4F4F] capitalize">
                          {message.messageType} message
                        </p>
                      </div>
                      {getStatusBadge(message.status)}
                    </div>

                    {message.hops && message.hops.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-[#4F4F4F] mb-2">Message Route:</p>
                        <div className="flex items-center gap-2">
                          {message.hops.map((hop, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {hop}
                              </Badge>
                              {i < message.hops!.length - 1 && (
                                <ArrowRight className="w-4 h-4 text-[#4F4F4F]" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.result && (
                      <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-[#4F4F4F] mb-1">Reputation Score</p>
                          <p className="text-xl font-bold text-[#131313]">
                            {message.result.reputationScore?.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#4F4F4F] mb-1">Percentile</p>
                          <p className="text-xl font-bold text-[#131313]">
                            {message.result.percentile}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#4F4F4F] mb-1">Contributions</p>
                          <p className="text-xl font-bold text-[#131313]">
                            {message.result.verifiedContributions}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-[#4F4F4F]">
                      <span>
                        Initiated: {new Date(message.timestamp).toLocaleString()}
                      </span>
                      {message.deliveredAt && (
                        <span>
                          Delivered: {new Date(message.deliveredAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
                
                {recentQueries.map((query) => (
                  <Card key={query.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-[#131313] mb-1">
                          {supportedChains.find(c => c.id === query.targetChain)?.name || query.targetChain}
                        </h3>
                        <p className="text-sm text-[#4F4F4F] font-mono">
                          {query.targetAccount.slice(0, 20)}...{query.targetAccount.slice(-10)}
                        </p>
                      </div>
                      {getStatusBadge(query.status)}
                    </div>

                    {query.result && (
                      <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-xs text-[#4F4F4F] mb-1">Reputation Score</p>
                          <p className="text-xl font-bold text-[#131313]">
                            {query.result.score.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#4F4F4F] mb-1">Percentile</p>
                          <p className="text-xl font-bold text-[#131313]">
                            {query.result.percentile}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-[#4F4F4F] mb-1">Contributions</p>
                          <p className="text-xl font-bold text-[#131313]">
                            {query.result.verifiedContributions}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-[#4F4F4F]">
                      <span>
                        Initiated: {new Date(query.initiatedAt).toLocaleString()}
                      </span>
                      {query.completedAt && (
                        <span>
                          Completed: {new Date(query.completedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

