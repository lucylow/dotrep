import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Cloud,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Upload,
  FileText
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { toast } from "sonner";

export default function CloudVerificationPage() {
  const [contributionId, setContributionId] = useState("");
  const [proof, setProof] = useState("");
  const [type, setType] = useState<"github" | "gitlab" | "direct">("github");
  const [metadata, setMetadata] = useState("");

  const verifyMutation = trpc.cloud.verification.verify.useMutation({
    onSuccess: () => {
      toast.success("Contribution verified successfully!");
      setContributionId("");
      setProof("");
      setMetadata("");
    },
    onError: (error) => {
      toast.error(`Verification failed: ${error.message}`);
    },
  });

  const { data: status, isLoading: statusLoading } = trpc.cloud.verification.getStatus.useQuery(
    { contributionId },
    { enabled: !!contributionId }
  );

  const handleVerify = () => {
    if (!contributionId || !proof) {
      toast.error("Please fill in all required fields");
      return;
    }

    let parsedMetadata = {};
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch {
        toast.error("Invalid JSON in metadata field");
        return;
      }
    }

    verifyMutation.mutate({
      contributionId,
      proof,
      type,
      metadata: parsedMetadata,
    });
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Cloud className="w-8 h-8 text-purple-600" />
              Cloud Verification
            </h1>
            <p className="text-muted-foreground mt-2">
              Verify contributions using cloud-based verification services
            </p>
          </div>

          {/* Verification Form */}
          <Card>
            <CardHeader>
              <CardTitle>Verify Contribution</CardTitle>
              <CardDescription>
                Submit a contribution for cloud-based verification
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="contributionId">Contribution ID</Label>
                <Input
                  id="contributionId"
                  value={contributionId}
                  onChange={(e) => setContributionId(e.target.value)}
                  placeholder="Enter contribution ID"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="proof">Proof</Label>
                <Textarea
                  id="proof"
                  value={proof}
                  onChange={(e) => setProof(e.target.value)}
                  placeholder="Enter cryptographic proof or URL"
                  className="mt-1 font-mono"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="type">Verification Type</Label>
                <Select value={type} onValueChange={(value: any) => setType(value)}>
                  <SelectTrigger id="type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="github">GitHub</SelectItem>
                    <SelectItem value="gitlab">GitLab</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="metadata">Metadata (JSON, optional)</Label>
                <Textarea
                  id="metadata"
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  placeholder='{"repo": "polkadot-sdk", "commit": "abc123"}'
                  className="mt-1 font-mono"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={verifyMutation.isPending || !contributionId || !proof}
                className="w-full"
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Verify Contribution
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Status Check */}
          {contributionId && (
            <Card>
              <CardHeader>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>
                  Check the status of a verification request
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : status ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge
                        variant={
                          status.status === "verified"
                            ? "default"
                            : status.status === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {status.status === "verified" && (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        )}
                        {status.status === "pending" && (
                          <Clock className="w-3 h-3 mr-1" />
                        )}
                        {status.status === "failed" && (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {status.status}
                      </Badge>
                    </div>
                    {status.verifiedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Verified At</span>
                        <span className="text-sm">
                          {new Date(status.verifiedAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {status.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="text-sm font-semibold text-red-800">Error</div>
                        <div className="text-sm text-red-600">{status.error}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No status found for this contribution ID
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Cloud className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">Cloud Verification Service</h4>
                  <p className="text-sm text-muted-foreground">
                    Our cloud-based verification service uses distributed workers to verify
                    contributions from GitHub, GitLab, and other sources. Verifications are
                    processed asynchronously and results are stored on-chain for transparency.
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


