import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Award, CheckCircle2, Loader2, ExternalLink, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface SBTMintProps {
  reputationScore: number;
  contributionCount: number;
  onMintSuccess?: (tokenId: string) => void;
}

export function SBTMint({ reputationScore, contributionCount, onMintSuccess }: SBTMintProps) {
  const [isMinting, setIsMinting] = useState(false);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  const canMint = reputationScore >= 100 && contributionCount >= 10;

  const handleMint = async () => {
    if (!canMint) {
      toast.error("You need at least 100 reputation points and 10 contributions to mint an SBT");
      return;
    }

    setIsMinting(true);
    setShowAnimation(true);

    try {
      // Simulate SBT minting - replace with actual tRPC call
      // const result = await trpc.sbt.mint.mutate({ contributorId });
      
      setTimeout(() => {
        const tokenId = `SBT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setMintedTokenId(tokenId);
        setIsMinting(false);
        toast.success("Soul-Bound Token minted successfully!");
        if (onMintSuccess) {
          onMintSuccess(tokenId);
        }
      }, 3000);
    } catch (error) {
      setIsMinting(false);
      setShowAnimation(false);
      toast.error("Failed to mint SBT");
    }
  };

  const handleDownloadMetadata = () => {
    const metadata = {
      name: "DotRep Contributor SBT",
      description: "Soul-Bound Token representing verified open source contributions",
      image: "ipfs://QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      attributes: [
        { trait_type: "Reputation Score", value: reputationScore },
        { trait_type: "Total Contributions", value: contributionCount },
        { trait_type: "Minted At", value: new Date().toISOString() },
        { trait_type: "Token ID", value: mintedTokenId },
      ],
    };

    const json = JSON.stringify(metadata, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sbt-${mintedTokenId}.json`;
    a.click();
    toast.success("Metadata downloaded");
  };

  return (
    <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur overflow-hidden">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Award className="h-6 w-6 text-pink-400" />
          Mint Soul-Bound Token
        </CardTitle>
        <CardDescription className="text-gray-400">
          Claim your on-chain reputation as an SBT
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {!mintedTokenId && !showAnimation && (
            <motion.div
              key="mint-form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Requirements */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <span className="text-sm text-gray-400">Reputation Score</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${reputationScore >= 100 ? 'text-green-400' : 'text-gray-400'}`}>
                      {reputationScore} / 100
                    </span>
                    {reputationScore >= 100 && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <span className="text-sm text-gray-400">Contributions</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${contributionCount >= 10 ? 'text-green-400' : 'text-gray-400'}`}>
                      {contributionCount} / 10
                    </span>
                    {contributionCount >= 10 && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="text-sm text-purple-400 font-medium mb-2">About Soul-Bound Tokens</div>
                <p className="text-sm text-gray-400">
                  SBTs are non-transferable NFTs that represent your verified reputation on-chain. 
                  They cannot be sold or transferred, ensuring authentic identity and achievements.
                </p>
              </div>

              {/* Mint Button */}
              <Button
                onClick={handleMint}
                disabled={!canMint || isMinting}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMinting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Minting SBT...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {canMint ? 'Mint SBT' : 'Requirements Not Met'}
                  </>
                )}
              </Button>

              {!canMint && (
                <p className="text-xs text-center text-gray-500">
                  Keep contributing to unlock SBT minting!
                </p>
              )}
            </motion.div>
          )}

          {showAnimation && !mintedTokenId && (
            <motion.div
              key="minting-animation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600"
              >
                <Award className="h-12 w-12 text-white" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="text-2xl font-bold text-white mb-2">Minting Your SBT...</h3>
                <p className="text-gray-400">Creating your on-chain reputation token</p>
              </motion.div>
              <motion.div
                className="mt-6 flex justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full bg-pink-400"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {mintedTokenId && (
            <motion.div
              key="minted"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center py-8"
            >
              {/* Success Animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="mb-6"
              >
                <div className="relative inline-block">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 blur-xl"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  />
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600">
                    <Award className="h-12 w-12 text-white" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-3xl font-bold text-white mb-2">
                  SBT Minted! 🎉
                </h3>
                <p className="text-gray-400 mb-4">
                  Your Soul-Bound Token has been created on-chain
                </p>
              </motion.div>

              {/* Token Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mb-6 p-4 rounded-lg bg-gray-800/50 border border-gray-700"
              >
                <div className="text-sm text-gray-400 mb-2">Token ID</div>
                <code className="text-sm text-pink-400 font-mono break-all">
                  {mintedTokenId}
                </code>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Reputation</div>
                    <div className="text-white font-semibold">{reputationScore}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Contributions</div>
                    <div className="text-white font-semibold">{contributionCount}</div>
                  </div>
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col gap-2"
              >
                <Button
                  onClick={() => window.open(`https://polkadot.subscan.io/nft/${mintedTokenId}`, '_blank')}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Explorer
                </Button>
                <Button
                  variant="outline"
                  onClick={handleDownloadMetadata}
                  className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Metadata
                </Button>
              </motion.div>

              <Badge variant="outline" className="mt-4 border-green-500/50 text-green-400">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Non-Transferable • Soul-Bound
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
export default SBTMint;
