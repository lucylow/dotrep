import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  Users, 
  GitBranch,
  Award,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  AlertTriangle,
  Info
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function AnalyticsPage() {
  const [actor, setActor] = useState<string>("");
  const [selectedActor, setSelectedActor] = useState<string | null>(null);
  const [weeks, setWeeks] = useState(12);

  // Fetch analytics data
  const contributionsQuery = trpc.analytics.contributions.useQuery(
    { actor: selectedActor || undefined, weeks },
    { enabled: true }
  );

  const mergedRatioQuery = trpc.analytics.mergedRatio.useQuery(
    { actor: selectedActor || undefined },
    { enabled: !!selectedActor }
  );

  const anomaliesQuery = trpc.analytics.anomalies.useQuery(
    { k: 3 },
    { enabled: true }
  );

  const scoreQuery = trpc.analytics.score.useQuery(
    { actor: selectedActor! },
    { enabled: !!selectedActor }
  );

  const explainQuery = trpc.analytics.explain.useQuery(
    { actor: selectedActor!, limit: 3 },
    { enabled: !!selectedActor }
  );

  // Cloud monitoring features
  const [eventUserId, setEventUserId] = useState("");
  const [eventType, setEventType] = useState<"reputation_update" | "contribution_verified" | "governance_proposal" | "nft_minted">("reputation_update");
  const [eventScore, setEventScore] = useState("");
  const [reportUserId, setReportUserId] = useState("");

  const trackEventMutation = trpc.cloud.monitoring.trackEvent.useMutation({
    onSuccess: () => {
      toast.success("Event tracked successfully!");
      setEventUserId("");
      setEventScore("");
    },
    onError: (error) => {
      toast.error(`Tracking failed: ${error.message}`);
    },
  });

  const { data: monitoringReport, isLoading: reportLoading } = trpc.cloud.monitoring.generateReport.useQuery(
    { userId: reportUserId },
    { enabled: !!reportUserId }
  );

  const handleTrackEvent = () => {
    if (!eventUserId) {
      toast.error("Please enter a user ID");
      return;
    }
    trackEventMutation.mutate({
      type: eventType,
      userId: eventUserId,
      score: eventScore ? parseFloat(eventScore) : undefined,
    });
  };

  const handleSearch = useCallback(() => {
    if (actor.trim()) {
      setSelectedActor(actor.trim());
    }
  }, [actor]);

  const handleActorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setActor(e.target.value);
  }, []);

  const handleWeeksChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 52) {
      setWeeks(value);
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);

  // Transform data for charts - memoized for performance
  const contributionData = useMemo(() => {
    if (!contributionsQuery.data?.data) return [];
    return contributionsQuery.data.data.map((w) => ({
      week: new Date(w.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: w.count
    }));
  }, [contributionsQuery.data?.data]);

  const reputationData = useMemo(() => {
    return contributionData.map((d) => ({
      week: d.week,
      score: scoreQuery.data?.score?.finalScore || 0
    }));
  }, [contributionData, scoreQuery.data?.score?.finalScore]);

  const radarData = useMemo(() => {
    if (!scoreQuery.data?.score?.vector) return [];
    return [
      { label: "Quality", value: scoreQuery.data.score.vector.quality },
      { label: "Impact", value: scoreQuery.data.score.vector.impact },
      { label: "Consistency", value: scoreQuery.data.score.vector.consistency },
      { label: "Community", value: scoreQuery.data.score.vector.community }
    ];
  }, [scoreQuery.data?.score?.vector]);

  const stats = useMemo(() => ({
    totalContributions: contributionsQuery.data?.data?.reduce((sum, w) => sum + w.count, 0) || 0,
    totalReputation: scoreQuery.data?.score?.finalScore || 0,
    mergedRatio: mergedRatioQuery.data?.data?.merged_pct || 0,
    prTotal: mergedRatioQuery.data?.data?.pr_total || 0,
    prMerged: mergedRatioQuery.data?.data?.pr_merged || 0,
    anomalies: anomaliesQuery.data?.flagged?.length || 0,
  }), [
    contributionsQuery.data?.data,
    scoreQuery.data?.score?.finalScore,
    mergedRatioQuery.data?.data,
    anomaliesQuery.data?.flagged?.length
  ]);

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-8 h-8 text-[#6C3CF0]" />
              <h1 className="text-4xl font-extrabold text-[#131313]">Analytics Dashboard</h1>
            </div>
            <p className="text-[#4F4F4F]">
              Comprehensive insights into contribution activity and reputation metrics
            </p>
          </div>

          {/* Actor Search */}
          <Card className="p-6 mb-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="actor">Search by GitHub Username or Wallet</Label>
                <Input
                  id="actor"
                  placeholder="github:username or wallet address"
                  value={actor}
                  onChange={handleActorChange}
                  onKeyDown={handleKeyDown}
                  aria-label="Search actor by GitHub username or wallet address"
                  className="mt-2"
                />
                <p className="text-xs text-[#4F4F4F] mt-1">
                  Enter format: github:username (e.g., github:octocat) or wallet address
                </p>
              </div>
              <div className="w-32">
                <Label htmlFor="weeks">Weeks</Label>
                <Input
                  id="weeks"
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={handleWeeksChange}
                  aria-label="Number of weeks to analyze"
                  className="mt-2"
                />
              </div>
              <Button onClick={handleSearch} className="mb-0" aria-label="Search for actor analytics">
                Search
              </Button>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-[#4F4F4F]">Total Contributions</div>
                <GitBranch className="w-5 h-5 text-[#6C3CF0]" />
              </div>
              <div className="text-3xl font-bold text-[#131313]">
                {stats.totalContributions}
              </div>
              <div className="text-sm text-[#4F4F4F] mt-2">
                Last {weeks} weeks
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-[#4F4F4F]">Reputation Score</div>
                <Award className="w-5 h-5 text-[#6C3CF0]" />
              </div>
              <div className="text-3xl font-bold text-[#131313]">
                {stats.totalReputation}
              </div>
              <div className="text-sm text-[#4F4F4F] mt-2">
                {selectedActor ? 'For selected actor' : 'Select an actor'}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-[#4F4F4F]">Merged PR Ratio</div>
                <Activity className="w-5 h-5 text-[#6C3CF0]" />
              </div>
              <div className="text-3xl font-bold text-[#131313]">
                {stats.mergedRatio}%
              </div>
              <div className="text-sm text-[#4F4F4F] mt-2">
                {stats.prMerged}/{stats.prTotal} PRs merged
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-[#4F4F4F]">Anomalies Detected</div>
                <AlertTriangle className="w-5 h-5 text-[#6C3CF0]" />
              </div>
              <div className="text-3xl font-bold text-[#131313]">
                {stats.anomalies}
              </div>
              <div className="text-sm text-[#4F4F4F] mt-2">
                Suspicious patterns
              </div>
            </Card>
          </div>

          <Tabs defaultValue="contributions" className="space-y-6">
            <TabsList>
              <TabsTrigger value="contributions">Contributions</TabsTrigger>
              <TabsTrigger value="reputation">Reputation</TabsTrigger>
              <TabsTrigger value="breakdown">Score Breakdown</TabsTrigger>
              <TabsTrigger value="explain">Explainability</TabsTrigger>
              <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
              <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
            </TabsList>

            <TabsContent value="contributions">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#131313] mb-6">Contribution Activity</h2>
                {contributionsQuery.isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">Loading contribution data...</div>
                  </div>
                ) : contributionData.length === 0 ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">No contribution data available</div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={contributionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#6C3CF0" name="Contributions" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="reputation">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#131313] mb-6">Reputation Score</h2>
                {scoreQuery.isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">Loading reputation data...</div>
                  </div>
                ) : !selectedActor ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">Please select an actor to view reputation</div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <div className="text-6xl font-bold text-[#6C3CF0] mb-2">
                        {scoreQuery.data?.score?.finalScore || 0}
                      </div>
                      <div className="text-lg text-[#4F4F4F]">Composite Reputation Score</div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsLineChart data={reputationData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#6C3CF0" 
                          strokeWidth={3}
                          name="Reputation Score"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="breakdown">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#131313] mb-6">Reputation Vector</h2>
                  {scoreQuery.isLoading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-[#4F4F4F]">Loading...</div>
                    </div>
                  ) : radarData.length === 0 ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-[#4F4F4F]">Select an actor to view breakdown</div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="label" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Score"
                          dataKey="value"
                          stroke="#6C3CF0"
                          fill="#6C3CF0"
                          fillOpacity={0.6}
                        />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#131313] mb-6">Score Explanation</h2>
                  {scoreQuery.isLoading ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-[#4F4F4F]">Loading...</div>
                    </div>
                  ) : !scoreQuery.data?.score ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="text-[#4F4F4F]">Select an actor to view explanation</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scoreQuery.data.score.explanation.map((exp, i) => (
                        <div key={i} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-[#6C3CF0] mt-0.5" />
                            <p className="text-sm text-[#4F4F4F]">{exp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="explain">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#131313] mb-6">Top Evidence</h2>
                {explainQuery.isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">Loading evidence...</div>
                  </div>
                ) : !explainQuery.data?.top_evidence || explainQuery.data.top_evidence.length === 0 ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">No evidence available. Select an actor with contributions.</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {explainQuery.data.top_evidence.map((evidence, i) => (
                      <Card key={i} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-[#131313]">{evidence.summary}</h3>
                            <p className="text-sm text-[#4F4F4F] mt-1">{evidence.explanation_nl}</p>
                          </div>
                          <div className="text-right text-sm text-[#4F4F4F]">
                            {evidence.anchoredAt 
                              ? new Date(evidence.anchoredAt).toLocaleDateString()
                              : evidence.createdAt 
                              ? new Date(evidence.createdAt).toLocaleDateString()
                              : 'N/A'}
                          </div>
                        </div>
                        <div className="flex gap-4 mt-3 text-xs text-[#4F4F4F]">
                          <div>
                            <span className="font-semibold">Repo:</span> {evidence.repo || 'N/A'}
                          </div>
                          <div>
                            <span className="font-semibold">Type:</span> {evidence.event_type || 'N/A'}
                          </div>
                          <div>
                            <span className="font-semibold">Points:</span> {evidence.reputationPoints || 0}
                          </div>
                          <div>
                            <span className="font-semibold">Verified:</span> {evidence.verified ? 'Yes' : 'No'}
                          </div>
                        </div>
                        {evidence.cid && (
                          <div className="mt-2 text-xs font-mono text-[#6C3CF0] break-all">
                            CID: {evidence.cid.slice(0, 50)}...
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="anomalies">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#131313] mb-6">Anomaly Detection</h2>
                {anomaliesQuery.isLoading ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">Loading anomalies...</div>
                  </div>
                ) : !anomaliesQuery.data?.flagged || anomaliesQuery.data.flagged.length === 0 ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-[#4F4F4F]">No anomalies detected</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-[#4F4F4F] mb-4">
                      Found {anomaliesQuery.data.flagged.length} suspicious contribution patterns
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2 px-4">Actor</th>
                            <th className="py-2 px-4">Week</th>
                            <th className="py-2 px-4">Count</th>
                            <th className="py-2 px-4">Mean</th>
                            <th className="py-2 px-4">Std Dev</th>
                            <th className="py-2 px-4">Z-Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {anomaliesQuery.data.flagged.map((anomaly, i) => (
                            <tr key={i} className="border-b">
                              <td className="py-2 px-4 font-mono text-xs">{anomaly.actor}</td>
                              <td className="py-2 px-4">{anomaly.weekStart}</td>
                              <td className="py-2 px-4">{anomaly.count}</td>
                              <td className="py-2 px-4">{anomaly.mean.toFixed(2)}</td>
                              <td className="py-2 px-4">{anomaly.std.toFixed(2)}</td>
                              <td className="py-2 px-4 font-semibold text-red-600">{anomaly.z.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="monitoring">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Track Event */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#131313] mb-6">Track Event</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="eventUserId">User ID</Label>
                      <Input
                        id="eventUserId"
                        value={eventUserId}
                        onChange={(e) => setEventUserId(e.target.value)}
                        placeholder="user-123"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="eventType">Event Type</Label>
                      <Select value={eventType} onValueChange={(value: any) => setEventType(value)}>
                        <SelectTrigger id="eventType" className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reputation_update">Reputation Update</SelectItem>
                          <SelectItem value="contribution_verified">Contribution Verified</SelectItem>
                          <SelectItem value="governance_proposal">Governance Proposal</SelectItem>
                          <SelectItem value="nft_minted">NFT Minted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="eventScore">Score (optional)</Label>
                      <Input
                        id="eventScore"
                        type="number"
                        value={eventScore}
                        onChange={(e) => setEventScore(e.target.value)}
                        placeholder="100"
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={handleTrackEvent}
                      disabled={trackEventMutation.isPending || !eventUserId}
                      className="w-full"
                    >
                      {trackEventMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Tracking...
                        </>
                      ) : (
                        "Track Event"
                      )}
                    </Button>
                  </div>
                </Card>

                {/* Generate Report */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#131313] mb-6">Generate Report</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reportUserId">User ID</Label>
                      <Input
                        id="reportUserId"
                        value={reportUserId}
                        onChange={(e) => setReportUserId(e.target.value)}
                        placeholder="user-123"
                        className="mt-1"
                      />
                    </div>

                    <Button
                      onClick={() => {}}
                      disabled={reportLoading || !reportUserId}
                      className="w-full"
                    >
                      {reportLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        "Generate Report"
                      )}
                    </Button>

                    {monitoringReport && (
                      <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Report Generated</h3>
                        <pre className="text-xs overflow-auto">
                          {JSON.stringify(monitoringReport, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}
