import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { 
  Award, GitBranch, Shield, TrendingUp, Github, 
  Sparkles, CheckCircle2, Clock, ExternalLink,
  Zap, Database, Activity, Trophy, Star
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DashboardImproved() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: contributor, isLoading: contributorLoading, refetch: refetchContributor } = trpc.contributor.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: allContributions = [] } = trpc.contribution.list.useQuery(
    { contributorId: contributor?.id || 0 },
    { enabled: !!contributor }
  );

  const { data: achievements = [] } = trpc.achievement.list.useQuery(
    { contributorId: contributor?.id || 0 },
    { enabled: !!contributor }
  );

  // Calculate stats
  const stats = {
    totalScore: contributor?.totalReputationScore || 0,
    contributions: allContributions.length,
    verified: allContributions.filter((c: any) => c.verified).length,
    achievements: achievements.length,
    commits: allContributions.filter((c: any) => c.type === 'commit').length,
    prs: allContributions.filter((c: any) => c.type === 'pull_request').length,
    issues: allContributions.filter((c: any) => c.type === 'issue').length,
    reviews: allContributions.filter((c: any) => c.type === 'review').length,
  };

  const verificationRate = stats.contributions > 0 
    ? Math.round((stats.verified / stats.contributions) * 100) 
    : 0;

  if (loading || contributorLoading) {
    return (
      <UnifiedSidebar>
        <div className="p-6 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#6C3CF0] to-[#A074FF]">
              <Shield className="h-8 w-8 animate-pulse text-white" />
          </div>
            <div className="text-xl text-[#4F4F4F]">Loading Dashboard...</div>
        </motion.div>
      </div>
      </UnifiedSidebar>
    );
  }

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
                <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] bg-clip-text text-transparent">
                Welcome back, {user?.name || 'Developer'}
              </h1>
                <p className="text-[#4F4F4F] text-lg">
                Your decentralized reputation dashboard
              </p>
            </div>
            {contributor?.githubUsername && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700"
              >
                <Github className="h-5 w-5 text-gray-400" />
                <span className="text-gray-300">{contributor.githubUsername}</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Linked
                </Badge>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Hero Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid gap-6 md:grid-cols-4"
        >
          <Card className="relative overflow-hidden border-[#6C3CF0]/30 dark:border-[#6C3CF0]/30 bg-gradient-to-br from-[#6C3CF0]/10 to-[#A074FF]/10 dark:from-[#6C3CF0]/20 dark:to-[#A074FF]/20 backdrop-blur card-enhanced">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#6C3CF0]/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Reputation Score
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-[#6C3CF0]" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold gradient-text mb-2">
                {stats.totalScore.toLocaleString()}
              </div>
              <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                <Sparkles className="mr-1 h-3 w-3" />
                <span>Top 10% this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-[#A074FF]/30 dark:border-[#A074FF]/30 bg-gradient-to-br from-[#A074FF]/10 to-[#6C3CF0]/10 dark:from-[#A074FF]/20 dark:to-[#6C3CF0]/20 backdrop-blur card-enhanced">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#A074FF]/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Contributions
              </CardTitle>
              <GitBranch className="h-5 w-5 text-[#A074FF]" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#131313] dark:text-white mb-2">
                {stats.contributions}
              </div>
              <div className="flex items-center text-sm text-[#A074FF]">
                <Activity className="mr-1 h-3 w-3" />
                <span>{stats.commits} commits, {stats.prs} PRs</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-blue-500/30 dark:border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 backdrop-blur card-enhanced">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Verification Rate
              </CardTitle>
              <Shield className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#131313] dark:text-white mb-2">
                {verificationRate}%
              </div>
              <Progress value={verificationRate} className="h-2" />
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {stats.verified} of {stats.contributions} verified
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-yellow-500/30 dark:border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 dark:from-yellow-500/20 dark:to-orange-500/20 backdrop-blur card-enhanced">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Achievements
              </CardTitle>
              <Award className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-[#131313] dark:text-white mb-2">
                {stats.achievements}
              </div>
              <div className="flex items-center text-sm text-yellow-600 dark:text-yellow-400">
                <Star className="mr-1 h-3 w-3" />
                <span>3 new this week</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white transition-smooth">
              Overview
            </TabsTrigger>
            <TabsTrigger value="contributions" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white transition-smooth">
              Contributions
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white transition-smooth">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="proofs" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white transition-smooth">
              Proof Explorer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Contribution Type Breakdown */}
            <Card className="card-enhanced border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#131313] dark:text-white flex items-center gap-2">
                  <Database className="h-5 w-5 text-[#6C3CF0]" />
                  Contribution Breakdown
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Distribution by contribution type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-4">
                  {[
                    { type: 'commit', label: 'Commits', count: stats.commits, color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
                    { type: 'pull_request', label: 'Pull Requests', count: stats.prs, color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/30' },
                    { type: 'issue', label: 'Issues', count: stats.issues, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
                    { type: 'review', label: 'Reviews', count: stats.reviews, color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
                  ].map(({ type, label, count, color, bgColor, borderColor }) => (
                    <motion.div
                      key={type}
                      whileHover={{ scale: 1.05 }}
                      className={`text-center p-4 rounded-lg border ${borderColor} ${bgColor}`}
                    >
                      <div className={`text-4xl font-bold ${color} mb-1`}>{count}</div>
                      <div className="text-sm text-gray-400">{label}</div>
                      <div className="mt-2 text-xs text-gray-500">
                        {count > 0 ? `${Math.round((count / stats.contributions) * 100)}% of total` : 'No activity'}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="card-enhanced border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#131313] dark:text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#6C3CF0]" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Your latest contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allContributions.slice(0, 5).map((contribution: any, index: number) => (
                    <motion.div
                      key={contribution.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700/50 hover:border-[#6C3CF0]/50 transition-smooth"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${
                          contribution.type === 'commit' ? 'bg-blue-500/20 text-blue-400' :
                          contribution.type === 'pull_request' ? 'bg-green-500/20 text-green-400' :
                          contribution.type === 'issue' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-purple-500/20 text-purple-400'
                        }`}>
                          <GitBranch className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-medium text-[#131313] dark:text-white">{contribution.type}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {contribution.repository} • {new Date(contribution.contributedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-[#6C3CF0]/50 text-[#6C3CF0] dark:text-[#A074FF]">
                          +{contribution.score} pts
                        </Badge>
                        {contribution.verified && (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contributions">
            <Card className="card-enhanced border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#131313] dark:text-white">All Contributions</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Complete history of your open source contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-400">
                  Full contribution list view - Coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements">
            <Card className="card-enhanced border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#131313] dark:text-white">Achievements & Badges</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Your earned achievements and milestones
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {achievements.map((achievement: any, index: number) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-gradient-to-br from-[#6C3CF0]/10 to-[#A074FF]/10 dark:from-[#6C3CF0]/20 dark:to-[#A074FF]/20 border border-[#6C3CF0]/30 text-center card-hover"
                    >
                      <Award className="h-12 w-12 mx-auto mb-2 text-[#6C3CF0]" />
                      <div className="font-semibold text-[#131313] dark:text-white">{achievement.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{achievement.description}</div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="proofs">
            <Card className="card-enhanced border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-[#131313] dark:text-white flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#6C3CF0]" />
                  Proof Explorer
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Verify cryptographic proofs of your contributions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary shadow-lg">
                    <Shield className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 mb-4">
                    Merkle proof verification coming soon
                  </div>
                  <Button className="btn-primary">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Explorer
                  </Button>
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
