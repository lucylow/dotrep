import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp,
  Shield,
  Coins,
  Vote,
  Image as ImageIcon,
  Globe
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useDotRepWallet } from "@/_core/hooks/useDotRepWallet";

const DAPP_TYPES = [
  { value: "general", label: "General", icon: Globe },
  { value: "defi", label: "DeFi", icon: Coins },
  { value: "governance", label: "Governance", icon: Vote },
  { value: "nft", label: "NFT", icon: ImageIcon },
] as const;

export default function ContextAwareReputationPage() {
  const { connectionResult } = useDotRepWallet();
  const [accountId, setAccountId] = useState(
    connectionResult?.account?.address || ""
  );
  const [dappType, setDappType] = useState<"defi" | "governance" | "nft" | "general">("general");
  const [highlightSkills, setHighlightSkills] = useState<string[]>([]);

  const { data: reputation, isLoading } = trpc.polkadot.reputation.getContextAware.useQuery(
    {
      accountId,
      dappType,
      highlightSkills,
    },
    { enabled: !!accountId }
  );

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              Context-Aware Reputation
            </h1>
            <p className="text-muted-foreground mt-2">
              View reputation filtered by dApp type and highlighted skills
            </p>
          </div>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Configure how reputation is displayed based on context
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="account">Account Address</Label>
                <Input
                  id="account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                  className="font-mono mt-1"
                />
                {connectionResult?.account?.address && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setAccountId(connectionResult.account.address)}
                  >
                    Use Connected
                  </Button>
                )}
              </div>

              <div>
                <Label htmlFor="dappType">dApp Type</Label>
                <Select value={dappType} onValueChange={(value: any) => setDappType(value)}>
                  <SelectTrigger id="dappType" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAPP_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Reputation Display */}
          {accountId && (
            <Card>
              <CardHeader>
                <CardTitle>Reputation Breakdown</CardTitle>
                <CardDescription>
                  Reputation filtered for {dappType} context
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Loading reputation...
                  </div>
                ) : reputation ? (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
                        <div className="text-4xl font-bold text-purple-600">
                          {reputation.overall}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">Percentile</div>
                        <div className="text-2xl font-bold">
                          {reputation.percentile}%
                        </div>
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div>
                      <h3 className="font-semibold mb-4">Contribution Breakdown</h3>
                      <div className="space-y-3">
                        {reputation.breakdown && reputation.breakdown.length > 0 ? (
                          reputation.breakdown.map((item: any, index: number) => (
                            <Card key={index} className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold">{item.type}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {item.description || "Contribution type"}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold">{item.score}</div>
                                  <div className="text-xs text-muted-foreground">points</div>
                                </div>
                              </div>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            No contributions found for this context
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Context Info */}
                    {reputation.context && (
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="text-sm">
                            <div className="font-semibold mb-2">Context Information</div>
                            <div className="space-y-1">
                              <div>
                                <span className="text-muted-foreground">dApp Type: </span>
                                <Badge variant="secondary">{reputation.context.dappType}</Badge>
                              </div>
                              {reputation.context.highlightSkills && reputation.context.highlightSkills.length > 0 && (
                                <div>
                                  <span className="text-muted-foreground">Highlighted Skills: </span>
                                  {reputation.context.highlightSkills.map((skill: string, i: number) => (
                                    <Badge key={i} variant="outline" className="ml-1">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No reputation data found for this account
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">How Context-Aware Reputation Works</h4>
                  <p className="text-sm text-muted-foreground">
                    Different dApps have different requirements. Context-aware reputation filters
                    and prioritizes contributions based on the type of application. For example,
                    DeFi applications prioritize smart contract audits and security reviews, while
                    governance platforms prioritize community participation and documentation.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </UnifiedSidebar>
  );
}


