import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3,
  TrendingUp,
  Users,
  Award,
  Activity,
  Loader2
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MetricsPage() {
  const { data: allMetrics, isLoading: allLoading } = trpc.metrics.getAll.useQuery();
  const { data: summary, isLoading: summaryLoading } = trpc.metrics.getSummary.useQuery();
  const { data: history, isLoading: historyLoading } = trpc.metrics.getHistory.useQuery({ limit: 100 });

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              Impact Metrics
            </h1>
            <p className="text-muted-foreground mt-2">
              View comprehensive metrics and impact data for the DotRep system
            </p>
          </div>

          <Tabs defaultValue="summary" className="space-y-6">
            <TabsList>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="all">All Metrics</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              {summaryLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </CardContent>
                </Card>
              ) : summary ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Total Contributors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{summary.totalContributors || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Total Contributions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{summary.totalContributions || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Total Reputation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{summary.totalReputation || 0}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        Active Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{summary.activeUsers || 0}</div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No summary data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="all">
              {allLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </CardContent>
                </Card>
              ) : allMetrics ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {Object.entries(allMetrics).map(([key, value]) => (
                    <Card key={key}>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">{key}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No metrics data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              {historyLoading ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  </CardContent>
                </Card>
              ) : history && history.length > 0 ? (
                <div className="space-y-4">
                  {history.map((entry: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">
                          {new Date(entry.timestamp || Date.now()).toLocaleString()}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Object.entries(entry).filter(([k]) => k !== 'timestamp').map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">{key}</span>
                              <Badge variant="outline">
                                {typeof value === 'number' ? value.toLocaleString() : String(value)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No history data available
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

