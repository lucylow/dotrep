/**
 * Knowledge Assets Page
 * 
 * Comprehensive demonstration of verifiable on-chain knowledge assets for Polkadot parachains:
 * - Knowledge assets published to OriginTrail DKG
 * - On-chain verification via Polkadot parachains (blockchain anchoring)
 * - AI agents querying and using knowledge assets
 * - Social reputation integration
 * - Decentralized knowledge graphs
 * 
 * Uses mock data to demonstrate the full integration
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Search, 
  Upload, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Activity,
  Shield,
  TrendingUp,
  Users,
  Network,
  Zap,
  FileCheck,
  Brain,
  ArrowRight,
  Copy,
  Eye,
  CheckCircle,
  AlertCircle,
  Link2,
  GitBranch,
  Sparkles,
  Globe,
  Lock,
  FileText,
  Hash
} from "lucide-react";
import { UnifiedSidebar } from "@/components/layout/UnifiedSidebar";
import { toast } from "sonner";
import { 
  mockDKGAssets,
  mockDKGQueries,
  type DKGAsset,
  type DKGQuery
} from "@/data/enhancedMockData";
import {
  mockSocialReputationProfiles,
  type SocialReputationProfile
} from "@/data/socialReputationMockData";

// Extended knowledge asset with on-chain verification
interface VerifiableKnowledgeAsset extends DKGAsset {
  parachain?: string;
  onChainVerified: boolean;
  blockNumber?: number;
  merkleRoot?: string;
  contentHash?: string;
  jsonLd?: any;
  aiAgentQueries?: number;
  socialReputation?: {
    profile?: SocialReputationProfile;
    integrated: boolean;
  };
}

// AI Agent interaction
interface AIAgentInteraction {
  id: string;
  agentName: string;
  agentType: 'query' | 'verify' | 'publish' | 'analyze';
  ual: string;
  timestamp: number;
  status: 'completed' | 'in_progress' | 'failed';
  result?: any;
  duration?: number;
}

// Mock data for verifiable knowledge assets
const mockVerifiableAssets: VerifiableKnowledgeAsset[] = [
  {
    ...mockDKGAssets[0],
    parachain: 'polkadot',
    onChainVerified: true,
    blockNumber: 12345678,
    merkleRoot: '0xabc123def4567890123456789012345678901234567890123456789012345678',
    contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    aiAgentQueries: 45,
    socialReputation: {
      profile: mockSocialReputationProfiles[0],
      integrated: true
    },
    jsonLd: {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:ReputationAsset',
      '@id': mockDKGAssets[0].ual,
      'reputationScore': 850,
      'developerId': mockDKGAssets[0].developerId,
      'contributions': 4,
      'publishedAt': new Date(mockDKGAssets[0].publishedAt).toISOString()
    }
  },
  {
    ...mockDKGAssets[1],
    parachain: 'kusama',
    onChainVerified: true,
    blockNumber: 12345000,
    merkleRoot: '0xdef456abc7890123456789012345678901234567890123456789012345678901',
    contentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    aiAgentQueries: 32,
    socialReputation: {
      profile: mockSocialReputationProfiles[1],
      integrated: true
    },
    jsonLd: {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:ReputationAsset',
      '@id': mockDKGAssets[1].ual,
      'reputationScore': 720,
      'developerId': mockDKGAssets[1].developerId,
      'contributions': 2,
      'publishedAt': new Date(mockDKGAssets[1].publishedAt).toISOString()
    }
  },
  {
    ...mockDKGAssets[2],
    parachain: 'asset-hub',
    onChainVerified: true,
    blockNumber: 12344000,
    merkleRoot: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    contentHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    aiAgentQueries: 28,
    socialReputation: {
      integrated: false
    },
    jsonLd: {
      '@context': {
        '@vocab': 'https://schema.org/',
        'dotrep': 'https://dotrep.io/ontology/'
      },
      '@type': 'dotrep:ReputationAsset',
      '@id': mockDKGAssets[2].ual,
      'reputationScore': 680,
      'developerId': mockDKGAssets[2].developerId,
      'contributions': 2,
      'publishedAt': new Date(mockDKGAssets[2].publishedAt).toISOString()
    }
  }
];

// Mock AI agent interactions
const mockAIAgentInteractions: AIAgentInteraction[] = [
  {
    id: 'agent-001',
    agentName: 'Trust Navigator Agent',
    agentType: 'query',
    ual: mockDKGAssets[0].ual,
    timestamp: Date.now() - 300000,
    status: 'completed',
    result: {
      reputationScore: 850,
      confidence: 0.95,
      sources: ['DKG', 'Polkadot', 'Social Graph']
    },
    duration: 1200
  },
  {
    id: 'agent-002',
    agentName: 'Reputation Verifier Agent',
    agentType: 'verify',
    ual: mockDKGAssets[0].ual,
    timestamp: Date.now() - 180000,
    status: 'completed',
    result: {
      verified: true,
      onChainProof: true,
      dkgProof: true,
      confidence: 0.98
    },
    duration: 800
  },
  {
    id: 'agent-003',
    agentName: 'Social Graph Analyzer',
    agentType: 'analyze',
    ual: mockDKGAssets[0].ual,
    timestamp: Date.now() - 60000,
    status: 'completed',
    result: {
      socialRank: 0.92,
      connections: 125,
      engagement: 0.045
    },
    duration: 1500
  },
  {
    id: 'agent-004',
    agentName: 'Knowledge Publisher Agent',
    agentType: 'publish',
    ual: mockDKGAssets[1].ual,
    timestamp: Date.now() - 240000,
    status: 'completed',
    result: {
      published: true,
      ual: mockDKGAssets[1].ual,
      blockNumber: 12345000
    },
    duration: 3500
  }
];

export default function KnowledgeAssetsPage() {
  const [assets, setAssets] = useState<VerifiableKnowledgeAsset[]>(mockVerifiableAssets);
  const [agentInteractions, setAgentInteractions] = useState<AIAgentInteraction[]>(mockAIAgentInteractions);
  const [selectedAsset, setSelectedAsset] = useState<VerifiableKnowledgeAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [queryUAL, setQueryUAL] = useState("");
  const [querying, setQuerying] = useState(false);

  // Filter assets based on search
  const filteredAssets = assets.filter(asset => 
    asset.developerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.ual.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.parachain?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle AI agent query
  const handleAgentQuery = async () => {
    if (!queryUAL) {
      toast.error("Please enter a UAL");
      return;
    }

    setQuerying(true);
    
    // Simulate query delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const asset = assets.find(a => a.ual === queryUAL);
    
    if (asset) {
      const newInteraction: AIAgentInteraction = {
        id: `agent-${Date.now()}`,
        agentName: 'Knowledge Query Agent',
        agentType: 'query',
        ual: queryUAL,
        timestamp: Date.now(),
        status: 'completed',
        result: {
          reputationScore: asset.reputationScore,
          onChainVerified: asset.onChainVerified,
          parachain: asset.parachain,
          socialReputation: asset.socialReputation?.integrated
        },
        duration: 1200
      };

      setAgentInteractions([newInteraction, ...agentInteractions]);
      toast.success("AI Agent query completed!");
    } else {
      toast.error("Asset not found");
    }

    setQuerying(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const getParachainBadge = (parachain?: string) => {
    const colors: Record<string, string> = {
      'polkadot': 'bg-pink-100 text-pink-800 border-pink-300',
      'kusama': 'bg-orange-100 text-orange-800 border-orange-300',
      'asset-hub': 'bg-blue-100 text-blue-800 border-blue-300',
      'moonbeam': 'bg-purple-100 text-purple-800 border-purple-300'
    };
    return colors[parachain || ''] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getAgentTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'query': <Search className="w-4 h-4" />,
      'verify': <Shield className="w-4 h-4" />,
      'publish': <Upload className="w-4 h-4" />,
      'analyze': <Brain className="w-4 h-4" />
    };
    return icons[type] || <Activity className="w-4 h-4" />;
  };

  return (
    <UnifiedSidebar>
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-8 h-8 text-[#6C3CF0]" />
              <h1 className="text-4xl font-extrabold text-[#131313]">
                Verifiable On-Chain Knowledge Assets
              </h1>
            </div>
            <p className="text-[#4F4F4F] text-lg">
              AI agents enable verifiable on-chain knowledge assets for Polkadot parachains.
              Social reputation, DKG, and OriginTrail knowledge graphs - all decentralized.
            </p>
          </div>

          {/* Key Features Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Database className="w-8 h-8 opacity-80" />
                  <Badge className="bg-white/20 text-white border-white/30">
                    {assets.length}
                  </Badge>
                </div>
                <div className="text-3xl font-bold mb-1">Knowledge Assets</div>
                <div className="text-sm opacity-90">Published to DKG</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Network className="w-8 h-8 text-[#6C3CF0]" />
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {assets.filter(a => a.onChainVerified).length}
                </div>
                <div className="text-sm text-muted-foreground">On-Chain Verified</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Brain className="w-8 h-8 text-purple-600" />
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {agentInteractions.length}
                </div>
                <div className="text-sm text-muted-foreground">AI Agent Queries</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-green-600" />
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold mb-1">
                  {assets.filter(a => a.socialReputation?.integrated).length}
                </div>
                <div className="text-sm text-muted-foreground">Social Reputation</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="assets" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="assets">Knowledge Assets</TabsTrigger>
              <TabsTrigger value="agents">AI Agents</TabsTrigger>
              <TabsTrigger value="verification">On-Chain Verification</TabsTrigger>
              <TabsTrigger value="social">Social Reputation</TabsTrigger>
              <TabsTrigger value="query">Query Assets</TabsTrigger>
            </TabsList>

            {/* Knowledge Assets Tab */}
            <TabsContent value="assets">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Verifiable Knowledge Assets</CardTitle>
                        <CardDescription>
                          Knowledge assets published to OriginTrail DKG and verified on Polkadot parachains
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search by UAL, developer ID, or parachain..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-64"
                        />
                        <Button variant="outline" size="icon">
                          <Search className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredAssets.map((asset) => (
                        <Card
                          key={asset.ual}
                          className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                            selectedAsset?.ual === asset.ual ? "ring-2 ring-[#6C3CF0]" : ""
                          }`}
                          onClick={() => setSelectedAsset(
                            selectedAsset?.ual === asset.ual ? null : asset
                          )}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6C3CF0] to-[#A074FF] flex items-center justify-center text-white font-bold">
                                  <Database className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <code className="text-xs font-mono text-[#6C3CF0] bg-muted px-2 py-1 rounded">
                                      {asset.ual.slice(0, 50)}...
                                    </code>
                                    {asset.onChainVerified && (
                                      <Badge className="bg-green-100 text-green-800 border-green-300">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Verified
                                      </Badge>
                                    )}
                                    {asset.parachain && (
                                      <Badge className={getParachainBadge(asset.parachain)}>
                                        <Network className="w-3 h-3 mr-1" />
                                        {asset.parachain}
                                      </Badge>
                                    )}
                                    {asset.socialReputation?.integrated && (
                                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                                        <Users className="w-3 h-3 mr-1" />
                                        Social
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground font-mono mb-2">
                                    {asset.developerId}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    copyToClipboard(asset.ual);
                                  }}
                                >
                                  <Copy className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 mb-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Reputation</p>
                                <p className="text-xl font-bold">{asset.reputationScore}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Contributions</p>
                                <p className="text-xl font-bold">{asset.contributions}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">AI Queries</p>
                                <p className="text-xl font-bold">{asset.aiAgentQueries || 0}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Block</p>
                                <p className="text-sm font-semibold">
                                  {asset.blockNumber?.toLocaleString() || 'N/A'}
                                </p>
                              </div>
                            </div>

                            {asset.onChainVerified && (
                              <div className="pt-4 border-t space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Lock className="w-4 h-4 text-green-600" />
                                  <span className="font-semibold">On-Chain Verification:</span>
                                  <code className="text-xs font-mono text-muted-foreground">
                                    {asset.merkleRoot?.slice(0, 20)}...
                                  </code>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Hash className="w-4 h-4 text-purple-600" />
                                  <span className="font-semibold">Content Hash:</span>
                                  <code className="text-xs font-mono text-muted-foreground">
                                    {asset.contentHash?.slice(0, 20)}...
                                  </code>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Asset Details */}
                {selectedAsset && (
                  <Card className="border-2 border-[#6C3CF0]">
                    <CardHeader>
                      <CardTitle>Knowledge Asset Details</CardTitle>
                      <CardDescription>Full information for selected asset</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">UAL (Uniform Asset Locator)</h4>
                        <code className="text-xs font-mono bg-muted p-2 rounded block break-all">
                          {selectedAsset.ual}
                        </code>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2">On-Chain Verification</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Parachain:</span>
                              <Badge>{selectedAsset.parachain || 'N/A'}</Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Block Number:</span>
                              <span className="font-mono">{selectedAsset.blockNumber?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Transaction Hash:</span>
                              <code className="text-xs font-mono">
                                {selectedAsset.transactionHash.slice(0, 20)}...
                              </code>
                            </div>
                            <div className="flex justify-between">
                              <span>Merkle Root:</span>
                              <code className="text-xs font-mono">
                                {selectedAsset.merkleRoot?.slice(0, 20)}...
                              </code>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">DKG Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <Badge className="bg-green-100 text-green-800">
                                {selectedAsset.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Published:</span>
                              <span>{new Date(selectedAsset.publishedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Version:</span>
                              <span>{selectedAsset.version || 1}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>AI Queries:</span>
                              <span className="font-bold">{selectedAsset.aiAgentQueries || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedAsset.socialReputation?.profile && (
                        <div>
                          <h4 className="font-semibold mb-2">Social Reputation Integration</h4>
                          <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                                  {selectedAsset.socialReputation.profile.displayName.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-bold">{selectedAsset.socialReputation.profile.displayName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {selectedAsset.socialReputation.profile.username}
                                  </div>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <div className="text-muted-foreground">Social Rank</div>
                                  <div className="font-bold">
                                    {(selectedAsset.socialReputation.profile.reputationMetrics.socialRank * 100).toFixed(0)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Followers</div>
                                  <div className="font-bold">
                                    {(selectedAsset.socialReputation.profile.socialMetrics.followerCount / 1000).toFixed(0)}K
                                  </div>
                                </div>
                                <div>
                                  <div className="text-muted-foreground">Engagement</div>
                                  <div className="font-bold">
                                    {(selectedAsset.socialReputation.profile.socialMetrics.engagementRate * 100).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      <div>
                        <h4 className="font-semibold mb-2">JSON-LD Structure</h4>
                        <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                          {JSON.stringify(selectedAsset.jsonLd, null, 2)}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* AI Agents Tab */}
            <TabsContent value="agents">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>AI Agent Interactions</CardTitle>
                        <CardDescription>
                          AI agents querying, verifying, and analyzing knowledge assets
                        </CardDescription>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800">
                        <Brain className="w-3 h-3 mr-1" />
                        {agentInteractions.length} Interactions
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {agentInteractions.map((interaction) => {
                        const asset = assets.find(a => a.ual === interaction.ual);
                        return (
                          <Card key={interaction.id} className="border-2">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white">
                                    {getAgentTypeIcon(interaction.agentType)}
                                  </div>
                                  <div>
                                    <div className="font-bold">{interaction.agentName}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {interaction.agentType.charAt(0).toUpperCase() + interaction.agentType.slice(1)}
                                    </div>
                                  </div>
                                </div>
                                <Badge
                                  className={
                                    interaction.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : interaction.status === 'in_progress'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-red-100 text-red-800'
                                  }
                                >
                                  {interaction.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {interaction.status === 'in_progress' && <Activity className="w-3 h-3 mr-1 animate-spin" />}
                                  {interaction.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                                  {interaction.status}
                                </Badge>
                              </div>

                              <div className="mb-3">
                                <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
                                  {interaction.ual.slice(0, 50)}...
                                </code>
                              </div>

                              {interaction.result && (
                                <div className="bg-muted p-3 rounded mb-3">
                                  <div className="text-sm font-semibold mb-2">Result:</div>
                                  <pre className="text-xs overflow-auto">
                                    {JSON.stringify(interaction.result, null, 2)}
                                  </pre>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span>
                                  {new Date(interaction.timestamp).toLocaleString()}
                                </span>
                                {interaction.duration && (
                                  <span>Duration: {interaction.duration}ms</span>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* AI Agent Query Interface */}
                <Card>
                  <CardHeader>
                    <CardTitle>Query Knowledge Asset with AI Agent</CardTitle>
                    <CardDescription>
                      Use an AI agent to query a knowledge asset by UAL
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          UAL (Uniform Asset Locator)
                        </label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="did:dkg:otp:20430:0x..."
                            value={queryUAL}
                            onChange={(e) => setQueryUAL(e.target.value)}
                            className="font-mono"
                          />
                          <Button
                            onClick={handleAgentQuery}
                            disabled={querying || !queryUAL}
                            className="bg-gradient-to-r from-[#6C3CF0] to-[#A074FF]"
                          >
                            {querying ? (
                              <>
                                <Activity className="mr-2 w-4 h-4 animate-spin" />
                                Querying...
                              </>
                            ) : (
                              <>
                                <Brain className="mr-2 w-4 h-4" />
                                Query with AI Agent
                              </>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Try: {assets[0]?.ual}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* On-Chain Verification Tab */}
            <TabsContent value="verification">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>On-Chain Verification</CardTitle>
                    <CardDescription>
                      Knowledge assets verified on Polkadot parachains with blockchain anchoring
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assets.filter(a => a.onChainVerified).map((asset) => (
                        <Card key={asset.ual} className="border-2 border-green-200">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                                <div>
                                  <div className="font-bold">Verified on {asset.parachain}</div>
                                  <code className="text-xs font-mono text-muted-foreground">
                                    {asset.ual.slice(0, 40)}...
                                  </code>
                                </div>
                              </div>
                              <Badge className="bg-green-100 text-green-800">
                                Verified
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Block Number:</span>
                                  <span className="font-mono font-semibold">
                                    {asset.blockNumber?.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Transaction Hash:</span>
                                  <code className="text-xs font-mono">
                                    {asset.transactionHash.slice(0, 20)}...
                                  </code>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Merkle Root:</span>
                                  <code className="text-xs font-mono">
                                    {asset.merkleRoot?.slice(0, 20)}...
                                  </code>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Content Hash:</span>
                                  <code className="text-xs font-mono">
                                    {asset.contentHash?.slice(0, 20)}...
                                  </code>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 border-t">
                              <div className="flex items-center gap-2 text-sm">
                                <Lock className="w-4 h-4 text-green-600" />
                                <span>
                                  Content hash anchored on <strong>{asset.parachain}</strong> parachain
                                  at block <strong>{asset.blockNumber?.toLocaleString()}</strong>
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Verification Flow Diagram */}
                <Card>
                  <CardHeader>
                    <CardTitle>Verification Flow</CardTitle>
                    <CardDescription>
                      How knowledge assets are verified on-chain
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Database className="w-5 h-5 text-blue-600" />
                            <span className="font-semibold">1. Publish to DKG</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Knowledge asset published to OriginTrail DKG as JSON-LD
                          </p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-[#6C3CF0]" />
                        <div className="flex-1 p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Hash className="w-5 h-5 text-purple-600" />
                            <span className="font-semibold">2. Compute Hash</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Content hash computed from JSON-LD structure
                          </p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-[#6C3CF0]" />
                        <div className="flex-1 p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Network className="w-5 h-5 text-green-600" />
                            <span className="font-semibold">3. Anchor on Chain</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Hash anchored on Polkadot parachain via transaction
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Social Reputation Tab */}
            <TabsContent value="social">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Social Reputation Integration</CardTitle>
                    <CardDescription>
                      Knowledge assets integrated with social reputation data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {assets.filter(a => a.socialReputation?.integrated).map((asset) => {
                        const profile = asset.socialReputation?.profile;
                        if (!profile) return null;

                        return (
                          <Card key={asset.ual} className="border-2 border-blue-200">
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4 mb-4">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                                  {profile.displayName.charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="font-bold text-lg">{profile.displayName}</div>
                                    <Badge variant="outline">{profile.username}</Badge>
                                  </div>
                                  <code className="text-xs font-mono text-muted-foreground">
                                    {asset.ual.slice(0, 50)}...
                                  </code>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold mb-1">
                                    {(profile.reputationMetrics.overallScore * 100).toFixed(0)}
                                  </div>
                                  <div className="text-sm text-muted-foreground">Overall Score</div>
                                </div>
                              </div>

                              <div className="grid grid-cols-4 gap-4 mb-4">
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Social Rank</div>
                                  <div className="font-bold">
                                    {(profile.reputationMetrics.socialRank * 100).toFixed(0)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Followers</div>
                                  <div className="font-bold">
                                    {(profile.socialMetrics.followerCount / 1000).toFixed(0)}K
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Engagement</div>
                                  <div className="font-bold">
                                    {(profile.socialMetrics.engagementRate * 100).toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-muted-foreground mb-1">Platforms</div>
                                  <div className="flex gap-1">
                                    {profile.platforms.map((p) => (
                                      <Badge key={p} variant="outline" className="text-xs">
                                        {p}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              <div className="pt-4 border-t">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-[#6C3CF0]" />
                                    <span>Linked to Knowledge Asset</span>
                                  </div>
                                  <Badge className="bg-green-100 text-green-800">
                                    Integrated
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Query Assets Tab */}
            <TabsContent value="query">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Query Knowledge Assets</CardTitle>
                    <CardDescription>
                      Search and query knowledge assets from OriginTrail DKG
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">
                          Search Query
                        </label>
                        <Input
                          placeholder="Search by UAL, developer ID, or parachain..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      {filteredAssets.length > 0 && (
                        <div className="space-y-3">
                          <div className="text-sm text-muted-foreground">
                            Found {filteredAssets.length} asset(s)
                          </div>
                          {filteredAssets.map((asset) => (
                            <Card key={asset.ual} className="border-2">
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <code className="text-xs font-mono text-[#6C3CF0]">
                                      {asset.ual}
                                    </code>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      Developer: {asset.developerId.slice(0, 30)}...
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge>{asset.reputationScore}</Badge>
                                    {asset.onChainVerified && (
                                      <Badge className="bg-green-100 text-green-800">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Verified
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </UnifiedSidebar>
  );
}

