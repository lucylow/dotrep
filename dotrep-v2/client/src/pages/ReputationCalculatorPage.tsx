import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calculator,
  Loader2,
  TrendingUp,
  Award,
  Clock
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { toast } from "sonner";

export default function ReputationCalculatorPage() {
  const [userId, setUserId] = useState("");
  const [contributionsJson, setContributionsJson] = useState("");
  const [timeDecayFactor, setTimeDecayFactor] = useState("0.01");

  const calculateMutation = trpc.cloud.reputation.calculate.useMutation({
    onSuccess: () => {
      toast.success("Reputation calculated successfully!");
    },
    onError: (error) => {
      toast.error(`Calculation failed: ${error.message}`);
    },
  });

  const handleCalculate = () => {
    if (!userId || !contributionsJson) {
      toast.error("Please fill in all required fields");
      return;
    }

    let contributions;
    try {
      contributions = JSON.parse(contributionsJson);
      if (!Array.isArray(contributions)) {
        throw new Error("Contributions must be an array");
      }
    } catch (error) {
      toast.error("Invalid JSON. Please enter a valid array of contributions.");
      return;
    }

    calculateMutation.mutate({
      userId,
      contributions,
      timeDecayFactor: parseFloat(timeDecayFactor) || 0.01,
    });
  };

  const exampleContributions = `[
  {
    "id": "contrib-1",
    "type": "pull_request",
    "weight": 50,
    "timestamp": ${Date.now() - 86400000},
    "age": 1
  },
  {
    "id": "contrib-2",
    "type": "commit",
    "weight": 25,
    "timestamp": ${Date.now() - 172800000},
    "age": 2
  }
]`;

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calculator className="w-8 h-8 text-purple-600" />
              Reputation Calculator
            </h1>
            <p className="text-muted-foreground mt-2">
              Calculate reputation scores using cloud-based calculation service
            </p>
          </div>

          {/* Calculator Form */}
          <Card>
            <CardHeader>
              <CardTitle>Calculate Reputation</CardTitle>
              <CardDescription>
                Calculate reputation score from contributions with time decay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="user-123"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="contributions">Contributions (JSON Array)</Label>
                <Textarea
                  id="contributions"
                  value={contributionsJson}
                  onChange={(e) => setContributionsJson(e.target.value)}
                  placeholder={exampleContributions}
                  className="mt-1 font-mono"
                  rows={12}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setContributionsJson(exampleContributions)}
                >
                  Load Example
                </Button>
              </div>

              <div>
                <Label htmlFor="timeDecayFactor">Time Decay Factor</Label>
                <Input
                  id="timeDecayFactor"
                  type="number"
                  step="0.001"
                  value={timeDecayFactor}
                  onChange={(e) => setTimeDecayFactor(e.target.value)}
                  placeholder="0.01"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Higher values mean older contributions decay faster (default: 0.01)
                </p>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={calculateMutation.isPending || !userId || !contributionsJson}
                className="w-full"
              >
                {calculateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Reputation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          {calculateMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle>Calculation Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold">Total Score</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-900">
                      {calculateMutation.data.totalScore?.toFixed(2) || "N/A"}
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-green-600" />
                      <span className="font-semibold">Contributions</span>
                    </div>
                    <div className="text-3xl font-bold text-green-900">
                      {calculateMutation.data.contributionCount || 0}
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold">Time Decay</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-900">
                      {calculateMutation.data.timeDecayFactor || timeDecayFactor}
                    </div>
                  </div>
                </div>

                {calculateMutation.data.breakdown && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Score Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries(calculateMutation.data.breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-medium">{key}</span>
                          <Badge variant="outline">{String(value)}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Calculator className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">Reputation Calculation</h4>
                  <p className="text-sm text-muted-foreground">
                    The reputation calculator uses advanced algorithms to compute reputation scores
                    from contributions. It applies time decay to ensure recent contributions are
                    weighted more heavily than older ones. The calculation considers contribution
                    type, weight, and age to produce a comprehensive reputation score.
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

