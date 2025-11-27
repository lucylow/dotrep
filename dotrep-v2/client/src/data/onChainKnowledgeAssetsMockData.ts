/**
 * Verifiable On-Chain Knowledge Assets Mock Data for Polkadot Parachains
 * 
 * Comprehensive mock data for knowledge assets anchored on Polkadot parachains:
 * - NeuroWeb (OriginTrail) parachain knowledge assets
 * - Moonbeam EVM-compatible knowledge assets
 * - Acala DeFi knowledge assets
 * - Cross-parachain knowledge asset references
 * - On-chain verification proofs
 * - Blockchain-anchored reputation data
 */

export interface OnChainKnowledgeAsset {
  ual: string; // Uniform Asset Locator
  assetId: string;
  assetType: "reputation" | "identity" | "contribution" | "attestation" | "verification" | "fact_check";
  parachain: string;
  paraId: number;
  chainId: number;
  
  // Blockchain anchoring
  anchor: {
    blockNumber: number;
    blockHash: string;
    transactionHash: string;
    transactionIndex: number;
    timestamp: number;
    gasUsed?: number;
    gasPrice?: string;
    status: "pending" | "confirmed" | "finalized";
    confirmations: number;
  };
  
  // Content verification
  content: {
    contentHash: string; // IPFS hash or content hash
    contentUrl?: string; // IPFS URL or content URL
    format: "json-ld" | "rdf" | "json" | "binary";
    schema: string; // Schema.org or custom schema
    size: number; // Bytes
    mimeType?: string;
  };
  
  // Metadata
  metadata: {
    title: string;
    description: string;
    author?: string;
    publisher?: string;
    publishedAt: number;
    lastUpdated: number;
    version: number;
    tags: string[];
    language?: string;
  };
  
  // Verification
  verification: {
    verified: boolean;
    verificationMethod: "on_chain" | "dkg" | "xcm" | "merkle_proof";
    verifiedBy: string[]; // Agent IDs or verifier addresses
    verifiedAt: number;
    proof?: string; // Cryptographic proof
    attestations: Attestation[];
  };
  
  // Cross-chain references
  crossChainReferences: {
    chain: string;
    referenceType: "linked_asset" | "cross_chain_attestation" | "xcm_message" | "bridge";
    referenceId: string; // UAL, TX hash, or other identifier
    verified: boolean;
  }[];
  
  // Reputation data (if applicable)
  reputationData?: {
    userId: string;
    reputationScore: number;
    contributionCount: number;
    verifiedContributions: string[]; // UALs or IDs
    lastUpdated: number;
  };
  
  // DKG integration
  dkgIntegration?: {
    dkgUal: string; // DKG UAL if also stored in DKG
    dkgPublished: boolean;
    dkgPublishedAt?: number;
    dkgVersion?: number;
  };
}

export interface Attestation {
  attestationId: string;
  attester: string; // Address or agent ID
  attestationType: "expert" | "community" | "automated" | "official";
  content: string;
  timestamp: number;
  verified: boolean;
  onChain?: {
    chain: string;
    txHash: string;
    blockNumber: number;
  };
}

export interface ParachainKnowledgeAssetRegistry {
  parachain: string;
  paraId: number;
  totalAssets: number;
  assetsByType: Record<string, number>;
  verifiedAssets: number;
  lastUpdated: number;
  registryContract?: string; // Smart contract address if applicable
}

// ========== Mock On-Chain Knowledge Assets ==========

export const mockOnChainKnowledgeAssets: OnChainKnowledgeAsset[] = [
  {
    ual: "did:dkg:otp:2043:0xneurowebreputation1234567890abcdef1234567890abcdef12345678",
    assetId: "asset-neuroweb-001",
    assetType: "reputation",
    parachain: "neuroweb",
    paraId: 2043,
    chainId: 2043,
    anchor: {
      blockNumber: 12567890,
      blockHash: "0xblock1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      transactionHash: "0xneurowebreputation1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      transactionIndex: 5,
      timestamp: Date.now() - 86400000,
      gasUsed: 125000,
      gasPrice: "1000000000",
      status: "finalized",
      confirmations: 100,
    },
    content: {
      contentHash: "0xcontent1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      contentUrl: "ipfs://QmReputation1234567890abcdef1234567890abcdef1234567890",
      format: "json-ld",
      schema: "https://schema.org/Person",
      size: 2048,
      mimeType: "application/ld+json",
    },
    metadata: {
      title: "TechGuru Alex - Reputation Profile",
      description: "Comprehensive reputation profile with social metrics and contribution history",
      author: "agent-dkg-publisher-001",
      publisher: "DotRep Reputation System",
      publishedAt: Date.now() - 86400000,
      lastUpdated: Date.now() - 3600000,
      version: 2,
      tags: ["reputation", "social", "developer", "verified"],
      language: "en",
    },
    verification: {
      verified: true,
      verificationMethod: "on_chain",
      verifiedBy: ["agent-dkg-verifier-001", "agent-reputation-detective-001"],
      verifiedAt: Date.now() - 86300000,
      proof: "0xproof1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      attestations: [
        {
          attestationId: "attest-001",
          attester: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
          attestationType: "community",
          content: "Verified reputation profile with high credibility",
          timestamp: Date.now() - 86300000,
          verified: true,
          onChain: {
            chain: "neuroweb",
            txHash: "0xattest0011234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            blockNumber: 12567891,
          },
        },
      ],
    },
    crossChainReferences: [
      {
        chain: "polkadot",
        referenceType: "linked_asset",
        referenceId: "0xpolkadotreputation1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        verified: true,
      },
      {
        chain: "moonbeam",
        referenceType: "cross_chain_attestation",
        referenceId: "0xmoonbeamattest1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        verified: true,
      },
    ],
    reputationData: {
      userId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      reputationScore: 0.89,
      contributionCount: 125,
      verifiedContributions: [
        "did:dkg:otp:20430:0xcontributions001",
        "did:dkg:otp:20430:0xcontributions002",
      ],
      lastUpdated: Date.now() - 3600000,
    },
    dkgIntegration: {
      dkgUal: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
      dkgPublished: true,
      dkgPublishedAt: Date.now() - 86400000,
      dkgVersion: 2,
    },
  },
  {
    ual: "did:dkg:otp:2043:0xneurowebidentity9876543210fedcba9876543210fedcba98765432",
    assetId: "asset-neuroweb-002",
    assetType: "identity",
    parachain: "neuroweb",
    paraId: 2043,
    chainId: 2043,
    anchor: {
      blockNumber: 12450000,
      blockHash: "0xblock9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      transactionHash: "0xneurowebidentity9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      transactionIndex: 12,
      timestamp: Date.now() - 172800000,
      gasUsed: 118000,
      gasPrice: "1000000000",
      status: "finalized",
      confirmations: 500,
    },
    content: {
      contentHash: "0xcontent9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      contentUrl: "ipfs://QmIdentity9876543210fedcba9876543210fedcba9876543210",
      format: "json-ld",
      schema: "https://schema.org/Person",
      size: 1536,
      mimeType: "application/ld+json",
    },
    metadata: {
      title: "Cross-Chain Identity Verification",
      description: "Verified identity with multi-chain attestations",
      author: "agent-dkg-publisher-001",
      publisher: "DotRep Identity System",
      publishedAt: Date.now() - 172800000,
      lastUpdated: Date.now() - 7200000,
      version: 1,
      tags: ["identity", "verification", "cross-chain", "attestation"],
      language: "en",
    },
    verification: {
      verified: true,
      verificationMethod: "on_chain",
      verifiedBy: ["agent-dkg-verifier-001"],
      verifiedAt: Date.now() - 172700000,
      proof: "0xproof9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      attestations: [
        {
          attestationId: "attest-002",
          attester: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
          attestationType: "official",
          content: "Identity verified across multiple chains",
          timestamp: Date.now() - 172700000,
          verified: true,
          onChain: {
            chain: "neuroweb",
            txHash: "0xattest0029876543210fedcba9876543210fedcba9876543210fedcba9876543210",
            blockNumber: 12450001,
          },
        },
      ],
    },
    crossChainReferences: [
      {
        chain: "polkadot",
        referenceType: "xcm_message",
        referenceId: "xcm-001",
        verified: true,
      },
      {
        chain: "moonbeam",
        referenceType: "linked_asset",
        referenceId: "0xmoonbeamidentity9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
        verified: true,
      },
    ],
    dkgIntegration: {
      dkgUal: "did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12",
      dkgPublished: true,
      dkgPublishedAt: Date.now() - 172800000,
      dkgVersion: 1,
    },
  },
  {
    ual: "did:moonbeam:2004:0xmoonbeamcontribution11112222333344445555666677778888999900",
    assetId: "asset-moonbeam-001",
    assetType: "contribution",
    parachain: "moonbeam",
    paraId: 2004,
    chainId: 1284,
    anchor: {
      blockNumber: 23456789,
      blockHash: "0xblock1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      transactionHash: "0xmoonbeamcontribution1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      transactionIndex: 8,
      timestamp: Date.now() - 259200000,
      gasUsed: 95000,
      gasPrice: "100000000",
      status: "finalized",
      confirmations: 1000,
    },
    content: {
      contentHash: "0xcontent1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      contentUrl: "ipfs://QmContribution1111222233334444555566667777888899990000",
      format: "json-ld",
      schema: "https://schema.org/CreativeWork",
      size: 3072,
      mimeType: "application/ld+json",
    },
    metadata: {
      title: "Open-Source Contribution to Cross-Chain Protocol",
      description: "Verified GitHub contribution with on-chain attestation",
      author: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      publisher: "GitHub Integration Service",
      publishedAt: Date.now() - 259200000,
      lastUpdated: Date.now() - 1800000,
      version: 1,
      tags: ["contribution", "github", "open-source", "cross-chain"],
      language: "en",
    },
    verification: {
      verified: true,
      verificationMethod: "on_chain",
      verifiedBy: ["agent-github-verifier-001"],
      verifiedAt: Date.now() - 259100000,
      proof: "0xproof1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      attestations: [
        {
          attestationId: "attest-003",
          attester: "agent-github-verifier-001",
          attestationType: "automated",
          content: "GitHub contribution verified and anchored on-chain",
          timestamp: Date.now() - 259100000,
          verified: true,
          onChain: {
            chain: "moonbeam",
            txHash: "0xattest0031111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
            blockNumber: 23456790,
          },
        },
      ],
    },
    crossChainReferences: [
      {
        chain: "neuroweb",
        referenceType: "linked_asset",
        referenceId: "did:dkg:otp:2043:0xneurowebcontribution11112222333344445555666677778888999900",
        verified: true,
      },
    ],
    reputationData: {
      userId: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      reputationScore: 0.92,
      contributionCount: 89,
      verifiedContributions: [
        "did:moonbeam:2004:0xcontribution001",
        "did:moonbeam:2004:0xcontribution002",
      ],
      lastUpdated: Date.now() - 1800000,
    },
  },
  {
    ual: "did:acala:2000:0xacalafactcheck2222333344445555666677778888999900001111",
    assetId: "asset-acala-001",
    assetType: "fact_check",
    parachain: "acala",
    paraId: 2000,
    chainId: 2000,
    anchor: {
      blockNumber: 45678901,
      blockHash: "0xblock2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
      transactionHash: "0xacalafactcheck2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
      transactionIndex: 3,
      timestamp: Date.now() - 432000000,
      gasUsed: 110000,
      gasPrice: "1000000000",
      status: "finalized",
      confirmations: 2000,
    },
    content: {
      contentHash: "0xcontent2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
      contentUrl: "ipfs://QmFactCheck2222333344445555666677778888999900001111",
      format: "json-ld",
      schema: "https://schema.org/ClaimReview",
      size: 4096,
      mimeType: "application/ld+json",
    },
    metadata: {
      title: "Fact Check: XCM Message Fees",
      description: "Verified fact-check result for XCM message fee claims",
      author: "agent-fact-checker-001",
      publisher: "DotRep Fact-Checking System",
      publishedAt: Date.now() - 432000000,
      lastUpdated: Date.now() - 431000000,
      version: 1,
      tags: ["fact-check", "xcm", "polkadot", "verified"],
      language: "en",
    },
    verification: {
      verified: true,
      verificationMethod: "on_chain",
      verifiedBy: ["agent-fact-checker-001", "agent-dkg-verifier-001"],
      verifiedAt: Date.now() - 431500000,
      proof: "0xproof2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
      attestations: [
        {
          attestationId: "attest-004",
          attester: "agent-fact-checker-001",
          attestationType: "expert",
          content: "Fact-check verified with high confidence using multiple sources",
          timestamp: Date.now() - 431500000,
          verified: true,
          onChain: {
            chain: "acala",
            txHash: "0xattest0042222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
            blockNumber: 45678902,
          },
        },
      ],
    },
    crossChainReferences: [
      {
        chain: "polkadot",
        referenceType: "linked_asset",
        referenceId: "0xpolkadotfactcheck2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
        verified: true,
      },
      {
        chain: "neuroweb",
        referenceType: "dkg_asset",
        referenceId: "did:dkg:otp:20430:0xxcmfees1234567890abcdef1234567890abcdef12345678",
        verified: true,
      },
    ],
  },
];

// ========== Mock Parachain Knowledge Asset Registries ==========

export const mockParachainKnowledgeAssetRegistries: ParachainKnowledgeAssetRegistry[] = [
  {
    parachain: "neuroweb",
    paraId: 2043,
    totalAssets: 1250,
    assetsByType: {
      reputation: 450,
      identity: 320,
      contribution: 280,
      attestation: 150,
      verification: 50,
    },
    verifiedAssets: 1180,
    lastUpdated: Date.now() - 3600000,
    registryContract: "0xneurowebregistry1234567890abcdef1234567890abcdef12345678",
  },
  {
    parachain: "moonbeam",
    paraId: 2004,
    totalAssets: 890,
    assetsByType: {
      reputation: 320,
      contribution: 280,
      identity: 150,
      attestation: 100,
      fact_check: 40,
    },
    verifiedAssets: 820,
    lastUpdated: Date.now() - 7200000,
    registryContract: "0xmoonbeamregistry9876543210fedcba9876543210fedcba98765432",
  },
  {
    parachain: "acala",
    paraId: 2000,
    totalAssets: 650,
    assetsByType: {
      reputation: 250,
      fact_check: 180,
      identity: 120,
      contribution: 100,
    },
    verifiedAssets: 600,
    lastUpdated: Date.now() - 10800000,
    registryContract: "0xacalaregistry11112222333344445555666677778888999900",
  },
];

// ========== Helper Functions ==========

export function getOnChainKnowledgeAsset(ual: string): OnChainKnowledgeAsset | undefined {
  return mockOnChainKnowledgeAssets.find(asset => asset.ual === ual);
}

export function getOnChainAssetsByParachain(parachain: string): OnChainKnowledgeAsset[] {
  return mockOnChainKnowledgeAssets.filter(asset => asset.parachain === parachain);
}

export function getOnChainAssetsByType(assetType: OnChainKnowledgeAsset["assetType"]): OnChainKnowledgeAsset[] {
  return mockOnChainKnowledgeAssets.filter(asset => asset.assetType === assetType);
}

export function getVerifiedOnChainAssets(): OnChainKnowledgeAsset[] {
  return mockOnChainKnowledgeAssets.filter(asset => asset.verification.verified);
}

export function getParachainRegistry(parachain: string): ParachainKnowledgeAssetRegistry | undefined {
  return mockParachainKnowledgeAssetRegistries.find(registry => registry.parachain === parachain);
}

export function getOnChainAssetsWithCrossChainRefs(): OnChainKnowledgeAsset[] {
  return mockOnChainKnowledgeAssets.filter(asset => asset.crossChainReferences.length > 0);
}

export function getOnChainAssetsByStatus(status: OnChainKnowledgeAsset["anchor"]["status"]): OnChainKnowledgeAsset[] {
  return mockOnChainKnowledgeAssets.filter(asset => asset.anchor.status === status);
}

// ========== Statistics Helpers ==========

export function getOnChainKnowledgeAssetStatistics() {
  return {
    totalAssets: mockOnChainKnowledgeAssets.length,
    verifiedAssets: mockOnChainKnowledgeAssets.filter(a => a.verification.verified).length,
    assetsByParachain: mockOnChainKnowledgeAssets.reduce((acc, asset) => {
      acc[asset.parachain] = (acc[asset.parachain] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    assetsByType: mockOnChainKnowledgeAssets.reduce((acc, asset) => {
      acc[asset.assetType] = (acc[asset.assetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalAttestations: mockOnChainKnowledgeAssets.reduce((sum, asset) => sum + asset.verification.attestations.length, 0),
    assetsWithCrossChainRefs: mockOnChainKnowledgeAssets.filter(a => a.crossChainReferences.length > 0).length,
    totalRegistries: mockParachainKnowledgeAssetRegistries.length,
    totalRegisteredAssets: mockParachainKnowledgeAssetRegistries.reduce((sum, reg) => sum + reg.totalAssets, 0),
  };
}

