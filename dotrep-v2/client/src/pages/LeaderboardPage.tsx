import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Trophy, TrendingUp, Award, Medal } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function LeaderboardPage() {
  const { data: contributors, isLoading } = trpc.contributor.getAll.useQuery({ limit: 50 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8F7FF] to-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <Link href="/">
            <a className="flex items-center gap-2 text-[#6C3CF0] hover:text-[#A074FF] transition-colors">
              <Shield className="w-6 h-6" />
              <span className="text-xl font-extrabold">← Back to Home</span>
            </a>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Trophy className="w-16 h-16 text-[#6C3CF0] mx-auto mb-4" />
            <h1 className="text-5xl font-extrabold text-[#131313] mb-4">Leaderboard</h1>
            <p className="text-xl text-[#4F4F4F]">
              Top contributors ranked by reputation score
            </p>
          </div>

          {/* Top 3 Podium */}
          {contributors && contributors.length >= 3 && (
            <div className="grid md:grid-cols-3 gap-6 mb-12">
              {/* 2nd Place */}
              <Card className="p-8 rounded-2xl border-2 border-gray-200 text-center transform md:translate-y-8">
                <Medal className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="text-6xl font-extrabold text-gray-400 mb-2">2</div>
                <img
                  src={contributors[1]?.githubAvatar || "https://via.placeholder.com/100"}
                  alt="2nd place"
                  className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-gray-300"
                />
                <h3 className="font-bold text-[#131313] text-lg">{contributors[1]?.githubUsername}</h3>
                <div className="text-2xl font-bold text-[#6C3CF0] font-mono mt-2">
                  {contributors[1]?.reputationScore}
                </div>
              </Card>

              {/* 1st Place */}
              <Card className="p-8 rounded-2xl border-4 border-[#6C3CF0] bg-gradient-to-br from-[#FBF9FF] to-white text-center">
                <Trophy className="w-16 h-16 text-[#F0C33C] mx-auto mb-4" />
                <div className="text-7xl font-extrabold text-[#F0C33C] mb-2">1</div>
                <img
                  src={contributors[0]?.githubAvatar || "https://via.placeholder.com/100"}
                  alt="1st place"
                  className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-[#F0C33C]"
                />
                <h3 className="font-bold text-[#131313] text-xl">{contributors[0]?.githubUsername}</h3>
                <div className="text-3xl font-bold text-[#6C3CF0] font-mono mt-2">
                  {contributors[0]?.reputationScore}
                </div>
              </Card>

              {/* 3rd Place */}
              <Card className="p-8 rounded-2xl border-2 border-gray-200 text-center transform md:translate-y-8">
                <Award className="w-12 h-12 text-[#CD7F32] mx-auto mb-4" />
                <div className="text-6xl font-extrabold text-[#CD7F32] mb-2">3</div>
                <img
                  src={contributors[2]?.githubAvatar || "https://via.placeholder.com/100"}
                  alt="3rd place"
                  className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-[#CD7F32]"
                />
                <h3 className="font-bold text-[#131313] text-lg">{contributors[2]?.githubUsername}</h3>
                <div className="text-2xl font-bold text-[#6C3CF0] font-mono mt-2">
                  {contributors[2]?.reputationScore}
                </div>
              </Card>
            </div>
          )}

          {/* Full Leaderboard */}
          <Card className="rounded-2xl border-2 border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] px-6 py-4">
              <h2 className="text-2xl font-extrabold text-white">All Contributors</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {isLoading ? (
                <div className="p-12 text-center text-[#4F4F4F]">Loading...</div>
              ) : contributors && contributors.length > 0 ? (
                contributors.map((contributor, index) => (
                  <div
                    key={contributor.id}
                    className="px-6 py-4 hover:bg-[#FBF9FF] transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 text-center">
                        <span className="text-2xl font-bold text-[#4F4F4F] font-mono">
                          #{index + 1}
                        </span>
                      </div>
                      <img
                        src={contributor.githubAvatar || "https://via.placeholder.com/50"}
                        alt={contributor.githubUsername}
                        className="w-12 h-12 rounded-full border-2 border-gray-200"
                      />
                      <div>
                        <Link href={`/contributor/${contributor.githubUsername}`}>
                          <h4 className="font-bold text-[#131313] hover:text-[#6C3CF0] cursor-pointer transition-colors">
                            {contributor.githubUsername}
                          </h4>
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {contributor.totalContributions} contributions
                          </Badge>
                          {contributor.verified && (
                            <Badge className="text-xs bg-[#3DD68C] text-white">
                              ✓ Verified
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#6C3CF0] font-mono">
                          {contributor.reputationScore}
                        </div>
                        <div className="text-xs text-[#4F4F4F]">reputation</div>
                      </div>
                      <TrendingUp className="w-5 h-5 text-[#3DD68C]" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-[#4F4F4F]">No contributors found</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
