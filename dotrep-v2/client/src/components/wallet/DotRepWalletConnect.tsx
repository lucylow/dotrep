import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Star,
  Shield,
  Award,
  TrendingUp,
  Users,
  Clock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  DotRepWalletConnection, 
  ConnectionOptions, 
  WalletConnectionResult,
  ReputationData,
  NftBadge 
} from "../../_core/wallet/DotRepWalletConnection";
import { ReputationPreview } from "./ReputationPreview";
import { NftBadgeDisplay } from "./NftBadgeDisplay";
import { TrustScoreDisplay } from "./TrustScoreDisplay";

interface DotRepWalletConnectProps {
  onSuccess?: (result: WalletConnectionResult) => void;
  onError?: (error: Error) => void;
  options?: ConnectionOptions;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function DotRepWalletConnect({
  onSuccess,
  onError,
  options = {},
  open: controlledOpen,
  onOpenChange
}: DotRepWalletConnectProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'preview' | 'permissions' | 'connecting' | 'success'>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [previewReputation, setPreviewReputation] = useState<ReputationData | null>(null);
  const [connectionResult, setConnectionResult] = useState<WalletConnectionResult | null>(null);
  const [permissions, setPermissions] = useState({
    readReputation: true,
    readContributions: true,
    readSkills: true,
    writeEndorsements: false
  });

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange || (() => {})) : setInternalOpen;

  const walletConnection = new DotRepWalletConnection(
    import.meta.env.VITE_POLKADOT_WS_ENDPOINT || "ws://127.0.0.1:9944"
  );

  // Handle account selection and preview
  const handleAccountSelect = async (address: string) => {
    try {
      setIsLoading(true);
      setSelectedAccount(address);
      
      // Fetch reputation preview
      const reputation = await walletConnection.previewReputation(address);
      setPreviewReputation(reputation);
      
      // If showReputationPreview is false, skip to permissions
      if (options.showReputationPreview === false) {
        setStep('permissions');
      } else {
        setStep('preview');
      }
    } catch (error: any) {
      toast.error("Failed to load reputation preview: " + error.message);
      onError?.(error);
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle connection with reputation
  const handleConnect = async () => {
    if (!selectedAccount) return;

    try {
      setIsLoading(true);
      setStep('connecting');

      const result = await walletConnection.connectWithReputation({
        ...options,
        requestPermissions: permissions
      });

      setConnectionResult(result);
      setStep('success');
      
      toast.success(`Connected with ${result.reputation.tier} reputation!`);
      onSuccess?.(result);
      
      // Auto-close after success
      setTimeout(() => {
        setOpen(false);
        resetState();
      }, 2000);
    } catch (error: any) {
      toast.error("Connection failed: " + error.message);
      onError?.(error);
      setStep('select');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setStep('select');
    setSelectedAccount(null);
    setPreviewReputation(null);
    setConnectionResult(null);
    setPermissions({
      readReputation: true,
      readContributions: true,
      readSkills: true,
      writeEndorsements: false
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-pink-400" />
            Connect with DotRep
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Connect your wallet with reputation-enhanced authentication
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'select' && (
            <AccountSelectionStep
              onAccountSelect={handleAccountSelect}
              isLoading={isLoading}
            />
          )}

          {step === 'preview' && previewReputation && (
            <ReputationPreviewStep
              address={selectedAccount!}
              reputation={previewReputation}
              onBack={() => setStep('select')}
              onContinue={() => setStep('permissions')}
            />
          )}

          {step === 'permissions' && previewReputation && (
            <PermissionsStep
              permissions={permissions}
              onPermissionsChange={setPermissions}
              reputation={previewReputation}
              onBack={() => setStep('preview')}
              onConnect={handleConnect}
              isLoading={isLoading}
            />
          )}

          {step === 'connecting' && (
            <ConnectingStep address={selectedAccount!} />
          )}

          {step === 'success' && connectionResult && (
            <SuccessStep result={connectionResult} />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

// Account Selection Step
function AccountSelectionStep({
  onAccountSelect,
  isLoading
}: {
  onAccountSelect: (address: string) => void;
  isLoading: boolean;
}) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const { web3Enable, web3Accounts } = await import("@polkadot/extension-dapp");
        await web3Enable("DotRep dApp");
        const accs = await web3Accounts();
        setAccounts(accs);
      } catch (error: any) {
        toast.error("Failed to load accounts: " + error.message);
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, []);

  if (loadingAccounts) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-400" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className="border-yellow-500/30 bg-yellow-500/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">No Accounts Found</span>
          </div>
          <p className="text-sm text-gray-400">
            Please create an account in your Polkadot extension and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        {accounts.map((account) => (
          <Card
            key={account.address}
            className="border-gray-800 bg-gray-800/50 hover:bg-gray-800/80 cursor-pointer transition-colors"
            onClick={() => !isLoading && onAccountSelect(account.address)}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-mono text-sm text-white mb-1">
                    {account.meta.name || "Unnamed Account"}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {account.address.slice(0, 10)}...{account.address.slice(-8)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                >
                  Select
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

// Reputation Preview Step
function ReputationPreviewStep({
  address,
  reputation,
  onBack,
  onContinue
}: {
  address: string;
  reputation: ReputationData;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <ReputationPreview reputation={reputation} address={address} />
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onContinue} className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600">
          Continue
        </Button>
      </div>
    </motion.div>
  );
}

// Permissions Step
function PermissionsStep({
  permissions,
  onPermissionsChange,
  reputation,
  onBack,
  onConnect,
  isLoading
}: {
  permissions: any;
  onPermissionsChange: (perms: any) => void;
  reputation: ReputationData;
  onBack: () => void;
  onConnect: () => void;
  isLoading: boolean;
}) {
  const updatePermission = (key: string, value: boolean) => {
    onPermissionsChange({ ...permissions, [key]: value });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <Card className="border-blue-500/30 bg-blue-500/10">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-400" />
            Connection Permissions
          </CardTitle>
          <CardDescription className="text-gray-400">
            Choose what data the dApp can access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="readReputation"
              checked={permissions.readReputation}
              onCheckedChange={(checked) => updatePermission("readReputation", checked as boolean)}
            />
            <label htmlFor="readReputation" className="text-sm text-white cursor-pointer">
              Read reputation data
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="readContributions"
              checked={permissions.readContributions}
              onCheckedChange={(checked) => updatePermission("readContributions", checked as boolean)}
            />
            <label htmlFor="readContributions" className="text-sm text-white cursor-pointer">
              Read contribution history
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="readSkills"
              checked={permissions.readSkills}
              onCheckedChange={(checked) => updatePermission("readSkills", checked as boolean)}
            />
            <label htmlFor="readSkills" className="text-sm text-white cursor-pointer">
              Read skill tags
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="writeEndorsements"
              checked={permissions.writeEndorsements}
              onCheckedChange={(checked) => updatePermission("writeEndorsements", checked as boolean)}
              disabled={reputation.score < 100}
            />
            <label 
              htmlFor="writeEndorsements" 
              className={`text-sm cursor-pointer ${reputation.score < 100 ? 'text-gray-500' : 'text-white'}`}
            >
              Write endorsements {reputation.score < 100 && "(Requires Contributor tier)"}
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isLoading}>
          Back
        </Button>
        <Button 
          onClick={onConnect} 
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            "Connect"
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// Connecting Step
function ConnectingStep({ address }: { address: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-8"
    >
      <Loader2 className="h-12 w-12 animate-spin text-pink-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-white mb-2">Connecting...</h3>
      <p className="text-gray-400 text-sm font-mono">
        {address.slice(0, 10)}...{address.slice(-8)}
      </p>
    </motion.div>
  );
}

// Success Step
function SuccessStep({ result }: { result: WalletConnectionResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-4"
    >
      <div className="text-center py-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-2 border-green-500/50"
        >
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </motion.div>
        <h3 className="text-2xl font-bold text-white mb-2">
          Successfully Connected!
        </h3>
        <p className="text-gray-400">
          Welcome, {result.reputation.tier}!
        </p>
      </div>

      <TrustScoreDisplay reputation={result.reputation} address={result.account.address} />
      
      {result.nftBadges.length > 0 && (
        <NftBadgeDisplay badges={result.nftBadges} />
      )}
    </motion.div>
  );
}

