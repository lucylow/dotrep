import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Lock, ExternalLink } from "lucide-react";
import type { NftBadge } from "../../_core/wallet/DotRepWalletConnection";

interface NftBadgeDisplayProps {
  badges: NftBadge[];
  maxDisplay?: number;
}

export function NftBadgeDisplay({ badges, maxDisplay = 6 }: NftBadgeDisplayProps) {
  if (badges.length === 0) {
    return null;
  }

  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  const getBadgeIcon = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes("first")) return "🎯";
    if (typeLower.includes("governance")) return "🗳️";
    if (typeLower.includes("documentation")) return "📚";
    if (typeLower.includes("code")) return "💻";
    if (typeLower.includes("review")) return "👀";
    if (typeLower.includes("mentor")) return "🎓";
    return "🏆";
  };

  const getBadgeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes("first")) return "from-yellow-500 to-orange-500";
    if (typeLower.includes("governance")) return "from-blue-500 to-cyan-500";
    if (typeLower.includes("documentation")) return "from-green-500 to-emerald-500";
    if (typeLower.includes("code")) return "from-purple-500 to-pink-500";
    return "from-gray-500 to-gray-600";
  };

  return (
    <Card className="border-purple-500/30 bg-purple-500/10">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 text-lg">
          <Award className="h-5 w-5 text-purple-400" />
          Achievement Badges
          <Badge variant="outline" className="ml-auto border-purple-500/50 text-purple-400">
            {badges.length} {badges.length === 1 ? "badge" : "badges"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {displayBadges.map((badge) => (
            <Card
              key={badge.id}
              className={`border-gray-700 bg-gradient-to-br ${getBadgeColor(badge.achievementType)}/20 hover:scale-105 transition-transform cursor-pointer`}
            >
              <CardContent className="pt-4 pb-3">
                <div className="text-center space-y-2">
                  <div className="text-3xl mb-1">
                    {getBadgeIcon(badge.achievementType)}
                  </div>
                  <div className="text-xs font-medium text-white line-clamp-2">
                    {badge.achievementType}
                  </div>
                  {badge.soulbound && (
                    <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
                      <Lock className="h-3 w-3" />
                      <span>Soulbound</span>
                    </div>
                  )}
                  {badge.mintedAt > 0 && (
                    <div className="text-xs text-gray-500">
                      {new Date(badge.mintedAt * 1000).getFullYear()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {remainingCount > 0 && (
            <Card className="border-gray-700 bg-gray-800/50 flex items-center justify-center">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl mb-1">+{remainingCount}</div>
                <div className="text-xs text-gray-400">More badges</div>
              </CardContent>
            </Card>
          )}
        </div>

        {badges.length > maxDisplay && (
          <div className="mt-4 text-center">
            <button className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 mx-auto">
              View all badges
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

