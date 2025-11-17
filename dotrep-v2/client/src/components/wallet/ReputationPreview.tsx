import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, TrendingUp, Award, Users, Clock } from "lucide-react";
import type { ReputationData } from "../../_core/wallet/DotRepWalletConnection";

interface ReputationPreviewProps {
  reputation: ReputationData;
  address: string;
}

export function ReputationPreview({ reputation, address }: ReputationPreviewProps) {
  const tierColors = {
    Novice: "bg-gray-500",
    Contributor: "bg-blue-500",
    Expert: "bg-purple-500",
    Legend: "bg-yellow-500"
  };

  const tierGradients = {
    Novice: "from-gray-500 to-gray-600",
    Contributor: "from-blue-500 to-blue-600",
    Expert: "from-purple-500 to-purple-600",
    Legend: "from-yellow-500 to-yellow-600"
  };

  const scoreToNextTier = () => {
    const { score, tier } = reputation;
    if (tier === "Legend") return { current: score, next: score, progress: 100 };
    if (tier === "Expert") return { current: score, next: 1000, progress: (score / 1000) * 100 };
    if (tier === "Contributor") return { current: score, next: 500, progress: (score / 500) * 100 };
    return { current: score, next: 100, progress: (score / 100) * 100 };
  };

  const progress = scoreToNextTier();

  return (
    <div className="space-y-4">
      <Card className={`border-${tierColors[reputation.tier]}/30 bg-gradient-to-br ${tierGradients[reputation.tier]}/10`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="h-5 w-5" />
              Reputation Preview
            </CardTitle>
            <Badge className={`${tierColors[reputation.tier]} text-white`}>
              {reputation.tier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Display */}
          <div className="text-center">
            <div className="text-4xl font-bold text-white mb-1">
              {reputation.score.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">
              Reputation Score
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Top {100 - reputation.percentile}% of contributors
            </div>
          </div>

          {/* Progress to Next Tier */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Progress to next tier</span>
              <span>{progress.current} / {progress.next}</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-pink-400 mb-1">
                <Award className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-white">
                {reputation.contributionCount}
              </div>
              <div className="text-xs text-gray-400">Contributions</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-white">
                {reputation.percentile}%
              </div>
              <div className="text-xs text-gray-400">Percentile</div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                <Users className="h-4 w-4" />
              </div>
              <div className="text-lg font-bold text-white">
                {reputation.skills.length}
              </div>
              <div className="text-xs text-gray-400">Skills</div>
            </div>
          </div>

          {/* Skill Tags */}
          {reputation.skills.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400">Skills</div>
              <div className="flex flex-wrap gap-2">
                {reputation.skills.slice(0, 6).map((skill, idx) => (
                  <Badge key={idx} variant="outline" className="border-gray-700 text-gray-300">
                    {skill}
                  </Badge>
                ))}
                {reputation.skills.length > 6 && (
                  <Badge variant="outline" className="border-gray-700 text-gray-500">
                    +{reputation.skills.length - 6} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Breakdown */}
          {reputation.breakdown.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-400">Score Breakdown</div>
              <div className="space-y-1">
                {reputation.breakdown.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">{item.type}</span>
                    <span className="text-white font-medium">{item.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Last Updated */}
          {reputation.lastUpdated > 0 && (
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-800">
              <Clock className="h-3 w-3" />
              <span>
                Last updated: {new Date(reputation.lastUpdated * 1000).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Address Display */}
      <Card className="border-gray-800 bg-gray-800/50">
        <CardContent className="pt-4">
          <div className="text-xs text-gray-400 mb-1">Wallet Address</div>
          <div className="font-mono text-sm text-white break-all">
            {address}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

