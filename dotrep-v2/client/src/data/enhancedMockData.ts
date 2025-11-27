/**
 * Enhanced Mock Data for Agent Behavior, DKG Interactions, and Cross-Chain Data Flow
 * Used for interactive frontend demos
 */

// ========== Agent Behavior Mock Data ==========

export interface AgentAction {
  id: string;
  agentType: "navigator" | "detective" | "negotiator" | "optimizer" | "auditor";
  action: string;
  timestamp: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;
  duration?: number; // milliseconds
}

export interface AgentBehavior {
  agentId: string;
  agentType: string;
  actions: AgentAction[];
  totalActions: number;
  successRate: number;
  averageResponseTime: number;
  lastActive: number;
}

export interface InfluencerMatch {
  id: string;
  influencerId: string;
  influencerName: string;
  reputation: number;
  matchScore: number;
  estimatedROI: number;
  recommendedPayment: number;
  reasoning: string;
  platform: string;
  followers: number;
}

export interface SybilCluster {
  id: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  accounts: string[];
  patterns: string[];
  detectedAt: number;
  graphData?: {
    nodes: Array<{ id: string; label: string; group: number }>;
    edges: Array<{ from: string; to: string; value: number }>;
  };
}

export interface CampaignOptimization {
  campaignId: string;
  performance: {
    totalEngagement: number;
    roi: number;
    conversionRate: number;
    qualityScore: number;
  };
  recommendations: string[];
  optimizations: Array<{
    dealId: string;
    action: string;
    expectedImpact: number;
  }>;
}

export const mockAgentBehaviors: AgentBehavior[] = [
  {
    agentId: "navigator-001",
    agentType: "navigator",
    actions: [
      {
        id: "act-001",
        agentType: "navigator",
        action: "find_influencers",
        timestamp: Date.now() - 300000,
        status: "completed",
        result: { matchesFound: 12 },
        duration: 1200,
      },
      {
        id: "act-002",
        agentType: "navigator",
        action: "rank_influencers",
        timestamp: Date.now() - 180000,
        status: "completed",
        result: { ranked: 12 },
        duration: 800,
      },
    ],
    totalActions: 45,
    successRate: 0.96,
    averageResponseTime: 950,
    lastActive: Date.now() - 60000,
  },
  {
    agentId: "detective-001",
    agentType: "detective",
    actions: [
      {
        id: "act-003",
        agentType: "detective",
        action: "detect_sybil_clusters",
        timestamp: Date.now() - 600000,
        status: "completed",
        result: { clustersFound: 3 },
        duration: 3500,
      },
      {
        id: "act-004",
        agentType: "detective",
        action: "analyze_patterns",
        timestamp: Date.now() - 240000,
        status: "in_progress",
        duration: 2100,
      },
    ],
    totalActions: 28,
    successRate: 0.89,
    averageResponseTime: 2800,
    lastActive: Date.now() - 30000,
  },
  {
    agentId: "optimizer-001",
    agentType: "optimizer",
    actions: [
      {
        id: "act-005",
        agentType: "optimizer",
        action: "optimize_campaign",
        timestamp: Date.now() - 900000,
        status: "completed",
        result: { roiImprovement: 0.23 },
        duration: 4500,
      },
    ],
    totalActions: 15,
    successRate: 0.93,
    averageResponseTime: 4200,
    lastActive: Date.now() - 900000,
  },
];

export const mockInfluencerMatches: InfluencerMatch[] = [
  {
    id: "match-001",
    influencerId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    influencerName: "TechGuru_Alex",
    reputation: 0.89,
    matchScore: 0.94,
    estimatedROI: 3.2,
    recommendedPayment: 125.50,
    reasoning: "High engagement rate, excellent audience match, proven track record",
    platform: "Twitter",
    followers: 125000,
  },
  {
    id: "match-002",
    influencerId: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    influencerName: "CryptoInsider",
    reputation: 0.76,
    matchScore: 0.82,
    estimatedROI: 2.8,
    recommendedPayment: 89.25,
    reasoning: "Strong niche following, good engagement, moderate reputation",
    platform: "YouTube",
    followers: 89000,
  },
  {
    id: "match-003",
    influencerId: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    influencerName: "BlockchainDev",
    reputation: 0.92,
    matchScore: 0.88,
    estimatedROI: 3.5,
    recommendedPayment: 156.75,
    reasoning: "Top-tier reputation, technical expertise, loyal audience",
    platform: "LinkedIn",
    followers: 45000,
  },
];

export const mockSybilClusters: SybilCluster[] = [
  {
    id: "cluster-001",
    riskLevel: "high",
    confidence: 0.87,
    accounts: [
      "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
    ],
    patterns: ["synchronized_activity", "identical_metadata", "low_reputation"],
    detectedAt: Date.now() - 3600000,
    graphData: {
      nodes: [
        { id: "acc-1", label: "Account 1", group: 1 },
        { id: "acc-2", label: "Account 2", group: 1 },
        { id: "acc-3", label: "Account 3", group: 1 },
      ],
      edges: [
        { from: "acc-1", to: "acc-2", value: 0.95 },
        { from: "acc-2", to: "acc-3", value: 0.92 },
        { from: "acc-1", to: "acc-3", value: 0.88 },
      ],
    },
  },
  {
    id: "cluster-002",
    riskLevel: "medium",
    confidence: 0.65,
    accounts: [
      "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
      "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    ],
    patterns: ["similar_timing", "shared_resources"],
    detectedAt: Date.now() - 7200000,
  },
];

export const mockCampaignOptimizations: CampaignOptimization[] = [
  {
    campaignId: "campaign-001",
    performance: {
      totalEngagement: 125000,
      roi: 2.8,
      conversionRate: 0.045,
      qualityScore: 0.82,
    },
    recommendations: [
      "Increase budget allocation to top-performing influencers",
      "Extend campaign duration by 2 weeks",
      "Focus on video content for better engagement",
    ],
    optimizations: [
      {
        dealId: "deal-001",
        action: "increase_budget",
        expectedImpact: 0.15,
      },
      {
        dealId: "deal-002",
        action: "extend_duration",
        expectedImpact: 0.12,
      },
    ],
  },
];

// ========== DKG Interaction Mock Data ==========

export interface DKGAsset {
  ual: string;
  developerId: string;
  reputationScore: number;
  publishedAt: number;
  transactionHash: string;
  blockNumber: number;
  contributions: number;
  status: "published" | "pending" | "failed";
  version?: number;
}

export interface DKGQuery {
  id: string;
  ual: string;
  queryType: "reputation" | "contributions" | "full" | "search";
  timestamp: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: any;
  duration?: number;
}

export interface DKGPublishOperation {
  id: string;
  developerId: string;
  reputationData: any;
  timestamp: number;
  status: "pending" | "publishing" | "completed" | "failed";
  ual?: string;
  transactionHash?: string;
  error?: string;
}

export const mockDKGAssets: DKGAsset[] = [
  {
    ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
    developerId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    reputationScore: 850,
    publishedAt: Date.now() - 86400000,
    transactionHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
    blockNumber: 12345678,
    contributions: 4,
    status: "published",
    version: 1,
  },
  {
    ual: "did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12",
    developerId: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    reputationScore: 720,
    publishedAt: Date.now() - 172800000,
    transactionHash: "0xdef456abc7890123456789012345678901234567890123456789012345678901",
    blockNumber: 12345000,
    contributions: 2,
    status: "published",
    version: 1,
  },
  {
    ual: "did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432",
    developerId: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",
    reputationScore: 680,
    publishedAt: Date.now() - 259200000,
    transactionHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    blockNumber: 12344000,
    contributions: 2,
    status: "published",
    version: 1,
  },
];

export const mockDKGQueries: DKGQuery[] = [
  {
    id: "query-001",
    ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
    queryType: "reputation",
    timestamp: Date.now() - 300000,
    status: "completed",
    result: {
      reputationScore: 850,
      percentile: 85,
      verifiedContributions: 4,
    },
    duration: 1200,
  },
  {
    id: "query-002",
    ual: "did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12",
    queryType: "full",
    timestamp: Date.now() - 180000,
    status: "in_progress",
    duration: 800,
  },
  {
    id: "query-003",
    ual: "",
    queryType: "search",
    timestamp: Date.now() - 60000,
    status: "completed",
    result: {
      results: [
        {
          ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
          developerId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
          reputationScore: 850,
        },
      ],
      totalResults: 1,
    },
    duration: 950,
  },
];

export const mockDKGPublishOperations: DKGPublishOperation[] = [
  {
    id: "publish-001",
    developerId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    reputationData: {
      reputationScore: 850,
      contributions: 4,
      timestamp: Date.now(),
    },
    timestamp: Date.now() - 86400000,
    status: "completed",
    ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
    transactionHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
  },
  {
    id: "publish-002",
    developerId: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    reputationData: {
      reputationScore: 720,
      contributions: 2,
      timestamp: Date.now(),
    },
    timestamp: Date.now() - 60000,
    status: "publishing",
  },
];

// ========== Cross-Chain Data Flow Mock Data ==========

export interface CrossChainMessage {
  id: string;
  sourceChain: string;
  targetChain: string;
  messageType: "query" | "transfer" | "verification";
  status: "pending" | "sent" | "in_transit" | "delivered" | "failed";
  timestamp: number;
  deliveredAt?: number;
  result?: any;
  hops?: string[];
}

export interface ChainConnection {
  chainId: string;
  chainName: string;
  status: "connected" | "disconnected" | "pending";
  lastMessage?: number;
  messageCount: number;
  averageLatency: number;
}

export interface CrossChainReputation {
  accountId: string;
  chains: Array<{
    chainId: string;
    chainName: string;
    reputationScore: number;
    contributions: number;
    lastUpdated: number;
  }>;
  aggregatedScore: number;
}

export const mockCrossChainMessages: CrossChainMessage[] = [
  {
    id: "xcm-001",
    sourceChain: "polkadot",
    targetChain: "asset-hub",
    messageType: "query",
    status: "delivered",
    timestamp: Date.now() - 300000,
    deliveredAt: Date.now() - 240000,
    result: {
      reputationScore: 8500,
      percentile: 92,
      verifiedContributions: 156,
    },
    hops: ["polkadot", "asset-hub"],
  },
  {
    id: "xcm-002",
    sourceChain: "polkadot",
    targetChain: "kusama",
    messageType: "verification",
    status: "in_transit",
    timestamp: Date.now() - 60000,
    hops: ["polkadot", "kusama"],
  },
  {
    id: "xcm-003",
    sourceChain: "asset-hub",
    targetChain: "moonbeam",
    messageType: "query",
    status: "sent",
    timestamp: Date.now() - 30000,
  },
];

export const mockChainConnections: ChainConnection[] = [
  {
    chainId: "polkadot",
    chainName: "Polkadot Relay Chain",
    status: "connected",
    lastMessage: Date.now() - 300000,
    messageCount: 1245,
    averageLatency: 45000,
  },
  {
    chainId: "asset-hub",
    chainName: "Asset Hub",
    status: "connected",
    lastMessage: Date.now() - 180000,
    messageCount: 892,
    averageLatency: 38000,
  },
  {
    chainId: "kusama",
    chainName: "Kusama Relay Chain",
    status: "connected",
    lastMessage: Date.now() - 7200000,
    messageCount: 567,
    averageLatency: 52000,
  },
  {
    chainId: "moonbeam",
    chainName: "Moonbeam",
    status: "pending",
    messageCount: 0,
    averageLatency: 0,
  },
];

export const mockCrossChainReputations: CrossChainReputation[] = [
  {
    accountId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    chains: [
      {
        chainId: "polkadot",
        chainName: "Polkadot",
        reputationScore: 8500,
        contributions: 156,
        lastUpdated: Date.now() - 3600000,
      },
      {
        chainId: "asset-hub",
        chainName: "Asset Hub",
        reputationScore: 9100,
        contributions: 142,
        lastUpdated: Date.now() - 1800000,
      },
      {
        chainId: "kusama",
        chainName: "Kusama",
        reputationScore: 7200,
        contributions: 98,
        lastUpdated: Date.now() - 7200000,
      },
    ],
    aggregatedScore: 8267,
  },
  {
    accountId: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    chains: [
      {
        chainId: "polkadot",
        chainName: "Polkadot",
        reputationScore: 7200,
        contributions: 98,
        lastUpdated: Date.now() - 7200000,
      },
      {
        chainId: "asset-hub",
        chainName: "Asset Hub",
        reputationScore: 6800,
        contributions: 87,
        lastUpdated: Date.now() - 5400000,
      },
    ],
    aggregatedScore: 7000,
  },
];

// Helper functions
export function getMockAgentBehavior(agentId: string): AgentBehavior | undefined {
  return mockAgentBehaviors.find(b => b.agentId === agentId);
}

export function getMockDKGAsset(ual: string): DKGAsset | undefined {
  return mockDKGAssets.find(a => a.ual === ual);
}

export function getMockCrossChainReputation(accountId: string): CrossChainReputation | undefined {
  return mockCrossChainReputations.find(r => r.accountId === accountId);
}

