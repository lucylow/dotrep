/**
 * Cross-Chain Mock Data for Polkadot Parachains
 * 
 * Comprehensive mock data for cross-chain reputation, payments, and data sources:
 * - Polkadot parachain data (NeuroWeb, Moonbeam, Acala, etc.)
 * - XCM (Cross-Consensus Messaging) transactions
 * - Cross-chain reputation queries
 * - Multi-chain identity verification
 * - Cross-chain payment flows
 * - Parachain-specific knowledge assets
 */

export interface CrossChainDataSource {
  sourceId: string;
  chainName: string;
  chainType: "relay" | "parachain" | "solo";
  paraId?: number;
  chainId: number;
  network: "polkadot" | "kusama" | "rococo" | "westend";
  rpcEndpoints: string[];
  nativeToken: string;
  supportedFeatures: string[];
  reputationEnabled: boolean;
  dkgEnabled: boolean;
  xcmEnabled: boolean;
}

export interface XCMTransaction {
  xcmId: string;
  sourceChain: string;
  destinationChain: string;
  messageType: "reputation_query" | "reputation_sync" | "identity_verification" | "payment" | "stake_query";
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: number;
  completedAt?: number;
  sourceTxHash?: string;
  destinationTxHash?: string;
  payload: {
    userId?: string;
    reputationScore?: number;
    identityData?: any;
    paymentAmount?: number;
    paymentCurrency?: string;
    queryType?: string;
    queryParams?: any;
  };
  fees: {
    sourceChainFee: number;
    destinationChainFee: number;
    totalFee: number;
    feeCurrency: string;
  };
  verification: {
    verified: boolean;
    verificationMethod: "xcm_proof" | "merkle_proof" | "state_proof";
    proof?: string;
  };
}

export interface CrossChainReputation {
  userId: string;
  primaryChain: string;
  crossChainScores: {
    chain: string;
    reputationScore: number;
    lastUpdated: number;
    verified: boolean;
    source: "on_chain" | "dkg" | "xcm_query";
    ual?: string;
  }[];
  aggregatedScore: number;
  consistencyScore: number; // 0-1, measures consistency across chains
  verificationStatus: "verified" | "partial" | "unverified";
  lastSynced: number;
}

export interface ParachainKnowledgeAsset {
  ual: string;
  assetType: "reputation" | "identity" | "contribution" | "verification" | "attestation";
  parachain: string;
  paraId: number;
  blockNumber: number;
  transactionHash: string;
  blockHash: string;
  contentHash: string;
  publishedAt: number;
  verified: boolean;
  crossChainReferences: {
    chain: string;
    referenceType: "linked_asset" | "cross_chain_attestation" | "xcm_message";
    referenceId: string;
  }[];
  metadata: {
    schema: string;
    format: "json-ld" | "rdf" | "on-chain";
    provenance: any;
  };
}

export interface CrossChainPayment {
  paymentId: string;
  sourceChain: string;
  destinationChain: string;
  fromAddress: string;
  toAddress: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  timestamp: number;
  completedAt?: number;
  sourceTxHash?: string;
  destinationTxHash?: string;
  xcmMessageId?: string;
  fees: {
    sourceFee: number;
    destinationFee: number;
    xcmFee: number;
    total: number;
  };
  reputationImpact: {
    payerReputation: number;
    recipientReputation: number;
    reputationChange: number;
  };
}

// ========== Mock Cross-Chain Data Sources ==========

export const mockCrossChainDataSources: CrossChainDataSource[] = [
  {
    sourceId: "polkadot-relay",
    chainName: "Polkadot",
    chainType: "relay",
    chainId: 0,
    network: "polkadot",
    rpcEndpoints: [
      "wss://rpc.polkadot.io",
      "wss://polkadot.api.onfinality.io/public-ws"
    ],
    nativeToken: "DOT",
    supportedFeatures: ["governance", "staking", "xcm"],
    reputationEnabled: true,
    dkgEnabled: false,
    xcmEnabled: true,
  },
  {
    sourceId: "neuroweb-parachain",
    chainName: "NeuroWeb (OriginTrail)",
    chainType: "parachain",
    paraId: 2043,
    chainId: 2043,
    network: "polkadot",
    rpcEndpoints: [
      "wss://astrosat-parachain-rpc.origin-trail.network",
      "wss://lofar-testnet.origin-trail.network"
    ],
    nativeToken: "NEURO",
    supportedFeatures: ["dkg", "knowledge_assets", "evm", "xcm"],
    reputationEnabled: true,
    dkgEnabled: true,
    xcmEnabled: true,
  },
  {
    sourceId: "moonbeam-parachain",
    chainName: "Moonbeam",
    chainType: "parachain",
    paraId: 2004,
    chainId: 1284,
    network: "polkadot",
    rpcEndpoints: [
      "wss://wss.api.moonbeam.network",
      "wss://moonbeam.api.onfinality.io/public-ws"
    ],
    nativeToken: "GLMR",
    supportedFeatures: ["evm", "xcm", "smart_contracts"],
    reputationEnabled: true,
    dkgEnabled: false,
    xcmEnabled: true,
  },
  {
    sourceId: "acala-parachain",
    chainName: "Acala",
    chainType: "parachain",
    paraId: 2000,
    chainId: 2000,
    network: "polkadot",
    rpcEndpoints: [
      "wss://acala-polkadot.api.onfinality.io/public-ws",
      "wss://acala-rpc.dwellir.com"
    ],
    nativeToken: "ACA",
    supportedFeatures: ["defi", "stablecoins", "xcm"],
    reputationEnabled: true,
    dkgEnabled: false,
    xcmEnabled: true,
  },
  {
    sourceId: "kusama-relay",
    chainName: "Kusama",
    chainType: "relay",
    chainId: 0,
    network: "kusama",
    rpcEndpoints: [
      "wss://kusama-rpc.polkadot.io",
      "wss://kusama.api.onfinality.io/public-ws"
    ],
    nativeToken: "KSM",
    supportedFeatures: ["governance", "staking", "xcm"],
    reputationEnabled: true,
    dkgEnabled: false,
    xcmEnabled: true,
  },
];

// ========== Mock XCM Transactions ==========

export const mockXCMTransactions: XCMTransaction[] = [
  {
    xcmId: "xcm-001",
    sourceChain: "polkadot",
    destinationChain: "neuroweb",
    messageType: "reputation_query",
    status: "completed",
    timestamp: Date.now() - 3600000,
    completedAt: Date.now() - 3590000,
    sourceTxHash: "0xpolkadot1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    destinationTxHash: "0xneuroweb1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    payload: {
      userId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      queryType: "reputation_score",
      queryParams: {
        includeHistory: true,
        includeContributions: true,
      },
    },
    fees: {
      sourceChainFee: 0.01,
      destinationChainFee: 0.005,
      totalFee: 0.015,
      feeCurrency: "DOT",
    },
    verification: {
      verified: true,
      verificationMethod: "xcm_proof",
      proof: "0xproof1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    },
  },
  {
    xcmId: "xcm-002",
    sourceChain: "neuroweb",
    destinationChain: "moonbeam",
    messageType: "reputation_sync",
    status: "completed",
    timestamp: Date.now() - 7200000,
    completedAt: Date.now() - 7180000,
    sourceTxHash: "0xneuroweb9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    destinationTxHash: "0xmoonbeam9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    payload: {
      userId: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      reputationScore: 0.76,
      identityData: {
        verified: true,
        chains: ["neuroweb", "moonbeam"],
      },
    },
    fees: {
      sourceChainFee: 0.008,
      destinationChainFee: 0.012,
      totalFee: 0.02,
      feeCurrency: "NEURO",
    },
    verification: {
      verified: true,
      verificationMethod: "merkle_proof",
      proof: "0xmerkle9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    },
  },
  {
    xcmId: "xcm-003",
    sourceChain: "moonbeam",
    destinationChain: "acala",
    messageType: "payment",
    status: "completed",
    timestamp: Date.now() - 10800000,
    completedAt: Date.now() - 10750000,
    sourceTxHash: "0xmoonbeam1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    destinationTxHash: "0xacala1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    payload: {
      userId: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      paymentAmount: 100.0,
      paymentCurrency: "USDC",
    },
    fees: {
      sourceChainFee: 0.015,
      destinationChainFee: 0.01,
      totalFee: 0.025,
      feeCurrency: "GLMR",
    },
    verification: {
      verified: true,
      verificationMethod: "state_proof",
      proof: "0xstate1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    },
  },
  {
    xcmId: "xcm-004",
    sourceChain: "polkadot",
    destinationChain: "neuroweb",
    messageType: "identity_verification",
    status: "in_progress",
    timestamp: Date.now() - 300000,
    payload: {
      userId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      identityData: {
        nftIdentity: {
          tokenId: "12345",
          contractAddress: "0xcontract123",
          verified: true,
        },
      },
    },
    fees: {
      sourceChainFee: 0.01,
      destinationChainFee: 0.005,
      totalFee: 0.015,
      feeCurrency: "DOT",
    },
    verification: {
      verified: false,
      verificationMethod: "xcm_proof",
    },
  },
];

// ========== Mock Cross-Chain Reputation ==========

export const mockCrossChainReputation: CrossChainReputation[] = [
  {
    userId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    primaryChain: "polkadot",
    crossChainScores: [
      {
        chain: "polkadot",
        reputationScore: 0.89,
        lastUpdated: Date.now() - 3600000,
        verified: true,
        source: "on_chain",
      },
      {
        chain: "neuroweb",
        reputationScore: 0.87,
        lastUpdated: Date.now() - 7200000,
        verified: true,
        source: "dkg",
        ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
      },
      {
        chain: "moonbeam",
        reputationScore: 0.88,
        lastUpdated: Date.now() - 10800000,
        verified: true,
        source: "xcm_query",
      },
      {
        chain: "acala",
        reputationScore: 0.86,
        lastUpdated: Date.now() - 14400000,
        verified: true,
        source: "on_chain",
      },
    ],
    aggregatedScore: 0.875,
    consistencyScore: 0.95,
    verificationStatus: "verified",
    lastSynced: Date.now() - 3600000,
  },
  {
    userId: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    primaryChain: "neuroweb",
    crossChainScores: [
      {
        chain: "neuroweb",
        reputationScore: 0.76,
        lastUpdated: Date.now() - 7200000,
        verified: true,
        source: "dkg",
        ual: "did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12",
      },
      {
        chain: "moonbeam",
        reputationScore: 0.74,
        lastUpdated: Date.now() - 10800000,
        verified: true,
        source: "xcm_query",
      },
      {
        chain: "polkadot",
        reputationScore: 0.75,
        lastUpdated: Date.now() - 18000000,
        verified: true,
        source: "on_chain",
      },
    ],
    aggregatedScore: 0.75,
    consistencyScore: 0.88,
    verificationStatus: "verified",
    lastSynced: Date.now() - 7200000,
  },
  {
    userId: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    primaryChain: "moonbeam",
    crossChainScores: [
      {
        chain: "moonbeam",
        reputationScore: 0.92,
        lastUpdated: Date.now() - 1800000,
        verified: true,
        source: "on_chain",
      },
      {
        chain: "acala",
        reputationScore: 0.90,
        lastUpdated: Date.now() - 3600000,
        verified: true,
        source: "xcm_query",
      },
      {
        chain: "polkadot",
        reputationScore: 0.91,
        lastUpdated: Date.now() - 7200000,
        verified: true,
        source: "on_chain",
      },
    ],
    aggregatedScore: 0.91,
    consistencyScore: 0.97,
    verificationStatus: "verified",
    lastSynced: Date.now() - 1800000,
  },
];

// ========== Mock Parachain Knowledge Assets ==========

export const mockParachainKnowledgeAssets: ParachainKnowledgeAsset[] = [
  {
    ual: "did:dkg:otp:2043:0xpolkadot1234567890abcdef1234567890abcdef12345678",
    assetType: "reputation",
    parachain: "neuroweb",
    paraId: 2043,
    blockNumber: 12567890,
    transactionHash: "0xneuroweb1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    blockHash: "0xblock1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    contentHash: "0xcontent1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    publishedAt: Date.now() - 86400000,
    verified: true,
    crossChainReferences: [
      {
        chain: "polkadot",
        referenceType: "linked_asset",
        referenceId: "0xpolkadot1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
      {
        chain: "moonbeam",
        referenceType: "cross_chain_attestation",
        referenceId: "0xmoonbeam1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
    ],
    metadata: {
      schema: "https://schema.org/Person",
      format: "json-ld",
      provenance: {
        createdBy: "agent-dkg-publisher-001",
        source: "cross_chain_reputation_system",
        verified: true,
      },
    },
  },
  {
    ual: "did:dkg:otp:2043:0xidentity9876543210fedcba9876543210fedcba98765432",
    assetType: "identity",
    parachain: "neuroweb",
    paraId: 2043,
    blockNumber: 12450000,
    transactionHash: "0xidentity9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    blockHash: "0xblock9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    contentHash: "0xcontent9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    publishedAt: Date.now() - 172800000,
    verified: true,
    crossChainReferences: [
      {
        chain: "polkadot",
        referenceType: "xcm_message",
        referenceId: "xcm-001",
      },
    ],
    metadata: {
      schema: "https://schema.org/Person",
      format: "json-ld",
      provenance: {
        createdBy: "agent-dkg-publisher-001",
        source: "cross_chain_identity_verification",
        verified: true,
      },
    },
  },
  {
    ual: "did:dkg:otp:2043:0xcontribution11112222333344445555666677778888999900",
    assetType: "contribution",
    parachain: "neuroweb",
    paraId: 2043,
    blockNumber: 12344000,
    transactionHash: "0xcontribution1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    blockHash: "0xblock1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    contentHash: "0xcontent1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    publishedAt: Date.now() - 259200000,
    verified: true,
    crossChainReferences: [
      {
        chain: "moonbeam",
        referenceType: "linked_asset",
        referenceId: "0xmoonbeam1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      },
    ],
    metadata: {
      schema: "https://schema.org/CreativeWork",
      format: "json-ld",
      provenance: {
        createdBy: "agent-dkg-publisher-001",
        source: "github_contribution",
        verified: true,
      },
    },
  },
];

// ========== Mock Cross-Chain Payments ==========

export const mockCrossChainPayments: CrossChainPayment[] = [
  {
    paymentId: "payment-xcm-001",
    sourceChain: "polkadot",
    destinationChain: "neuroweb",
    fromAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    toAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    amount: 100.0,
    currency: "DOT",
    status: "completed",
    timestamp: Date.now() - 3600000,
    completedAt: Date.now() - 3590000,
    sourceTxHash: "0xpolkadotpayment1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    destinationTxHash: "0xneurowebpayment1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    xcmMessageId: "xcm-001",
    fees: {
      sourceFee: 0.01,
      destinationFee: 0.005,
      xcmFee: 0.002,
      total: 0.017,
    },
    reputationImpact: {
      payerReputation: 0.89,
      recipientReputation: 0.76,
      reputationChange: 0.01,
    },
  },
  {
    paymentId: "payment-xcm-002",
    sourceChain: "moonbeam",
    destinationChain: "acala",
    fromAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    toAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    amount: 250.0,
    currency: "USDC",
    status: "completed",
    timestamp: Date.now() - 7200000,
    completedAt: Date.now() - 7180000,
    sourceTxHash: "0xmoonbeampayment9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    destinationTxHash: "0xacalapayment9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    xcmMessageId: "xcm-003",
    fees: {
      sourceFee: 0.015,
      destinationFee: 0.01,
      xcmFee: 0.003,
      total: 0.028,
    },
    reputationImpact: {
      payerReputation: 0.92,
      recipientReputation: 0.89,
      reputationChange: 0.015,
    },
  },
  {
    paymentId: "payment-xcm-003",
    sourceChain: "neuroweb",
    destinationChain: "moonbeam",
    fromAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    toAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    amount: 50.0,
    currency: "NEURO",
    status: "processing",
    timestamp: Date.now() - 300000,
    fees: {
      sourceFee: 0.008,
      destinationFee: 0.012,
      xcmFee: 0.002,
      total: 0.022,
    },
    reputationImpact: {
      payerReputation: 0.76,
      recipientReputation: 0.92,
      reputationChange: 0.005,
    },
  },
];

// ========== Helper Functions ==========

export function getCrossChainDataSource(chainName: string): CrossChainDataSource | undefined {
  return mockCrossChainDataSources.find(source => source.chainName === chainName);
}

export function getXCMTransaction(xcmId: string): XCMTransaction | undefined {
  return mockXCMTransactions.find(tx => tx.xcmId === xcmId);
}

export function getCrossChainReputation(userId: string): CrossChainReputation | undefined {
  return mockCrossChainReputation.find(rep => rep.userId === userId);
}

export function getParachainKnowledgeAsset(ual: string): ParachainKnowledgeAsset | undefined {
  return mockParachainKnowledgeAssets.find(asset => asset.ual === ual);
}

export function getCrossChainPayment(paymentId: string): CrossChainPayment | undefined {
  return mockCrossChainPayments.find(payment => payment.paymentId === paymentId);
}

export function getXCMTransactionsByChain(chainName: string): XCMTransaction[] {
  return mockXCMTransactions.filter(tx => 
    tx.sourceChain === chainName || tx.destinationChain === chainName
  );
}

export function getParachainAssetsByChain(parachain: string): ParachainKnowledgeAsset[] {
  return mockParachainKnowledgeAssets.filter(asset => asset.parachain === parachain);
}

export function getCrossChainPaymentsByChain(chainName: string): CrossChainPayment[] {
  return mockCrossChainPayments.filter(payment => 
    payment.sourceChain === chainName || payment.destinationChain === chainName
  );
}

// ========== Statistics Helpers ==========

export function getCrossChainStatistics() {
  return {
    totalDataSources: mockCrossChainDataSources.length,
    parachains: mockCrossChainDataSources.filter(s => s.chainType === "parachain").length,
    totalXCMTransactions: mockXCMTransactions.length,
    completedXCMTransactions: mockXCMTransactions.filter(tx => tx.status === "completed").length,
    totalCrossChainReputations: mockCrossChainReputation.length,
    verifiedReputations: mockCrossChainReputation.filter(rep => rep.verificationStatus === "verified").length,
    totalParachainAssets: mockParachainKnowledgeAssets.length,
    verifiedAssets: mockParachainKnowledgeAssets.filter(asset => asset.verified).length,
    totalCrossChainPayments: mockCrossChainPayments.length,
    completedPayments: mockCrossChainPayments.filter(p => p.status === "completed").length,
  };
}

