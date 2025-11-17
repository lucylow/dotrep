import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Github, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { web3Enable, web3Accounts, web3FromAddress } from "@polkadot/extension-dapp";
import { useLocation } from "wouter";

interface GitHubConnectProps {
  onSuccess?: () => void;
}

export function GitHubConnect({ onSuccess }: GitHubConnectProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<'initial' | 'signing' | 'success'>('initial');
  const [githubUsername, setGithubUsername] = useState("");
  const [challenge, setChallenge] = useState("");
  const [githubId, setGithubId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for pending challenge when component mounts or URL has ?pending=1
  useEffect(() => {
    const checkPendingChallenge = async () => {
      const params = new URLSearchParams(window.location.search);
      if (params.get("pending") === "1") {
        try {
          setIsLoading(true);
          const resp = await axios.get("/auth/github/pending-challenge");
          if (resp.data && resp.data.ok) {
            setChallenge(resp.data.challenge);
            setGithubUsername(resp.data.login);
            setGithubId(resp.data.githubId);
            setStep('signing');
            // Remove pending param from URL
            setLocation("/connect", { replace: true });
          }
        } catch (err: any) {
          console.error("Failed to fetch pending challenge:", err);
          if (err.response?.status === 404 || err.response?.status === 410) {
            toast.error("No pending OAuth session found. Please start the OAuth flow again.");
            setStep('initial');
          } else {
            toast.error("Failed to load pending challenge");
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    checkPendingChallenge();
  }, [setLocation]);

  const handleStartOAuth = () => {
    // Redirect to the backend route that initiates the OAuth handshake
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
      const verifyResp = await axios.post("/auth/github/verify-signature", {
        githubId,
        address,
        signature: signed.signature,
        message: challenge,
      });

      if (verifyResp.data && verifyResp.data.ok) {
        setStep('success');
        toast.success(`GitHub account @${githubUsername} bound to wallet successfully!`);
        if (onSuccess) {
          setTimeout(onSuccess, 1500);
        }
      } else {
        toast.error("Verification failed: " + JSON.stringify(verifyResp.data?.error || "Unknown error"));
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

  return (
    <Card className="border-pink-900/30 bg-gray-900/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Github className="h-6 w-6 text-pink-400" />
          Connect GitHub Account
        </CardTitle>
        <CardDescription className="text-gray-400">
          Link your GitHub account with cryptographic verification
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
                </ol>
              </div>
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
              className="text-center py-8"
            >
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
              <Badge variant="outline" className="border-green-500/50 text-green-400">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Verified
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
export default GitHubConnect;
