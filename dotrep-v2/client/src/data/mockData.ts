/**
 * Mock data for frontend development and demos
 * This data is used when the backend is not available or for showcasing features
 */

export interface MockContributor {
  id: number;
  githubId: string;
  githubUsername: string;
  githubAvatar: string;
  walletAddress: string;
  reputationScore: number;
  totalContributions: number;
  verified: boolean;
}

export interface MockContribution {
  id: number;
  contributorId: number;
  contributionType: "commit" | "pull_request" | "issue" | "review";
  repoName: string;
  repoOwner: string;
  title: string;
  url: string;
  proofCid: string;
  merkleRoot: string;
  verified: boolean;
  reputationPoints: number;
  createdAt: string;
}

export interface MockAchievement {
  id: number;
  contributorId: number;
  achievementType: string;
  title: string;
  description: string;
  iconUrl: string;
  earnedAt: string;
}

export const mockContributors: MockContributor[] = [
  {
    id: 1,
    githubId: "123456",
    githubUsername: "alice-dev",
    githubAvatar: "https://avatars.githubusercontent.com/u/123456?v=4",
    walletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    reputationScore: 1250,
    totalContributions: 42,
    verified: true,
  },
  {
    id: 2,
    githubId: "234567",
    githubUsername: "bob-rustacean",
    githubAvatar: "https://avatars.githubusercontent.com/u/234567?v=4",
    walletAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    reputationScore: 980,
    totalContributions: 35,
    verified: true,
  },
  {
    id: 3,
    githubId: "345678",
    githubUsername: "charlie-polkadot",
    githubAvatar: "https://avatars.githubusercontent.com/u/345678?v=4",
    walletAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    reputationScore: 2100,
    totalContributions: 78,
    verified: true,
  },
  {
    id: 4,
    githubId: "456789",
    githubUsername: "diana-substrate",
    githubAvatar: "https://avatars.githubusercontent.com/u/456789?v=4",
    walletAddress: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3v7u3Y",
    reputationScore: 750,
    totalContributions: 28,
    verified: true,
  },
  {
    id: 5,
    githubId: "567890",
    githubUsername: "eve-xcm",
    githubAvatar: "https://avatars.githubusercontent.com/u/567890?v=4",
    walletAddress: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
    reputationScore: 1650,
    totalContributions: 55,
    verified: true,
  },
];

export const mockContributions: MockContribution[] = [
  {
    id: 1,
    contributorId: 1,
    contributionType: "commit",
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Add XCM v3 support for reputation queries",
    url: "https://github.com/paritytech/polkadot-sdk/commit/abc123def456",
    proofCid: "QmXyz123abc",
    merkleRoot: "0x1234567890abcdef1234567890abcdef12345678",
    verified: true,
    reputationPoints: 50,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    contributorId: 1,
    contributionType: "pull_request",
    repoName: "substrate",
    repoOwner: "paritytech",
    title: "Fix memory leak in consensus algorithm",
    url: "https://github.com/paritytech/substrate/pull/12345",
    proofCid: "QmAbc456def",
    merkleRoot: "0xabcdef1234567890abcdef1234567890abcdef12",
    verified: true,
    reputationPoints: 100,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    contributorId: 2,
    contributionType: "commit",
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Implement off-chain worker for GitHub verification",
    url: "https://github.com/paritytech/polkadot-sdk/commit/def789ghi012",
    proofCid: "QmBobCommit1",
    merkleRoot: "0x1111111111111111111111111111111111111111",
    verified: true,
    reputationPoints: 75,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    contributorId: 3,
    contributionType: "pull_request",
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Implement cross-chain reputation portability",
    url: "https://github.com/paritytech/polkadot-sdk/pull/22222",
    proofCid: "QmCharlie2",
    merkleRoot: "0x4444444444444444444444444444444444444444",
    verified: true,
    reputationPoints: 200,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 5,
    contributorId: 5,
    contributionType: "commit",
    repoName: "polkadot",
    repoOwner: "paritytech",
    title: "Implement XCM gateway for reputation queries",
    url: "https://github.com/paritytech/polkadot/commit/mno567pqr890",
    proofCid: "QmEve1",
    merkleRoot: "0x8888888888888888888888888888888888888888",
    verified: true,
    reputationPoints: 180,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const mockAchievements: MockAchievement[] = [
  {
    id: 1,
    contributorId: 1,
    achievementType: "first_contribution",
    title: "First Contribution",
    description: "Made your first contribution to the Polkadot ecosystem",
    iconUrl: "🎉",
    earnedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    contributorId: 1,
    achievementType: "reputation_1000",
    title: "Reputation Master",
    description: "Achieved 1000+ reputation points",
    iconUrl: "🏆",
    earnedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    contributorId: 3,
    achievementType: "reputation_2000",
    title: "Reputation Legend",
    description: "Achieved 2000+ reputation points",
    iconUrl: "👑",
    earnedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 4,
    contributorId: 5,
    achievementType: "xcm_expert",
    title: "XCM Expert",
    description: "Major contributions to XCM features",
    iconUrl: "🔗",
    earnedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper functions to get mock data
export const getMockContributor = (id: number): MockContributor | undefined => {
  return mockContributors.find(c => c.id === id);
};

export const getMockContributions = (contributorId?: number): MockContribution[] => {
  if (contributorId) {
    return mockContributions.filter(c => c.contributorId === contributorId);
  }
  return mockContributions;
};

export const getMockAchievements = (contributorId?: number): MockAchievement[] => {
  if (contributorId) {
    return mockAchievements.filter(a => a.contributorId === contributorId);
  }
  return mockAchievements;
};

// Statistics for demo
export const mockStats = {
  totalContributors: mockContributors.length,
  totalContributions: mockContributions.length,
  totalReputation: mockContributors.reduce((sum, c) => sum + c.reputationScore, 0),
  verifiedContributors: mockContributors.filter(c => c.verified).length,
  averageReputation: Math.round(
    mockContributors.reduce((sum, c) => sum + c.reputationScore, 0) / mockContributors.length
  ),
};


