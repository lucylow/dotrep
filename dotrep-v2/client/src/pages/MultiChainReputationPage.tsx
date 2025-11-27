import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Globe, 
  TrendingUp,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useDotRepWallet } from "@/_core/hooks/useDotRepWallet";

const SUPPORTED_CHAINS = [
  { id: "polkadot", name: "Polkadot", color: "bg-pink-500" },
  { id: "kusama", name: "Kusama", color: "bg-black" },
  { id: "moonbeam", name: "Moonbeam", color: "bg-blue-500" },
  { id: "acala", name: "Acala", color: "bg-green-500" },
  { id: "asset-hub", name: "Asset Hub", color: "bg-purple-500" },
];

export default function MultiChainReputationPage() {
  const { connectionResult } = useDotRepWallet();
  const [accountId, setAccountId] = useState(
    connectionResult?.account?.address || ""
  );
  const [selectedChains, setSelectedChains] = useState<string[]>([
    "polkadot",
    "kusama",
    "moonbeam",
    "acala",
  ]);

  const { data: multiChainReputation, isLoading } = trpc.polkadot.reputation.getMultiChain.useQuery(
    {
      accountId,
      chains: selectedChains,
    },
    { enabled: !!accountId && selectedChains.length > 0 }
  );

  const toggleChain = (chainId: string) => {
    setSelectedChains((prev) =>
      prev.includes(chainId)
        ? prev.filter((id) => id !== chainId)
        : [...prev, chainId]
    );
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Globe className="w-8 h-8 text-purple-600" />
              Multi-Chain Reputation
            </h1>
            <p className="text-muted-foreground mt-2">
              View your reputation across multiple Polkadot parachains
            </p>
          </div>

          {/* Account Input */}
          <Card>
            <CardHeader>
              <CardTitle>Account Address</CardTitle>
              <CardDescription>
                Enter a Polkadot account address to query reputation across chains
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                  className="font-mono"
                />
                {connectionResult?.account?.address && (
                  <Button
                    variant="outline"
                    onClick={() => setAccountId(connectionResult.account.address)}
                  >
                    Use Connected
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chain Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Chains</CardTitle>
              <CardDescription>
                Choose which chains to query for reputation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {SUPPORTED_CHAINS.map((chain) => (
                  <Button
                    key={chain.id}
                    variant={selectedChains.includes(chain.id) ? "default" : "outline"}
                    onClick={() => toggleChain(chain.id)}
                    className="capitalize"
                  >
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${
                        selectedChains.includes(chain.id) ? chain.color : "bg-gray-300"
                      }`}
                    />
                    {chain.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {accountId && (
            <Card>
              <CardHeader>
                <CardTitle>Reputation Across Chains</CardTitle>
                <CardDescription>
                  Reputation scores queried via XCM from selected chains
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    <span className="ml-3 text-muted-foreground">
                      Querying chains via XCM...
                    </span>
                  </div>
                ) : multiChainReputation && multiChainReputation.length > 0 ? (
                  <div className="space-y-4">
                    {multiChainReputation.map((result, index) => {
                      const chain = SUPPORTED_CHAINS.find((c) => c.id === result.chain);
                      return (
                        <Card key={index} className="border-2">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                                    chain?.color || "bg-gray-500"
                                  }`}
                                >
                                  <Globe className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="font-semibold text-lg capitalize">
                                    {result.chain}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {chain?.name || result.chain}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className="text-3xl font-bold">
                                    {result.verified ? result.score : "N/A"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Reputation Score
                                  </div>
                                </div>
                                {result.verified ? (
                                  <Badge className="bg-green-500">
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Not Found
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No reputation data found for this account on selected chains.
                    <div className="mt-2 text-sm">
                      This account may not have any contributions yet, or the chains may not
                      support reputation queries.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">How Multi-Chain Reputation Works</h4>
                  <p className="text-sm text-muted-foreground">
                    DotRep uses XCM (Cross-Consensus Messaging) to query reputation scores
                    from multiple parachains. Your reputation is portable across the entire
                    Polkadot ecosystem, allowing you to use your reputation on any chain
                    that supports the DotRep protocol.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UnifiedSidebar>
  );
}


