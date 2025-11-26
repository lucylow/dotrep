/**
 * Comprehensive mock data for all server features
 * Used when external services are unavailable or for development/demo purposes
 */

// Mock Polkadot reputation data
export const mockReputationData: Record<string, {
  overall: number;
  breakdown: Array<{ type: string; score: number }>;
  percentile: number;
  lastUpdated: number;
}> = {
  "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY": {
    overall: 1250,
    breakdown: [
      { type: "CodeCommit", score: 450 },
      { type: "PullRequest", score: 600 },
      { type: "CodeReview", score: 150 },
      { type: "Documentation", score: 50 }
    ],
    percentile: 75,
    lastUpdated: Date.now() - 86400000 // 1 day ago
  },
  "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty": {
    overall: 980,
    breakdown: [
      { type: "CodeCommit", score: 350 },
      { type: "PullRequest", score: 450 },
      { type: "CodeReview", score: 120 },
      { type: "IssueResolution", score: 60 }
    ],
    percentile: 65,
    lastUpdated: Date.now() - 172800000 // 2 days ago
  },
  "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y": {
    overall: 2100,
    breakdown: [
      { type: "CodeCommit", score: 800 },
      { type: "PullRequest", score: 900 },
      { type: "CodeReview", score: 250 },
      { type: "GovernanceParticipation", score: 150 }
    ],
    percentile: 95,
    lastUpdated: Date.now() - 3600000 // 1 hour ago
  },
  "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3v7u3Y": {
    overall: 750,
    breakdown: [
      { type: "CodeCommit", score: 300 },
      { type: "PullRequest", score: 300 },
      { type: "Documentation", score: 100 },
      { type: "CommunityHelp", score: 50 }
    ],
    percentile: 55,
    lastUpdated: Date.now() - 259200000 // 3 days ago
  },
  "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw": {
    overall: 1650,
    breakdown: [
      { type: "CodeCommit", score: 600 },
      { type: "PullRequest", score: 700 },
      { type: "CodeReview", score: 200 },
      { type: "Mentoring", score: 150 }
    ],
    percentile: 85,
    lastUpdated: Date.now() - 43200000 // 12 hours ago
  },
  "5CiPPseXPECbkjWCa6MnjN2rgcY9Gq4Fnv1FoHabkE8TMa27": {
    overall: 450,
    breakdown: [
      { type: "CodeCommit", score: 200 },
      { type: "PullRequest", score: 150 },
      { type: "Documentation", score: 100 }
    ],
    percentile: 35,
    lastUpdated: Date.now() - 604800000 // 7 days ago
  }
};

// Mock contribution counts
export const mockContributionCounts: Record<string, number> = {
  "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY": 42,
  "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty": 35,
  "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y": 78,
  "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3v7u3Y": 28,
  "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw": 55,
  "5CiPPseXPECbkjWCa6MnjN2rgcY9Gq4Fnv1FoHabkE8TMa27": 15
};

// Mock governance proposals
export const mockGovernanceProposals = [
  {
    id: 1,
    proposer: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    title: "Increase Reputation Algorithm Time Decay Factor",
    status: "Active",
    votesFor: 1250,
    votesAgainst: 320,
    endBlock: 15000000,
    description: "Proposal to increase the time decay factor from 0.01 to 0.015 to better reflect recent contributions",
    createdAt: Date.now() - 86400000
  },
  {
    id: 2,
    proposer: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    title: "Add New Contribution Type: Security Audit",
    status: "Pending",
    votesFor: 890,
    votesAgainst: 150,
    endBlock: 15050000,
    description: "Add a new contribution type for security audits with higher weight",
    createdAt: Date.now() - 43200000
  },
  {
    id: 3,
    proposer: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
    title: "Lower Reputation Threshold for Governance Participation",
    status: "Passed",
    votesFor: 2100,
    votesAgainst: 450,
    endBlock: 14950000,
    description: "Lower the minimum reputation required to participate in governance from 1000 to 750",
    createdAt: Date.now() - 172800000
  },
  {
    id: 4,
    proposer: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3v7u3Y",
    title: "Treasury Proposal: Fund Community Events",
    status: "Active",
    votesFor: 1800,
    votesAgainst: 200,
    endBlock: 15100000,
    description: "Allocate 10,000 DOT from treasury for community events and hackathons",
    createdAt: Date.now() - 21600000
  }
];

// Mock NFT achievements
export const mockNfts: Record<string, Array<{
  id: number;
  achievementType: string;
  metadata: string;
  mintedAt: number;
  soulbound: boolean;
}>> = {
  "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY": [
    {
      id: 1,
      achievementType: "first_contribution",
      metadata: JSON.stringify({
        title: "First Contribution",
        description: "Made your first contribution to the Polkadot ecosystem",
        icon: "🎉",
        rarity: "common"
      }),
      mintedAt: Date.now() - 2592000000, // 30 days ago
      soulbound: true
    },
    {
      id: 2,
      achievementType: "reputation_1000",
      metadata: JSON.stringify({
        title: "Reputation Master",
        description: "Achieved 1000+ reputation points",
        icon: "🏆",
        rarity: "rare"
      }),
      mintedAt: Date.now() - 864000000, // 10 days ago
      soulbound: true
    }
  ],
  "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y": [
    {
      id: 3,
      achievementType: "reputation_2000",
      metadata: JSON.stringify({
        title: "Reputation Legend",
        description: "Achieved 2000+ reputation points",
        icon: "👑",
        rarity: "epic"
      }),
      mintedAt: Date.now() - 432000000, // 5 days ago
      soulbound: true
    },
    {
      id: 4,
      achievementType: "cross_chain",
      metadata: JSON.stringify({
        title: "Cross-Chain Pioneer",
        description: "Contributed to cross-chain features",
        icon: "🌉",
        rarity: "rare"
      }),
      mintedAt: Date.now() - 172800000, // 2 days ago
      soulbound: true
    },
    {
      id: 5,
      achievementType: "verified_100",
      metadata: JSON.stringify({
        title: "Century Club",
        description: "Reached 100 verified contributions",
        icon: "💯",
        rarity: "rare"
      }),
      mintedAt: Date.now() - 604800000, // 7 days ago
      soulbound: true
    }
  ],
  "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw": [
    {
      id: 6,
      achievementType: "xcm_expert",
      metadata: JSON.stringify({
        title: "XCM Expert",
        description: "Major contributions to XCM features",
        icon: "🔗",
        rarity: "epic"
      }),
      mintedAt: Date.now() - 259200000, // 3 days ago
      soulbound: true
    },
    {
      id: 7,
      achievementType: "reputation_1500",
      metadata: JSON.stringify({
        title: "Reputation Elite",
        description: "Achieved 1500+ reputation points",
        icon: "💎",
        rarity: "rare"
      }),
      mintedAt: Date.now() - 518400000, // 6 days ago
      soulbound: true
    }
  ]
};

// Mock chain info
export const mockChainInfo = {
  name: "DotRep Parachain",
  version: "1.0.0",
  chainType: "Live",
  tokenSymbol: "DOT",
  tokenDecimals: 10
};

// Mock verification results
export const mockVerificationResults: Record<string, {
  verified: boolean;
  score: number;
  confidence: number;
  evidence: string[];
  timestamp: number;
}> = {
  "QmXyz123abc": {
    verified: true,
    score: 95,
    confidence: 0.98,
    evidence: [
      "GitHub commit signature verified",
      "Repository ownership confirmed",
      "Merkle proof validated"
    ],
    timestamp: Date.now() - 86400000
  },
  "QmAbc456def": {
    verified: true,
    score: 88,
    confidence: 0.92,
    evidence: [
      "Pull request merged",
      "Code review approved",
      "CI/CD checks passed"
    ],
    timestamp: Date.now() - 172800000
  },
  "QmBobCommit1": {
    verified: true,
    score: 92,
    confidence: 0.95,
    evidence: [
      "Commit signed with GPG",
      "Author verified",
      "Timestamp validated"
    ],
    timestamp: Date.now() - 259200000
  }
};

// Mock storage results
export const mockStorageResults: Record<string, {
  ipfsHash: string;
  cloudUrl: string;
  timestamp: number;
}> = {
  "contribution-1": {
    ipfsHash: "QmXyz123abc",
    cloudUrl: "https://storage.dotrep.cloud/proofs/QmXyz123abc",
    timestamp: Date.now() - 86400000
  },
  "contribution-2": {
    ipfsHash: "QmAbc456def",
    cloudUrl: "https://storage.dotrep.cloud/proofs/QmAbc456def",
    timestamp: Date.now() - 172800000
  }
};

// Mock reputation reports
export const mockReputationReports: Record<string, {
  summary: {
    overallScore: number;
    percentile: number;
    rank: number;
    contributionCount: number;
  };
  trends: {
    scoreHistory: Array<{ date: string; score: number }>;
    contributionHistory: Array<{ date: string; count: number }>;
  };
  recommendations: string[];
  visualization: {
    timeline: any;
    breakdown: any;
    comparisons: any;
  };
}> = {
  "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY": {
    summary: {
      overallScore: 1250,
      percentile: 75,
      rank: 4,
      contributionCount: 42
    },
    trends: {
      scoreHistory: [
        { date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), score: 800 },
        { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), score: 950 },
        { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), score: 1100 },
        { date: new Date().toISOString(), score: 1250 }
      ],
      contributionHistory: [
        { date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), count: 25 },
        { date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), count: 32 },
        { date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), count: 38 },
        { date: new Date().toISOString(), count: 42 }
      ]
    },
    recommendations: [
      "Consider contributing to governance proposals to increase your reputation",
      "Focus on code reviews to build community trust",
      "Documentation contributions are valued and help the ecosystem"
    ],
    visualization: {
      timeline: null,
      breakdown: null,
      comparisons: null
    }
  }
};

// Helper function to get mock reputation data
export function getMockReputation(accountId: string) {
  return mockReputationData[accountId] || {
    overall: 0,
    breakdown: [],
    percentile: 0,
    lastUpdated: 0
  };
}

// Helper function to get mock contribution count
export function getMockContributionCount(accountId: string): number {
  return mockContributionCounts[accountId] || 0;
}

// Helper function to get mock NFTs
export function getMockNfts(accountId: string) {
  return mockNfts[accountId] || [];
}

// Helper function to get mock verification result
export function getMockVerificationResult(contributionId: string) {
  // Try to find by contribution ID or use a default
  const keys = Object.keys(mockVerificationResults);
  const key = keys.find(k => contributionId.includes(k)) || keys[0] || "default";
  
  if (key === "default") {
    return {
      verified: true,
      score: 85,
      confidence: 0.90,
      evidence: ["Mock verification for development"],
      timestamp: Date.now()
    };
  }
  
  return mockVerificationResults[key];
}

// Helper function to get mock storage result
export function getMockStorageResult(contributionId: string) {
  const keys = Object.keys(mockStorageResults);
  const key = keys.find(k => contributionId.includes(k)) || keys[0] || "default";
  
  if (key === "default") {
    return {
      ipfsHash: `mock-ipfs-hash-${Date.now()}`,
      cloudUrl: `https://storage.dotrep.cloud/mock/${Date.now()}`,
      timestamp: Date.now()
    };
  }
  
  return mockStorageResults[key];
}

// Helper function to get mock reputation report
export function getMockReputationReport(userId: string) {
  return mockReputationReports[userId] || {
    summary: {
      overallScore: 0,
      percentile: 0,
      rank: 0,
      contributionCount: 0
    },
    trends: {
      scoreHistory: [],
      contributionHistory: []
    },
    recommendations: [],
    visualization: {
      timeline: null,
      breakdown: null,
      comparisons: null
    }
  };
}

