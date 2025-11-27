import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, TrendingUp, Award, GitCommit, GitPullRequest, MessageSquare, FileCode, Search, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useDotRepWallet } from "@/_core/hooks/useDotRepWallet";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ReputationPage() {
  const [accountId, setAccountId] = useState("");
  const [threshold, setThreshold] = useState("100");
  const { connectionResult } = useDotRepWallet();
  
  // Use connected wallet address if available
  const queryAccountId = accountId || connectionResult?.address || "";
  
  const reputationQuery = trpc.polkadot.reputation.get.useQuery(
    { accountId: queryAccountId },
    { enabled: !!queryAccountId }
  );
  
  const contributionCountQuery = trpc.polkadot.reputation.getContributionCount.useQuery(
    { accountId: queryAccountId },
    { enabled: !!queryAccountId }
  );
  
  const hasSufficientQuery = trpc.polkadot.reputation.hasSufficient.useQuery(
    { accountId: queryAccountId, threshold: parseFloat(threshold) || 100 },
    { enabled: !!queryAccountId && !!threshold }
  );
  
  const previewQuery = trpc.polkadot.reputation.preview.useQuery(
    { accountId: queryAccountId },
    { enabled: !!queryAccountId }
  );

  return (
    <UnifiedSidebar>
      <div className="min-h-screen bg-gradient-to-b from-[#F8F7FF] to-white p-6">

        <div className="container mx-auto px-4 py-12">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-5xl font-extrabold text-[#131313] mb-4">Reputation System</h1>
            <p className="text-xl text-[#4F4F4F] mb-12">
              How we calculate and verify your open source reputation score
            </p>

            {/* Reputation Query Section */}
            <Card className="p-6 mb-8 rounded-2xl border-2 border-[#6C3CF0]">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Search className="w-6 h-6" />
                Query Reputation
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="accountId">Account ID</Label>
                  <Input
                    id="accountId"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder={connectionResult?.address || "Enter account ID or connect wallet"}
                    className="mt-1 font-mono"
                  />
                  {connectionResult?.account?.address && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Connected: {connectionResult.account.address.slice(0, 20)}...
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="threshold">Reputation Threshold</Label>
                  <Input
                    id="threshold"
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="100"
                    className="mt-1"
                  />
                </div>
              </div>
            </Card>

            {/* Live Reputation Data */}
            {queryAccountId && (
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                {reputationQuery.isLoading ? (
                  <Card className="p-8 rounded-2xl border-2 border-gray-100">
                    <Loader2 className="w-12 h-12 text-[#6C3CF0] mb-4 animate-spin mx-auto" />
                    <div className="text-[#4F4F4F] text-center">Loading reputation...</div>
                  </Card>
                ) : reputationQuery.data ? (
                  <Card className="p-8 rounded-2xl border-2 border-[#6C3CF0] bg-gradient-to-br from-[#FBF9FF] to-white">
                    <TrendingUp className="w-12 h-12 text-[#6C3CF0] mb-4" />
                    <div className="text-5xl font-extrabold text-[#131313] mb-2 font-mono">
                      {reputationQuery.data.overall.toLocaleString()}
                    </div>
                    <div className="text-[#4F4F4F] mb-2">Total Reputation Score</div>
                    {reputationQuery.data.percentile !== undefined && (
                      <Badge variant="outline" className="mt-2">
                        {reputationQuery.data.percentile}th percentile
                      </Badge>
                    )}
                  </Card>
                ) : (
                  <Card className="p-8 rounded-2xl border-2 border-gray-100">
                    <XCircle className="w-12 h-12 text-red-500 mb-4" />
                    <div className="text-[#4F4F4F]">No reputation data found</div>
                  </Card>
                )}

                {contributionCountQuery.isLoading ? (
                  <Card className="p-8 rounded-2xl border-2 border-gray-100">
                    <Loader2 className="w-12 h-12 text-[#3DD68C] mb-4 animate-spin mx-auto" />
                    <div className="text-[#4F4F4F] text-center">Loading contributions...</div>
                  </Card>
                ) : contributionCountQuery.data !== undefined ? (
                  <Card className="p-8 rounded-2xl border-2 border-gray-100">
                    <Award className="w-12 h-12 text-[#3DD68C] mb-4" />
                    <div className="text-5xl font-extrabold text-[#131313] mb-2 font-mono">
                      {contributionCountQuery.data}
                    </div>
                    <div className="text-[#4F4F4F]">Verified Contributions</div>
                  </Card>
                ) : null}

                {hasSufficientQuery.data !== undefined && (
                  <Card className="p-8 rounded-2xl border-2 border-gray-100">
                    <Shield className="w-12 h-12 text-[#A074FF] mb-4" />
                    <div className="flex items-center gap-2 mb-2">
                      {hasSufficientQuery.data ? (
                        <>
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                          <div className="text-2xl font-bold text-green-600">Sufficient</div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-6 h-6 text-red-500" />
                          <div className="text-2xl font-bold text-red-600">Insufficient</div>
                        </>
                      )}
                    </div>
                    <div className="text-[#4F4F4F]">
                      Reputation {hasSufficientQuery.data ? "meets" : "below"} threshold of {threshold}
                    </div>
                  </Card>
                )}

                {previewQuery.data && (
                  <Card className="p-8 rounded-2xl border-2 border-gray-100">
                    <Award className="w-12 h-12 text-[#F0C33C] mb-4" />
                    <div className="text-2xl font-bold text-[#131313] mb-2">
                      Tier: {previewQuery.data.tier}
                    </div>
                    <div className="text-[#4F4F4F] space-y-1">
                      <div>Score: {previewQuery.data.score}</div>
                      <div>Contributions: {previewQuery.data.contributionCount}</div>
                      <div>Percentile: {previewQuery.data.percentile}%</div>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Score Breakdown (Static Info) */}
            {!queryAccountId && (
              <div className="grid md:grid-cols-3 gap-6 mb-12">
                <Card className="p-8 rounded-2xl border-2 border-[#6C3CF0] bg-gradient-to-br from-[#FBF9FF] to-white">
                  <TrendingUp className="w-12 h-12 text-[#6C3CF0] mb-4" />
                  <div className="text-5xl font-extrabold text-[#131313] mb-2 font-mono">1,250</div>
                  <div className="text-[#4F4F4F]">Total Reputation Score</div>
                </Card>
                <Card className="p-8 rounded-2xl border-2 border-gray-100">
                  <Award className="w-12 h-12 text-[#3DD68C] mb-4" />
                  <div className="text-5xl font-extrabold text-[#131313] mb-2 font-mono">42</div>
                  <div className="text-[#4F4F4F]">Verified Contributions</div>
                </Card>
                <Card className="p-8 rounded-2xl border-2 border-gray-100">
                  <Shield className="w-12 h-12 text-[#A074FF] mb-4" />
                  <div className="text-5xl font-extrabold text-[#131313] mb-2 font-mono">98%</div>
                  <div className="text-[#4F4F4F]">Verification Rate</div>
                </Card>
              </div>
            )}

          {/* Contribution Types */}
          <section className="mb-12">
            <h2 className="text-3xl font-extrabold text-[#131313] mb-6">Contribution Scoring</h2>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center">
                      <GitCommit className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#131313]">Commits</h4>
                      <p className="text-sm text-[#4F4F4F]">Code contributions to repositories</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#6C3CF0] font-mono">+10-50</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3DD68C] to-[#2AB870] flex items-center justify-center">
                      <GitPullRequest className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#131313]">Pull Requests</h4>
                      <p className="text-sm text-[#4F4F4F]">Merged PRs with code review</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#3DD68C] font-mono">+50-200</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F0C33C] to-[#D4A82E] flex items-center justify-center">
                      <FileCode className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#131313]">Issues</h4>
                      <p className="text-sm text-[#4F4F4F]">Bug reports and feature requests</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#F0C33C] font-mono">+5-25</div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A074FF] to-[#8A5FE6] flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#131313]">Code Reviews</h4>
                      <p className="text-sm text-[#4F4F4F]">Reviewing others' contributions</p>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-[#A074FF] font-mono">+25-100</div>
                </div>
              </div>
            </Card>
          </section>

          {/* AI-Augmented Scoring */}
          <section className="mb-12">
            <h2 className="text-3xl font-extrabold text-[#131313] mb-6">AI-Augmented Scoring</h2>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <p className="text-[#4F4F4F] mb-6">
                Our AI engine analyzes multiple dimensions to provide a comprehensive reputation score:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-[#131313] mb-2">📊 Code Quality</h4>
                  <p className="text-sm text-[#4F4F4F]">
                    Analyzes code complexity, test coverage, and best practices
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[#131313] mb-2">🎯 Impact Score</h4>
                  <p className="text-sm text-[#4F4F4F]">
                    Measures downstream dependencies and adoption
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[#131313] mb-2">💬 Community Engagement</h4>
                  <p className="text-sm text-[#4F4F4F]">
                    Evaluates helpfulness and collaboration
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-[#131313] mb-2">⏱️ Consistency</h4>
                  <p className="text-sm text-[#4F4F4F]">
                    Rewards regular, sustained contributions
                  </p>
                </div>
              </div>
            </Card>
          </section>

          {/* Reputation → SBT Flow */}
          <section className="mb-12">
            <h2 className="text-3xl font-extrabold text-[#131313] mb-6">From Reputation to SBT</h2>
            <Card className="p-8 rounded-2xl border-2 border-gray-100">
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#6C3CF0] text-white flex items-center justify-center font-bold flex-shrink-0">1</div>
                  <div>
                    <h4 className="font-bold text-[#131313]">Contributions Verified</h4>
                    <p className="text-sm text-[#4F4F4F]">Cryptographic proofs anchored on-chain</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#6C3CF0] text-white flex items-center justify-center font-bold flex-shrink-0">2</div>
                  <div>
                    <h4 className="font-bold text-[#131313]">Score Calculated</h4>
                    <p className="text-sm text-[#4F4F4F]">Multi-dimensional AI scoring applied</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#6C3CF0] text-white flex items-center justify-center font-bold flex-shrink-0">3</div>
                  <div>
                    <h4 className="font-bold text-[#131313]">SBT Metadata Generated</h4>
                    <p className="text-sm text-[#4F4F4F]">JSON metadata with score, badges, and proofs</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#6C3CF0] text-white flex items-center justify-center font-bold flex-shrink-0">4</div>
                  <div>
                    <h4 className="font-bold text-[#131313]">SBT Minted On-Chain</h4>
                    <p className="text-sm text-[#4F4F4F]">Non-transferable NFT issued to your wallet</p>
                  </div>
                </div>
              </div>
            </Card>
          </section>

            {/* CTA */}
            <div className="text-center">
              <Link href="/proof-explorer">
                <Button size="lg" className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF] text-white rounded-xl px-8 py-6 text-lg shadow-[0_4px_24px_rgba(108,60,240,0.3)] hover:shadow-[0_8px_32px_rgba(108,60,240,0.4)] transition-all hover:scale-105">
                  Inspect Proofs in Explorer
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </UnifiedSidebar>
  );
}
