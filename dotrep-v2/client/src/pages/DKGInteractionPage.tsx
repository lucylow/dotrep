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
  Hash,
  Users,
  TrendingUp,
  Award,
  Shield,
  Network,
  Star,
  DollarSign,
  Signature,
  Link as LinkIcon,
  Eye,
  FileCheck
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
import {
  mockSocialReputationProfiles,
  mockSocialConnections,
  mockCampaignParticipations,
  getSocialReputationProfile,
  getSocialConnections,
  getCampaignParticipations,
  searchSocialProfiles,
  type SocialReputationProfile,
  type SocialConnection,
  type CampaignParticipation
} from "@/data/socialReputationMockData";

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

          <Tabs defaultValue="social-profiles" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="social-profiles">Social Profiles</TabsTrigger>
              <TabsTrigger value="publish">Publish Asset</TabsTrigger>
              <TabsTrigger value="query">Query by UAL</TabsTrigger>
              <TabsTrigger value="search">Search Assets</TabsTrigger>
              <TabsTrigger value="social-graph">Social Graph</TabsTrigger>
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

                    {/* Check if this is a social reputation profile */}
                    {queryUAL && (() => {
                      const socialProfile = mockSocialReputationProfiles.find(p => p.ual === queryUAL);
                      if (socialProfile) {
                        return (
                          <Card className="bg-blue-50 border-blue-200 mt-4">
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Social Reputation Profile Found
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                <div>
                                  <div className="font-semibold mb-2">{socialProfile.displayName}</div>
                                  <div className="text-sm text-[#4F4F4F]">{socialProfile.username}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="text-xs text-[#4F4F4F]">Social Rank</div>
                                    <div className="font-bold">{(socialProfile.reputationMetrics.socialRank * 100).toFixed(0)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-[#4F4F4F]">Overall Score</div>
                                    <div className="font-bold">{(socialProfile.reputationMetrics.overallScore * 100).toFixed(0)}</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-[#4F4F4F]">Followers</div>
                                    <div className="font-bold">{(socialProfile.socialMetrics.followerCount / 1000).toFixed(0)}K</div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-[#4F4F4F]">Engagement</div>
                                    <div className="font-bold">{(socialProfile.socialMetrics.engagementRate * 100).toFixed(1)}%</div>
                                  </div>
                                </div>
                                <div className="pt-2 border-t">
                                  <div className="flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-[#4F4F4F]" />
                                    <span className="text-sm">Sybil Risk: </span>
                                    <Badge variant={socialProfile.sybilResistance.sybilRisk < 0.2 ? "default" : "secondary"}>
                                      {(socialProfile.sybilResistance.sybilRisk * 100).toFixed(0)}%
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }
                      return null;
                    })()}
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

            <TabsContent value="social-profiles">
              <SocialReputationProfilesTab />
            </TabsContent>

            <TabsContent value="social-graph">
              <SocialGraphTab />
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

function SocialReputationProfilesTab() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SocialReputationProfile[]>([]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(mockSocialReputationProfiles);
      return;
    }
    const results = searchSocialProfiles(searchQuery);
    setSearchResults(results);
    toast.success(`Found ${results.length} profile(s)`);
  };

  const profiles = searchResults.length > 0 ? searchResults : mockSocialReputationProfiles;
  const selected = selectedProfile 
    ? profiles.find(p => p.did === selectedProfile)
    : null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-[#131313] mb-2">
              Social Reputation Profiles
            </h2>
            <p className="text-[#4F4F4F]">
              Browse and search influencer profiles with social reputation metrics
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Search by username, name, specialty, or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          {profiles.map((profile) => (
            <Card
              key={profile.did}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedProfile === profile.did ? "ring-2 ring-[#6C3CF0]" : ""
              }`}
              onClick={() => setSelectedProfile(
                selectedProfile === profile.did ? null : profile.did
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center text-white text-2xl font-bold">
                    {profile.displayName.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{profile.displayName}</h3>
                        <p className="text-sm text-[#4F4F4F]">{profile.username}</p>
                      </div>
                      <Badge variant="outline" className="bg-green-50">
                        <Star className="w-3 h-3 mr-1 text-yellow-500" />
                        {(profile.reputationMetrics.overallScore * 100).toFixed(0)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {profile.platforms.map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-[#4F4F4F]">Followers</div>
                        <div className="font-bold">{(profile.socialMetrics.followerCount / 1000).toFixed(0)}K</div>
                      </div>
                      <div>
                        <div className="text-[#4F4F4F]">Engagement</div>
                        <div className="font-bold">{(profile.socialMetrics.engagementRate * 100).toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="text-[#4F4F4F]">Campaigns</div>
                        <div className="font-bold">{profile.campaignsParticipated}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selected && (
          <Card className="sticky top-4 h-fit">
            <CardHeader>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center text-white text-3xl font-bold">
                  {selected.displayName.charAt(0)}
                </div>
                <div>
                  <CardTitle>{selected.displayName}</CardTitle>
                  <CardDescription>{selected.username}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Reputation Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Overall Score</span>
                    <span className="font-bold">{(selected.reputationMetrics.overallScore * 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Social Rank</span>
                    <span className="font-bold">{(selected.reputationMetrics.socialRank * 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Economic Stake</span>
                    <span className="font-bold">{(selected.reputationMetrics.economicStake * 100).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Endorsement Quality</span>
                    <span className="font-bold">{(selected.reputationMetrics.endorsementQuality * 100).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Social Metrics</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-[#4F4F4F]">Followers</div>
                    <div className="font-bold">{selected.socialMetrics.followerCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[#4F4F4F]">Following</div>
                    <div className="font-bold">{selected.socialMetrics.followingCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[#4F4F4F]">Engagement Rate</div>
                    <div className="font-bold">{(selected.socialMetrics.engagementRate * 100).toFixed(2)}%</div>
                  </div>
                  <div>
                    <div className="text-[#4F4F4F]">Total Posts</div>
                    <div className="font-bold">{selected.socialMetrics.totalPosts.toLocaleString()}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Sybil Resistance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Sybil Risk</span>
                    <Badge variant={selected.sybilResistance.sybilRisk < 0.2 ? "default" : "secondary"}>
                      {(selected.sybilResistance.sybilRisk * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Connection Diversity</span>
                    <span className="font-bold">{(selected.sybilResistance.connectionDiversity * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Specialties</h4>
                <div className="flex flex-wrap gap-2">
                  {selected.specialties.map((specialty) => (
                    <Badge key={specialty} variant="outline">
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold">Total Earnings</span>
                  <span className="text-xl font-bold text-green-600">
                    ${selected.totalEarnings.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <code className="text-xs text-[#4F4F4F] font-mono break-all">
                  {selected.ual}
                </code>
              </div>

              {/* Provenance, Authorship, and Auditability Section */}
              {(selected.provenance || selected.authorship || selected.auditability) && (
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-[#6C3CF0]" />
                    <h4 className="font-semibold">Provenance & Auditability</h4>
                  </div>

                  {/* Authorship */}
                  {selected.authorship && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Signature className="w-4 h-4 text-[#6C3CF0]" />
                        Clear Authorship
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Creator DID:</span>
                          <code className="font-mono text-[10px]">
                            {selected.authorship.creatorDID.substring(0, 20)}...
                          </code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Signature:</span>
                          {selected.authorship.signature.valid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              <XCircle className="w-3 h-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Content Hash:</span>
                          {selected.authorship.contentHash.match ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                              <XCircle className="w-3 h-3 mr-1" />
                              Mismatch
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Provenance */}
                  {selected.provenance && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileCheck className="w-4 h-4 text-[#6C3CF0]" />
                        Provenance
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Algorithm:</span>
                          <span className="font-mono">
                            {selected.provenance.computationMethod.algorithm} v{selected.provenance.computationMethod.version}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Input Graph Hash:</span>
                          <code className="font-mono text-[10px]">
                            {selected.provenance.inputGraphHash.substring(0, 12)}...
                          </code>
                        </div>
                        {selected.provenance.previousSnapshot && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Previous Snapshot:</span>
                            <code className="font-mono text-[10px]">
                              {selected.provenance.previousSnapshot.substring(0, 20)}...
                            </code>
                          </div>
                        )}
                        {selected.provenance.computationProof && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Computation Proof:</span>
                            <code className="font-mono text-[10px]">
                              {selected.provenance.computationProof.substring(0, 12)}...
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Auditability */}
                  {selected.auditability && (
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Eye className="w-4 h-4 text-[#6C3CF0]" />
                          Auditability
                        </div>
                        <Badge 
                          variant={selected.auditability.verificationStatus === 'verified' ? 'default' : 'secondary'}
                          className={selected.auditability.verificationStatus === 'verified' ? 'bg-green-500' : ''}
                        >
                          {selected.auditability.verificationStatus === 'verified' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Verified
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              {selected.auditability.verificationStatus}
                            </>
                          )}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Verification Score:</span>
                          <span className="font-bold text-[#6C3CF0]">
                            {selected.auditability.verificationScore}/100
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Published:</span>
                          <span>{new Date(selected.auditability.published).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last Verified:</span>
                          <span>{new Date(selected.auditability.lastVerified).toLocaleDateString()}</span>
                        </div>
                        {selected.auditability.onChainAnchor?.present && (
                          <div className="pt-2 border-t mt-2">
                            <div className="flex items-center gap-2 mb-1">
                              <ExternalLink className="w-3 h-3 text-[#6C3CF0]" />
                              <span className="text-muted-foreground">On-Chain Anchor</span>
                            </div>
                            <div className="space-y-1 pl-5">
                              {selected.auditability.onChainAnchor.blockNumber && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Block:</span>
                                  <span className="font-mono">
                                    {selected.auditability.onChainAnchor.blockNumber.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              {selected.auditability.onChainAnchor.transactionHash && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tx Hash:</span>
                                  <code className="font-mono text-[10px]">
                                    {selected.auditability.onChainAnchor.transactionHash.substring(0, 12)}...
                                  </code>
                                </div>
                              )}
                              {selected.auditability.onChainAnchor.chain && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Chain:</span>
                                  <Badge variant="outline" className="text-[10px]">
                                    {selected.auditability.onChainAnchor.chain}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {selected.auditability.auditTrail && selected.auditability.auditTrail.length > 0 && (
                          <div className="pt-2 border-t mt-2">
                            <div className="text-muted-foreground mb-2">Audit Trail:</div>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {selected.auditability.auditTrail.slice(-3).map((entry, idx) => (
                                <div key={idx} className="text-[10px] pl-2 border-l-2 border-[#6C3CF0]/30">
                                  <div className="font-medium">{entry.action}</div>
                                  <div className="text-muted-foreground">
                                    {new Date(entry.timestamp).toLocaleDateString()}
                                  </div>
                                  {entry.details && (
                                    <div className="text-muted-foreground italic mt-0.5">
                                      {entry.details}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SocialGraphTab() {
  const [selectedDid, setSelectedDid] = useState<string | null>(null);
  const connections = selectedDid ? getSocialConnections(selectedDid) : mockSocialConnections;
  const profile = selectedDid ? getSocialReputationProfile(selectedDid) : null;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div>
          <h2 className="text-2xl font-bold text-[#131313] mb-2">
            Social Graph Connections
          </h2>
          <p className="text-[#4F4F4F]">
            Visualize social connections and relationships in the reputation network
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Select Profile</CardTitle>
            <CardDescription>Choose a profile to view connections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockSocialReputationProfiles.map((profile) => (
                <Button
                  key={profile.did}
                  variant={selectedDid === profile.did ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedDid(
                    selectedDid === profile.did ? null : profile.did
                  )}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {profile.displayName}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {profile && (
            <Card>
              <CardHeader>
                <CardTitle>Profile: {profile.displayName}</CardTitle>
                <CardDescription>{profile.username}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="w-5 h-5 text-[#6C3CF0]" />
                    <span className="font-semibold">Connections ({connections.length})</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {connections.length > 0 ? (
            <div className="space-y-3">
              {connections.map((connection, index) => {
                const otherDid = connection.fromDid === selectedDid 
                  ? connection.toDid 
                  : connection.fromDid;
                const otherProfile = getSocialReputationProfile(otherDid);
                
                return (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center text-white font-bold">
                            {otherProfile?.displayName.charAt(0) || "?"}
                          </div>
                          <div>
                            <div className="font-semibold">
                              {otherProfile?.displayName || otherDid.slice(0, 20)}
                            </div>
                            <div className="text-sm text-[#4F4F4F]">
                              {connection.connectionType.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">
                            {(connection.strength * 100).toFixed(0)}% strength
                          </Badge>
                          {connection.platform && (
                            <div className="text-xs text-[#4F4F4F] mt-1">
                              {connection.platform}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-[#4F4F4F]">
                {selectedDid 
                  ? "No connections found for this profile"
                  : "Select a profile to view connections"}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Participation</CardTitle>
          <CardDescription>View campaign history for selected profile</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedDid ? (
            <div className="space-y-3">
              {getCampaignParticipations(selectedDid).map((campaign) => (
                <div key={campaign.campaignId} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold">{campaign.campaignName}</div>
                      <div className="text-sm text-[#4F4F4F]">
                        {new Date(campaign.appliedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge 
                      variant={
                        campaign.status === 'completed' ? 'default' :
                        campaign.status === 'active' ? 'secondary' :
                        'outline'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <div className="text-[#4F4F4F]">Engagement</div>
                      <div className="font-bold">{campaign.performance.engagement.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-[#4F4F4F]">Earnings</div>
                      <div className="font-bold text-green-600">${campaign.earnings.total}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-[#4F4F4F] py-8">
              Select a profile to view campaign participation
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

