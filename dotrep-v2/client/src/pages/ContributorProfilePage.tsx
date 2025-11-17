import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  TrendingUp, 
  GitPullRequest, 
  Award, 
  Shield,
  ExternalLink,
  Calendar,
  Users
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { SkeletonCard } from "@/components/ui/EnhancedLoading";
import { ContributionList } from "@/components/contributions/ContributionList";

export default function ContributorProfilePage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute<{ username: string }>("/contributor/:username");
  
  // Extract username from route params or query string
  const searchParams = new URLSearchParams(window.location.search);
  const username = params?.username || searchParams.get("username") || "";

  const { data: contributor, isLoading } = trpc.contributor.getByGithubUsername.useQuery(
    { username },
    { enabled: !!username }
  );

  const { data: stats } = trpc.contributor.getStats.useQuery(
    { id: contributor?.id || 0 },
    { enabled: !!contributor?.id }
  );

  const { data: contributions = [] } = trpc.contribution.getByContributor.useQuery(
    { contributorId: contributor?.id || 0 },
    { enabled: !!contributor?.id }
  );

  const { data: achievements = [] } = trpc.achievement.getByContributor.useQuery(
    { id: contributor?.id || 0 },
    { enabled: !!contributor?.id }
  );

  if (isLoading) {
    return (
      <UnifiedSidebar>
        <div className="p-6">
          <SkeletonCard />
        </div>
      </UnifiedSidebar>
    );
  }

  if (!contributor) {
    return (
      <UnifiedSidebar>
        <div className="p-6">
          <Card>
            <CardContent className="p-12 text-center">
              <h2 className="text-2xl font-bold mb-4">Contributor Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The contributor "{username}" could not be found.
              </p>
              <Button onClick={() => navigate("/leaderboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Leaderboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </UnifiedSidebar>
    );
  }

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" onClick={() => navigate("/leaderboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>

          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <img
                  src={contributor.githubAvatar || "https://via.placeholder.com/100"}
                  alt={contributor.githubUsername}
                  className="w-24 h-24 rounded-full border-4 border-purple-200"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{contributor.githubUsername}</h1>
                    {contributor.verified && (
                      <Badge className="bg-green-500">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {contributor.walletAddress && (
                    <p className="text-sm text-muted-foreground font-mono mb-4">
                      {contributor.walletAddress}
                    </p>
                  )}
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-3xl font-bold text-purple-600">
                        {contributor.reputationScore}
                      </div>
                      <div className="text-sm text-muted-foreground">Reputation Score</div>
                    </div>
                    <div>
                      <div className="text-3xl font-bold">
                        {contributor.totalContributions}
                      </div>
                      <div className="text-sm text-muted-foreground">Contributions</div>
                    </div>
                    {stats && (
                      <>
                        <div>
                          <div className="text-3xl font-bold">
                            {stats.verifiedContributions || 0}
                          </div>
                          <div className="text-sm text-muted-foreground">Verified</div>
                        </div>
                        <div>
                          <div className="text-3xl font-bold">
                            {achievements.length}
                          </div>
                          <div className="text-sm text-muted-foreground">Achievements</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(`https://github.com/${contributor.githubUsername}`, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="contributions" className="space-y-4">
            <TabsList>
              <TabsTrigger value="contributions">
                <GitPullRequest className="w-4 h-4 mr-2" />
                Contributions ({contributions.length})
              </TabsTrigger>
              <TabsTrigger value="achievements">
                <Award className="w-4 h-4 mr-2" />
                Achievements ({achievements.length})
              </TabsTrigger>
              <TabsTrigger value="stats">
                <TrendingUp className="w-4 h-4 mr-2" />
                Statistics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="contributions">
              <Card>
                <CardHeader>
                  <CardTitle>Contributions</CardTitle>
                  <CardDescription>
                    All contributions by {contributor.githubUsername}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContributionList contributions={contributions} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <Card>
                <CardHeader>
                  <CardTitle>Achievements</CardTitle>
                  <CardDescription>
                    Badges and milestones earned by {contributor.githubUsername}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {achievements.map((achievement) => (
                      <Card key={achievement.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-4xl">{achievement.iconUrl}</div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{achievement.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {achievement.description}
                            </p>
                            {achievement.earnedAt && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {new Date(achievement.earnedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stats">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle>Contribution Statistics</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total Contributions</span>
                          <span className="font-bold">{contributor.totalContributions}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Verified Contributions</span>
                          <span className="font-bold">{stats.verifiedContributions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pending Verification</span>
                          <span className="font-bold">
                            {contributor.totalContributions - (stats.verifiedContributions || 0)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Reputation Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between">
                          <span>Current Score</span>
                          <span className="font-bold text-purple-600">
                            {contributor.reputationScore}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Average per Contribution</span>
                          <span className="font-bold">
                            {contributor.totalContributions > 0
                              ? Math.round(contributor.reputationScore / contributor.totalContributions)
                              : 0}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

