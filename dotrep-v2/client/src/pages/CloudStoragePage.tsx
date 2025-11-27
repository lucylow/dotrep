import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Database,
  Upload,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  FileText
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { toast } from "sonner";

export default function CloudStoragePage() {
  const [storeMode, setStoreMode] = useState(true);
  const [proofData, setProofData] = useState("");
  const [ipfsHash, setIpfsHash] = useState("");
  const [contributionId, setContributionId] = useState("");

  const storeProofMutation = trpc.cloud.storage.storeProof.useMutation({
    onSuccess: (data) => {
      toast.success("Proof stored successfully!");
      setIpfsHash(data.ipfsHash || "");
      setProofData("");
    },
    onError: (error) => {
      toast.error(`Storage failed: ${error.message}`);
    },
  });

  const retrieveProofQuery = trpc.cloud.storage.retrieveProof.useQuery(
    { ipfsHash },
    { enabled: !!ipfsHash && !storeMode }
  );

  const handleStore = () => {
    if (!proofData) {
      toast.error("Please enter proof data");
      return;
    }
    if (!contributionId) {
      toast.error("Please enter a contribution ID");
      return;
    }

    let parsedData;
    try {
      parsedData = JSON.parse(proofData);
    } catch {
      toast.error("Invalid JSON. Please enter valid JSON data.");
      return;
    }

    storeProofMutation.mutate({
      contributionId,
      proof: parsedData,
      metadata: {},
    });
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Database className="w-8 h-8 text-purple-600" />
              Cloud Storage
            </h1>
            <p className="text-muted-foreground mt-2">
              Store and retrieve cryptographic proofs from IPFS and cloud storage
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={storeMode ? "default" : "outline"}
              onClick={() => setStoreMode(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Store Proof
            </Button>
            <Button
              variant={!storeMode ? "default" : "outline"}
              onClick={() => setStoreMode(false)}
            >
              <Download className="w-4 h-4 mr-2" />
              Retrieve Proof
            </Button>
          </div>

          {storeMode ? (
            <Card>
              <CardHeader>
                <CardTitle>Store Proof</CardTitle>
                <CardDescription>
                  Store a cryptographic proof on IPFS and cloud storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contributionId">Contribution ID</Label>
                  <Input
                    id="contributionId"
                    value={contributionId}
                    onChange={(e) => setContributionId(e.target.value)}
                    placeholder="contribution-123"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="proofData">Proof Data (JSON)</Label>
                  <Textarea
                    id="proofData"
                    value={proofData}
                    onChange={(e) => setProofData(e.target.value)}
                    placeholder='{"proof": "...", "timestamp": 1234567890}'
                    className="mt-1 font-mono"
                    rows={10}
                  />
                </div>

                <Button
                  onClick={handleStore}
                  disabled={storeProofMutation.isPending || !proofData || !contributionId}
                  className="w-full"
                >
                  {storeProofMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Storing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Store Proof
                    </>
                  )}
                </Button>

                {storeProofMutation.data?.ipfsHash && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800">Proof Stored Successfully</span>
                    </div>
                    <div className="mt-2">
                      <Label className="text-sm text-green-700">IPFS Hash:</Label>
                      <p className="font-mono text-sm text-green-900 break-all mt-1">
                        {storeProofMutation.data.ipfsHash}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Retrieve Proof</CardTitle>
                <CardDescription>
                  Retrieve a proof from IPFS using its hash
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="ipfsHash">IPFS Hash</Label>
                  <Input
                    id="ipfsHash"
                    value={ipfsHash}
                    onChange={(e) => setIpfsHash(e.target.value)}
                    placeholder="QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
                    className="mt-1 font-mono"
                  />
                </div>

                {retrieveProofQuery.isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                )}

                {retrieveProofQuery.data && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">Proof Retrieved</span>
                    </div>
                    <pre className="mt-2 text-sm text-blue-900 overflow-auto bg-white p-3 rounded border">
                      {JSON.stringify(retrieveProofQuery.data, null, 2)}
                    </pre>
                  </div>
                )}

                {retrieveProofQuery.error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600" />
                      <span className="font-semibold text-red-800">Error</span>
                    </div>
                    <p className="text-sm text-red-600">{retrieveProofQuery.error.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Database className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold mb-2">Cloud Storage Service</h4>
                  <p className="text-sm text-muted-foreground">
                    Proofs are stored on IPFS (InterPlanetary File System) for decentralized,
                    permanent storage. Each proof receives a unique IPFS hash that can be used
                    to retrieve it later. The service also maintains redundant copies in cloud
                    storage for faster access.
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

