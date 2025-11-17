import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { contributors, contributions, achievements, anchors } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

// Mock contributor data
const mockContributors = [
  {
    githubId: "123456",
    githubUsername: "alice-dev",
    githubAvatar: "https://avatars.githubusercontent.com/u/123456?v=4",
    walletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    reputationScore: 1250,
    totalContributions: 42,
    verified: true,
  },
  {
    githubId: "234567",
    githubUsername: "bob-rustacean",
    githubAvatar: "https://avatars.githubusercontent.com/u/234567?v=4",
    walletAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    reputationScore: 980,
    totalContributions: 35,
    verified: true,
  },
  {
    githubId: "345678",
    githubUsername: "charlie-polkadot",
    githubAvatar: "https://avatars.githubusercontent.com/u/345678?v=4",
    walletAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    reputationScore: 2100,
    totalContributions: 78,
    verified: true,
  },
  {
    githubId: "456789",
    githubUsername: "diana-substrate",
    githubAvatar: "https://avatars.githubusercontent.com/u/456789?v=4",
    walletAddress: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3v7u3Y",
    reputationScore: 750,
    totalContributions: 28,
    verified: true,
  },
  {
    githubId: "567890",
    githubUsername: "eve-xcm",
    githubAvatar: "https://avatars.githubusercontent.com/u/567890?v=4",
    walletAddress: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw",
    reputationScore: 1650,
    totalContributions: 55,
    verified: true,
  },
  {
    githubId: "678901",
    githubUsername: "frank-parachain",
    githubAvatar: "https://avatars.githubusercontent.com/u/678901?v=4",
    walletAddress: "5CiPPseXPECbkjWCa6MnjN2rgcY9Gq4Fnv1FoHabkE8TMa27",
    reputationScore: 450,
    totalContributions: 15,
    verified: false,
  },
];

// Mock contribution data
const mockContributions = [
  // Alice's contributions
  {
    contributorId: 1,
    contributionType: "commit" as const,
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Add XCM v3 support for reputation queries",
    url: "https://github.com/paritytech/polkadot-sdk/commit/abc123def456",
    proofCid: "QmXyz123abc",
    merkleRoot: "0x1234567890abcdef1234567890abcdef12345678",
    verified: true,
    reputationPoints: 50,
  },
  {
    contributorId: 1,
    contributionType: "pull_request" as const,
    repoName: "substrate",
    repoOwner: "paritytech",
    title: "Fix memory leak in consensus algorithm",
    url: "https://github.com/paritytech/substrate/pull/12345",
    proofCid: "QmAbc456def",
    merkleRoot: "0xabcdef1234567890abcdef1234567890abcdef12",
    verified: true,
    reputationPoints: 100,
  },
  {
    contributorId: 1,
    contributionType: "review" as const,
    repoName: "polkadot",
    repoOwner: "paritytech",
    title: "Review: Improve runtime performance",
    url: "https://github.com/paritytech/polkadot/pull/67890",
    proofCid: "QmReview123",
    merkleRoot: "0x9876543210fedcba9876543210fedcba98765432",
    verified: true,
    reputationPoints: 30,
  },
  {
    contributorId: 1,
    contributionType: "issue" as const,
    repoName: "cumulus",
    repoOwner: "paritytech",
    title: "Documentation: Add XCM tutorial",
    url: "https://github.com/paritytech/cumulus/issues/5432",
    proofCid: "QmIssue456",
    merkleRoot: "0xfedcba0987654321fedcba0987654321fedcba09",
    verified: true,
    reputationPoints: 25,
  },
  // Bob's contributions
  {
    contributorId: 2,
    contributionType: "commit" as const,
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Implement off-chain worker for GitHub verification",
    url: "https://github.com/paritytech/polkadot-sdk/commit/def789ghi012",
    proofCid: "QmBobCommit1",
    merkleRoot: "0x1111111111111111111111111111111111111111",
    verified: true,
    reputationPoints: 75,
  },
  {
    contributorId: 2,
    contributionType: "pull_request" as const,
    repoName: "substrate",
    repoOwner: "paritytech",
    title: "Add benchmarking for reputation pallet",
    url: "https://github.com/paritytech/substrate/pull/11111",
    proofCid: "QmBobPR1",
    merkleRoot: "0x2222222222222222222222222222222222222222",
    verified: true,
    reputationPoints: 120,
  },
  // Charlie's contributions
  {
    contributorId: 3,
    contributionType: "commit" as const,
    repoName: "polkadot",
    repoOwner: "paritytech",
    title: "Optimize block production for high throughput",
    url: "https://github.com/paritytech/polkadot/commit/ghi345jkl678",
    proofCid: "QmCharlie1",
    merkleRoot: "0x3333333333333333333333333333333333333333",
    verified: true,
    reputationPoints: 150,
  },
  {
    contributorId: 3,
    contributionType: "pull_request" as const,
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Implement cross-chain reputation portability",
    url: "https://github.com/paritytech/polkadot-sdk/pull/22222",
    proofCid: "QmCharlie2",
    merkleRoot: "0x4444444444444444444444444444444444444444",
    verified: true,
    reputationPoints: 200,
  },
  {
    contributorId: 3,
    contributionType: "review" as const,
    repoName: "substrate",
    repoOwner: "paritytech",
    title: "Review: Security audit for reputation system",
    url: "https://github.com/paritytech/substrate/pull/33333",
    proofCid: "QmCharlie3",
    merkleRoot: "0x5555555555555555555555555555555555555555",
    verified: true,
    reputationPoints: 80,
  },
  // Diana's contributions
  {
    contributorId: 4,
    contributionType: "commit" as const,
    repoName: "substrate",
    repoOwner: "paritytech",
    title: "Add comprehensive test suite for reputation pallet",
    url: "https://github.com/paritytech/substrate/commit/jkl901mno234",
    proofCid: "QmDiana1",
    merkleRoot: "0x6666666666666666666666666666666666666666",
    verified: true,
    reputationPoints: 60,
  },
  {
    contributorId: 4,
    contributionType: "issue" as const,
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Feature request: Soulbound NFT achievements",
    url: "https://github.com/paritytech/polkadot-sdk/issues/44444",
    proofCid: "QmDiana2",
    merkleRoot: "0x7777777777777777777777777777777777777777",
    verified: true,
    reputationPoints: 20,
  },
  // Eve's contributions
  {
    contributorId: 5,
    contributionType: "commit" as const,
    repoName: "polkadot",
    repoOwner: "paritytech",
    title: "Implement XCM gateway for reputation queries",
    url: "https://github.com/paritytech/polkadot/commit/mno567pqr890",
    proofCid: "QmEve1",
    merkleRoot: "0x8888888888888888888888888888888888888888",
    verified: true,
    reputationPoints: 180,
  },
  {
    contributorId: 5,
    contributionType: "pull_request" as const,
    repoName: "cumulus",
    repoOwner: "paritytech",
    title: "Add support for cross-chain reputation verification",
    url: "https://github.com/paritytech/cumulus/pull/55555",
    proofCid: "QmEve2",
    merkleRoot: "0x9999999999999999999999999999999999999999",
    verified: true,
    reputationPoints: 160,
  },
  {
    contributorId: 5,
    contributionType: "review" as const,
    repoName: "polkadot-sdk",
    repoOwner: "paritytech",
    title: "Review: XCM message format improvements",
    url: "https://github.com/paritytech/polkadot-sdk/pull/66666",
    proofCid: "QmEve3",
    merkleRoot: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    verified: true,
    reputationPoints: 40,
  },
  // Frank's contributions (unverified)
  {
    contributorId: 6,
    contributionType: "commit" as const,
    repoName: "substrate",
    repoOwner: "paritytech",
    title: "WIP: Add new pallet feature",
    url: "https://github.com/paritytech/substrate/commit/pqr123stu456",
    proofCid: "QmFrank1",
    merkleRoot: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    verified: false,
    reputationPoints: 0,
  },
];

// Mock achievement data
const mockAchievements = [
  // Alice's achievements
  {
    contributorId: 1,
    achievementType: "first_contribution",
    title: "First Contribution",
    description: "Made your first contribution to the Polkadot ecosystem",
    iconUrl: "🎉",
  },
  {
    contributorId: 1,
    achievementType: "verified_50",
    title: "Verified Contributor",
    description: "Reached 50 verified contributions",
    iconUrl: "⭐",
  },
  {
    contributorId: 1,
    achievementType: "reputation_1000",
    title: "Reputation Master",
    description: "Achieved 1000+ reputation points",
    iconUrl: "🏆",
  },
  // Bob's achievements
  {
    contributorId: 2,
    achievementType: "first_contribution",
    title: "First Contribution",
    description: "Made your first contribution to the Polkadot ecosystem",
    iconUrl: "🎉",
  },
  {
    contributorId: 2,
    achievementType: "verified_25",
    title: "Active Contributor",
    description: "Reached 25 verified contributions",
    iconUrl: "🔥",
  },
  // Charlie's achievements
  {
    contributorId: 3,
    achievementType: "first_contribution",
    title: "First Contribution",
    description: "Made your first contribution to the Polkadot ecosystem",
    iconUrl: "🎉",
  },
  {
    contributorId: 3,
    achievementType: "verified_100",
    title: "Century Club",
    description: "Reached 100 verified contributions",
    iconUrl: "💯",
  },
  {
    contributorId: 3,
    achievementType: "reputation_2000",
    title: "Reputation Legend",
    description: "Achieved 2000+ reputation points",
    iconUrl: "👑",
  },
  {
    contributorId: 3,
    achievementType: "cross_chain",
    title: "Cross-Chain Pioneer",
    description: "Contributed to cross-chain features",
    iconUrl: "🌉",
  },
  // Diana's achievements
  {
    contributorId: 4,
    achievementType: "first_contribution",
    title: "First Contribution",
    description: "Made your first contribution to the Polkadot ecosystem",
    iconUrl: "🎉",
  },
  {
    contributorId: 4,
    achievementType: "testing",
    title: "Test Master",
    description: "Created comprehensive test suites",
    iconUrl: "🧪",
  },
  // Eve's achievements
  {
    contributorId: 5,
    achievementType: "first_contribution",
    title: "First Contribution",
    description: "Made your first contribution to the Polkadot ecosystem",
    iconUrl: "🎉",
  },
  {
    contributorId: 5,
    achievementType: "xcm_expert",
    title: "XCM Expert",
    description: "Major contributions to XCM features",
    iconUrl: "🔗",
  },
  {
    contributorId: 5,
    achievementType: "reputation_1500",
    title: "Reputation Elite",
    description: "Achieved 1500+ reputation points",
    iconUrl: "💎",
  },
];

// Mock anchor data
const mockAnchors = [
  {
    merkleRoot: "0x1234567890abcdef1234567890abcdef12345678",
    blockNumber: 1234567,
    txHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    daCid: "QmXyz789Anchor1",
    contributionCount: 15,
  },
  {
    merkleRoot: "0xabcdef1234567890abcdef1234567890abcdef12",
    blockNumber: 1234568,
    txHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    daCid: "QmAbc456Anchor2",
    contributionCount: 12,
  },
  {
    merkleRoot: "0x3333333333333333333333333333333333333333",
    blockNumber: 1234569,
    txHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    daCid: "QmCharlieAnchor1",
    contributionCount: 8,
  },
  {
    merkleRoot: "0x8888888888888888888888888888888888888888",
    blockNumber: 1234570,
    txHash: "0x8888888888888888888888888888888888888888888888888888888888888888",
    daCid: "QmEveAnchor1",
    contributionCount: 10,
  },
];

async function seed() {
  console.log("🌱 Seeding database with comprehensive mock data...");

  try {
    // Clear existing data (optional - comment out if you want to keep existing data)
    console.log("Clearing existing data...");
    await db.delete(achievements);
    await db.delete(contributions);
    await db.delete(anchors);
    await db.delete(contributors);

    // Insert contributors
    console.log(`Inserting ${mockContributors.length} contributors...`);
    await db.insert(contributors).values(mockContributors);

    // Insert contributions
    console.log(`Inserting ${mockContributions.length} contributions...`);
    await db.insert(contributions).values(mockContributions);

    // Insert achievements
    console.log(`Inserting ${mockAchievements.length} achievements...`);
    await db.insert(achievements).values(mockAchievements);

    // Insert anchors
    console.log(`Inserting ${mockAnchors.length} anchors...`);
    await db.insert(anchors).values(mockAnchors);

    console.log("✅ Seed data added successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Contributors: ${mockContributors.length}`);
    console.log(`   - Contributions: ${mockContributions.length}`);
    console.log(`   - Achievements: ${mockAchievements.length}`);
    console.log(`   - Anchors: ${mockAnchors.length}`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed().catch(console.error);
