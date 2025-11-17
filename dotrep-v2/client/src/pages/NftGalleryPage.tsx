import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award, 
  Trophy, 
  Star,
  Sparkles,
  Crown,
  Shield,
  Zap,
  Code,
  FileText,
  Users,
  Lock,
  ExternalLink
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useDotRepWallet } from "@/_core/hooks/useDotRepWallet";
import { SkeletonCard } from "@/components/ui/EnhancedLoading";

interface NFT {
  id: string;
  achievementType: string;
  name: string;
  description: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  mintedAt: number;
  contributionId?: number;
  soulbound: boolean;
  imageUri: string;
}

export default function NftGalleryPage() {
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const { connectionResult } = useDotRepWallet();
  const { data: nfts, isLoading } = trpc.polkadot.nft.getByAccount.useQuery(
    { accountId: connectionResult?.address || "" },
    { enabled: !!connectionResult?.address }
  );

  const mockNfts: NFT[] = [
    {
      id: "1",
      achievementType: "FirstContribution",
      name: "First Contribution",
      description: "Made your first open source contribution",
      rarity: "common",
      mintedAt: Date.now() - 86400000 * 60,
      contributionId: 1,
      soulbound: true,
      imageUri: "/api/placeholder/200/200"
    },
    {
      id: "2",
      achievementType: "CodeCommitMaster",
      name: "Code Commit Master",
      description: "Achieved 100+ code commits",
      rarity: "uncommon",
      mintedAt: Date.now() - 86400000 * 45,
      soulbound: true,
      imageUri: "/api/placeholder/200/200"
    },
    {
      id: "3",
      achievementType: "PullRequestExpert",
      name: "Pull Request Expert",
      description: "Merged 50+ pull requests",
      rarity: "rare",
      mintedAt: Date.now() - 86400000 * 30,
      soulbound: true,
      imageUri: "/api/placeholder/200/200"
    },
    {
      id: "4",
      achievementType: "ReputationMilestone",
      name: "Reputation Milestone: 5000",
      description: "Reached 5000 reputation points",
      rarity: "epic",
      mintedAt: Date.now() - 86400000 * 20,
      soulbound: true,
      imageUri: "/api/placeholder/200/200"
    },
    {
      id: "5",
      achievementType: "OpenSourceChampion",
      name: "Open Source Champion",
      description: "Top 1% contributor in the ecosystem",
      rarity: "legendary",
      mintedAt: Date.now() - 86400000 * 10,
      soulbound: true,
      imageUri: "/api/placeholder/200/200"
    }
  ];

  const getRarityColor = (rarity: NFT["rarity"]) => {
    const colors = {
      common: "bg-gray-100 text-gray-800 border-gray-300",
      uncommon: "bg-green-100 text-green-800 border-green-300",
      rare: "bg-blue-100 text-blue-800 border-blue-300",
      epic: "bg-purple-100 text-purple-800 border-purple-300",
      legendary: "bg-yellow-100 text-yellow-800 border-yellow-300"
    };
    return colors[rarity];
  };

  const getRarityIcon = (rarity: NFT["rarity"]) => {
    switch (rarity) {
      case "common":
        return <Star className="w-4 h-4" />;
      case "uncommon":
        return <Sparkles className="w-4 h-4" />;
      case "rare":
        return <Trophy className="w-4 h-4" />;
      case "epic":
        return <Crown className="w-4 h-4" />;
      case "legendary":
        return <Award className="w-4 h-4" />;
    }
  };

  const getAchievementIcon = (type: string) => {
    if (type.includes("Code")) return <Code className="w-6 h-6" />;
    if (type.includes("PullRequest")) return <Zap className="w-6 h-6" />;
    if (type.includes("Documentation")) return <FileText className="w-6 h-6" />;
    if (type.includes("Community")) return <Users className="w-6 h-6" />;
    return <Award className="w-6 h-6" />;
  };

  const displayNfts = nfts && nfts.length > 0 
    ? nfts.map((nft: any) => ({
        id: nft.id || nft.tokenId || "",
        achievementType: nft.achievementType || nft.type || "",
        name: nft.name || nft.title || "Achievement",
        description: nft.description || "",
        rarity: nft.rarity || "common",
        mintedAt: nft.mintedAt || nft.createdAt || Date.now(),
        contributionId: nft.contributionId,
        soulbound: nft.soulbound !== false,
        imageUri: nft.imageUri || nft.image || "/api/placeholder/200/200",
      }))
    : mockNfts;

  const filteredNfts = selectedRarity === "all" 
    ? displayNfts 
    : displayNfts.filter(nft => nft.rarity === selectedRarity);

  const stats = {
    total: displayNfts.length,
    byRarity: {
      common: displayNfts.filter(n => n.rarity === "common").length,
      uncommon: displayNfts.filter(n => n.rarity === "uncommon").length,
      rare: displayNfts.filter(n => n.rarity === "rare").length,
      epic: displayNfts.filter(n => n.rarity === "epic").length,
      legendary: displayNfts.filter(n => n.rarity === "legendary").length
    }
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-8 h-8 text-[#6C3CF0]" />
              <h1 className="text-4xl font-extrabold text-[#131313]">NFT Gallery</h1>
            </div>
            <p className="text-[#4F4F4F]">
              View your Soulbound Token (SBT) achievements and contribution milestones
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="text-sm text-[#4F4F4F] mb-1">Total NFTs</div>
              <div className="text-2xl font-bold text-[#131313]">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#4F4F4F] mb-1">Common</div>
              <div className="text-2xl font-bold text-gray-600">{stats.byRarity.common}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#4F4F4F] mb-1">Rare+</div>
              <div className="text-2xl font-bold text-blue-600">
                {stats.byRarity.rare + stats.byRarity.epic + stats.byRarity.legendary}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#4F4F4F] mb-1">Legendary</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.byRarity.legendary}</div>
            </Card>
          </div>

          <Tabs defaultValue="all" className="space-y-6">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all" onClick={() => setSelectedRarity("all")}>
                  All
                </TabsTrigger>
                <TabsTrigger value="common" onClick={() => setSelectedRarity("common")}>
                  Common
                </TabsTrigger>
                <TabsTrigger value="uncommon" onClick={() => setSelectedRarity("uncommon")}>
                  Uncommon
                </TabsTrigger>
                <TabsTrigger value="rare" onClick={() => setSelectedRarity("rare")}>
                  Rare
                </TabsTrigger>
                <TabsTrigger value="epic" onClick={() => setSelectedRarity("epic")}>
                  Epic
                </TabsTrigger>
                <TabsTrigger value="legendary" onClick={() => setSelectedRarity("legendary")}>
                  Legendary
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={selectedRarity}>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : filteredNfts.length === 0 ? (
                <Card className="p-12 text-center">
                  <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-[#131313] mb-2">
                    No NFTs Found
                  </h3>
                  <p className="text-[#4F4F4F]">
                    Start contributing to earn your first achievement NFT!
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredNfts.map((nft) => (
                    <Card key={nft.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                      <div className="relative">
                        <div className="aspect-square bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center">
                          <div className="text-white">
                            {getAchievementIcon(nft.achievementType)}
                          </div>
                        </div>
                        {nft.soulbound && (
                          <div className="absolute top-2 right-2">
                            <Badge className="bg-purple-100 text-purple-800 border-purple-300">
                              <Lock className="w-3 h-3 mr-1" />
                              Soulbound
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold text-[#131313]">{nft.name}</h3>
                          <Badge className={getRarityColor(nft.rarity)}>
                            {getRarityIcon(nft.rarity)}
                            <span className="ml-1 capitalize">{nft.rarity}</span>
                          </Badge>
                        </div>
                        <p className="text-sm text-[#4F4F4F] mb-4">{nft.description}</p>
                        <div className="flex items-center justify-between text-xs text-[#4F4F4F]">
                          <span>
                            Minted {Math.floor((Date.now() - nft.mintedAt) / 86400000)} days ago
                          </span>
                          {nft.contributionId && (
                            <Button variant="ghost" size="sm" className="h-6 text-xs">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Contribution
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

