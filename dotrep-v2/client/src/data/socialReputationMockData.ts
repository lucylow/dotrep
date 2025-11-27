/**
 * Social Reputation Mock Data for DKG Interaction
 * 
 * Mock data specifically for social reputation features:
 * - Social reputation scores (socialRank, overall_score)
 * - Influencer profiles with social metrics
 * - Social network connections
 * - Campaign participation
 * - Social engagement metrics
 */

export interface ProvenanceData {
  inputGraphHash: string;
  computationProof?: string;
  previousSnapshot?: string;
  computationMethod: {
    algorithm: string;
    version: string;
    parameters: Record<string, any>;
  };
}

export interface AuthorshipData {
  creatorDID: string;
  publisherDID: string;
  contentHash: {
    provided: string;
    computed: string;
    match: boolean;
  };
  signature: {
    present: boolean;
    valid: boolean;
    value?: string;
  };
}

export interface AuditabilityData {
  published: string;
  lastVerified: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  onChainAnchor?: {
    present: boolean;
    blockNumber?: number;
    transactionHash?: string;
    chain?: string;
  };
  auditTrail: Array<{
    timestamp: number;
    action: string;
    actor: string;
    details?: string;
  }>;
  verificationScore: number; // 0-100
}

export interface SocialReputationProfile {
  did: string;
  ual: string;
  username: string;
  displayName: string;
  profileImage?: string;
  platforms: string[];
  reputationMetrics: {
    overallScore: number;
    socialRank: number;
    economicStake: number;
    endorsementQuality: number;
    temporalConsistency: number;
  };
  socialMetrics: {
    followerCount: number;
    followingCount: number;
    engagementRate: number;
    totalPosts: number;
    averageLikes: number;
    averageShares: number;
  };
  sybilResistance: {
    behaviorAnomalyScore: number;
    connectionDiversity: number;
    sybilRisk: number;
  };
  specialties: string[];
  campaignsParticipated: number;
  totalEarnings: number;
  publishedAt: number;
  lastUpdated: number;
  // Provenance, Clear Authorship, and Auditability
  provenance?: ProvenanceData;
  authorship?: AuthorshipData;
  auditability?: AuditabilityData;
}

export interface SocialConnection {
  fromDid: string;
  toDid: string;
  connectionType: 'follows' | 'interactsWith' | 'endorses' | 'collaborates';
  strength: number; // 0-1
  timestamp: number;
  platform?: string;
}

export interface CampaignParticipation {
  campaignId: string;
  campaignName: string;
  influencerDid: string;
  status: 'applied' | 'accepted' | 'active' | 'completed' | 'rejected';
  appliedAt: number;
  completedAt?: number;
  performance: {
    engagement: number;
    reach: number;
    conversionRate: number;
    qualityScore: number;
  };
  earnings: {
    basePayment: number;
    bonus: number;
    total: number;
  };
  ual?: string;
}

export const mockSocialReputationProfiles: SocialReputationProfile[] = [
  {
    did: 'did:example:techguru_alex',
    ual: 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
    username: '@techguru_alex',
    displayName: 'Tech Guru Alex',
    profileImage: 'https://i.pravatar.cc/150?img=1',
    platforms: ['Twitter', 'LinkedIn', 'YouTube'],
    reputationMetrics: {
      overallScore: 0.89,
      socialRank: 0.92,
      economicStake: 0.85,
      endorsementQuality: 0.88,
      temporalConsistency: 0.91,
    },
    socialMetrics: {
      followerCount: 125000,
      followingCount: 850,
      engagementRate: 0.045,
      totalPosts: 1250,
      averageLikes: 5625,
      averageShares: 450,
    },
    sybilResistance: {
      behaviorAnomalyScore: 0.15,
      connectionDiversity: 0.88,
      sybilRisk: 0.12,
    },
    specialties: ['Tech Reviews', 'Gadgets', 'AI/ML'],
    campaignsParticipated: 12,
    totalEarnings: 15600,
    publishedAt: Date.now() - 86400000,
    lastUpdated: Date.now() - 3600000,
    provenance: {
      inputGraphHash: '0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      computationProof: '0xproof1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab',
      previousSnapshot: 'did:dkg:otp:20430:0xprevious1234567890abcdef1234567890abcdef12',
      computationMethod: {
        algorithm: 'weightedPageRank',
        version: '2.1.0',
        parameters: {
          dampingFactor: 0.85,
          maxIterations: 100,
          sybilWeight: 0.3,
          stakeWeight: 0.4,
          temporalDecay: 0.95,
        },
      },
    },
    authorship: {
      creatorDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      publisherDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
      contentHash: {
        provided: '0xhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        computed: '0xhash1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        match: true,
      },
      signature: {
        present: true,
        valid: true,
        value: '0xsig1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      },
    },
    auditability: {
      published: new Date(Date.now() - 86400000).toISOString(),
      lastVerified: new Date(Date.now() - 3600000).toISOString(),
      verificationStatus: 'verified',
      onChainAnchor: {
        present: true,
        blockNumber: 12345678,
        transactionHash: '0xtx1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
        chain: 'polkadot',
      },
      auditTrail: [
        {
          timestamp: Date.now() - 86400000,
          action: 'Profile Created',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
          details: 'Initial reputation profile published to DKG',
        },
        {
          timestamp: Date.now() - 43200000,
          action: 'Reputation Updated',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
          details: 'Social metrics recalculated after new campaign participation',
        },
        {
          timestamp: Date.now() - 3600000,
          action: 'Verification Completed',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK',
          details: 'On-chain anchor verified, signature validated',
        },
      ],
      verificationScore: 95,
    },
  },
  {
    did: 'did:example:cryptoinsider',
    ual: 'did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12',
    username: '@cryptoinsider',
    displayName: 'Crypto Insider',
    profileImage: 'https://i.pravatar.cc/150?img=2',
    platforms: ['Twitter', 'YouTube', 'TikTok'],
    reputationMetrics: {
      overallScore: 0.76,
      socialRank: 0.78,
      economicStake: 0.72,
      endorsementQuality: 0.75,
      temporalConsistency: 0.74,
    },
    socialMetrics: {
      followerCount: 89000,
      followingCount: 1200,
      engagementRate: 0.032,
      totalPosts: 890,
      averageLikes: 2848,
      averageShares: 285,
    },
    sybilResistance: {
      behaviorAnomalyScore: 0.22,
      connectionDiversity: 0.75,
      sybilRisk: 0.18,
    },
    specialties: ['Cryptocurrency', 'DeFi', 'Blockchain'],
    campaignsParticipated: 8,
    totalEarnings: 8900,
    publishedAt: Date.now() - 172800000,
    lastUpdated: Date.now() - 7200000,
    provenance: {
      inputGraphHash: '0xb2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
      computationProof: '0xproof234567890abcdef1234567890abcdef1234567890abcdef1234567890bcde',
      previousSnapshot: 'did:dkg:otp:20430:0xprevious234567890abcdef1234567890abcdef23',
      computationMethod: {
        algorithm: 'weightedPageRank',
        version: '2.1.0',
        parameters: {
          dampingFactor: 0.85,
          maxIterations: 100,
          sybilWeight: 0.3,
          stakeWeight: 0.4,
          temporalDecay: 0.95,
        },
      },
    },
    authorship: {
      creatorDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doL',
      publisherDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doL',
      contentHash: {
        provided: '0xhash234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef',
        computed: '0xhash234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef',
        match: true,
      },
      signature: {
        present: true,
        valid: true,
        value: '0xsig234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef',
      },
    },
    auditability: {
      published: new Date(Date.now() - 172800000).toISOString(),
      lastVerified: new Date(Date.now() - 7200000).toISOString(),
      verificationStatus: 'verified',
      onChainAnchor: {
        present: true,
        blockNumber: 12345600,
        transactionHash: '0xtx234567890abcdef1234567890abcdef1234567890abcdef1234567890bcdef',
        chain: 'polkadot',
      },
      auditTrail: [
        {
          timestamp: Date.now() - 172800000,
          action: 'Profile Created',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doL',
          details: 'Initial reputation profile published to DKG',
        },
        {
          timestamp: Date.now() - 86400000,
          action: 'Reputation Updated',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doL',
          details: 'Social metrics updated after new follower surge',
        },
        {
          timestamp: Date.now() - 7200000,
          action: 'Verification Completed',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doL',
          details: 'On-chain anchor verified, signature validated',
        },
      ],
      verificationScore: 88,
    },
  },
  {
    did: 'did:example:blockchaindev',
    ual: 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432',
    username: '@blockchaindev',
    displayName: 'Blockchain Developer',
    profileImage: 'https://i.pravatar.cc/150?img=3',
    platforms: ['LinkedIn', 'Twitter', 'GitHub'],
    reputationMetrics: {
      overallScore: 0.92,
      socialRank: 0.88,
      economicStake: 0.95,
      endorsementQuality: 0.91,
      temporalConsistency: 0.93,
    },
    socialMetrics: {
      followerCount: 45000,
      followingCount: 350,
      engagementRate: 0.052,
      totalPosts: 650,
      averageLikes: 2340,
      averageShares: 195,
    },
    sybilResistance: {
      behaviorAnomalyScore: 0.08,
      connectionDiversity: 0.92,
      sybilRisk: 0.05,
    },
    specialties: ['Blockchain Development', 'Smart Contracts', 'Web3'],
    campaignsParticipated: 15,
    totalEarnings: 23400,
    publishedAt: Date.now() - 259200000,
    lastUpdated: Date.now() - 1800000,
    provenance: {
      inputGraphHash: '0xc3d4e5f6789012345678901234567890abcdef1234567890abcdef123456789012',
      computationProof: '0xproof34567890abcdef1234567890abcdef1234567890abcdef1234567890cdef',
      previousSnapshot: 'did:dkg:otp:20430:0xprevious34567890abcdef1234567890abcdef34',
      computationMethod: {
        algorithm: 'weightedPageRank',
        version: '2.1.0',
        parameters: {
          dampingFactor: 0.85,
          maxIterations: 100,
          sybilWeight: 0.3,
          stakeWeight: 0.4,
          temporalDecay: 0.95,
        },
      },
    },
    authorship: {
      creatorDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doM',
      publisherDID: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doM',
      contentHash: {
        provided: '0xhash34567890abcdef1234567890abcdef1234567890abcdef1234567890cdef',
        computed: '0xhash34567890abcdef1234567890abcdef1234567890abcdef1234567890cdef',
        match: true,
      },
      signature: {
        present: true,
        valid: true,
        value: '0xsig34567890abcdef1234567890abcdef1234567890abcdef1234567890cdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890cdef',
      },
    },
    auditability: {
      published: new Date(Date.now() - 259200000).toISOString(),
      lastVerified: new Date(Date.now() - 1800000).toISOString(),
      verificationStatus: 'verified',
      onChainAnchor: {
        present: true,
        blockNumber: 12345500,
        transactionHash: '0xtx34567890abcdef1234567890abcdef1234567890abcdef1234567890cdef',
        chain: 'polkadot',
      },
      auditTrail: [
        {
          timestamp: Date.now() - 259200000,
          action: 'Profile Created',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doM',
          details: 'Initial reputation profile published to DKG',
        },
        {
          timestamp: Date.now() - 129600000,
          action: 'Reputation Updated',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doM',
          details: 'Economic stake increased after successful campaign completion',
        },
        {
          timestamp: Date.now() - 64800000,
          action: 'Reputation Updated',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doM',
          details: 'Endorsement quality improved after peer verification',
        },
        {
          timestamp: Date.now() - 1800000,
          action: 'Verification Completed',
          actor: 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doM',
          details: 'On-chain anchor verified, signature validated, content hash confirmed',
        },
      ],
      verificationScore: 98,
    },
  },
];

export const mockSocialConnections: SocialConnection[] = [
  {
    fromDid: 'did:example:techguru_alex',
    toDid: 'did:example:blockchaindev',
    connectionType: 'collaborates',
    strength: 0.85,
    timestamp: Date.now() - 86400000,
    platform: 'Twitter',
  },
  {
    fromDid: 'did:example:techguru_alex',
    toDid: 'did:example:cryptoinsider',
    connectionType: 'interactsWith',
    strength: 0.65,
    timestamp: Date.now() - 172800000,
    platform: 'Twitter',
  },
  {
    fromDid: 'did:example:cryptoinsider',
    toDid: 'did:example:blockchaindev',
    connectionType: 'follows',
    strength: 0.45,
    timestamp: Date.now() - 259200000,
    platform: 'Twitter',
  },
];

export const mockCampaignParticipations: CampaignParticipation[] = [
  {
    campaignId: 'campaign-001',
    campaignName: 'Tech Gadget Launch 2024',
    influencerDid: 'did:example:techguru_alex',
    status: 'completed',
    appliedAt: Date.now() - 2592000000,
    completedAt: Date.now() - 2160000000,
    performance: {
      engagement: 125000,
      reach: 450000,
      conversionRate: 0.045,
      qualityScore: 0.88,
    },
    earnings: {
      basePayment: 200,
      bonus: 125,
      total: 325,
    },
    ual: 'did:dkg:otp:20430:0xcampaign001',
  },
  {
    campaignId: 'campaign-002',
    campaignName: 'Crypto Exchange Promotion',
    influencerDid: 'did:example:cryptoinsider',
    status: 'active',
    appliedAt: Date.now() - 1728000000,
    performance: {
      engagement: 89000,
      reach: 320000,
      conversionRate: 0.032,
      qualityScore: 0.75,
    },
    earnings: {
      basePayment: 150,
      bonus: 0,
      total: 150,
    },
  },
  {
    campaignId: 'campaign-003',
    campaignName: 'Blockchain Developer Tools',
    influencerDid: 'did:example:blockchaindev',
    status: 'completed',
    appliedAt: Date.now() - 3456000000,
    completedAt: Date.now() - 3024000000,
    performance: {
      engagement: 45000,
      reach: 180000,
      conversionRate: 0.052,
      qualityScore: 0.91,
    },
    earnings: {
      basePayment: 300,
      bonus: 200,
      total: 500,
    },
    ual: 'did:dkg:otp:20430:0xcampaign003',
  },
];

// Helper functions
export function getSocialReputationProfile(did: string): SocialReputationProfile | undefined {
  return mockSocialReputationProfiles.find(p => p.did === did);
}

export function getSocialConnections(did: string): SocialConnection[] {
  return mockSocialConnections.filter(
    c => c.fromDid === did || c.toDid === did
  );
}

export function getCampaignParticipations(did: string): CampaignParticipation[] {
  return mockCampaignParticipations.filter(c => c.influencerDid === did);
}

export function searchSocialProfiles(query: string): SocialReputationProfile[] {
  const lowerQuery = query.toLowerCase();
  return mockSocialReputationProfiles.filter(profile =>
    profile.username.toLowerCase().includes(lowerQuery) ||
    profile.displayName.toLowerCase().includes(lowerQuery) ||
    profile.specialties.some(s => s.toLowerCase().includes(lowerQuery)) ||
    profile.platforms.some(p => p.toLowerCase().includes(lowerQuery))
  );
}

