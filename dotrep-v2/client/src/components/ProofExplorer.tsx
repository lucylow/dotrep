import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, XCircle, Loader2, ExternalLink, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ProofData {
  contributionHash: string;
  merkleRoot: string;
  merkleProof: string[];
  anchorTxHash: string;
  timestamp: string;
  verified: boolean;
}

export function ProofExplorer() {
  const [contributionId, setContributionId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!contributionId.trim()) {
      toast.error("Please enter a contribution ID");
      return;
    }

    setIsVerifying(true);
    try {
      // Simulate proof verification - replace with actual tRPC call
      // const result = await trpc.proof.verify.query({ contributionId });
      
      setTimeout(() => {
        const mockProof: ProofData = {
          contributionHash: "0x" + "a".repeat(64),
          merkleRoot: "0x" + "b".repeat(64),
          merkleProof: [
            "0x" + "c".repeat(64),
            "0x" + "d".repeat(64),
            "0x" + "e".repeat(64),
          ],
          anchorTxHash: "0x" + "f".repeat(64),
          timestamp: new Date().toISOString(),
          verified: true,
        };
        setProofData(mockProof);
        setIsVerifying(false);
        toast.success("Proof verified successfully!");
      }, 2000);
    } catch (error) {
      setIsVerifying(false);
      toast.error("Failed to verify proof");
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const truncateHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  return (
    <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-yellow-400" />
          Proof Explorer
        </CardTitle>
        <CardDescription className="text-gray-400">
          Verify cryptographic proofs of contributions on-chain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Contribution ID or Hash</label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter contribution ID..."
              value={contributionId}
              onChange={(e) => setContributionId(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
            <Button
              onClick={handleVerify}
              disabled={isVerifying || !contributionId.trim()}
              className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Verify Proof
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Proof Results */}
        <AnimatePresence mode="wait">
          {proofData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Verification Status */}
              <div className={`p-4 rounded-lg border ${
                proofData.verified 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {proofData.verified ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 text-green-400" />
                      <span className="text-lg font-semibold text-green-400">Proof Verified ✓</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 text-red-400" />
                      <span className="text-lg font-semibold text-red-400">Verification Failed</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {proofData.verified 
                    ? "This contribution has been cryptographically verified and anchored on-chain"
                    : "Unable to verify this proof. It may not exist or has been tampered with."}
                </p>
              </div>

              {/* Proof Details */}
              <div className="space-y-3">
                {/* Contribution Hash */}
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-400">Contribution Hash</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(proofData.contributionHash, "Contribution Hash")}
                      className="h-6 px-2 text-gray-400 hover:text-white"
                    >
                      {copied === "Contribution Hash" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <code className="text-xs text-pink-400 font-mono break-all">
                    {proofData.contributionHash}
                  </code>
                </div>

                {/* Merkle Root */}
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-400">Merkle Root</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(proofData.merkleRoot, "Merkle Root")}
                      className="h-6 px-2 text-gray-400 hover:text-white"
                    >
                      {copied === "Merkle Root" ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <code className="text-xs text-purple-400 font-mono break-all">
                    {proofData.merkleRoot}
                  </code>
                </div>

                {/* Merkle Proof Path */}
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="text-sm font-medium text-gray-400 mb-2">
                    Merkle Proof Path ({proofData.merkleProof.length} hashes)
                  </div>
                  <div className="space-y-2">
                    {proofData.merkleProof.map((hash, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-indigo-500/50 text-indigo-400">
                          {index + 1}
                        </Badge>
                        <code className="text-xs text-indigo-400 font-mono">
                          {truncateHash(hash)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(hash, `Proof Hash ${index + 1}`)}
                          className="h-5 px-1 text-gray-400 hover:text-white ml-auto"
                        >
                          {copied === `Proof Hash ${index + 1}` ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Anchor Transaction */}
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-400">Anchor Transaction</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(proofData.anchorTxHash, "Transaction Hash")}
                        className="h-6 px-2 text-gray-400 hover:text-white"
                      >
                        {copied === "Transaction Hash" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://polkadot.subscan.io/extrinsic/${proofData.anchorTxHash}`, '_blank')}
                        className="h-6 px-2 text-gray-400 hover:text-white"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <code className="text-xs text-blue-400 font-mono break-all">
                    {proofData.anchorTxHash}
                  </code>
                </div>

                {/* Timestamp */}
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <span className="text-sm font-medium text-gray-400">Anchored At</span>
                  <div className="text-sm text-white mt-1">
                    {new Date(proofData.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => window.open(`https://polkadot.subscan.io/extrinsic/${proofData.anchorTxHash}`, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Subscan
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  onClick={() => {
                    const json = JSON.stringify(proofData, null, 2);
                    const blob = new Blob([json], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `proof-${contributionId}.json`;
                    a.click();
                    toast.success("Proof exported successfully");
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Export Proof
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info Box */}
        {!proofData && !isVerifying && (
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <div className="text-sm text-blue-400 font-medium mb-2">How Proof Verification Works</div>
            <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
              <li>Each contribution is hashed and batched into a Merkle tree</li>
              <li>The Merkle root is anchored on-chain via Polkadot</li>
              <li>Verification reconstructs the Merkle path to prove inclusion</li>
              <li>All proofs are cryptographically verifiable and tamper-proof</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default ProofExplorer;
