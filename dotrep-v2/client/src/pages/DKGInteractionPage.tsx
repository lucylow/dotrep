/**
 * DKG Interaction Page
 * 
 * Interactive frontend for DKG operations:
 * - Publish reputation assets to DKG
 * - Query reputation data using UALs
 * - Search for developers and assets
 * - View publication history and status
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
  ExternalLink,
  Copy,
  Activity,
  FileText,
  Hash
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { toast } from "sonner";
import { 
  mockDKGAssets, 
  mockDKGQueries, 
  mockDKGPublishOperations,
  type DKGAsset,
  type DKGQuery,
  type DKGPublishOperation
} from "@/data/enhancedMockData";

export default function DKGInteractionPage() {
  const [publishDeveloperId, setPublishDeveloperId] = useState("");
  const [publishReputationScore, setPublishReputationScore] = useState("");
  const [publishContributions, setPublishContributions] = useState("");
  const [queryUAL, setQueryUAL] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [querying, setQuerying] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const [publishedAssets, setPublishedAssets] = useState<DKGAsset[]>(mockDKGAssets);
  const [queryHistory, setQueryHistory] = useState<DKGQuery[]>(mockDKGQueries);
  const [publishOperations, setPublishOperations] = useState<DKGPublishOperation[]>(mockDKGPublishOperations);
  const [searchResults, setSearchResults] = useState<DKGAsset[]>([]);

  const handlePublish = async () => {
    if (!publishDeveloperId || !publishReputationScore || !publishContributions) {
      toast.error("Please fill in all fields");
      return;
    }

    setPublishing(true);
    
    // Simulate publishing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    const newAsset: DKGAsset = {
      ual: `did:dkg:otp:20430:0x${Math.random().toString(16).slice(2, 42)}`,
      developerId: publishDeveloperId,
      reputationScore: parseFloat(publishReputationScore),
      publishedAt: Date.now(),
      transactionHash: `0x${Math.random().toString(16).slice(2, 66)}`,
      blockNumber: Math.floor(Date.now() / 1000),
      contributions: parseInt(publishContributions),
      status: "published",
      version: 1,
    };

    setPublishedAssets([newAsset, ...publishedAssets]);
    setPublishOperations([
      {
        id: `publish-${Date.now()}`,
        developerId: publishDeveloperId,
        reputationData: {
          reputationScore: parseFloat(publishReputationScore),
          contributions: parseInt(publishContributions),
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
        status: "completed",
        ual: newAsset.ual,
        transactionHash: newAsset.transactionHash,
      },
      ...publishOperations,
    ]);

    setPublishing(false);
    setPublishDeveloperId("");
    setPublishReputationScore("");
    setPublishContributions("");
    toast.success("Reputation asset published to DKG successfully!");
  };

  const handleQuery = async () => {
    if (!queryUAL) {
      toast.error("Please enter a UAL");
      return;
    }

    setQuerying(true);
    
    // Simulate query delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const asset = publishedAssets.find(a => a.ual === queryUAL);
    
    const newQuery: DKGQuery = {
      id: `query-${Date.now()}`,
      ual: queryUAL,
      queryType: "reputation",
      timestamp: Date.now(),
      status: asset ? "completed" : "failed",
      result: asset ? {
        reputationScore: asset.reputationScore,
        percentile: Math.floor(asset.reputationScore / 10),
        verifiedContributions: asset.contributions,
      } : undefined,
      duration: 1200,
    };

    setQueryHistory([newQuery, ...queryHistory]);
    setQuerying(false);
    
    if (asset) {
      toast.success("Query completed successfully!");
    } else {
      toast.error("Asset not found");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) {
      toast.error("Please enter a search query");
      return;
    }

    setSearching(true);
    
    // Simulate search delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const results = publishedAssets.filter(asset => 
      asset.developerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.ual.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setSearchResults(results);
    setSearching(false);
    
    if (results.length > 0) {
      toast.success(`Found ${results.length} result(s)`);
    } else {
      toast.info("No results found");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; icon: React.ReactNode }> = {
      published: {
        className: "bg-green-100 text-green-800 border-green-300",
        icon: <CheckCircle2 className="w-3 h-3" />,
      },
      completed: {
        className: "bg-green-100 text-green-800 border-green-300",
        icon: <CheckCircle2 className="w-3 h-3" />,
      },
      pending: {
        className: "bg-yellow-100 text-yellow-800 border-yellow-300",
        icon: <Clock className="w-3 h-3" />,
      },
      publishing: {
        className: "bg-blue-100 text-blue-800 border-blue-300",
        icon: <Activity className="w-3 h-3 animate-spin" />,
      },
      in_progress: {
        className: "bg-blue-100 text-blue-800 border-blue-300",
        icon: <Activity className="w-3 h-3 animate-spin" />,
      },
      failed: {
        className: "bg-red-100 text-red-800 border-red-300",
        icon: <XCircle className="w-3 h-3" />,
      },
    };

    const variant = variants[status] || variants.pending;
    
    return (
      <Badge className={variant.className}>
        <span className="flex items-center gap-1">
          {variant.icon}
          {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
        </span>
      </Badge>
    );
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-8 h-8 text-[#6C3CF0]" />
              <h1 className="text-4xl font-extrabold text-[#131313]">DKG Interaction</h1>
            </div>
            <p className="text-[#4F4F4F]">
              Interact with the OriginTrail Decentralized Knowledge Graph: publish, query, and search reputation assets
            </p>
          </div>

          <Tabs defaultValue="publish" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="publish">Publish Asset</TabsTrigger>
              <TabsTrigger value="query">Query by UAL</TabsTrigger>
              <TabsTrigger value="search">Search Assets</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="publish">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#131313] mb-2">
                      Publish Reputation Asset to DKG
                    </h2>
                    <p className="text-[#4F4F4F]">
                      Publish reputation data as a verifiable Knowledge Asset on the OriginTrail DKG
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Developer ID (Polkadot Address)
                      </label>
                      <Input
                        placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                        value={publishDeveloperId}
                        onChange={(e) => setPublishDeveloperId(e.target.value)}
                        className="font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-[#131313] mb-2">
                          Reputation Score
                        </label>
                        <Input
                          type="number"
                          placeholder="850"
                          value={publishReputationScore}
                          onChange={(e) => setPublishReputationScore(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-[#131313] mb-2">
                          Contributions Count
                        </label>
                        <Input
                          type="number"
                          placeholder="4"
                          value={publishContributions}
                          onChange={(e) => setPublishContributions(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">How DKG Publishing Works</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Reputation data is converted to JSON-LD format</li>
                            <li>Asset is published to OriginTrail DKG network</li>
                            <li>You receive a UAL (Uniform Asset Locator) for the asset</li>
                            <li>Asset is stored immutably and can be queried by anyone</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                      size="lg"
                      onClick={handlePublish}
                      disabled={publishing || !publishDeveloperId || !publishReputationScore || !publishContributions}
                    >
                      {publishing ? (
                        <>
                          <Activity className="mr-2 w-5 h-5 animate-spin" />
                          Publishing to DKG...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 w-5 h-5" />
                          Publish to DKG
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="query">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#131313] mb-2">
                      Query Reputation Asset by UAL
                    </h2>
                    <p className="text-[#4F4F4F]">
                      Retrieve reputation data from DKG using a Uniform Asset Locator (UAL)
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        UAL (Uniform Asset Locator)
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="did:dkg:otp:20430:0x1234567890abcdef..."
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
                      <p className="text-xs text-[#4F4F4F] mt-1">
                        Try: {publishedAssets[0]?.ual}
                      </p>
                    </div>

                    <Button 
                      className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                      size="lg"
                      onClick={handleQuery}
                      disabled={querying || !queryUAL}
                    >
                      {querying ? (
                        <>
                          <Activity className="mr-2 w-5 h-5 animate-spin" />
                          Querying DKG...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 w-5 h-5" />
                          Query Asset
                        </>
                      )}
                    </Button>

                    {queryHistory.length > 0 && queryHistory[0].status === "completed" && queryHistory[0].result && (
                      <Card className="bg-green-50 border-green-200">
                        <CardHeader>
                          <CardTitle className="text-lg">Query Result</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Reputation Score:</span>
                              <span className="text-lg font-bold">{queryHistory[0].result.reputationScore}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Percentile:</span>
                              <span className="text-lg font-bold">{queryHistory[0].result.percentile}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Contributions:</span>
                              <span className="text-lg font-bold">{queryHistory[0].result.verifiedContributions}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="search">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#131313] mb-2">
                      Search DKG Assets
                    </h2>
                    <p className="text-[#4F4F4F]">
                      Search for reputation assets by developer ID or UAL
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Search Query
                      </label>
                      <Input
                        placeholder="Enter developer ID or UAL..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                    </div>

                    <Button 
                      className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                      size="lg"
                      onClick={handleSearch}
                      disabled={searching || !searchQuery}
                    >
                      {searching ? (
                        <>
                          <Activity className="mr-2 w-5 h-5 animate-spin" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 w-5 h-5" />
                          Search Assets
                        </>
                      )}
                    </Button>

                    {searchResults.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold">Search Results ({searchResults.length})</h3>
                        {searchResults.map((asset) => (
                          <Card key={asset.ual} className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Hash className="w-4 h-4 text-[#6C3CF0]" />
                                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                    {asset.ual.slice(0, 50)}...
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(asset.ual)}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </Button>
                                </div>
                                <p className="text-sm text-[#4F4F4F] font-mono mb-2">
                                  {asset.developerId}
                                </p>
                              </div>
                              {getStatusBadge(asset.status)}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-[#4F4F4F]">Reputation:</span>
                                <p className="font-bold text-lg">{asset.reputationScore}</p>
                              </div>
                              <div>
                                <span className="text-[#4F4F4F]">Contributions:</span>
                                <p className="font-bold text-lg">{asset.contributions}</p>
                              </div>
                              <div>
                                <span className="text-[#4F4F4F]">Published:</span>
                                <p className="font-bold text-sm">
                                  {new Date(asset.publishedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Published Assets</CardTitle>
                      <CardDescription>Recently published reputation assets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {publishedAssets.slice(0, 5).map((asset) => (
                          <div key={asset.ual} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <code className="text-xs font-mono text-[#6C3CF0]">
                                  {asset.ual.slice(0, 40)}...
                                </code>
                                <p className="text-xs text-[#4F4F4F] mt-1 font-mono">
                                  {asset.developerId.slice(0, 20)}...
                                </p>
                              </div>
                              {getStatusBadge(asset.status)}
                            </div>
                            <div className="flex items-center justify-between text-sm mt-2">
                              <span>Score: <strong>{asset.reputationScore}</strong></span>
                              <span className="text-[#4F4F4F]">
                                {new Date(asset.publishedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Query History</CardTitle>
                      <CardDescription>Recent DKG queries</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {queryHistory.slice(0, 5).map((query) => (
                          <div key={query.id} className="p-3 border rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <Badge variant="outline" className="mb-2">
                                  {query.queryType}
                                </Badge>
                                {query.ual && (
                                  <code className="text-xs font-mono text-[#4F4F4F] block">
                                    {query.ual.slice(0, 40)}...
                                  </code>
                                )}
                              </div>
                              {getStatusBadge(query.status)}
                            </div>
                            {query.result && (
                              <div className="text-sm mt-2 text-[#4F4F4F]">
                                Result: Reputation {query.result.reputationScore}
                              </div>
                            )}
                            <div className="text-xs text-[#4F4F4F] mt-2">
                              {new Date(query.timestamp).toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

