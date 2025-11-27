/**
 * DKG Social Reputation Knowledge Assets Mock Data
 * 
 * Comprehensive mock data for DKG knowledge assets with:
 * - Valid JSON-LD/RDF format (W3C standards compliant)
 * - Discoverable assets with UALs (Uniform Asset Locators)
 * - Linked knowledge assets (cross-referenced)
 * - Social reputation data (profiles, connections, campaigns)
 * - Blockchain anchoring metadata (NeuroWeb/Polkadot)
 * 
 * All assets follow JSON-LD 1.1 specification and RDF principles.
 */

// ========== Type Definitions ==========

export interface DKGKnowledgeAssetJSONLD {
  '@context': any;
  '@type': string | string[];
  '@id': string;
  '@graph'?: any[];
  [key: string]: any;
}

export interface SocialReputationKnowledgeAsset {
  ual: string;
  contentHash: string;
  jsonld: DKGKnowledgeAssetJSONLD;
  neuroWebAnchor?: {
    blockNumber: number;
    transactionHash: string;
    blockHash: string;
    paraId: number;
    timestamp: number;
  };
  linkedAssets: string[]; // UALs of related assets
  publishedAt: number;
  lastUpdated: number;
  version: number;
  verificationStatus: 'verified' | 'pending' | 'failed';
}

// ========== Mock Knowledge Assets ==========

/**
 * Social Reputation Profile Asset #1: Tech Guru Alex
 * Valid JSON-LD with proper context, types, and linking
 */
export const socialReputationAsset1: SocialReputationKnowledgeAsset = {
  ual: 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
  contentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  jsonld: {
    '@context': {
      '@vocab': 'https://schema.org/',
      'dotrep': 'https://dotrep.io/ontology/',
      'dkg': 'https://dkg.origintrail.io/ontology/',
      'neuroweb': 'https://neuroweb.origintrail.io/ontology/',
      'prov': 'http://www.w3.org/ns/prov#',
      'vc': 'https://www.w3.org/2018/credentials/v1#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#',
      'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      'rdfs': 'http://www.w3.org/2000/01/rdf-schema#'
    },
    '@type': ['Person', 'dotrep:SocialReputationProfile'],
    '@id': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
    'identifier': 'techguru_alex',
    'name': 'Tech Guru Alex',
    'alternateName': '@techguru_alex',
    'url': 'https://dotrep.io/profile/techguru_alex',
    'image': 'https://i.pravatar.cc/150?img=1',
    'description': 'Technology influencer and blockchain developer with expertise in AI/ML and Web3',
    'datePublished': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 86400000).toISOString()
    },
    'dateModified': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 3600000).toISOString()
    },
    'dotrep:reputationScore': {
      '@type': 'xsd:float',
      '@value': 0.89
    },
    'dotrep:socialRank': {
      '@type': 'xsd:float',
      '@value': 0.92
    },
    'dotrep:reputationMetrics': {
      '@type': 'dotrep:ReputationMetrics',
      'dotrep:overallScore': {
        '@type': 'xsd:float',
        '@value': 0.89
      },
      'dotrep:socialRank': {
        '@type': 'xsd:float',
        '@value': 0.92
      },
      'dotrep:economicStake': {
        '@type': 'xsd:float',
        '@value': 0.85
      },
      'dotrep:endorsementQuality': {
        '@type': 'xsd:float',
        '@value': 0.88
      },
      'dotrep:temporalConsistency': {
        '@type': 'xsd:float',
        '@value': 0.91
      }
    },
    'dotrep:socialMetrics': {
      '@type': 'dotrep:SocialMetrics',
      'dotrep:followerCount': {
        '@type': 'xsd:integer',
        '@value': 125000
      },
      'dotrep:followingCount': {
        '@type': 'xsd:integer',
        '@value': 850
      },
      'dotrep:engagementRate': {
        '@type': 'xsd:float',
        '@value': 0.045
      },
      'dotrep:totalPosts': {
        '@type': 'xsd:integer',
        '@value': 1250
      },
      'dotrep:averageLikes': {
        '@type': 'xsd:integer',
        '@value': 5625
      },
      'dotrep:averageShares': {
        '@type': 'xsd:integer',
        '@value': 450
      }
    },
    'dotrep:sybilResistance': {
      '@type': 'dotrep:SybilResistance',
      'dotrep:behaviorAnomalyScore': {
        '@type': 'xsd:float',
        '@value': 0.15
      },
      'dotrep:connectionDiversity': {
        '@type': 'xsd:float',
        '@value': 0.88
      },
      'dotrep:sybilRisk': {
        '@type': 'xsd:float',
        '@value': 0.12
      }
    },
    'dotrep:specialties': [
      {
        '@type': 'xsd:string',
        '@value': 'Tech Reviews'
      },
      {
        '@type': 'xsd:string',
        '@value': 'Gadgets'
      },
      {
        '@type': 'xsd:string',
        '@value': 'AI/ML'
      }
    ],
    'dotrep:platforms': [
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'Twitter',
        'url': 'https://twitter.com/techguru_alex',
        'verified': true
      },
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'LinkedIn',
        'url': 'https://linkedin.com/in/techguru_alex',
        'verified': true
      },
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'YouTube',
        'url': 'https://youtube.com/@techguru_alex',
        'verified': true
      }
    ],
    'dotrep:linkedAssets': [
      {
        '@id': 'did:dkg:otp:20430:0xcontributions001',
        '@type': 'dotrep:ContributionAsset'
      },
      {
        '@id': 'did:dkg:otp:20430:0xsocialmetrics001',
        '@type': 'dotrep:SocialMetricsAsset'
      },
      {
        '@id': 'did:dkg:otp:20430:0xcampaign001',
        '@type': 'dotrep:CampaignParticipationAsset'
      }
    ],
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': {
        '@type': 'xsd:float',
        '@value': 0.89
      },
      'bestRating': {
        '@type': 'xsd:float',
        '@value': 1.0
      },
      'worstRating': {
        '@type': 'xsd:float',
        '@value': 0.0
      },
      'ratingCount': {
        '@type': 'xsd:integer',
        '@value': 12
      },
      'reviewAspect': 'Social Reputation'
    },
    'dkg:ual': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
    'dkg:contentHash': '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    'neuroweb:anchor': {
      '@type': 'neuroweb:BlockchainAnchor',
      'neuroweb:blockNumber': {
        '@type': 'xsd:integer',
        '@value': 12567890
      },
      'neuroweb:transactionHash': '0xabc123def4567890123456789012345678901234567890123456789012345678',
      'neuroweb:blockHash': '0xdef456abc7890123456789012345678901234567890123456789012345678901',
      'neuroweb:paraId': {
        '@type': 'xsd:integer',
        '@value': 20430
      },
      'neuroweb:timestamp': {
        '@type': 'xsd:dateTime',
        '@value': new Date(Date.now() - 86400000).toISOString()
      }
    },
    'prov:wasGeneratedBy': {
      '@type': 'prov:Activity',
      'prov:wasAssociatedWith': {
        '@id': 'did:agent:dotrep-publisher-001',
        '@type': 'dotrep:AIAgent',
        'name': 'DKG Publisher Agent'
      },
      'prov:startedAtTime': {
        '@type': 'xsd:dateTime',
        '@value': new Date(Date.now() - 86400000).toISOString()
      }
    },
    'vc:verifiableCredential': {
      '@type': 'vc:VerifiableCredential',
      'vc:credentialSubject': {
        '@id': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
        'dotrep:reputationScore': {
          '@type': 'xsd:float',
          '@value': 0.89
        }
      },
      'vc:proof': {
        '@type': 'vc:Ed25519Signature2020',
        'vc:created': {
          '@type': 'xsd:dateTime',
          '@value': new Date(Date.now() - 86400000).toISOString()
        },
        'vc:proofPurpose': 'assertionMethod',
        'vc:verificationMethod': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678#keys-1'
      }
    }
  },
  neuroWebAnchor: {
    blockNumber: 12567890,
    transactionHash: '0xabc123def4567890123456789012345678901234567890123456789012345678',
    blockHash: '0xdef456abc7890123456789012345678901234567890123456789012345678901',
    paraId: 20430,
    timestamp: Date.now() - 86400000
  },
  linkedAssets: [
    'did:dkg:otp:20430:0xcontributions001',
    'did:dkg:otp:20430:0xsocialmetrics001',
    'did:dkg:otp:20430:0xcampaign001',
    'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432' // Links to blockchaindev
  ],
  publishedAt: Date.now() - 86400000,
  lastUpdated: Date.now() - 3600000,
  version: 2,
  verificationStatus: 'verified'
};

/**
 * Social Reputation Profile Asset #2: Crypto Insider
 */
export const socialReputationAsset2: SocialReputationKnowledgeAsset = {
  ual: 'did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12',
  contentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  jsonld: {
    '@context': {
      '@vocab': 'https://schema.org/',
      'dotrep': 'https://dotrep.io/ontology/',
      'dkg': 'https://dkg.origintrail.io/ontology/',
      'neuroweb': 'https://neuroweb.origintrail.io/ontology/',
      'prov': 'http://www.w3.org/ns/prov#',
      'vc': 'https://www.w3.org/2018/credentials/v1#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#'
    },
    '@type': ['Person', 'dotrep:SocialReputationProfile'],
    '@id': 'did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12',
    'identifier': 'cryptoinsider',
    'name': 'Crypto Insider',
    'alternateName': '@cryptoinsider',
    'url': 'https://dotrep.io/profile/cryptoinsider',
    'image': 'https://i.pravatar.cc/150?img=2',
    'description': 'Cryptocurrency and DeFi expert providing insights on blockchain technology',
    'datePublished': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 172800000).toISOString()
    },
    'dateModified': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 7200000).toISOString()
    },
    'dotrep:reputationScore': {
      '@type': 'xsd:float',
      '@value': 0.76
    },
    'dotrep:socialRank': {
      '@type': 'xsd:float',
      '@value': 0.78
    },
    'dotrep:reputationMetrics': {
      '@type': 'dotrep:ReputationMetrics',
      'dotrep:overallScore': {
        '@type': 'xsd:float',
        '@value': 0.76
      },
      'dotrep:socialRank': {
        '@type': 'xsd:float',
        '@value': 0.78
      },
      'dotrep:economicStake': {
        '@type': 'xsd:float',
        '@value': 0.72
      },
      'dotrep:endorsementQuality': {
        '@type': 'xsd:float',
        '@value': 0.75
      },
      'dotrep:temporalConsistency': {
        '@type': 'xsd:float',
        '@value': 0.74
      }
    },
    'dotrep:socialMetrics': {
      '@type': 'dotrep:SocialMetrics',
      'dotrep:followerCount': {
        '@type': 'xsd:integer',
        '@value': 89000
      },
      'dotrep:followingCount': {
        '@type': 'xsd:integer',
        '@value': 1200
      },
      'dotrep:engagementRate': {
        '@type': 'xsd:float',
        '@value': 0.032
      },
      'dotrep:totalPosts': {
        '@type': 'xsd:integer',
        '@value': 890
      },
      'dotrep:averageLikes': {
        '@type': 'xsd:integer',
        '@value': 2848
      },
      'dotrep:averageShares': {
        '@type': 'xsd:integer',
        '@value': 285
      }
    },
    'dotrep:sybilResistance': {
      '@type': 'dotrep:SybilResistance',
      'dotrep:behaviorAnomalyScore': {
        '@type': 'xsd:float',
        '@value': 0.22
      },
      'dotrep:connectionDiversity': {
        '@type': 'xsd:float',
        '@value': 0.75
      },
      'dotrep:sybilRisk': {
        '@type': 'xsd:float',
        '@value': 0.18
      }
    },
    'dotrep:specialties': [
      {
        '@type': 'xsd:string',
        '@value': 'Cryptocurrency'
      },
      {
        '@type': 'xsd:string',
        '@value': 'DeFi'
      },
      {
        '@type': 'xsd:string',
        '@value': 'Blockchain'
      }
    ],
    'dotrep:platforms': [
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'Twitter',
        'url': 'https://twitter.com/cryptoinsider',
        'verified': true
      },
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'YouTube',
        'url': 'https://youtube.com/@cryptoinsider',
        'verified': true
      },
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'TikTok',
        'url': 'https://tiktok.com/@cryptoinsider',
        'verified': false
      }
    ],
    'dotrep:linkedAssets': [
      {
        '@id': 'did:dkg:otp:20430:0xcampaign002',
        '@type': 'dotrep:CampaignParticipationAsset'
      },
      {
        '@id': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678', // Links to techguru_alex
        '@type': 'dotrep:SocialReputationProfile'
      }
    ],
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': {
        '@type': 'xsd:float',
        '@value': 0.76
      },
      'bestRating': {
        '@type': 'xsd:float',
        '@value': 1.0
      },
      'worstRating': {
        '@type': 'xsd:float',
        '@value': 0.0
      },
      'ratingCount': {
        '@type': 'xsd:integer',
        '@value': 8
      },
      'reviewAspect': 'Social Reputation'
    },
    'dkg:ual': 'did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12',
    'dkg:contentHash': '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'neuroweb:anchor': {
      '@type': 'neuroweb:BlockchainAnchor',
      'neuroweb:blockNumber': {
        '@type': 'xsd:integer',
        '@value': 12450000
      },
      'neuroweb:transactionHash': '0xdef456abc7890123456789012345678901234567890123456789012345678901',
      'neuroweb:blockHash': '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      'neuroweb:paraId': {
        '@type': 'xsd:integer',
        '@value': 20430
      },
      'neuroweb:timestamp': {
        '@type': 'xsd:dateTime',
        '@value': new Date(Date.now() - 172800000).toISOString()
      }
    },
    'prov:wasGeneratedBy': {
      '@type': 'prov:Activity',
      'prov:wasAssociatedWith': {
        '@id': 'did:agent:dotrep-publisher-001',
        '@type': 'dotrep:AIAgent',
        'name': 'DKG Publisher Agent'
      },
      'prov:startedAtTime': {
        '@type': 'xsd:dateTime',
        '@value': new Date(Date.now() - 172800000).toISOString()
      }
    },
    'vc:verifiableCredential': {
      '@type': 'vc:VerifiableCredential',
      'vc:credentialSubject': {
        '@id': 'did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12',
        'dotrep:reputationScore': {
          '@type': 'xsd:float',
          '@value': 0.76
        }
      },
      'vc:proof': {
        '@type': 'vc:Ed25519Signature2020',
        'vc:created': {
          '@type': 'xsd:dateTime',
          '@value': new Date(Date.now() - 172800000).toISOString()
        },
        'vc:proofPurpose': 'assertionMethod',
        'vc:verificationMethod': 'did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12#keys-1'
      }
    }
  },
  neuroWebAnchor: {
    blockNumber: 12450000,
    transactionHash: '0xdef456abc7890123456789012345678901234567890123456789012345678901',
    blockHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    paraId: 20430,
    timestamp: Date.now() - 172800000
  },
  linkedAssets: [
    'did:dkg:otp:20430:0xcampaign002',
    'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678'
  ],
  publishedAt: Date.now() - 172800000,
  lastUpdated: Date.now() - 7200000,
  version: 1,
  verificationStatus: 'verified'
};

/**
 * Social Reputation Profile Asset #3: Blockchain Developer
 */
export const socialReputationAsset3: SocialReputationKnowledgeAsset = {
  ual: 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432',
  contentHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
  jsonld: {
    '@context': {
      '@vocab': 'https://schema.org/',
      'dotrep': 'https://dotrep.io/ontology/',
      'dkg': 'https://dkg.origintrail.io/ontology/',
      'neuroweb': 'https://neuroweb.origintrail.io/ontology/',
      'prov': 'http://www.w3.org/ns/prov#',
      'vc': 'https://www.w3.org/2018/credentials/v1#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#'
    },
    '@type': ['Person', 'dotrep:SocialReputationProfile'],
    '@id': 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432',
    'identifier': 'blockchaindev',
    'name': 'Blockchain Developer',
    'alternateName': '@blockchaindev',
    'url': 'https://dotrep.io/profile/blockchaindev',
    'image': 'https://i.pravatar.cc/150?img=3',
    'description': 'Expert blockchain developer specializing in smart contracts and Web3 infrastructure',
    'datePublished': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 259200000).toISOString()
    },
    'dateModified': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 1800000).toISOString()
    },
    'dotrep:reputationScore': {
      '@type': 'xsd:float',
      '@value': 0.92
    },
    'dotrep:socialRank': {
      '@type': 'xsd:float',
      '@value': 0.88
    },
    'dotrep:reputationMetrics': {
      '@type': 'dotrep:ReputationMetrics',
      'dotrep:overallScore': {
        '@type': 'xsd:float',
        '@value': 0.92
      },
      'dotrep:socialRank': {
        '@type': 'xsd:float',
        '@value': 0.88
      },
      'dotrep:economicStake': {
        '@type': 'xsd:float',
        '@value': 0.95
      },
      'dotrep:endorsementQuality': {
        '@type': 'xsd:float',
        '@value': 0.91
      },
      'dotrep:temporalConsistency': {
        '@type': 'xsd:float',
        '@value': 0.93
      }
    },
    'dotrep:socialMetrics': {
      '@type': 'dotrep:SocialMetrics',
      'dotrep:followerCount': {
        '@type': 'xsd:integer',
        '@value': 45000
      },
      'dotrep:followingCount': {
        '@type': 'xsd:integer',
        '@value': 350
      },
      'dotrep:engagementRate': {
        '@type': 'xsd:float',
        '@value': 0.052
      },
      'dotrep:totalPosts': {
        '@type': 'xsd:integer',
        '@value': 650
      },
      'dotrep:averageLikes': {
        '@type': 'xsd:integer',
        '@value': 2340
      },
      'dotrep:averageShares': {
        '@type': 'xsd:integer',
        '@value': 195
      }
    },
    'dotrep:sybilResistance': {
      '@type': 'dotrep:SybilResistance',
      'dotrep:behaviorAnomalyScore': {
        '@type': 'xsd:float',
        '@value': 0.08
      },
      'dotrep:connectionDiversity': {
        '@type': 'xsd:float',
        '@value': 0.92
      },
      'dotrep:sybilRisk': {
        '@type': 'xsd:float',
        '@value': 0.05
      }
    },
    'dotrep:specialties': [
      {
        '@type': 'xsd:string',
        '@value': 'Blockchain Development'
      },
      {
        '@type': 'xsd:string',
        '@value': 'Smart Contracts'
      },
      {
        '@type': 'xsd:string',
        '@value': 'Web3'
      }
    ],
    'dotrep:platforms': [
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'LinkedIn',
        'url': 'https://linkedin.com/in/blockchaindev',
        'verified': true
      },
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'Twitter',
        'url': 'https://twitter.com/blockchaindev',
        'verified': true
      },
      {
        '@type': 'dotrep:SocialPlatform',
        'name': 'GitHub',
        'url': 'https://github.com/blockchaindev',
        'verified': true
      }
    ],
    'dotrep:linkedAssets': [
      {
        '@id': 'did:dkg:otp:20430:0xcontributions002',
        '@type': 'dotrep:ContributionAsset'
      },
      {
        '@id': 'did:dkg:otp:20430:0xendorsements001',
        '@type': 'dotrep:EndorsementAsset'
      },
      {
        '@id': 'did:dkg:otp:20430:0xcampaign003',
        '@type': 'dotrep:CampaignParticipationAsset'
      },
      {
        '@id': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678', // Links to techguru_alex
        '@type': 'dotrep:SocialReputationProfile'
      }
    ],
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': {
        '@type': 'xsd:float',
        '@value': 0.92
      },
      'bestRating': {
        '@type': 'xsd:float',
        '@value': 1.0
      },
      'worstRating': {
        '@type': 'xsd:float',
        '@value': 0.0
      },
      'ratingCount': {
        '@type': 'xsd:integer',
        '@value': 15
      },
      'reviewAspect': 'Social Reputation'
    },
    'dkg:ual': 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432',
    'dkg:contentHash': '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    'neuroweb:anchor': {
      '@type': 'neuroweb:BlockchainAnchor',
      'neuroweb:blockNumber': {
        '@type': 'xsd:integer',
        '@value': 12344000
      },
      'neuroweb:transactionHash': '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
      'neuroweb:blockHash': '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
      'neuroweb:paraId': {
        '@type': 'xsd:integer',
        '@value': 20430
      },
      'neuroweb:timestamp': {
        '@type': 'xsd:dateTime',
        '@value': new Date(Date.now() - 259200000).toISOString()
      }
    },
    'prov:wasGeneratedBy': {
      '@type': 'prov:Activity',
      'prov:wasAssociatedWith': {
        '@id': 'did:agent:dotrep-publisher-001',
        '@type': 'dotrep:AIAgent',
        'name': 'DKG Publisher Agent'
      },
      'prov:startedAtTime': {
        '@type': 'xsd:dateTime',
        '@value': new Date(Date.now() - 259200000).toISOString()
      }
    },
    'vc:verifiableCredential': {
      '@type': 'vc:VerifiableCredential',
      'vc:credentialSubject': {
        '@id': 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432',
        'dotrep:reputationScore': {
          '@type': 'xsd:float',
          '@value': 0.92
        }
      },
      'vc:proof': {
        '@type': 'vc:Ed25519Signature2020',
        'vc:created': {
          '@type': 'xsd:dateTime',
          '@value': new Date(Date.now() - 259200000).toISOString()
      },
        'vc:proofPurpose': 'assertionMethod',
        'vc:verificationMethod': 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432#keys-1'
      }
    }
  },
  neuroWebAnchor: {
    blockNumber: 12344000,
    transactionHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    blockHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    paraId: 20430,
    timestamp: Date.now() - 259200000
  },
  linkedAssets: [
    'did:dkg:otp:20430:0xcontributions002',
    'did:dkg:otp:20430:0xendorsements001',
    'did:dkg:otp:20430:0xcampaign003',
    'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678'
  ],
  publishedAt: Date.now() - 259200000,
  lastUpdated: Date.now() - 1800000,
  version: 3,
  verificationStatus: 'verified'
};

/**
 * Campaign Participation Asset #1: Tech Gadget Launch 2024
 * Linked to socialReputationAsset1
 */
export const campaignAsset1: SocialReputationKnowledgeAsset = {
  ual: 'did:dkg:otp:20430:0xcampaign001',
  contentHash: '0xcampaign001hash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  jsonld: {
    '@context': {
      '@vocab': 'https://schema.org/',
      'dotrep': 'https://dotrep.io/ontology/',
      'dkg': 'https://dkg.origintrail.io/ontology/',
      'neuroweb': 'https://neuroweb.origintrail.io/ontology/',
      'prov': 'http://www.w3.org/ns/prov#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#'
    },
    '@type': ['Action', 'dotrep:CampaignParticipation'],
    '@id': 'did:dkg:otp:20430:0xcampaign001',
    'name': 'Tech Gadget Launch 2024 Campaign',
    'description': 'Influencer marketing campaign for new tech gadget product launch',
    'datePublished': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 2592000000).toISOString()
    },
    'dateCompleted': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 2160000000).toISOString()
    },
    'dotrep:campaignStatus': {
      '@type': 'xsd:string',
      '@value': 'completed'
    },
    'dotrep:participant': {
      '@id': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
      '@type': 'dotrep:SocialReputationProfile',
      'name': 'Tech Guru Alex'
    },
    'dotrep:performance': {
      '@type': 'dotrep:CampaignPerformance',
      'dotrep:engagement': {
        '@type': 'xsd:integer',
        '@value': 125000
      },
      'dotrep:reach': {
        '@type': 'xsd:integer',
        '@value': 450000
      },
      'dotrep:conversionRate': {
        '@type': 'xsd:float',
        '@value': 0.045
      },
      'dotrep:qualityScore': {
        '@type': 'xsd:float',
        '@value': 0.88
      }
    },
    'dotrep:earnings': {
      '@type': 'dotrep:MonetaryAmount',
      'dotrep:basePayment': {
        '@type': 'xsd:float',
        '@value': 200
      },
      'dotrep:bonus': {
        '@type': 'xsd:float',
        '@value': 125
      },
      'dotrep:total': {
        '@type': 'xsd:float',
        '@value': 325
      },
      'dotrep:currency': {
        '@type': 'xsd:string',
        '@value': 'USD'
      }
    },
    'dkg:ual': 'did:dkg:otp:20430:0xcampaign001',
    'dkg:contentHash': '0xcampaign001hash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'prov:wasGeneratedBy': {
      '@type': 'prov:Activity',
      'prov:wasAssociatedWith': {
        '@id': 'did:agent:dotrep-publisher-001',
        '@type': 'dotrep:AIAgent'
      }
    }
  },
  linkedAssets: [
    'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678'
  ],
  publishedAt: Date.now() - 2592000000,
  lastUpdated: Date.now() - 2160000000,
  version: 1,
  verificationStatus: 'verified'
};

/**
 * Social Connection Asset: Tech Guru Alex -> Blockchain Developer
 * Demonstrates linked relationships between profiles
 */
export const socialConnectionAsset1: SocialReputationKnowledgeAsset = {
  ual: 'did:dkg:otp:20430:0xconnection001',
  contentHash: '0xconnection001hash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  jsonld: {
    '@context': {
      '@vocab': 'https://schema.org/',
      'dotrep': 'https://dotrep.io/ontology/',
      'dkg': 'https://dkg.origintrail.io/ontology/',
      'prov': 'http://www.w3.org/ns/prov#',
      'xsd': 'http://www.w3.org/2001/XMLSchema#'
    },
    '@type': ['Relationship', 'dotrep:SocialConnection'],
    '@id': 'did:dkg:otp:20430:0xconnection001',
    'name': 'Collaboration Relationship',
    'description': 'Social connection between Tech Guru Alex and Blockchain Developer',
    'datePublished': {
      '@type': 'xsd:dateTime',
      '@value': new Date(Date.now() - 86400000).toISOString()
    },
    'dotrep:connectionType': {
      '@type': 'xsd:string',
      '@value': 'collaborates'
    },
    'dotrep:connectionStrength': {
      '@type': 'xsd:float',
      '@value': 0.85
    },
    'dotrep:fromProfile': {
      '@id': 'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
      '@type': 'dotrep:SocialReputationProfile',
      'name': 'Tech Guru Alex'
    },
    'dotrep:toProfile': {
      '@id': 'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432',
      '@type': 'dotrep:SocialReputationProfile',
      'name': 'Blockchain Developer'
    },
    'dotrep:platform': {
      '@type': 'xsd:string',
      '@value': 'Twitter'
    },
    'dkg:ual': 'did:dkg:otp:20430:0xconnection001',
    'dkg:contentHash': '0xconnection001hash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'prov:wasGeneratedBy': {
      '@type': 'prov:Activity',
      'prov:wasAssociatedWith': {
        '@id': 'did:agent:dotrep-detective-001',
        '@type': 'dotrep:AIAgent',
        'name': 'Reputation Detective Agent'
      }
    }
  },
  linkedAssets: [
    'did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678',
    'did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432'
  ],
  publishedAt: Date.now() - 86400000,
  lastUpdated: Date.now() - 86400000,
  version: 1,
  verificationStatus: 'verified'
};

// ========== All Assets Collection ==========

export const allDKGKnowledgeAssets: SocialReputationKnowledgeAsset[] = [
  socialReputationAsset1,
  socialReputationAsset2,
  socialReputationAsset3,
  campaignAsset1,
  socialConnectionAsset1
];

// ========== Helper Functions ==========

/**
 * Get knowledge asset by UAL
 */
export function getKnowledgeAssetByUAL(ual: string): SocialReputationKnowledgeAsset | undefined {
  return allDKGKnowledgeAssets.find(asset => asset.ual === ual);
}

/**
 * Get all linked assets for a given UAL
 */
export function getLinkedAssets(ual: string): SocialReputationKnowledgeAsset[] {
  const asset = getKnowledgeAssetByUAL(ual);
  if (!asset) return [];
  
  return asset.linkedAssets
    .map(linkedUAL => getKnowledgeAssetByUAL(linkedUAL))
    .filter((a): a is SocialReputationKnowledgeAsset => a !== undefined);
}

/**
 * Get all social reputation profile assets
 */
export function getSocialReputationProfiles(): SocialReputationKnowledgeAsset[] {
  return allDKGKnowledgeAssets.filter(asset => 
    asset.jsonld['@type']?.includes('dotrep:SocialReputationProfile')
  );
}

/**
 * Get all campaign participation assets
 */
export function getCampaignAssets(): SocialReputationKnowledgeAsset[] {
  return allDKGKnowledgeAssets.filter(asset => 
    asset.jsonld['@type']?.includes('dotrep:CampaignParticipation')
  );
}

/**
 * Get all social connection assets
 */
export function getSocialConnectionAssets(): SocialReputationKnowledgeAsset[] {
  return allDKGKnowledgeAssets.filter(asset => 
    asset.jsonld['@type']?.includes('dotrep:SocialConnection')
  );
}

/**
 * Search assets by keyword (searches in name, description, specialties)
 */
export function searchKnowledgeAssets(query: string): SocialReputationKnowledgeAsset[] {
  const lowerQuery = query.toLowerCase();
  return allDKGKnowledgeAssets.filter(asset => {
    const name = asset.jsonld.name?.toLowerCase() || '';
    const description = asset.jsonld.description?.toLowerCase() || '';
    const identifier = asset.jsonld.identifier?.toLowerCase() || '';
    const specialties = Array.isArray(asset.jsonld['dotrep:specialties'])
      ? asset.jsonld['dotrep:specialties'].map((s: any) => 
          typeof s === 'object' && s['@value'] ? s['@value'].toLowerCase() : String(s).toLowerCase()
        ).join(' ')
      : '';
    
    return name.includes(lowerQuery) ||
           description.includes(lowerQuery) ||
           identifier.includes(lowerQuery) ||
           specialties.includes(lowerQuery);
  });
}

/**
 * Get verified assets only
 */
export function getVerifiedAssets(): SocialReputationKnowledgeAsset[] {
  return allDKGKnowledgeAssets.filter(asset => asset.verificationStatus === 'verified');
}

/**
 * Get assets by reputation score range
 */
export function getAssetsByReputationScore(
  minScore: number = 0,
  maxScore: number = 1.0
): SocialReputationKnowledgeAsset[] {
  return allDKGKnowledgeAssets.filter(asset => {
    const score = asset.jsonld['dotrep:reputationScore'];
    if (!score) return false;
    const scoreValue = typeof score === 'object' && score['@value'] 
      ? score['@value'] 
      : score;
    return scoreValue >= minScore && scoreValue <= maxScore;
  });
}

/**
 * Get knowledge graph statistics
 */
export function getKnowledgeGraphStats() {
  return {
    totalAssets: allDKGKnowledgeAssets.length,
    verifiedAssets: getVerifiedAssets().length,
    socialReputationProfiles: getSocialReputationProfiles().length,
    campaignAssets: getCampaignAssets().length,
    connectionAssets: getSocialConnectionAssets().length,
    totalLinks: allDKGKnowledgeAssets.reduce((sum, asset) => sum + asset.linkedAssets.length, 0),
    averageLinksPerAsset: allDKGKnowledgeAssets.reduce((sum, asset) => sum + asset.linkedAssets.length, 0) / allDKGKnowledgeAssets.length
  };
}

/**
 * Export all assets as JSON-LD array (for SPARQL queries, etc.)
 */
export function exportAllAsJSONLD(): DKGKnowledgeAssetJSONLD[] {
  return allDKGKnowledgeAssets.map(asset => asset.jsonld);
}

/**
 * Get asset network graph (for visualization)
 */
export function getAssetNetworkGraph() {
  const nodes = allDKGKnowledgeAssets.map(asset => ({
    id: asset.ual,
    label: asset.jsonld.name || asset.jsonld.identifier || asset.ual,
    type: Array.isArray(asset.jsonld['@type']) 
      ? asset.jsonld['@type'].find((t: string) => t.startsWith('dotrep:')) || 'Unknown'
      : asset.jsonld['@type'] || 'Unknown',
    reputationScore: asset.jsonld['dotrep:reputationScore']?.['@value'] || 
                     asset.jsonld['dotrep:reputationScore'] || null,
    verified: asset.verificationStatus === 'verified'
  }));
  
  const edges: Array<{from: string; to: string; type: string}> = [];
  allDKGKnowledgeAssets.forEach(asset => {
    asset.linkedAssets.forEach(linkedUAL => {
      edges.push({
        from: asset.ual,
        to: linkedUAL,
        type: 'linked'
      });
    });
  });
  
  return { nodes, edges };
}

