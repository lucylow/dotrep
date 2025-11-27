import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield,
  Coins,
  TrendingUp,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { toast } from "sonner";

export default function TrustLayerPage() {
  const [userDID, setUserDID] = useState("");
  const [stakeAmount, setStakeAmount] = useState("");
  const [targetTier, setTargetTier] = useState<"BASIC" | "VERIFIED" | "PREMIUM" | "ELITE">("BASIC");
  const [unstakeAmount, setUnstakeAmount] = useState("");

  const stakeMutation = trpc.trust.stake.useMutation({
    onSuccess: () => {
      toast.success("Stake successful!");
      setStakeAmount("");
    },
    onError: (error) => {
      toast.error(`Staking failed: ${error.message}`);
    },
  });

  const unstakeMutation = trpc.trust.unstake.useMutation({
    onSuccess: () => {
      toast.success("Unstake successful!");
      setUnstakeAmount("");
    },
    onError: (error) => {
      toast.error(`Unstaking failed: ${error.message}`);
    },
  });

  const { data: stakeData, isLoading: stakeLoading } = trpc.trust.getStake.useQuery(
    { userDID },
    { enabled: !!userDID }
  );

  const { data: trustReport, isLoading: reportLoading } = trpc.trust.getTrustReport.useQuery(
    { userDID },
    { enabled: !!userDID }
  );

  const { data: trustScore, isLoading: scoreLoading } = trpc.trust.getTrustScore.useQuery(
    { userDID },
    { enabled: !!userDID }
  );

  const handleStake = () => {
    if (!userDID || !stakeAmount) {
      toast.error("Please fill in all required fields");
      return;
    }
    stakeMutation.mutate({
      userDID,
      amount: stakeAmount,
      targetTier,
    });
  };

  const handleUnstake = () => {
    if (!userDID || !unstakeAmount) {
      toast.error("Please fill in all required fields");
      return;
    }
    unstakeMutation.mutate({
      userDID,
      amount: unstakeAmount,
    });
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              Trust Layer
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage staking, trust scores, and trust layer features
            </p>
          </div>

          <Tabs defaultValue="stake" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="stake">Staking</TabsTrigger>
              <TabsTrigger value="trust">Trust Score</TabsTrigger>
              <TabsTrigger value="report">Trust Report</TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
            </TabsList>

            <TabsContent value="stake">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Stake */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stake Tokens</CardTitle>
                    <CardDescription>
                      Stake tokens to increase your trust tier and reputation multiplier
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="stakeUserDID">User DID</Label>
                      <Input
                        id="stakeUserDID"
                        value={userDID}
                        onChange={(e) => setUserDID(e.target.value)}
                        placeholder="did:example:123"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="stakeAmount">Amount</Label>
                      <Input
                        id="stakeAmount"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="1000000000000000000"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="targetTier">Target Tier</Label>
                      <Select value={targetTier} onValueChange={(value: any) => setTargetTier(value)}>
                        <SelectTrigger id="targetTier" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BASIC">Basic</SelectItem>
                          <SelectItem value="VERIFIED">Verified</SelectItem>
                          <SelectItem value="PREMIUM">Premium</SelectItem>
                          <SelectItem value="ELITE">Elite</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleStake}
                      disabled={stakeMutation.isPending || !userDID || !stakeAmount}
                      className="w-full"
                    >
                      {stakeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Staking...
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Stake Tokens
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Unstake */}
                <Card>
                  <CardHeader>
                    <CardTitle>Unstake Tokens</CardTitle>
                    <CardDescription>
                      Unstake tokens from your trust layer stake
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="unstakeUserDID">User DID</Label>
                      <Input
                        id="unstakeUserDID"
                        value={userDID}
                        onChange={(e) => setUserDID(e.target.value)}
                        placeholder="did:example:123"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="unstakeAmount">Amount</Label>
                      <Input
                        id="unstakeAmount"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        placeholder="1000000000000000000"
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleUnstake}
                      disabled={unstakeMutation.isPending || !userDID || !unstakeAmount}
                      className="w-full"
                    >
                      {unstakeMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Unstaking...
                        </>
                      ) : (
                        <>
                          <Coins className="w-4 h-4 mr-2" />
                          Unstake Tokens
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Stake Info */}
                {userDID && (
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Stake Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {stakeLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        </div>
                      ) : stakeData?.stake ? (
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Total Staked</Label>
                            <div className="text-2xl font-bold">{stakeData.stake.totalStaked}</div>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Tier</Label>
                            <Badge className="mt-1">{stakeData.stake.tier}</Badge>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Reputation Multiplier</Label>
                            <div className="text-2xl font-bold">{stakeData.stake.reputationMultiplier}x</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No stake information found
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="trust">
              <Card>
                <CardHeader>
                  <CardTitle>Trust Score</CardTitle>
                  <CardDescription>
                    View comprehensive trust score for a user
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="trustUserDID">User DID</Label>
                    <Input
                      id="trustUserDID"
                      value={userDID}
                      onChange={(e) => setUserDID(e.target.value)}
                      placeholder="did:example:123"
                      className="mt-1"
                    />
                  </div>

                  {scoreLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                  ) : trustScore ? (
                    <div className="p-6 bg-purple-50 rounded-lg">
                      <div className="text-4xl font-bold text-purple-900 mb-2">
                        {trustScore.score?.toFixed(2) || "N/A"}
                      </div>
                      <p className="text-sm text-purple-700">Trust Score</p>
                    </div>
                  ) : userDID ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No trust score found
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Enter a User DID to view trust score
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report">
              <Card>
                <CardHeader>
                  <CardTitle>Trust Report</CardTitle>
                  <CardDescription>
                    Generate a comprehensive trust report
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="reportUserDID">User DID</Label>
                    <Input
                      id="reportUserDID"
                      value={userDID}
                      onChange={(e) => setUserDID(e.target.value)}
                      placeholder="did:example:123"
                      className="mt-1"
                    />
                  </div>

                  {reportLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                    </div>
                  ) : trustReport?.report ? (
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Reputation Score</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {trustReport.report.reputationScore || 0}
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Economic Trust</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {trustReport.report.economicTrust?.totalStaked || "0"}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Total Staked</p>
                          </CardContent>
                        </Card>
                      </div>

                      {trustReport.report.breakdown && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(trustReport.report.breakdown, null, 2)}
                            </pre>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : userDID ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No trust report found
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Enter a User DID to generate trust report
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="info">
              <Card>
                <CardHeader>
                  <CardTitle>About Trust Layer</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    The Trust Layer provides economic security and reputation enhancement through staking.
                    Users can stake tokens to increase their trust tier and unlock additional features.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Staking increases reputation multiplier</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Higher tiers unlock premium features</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Staked tokens can be slashed for misconduct</span>
                    </div>
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

