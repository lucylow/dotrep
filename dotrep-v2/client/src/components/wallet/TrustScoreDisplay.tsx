import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, Clock, Users } from "lucide-react";
import type { ReputationData } from "../../_core/wallet/DotRepWalletConnection";

interface TrustScoreDisplayProps {
  reputation: ReputationData;
  address: string;
}

export function TrustScoreDisplay({ reputation, address }: TrustScoreDisplayProps) {
  const getTrustRating = () => {
    if (reputation.score >= 1000) return { level: "Verified Legend", color: "text-yellow-400", icon: "⭐" };
    if (reputation.score >= 500) return { level: "Verified Expert", color: "text-purple-400", icon: "💎" };
    if (reputation.score >= 100) return { level: "Verified Contributor", color: "text-blue-400", icon: "✅" };
    if (reputation.score > 0) return { level: "New Contributor", color: "text-gray-400", icon: "🌱" };
    return { level: "Unverified", color: "text-red-400", icon: "⚠️" };
  };

  const trustRating = getTrustRating();
  
  const getYearsInEcosystem = () => {
    if (reputation.lastUpdated === 0) return null;
    const years = (Date.now() - reputation.lastUpdated * 1000) / (1000 * 60 * 60 * 24 * 365);
    return years >= 1 ? Math.floor(years) : null;
  };

  const yearsInEcosystem = getYearsInEcosystem();

  return (
    <Card className="border-green-500/30 bg-green-500/10">
      <CardContent className="pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" />
              <span className="text-sm font-medium text-gray-400">Trust Rating</span>
            </div>
            <Badge className={`${trustRating.color} bg-transparent border ${trustRating.color.replace('text-', 'border-')}/50`}>
              {trustRating.icon} {trustRating.level}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-green-400" />
              <span>Score: {reputation.score.toLocaleString()}</span>
            </div>

            {reputation.contributionCount > 0 && (
              <div className="flex items-center gap-2 text-gray-300">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span>{reputation.contributionCount}+ verified contributions</span>
              </div>
            )}

            {yearsInEcosystem && (
              <div className="flex items-center gap-2 text-gray-300">
                <Clock className="h-4 w-4 text-green-400" />
                <span>{yearsInEcosystem}+ {yearsInEcosystem === 1 ? "year" : "years"} in ecosystem</span>
              </div>
            )}

            {reputation.skills.length > 0 && (
              <div className="flex items-center gap-2 text-gray-300">
                <Users className="h-4 w-4 text-green-400" />
                <span>{reputation.skills.length} skill {reputation.skills.length === 1 ? "tag" : "tags"}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-800">
            <div className="text-xs text-gray-500 font-mono">
              🔗 {address.slice(0, 10)}...{address.slice(-8)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

