import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DotRepWalletConnect } from "./DotRepWalletConnect";
import { useDotRepWallet } from "../../_core/hooks/useDotRepWallet";
import type { WalletConnectionResult } from "../../_core/wallet/DotRepWalletConnection";
import { Wallet, CheckCircle2, X } from "lucide-react";

/**
 * Example component demonstrating DotRep wallet connection usage
 */
export function WalletConnectionExample() {
  const [connectionResult, setConnectionResult] = useState<WalletConnectionResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const { connect, disconnect, isConnecting, isConnected } = useDotRepWallet({
    onConnect: (result) => {
      setConnectionResult(result);
      console.log("Connected with reputation:", result.reputation);
    },
    onError: (error) => {
      console.error("Connection error:", error);
    }
  });

  const handleConnectProgrammatic = async () => {
    await connect({
      dappName: "Example dApp",
      contextAware: {
        dappType: "defi",
        highlightSkills: ["Smart Contracts", "DeFi"]
      }
    });
  };

  const handleDisconnect = async () => {
    await disconnect();
    setConnectionResult(null);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>DotRep Wallet Connection Examples</CardTitle>
          <CardDescription>
            Examples of using the DotRep wallet connection with reputation features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Example 1: Using the Component */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Example 1: Using the Component</h3>
            <p className="text-sm text-gray-400">
              Click the button to open the wallet connection modal with reputation preview.
            </p>
            <Button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-pink-500 to-purple-600"
            >
              <Wallet className="mr-2 h-4 w-4" />
              Connect with DotRep (Modal)
            </Button>
            
            <DotRepWalletConnect
              open={showModal}
              onOpenChange={setShowModal}
              onSuccess={(result) => {
                setConnectionResult(result);
                setShowModal(false);
              }}
              options={{
                dappName: "Example dApp",
                showReputationPreview: true,
                contextAware: {
                  dappType: "general"
                }
              }}
            />
          </div>

          {/* Example 2: Using the Hook */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Example 2: Using the Hook</h3>
            <p className="text-sm text-gray-400">
              Programmatically connect using the useDotRepWallet hook.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleConnectProgrammatic}
                disabled={isConnecting || isConnected}
                variant="outline"
              >
                {isConnecting ? "Connecting..." : "Connect Programmatically"}
              </Button>
              {isConnected && (
                <Button onClick={handleDisconnect} variant="destructive">
                  Disconnect
                </Button>
              )}
            </div>
          </div>

          {/* Example 3: Context-Aware Connection */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Example 3: Context-Aware Connection</h3>
            <p className="text-sm text-gray-400">
              Connect with context-aware features for different dApp types.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => connect({
                  contextAware: {
                    dappType: "defi",
                    highlightSkills: ["Smart Contracts", "DeFi", "Auditing"]
                  }
                })}
                variant="outline"
                size="sm"
              >
                Connect as DeFi dApp
              </Button>
              <Button
                onClick={() => connect({
                  contextAware: {
                    dappType: "governance",
                    highlightSkills: ["Governance", "Proposals", "Community"]
                  }
                })}
                variant="outline"
                size="sm"
              >
                Connect as Governance dApp
              </Button>
            </div>
          </div>

          {/* Connection Result Display */}
          {connectionResult && (
            <Card className="border-green-500/30 bg-green-500/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="h-5 w-5" />
                  Connected Successfully
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-sm text-gray-400">Wallet Address</div>
                  <div className="font-mono text-sm text-white">
                    {connectionResult.account.address}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Reputation Score</div>
                  <div className="text-2xl font-bold text-white">
                    {connectionResult.reputation.score.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">
                    Tier: {connectionResult.reputation.tier}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Contributions</div>
                  <div className="text-lg font-semibold text-white">
                    {connectionResult.reputation.contributionCount}
                  </div>
                </div>
                {connectionResult.nftBadges.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-400">Achievement Badges</div>
                    <div className="text-lg font-semibold text-white">
                      {connectionResult.nftBadges.length} badges
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-400">Permissions</div>
                  <div className="space-y-1 mt-1">
                    {connectionResult.permissions.readReputation && (
                      <div className="text-xs text-green-400">✓ Read Reputation</div>
                    )}
                    {connectionResult.permissions.readContributions && (
                      <div className="text-xs text-green-400">✓ Read Contributions</div>
                    )}
                    {connectionResult.permissions.readSkills && (
                      <div className="text-xs text-green-400">✓ Read Skills</div>
                    )}
                    {connectionResult.permissions.writeEndorsements && (
                      <div className="text-xs text-green-400">✓ Write Endorsements</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

