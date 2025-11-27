/**
 * Misinformation Detection Mock Data
 * 
 * Comprehensive mock data for detecting and verifying misinformation:
 * - Fact-checking results
 * - Source verification
 * - Content credibility scores
 * - AI agent reasoning workflows for misinformation detection
 * - Cross-chain verification of claims
 * - DKG-based knowledge verification
 */

export interface MisinformationClaim {
  claimId: string;
  claimText: string;
  claimType: "factual" | "statistical" | "scientific" | "historical" | "financial" | "technical";
  source: string;
  sourceType: "social_media" | "news_article" | "blog_post" | "academic_paper" | "official_statement";
  timestamp: number;
  detectedBy?: string; // Agent ID
  verificationStatus: "unverified" | "verifying" | "verified_true" | "verified_false" | "partially_true" | "misleading";
  credibilityScore: number; // 0-1
  riskLevel: "low" | "medium" | "high" | "critical";
}

export interface FactCheckResult {
  factCheckId: string;
  claimId: string;
  claimText: string;
  verdict: "true" | "false" | "partially_true" | "misleading" | "unverifiable";
  confidence: number; // 0-1
  factChecker: string; // Agent ID or human fact-checker
  checkedAt: number;
  sources: VerificationSource[];
  reasoning: string;
  evidence: Evidence[];
  crossChainVerification?: {
    verified: boolean;
    chains: string[];
    verificationMethod: "dkg_query" | "on_chain_attestation" | "xcm_message";
  };
}

export interface VerificationSource {
  sourceId: string;
  sourceName: string;
  sourceType: "dkg_asset" | "on_chain_data" | "academic_paper" | "official_document" | "expert_opinion";
  sourceUrl?: string;
  ual?: string; // DKG UAL if applicable
  credibility: number; // 0-1
  relevance: number; // 0-1
  timestamp: number;
  chain?: string; // If on-chain
  txHash?: string; // If on-chain
}

export interface Evidence {
  evidenceId: string;
  evidenceType: "data" | "quote" | "statistic" | "document" | "expert_statement";
  content: string;
  source: VerificationSource;
  supportsClaim: boolean;
  strength: number; // 0-1
}

export interface MisinformationDetectionWorkflow {
  workflowId: string;
  claimId: string;
  status: "running" | "completed" | "failed";
  startedAt: number;
  completedAt?: number;
  steps: DetectionStep[];
  agents: string[]; // Agent IDs involved
  finalVerdict?: "true" | "false" | "partially_true" | "misleading" | "unverifiable";
  confidence?: number;
  dkgQueries: string[]; // UALs queried
  crossChainVerifications: string[]; // Transaction hashes
}

export interface DetectionStep {
  stepId: string;
  stepName: string;
  agentId: string;
  operationType: "dkg_query" | "source_verification" | "fact_check" | "cross_chain_verify" | "reasoning";
  status: "pending" | "running" | "completed" | "failed";
  input?: any;
  output?: any;
  reasoning?: string;
  timestamp: number;
  duration?: number;
}

export interface ContentCredibilityScore {
  contentId: string;
  contentUrl?: string;
  contentHash?: string;
  credibilityScore: number; // 0-1
  factors: {
    sourceReputation: number;
    factCheckResults: number;
    crossChainVerification: number;
    expertEndorsements: number;
    communityConsensus: number;
  };
  riskIndicators: {
    hasMisinformation: boolean;
    riskLevel: "low" | "medium" | "high" | "critical";
    flaggedClaims: string[]; // Claim IDs
  };
  lastUpdated: number;
  verifiedBy: string[]; // Agent IDs
}

export interface AIAgentReasoning {
  reasoningId: string;
  agentId: string;
  claimId: string;
  reasoningType: "factual_analysis" | "source_verification" | "logical_inference" | "pattern_detection";
  reasoningSteps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  timestamp: number;
  dkgSources: string[]; // UALs used
  crossChainData: {
    chain: string;
    dataType: string;
    verified: boolean;
  }[];
}

export interface ReasoningStep {
  stepNumber: number;
  description: string;
  input: any;
  output: any;
  confidence: number;
  sources?: string[]; // UALs or references
}

// ========== Mock Misinformation Claims ==========

export const mockMisinformationClaims: MisinformationClaim[] = [
  {
    claimId: "claim-001",
    claimText: "Polkadot has processed over 1 billion transactions in 2024",
    claimType: "statistical",
    source: "https://example.com/news/polkadot-stats",
    sourceType: "news_article",
    timestamp: Date.now() - 86400000,
    detectedBy: "agent-misinformation-detector-001",
    verificationStatus: "verifying",
    credibilityScore: 0.65,
    riskLevel: "medium",
  },
  {
    claimId: "claim-002",
    claimText: "OriginTrail DKG can store unlimited knowledge assets without cost",
    claimType: "factual",
    source: "https://example.com/blog/dkg-unlimited",
    sourceType: "blog_post",
    timestamp: Date.now() - 172800000,
    detectedBy: "agent-misinformation-detector-001",
    verificationStatus: "verified_false",
    credibilityScore: 0.25,
    riskLevel: "high",
  },
  {
    claimId: "claim-003",
    claimText: "NeuroWeb parachain supports EVM-compatible smart contracts",
    claimType: "technical",
    source: "https://example.com/docs/neuroweb",
    sourceType: "official_statement",
    timestamp: Date.now() - 259200000,
    detectedBy: "agent-misinformation-detector-001",
    verificationStatus: "verified_true",
    credibilityScore: 0.95,
    riskLevel: "low",
  },
  {
    claimId: "claim-004",
    claimText: "XCM messages are free to send between parachains",
    claimType: "factual",
    source: "https://example.com/social/tweet-12345",
    sourceType: "social_media",
    timestamp: Date.now() - 432000000,
    detectedBy: "agent-misinformation-detector-001",
    verificationStatus: "verified_false",
    credibilityScore: 0.30,
    riskLevel: "high",
  },
  {
    claimId: "claim-005",
    claimText: "Reputation scores on DotRep are calculated using machine learning algorithms",
    claimType: "technical",
    source: "https://example.com/academic/reputation-ml",
    sourceType: "academic_paper",
    timestamp: Date.now() - 604800000,
    detectedBy: "agent-misinformation-detector-001",
    verificationStatus: "partially_true",
    credibilityScore: 0.70,
    riskLevel: "medium",
  },
];

// ========== Mock Fact Check Results ==========

export const mockFactCheckResults: FactCheckResult[] = [
  {
    factCheckId: "factcheck-001",
    claimId: "claim-002",
    claimText: "OriginTrail DKG can store unlimited knowledge assets without cost",
    verdict: "false",
    confidence: 0.92,
    factChecker: "agent-fact-checker-001",
    checkedAt: Date.now() - 172000000,
    sources: [
      {
        sourceId: "source-001",
        sourceName: "OriginTrail DKG Documentation",
        sourceType: "official_document",
        sourceUrl: "https://docs.origintrail.io/dkg/costs",
        credibility: 0.95,
        relevance: 0.98,
        timestamp: Date.now() - 259200000,
      },
      {
        sourceId: "source-002",
        sourceName: "DKG Pricing Knowledge Asset",
        sourceType: "dkg_asset",
        ual: "did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678",
        credibility: 0.90,
        relevance: 0.95,
        timestamp: Date.now() - 172800000,
      },
    ],
    reasoning: "The claim is false. OriginTrail DKG requires TRAC tokens for anchoring knowledge assets on-chain. Storage costs are determined by the blockchain network (NeuroWeb) and are not unlimited. The official documentation clearly states pricing structures.",
    evidence: [
      {
        evidenceId: "evidence-001",
        evidenceType: "document",
        content: "DKG requires TRAC tokens for anchoring. Storage costs vary based on network fees.",
        source: {
          sourceId: "source-001",
          sourceName: "OriginTrail DKG Documentation",
          sourceType: "official_document",
          credibility: 0.95,
          relevance: 0.98,
          timestamp: Date.now() - 259200000,
        },
        supportsClaim: false,
        strength: 0.95,
      },
    ],
    crossChainVerification: {
      verified: true,
      chains: ["neuroweb", "polkadot"],
      verificationMethod: "dkg_query",
    },
  },
  {
    factCheckId: "factcheck-002",
    claimId: "claim-003",
    claimText: "NeuroWeb parachain supports EVM-compatible smart contracts",
    verdict: "true",
    confidence: 0.98,
    factChecker: "agent-fact-checker-001",
    checkedAt: Date.now() - 258000000,
    sources: [
      {
        sourceId: "source-003",
        sourceName: "NeuroWeb Technical Documentation",
        sourceType: "official_document",
        sourceUrl: "https://docs.neuroweb.io/evm",
        credibility: 0.98,
        relevance: 1.0,
        timestamp: Date.now() - 345600000,
      },
      {
        sourceId: "source-004",
        sourceName: "NeuroWeb EVM Deployment Knowledge Asset",
        sourceType: "dkg_asset",
        ual: "did:dkg:otp:20430:0xevm1234567890abcdef1234567890abcdef12345678",
        credibility: 0.92,
        relevance: 0.95,
        timestamp: Date.now() - 259200000,
        chain: "neuroweb",
        txHash: "0xneurowebevm1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      },
    ],
    reasoning: "The claim is true. NeuroWeb is an EVM-compatible parachain on Polkadot. It supports standard Ethereum smart contracts and tools. This is verified through official documentation and on-chain deployment examples.",
    evidence: [
      {
        evidenceId: "evidence-002",
        evidenceType: "document",
        content: "NeuroWeb supports full EVM compatibility, allowing deployment of Ethereum smart contracts without modification.",
        source: {
          sourceId: "source-003",
          sourceName: "NeuroWeb Technical Documentation",
          sourceType: "official_document",
          credibility: 0.98,
          relevance: 1.0,
          timestamp: Date.now() - 345600000,
        },
        supportsClaim: true,
        strength: 0.98,
      },
    ],
    crossChainVerification: {
      verified: true,
      chains: ["neuroweb", "polkadot"],
      verificationMethod: "on_chain_attestation",
    },
  },
  {
    factCheckId: "factcheck-003",
    claimId: "claim-004",
    claimText: "XCM messages are free to send between parachains",
    verdict: "false",
    confidence: 0.89,
    factChecker: "agent-fact-checker-001",
    checkedAt: Date.now() - 431000000,
    sources: [
      {
        sourceId: "source-005",
        sourceName: "Polkadot XCM Documentation",
        sourceType: "official_document",
        sourceUrl: "https://docs.polkadot.network/docs/learn-xcm",
        credibility: 0.96,
        relevance: 0.97,
        timestamp: Date.now() - 518400000,
      },
      {
        sourceId: "source-006",
        sourceName: "XCM Fee Structure Knowledge Asset",
        sourceType: "dkg_asset",
        ual: "did:dkg:otp:20430:0xxcmfees1234567890abcdef1234567890abcdef12345678",
        credibility: 0.88,
        relevance: 0.92,
        timestamp: Date.now() - 432000000,
      },
    ],
    reasoning: "The claim is false. XCM messages require fees on both the source and destination chains. Fees are paid in the native token of each chain and cover transaction costs and resource usage.",
    evidence: [
      {
        evidenceId: "evidence-003",
        evidenceType: "document",
        content: "XCM messages require fees on both source and destination chains. Fees are determined by each chain's fee structure.",
        source: {
          sourceId: "source-005",
          sourceName: "Polkadot XCM Documentation",
          sourceType: "official_document",
          credibility: 0.96,
          relevance: 0.97,
          timestamp: Date.now() - 518400000,
        },
        supportsClaim: false,
        strength: 0.96,
      },
    ],
    crossChainVerification: {
      verified: true,
      chains: ["polkadot", "neuroweb", "moonbeam"],
      verificationMethod: "xcm_message",
    },
  },
];

// ========== Mock Misinformation Detection Workflows ==========

export const mockMisinformationDetectionWorkflows: MisinformationDetectionWorkflow[] = [
  {
    workflowId: "workflow-misinfo-001",
    claimId: "claim-002",
    status: "completed",
    startedAt: Date.now() - 172800000,
    completedAt: Date.now() - 172000000,
    steps: [
      {
        stepId: "step-misinfo-001",
        stepName: "Query DKG for Pricing Information",
        agentId: "agent-dkg-navigator-001",
        operationType: "dkg_query",
        status: "completed",
        input: {
          query: "SELECT ?pricing WHERE { ?asset <hasPricing> ?pricing }",
          keywords: ["DKG", "pricing", "costs"],
        },
        output: {
          uals: ["did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678"],
          results: [{ pricing: "TRAC tokens required" }],
        },
        reasoning: "Found DKG knowledge asset containing pricing information. Query returned relevant documentation.",
        timestamp: Date.now() - 172700000,
        duration: 1200,
      },
      {
        stepId: "step-misinfo-002",
        stepName: "Verify On-Chain Pricing Data",
        agentId: "agent-dkg-verifier-001",
        operationType: "cross_chain_verify",
        status: "completed",
        input: {
          ual: "did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678",
          chain: "neuroweb",
        },
        output: {
          verified: true,
          blockNumber: 12450000,
          txHash: "0xpricing1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
        },
        reasoning: "Verified pricing information is anchored on NeuroWeb blockchain. Data is tamper-proof.",
        timestamp: Date.now() - 172600000,
        duration: 950,
      },
      {
        stepId: "step-misinfo-003",
        stepName: "Fact Check Against Official Sources",
        agentId: "agent-fact-checker-001",
        operationType: "fact_check",
        status: "completed",
        input: {
          claim: "OriginTrail DKG can store unlimited knowledge assets without cost",
          sources: ["official_documentation", "dkg_asset"],
        },
        output: {
          verdict: "false",
          confidence: 0.92,
          reasoning: "Claim contradicts verified on-chain and official documentation.",
        },
        reasoning: "Cross-referenced claim with official documentation and DKG knowledge asset. Both sources confirm costs are required.",
        timestamp: Date.now() - 172500000,
        duration: 2800,
      },
    ],
    agents: ["agent-dkg-navigator-001", "agent-dkg-verifier-001", "agent-fact-checker-001"],
    finalVerdict: "false",
    confidence: 0.92,
    dkgQueries: ["did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678"],
    crossChainVerifications: ["0xpricing1234567890abcdef1234567890abcdef1234567890abcdef1234567890"],
  },
  {
    workflowId: "workflow-misinfo-002",
    claimId: "claim-003",
    status: "completed",
    startedAt: Date.now() - 259200000,
    completedAt: Date.now() - 258000000,
    steps: [
      {
        stepId: "step-misinfo-004",
        stepName: "Query DKG for EVM Compatibility",
        agentId: "agent-dkg-navigator-001",
        operationType: "dkg_query",
        status: "completed",
        input: {
          query: "SELECT ?evm WHERE { ?asset <hasEVMCompatibility> ?evm }",
          keywords: ["NeuroWeb", "EVM", "smart contracts"],
        },
        output: {
          uals: ["did:dkg:otp:20430:0xevm1234567890abcdef1234567890abcdef12345678"],
          results: [{ evm: "fully_compatible" }],
        },
        reasoning: "Found knowledge asset confirming EVM compatibility.",
        timestamp: Date.now() - 259100000,
        duration: 1100,
      },
      {
        stepId: "step-misinfo-005",
        stepName: "Verify On-Chain Smart Contract Deployment",
        agentId: "agent-dkg-verifier-001",
        operationType: "cross_chain_verify",
        status: "completed",
        input: {
          chain: "neuroweb",
          contractAddress: "0xcontract123",
        },
        output: {
          verified: true,
          deployed: true,
          blockNumber: 12344000,
        },
        reasoning: "Verified EVM compatibility by checking actual smart contract deployments on NeuroWeb.",
        timestamp: Date.now() - 259000000,
        duration: 1800,
      },
      {
        stepId: "step-misinfo-006",
        stepName: "Fact Check with Official Documentation",
        agentId: "agent-fact-checker-001",
        operationType: "fact_check",
        status: "completed",
        input: {
          claim: "NeuroWeb parachain supports EVM-compatible smart contracts",
          sources: ["official_documentation", "on_chain_verification"],
        },
        output: {
          verdict: "true",
          confidence: 0.98,
          reasoning: "Claim verified through multiple sources including on-chain evidence.",
        },
        reasoning: "Claim is true. Verified through DKG knowledge asset, on-chain smart contract deployments, and official documentation.",
        timestamp: Date.now() - 258500000,
        duration: 2500,
      },
    ],
    agents: ["agent-dkg-navigator-001", "agent-dkg-verifier-001", "agent-fact-checker-001"],
    finalVerdict: "true",
    confidence: 0.98,
    dkgQueries: ["did:dkg:otp:20430:0xevm1234567890abcdef1234567890abcdef12345678"],
    crossChainVerifications: ["0xneurowebevm1234567890abcdef1234567890abcdef1234567890abcdef1234567890"],
  },
];

// ========== Mock Content Credibility Scores ==========

export const mockContentCredibilityScores: ContentCredibilityScore[] = [
  {
    contentId: "content-001",
    contentUrl: "https://example.com/news/polkadot-stats",
    contentHash: "0xcontent0011234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    credibilityScore: 0.65,
    factors: {
      sourceReputation: 0.70,
      factCheckResults: 0.60,
      crossChainVerification: 0.65,
      expertEndorsements: 0.55,
      communityConsensus: 0.70,
    },
    riskIndicators: {
      hasMisinformation: true,
      riskLevel: "medium",
      flaggedClaims: ["claim-001"],
    },
    lastUpdated: Date.now() - 86400000,
    verifiedBy: ["agent-misinformation-detector-001", "agent-fact-checker-001"],
  },
  {
    contentId: "content-002",
    contentUrl: "https://example.com/blog/dkg-unlimited",
    contentHash: "0xcontent0029876543210fedcba9876543210fedcba9876543210fedcba9876543210",
    credibilityScore: 0.25,
    factors: {
      sourceReputation: 0.30,
      factCheckResults: 0.20,
      crossChainVerification: 0.25,
      expertEndorsements: 0.15,
      communityConsensus: 0.30,
    },
    riskIndicators: {
      hasMisinformation: true,
      riskLevel: "high",
      flaggedClaims: ["claim-002"],
    },
    lastUpdated: Date.now() - 172800000,
    verifiedBy: ["agent-misinformation-detector-001", "agent-fact-checker-001"],
  },
  {
    contentId: "content-003",
    contentUrl: "https://example.com/docs/neuroweb",
    contentHash: "0xcontent0031111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    credibilityScore: 0.95,
    factors: {
      sourceReputation: 0.98,
      factCheckResults: 0.98,
      crossChainVerification: 0.95,
      expertEndorsements: 0.96,
      communityConsensus: 0.94,
    },
    riskIndicators: {
      hasMisinformation: false,
      riskLevel: "low",
      flaggedClaims: [],
    },
    lastUpdated: Date.now() - 259200000,
    verifiedBy: ["agent-misinformation-detector-001", "agent-fact-checker-001", "agent-dkg-verifier-001"],
  },
];

// ========== Mock AI Agent Reasoning ==========

export const mockAIAgentReasoning: AIAgentReasoning[] = [
  {
    reasoningId: "reasoning-001",
    agentId: "agent-fact-checker-001",
    claimId: "claim-002",
    reasoningType: "factual_analysis",
    reasoningSteps: [
      {
        stepNumber: 1,
        description: "Query DKG for pricing information",
        input: { keywords: ["DKG", "pricing", "costs"] },
        output: { ual: "did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678" },
        confidence: 0.90,
        sources: ["did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678"],
      },
      {
        stepNumber: 2,
        description: "Verify on-chain pricing data",
        input: { ual: "did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678" },
        output: { verified: true, blockNumber: 12450000 },
        confidence: 0.95,
        sources: ["0xpricing1234567890abcdef1234567890abcdef1234567890abcdef1234567890"],
      },
      {
        stepNumber: 3,
        description: "Compare claim with verified data",
        input: { claim: "unlimited storage without cost", verifiedData: "TRAC tokens required" },
        output: { match: false, contradiction: true },
        confidence: 0.92,
      },
    ],
    conclusion: "Claim is false. Verified data contradicts the claim. DKG requires TRAC tokens for anchoring.",
    confidence: 0.92,
    timestamp: Date.now() - 172000000,
    dkgSources: ["did:dkg:otp:20430:0xpricing1234567890abcdef1234567890abcdef12345678"],
    crossChainData: [
      {
        chain: "neuroweb",
        dataType: "pricing_information",
        verified: true,
      },
    ],
  },
];

// ========== Helper Functions ==========

export function getMisinformationClaim(claimId: string): MisinformationClaim | undefined {
  return mockMisinformationClaims.find(claim => claim.claimId === claimId);
}

export function getFactCheckResult(factCheckId: string): FactCheckResult | undefined {
  return mockFactCheckResults.find(result => result.factCheckId === factCheckId);
}

export function getFactCheckByClaim(claimId: string): FactCheckResult | undefined {
  return mockFactCheckResults.find(result => result.claimId === claimId);
}

export function getMisinformationWorkflow(workflowId: string): MisinformationDetectionWorkflow | undefined {
  return mockMisinformationDetectionWorkflows.find(workflow => workflow.workflowId === workflowId);
}

export function getContentCredibilityScore(contentId: string): ContentCredibilityScore | undefined {
  return mockContentCredibilityScores.find(score => score.contentId === contentId);
}

export function getAIAgentReasoning(reasoningId: string): AIAgentReasoning | undefined {
  return mockAIAgentReasoning.find(reasoning => reasoning.reasoningId === reasoningId);
}

export function getHighRiskClaims(): MisinformationClaim[] {
  return mockMisinformationClaims.filter(claim => 
    claim.riskLevel === "high" || claim.riskLevel === "critical"
  );
}

export function getVerifiedFalseClaims(): MisinformationClaim[] {
  return mockMisinformationClaims.filter(claim => claim.verificationStatus === "verified_false");
}

// ========== Statistics Helpers ==========

export function getMisinformationStatistics() {
  return {
    totalClaims: mockMisinformationClaims.length,
    verifiedFalse: mockMisinformationClaims.filter(c => c.verificationStatus === "verified_false").length,
    verifiedTrue: mockMisinformationClaims.filter(c => c.verificationStatus === "verified_true").length,
    highRiskClaims: mockMisinformationClaims.filter(c => c.riskLevel === "high" || c.riskLevel === "critical").length,
    totalFactChecks: mockFactCheckResults.length,
    averageConfidence: mockFactCheckResults.reduce((sum, fc) => sum + fc.confidence, 0) / mockFactCheckResults.length,
    totalWorkflows: mockMisinformationDetectionWorkflows.length,
    completedWorkflows: mockMisinformationDetectionWorkflows.filter(w => w.status === "completed").length,
    averageCredibilityScore: mockContentCredibilityScores.reduce((sum, cs) => sum + cs.credibilityScore, 0) / mockContentCredibilityScores.length,
  };
}

