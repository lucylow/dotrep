/**
 * Social Reputation Dashboard
 * 
 * Comprehensive dashboard for social reputation analysis with:
 * - Social graph visualization
 * - Multi-agent reputation analysis
 * - DKG integration for real-time queries
 * - Reputation trends and insights
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  Users, 
  Network, 
  Shield, 
  Award,
  Activity,
  Database,
  Search,
  BarChart3,
  Zap,
  CheckCircle2
} from "lucide-react";
import { 
  mockSocialReputationProfiles, 
  mockSocialConnections,
  type SocialReputationProfile,
  type SocialConnection 
} from "@/data/socialReputationMockData";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function SocialReputationDashboard() {
  const [profiles, setProfiles] = useState<SocialReputationProfile[]>(mockSocialReputationProfiles);
  const [connections, setConnections] = useState<SocialConnection[]>(mockSocialConnections);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<SocialReputationProfile | null>(null);

  // DKG query for social reputation
  const dkgQuery = trpc.agents.findInfluencers.useQuery(
    { query: searchQuery || "Find influencers with high social reputation", limit: 10 },
    { enabled: false }
  );

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    try {
      const result = await dkgQuery.refetch();
      if (result.data?.success && result.data.matches.length > 0) {
        toast.success(`Found ${result.data.matches.length} influencers`);
      }
    } catch (error) {
      toast.error("Failed to query DKG");
    }
  };

  const getReputationColor = (score: number) => {
    if (score >= 0.8) return "text-green-500";
    if (score >= 0.6) return "text-yellow-500";
    return "text-red-500";
  };

  const getReputationBadge = (score: number) => {
    if (score >= 0.8) return "default";
    if (score >= 0.6) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Reputation Dashboard</h2>
          <p className="text-muted-foreground">
            Analyze social reputation with multi-agent AI and DKG integration
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Database className="w-4 h-4 mr-2" />
          DKG Connected
        </Badge>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search influencers by reputation, platform, or specialty..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={dkgQuery.isLoading}>
              <Search className="w-4 h-4 mr-2" />
              {dkgQuery.isLoading ? "Querying DKG..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profiles</p>
                <p className="text-2xl font-bold">{profiles.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Reputation</p>
                <p className="text-2xl font-bold">
                  {(profiles.reduce((sum, p) => sum + p.reputationMetrics.overallScore, 0) / profiles.length * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Social Connections</p>
                <p className="text-2xl font-bold">{connections.length}</p>
              </div>
              <Network className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Sybil Risk</p>
                <p className="text-2xl font-bold">
                  {profiles.filter(p => p.sybilResistance.sybilRisk < 0.2).length}
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profiles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profiles">Reputation Profiles</TabsTrigger>
          <TabsTrigger value="graph">Social Graph</TabsTrigger>
          <TabsTrigger value="analysis">Multi-Agent Analysis</TabsTrigger>
          <TabsTrigger value="dkg">DKG Queries</TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((profile) => (
              <Card 
                key={profile.did} 
                className={`cursor-pointer hover:shadow-lg transition-shadow ${
                  selectedProfile?.did === profile.did ? 'border-2 border-primary' : ''
                }`}
                onClick={() => setSelectedProfile(profile)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {profile.profileImage && (
                        <img 
                          src={profile.profileImage} 
                          alt={profile.displayName}
                          className="w-12 h-12 rounded-full"
                        />
                      )}
                      <div>
                        <CardTitle className="text-base">{profile.displayName}</CardTitle>
                        <CardDescription>{profile.username}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={getReputationBadge(profile.reputationMetrics.overallScore)}>
                      {(profile.reputationMetrics.overallScore * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Social Rank:</span>
                      <span className={`font-semibold ${getReputationColor(profile.reputationMetrics.socialRank)}`}>
                        {(profile.reputationMetrics.socialRank * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Economic Stake:</span>
                      <span className="font-semibold">
                        {(profile.reputationMetrics.economicStake * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sybil Risk:</span>
                      <span className={`font-semibold ${
                        profile.sybilResistance.sybilRisk < 0.2 ? 'text-green-500' : 
                        profile.sybilResistance.sybilRisk < 0.5 ? 'text-yellow-500' : 'text-red-500'
                      }`}>
                        {(profile.sybilResistance.sybilRisk * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex flex-wrap gap-1">
                      {profile.platforms.map((platform, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      <div>Followers: {profile.socialMetrics.followerCount.toLocaleString()}</div>
                      <div>Engagement: {(profile.socialMetrics.engagementRate * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="graph" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Graph Visualization</CardTitle>
              <CardDescription>
                Network of social connections and reputation relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Network className="w-16 h-16 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Social graph visualization with {connections.length} connections
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Interactive graph view coming soon
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Connection Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['follows', 'interactsWith', 'endorses', 'collaborates'].map(type => {
                    const count = connections.filter(c => c.connectionType === type).length;
                    return (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">{type}:</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Platform Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['Twitter', 'LinkedIn', 'YouTube', 'TikTok'].map(platform => {
                    const count = connections.filter(c => c.platform === platform).length;
                    return (
                      <div key={platform} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{platform}:</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Sybil Detection Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Low Risk Profiles:</span>
                  <span className="font-semibold text-green-500">
                    {profiles.filter(p => p.sybilResistance.sybilRisk < 0.2).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Medium Risk:</span>
                  <span className="font-semibold text-yellow-500">
                    {profiles.filter(p => p.sybilResistance.sybilRisk >= 0.2 && p.sybilResistance.sybilRisk < 0.5).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">High Risk:</span>
                  <span className="font-semibold text-red-500">
                    {profiles.filter(p => p.sybilResistance.sybilRisk >= 0.5).length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Reputation Trends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Top Performers:</span>
                  <span className="font-semibold">
                    {profiles.filter(p => p.reputationMetrics.overallScore >= 0.8).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Average Engagement:</span>
                  <span className="font-semibold">
                    {(profiles.reduce((sum, p) => sum + p.socialMetrics.engagementRate, 0) / profiles.length * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Campaigns:</span>
                  <span className="font-semibold">
                    {profiles.reduce((sum, p) => sum + p.campaignsParticipated, 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analysis: {selectedProfile.displayName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Reputation Breakdown</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Overall Score:</span>
                        <span className="font-semibold">{(selectedProfile.reputationMetrics.overallScore * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Social Rank:</span>
                        <span className="font-semibold">{(selectedProfile.reputationMetrics.socialRank * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Endorsement Quality:</span>
                        <span className="font-semibold">{(selectedProfile.reputationMetrics.endorsementQuality * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Social Metrics</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Followers:</span>
                        <span className="font-semibold">{selectedProfile.socialMetrics.followerCount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Engagement Rate:</span>
                        <span className="font-semibold">{(selectedProfile.socialMetrics.engagementRate * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Posts:</span>
                        <span className="font-semibold">{selectedProfile.socialMetrics.totalPosts}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="dkg" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DKG Edge Node Queries</CardTitle>
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
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold">Recent Queries</h4>
                <div className="space-y-2">
                  {[
                    { type: 'reputation_graph', ual: 'did:dkg:otp:20430:0x1234...', time: '2s ago', status: 'success' },
                    { type: 'social_rank', ual: 'did:dkg:otp:20430:0x5678...', time: '5s ago', status: 'success' },
                    { type: 'sybil_analysis', ual: 'did:dkg:otp:20430:0x9abc...', time: '12s ago', status: 'success' },
                  ].map((query, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded">
                      <div className="flex items-center gap-3">
                        <Database className="w-4 h-4" />
                        <div>
                          <div className="text-sm font-medium">{query.type}</div>
                          <div className="text-xs text-muted-foreground">{query.ual}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-muted-foreground">{query.time}</span>
                      </div>
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

