/**
 * Social Reputation Dashboard
 * 
 * Comprehensive dashboard integrating:
 * - Polkadot cross-chain reputation via XCM
 * - OriginTrail DKG reputation assets
 * - Real-time reputation updates
 * - Social graph visualization
 * - Multi-chain reputation aggregation
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  TrendingUp,
  Globe,
  Database,
  Network,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  Shield,
  Link2,
  Zap,
  BarChart3,
  GitBranch,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Copy,
  Sparkles
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useDotRepWallet } from "@/_core/hooks/useDotRepWallet";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ChainReputation {
  chain: string;
  chainName: string;
  score: number;
  percentile: number;
  contributions: number;
  verified: boolean;
  lastUpdated: number;
  source: 'xcm' | 'dkg' | 'both';
  dkgUAL?: string;
  xcmTxHash?: string;
}

interface DKGAsset {
  ual: string;
  reputationScore: number;
  publishedAt: number;
  chain?: string;
  verified: boolean;
}

interface SocialConnection {
  accountId: string;
  relationship: 'collaborator' | 'endorser' | 'contributor';
  reputationScore: number;
  chain: string;
}

export default function SocialReputationDashboard() {
  const { connectionResult } = useDotRepWallet();
  const [accountId, setAccountId] = useState(
    connectionResult?.address || ""
  );
  const [selectedChains, setSelectedChains] = useState<string[]>([
    "polkadot",
    "kusama",
    "asset-hub",
  ]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Multi-chain reputation query
  const { data: multiChainReputation, isLoading: isLoadingXCM, refetch: refetchXCM } = 
    trpc.polkadot.reputation.getMultiChain.useQuery(
      { accountId, chains: selectedChains },
      { 
        enabled: !!accountId && selectedChains.length > 0,
        refetchInterval: autoRefresh ? refreshInterval * 1000 : false
      }
    );

  // DKG reputation query (using REST API since tRPC may not have DKG routes)
  const [dkgAssets, setDkgAssets] = useState<DKGAsset[]>([]);
  const [isLoadingDKG, setIsLoadingDKG] = useState(false);
  const [dkgHealth, setDkgHealth] = useState<{ healthy: boolean; status?: any } | null>(null);

  // Check DKG health
  useEffect(() => {
    const checkDKGHealth = async () => {
      try {
        const response = await fetch('/api/v1/dkg/health');
        const data = await response.json();
        setDkgHealth(data);
      } catch (error) {
        console.error('Failed to check DKG health:', error);
        setDkgHealth({ healthy: false });
      }
    };
    checkDKGHealth();
    const interval = setInterval(checkDKGHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch DKG assets for account
  const fetchDKGAssets = async () => {
    if (!accountId) return;
    
    setIsLoadingDKG(true);
    try {
      // Search for reputation assets by developer ID
      const response = await fetch(
        `/api/v1/reputation/search?developerId=${encodeURIComponent(accountId)}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setDkgAssets(Array.isArray(data.data) ? data.data : []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch DKG assets:', error);
      toast.error('Failed to load DKG reputation data');
    } finally {
      setIsLoadingDKG(false);
    }
  };

  useEffect(() => {
    fetchDKGAssets();
    if (autoRefresh) {
      const interval = setInterval(fetchDKGAssets, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [accountId, autoRefresh, refreshInterval]);

  // Aggregate reputation data from XCM and DKG
  const aggregatedReputation: ChainReputation[] = [];
  
  // Add XCM reputation data
  if (multiChainReputation) {
    multiChainReputation.forEach((result: any) => {
      aggregatedReputation.push({
        chain: result.chain,
        chainName: getChainName(result.chain),
        score: result.score || 0,
        percentile: result.percentile || 0,
        contributions: result.contributions || 0,
        verified: result.verified || false,
        lastUpdated: Date.now(),
        source: 'xcm',
        xcmTxHash: result.txHash
      });
    });
  }

  // Add DKG reputation data
  dkgAssets.forEach((asset) => {
    const existing = aggregatedReputation.find(r => r.chain === asset.chain || !asset.chain);
    if (existing) {
      existing.dkgUAL = asset.ual;
      existing.source = 'both';
      // Use DKG score if it's higher or more recent
      if (asset.reputationScore > existing.score || asset.publishedAt > existing.lastUpdated) {
        existing.score = asset.reputationScore;
      }
    } else {
      aggregatedReputation.push({
        chain: asset.chain || 'dkg',
        chainName: asset.chain ? getChainName(asset.chain) : 'DKG Network',
        score: asset.reputationScore,
        percentile: Math.floor((asset.reputationScore / 1000) * 100),
        contributions: 0,
        verified: asset.verified,
        lastUpdated: asset.publishedAt,
        source: 'dkg',
        dkgUAL: asset.ual
      });
    }
  });

  // Calculate aggregate metrics
  const aggregateScore = aggregatedReputation.length > 0
    ? Math.round(aggregatedReputation.reduce((sum, r) => sum + r.score, 0) / aggregatedReputation.length)
    : 0;
  
  const totalContributions = aggregatedReputation.reduce((sum, r) => sum + r.contributions, 0);
  const verifiedChains = aggregatedReputation.filter(r => r.verified).length;

  const handleRefresh = () => {
    refetchXCM();
    fetchDKGAssets();
    toast.success('Refreshing reputation data...');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getChainName = (chainId: string): string => {
    const chains: Record<string, string> = {
      'polkadot': 'Polkadot',
      'kusama': 'Kusama',
      'asset-hub': 'Asset Hub',
      'moonbeam': 'Moonbeam',
      'acala': 'Acala',
      'dkg': 'OriginTrail DKG'
    };
    return chains[chainId] || chainId;
  };

  const getSourceBadge = (source: 'xcm' | 'dkg' | 'both') => {
    const variants = {
      xcm: { label: 'XCM', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      dkg: { label: 'DKG', className: 'bg-purple-100 text-purple-800 border-purple-300' },
      both: { label: 'XCM + DKG', className: 'bg-gradient-to-r from-blue-100 to-purple-100 text-gray-800 border-blue-300' }
    };
    const variant = variants[source];
    return (
      <Badge className={variant.className}>
        {variant.label}
      </Badge>
    );
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8 text-[#6C3CF0]" />
                <h1 className="text-4xl font-extrabold text-[#131313]">
                  Social Reputation Dashboard
                </h1>
              </div>
              <p className="text-[#4F4F4F]">
                Unified view of your reputation across Polkadot chains and OriginTrail DKG
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoadingXCM || isLoadingDKG}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${(isLoadingXCM || isLoadingDKG) ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Account Input */}
          <Card>
            <CardHeader>
              <CardTitle>Account Address</CardTitle>
              <CardDescription>
                Enter a Polkadot account address to view cross-chain and DKG reputation
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
                {accountId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(accountId)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Aggregate Metrics */}
          {accountId && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 opacity-80" />
                    <Shield className="w-5 h-5 opacity-60" />
                  </div>
                  <div className="text-3xl font-bold mb-1">{aggregateScore}</div>
                  <div className="text-sm opacity-90">Aggregate Reputation</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Network className="w-8 h-8 text-[#6C3CF0]" />
                    <Badge variant="outline">{verifiedChains}</Badge>
                  </div>
                  <div className="text-3xl font-bold mb-1">{aggregatedReputation.length}</div>
                  <div className="text-sm text-muted-foreground">Connected Chains</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <GitBranch className="w-8 h-8 text-green-600" />
                    {totalContributions > 0 && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                  </div>
                  <div className="text-3xl font-bold mb-1">{totalContributions}</div>
                  <div className="text-sm text-muted-foreground">Total Contributions</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Database className="w-8 h-8 text-purple-600" />
                    {dkgHealth?.healthy ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="text-3xl font-bold mb-1">{dkgAssets.length}</div>
                  <div className="text-sm text-muted-foreground">DKG Assets</div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs defaultValue="reputation" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="reputation">Reputation</TabsTrigger>
              <TabsTrigger value="chains">Chain Details</TabsTrigger>
              <TabsTrigger value="dkg">DKG Assets</TabsTrigger>
              <TabsTrigger value="dataflow">Data Flow</TabsTrigger>
            </TabsList>

            {/* Reputation Tab */}
            <TabsContent value="reputation">
              <div className="space-y-4">
                {isLoadingXCM || isLoadingDKG ? (
                  <Card className="p-12">
                    <div className="flex items-center justify-center">
                      <Activity className="w-8 h-8 animate-spin text-[#6C3CF0] mr-3" />
                      <span className="text-muted-foreground">Loading reputation data...</span>
                    </div>
                  </Card>
                ) : aggregatedReputation.length > 0 ? (
                  aggregatedReputation.map((reputation, index) => (
                    <Card key={index} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center text-white font-bold">
                              {reputation.chainName.charAt(0)}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold">{reputation.chainName}</h3>
                              <p className="text-sm text-muted-foreground capitalize">
                                {reputation.chain}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getSourceBadge(reputation.source)}
                            {reputation.verified ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Reputation Score</p>
                            <p className="text-2xl font-bold">{reputation.score}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Percentile</p>
                            <p className="text-2xl font-bold">{reputation.percentile}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Contributions</p>
                            <p className="text-2xl font-bold">{reputation.contributions}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-4 border-t">
                          {reputation.dkgUAL && (
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-purple-600" />
                              <code className="text-xs font-mono text-muted-foreground">
                                {reputation.dkgUAL.slice(0, 40)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(reputation.dkgUAL!)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          {reputation.xcmTxHash && (
                            <div className="flex items-center gap-2">
                              <Network className="w-4 h-4 text-blue-600" />
                              <code className="text-xs font-mono text-muted-foreground">
                                {reputation.xcmTxHash.slice(0, 20)}...
                              </code>
                            </div>
                          )}
                          <div className="ml-auto text-xs text-muted-foreground">
                            Updated: {new Date(reputation.lastUpdated).toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="p-12">
                    <div className="text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No reputation data found for this account.</p>
                      <p className="text-sm mt-2">
                        Connect your wallet or enter an account address to view reputation.
                      </p>
                    </div>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Chain Details Tab */}
            <TabsContent value="chains">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Chain Selection</CardTitle>
                    <CardDescription>
                      Select which Polkadot parachains to query for reputation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {['polkadot', 'kusama', 'asset-hub', 'moonbeam', 'acala'].map((chain) => (
                        <Button
                          key={chain}
                          variant={selectedChains.includes(chain) ? "default" : "outline"}
                          onClick={() => {
                            setSelectedChains(prev =>
                              prev.includes(chain)
                                ? prev.filter(c => c !== chain)
                                : [...prev, chain]
                            );
                          }}
                        >
                          {getChainName(chain)}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Cross-Chain Query Status</CardTitle>
                    <CardDescription>
                      Real-time status of XCM queries to each chain
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedChains.map((chain) => {
                        const chainRep = aggregatedReputation.find(r => r.chain === chain);
                        return (
                          <div
                            key={chain}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Globe className="w-5 h-5 text-[#6C3CF0]" />
                              <div>
                                <p className="font-semibold">{getChainName(chain)}</p>
                                <p className="text-sm text-muted-foreground capitalize">{chain}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {chainRep ? (
                                <>
                                  <span className="text-lg font-bold">{chainRep.score}</span>
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                </>
                              ) : isLoadingXCM ? (
                                <Activity className="w-5 h-5 animate-spin text-[#6C3CF0]" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* DKG Assets Tab */}
            <TabsContent value="dkg">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>OriginTrail DKG Assets</CardTitle>
                        <CardDescription>
                          Reputation assets published to the Decentralized Knowledge Graph
                        </CardDescription>
                      </div>
                      {dkgHealth && (
                        <Badge
                          className={
                            dkgHealth.healthy
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {dkgHealth.healthy ? "DKG Connected" : "DKG Disconnected"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingDKG ? (
                      <div className="flex items-center justify-center py-8">
                        <Activity className="w-6 h-6 animate-spin text-[#6C3CF0] mr-2" />
                        <span className="text-muted-foreground">Loading DKG assets...</span>
                      </div>
                    ) : dkgAssets.length > 0 ? (
                      <div className="space-y-3">
                        {dkgAssets.map((asset, index) => (
                          <Card key={index} className="border-2 border-purple-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <Database className="w-5 h-5 text-purple-600" />
                                  <div>
                                    <p className="font-semibold">Reputation Asset #{index + 1}</p>
                                    <code className="text-xs font-mono text-muted-foreground">
                                      {asset.ual}
                                    </code>
                                  </div>
                                </div>
                                <Badge className="bg-purple-100 text-purple-800">DKG</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                  <p className="text-sm text-muted-foreground">Score</p>
                                  <p className="text-xl font-bold">{asset.reputationScore}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Published</p>
                                  <p className="text-sm font-semibold">
                                    {new Date(asset.publishedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 pt-3 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(asset.ual)}
                                >
                                  <Copy className="w-3 h-3 mr-1" />
                                  Copy UAL
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    window.open(`/dkg-interaction?ual=${encodeURIComponent(asset.ual)}`, '_blank');
                                  }}
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  View Details
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No DKG assets found for this account.</p>
                        <p className="text-sm mt-2">
                          Reputation assets will appear here once published to OriginTrail DKG.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Data Flow Tab */}
            <TabsContent value="dataflow">
              <Card>
                <CardHeader>
                  <CardTitle>Cross-Chain Data Flow</CardTitle>
                  <CardDescription>
                    Visual representation of reputation data flow across Polkadot and OriginTrail DKG
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Data Flow Diagram */}
                    <div className="relative p-8 bg-gradient-to-br from-gray-50 to-white rounded-lg border-2 border-dashed">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        {/* Polkadot Chains */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-4">
                            <Network className="w-5 h-5 text-blue-600" />
                            <h4 className="font-bold">Polkadot Ecosystem</h4>
                          </div>
                          {selectedChains.map((chain) => (
                            <div
                              key={chain}
                              className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                            >
                              <p className="font-semibold text-sm">{getChainName(chain)}</p>
                              <p className="text-xs text-muted-foreground capitalize">{chain}</p>
                              {aggregatedReputation.find(r => r.chain === chain)?.verified && (
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-1" />
                              )}
                            </div>
                          ))}
                        </div>

                        {/* XCM Flow */}
                        <div className="flex flex-col items-center">
                          <ArrowRight className="w-8 h-8 text-[#6C3CF0] rotate-90 md:rotate-0" />
                          <p className="text-xs text-muted-foreground mt-2 font-semibold">
                            XCM Messages
                          </p>
                        </div>

                        {/* DotRep Hub */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-[#6C3CF0]" />
                            <h4 className="font-bold">DotRep Hub</h4>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] rounded-lg text-white">
                            <p className="font-bold text-sm mb-1">Reputation Aggregation</p>
                            <p className="text-xs opacity-90">Cross-chain + DKG</p>
                            <div className="mt-3 text-2xl font-bold">{aggregateScore}</div>
                          </div>
                        </div>

                        {/* DKG Flow */}
                        <div className="md:col-span-3 mt-6 pt-6 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                            <div className="flex flex-col items-center md:col-span-1">
                              <ArrowRight className="w-8 h-8 text-purple-600 rotate-90 md:rotate-0" />
                              <p className="text-xs text-muted-foreground mt-2 font-semibold">
                                Knowledge Assets
                              </p>
                            </div>

                            <div className="md:col-span-2 space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <Database className="w-5 h-5 text-purple-600" />
                                <h4 className="font-bold">OriginTrail DKG</h4>
                                {dkgHealth?.healthy && (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                )}
                              </div>
                              {dkgAssets.length > 0 ? (
                                <div className="space-y-2">
                                  {dkgAssets.slice(0, 3).map((asset, i) => (
                                    <div
                                      key={i}
                                      className="p-2 bg-purple-50 rounded border border-purple-200"
                                    >
                                      <p className="text-xs font-mono truncate">{asset.ual}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Score: {asset.reputationScore}
                                      </p>
                                    </div>
                                  ))}
                                  {dkgAssets.length > 3 && (
                                    <p className="text-xs text-muted-foreground text-center">
                                      +{dkgAssets.length - 3} more assets
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">
                                  No DKG assets found
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{aggregatedReputation.length}</p>
                          <p className="text-xs text-muted-foreground">Data Sources</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{verifiedChains}</p>
                          <p className="text-xs text-muted-foreground">Verified Chains</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">{dkgAssets.length}</p>
                          <p className="text-xs text-muted-foreground">DKG Assets</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <p className="text-2xl font-bold">
                            {aggregatedReputation.filter(r => r.source === 'both').length}
                          </p>
                          <p className="text-xs text-muted-foreground">Unified Sources</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

