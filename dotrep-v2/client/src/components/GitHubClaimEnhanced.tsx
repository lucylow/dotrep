import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, CheckCircle2, AlertCircle, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";

interface GitHubClaimEnhancedProps {
  onSuccess?: () => void;
}

export function GitHubClaimEnhanced({ onSuccess }: GitHubClaimEnhancedProps) {
  const [step, setStep] = useState<'initial' | 'signing' | 'success' | 'backfilling'>('initial');
  const [githubUsername, setGithubUsername] = useState("");
  const [challenge, setChallenge] = useState("");
  const [githubId, setGithubId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const backfillMutation = trpc.github.backfill.useMutation();
  const webhookHealth = trpc.github.webhookHealth.useQuery(undefined, {
    refetchInterval: 5000,
  });

  // Check for pending challenge when component mounts or URL has ?pending=1
  useEffect(() => {
    const checkPendingChallenge = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("pending") === "1") {
        try {
          setIsLoading(true);
          const resp = await fetch("/auth/github/pending-challenge");
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.ok) {
              setChallenge(data.challenge);
              setGithubUsername(data.login);
              setGithubId(data.githubId);
              setStep('signing');
            }
          }
        } catch (err: any) {
          console.error("Failed to fetch pending challenge:", err);
          toast.error("No pending OAuth session found");
          setStep('initial');
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkPendingChallenge();
  }, []);

  const handleStartOAuth = () => {
    window.location.href = "/auth/github/login";
  };

  const handleSign = async () => {
    try {
      if (!challenge) {
        toast.error("No challenge available. Please start Connect on GitHub first.");
        return;
      }

      setIsLoading(true);
      setStep('signing');

      // Enable Polkadot extension
      const extensions = await web3Enable("DotRep Connect");
      if (!extensions || extensions.length === 0) {
        toast.error("No Polkadot extension found. Please install the polkadot{.js} extension.");
        setIsLoading(false);
        return;
      }

      // Request accounts
      const accounts = await web3Accounts();
      if (!accounts || accounts.length === 0) {
        toast.error("No accounts found in Polkadot extension.");
        setIsLoading(false);
        return;
      }

      // Use the first account (or implement account picker UI)
      const account = accounts[0];
      const address = account.address;
      setWalletAddress(address);

      // Get injector for the account
      const injector = await web3FromAddress(address);

      // Prepare message for signing (convert challenge to hex)
      const messageBytes = new TextEncoder().encode(challenge);
      const messageHex = `0x${Array.from(messageBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      toast.info("Requesting signature from wallet...");

      // Sign the message
      // @ts-expect-error - signRaw types vary by extension
      const signed = await injector.signer.signRaw({
        address,
        data: messageHex,
      });

      if (!signed || !signed.signature) {
        toast.error("No signature returned from wallet.");
        setIsLoading(false);
        return;
      }

      // Submit signature to backend
      toast.info("Verifying signature...");
      const verifyResp = await fetch("/auth/github/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubId,
          address,
          signature: signed.signature,
          message: challenge,
        }),
      });

      const verifyJson = await verifyResp.json();

      if (verifyJson && verifyJson.ok) {
        setStep('success');
        toast.success(`GitHub account @${githubUsername} bound to wallet successfully!`);
        
        // Optionally trigger backfill
        if (onSuccess) {
          setTimeout(onSuccess, 1500);
        }
      } else {
        toast.error("Verification failed: " + (verifyJson?.error || "unknown"));
        setStep('initial');
      }
    } catch (err: any) {
      console.error("Sign/submit error:", err);
      if (err.message?.includes("User rejected")) {
        toast.error("Signature request was rejected by user.");
      } else {
        toast.error("Error during sign/submit: " + (err?.message || String(err)));
      }
      setStep('initial');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackfill = async () => {
    if (!githubUsername) {
      toast.error("No GitHub username available");
      return;
    }

    setStep('backfilling');
    setIsLoading(true);

    try {
      const result = await backfillMutation.mutateAsync({
        githubUsername,
        monthsBack: 12,
      });

      toast.success(`Backfill complete: ${result.processed} contributions processed`);
      setStep('success');
    } catch (error: any) {
      toast.error("Backfill failed: " + (error.message || "Unknown error"));
      setStep('success'); // Still show success for the claim
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Github className="h-6 w-6 text-pink-400" />
          Connect GitHub Account
        </CardTitle>
        <CardDescription className="text-gray-400">
          Link your GitHub account with cryptographic verification and enable real-time contribution tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {step === 'initial' && (
            <motion.div
              key="initial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="text-sm text-blue-400 font-medium mb-2">How it works:</div>
                <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Click the button below to authorize DotRep on GitHub</li>
                  <li>After GitHub authorization, you'll be redirected back</li>
                  <li>Sign a message with your Polkadot wallet</li>
                  <li>Your accounts are cryptographically linked!</li>
                  <li>Real-time webhooks will track your contributions</li>
                </ol>
              </div>

              {/* Webhook status */}
              {webhookHealth.data && (
                <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Webhook Status:</span>
                    <Badge variant={webhookHealth.data.ok ? "default" : "destructive"}>
                      {webhookHealth.data.ok ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                </div>
              )}

              <Button
                onClick={handleStartOAuth}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to GitHub...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Connect with GitHub
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {step === 'signing' && (
            <motion.div
              key="signing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex items-center gap-2 text-yellow-400 font-medium mb-2">
                  <AlertCircle className="h-5 w-5" />
                  Wallet Signature Required
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Sign this message with your wallet to verify ownership:
                </p>
                <div className="p-3 rounded bg-gray-800 border border-gray-700 text-xs text-gray-300 font-mono break-all">
                  {challenge}
                </div>
              </div>
              <Button
                onClick={handleSign}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Signature...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Sign & Complete
                  </>
                )}
              </Button>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="space-y-4"
            >
              <div className="text-center py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50"
                >
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Successfully Linked!
                </h3>
                <p className="text-gray-400 mb-4">
                  Your GitHub account{githubUsername && <span className="text-pink-400 font-medium"> @{githubUsername}</span>} is now connected to your wallet
                </p>
                <Badge variant="outline" className="border-green-500/50 text-green-400 mb-4">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Verified
                </Badge>
              </div>

              {/* Backfill option */}
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="text-sm text-purple-400 font-medium mb-2">
                  Backfill Historical Contributions
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  Import your past 12 months of contributions to build your reputation score.
                </p>
                <Button
                  onClick={handleBackfill}
                  disabled={isLoading || backfillMutation.isPending}
                  variant="outline"
                  className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                >
                  {backfillMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Backfilling...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Backfill Contributions
                    </>
                  )}
                </Button>
              </div>

              {/* Info about webhooks */}
              <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="text-xs text-gray-400">
                  <p className="mb-1">✨ Real-time tracking enabled</p>
                  <p>Your future contributions will be automatically tracked via GitHub webhooks.</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'backfilling' && (
            <motion.div
              key="backfilling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <Loader2 className="h-12 w-12 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-gray-400">Backfilling your contributions...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default GitHubClaimEnhanced;


