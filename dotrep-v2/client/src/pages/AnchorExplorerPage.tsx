import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Anchor, 
  Database, 
  ExternalLink, 
  Calendar,
  Hash,
  FileText
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { SkeletonCard } from "@/components/ui/EnhancedLoading";
import { useState } from "react";

export default function AnchorExplorerPage() {
  const [limit, setLimit] = useState(20);
  const { data: anchors, isLoading } = trpc.anchor.getRecent.useQuery({ limit });
  const { data: totalAnchors } = trpc.anchor.getTotal.useQuery();

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Anchor className="w-8 h-8 text-purple-600" />
                Anchor Explorer
              </h1>
              <p className="text-muted-foreground mt-2">
                Explore on-chain proof anchors for contributions
              </p>
            </div>
            {totalAnchors !== undefined && (
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Database className="w-4 h-4 mr-2" />
                {totalAnchors} Total Anchors
              </Badge>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Anchors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalAnchors || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Anchors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{anchors?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {anchors?.reduce((sum, a) => sum + (a.contributionCount || 0), 0) || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Anchors List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Anchors</CardTitle>
              <CardDescription>
                On-chain proof anchors ordered by creation date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : anchors && anchors.length > 0 ? (
                <div className="space-y-4">
                  {anchors.map((anchor) => (
                    <Card key={anchor.id} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center gap-3">
                              <Hash className="w-5 h-5 text-muted-foreground" />
                              <div>
                                <div className="font-mono text-sm text-muted-foreground">
                                  Merkle Root
                                </div>
                                <div className="font-mono text-sm break-all">
                                  {anchor.merkleRoot}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {anchor.blockNumber && (
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">
                                    Block Number
                                  </div>
                                  <div className="font-mono font-semibold">
                                    {anchor.blockNumber.toLocaleString()}
                                  </div>
                                </div>
                              )}
                              {anchor.txHash && (
                                <div>
                                  <div className="text-sm text-muted-foreground mb-1">
                                    Transaction Hash
                                  </div>
                                  <div className="font-mono text-xs break-all">
                                    {anchor.txHash}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">
                                  Contributions
                                </div>
                                <div className="font-semibold text-lg">
                                  {anchor.contributionCount || 0}
                                </div>
                              </div>
                            </div>

                            {anchor.daCid && (
                              <div>
                                <div className="text-sm text-muted-foreground mb-1">
                                  Data Availability CID
                                </div>
                                <div className="font-mono text-sm break-all">
                                  {anchor.daCid}
                                </div>
                              </div>
                            )}

                            {anchor.createdAt && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                {new Date(anchor.createdAt).toLocaleString()}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2 ml-4">
                            {anchor.txHash && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // In production, this would link to a block explorer
                                  window.open(
                                    `https://polkadot.js.org/apps/?rpc=wss://rpc.polkadot.io#/explorer/query/${anchor.txHash}`,
                                    "_blank"
                                  );
                                }}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View on Explorer
                              </Button>
                            )}
                            {anchor.daCid && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  window.open(`https://ipfs.io/ipfs/${anchor.daCid}`, "_blank");
                                }}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                View on IPFS
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No anchors found
                </div>
              )}

              {anchors && anchors.length >= limit && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setLimit(limit + 20)}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UnifiedSidebar>
  );
}


