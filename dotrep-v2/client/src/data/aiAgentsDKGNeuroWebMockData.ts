/**
 * AI Agents DKG & NeuroWeb Mock Data
 * 
 * Comprehensive mock data demonstrating working AI agents leveraging:
 * - OriginTrail Decentralized Knowledge Graph (DKG)
 * - NeuroWeb Parachain on Polkadot
 * - Agent-Knowledge-Trust three-layer architecture
 * 
 * This mock data showcases:
 * 1. AI agents performing DKG queries
 * 2. Agents publishing reputation assets to DKG
 * 3. NeuroWeb blockchain anchoring verification
 * 4. Agent workflows with verifiable provenance
 * 5. Multi-agent orchestration with DKG integration
 */

// ========== Agent Types ==========

export interface AIAgent {
  agentId: string;
  agentName: string;
  agentType: "navigator" | "detective" | "negotiator" | "optimizer" | "auditor" | "verifier" | "publisher";
  description: string;
  status: "active" | "idle" | "processing";
  capabilities: string[];
  dkgEnabled: boolean;
  neuroWebConnected: boolean;
  totalOperations: number;
  successRate: number;
  lastActivity: number;
}

export interface DKGOperation {
  operationId: string;
  agentId: string;
  operationType: "query" | "publish" | "verify" | "update";
  ual?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  timestamp: number;
  completedAt?: number;
  duration?: number; // milliseconds
  result?: any;
  error?: string;
}

export interface DKGKnowledgeAsset {
  ual: string; // Uniform Asset Locator
  assetType: "reputation" | "contribution" | "profile" | "campaign" | "verification";
  title: string;
  description: string;
  developerId?: string;
  reputationScore?: number;
  publishedBy: string; // Agent ID
  publishedAt: number;
  lastUpdated: number;
  version: number;
  neuroWebAnchor: {
    blockNumber: number;
    transactionHash: string;
    blockHash: string;
    paraId: number; // 2043 for mainnet, 20430 for testnet
    chainId: number;
    anchorTimestamp: number;
  };
  contentHash: string;
  verificationStatus: "verified" | "pending" | "failed";
  linkedAssets?: string[]; // UALs of related assets
  metadata: {
    schema: string;
    format: "json-ld" | "rdf";
    provenance: any;
  };
}

export interface NeuroWebTransaction {
  txHash: string;
  blockNumber: number;
  blockHash: string;
  paraId: number;
  chainId: number;
  from: string;
  to?: string;
  transactionType: "anchor" | "query" | "verification" | "payment";
  timestamp: number;
  status: "pending" | "confirmed" | "failed";
  gasUsed?: number;
  gasPrice?: string;
  relatedUAL?: string;
  agentId?: string;
}

export interface AgentWorkflow {
  workflowId: string;
  workflowName: string;
  description: string;
  agentIds: string[];
  steps: WorkflowStep[];
  status: "running" | "completed" | "failed" | "paused";
  startedAt: number;
  completedAt?: number;
  dkgAssetsCreated: string[]; // UALs
  neuroWebTransactions: string[]; // TX hashes
}

export interface WorkflowStep {
  stepId: string;
  stepName: string;
  agentId: string;
  operationType: string;
  status: "pending" | "running" | "completed" | "failed";
  input?: any;
  output?: any;
  dkgOperationId?: string;
  neuroWebTxHash?: string;
  timestamp: number;
  duration?: number;
}

export interface AgentDKGAction {
  actionId: string;
  agentId: string;
  actionType: "dkg_query" | "dkg_publish" | "dkg_verify" | "neuroweb_anchor" | "neuroweb_verify";
  description: string;
  timestamp: number;
  status: "pending" | "in_progress" | "completed" | "failed";
  input: {
    ual?: string;
    query?: string;
    data?: any;
    developerId?: string;
  };
  output?: {
    result?: any;
    ual?: string;
    txHash?: string;
    blockNumber?: number;
    verificationStatus?: string;
  };
  duration?: number;
  error?: string;
}

// ========== Mock AI Agents ==========

export const mockAIAgents: AIAgent[] = [
  {
    agentId: "agent-dkg-navigator-001",
    agentName: "DKG Navigator Agent",
    agentType: "navigator",
    description: "Intelligent agent that navigates and queries the OriginTrail DKG for reputation data and knowledge assets",
    status: "active",
    capabilities: ["dkg_query", "semantic_search", "asset_discovery", "provenance_tracking"],
    dkgEnabled: true,
    neuroWebConnected: true,
    totalOperations: 1247,
    successRate: 0.96,
    lastActivity: Date.now() - 120000,
  },
  {
    agentId: "agent-dkg-publisher-001",
    agentName: "DKG Publisher Agent",
    agentType: "publisher",
    description: "Agent responsible for publishing reputation assets to the DKG with NeuroWeb blockchain anchoring",
    status: "active",
    capabilities: ["dkg_publish", "jsonld_conversion", "neuroweb_anchoring", "asset_versioning"],
    dkgEnabled: true,
    neuroWebConnected: true,
    totalOperations: 892,
    successRate: 0.94,
    lastActivity: Date.now() - 45000,
  },
  {
    agentId: "agent-dkg-verifier-001",
    agentName: "DKG Verifier Agent",
    agentType: "verifier",
    description: "Verifies the integrity and authenticity of DKG assets using NeuroWeb blockchain proofs",
    status: "active",
    capabilities: ["dkg_verify", "blockchain_verification", "hash_validation", "provenance_check"],
    dkgEnabled: true,
    neuroWebConnected: true,
    totalOperations: 1534,
    successRate: 0.97,
    lastActivity: Date.now() - 30000,
  },
  {
    agentId: "agent-reputation-detective-001",
    agentName: "Reputation Detective Agent",
    agentType: "detective",
    description: "Analyzes reputation patterns and detects anomalies using DKG queries and NeuroWeb verification",
    status: "active",
    capabilities: ["pattern_analysis", "sybil_detection", "reputation_scoring", "dkg_analytics"],
    dkgEnabled: true,
    neuroWebConnected: true,
    totalOperations: 567,
    successRate: 0.91,
    lastActivity: Date.now() - 180000,
  },
  {
    agentId: "agent-workflow-orchestrator-001",
    agentName: "Workflow Orchestrator Agent",
    agentType: "optimizer",
    description: "Coordinates multi-agent workflows involving DKG operations and NeuroWeb transactions",
    status: "active",
    capabilities: ["workflow_orchestration", "agent_coordination", "task_routing", "error_handling"],
    dkgEnabled: true,
    neuroWebConnected: true,
    totalOperations: 234,
    successRate: 0.98,
    lastActivity: Date.now() - 60000,
  },
];

// ========== Mock DKG Knowledge Assets ==========

export const mockDKGKnowledgeAssets: DKGKnowledgeAsset[] = [
  {
    ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
    assetType: "reputation",
    title: "TechGuru Alex - Reputation Profile",
    description: "Comprehensive reputation profile for developer TechGuru Alex with social metrics and contribution history",
    developerId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    reputationScore: 0.89,
    publishedBy: "agent-dkg-publisher-001",
    publishedAt: Date.now() - 86400000,
    lastUpdated: Date.now() - 3600000,
    version: 2,
    neuroWebAnchor: {
      blockNumber: 12567890,
      transactionHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
      blockHash: "0xdef456abc7890123456789012345678901234567890123456789012345678901",
      paraId: 20430,
      chainId: 20430,
      anchorTimestamp: Date.now() - 86400000,
    },
    contentHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    verificationStatus: "verified",
    linkedAssets: [
      "did:dkg:otp:20430:0xcontributions001",
      "did:dkg:otp:20430:0xsocialmetrics001",
    ],
    metadata: {
      schema: "https://schema.org/Person",
      format: "json-ld",
      provenance: {
        createdBy: "agent-dkg-publisher-001",
        source: "on-chain_reputation_system",
        verified: true,
      },
    },
  },
  {
    ual: "did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12",
    assetType: "contribution",
    title: "Cross-Chain Reputation Protocol Contribution",
    description: "Open-source contribution to cross-chain reputation protocol with verified GitHub proof",
    developerId: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    reputationScore: 0.76,
    publishedBy: "agent-dkg-publisher-001",
    publishedAt: Date.now() - 172800000,
    lastUpdated: Date.now() - 7200000,
    version: 1,
    neuroWebAnchor: {
      blockNumber: 12450000,
      transactionHash: "0xdef456abc7890123456789012345678901234567890123456789012345678901",
      blockHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
      paraId: 20430,
      chainId: 20430,
      anchorTimestamp: Date.now() - 172800000,
    },
    contentHash: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    verificationStatus: "verified",
    linkedAssets: [],
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
  {
    ual: "did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432",
    assetType: "profile",
    title: "Blockchain Developer Profile",
    description: "Complete developer profile with expertise, contributions, and reputation metrics",
    developerId: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    reputationScore: 0.92,
    publishedBy: "agent-dkg-publisher-001",
    publishedAt: Date.now() - 259200000,
    lastUpdated: Date.now() - 1800000,
    version: 3,
    neuroWebAnchor: {
      blockNumber: 12344000,
      transactionHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
      blockHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
      paraId: 20430,
      chainId: 20430,
      anchorTimestamp: Date.now() - 259200000,
    },
    contentHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    verificationStatus: "verified",
    linkedAssets: [
      "did:dkg:otp:20430:0xcontributions002",
      "did:dkg:otp:20430:0xendorsements001",
    ],
    metadata: {
      schema: "https://schema.org/ProfilePage",
      format: "json-ld",
      provenance: {
        createdBy: "agent-dkg-publisher-001",
        source: "verified_developer_registry",
        verified: true,
      },
    },
  },
];

// ========== Mock NeuroWeb Transactions ==========

export const mockNeuroWebTransactions: NeuroWebTransaction[] = [
  {
    txHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
    blockNumber: 12567890,
    blockHash: "0xdef456abc7890123456789012345678901234567890123456789012345678901",
    paraId: 20430,
    chainId: 20430,
    from: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    transactionType: "anchor",
    timestamp: Date.now() - 86400000,
    status: "confirmed",
    gasUsed: 125000,
    gasPrice: "1000000000",
    relatedUAL: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
    agentId: "agent-dkg-publisher-001",
  },
  {
    txHash: "0xdef456abc7890123456789012345678901234567890123456789012345678901",
    blockNumber: 12450000,
    blockHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    paraId: 20430,
    chainId: 20430,
    from: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    transactionType: "anchor",
    timestamp: Date.now() - 172800000,
    status: "confirmed",
    gasUsed: 118000,
    gasPrice: "1000000000",
    relatedUAL: "did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12",
    agentId: "agent-dkg-publisher-001",
  },
  {
    txHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    blockNumber: 12344000,
    blockHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    paraId: 20430,
    chainId: 20430,
    from: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    transactionType: "verification",
    timestamp: Date.now() - 259200000,
    status: "confirmed",
    gasUsed: 95000,
    gasPrice: "1000000000",
    relatedUAL: "did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432",
    agentId: "agent-dkg-verifier-001",
  },
  {
    txHash: "0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff",
    blockNumber: 12567950,
    blockHash: "0x2222333344445555666677778888999900001111aaaabbbbccccddddeeeeffff",
    paraId: 20430,
    chainId: 20430,
    from: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    transactionType: "anchor",
    timestamp: Date.now() - 3600000,
    status: "confirmed",
    gasUsed: 132000,
    gasPrice: "1000000000",
    relatedUAL: "did:dkg:otp:20430:0xupdatedreputation001",
    agentId: "agent-dkg-publisher-001",
  },
];

// ========== Mock Agent Workflows ==========

export const mockAgentWorkflows: AgentWorkflow[] = [
  {
    workflowId: "workflow-001",
    workflowName: "Reputation Asset Publishing Workflow",
    description: "Multi-agent workflow to publish a new reputation asset to DKG with NeuroWeb anchoring",
    agentIds: [
      "agent-dkg-publisher-001",
      "agent-dkg-verifier-001",
      "agent-workflow-orchestrator-001",
    ],
    steps: [
      {
        stepId: "step-001",
        stepName: "Prepare JSON-LD Asset",
        agentId: "agent-dkg-publisher-001",
        operationType: "prepare_asset",
        status: "completed",
        input: {
          developerId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
          reputationData: { score: 0.89 },
        },
        output: {
          jsonld: { /* JSON-LD structure */ },
        },
        timestamp: Date.now() - 1800000,
        duration: 450,
      },
      {
        stepId: "step-002",
        stepName: "Publish to DKG",
        agentId: "agent-dkg-publisher-001",
        operationType: "dkg_publish",
        status: "completed",
        input: {
          data: { /* asset data */ },
        },
        output: {
          ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
        },
        dkgOperationId: "op-001",
        timestamp: Date.now() - 1780000,
        duration: 1200,
      },
      {
        stepId: "step-003",
        stepName: "Anchor on NeuroWeb",
        agentId: "agent-dkg-publisher-001",
        operationType: "neuroweb_anchor",
        status: "completed",
        input: {
          ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
          contentHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
        output: {
          txHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
          blockNumber: 12567890,
        },
        neuroWebTxHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
        timestamp: Date.now() - 1770000,
        duration: 3500,
      },
      {
        stepId: "step-004",
        stepName: "Verify Anchor",
        agentId: "agent-dkg-verifier-001",
        operationType: "neuroweb_verify",
        status: "completed",
        input: {
          txHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
          ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
        },
        output: {
          verificationStatus: "verified",
        },
        timestamp: Date.now() - 1760000,
        duration: 850,
      },
    ],
    status: "completed",
    startedAt: Date.now() - 1800000,
    completedAt: Date.now() - 1750000,
    dkgAssetsCreated: ["did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678"],
    neuroWebTransactions: ["0xabc123def4567890123456789012345678901234567890123456789012345678"],
  },
  {
    workflowId: "workflow-002",
    workflowName: "Reputation Query and Verification Workflow",
    description: "Query DKG for reputation data and verify blockchain anchoring",
    agentIds: [
      "agent-dkg-navigator-001",
      "agent-dkg-verifier-001",
      "agent-reputation-detective-001",
    ],
    steps: [
      {
        stepId: "step-005",
        stepName: "Query DKG Asset",
        agentId: "agent-dkg-navigator-001",
        operationType: "dkg_query",
        status: "completed",
        input: {
          ual: "did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432",
        },
        output: {
          result: { /* asset data */ },
        },
        dkgOperationId: "op-002",
        timestamp: Date.now() - 600000,
        duration: 1200,
      },
      {
        stepId: "step-006",
        stepName: "Verify Blockchain Anchor",
        agentId: "agent-dkg-verifier-001",
        operationType: "neuroweb_verify",
        status: "completed",
        input: {
          ual: "did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432",
        },
        output: {
          verificationStatus: "verified",
          blockNumber: 12344000,
        },
        timestamp: Date.now() - 595000,
        duration: 950,
      },
      {
        stepId: "step-007",
        stepName: "Analyze Reputation Patterns",
        agentId: "agent-reputation-detective-001",
        operationType: "pattern_analysis",
        status: "completed",
        input: {
          reputationData: { /* data */ },
        },
        output: {
          analysis: { score: 0.92, risk: "low" },
        },
        timestamp: Date.now() - 590000,
        duration: 2800,
      },
    ],
    status: "completed",
    startedAt: Date.now() - 600000,
    completedAt: Date.now() - 587000,
    dkgAssetsCreated: [],
    neuroWebTransactions: [],
  },
];

// ========== Mock Agent DKG Actions ==========

export const mockAgentDKGActions: AgentDKGAction[] = [
  {
    actionId: "action-001",
    agentId: "agent-dkg-navigator-001",
    actionType: "dkg_query",
    description: "Query reputation profile from DKG",
    timestamp: Date.now() - 300000,
    status: "completed",
    input: {
      ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
      query: "SELECT ?reputation WHERE { ?asset <hasReputation> ?reputation }",
    },
    output: {
      result: {
        reputationScore: 0.89,
        profile: { /* profile data */ },
      },
    },
    duration: 1200,
  },
  {
    actionId: "action-002",
    agentId: "agent-dkg-publisher-001",
    actionType: "dkg_publish",
    description: "Publish reputation asset to DKG",
    timestamp: Date.now() - 1800000,
    status: "completed",
    input: {
      developerId: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      data: { reputationScore: 0.89 },
    },
    output: {
      ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
    },
    duration: 3500,
  },
  {
    actionId: "action-003",
    agentId: "agent-dkg-publisher-001",
    actionType: "neuroweb_anchor",
    description: "Anchor DKG asset content hash on NeuroWeb",
    timestamp: Date.now() - 1770000,
    status: "completed",
    input: {
      ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
      contentHash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    output: {
      txHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
      blockNumber: 12567890,
    },
    duration: 4200,
  },
  {
    actionId: "action-004",
    agentId: "agent-dkg-verifier-001",
    actionType: "dkg_verify",
    description: "Verify DKG asset integrity using NeuroWeb proof",
    timestamp: Date.now() - 600000,
    status: "completed",
    input: {
      ual: "did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432",
    },
    output: {
      verificationStatus: "verified",
      blockNumber: 12344000,
      txHash: "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba",
    },
    duration: 1850,
  },
  {
    actionId: "action-005",
    agentId: "agent-dkg-verifier-001",
    actionType: "neuroweb_verify",
    description: "Verify NeuroWeb transaction for DKG asset",
    timestamp: Date.now() - 240000,
    status: "completed",
    input: {
      txHash: "0xabc123def4567890123456789012345678901234567890123456789012345678",
      ual: "did:dkg:otp:20430:0x1234567890abcdef1234567890abcdef12345678",
    },
    output: {
      verificationStatus: "verified",
      blockNumber: 12567890,
      confirmed: true,
    },
    duration: 950,
  },
];

// ========== Helper Functions ==========

export function getAIAgent(agentId: string): AIAgent | undefined {
  return mockAIAgents.find(agent => agent.agentId === agentId);
}

export function getDKGAsset(ual: string): DKGKnowledgeAsset | undefined {
  return mockDKGKnowledgeAssets.find(asset => asset.ual === ual);
}

export function getNeuroWebTransaction(txHash: string): NeuroWebTransaction | undefined {
  return mockNeuroWebTransactions.find(tx => tx.txHash === txHash);
}

export function getAgentActions(agentId: string): AgentDKGAction[] {
  return mockAgentDKGActions.filter(action => action.agentId === agentId);
}

export function getAgentWorkflow(workflowId: string): AgentWorkflow | undefined {
  return mockAgentWorkflows.find(workflow => workflow.workflowId === workflowId);
}

export function getActiveAgentWorkflows(): AgentWorkflow[] {
  return mockAgentWorkflows.filter(workflow => workflow.status === "running");
}

export function getRecentDKGActions(limit: number = 10): AgentDKGAction[] {
  return mockAgentDKGActions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getNeuroWebTransactionsForUAL(ual: string): NeuroWebTransaction[] {
  return mockNeuroWebTransactions.filter(tx => tx.relatedUAL === ual);
}

export function getDKGAssetsByType(assetType: DKGKnowledgeAsset["assetType"]): DKGKnowledgeAsset[] {
  return mockDKGKnowledgeAssets.filter(asset => asset.assetType === assetType);
}

export function getVerifiedDKGAssets(): DKGKnowledgeAsset[] {
  return mockDKGKnowledgeAssets.filter(asset => asset.verificationStatus === "verified");
}

// ========== Statistics Helpers ==========

export function getAgentStatistics() {
  return {
    totalAgents: mockAIAgents.length,
    activeAgents: mockAIAgents.filter(a => a.status === "active").length,
    totalOperations: mockAIAgents.reduce((sum, agent) => sum + agent.totalOperations, 0),
    averageSuccessRate: mockAIAgents.reduce((sum, agent) => sum + agent.successRate, 0) / mockAIAgents.length,
    dkgEnabledAgents: mockAIAgents.filter(a => a.dkgEnabled).length,
    neuroWebConnectedAgents: mockAIAgents.filter(a => a.neuroWebConnected).length,
  };
}

export function getDKGStatistics() {
  return {
    totalAssets: mockDKGKnowledgeAssets.length,
    verifiedAssets: mockDKGKnowledgeAssets.filter(a => a.verificationStatus === "verified").length,
    assetsByType: mockDKGKnowledgeAssets.reduce((acc, asset) => {
      acc[asset.assetType] = (acc[asset.assetType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalNeuroWebAnchors: mockNeuroWebTransactions.filter(tx => tx.transactionType === "anchor").length,
  };
}

export function getWorkflowStatistics() {
  return {
    totalWorkflows: mockAgentWorkflows.length,
    completedWorkflows: mockAgentWorkflows.filter(w => w.status === "completed").length,
    runningWorkflows: mockAgentWorkflows.filter(w => w.status === "running").length,
    totalDKGAssetsCreated: mockAgentWorkflows.reduce((sum, w) => sum + w.dkgAssetsCreated.length, 0),
    totalNeuroWebTransactions: mockAgentWorkflows.reduce((sum, w) => sum + w.neuroWebTransactions.length, 0),
  };
}
