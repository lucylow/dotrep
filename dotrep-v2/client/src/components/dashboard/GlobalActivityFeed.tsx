import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GitBranch, 
  GitPullRequest, 
  MessageSquare,
  FileCode,
  Clock,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import { SkeletonCard } from "@/components/ui/EnhancedLoading";

/**
 * Global activity feed showing recent contributions from all contributors
 */
export const GlobalActivityFeed: React.FC<{ limit?: number }> = ({ limit = 20 }) => {
  const { data: recentContributions, isLoading } = trpc.contribution.getRecent.useQuery({ limit });

  const getContributionIcon = (type: string) => {
    switch (type) {
      case "pull_request":
        return GitPullRequest;
      case "commit":
        return GitBranch;
      case "issue":
        return MessageSquare;
      case "review":
        return FileCode;
      default:
        return GitBranch;
    }
  };

  const getContributionColor = (type: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      commit: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/50" },
      pull_request: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/50" },
      issue: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500/50" },
      review: { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/50" },
    };
    return colors[type] || colors.commit;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recentContributions || recentContributions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest contributions across the ecosystem</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No recent contributions found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>
          Latest contributions across the ecosystem
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentContributions.map((contribution: any) => {
            const Icon = getContributionIcon(contribution.contributionType);
            const colors = getContributionColor(contribution.contributionType);
            const createdAt = contribution.createdAt 
              ? new Date(contribution.createdAt).toLocaleDateString()
              : "Recently";

            return (
              <div
                key={contribution.id}
                className={`flex items-start gap-4 p-4 rounded-lg border ${colors.border} ${colors.bg} hover:shadow-md transition-all`}
              >
                <div className={`p-2 rounded-lg ${colors.bg} border ${colors.border}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm truncate">
                        {contribution.title || `${contribution.contributionType} in ${contribution.repoName}`}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {contribution.repoOwner}/{contribution.repoName}
                        </span>
                        {contribution.verified && (
                          <Badge variant="secondary" className="text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    {contribution.url && (
                      <a
                        href={contribution.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{createdAt}</span>
                    {contribution.reputationPoints > 0 && (
                      <Badge variant="outline" className="text-xs">
                        +{contribution.reputationPoints} pts
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};


