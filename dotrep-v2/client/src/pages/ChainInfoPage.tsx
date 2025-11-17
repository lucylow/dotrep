import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Network, 
  Hash,
  Clock,
  Database,
  Activity,
  Link as LinkIcon
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { SkeletonCard } from "@/components/ui/EnhancedLoading";
import { useEffect, useState } from "react";

export default function ChainInfoPage() {
  const { data: chainInfo, isLoading: chainInfoLoading } = trpc.polkadot.chain.getInfo.useQuery();
  const { data: currentBlock, isLoading: blockLoading } = trpc.polkadot.chain.getCurrentBlock.useQuery(
    undefined,
    {
      refetchInterval: 5000, // Refresh every 5 seconds
    }
  );

  const [blockHistory, setBlockHistory] = useState<number[]>([]);

  useEffect(() => {
    if (currentBlock) {
      setBlockHistory((prev) => {
        const updated = [currentBlock, ...prev].slice(0, 10);
        return updated;
      });
    }
  }, [currentBlock]);

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Network className="w-8 h-8 text-purple-600" />
              Chain Information
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time information about the DotRep parachain
            </p>
          </div>

          {/* Chain Info */}
          <Card>
            <CardHeader>
              <CardTitle>Chain Details</CardTitle>
              <CardDescription>Information about the connected chain</CardDescription>
            </CardHeader>
            <CardContent>
              {chainInfoLoading ? (
                <SkeletonCard />
              ) : chainInfo ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Chain Name</div>
                    <div className="text-xl font-semibold">{chainInfo.name || "DotRep Parachain"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Chain ID</div>
                    <div className="font-mono text-lg">{chainInfo.chainId || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Runtime Version</div>
                    <div className="font-mono">{chainInfo.runtimeVersion || "N/A"}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Spec Version</div>
                    <div className="font-mono">{chainInfo.specVersion || "N/A"}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Unable to fetch chain information
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Block */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5" />
                Current Block
              </CardTitle>
              <CardDescription>Latest block number on the chain</CardDescription>
            </CardHeader>
            <CardContent>
              {blockLoading ? (
                <SkeletonCard />
              ) : currentBlock !== undefined ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Block Number</div>
                      <div className="text-4xl font-bold font-mono">
                        {currentBlock.toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      <Activity className="w-4 h-4 mr-2" />
                      Live
                    </Badge>
                  </div>

                  {blockHistory.length > 1 && (
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Recent Blocks</div>
                      <div className="flex gap-2 flex-wrap">
                        {blockHistory.slice(0, 10).map((block, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="font-mono"
                          >
                            {block.toLocaleString()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Unable to fetch current block
                </div>
              )}
            </CardContent>
          </Card>

          {/* Network Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Connection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chainInfoLoading || blockLoading ? (
                  <div className="text-muted-foreground">Checking...</div>
                ) : (
                  <Badge className="bg-green-500">
                    <Activity className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Sync Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blockLoading ? (
                  <div className="text-muted-foreground">Syncing...</div>
                ) : (
                  <Badge variant="secondary">Synced</Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Chain Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="outline">Parachain</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </UnifiedSidebar>
  );
}


