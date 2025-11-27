/**
 * Mock Data for OriginTrail DKG Integration
 * 
 * This file provides comprehensive mock data for testing and development
 * when the DKG connection is unavailable or mock mode is enabled.
 */

import { ReputationAsset, Contribution } from './dkg-client-v8';

export interface MockUALMapping {
  [developerId: string]: string;
}

/**
 * Mock UAL (Uniform Asset Locator) mappings
 */
export const MOCK_UALS: MockUALMapping = {
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty': 'did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12',
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy': 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432',
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y': 'did:dkg:otp:20430:0xfedcba0987654321fedcba0987654321fedcba09',
};

/**
 * Mock reputation assets for various developers
 */
export const MOCK_REPUTATION_ASSETS: Map<string, ReputationAsset> = new Map([
  [
    '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    {
      developerId: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      reputationScore: 850,
      timestamp: Date.now() - 86400000, // 1 day ago
      contributions: [
        {
          id: 'contrib-001',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/1234',
          title: 'Add new consensus mechanism',
          date: '2025-11-15T10:30:00Z',
          impact: 95,
        },
        {
          id: 'contrib-002',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/1235',
          title: 'Fix critical security vulnerability',
          date: '2025-11-10T14:20:00Z',
          impact: 100,
        },
        {
          id: 'contrib-003',
          type: 'github_commit',
          url: 'https://github.com/paritytech/substrate/commit/abc123',
          title: 'Improve runtime performance',
          date: '2025-11-05T09:15:00Z',
          impact: 75,
        },
        {
          id: 'contrib-004',
          type: 'github_pr',
          url: 'https://github.com/paritytech/substrate/pull/9876',
          title: 'Implement new feature',
          date: '2025-11-20T16:45:00Z',
          impact: 85,
        },
      ],
      metadata: {
        username: 'alice_developer',
        githubId: 'alice-dev',
        totalContributions: 4,
        publishedAt: new Date().toISOString(),
        source: 'dotrep-v2',
        version: '2.0.0',
        percentile: 85,
      },
    },
  ],
  [
    '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
    {
      developerId: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
      reputationScore: 720,
      timestamp: Date.now() - 172800000, // 2 days ago
      contributions: [
        {
          id: 'contrib-b001',
          type: 'github_pr',
          url: 'https://github.com/example/repo/pull/100',
          title: 'Add documentation',
          date: '2025-11-18T12:00:00Z',
          impact: 60,
        },
        {
          id: 'contrib-b002',
          type: 'github_commit',
          url: 'https://github.com/example/repo/commit/xyz789',
          title: 'Update dependencies',
          date: '2025-11-12T08:30:00Z',
          impact: 50,
        },
      ],
      metadata: {
        username: 'bob_developer',
        githubId: 'bob-dev',
        totalContributions: 2,
        publishedAt: new Date().toISOString(),
        source: 'dotrep-v2',
        version: '2.0.0',
        percentile: 72,
      },
    },
  ],
  [
    '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
    {
      developerId: '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy',
      reputationScore: 680,
      timestamp: Date.now() - 259200000, // 3 days ago
      contributions: [
        {
          id: 'contrib-c001',
          type: 'github_commit',
          url: 'https://github.com/example/repo/commit/xyz789',
          title: 'Fix bug',
          date: '2025-11-17T10:30:00Z',
          impact: 55,
        },
        {
          id: 'contrib-c002',
          type: 'gitlab_mr',
          url: 'https://gitlab.com/example/project/-/merge_requests/42',
          title: 'Refactor code structure',
          date: '2025-11-14T15:20:00Z',
          impact: 65,
        },
      ],
      metadata: {
        username: 'charlie_developer',
        githubId: 'charlie-dev',
        gitlabId: 'charlie-dev',
        totalContributions: 2,
        publishedAt: new Date().toISOString(),
        source: 'dotrep-v2',
        version: '2.0.0',
        percentile: 68,
      },
    },
  ],
  [
    '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
    {
      developerId: '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y',
      reputationScore: 920,
      timestamp: Date.now() - 43200000, // 12 hours ago
      contributions: [
        {
          id: 'contrib-d001',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/2000',
          title: 'Major feature implementation',
          date: '2025-11-21T09:00:00Z',
          impact: 98,
        },
        {
          id: 'contrib-d002',
          type: 'github_pr',
          url: 'https://github.com/paritytech/substrate/pull/9999',
          title: 'Optimize storage operations',
          date: '2025-11-19T11:30:00Z',
          impact: 92,
        },
        {
          id: 'contrib-d003',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/1999',
          title: 'Add comprehensive tests',
          date: '2025-11-16T14:00:00Z',
          impact: 88,
        },
        {
          id: 'contrib-d004',
          type: 'github_commit',
          url: 'https://github.com/paritytech/substrate/commit/def456',
          title: 'Fix memory leak',
          date: '2025-11-13T10:15:00Z',
          impact: 95,
        },
        {
          id: 'contrib-d005',
          type: 'github_pr',
          url: 'https://github.com/paritytech/polkadot-sdk/pull/1998',
          title: 'Improve error handling',
          date: '2025-11-11T13:45:00Z',
          impact: 85,
        },
      ],
      metadata: {
        username: 'david_developer',
        githubId: 'david-dev',
        totalContributions: 5,
        publishedAt: new Date().toISOString(),
        source: 'dotrep-v2',
        version: '2.0.0',
        percentile: 92,
      },
    },
  ],
]);

/**
 * Mock JSON-LD representations of reputation assets
 */
export function getMockJSONLD(developerId: string): any {
  const asset = MOCK_REPUTATION_ASSETS.get(developerId);
  if (!asset) {
    return null;
  }

  return {
    '@context': {
      '@vocab': 'https://schema.org/',
      'dotrep': 'https://dotrep.io/ontology/',
      'polkadot': 'https://polkadot.network/ontology/',
    },
    '@type': 'Person',
    '@id': `did:polkadot:${asset.developerId}`,
    'identifier': asset.developerId,
    'dateModified': new Date(asset.timestamp).toISOString(),
    'dotrep:reputationScore': asset.reputationScore,
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': asset.reputationScore,
      'bestRating': 1000,
      'worstRating': 0,
      'ratingCount': asset.contributions.length,
      'reviewAspect': 'Open Source Contributions',
    },
    'dotrep:contributions': asset.contributions.map((contrib: Contribution) => ({
      '@type': 'CreativeWork',
      '@id': contrib.id,
      'name': contrib.title,
      'url': contrib.url,
      'datePublished': contrib.date,
      'dotrep:contributionType': contrib.type,
      'dotrep:impactScore': contrib.impact,
      'author': {
        '@id': `did:polkadot:${asset.developerId}`,
      },
    })),
    'dotrep:metadata': asset.metadata,
    'verifiableCredential': {
      '@type': 'VerifiableCredential',
      'credentialSubject': {
        '@id': `did:polkadot:${asset.developerId}`,
        'reputation': asset.reputationScore,
      },
      'proof': {
        '@type': 'Ed25519Signature2020',
        'created': new Date(asset.timestamp).toISOString(),
        'proofPurpose': 'assertionMethod',
        'verificationMethod': `did:polkadot:${asset.developerId}#keys-1`,
        'mock': true, // Indicate this is mock data
      },
    },
  };
}

/**
 * Get mock UAL for a developer
 */
export function getMockUAL(developerId: string): string | null {
  return MOCK_UALS[developerId] || null;
}

/**
 * Find developer ID by UAL (reverse lookup)
 */
export function findDeveloperByUAL(ual: string): string | null {
  for (const [developerId, mockUAL] of Object.entries(MOCK_UALS)) {
    if (mockUAL === ual) {
      return developerId;
    }
  }
  return null;
}

/**
 * Generate a mock UAL for a developer (if not already in mock data)
 */
export function generateMockUAL(developerId: string): string {
  const existing = MOCK_UALS[developerId];
  if (existing) {
    return existing;
  }
  
  // Generate a deterministic mock UAL
  const hash = Buffer.from(developerId).toString('hex').slice(0, 40);
  return `did:dkg:otp:20430:0x${hash}`;
}

/**
 * Search mock reputation assets by criteria
 */
export function searchMockReputations(criteria: {
  minScore?: number;
  maxScore?: number;
  limit?: number;
}): Array<{ developerId: string; reputationScore: number; contributionCount: number }> {
  const { minScore = 0, maxScore = 1000, limit = 10 } = criteria;
  
  const results: Array<{ developerId: string; reputationScore: number; contributionCount: number }> = [];
  
  for (const [developerId, asset] of MOCK_REPUTATION_ASSETS.entries()) {
    if (asset.reputationScore >= minScore && asset.reputationScore <= maxScore) {
      results.push({
        developerId,
        reputationScore: asset.reputationScore,
        contributionCount: asset.contributions.length,
      });
    }
  }
  
  // Sort by reputation score descending
  results.sort((a, b) => b.reputationScore - a.reputationScore);
  
  return results.slice(0, limit);
}

/**
 * Get mock node info
 */
export function getMockNodeInfo(): any {
  return {
    version: '8.2.0',
    networkId: 'otp:20430',
    nodeId: 'mock-node-id',
    uptime: 86400,
    blockchain: 'otp',
    status: 'connected',
    mock: true,
  };
}

/**
 * Check if a developer ID has mock data
 */
export function hasMockData(developerId: string): boolean {
  return MOCK_REPUTATION_ASSETS.has(developerId) || MOCK_UALS.hasOwnProperty(developerId);
}

/**
 * Get all mock developer IDs
 */
export function getAllMockDeveloperIds(): string[] {
  return Array.from(MOCK_REPUTATION_ASSETS.keys());
}

