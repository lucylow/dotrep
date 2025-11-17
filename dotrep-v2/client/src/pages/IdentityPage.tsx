import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Link2, 
  CheckCircle2, 
  XCircle,
  Github,
  Gitlab,
  Twitter,
  Mail,
  Shield,
  Key,
  ExternalLink,
  Plus
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { useState } from "react";

interface LinkedAccount {
  id: string;
  type: "github" | "gitlab" | "twitter" | "email" | "polkadot";
  identifier: string;
  verified: boolean;
  linkedAt: number;
  reputation?: number;
}

export default function IdentityPage() {
  const [newAccountType, setNewAccountType] = useState<LinkedAccount["type"] | "">("");
  const [newAccountId, setNewAccountId] = useState("");

  const linkedAccounts: LinkedAccount[] = [
    {
      id: "1",
      type: "github",
      identifier: "alice-dev",
      verified: true,
      linkedAt: Date.now() - 86400000 * 30,
      reputation: 8500
    },
    {
      id: "2",
      type: "polkadot",
      identifier: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      verified: true,
      linkedAt: Date.now() - 86400000 * 15,
      reputation: 9200
    },
    {
      id: "3",
      type: "email",
      identifier: "alice@example.com",
      verified: false,
      linkedAt: Date.now() - 86400000 * 5
    }
  ];

  const getAccountIcon = (type: LinkedAccount["type"]) => {
    switch (type) {
      case "github":
        return <Github className="w-5 h-5" />;
      case "gitlab":
        return <Gitlab className="w-5 h-5" />;
      case "twitter":
        return <Twitter className="w-5 h-5" />;
      case "email":
        return <Mail className="w-5 h-5" />;
      case "polkadot":
        return <Key className="w-5 h-5" />;
    }
  };

  const getAccountName = (type: LinkedAccount["type"]) => {
    switch (type) {
      case "github":
        return "GitHub";
      case "gitlab":
        return "GitLab";
      case "twitter":
        return "Twitter";
      case "email":
        return "Email";
      case "polkadot":
        return "Polkadot Account";
    }
  };

  const handleLinkAccount = () => {
    if (!newAccountType || !newAccountId) return;
    alert(`Linking ${newAccountType} account: ${newAccountId}`);
    // Implementation would call backend API
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <User className="w-8 h-8 text-[#6C3CF0]" />
              <h1 className="text-4xl font-extrabold text-[#131313]">Identity Management</h1>
            </div>
            <p className="text-[#4F4F4F]">
              Manage your decentralized identity and link accounts across platforms
            </p>
          </div>

          <Tabs defaultValue="accounts" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="accounts">Linked Accounts</TabsTrigger>
              <TabsTrigger value="link">Link Account</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="accounts">
              <div className="space-y-4">
                {linkedAccounts.map((account) => (
                  <Card key={account.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-gray-100 rounded-lg">
                          {getAccountIcon(account.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-bold text-[#131313]">
                              {getAccountName(account.type)}
                            </h3>
                            {account.verified ? (
                              <Badge className="bg-green-100 text-green-800 border-green-300">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                <XCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-[#4F4F4F] font-mono mb-2">
                            {account.identifier}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-[#4F4F4F]">
                            <span>
                              Linked {Math.floor((Date.now() - account.linkedAt) / 86400000)} days ago
                            </span>
                            {account.reputation && (
                              <span className="font-semibold text-[#131313]">
                                Reputation: {account.reputation.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="link">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#131313] mb-2">
                      Link New Account
                    </h2>
                    <p className="text-[#4F4F4F]">
                      Connect your accounts to build a unified reputation profile
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Account Type
                      </label>
                      <select 
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        value={newAccountType}
                        onChange={(e) => setNewAccountType(e.target.value as LinkedAccount["type"])}
                      >
                        <option value="">Select account type...</option>
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                        <option value="twitter">Twitter</option>
                        <option value="email">Email</option>
                        <option value="polkadot">Polkadot Account</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-[#131313] mb-2">
                        Account Identifier
                      </label>
                      <Input
                        placeholder={
                          newAccountType === "polkadot" 
                            ? "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                            : newAccountType === "email"
                            ? "your.email@example.com"
                            : "username"
                        }
                        value={newAccountId}
                        onChange={(e) => setNewAccountId(e.target.value)}
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">Verification Process</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>For GitHub/GitLab: OAuth authentication required</li>
                            <li>For Email: Verification link will be sent</li>
                            <li>For Polkadot: Sign message with your account</li>
                            <li>For Twitter: OAuth authentication required</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                      size="lg"
                      onClick={handleLinkAccount}
                      disabled={!newAccountType || !newAccountId}
                    >
                      <Plus className="mr-2 w-5 h-5" />
                      Link Account
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="p-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-[#131313] mb-2">
                      Identity Settings
                    </h2>
                    <p className="text-[#4F4F4F]">
                      Configure your identity preferences and privacy settings
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold text-[#131313]">Public Profile</h3>
                        <p className="text-sm text-[#4F4F4F]">
                          Make your reputation score visible to others
                        </p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold text-[#131313]">Cross-Chain Queries</h3>
                        <p className="text-sm text-[#4F4F4F]">
                          Allow other chains to query your reputation
                        </p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold text-[#131313]">Contribution History</h3>
                        <p className="text-sm text-[#4F4F4F]">
                          Show detailed contribution history on profile
                        </p>
                      </div>
                      <input type="checkbox" defaultChecked className="w-5 h-5" />
                    </div>

                    <div className="pt-4 border-t">
                      <h3 className="font-semibold text-[#131313] mb-4">Privacy Level</h3>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="privacy" value="public" defaultChecked />
                          <div>
                            <p className="font-medium">Public</p>
                            <p className="text-sm text-[#4F4F4F]">All information visible</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="privacy" value="verified" />
                          <div>
                            <p className="font-medium">Verified Only</p>
                            <p className="text-sm text-[#4F4F4F]">Only verified users can view</p>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input type="radio" name="privacy" value="private" />
                          <div>
                            <p className="font-medium">Private</p>
                            <p className="text-sm text-[#4F4F4F]">Only you can view</p>
                          </div>
                        </label>
                      </div>
                    </div>

                    <Button className="w-full bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]">
                      Save Settings
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}


