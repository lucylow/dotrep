/**
 * Mock Data Providers
 * 
 * Provides mock data for all tRPC endpoints when running in mock mode.
 * This allows the frontend to work standalone without backend dependencies.
 */

import { mockContributors, mockContributions, mockAchievements, getMockContributor, getMockContributions, getMockAchievements } from '../../client/src/data/mockData';

// Generate mock reputation data
export function getMockReputation(accountId: string) {
  const contributor = mockContributors.find(c => c.walletAddress === accountId) || mockContributors[0];
  const baseScore = contributor.reputationScore;
  
  return {
    overall: baseScore,
    percentile: Math.min(95, Math.floor((baseScore / 2500) * 100)),
    breakdown: [
      { type: 'Commits', score: Math.floor(baseScore * 0.3), count: Math.floor(contributor.totalContributions * 0.4) },
      { type: 'PullRequests', score: Math.floor(baseScore * 0.4), count: Math.floor(contributor.totalContributions * 0.3) },
      { type: 'Issues', score: Math.floor(baseScore * 0.2), count: Math.floor(contributor.totalContributions * 0.2) },
      { type: 'Reviews', score: Math.floor(baseScore * 0.1), count: Math.floor(contributor.totalContributions * 0.1) },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

// Generate mock multi-chain reputation
export function getMockMultiChainReputation(accountId: string, chains: string[]) {
  const baseRep = getMockReputation(accountId);
  
  return chains.map(chain => ({
    chain,
    accountId,
    reputation: {
      ...baseRep,
      overall: baseRep.overall + Math.floor(Math.random() * 200) - 100, // Slight variation per chain
    },
    verified: true,
    lastUpdated: new Date().toISOString(),
  }));
}

// Generate mock context-aware reputation
export function getMockContextAwareReputation(accountId: string, dappType?: string) {
  const baseRep = getMockReputation(accountId);
  
  let filteredBreakdown = [...baseRep.breakdown];
  if (dappType === 'defi') {
    filteredBreakdown = baseRep.breakdown.filter(b => ['Commits', 'PullRequests'].includes(b.type));
  } else if (dappType === 'governance') {
    filteredBreakdown = baseRep.breakdown.filter(b => ['Issues', 'Reviews'].includes(b.type));
  }
  
  return {
    ...baseRep,
    breakdown: filteredBreakdown,
    context: {
      dappType: dappType || 'general',
      highlightSkills: [],
    },
  };
}

// Generate mock governance proposals
export function getMockProposals() {
  return [
    {
      id: 1,
      proposer: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      title: 'Upgrade DotRep Parachain Runtime',
      description: 'Proposal to upgrade the DotRep parachain runtime to version 2.0',
      status: 'Active',
      ayes: 150,
      nays: 25,
      endBlock: 1000000,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 2,
      proposer: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      title: 'Increase Reputation Threshold for Staking',
      description: 'Proposal to increase the minimum reputation threshold for staking from 100 to 200',
      status: 'Pending',
      ayes: 0,
      nays: 0,
      endBlock: 1000500,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

// Generate mock NFTs
export function getMockNFTs(accountId: string) {
  const contributor = mockContributors.find(c => c.walletAddress === accountId);
  if (!contributor) return [];
  
  const nfts = [];
  if (contributor.reputationScore >= 1000) {
    nfts.push({
      id: `nft-${contributor.id}-1`,
      collectionId: 'reputation-badges',
      name: 'Reputation Master Badge',
      description: 'Awarded for achieving 1000+ reputation points',
      imageUrl: 'https://via.placeholder.com/300',
      attributes: [
        { trait_type: 'Tier', value: 'Master' },
        { trait_type: 'Reputation', value: contributor.reputationScore },
      ],
      mintedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  if (contributor.reputationScore >= 2000) {
    nfts.push({
      id: `nft-${contributor.id}-2`,
      collectionId: 'reputation-badges',
      name: 'Reputation Legend Badge',
      description: 'Awarded for achieving 2000+ reputation points',
      imageUrl: 'https://via.placeholder.com/300',
      attributes: [
        { trait_type: 'Tier', value: 'Legend' },
        { trait_type: 'Reputation', value: contributor.reputationScore },
      ],
      mintedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  
  return nfts;
}

// Generate mock chain info
export function getMockChainInfo() {
  return {
    name: 'DotRep Parachain',
    chainId: 'dotrep-testnet',
    runtimeVersion: '2.0.0',
    specVersion: 100,
    blockHeight: 1234567,
    finalizedBlockHeight: 1234500,
    tokenSymbol: 'DOT',
    tokenDecimals: 10,
    ss58Format: 42,
  };
}

// Generate mock anchors
export function getMockAnchors(limit: number = 10) {
  return Array.from({ length: limit }, (_, i) => ({
    id: i + 1,
    merkleRoot: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    txHash: `0x${Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    blockNumber: 1234567 - i * 100,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
}

// Generate mock analytics data
export function getMockAnalyticsContributions(actor?: string, weeks: number = 12) {
  const data = [];
  const now = Date.now();
  for (let i = weeks - 1; i >= 0; i--) {
    data.push({
      week: new Date(now - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      count: Math.floor(Math.random() * 20) + 5,
      actor: actor || 'all',
    });
  }
  return data;
}

// Generate mock agent responses
export function getMockInfluencers(query: any, limit: number) {
  return mockContributors.slice(0, limit).map(c => ({
    did: `did:contributor:${c.id}`,
    accountId: c.walletAddress,
    reputation: c.reputationScore,
    sybilRisk: Math.random() * 0.3,
    platforms: ['github', 'twitter'],
    specialties: ['blockchain', 'rust', 'polkadot'],
    matchScore: 0.8 + Math.random() * 0.2,
  }));
}

// Generate mock sybil clusters
export function getMockSybilClusters(accountIds: string[]) {
  if (accountIds.length === 0) return [];
  
  return [{
    clusterId: 'cluster-1',
    accounts: accountIds.slice(0, 3),
    riskScore: 0.7,
    indicators: ['similar_activity', 'shared_connections'],
    detectedAt: new Date().toISOString(),
  }];
}

// Generate mock trust layer data
export function getMockTrustScore(userDID: string) {
  return {
    score: 0.75 + Math.random() * 0.2,
    factors: {
      reputation: 0.8,
      staking: 0.7,
      history: 0.75,
    },
    lastUpdated: new Date().toISOString(),
  };
}

// Generate mock cloud verification status
export function getMockVerificationStatus(contributionId: string) {
  return {
    contributionId,
    status: 'verified' as const,
    verifiedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    proofCid: `Qm${Math.random().toString(36).substring(2, 15)}`,
    metadata: {
      type: 'github',
      repo: 'polkadot-sdk',
      commit: 'abc123',
    },
  };
}

// Generate mock community notes
export function getMockCommunityNotes(targetId: string) {
  return [
    {
      id: `note-1-${targetId}`,
      targetId,
      author: mockContributors[0].walletAddress,
      content: 'This is a helpful contribution to the ecosystem.',
      rating: 5,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: `note-2-${targetId}`,
      targetId,
      author: mockContributors[1].walletAddress,
      content: 'Great work on this feature!',
      rating: 4,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

