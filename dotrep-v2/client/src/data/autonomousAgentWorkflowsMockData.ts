/**
 * Autonomous AI-Agent Transaction Workflows Mock Data
 * 
 * Comprehensive mock data for autonomous AI agents transacting with reasoning:
 * - Autonomous payment decisions
 * - Agent-to-agent commerce
 * - Reasoning workflows for transactions
 * - Budget management
 * - Reputation-aware decision making
 * - Cross-chain autonomous transactions
 * - x402 protocol payments
 */

export interface AutonomousAgent {
  agentId: string;
  agentName: string;
  agentType: "payment" | "commerce" | "negotiation" | "verification" | "orchestration";
  walletAddress: string;
  status: "active" | "idle" | "processing" | "paused";
  budget: {
    dailyLimit: number;
    monthlyLimit: number;
    perTransactionLimit: number;
    currentDailySpent: number;
    currentMonthlySpent: number;
    currency: string;
  };
  reputation: {
    agentReputation: number; // 0-1
    transactionCount: number;
    successRate: number;
    averageTransactionValue: number;
  };
  capabilities: string[];
  lastActivity: number;
}

export interface AutonomousTransaction {
  transactionId: string;
  agentId: string;
  transactionType: "payment" | "purchase" | "negotiation" | "verification" | "data_purchase";
  status: "pending" | "reasoning" | "approved" | "executing" | "completed" | "rejected" | "failed";
  
  // Transaction details
  details: {
    fromAddress: string;
    toAddress: string;
    amount: number;
    currency: string;
    chain: string;
    service?: string; // Service being purchased
    dataType?: string; // Type of data being purchased
  };
  
  // Reasoning
  reasoning: {
    decision: "approve" | "reject" | "negotiate";
    confidence: number; // 0-1
    reasoningSteps: ReasoningStep[];
    factors: {
      costBenefit: number; // 0-1
      budgetAvailable: boolean;
      recipientReputation: number;
      serviceQuality: number;
      urgency: number;
    };
    reasoningText: string;
  };
  
  // Execution
  execution?: {
    txHash?: string;
    blockNumber?: number;
    executedAt?: number;
    gasUsed?: number;
    gasPrice?: string;
    status: "pending" | "confirmed" | "failed";
  };
  
  // Timestamps
  createdAt: number;
  reasoningCompletedAt?: number;
  executedAt?: number;
  completedAt?: number;
}

export interface ReasoningStep {
  stepNumber: number;
  stepType: "analyze" | "evaluate" | "compare" | "decide" | "verify";
  description: string;
  input: any;
  output: any;
  confidence: number;
  sources?: string[]; // DKG UALs, transaction hashes, etc.
}

export interface AutonomousWorkflow {
  workflowId: string;
  workflowName: string;
  workflowType: "payment_decision" | "service_purchase" | "data_acquisition" | "multi_agent_coordination";
  status: "running" | "completed" | "failed" | "paused";
  
  // Agents involved
  primaryAgent: string;
  involvedAgents: string[];
  
  // Workflow steps
  steps: WorkflowStep[];
  
  // Decision making
  decision: {
    finalDecision: "proceed" | "reject" | "negotiate" | "defer";
    confidence: number;
    reasoning: string;
    totalCost: number;
    expectedBenefit: number;
  };
  
  // Transactions
  transactions: string[]; // Transaction IDs
  
  // Timestamps
  startedAt: number;
  completedAt?: number;
}

export interface WorkflowStep {
  stepId: string;
  stepName: string;
  agentId: string;
  stepType: "reasoning" | "query" | "negotiate" | "execute" | "verify";
  status: "pending" | "running" | "completed" | "failed";
  input?: any;
  output?: any;
  reasoning?: string;
  timestamp: number;
  duration?: number;
}

export interface AgentToAgentCommerce {
  commerceId: string;
  buyerAgent: string;
  sellerAgent: string;
  service: {
    serviceId: string;
    serviceName: string;
    serviceType: "api_access" | "data" | "computation" | "verification" | "custom";
    description: string;
    price: number;
    currency: string;
    quality: number; // 0-1
  };
  negotiation?: {
    initialPrice: number;
    negotiatedPrice: number;
    negotiationRounds: number;
    negotiationHistory: NegotiationRound[];
  };
  transaction: {
    transactionId: string;
    amount: number;
    currency: string;
    chain: string;
    txHash?: string;
    status: "pending" | "completed" | "failed";
  };
  reputation: {
    buyerReputation: number;
    sellerReputation: number;
    trustScore: number;
  };
  timestamp: number;
  completedAt?: number;
}

export interface NegotiationRound {
  roundNumber: number;
  proposer: string; // Agent ID
  proposedPrice: number;
  reasoning: string;
  timestamp: number;
  accepted: boolean;
}

export interface BudgetAllocation {
  allocationId: string;
  agentId: string;
  period: "daily" | "weekly" | "monthly";
  allocatedAmount: number;
  spentAmount: number;
  remainingAmount: number;
  currency: string;
  startDate: number;
  endDate: number;
  transactions: string[]; // Transaction IDs
}

// ========== Mock Autonomous Agents ==========

export const mockAutonomousAgents: AutonomousAgent[] = [
  {
    agentId: "agent-payment-001",
    agentName: "Autonomous Payment Agent",
    agentType: "payment",
    walletAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    status: "active",
    budget: {
      dailyLimit: 100.0,
      monthlyLimit: 3000.0,
      perTransactionLimit: 50.0,
      currentDailySpent: 45.5,
      currentMonthlySpent: 1250.0,
      currency: "USDC",
    },
    reputation: {
      agentReputation: 0.92,
      transactionCount: 1250,
      successRate: 0.96,
      averageTransactionValue: 25.5,
    },
    capabilities: ["x402_payments", "reputation_aware", "budget_management", "cost_benefit_analysis"],
    lastActivity: Date.now() - 120000,
  },
  {
    agentId: "agent-commerce-001",
    agentName: "Agent Commerce Coordinator",
    agentType: "commerce",
    walletAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    status: "active",
    budget: {
      dailyLimit: 200.0,
      monthlyLimit: 6000.0,
      perTransactionLimit: 100.0,
      currentDailySpent: 125.0,
      currentMonthlySpent: 3200.0,
      currency: "USDC",
    },
    reputation: {
      agentReputation: 0.88,
      transactionCount: 890,
      successRate: 0.94,
      averageTransactionValue: 45.0,
    },
    capabilities: ["service_discovery", "negotiation", "multi_agent_coordination", "quality_assessment"],
    lastActivity: Date.now() - 60000,
  },
  {
    agentId: "agent-negotiation-001",
    agentName: "Smart Contract Negotiator",
    agentType: "negotiation",
    walletAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    status: "active",
    budget: {
      dailyLimit: 150.0,
      monthlyLimit: 4500.0,
      perTransactionLimit: 75.0,
      currentDailySpent: 85.0,
      currentMonthlySpent: 2100.0,
      currency: "USDC",
    },
    reputation: {
      agentReputation: 0.95,
      transactionCount: 567,
      successRate: 0.98,
      averageTransactionValue: 60.0,
    },
    capabilities: ["price_negotiation", "contract_generation", "reputation_based_pricing", "multi_round_negotiation"],
    lastActivity: Date.now() - 30000,
  },
];

// ========== Mock Autonomous Transactions ==========

export const mockAutonomousTransactions: AutonomousTransaction[] = [
  {
    transactionId: "tx-autonomous-001",
    agentId: "agent-payment-001",
    transactionType: "data_purchase",
    status: "completed",
    details: {
      fromAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      toAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      amount: 25.0,
      currency: "USDC",
      chain: "base",
      dataType: "reputation_data",
      service: "Premium Reputation API",
    },
    reasoning: {
      decision: "approve",
      confidence: 0.89,
      reasoningSteps: [
        {
          stepNumber: 1,
          stepType: "analyze",
          description: "Analyze query complexity and data needs",
          input: { query: "Get reputation data for user 5GrwvaEF..." },
          output: { complexity: "high", dataGaps: ["reputation_history", "cross_chain_scores"] },
          confidence: 0.85,
        },
        {
          stepNumber: 2,
          stepType: "evaluate",
          description: "Evaluate cost-benefit ratio",
          input: { cost: 25.0, expectedBenefit: 0.8 },
          output: { costBenefitRatio: 0.032, acceptable: true },
          confidence: 0.90,
        },
        {
          stepNumber: 3,
          stepType: "verify",
          description: "Verify recipient reputation",
          input: { recipientAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty" },
          output: { reputation: 0.76, verified: true },
          confidence: 0.92,
          sources: ["did:dkg:otp:20430:0xabcdef1234567890abcdef1234567890abcdef12"],
        },
        {
          stepNumber: 4,
          stepType: "decide",
          description: "Make payment decision",
          input: { allFactors: "positive" },
          output: { decision: "approve", confidence: 0.89 },
          confidence: 0.89,
        },
      ],
      factors: {
        costBenefit: 0.85,
        budgetAvailable: true,
        recipientReputation: 0.76,
        serviceQuality: 0.82,
        urgency: 0.70,
      },
      reasoningText: "Approved: High-value data purchase with good cost-benefit ratio. Recipient has verified reputation. Budget available. Service quality confirmed.",
    },
    execution: {
      txHash: "0xautonomoustx0011234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      blockNumber: 12345678,
      executedAt: Date.now() - 3600000,
      gasUsed: 125000,
      gasPrice: "1000000000",
      status: "confirmed",
    },
    createdAt: Date.now() - 3650000,
    reasoningCompletedAt: Date.now() - 3620000,
    executedAt: Date.now() - 3600000,
    completedAt: Date.now() - 3590000,
  },
  {
    transactionId: "tx-autonomous-002",
    agentId: "agent-payment-001",
    transactionType: "payment",
    status: "rejected",
    details: {
      fromAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      toAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      amount: 75.0,
      currency: "USDC",
      chain: "base",
      service: "Premium API Access",
    },
    reasoning: {
      decision: "reject",
      confidence: 0.82,
      reasoningSteps: [
        {
          stepNumber: 1,
          stepType: "analyze",
          description: "Analyze request and cost",
          input: { request: "Premium API access", cost: 75.0 },
          output: { cost: 75.0, exceedsLimit: true },
          confidence: 0.95,
        },
        {
          stepNumber: 2,
          stepType: "evaluate",
          description: "Check budget constraints",
          input: { requestedAmount: 75.0, perTransactionLimit: 50.0, remainingDaily: 54.5 },
          output: { exceedsPerTransactionLimit: true, budgetAvailable: false },
          confidence: 0.98,
        },
        {
          stepNumber: 3,
          stepType: "decide",
          description: "Make rejection decision",
          input: { exceedsLimits: true },
          output: { decision: "reject", reason: "exceeds_per_transaction_limit" },
          confidence: 0.82,
        },
      ],
      factors: {
        costBenefit: 0.60,
        budgetAvailable: false,
        recipientReputation: 0.95,
        serviceQuality: 0.88,
        urgency: 0.50,
      },
      reasoningText: "Rejected: Transaction amount exceeds per-transaction limit ($50). Requested $75 exceeds configured limit. Budget available but limit constraint violated.",
    },
    createdAt: Date.now() - 1800000,
    reasoningCompletedAt: Date.now() - 1780000,
  },
  {
    transactionId: "tx-autonomous-003",
    agentId: "agent-commerce-001",
    transactionType: "purchase",
    status: "completed",
    details: {
      fromAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      toAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
      amount: 45.0,
      currency: "USDC",
      chain: "base",
      service: "Data Verification Service",
    },
    reasoning: {
      decision: "approve",
      confidence: 0.91,
      reasoningSteps: [
        {
          stepNumber: 1,
          stepType: "analyze",
          description: "Evaluate service quality and seller reputation",
          input: { service: "Data Verification Service", seller: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y" },
          output: { serviceQuality: 0.95, sellerReputation: 0.95, trustScore: 0.95 },
          confidence: 0.93,
          sources: ["did:dkg:otp:20430:0x9876543210fedcba9876543210fedcba98765432"],
        },
        {
          stepNumber: 2,
          stepType: "evaluate",
          description: "Calculate cost-benefit",
          input: { cost: 45.0, value: 0.9 },
          output: { costBenefitRatio: 0.02, excellent: true },
          confidence: 0.90,
        },
        {
          stepNumber: 3,
          stepType: "decide",
          description: "Approve purchase",
          input: { allFactors: "excellent" },
          output: { decision: "approve", confidence: 0.91 },
          confidence: 0.91,
        },
      ],
      factors: {
        costBenefit: 0.92,
        budgetAvailable: true,
        recipientReputation: 0.95,
        serviceQuality: 0.95,
        urgency: 0.80,
      },
      reasoningText: "Approved: High-quality service from highly reputable seller. Excellent cost-benefit ratio. Budget available. Service critical for workflow.",
    },
    execution: {
      txHash: "0xautonomoustx0039876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      blockNumber: 12345680,
      executedAt: Date.now() - 7200000,
      gasUsed: 118000,
      gasPrice: "1000000000",
      status: "confirmed",
    },
    createdAt: Date.now() - 7300000,
    reasoningCompletedAt: Date.now() - 7250000,
    executedAt: Date.now() - 7200000,
    completedAt: Date.now() - 7190000,
  },
];

// ========== Mock Autonomous Workflows ==========

export const mockAutonomousWorkflows: AutonomousWorkflow[] = [
  {
    workflowId: "workflow-autonomous-001",
    workflowName: "Premium Data Acquisition Workflow",
    workflowType: "data_acquisition",
    status: "completed",
    primaryAgent: "agent-payment-001",
    involvedAgents: ["agent-payment-001", "agent-negotiation-001"],
    steps: [
      {
        stepId: "step-auto-001",
        stepName: "Identify Data Need",
        agentId: "agent-payment-001",
        stepType: "reasoning",
        status: "completed",
        input: { query: "Get comprehensive reputation data" },
        output: { dataGaps: ["cross_chain_scores", "historical_data"] },
        reasoning: "Identified need for premium data sources to fill gaps",
        timestamp: Date.now() - 3600000,
        duration: 500,
      },
      {
        stepId: "step-auto-002",
        stepName: "Evaluate Cost-Benefit",
        agentId: "agent-payment-001",
        stepType: "reasoning",
        status: "completed",
        input: { cost: 25.0, benefit: 0.8 },
        output: { approved: true, confidence: 0.89 },
        reasoning: "Cost-benefit analysis positive. Budget available.",
        timestamp: Date.now() - 3595000,
        duration: 800,
      },
      {
        stepId: "step-auto-003",
        stepName: "Execute Payment",
        agentId: "agent-payment-001",
        stepType: "execute",
        status: "completed",
        input: { amount: 25.0, recipient: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty" },
        output: { txHash: "0xautonomoustx0011234567890abcdef1234567890abcdef1234567890abcdef1234567890" },
        timestamp: Date.now() - 3590000,
        duration: 3500,
      },
    ],
    decision: {
      finalDecision: "proceed",
      confidence: 0.89,
      reasoning: "Approved data purchase with good cost-benefit ratio and verified recipient",
      totalCost: 25.0,
      expectedBenefit: 0.8,
    },
    transactions: ["tx-autonomous-001"],
    startedAt: Date.now() - 3600000,
    completedAt: Date.now() - 3585000,
  },
  {
    workflowId: "workflow-autonomous-002",
    workflowName: "Multi-Agent Service Purchase",
    workflowType: "service_purchase",
    status: "completed",
    primaryAgent: "agent-commerce-001",
    involvedAgents: ["agent-commerce-001", "agent-negotiation-001"],
    steps: [
      {
        stepId: "step-auto-004",
        stepName: "Discover Service",
        agentId: "agent-commerce-001",
        stepType: "query",
        status: "completed",
        input: { serviceType: "data_verification" },
        output: { service: "Data Verification Service", seller: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y", price: 50.0 },
        timestamp: Date.now() - 7200000,
        duration: 1200,
      },
      {
        stepId: "step-auto-005",
        stepName: "Negotiate Price",
        agentId: "agent-negotiation-001",
        stepType: "negotiate",
        status: "completed",
        input: { initialPrice: 50.0, targetPrice: 45.0 },
        output: { negotiatedPrice: 45.0, accepted: true },
        reasoning: "Negotiated 10% discount based on reputation and volume",
        timestamp: Date.now() - 7180000,
        duration: 2500,
      },
      {
        stepId: "step-auto-006",
        stepName: "Execute Purchase",
        agentId: "agent-commerce-001",
        stepType: "execute",
        status: "completed",
        input: { amount: 45.0 },
        output: { txHash: "0xautonomoustx0039876543210fedcba9876543210fedcba9876543210fedcba9876543210" },
        timestamp: Date.now() - 7150000,
        duration: 3500,
      },
    ],
    decision: {
      finalDecision: "proceed",
      confidence: 0.91,
      reasoning: "Service purchase approved after successful negotiation. High-quality service from reputable seller.",
      totalCost: 45.0,
      expectedBenefit: 0.9,
    },
    transactions: ["tx-autonomous-003"],
    startedAt: Date.now() - 7200000,
    completedAt: Date.now() - 7145000,
  },
];

// ========== Mock Agent-to-Agent Commerce ==========

export const mockAgentToAgentCommerce: AgentToAgentCommerce[] = [
  {
    commerceId: "commerce-001",
    buyerAgent: "agent-payment-001",
    sellerAgent: "agent-commerce-001",
    service: {
      serviceId: "service-001",
      serviceName: "Premium Reputation Data API",
      serviceType: "api_access",
      description: "Access to premium reputation data with cross-chain scores",
      price: 25.0,
      currency: "USDC",
      quality: 0.82,
    },
    transaction: {
      transactionId: "tx-autonomous-001",
      amount: 25.0,
      currency: "USDC",
      chain: "base",
      txHash: "0xautonomoustx0011234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      status: "completed",
    },
    reputation: {
      buyerReputation: 0.92,
      sellerReputation: 0.88,
      trustScore: 0.90,
    },
    timestamp: Date.now() - 3600000,
    completedAt: Date.now() - 3590000,
  },
  {
    commerceId: "commerce-002",
    buyerAgent: "agent-commerce-001",
    sellerAgent: "agent-negotiation-001",
    service: {
      serviceId: "service-002",
      serviceName: "Data Verification Service",
      serviceType: "verification",
      description: "Automated data verification with DKG integration",
      price: 50.0,
      currency: "USDC",
      quality: 0.95,
    },
    negotiation: {
      initialPrice: 50.0,
      negotiatedPrice: 45.0,
      negotiationRounds: 2,
      negotiationHistory: [
        {
          roundNumber: 1,
          proposer: "agent-negotiation-001",
          proposedPrice: 50.0,
          reasoning: "Standard pricing for verification service",
          timestamp: Date.now() - 7200000,
          accepted: false,
        },
        {
          roundNumber: 2,
          proposer: "agent-commerce-001",
          proposedPrice: 45.0,
          reasoning: "Requesting 10% discount based on reputation and potential volume",
          timestamp: Date.now() - 7185000,
          accepted: true,
        },
      ],
    },
    transaction: {
      transactionId: "tx-autonomous-003",
      amount: 45.0,
      currency: "USDC",
      chain: "base",
      txHash: "0xautonomoustx0039876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      status: "completed",
    },
    reputation: {
      buyerReputation: 0.88,
      sellerReputation: 0.95,
      trustScore: 0.92,
    },
    timestamp: Date.now() - 7200000,
    completedAt: Date.now() - 7145000,
  },
];

// ========== Mock Budget Allocations ==========

export const mockBudgetAllocations: BudgetAllocation[] = [
  {
    allocationId: "budget-001",
    agentId: "agent-payment-001",
    period: "monthly",
    allocatedAmount: 3000.0,
    spentAmount: 1250.0,
    remainingAmount: 1750.0,
    currency: "USDC",
    startDate: Date.now() - 2592000000, // 30 days ago
    endDate: Date.now() + 86400000, // 1 day from now
    transactions: ["tx-autonomous-001", "tx-autonomous-002"],
  },
  {
    allocationId: "budget-002",
    agentId: "agent-commerce-001",
    period: "monthly",
    allocatedAmount: 6000.0,
    spentAmount: 3200.0,
    remainingAmount: 2800.0,
    currency: "USDC",
    startDate: Date.now() - 2592000000,
    endDate: Date.now() + 86400000,
    transactions: ["tx-autonomous-003"],
  },
];

// ========== Helper Functions ==========

export function getAutonomousAgent(agentId: string): AutonomousAgent | undefined {
  return mockAutonomousAgents.find(agent => agent.agentId === agentId);
}

export function getAutonomousTransaction(transactionId: string): AutonomousTransaction | undefined {
  return mockAutonomousTransactions.find(tx => tx.transactionId === transactionId);
}

export function getAutonomousWorkflow(workflowId: string): AutonomousWorkflow | undefined {
  return mockAutonomousWorkflows.find(workflow => workflow.workflowId === workflowId);
}

export function getAgentToAgentCommerce(commerceId: string): AgentToAgentCommerce | undefined {
  return mockAgentToAgentCommerce.find(commerce => commerce.commerceId === commerceId);
}

export function getBudgetAllocation(allocationId: string): BudgetAllocation | undefined {
  return mockBudgetAllocations.find(allocation => allocation.allocationId === allocationId);
}

export function getTransactionsByAgent(agentId: string): AutonomousTransaction[] {
  return mockAutonomousTransactions.filter(tx => tx.agentId === agentId);
}

export function getApprovedTransactions(): AutonomousTransaction[] {
  return mockAutonomousTransactions.filter(tx => tx.reasoning.decision === "approve");
}

export function getRejectedTransactions(): AutonomousTransaction[] {
  return mockAutonomousTransactions.filter(tx => tx.reasoning.decision === "reject");
}

// ========== Statistics Helpers ==========

export function getAutonomousAgentStatistics() {
  return {
    totalAgents: mockAutonomousAgents.length,
    activeAgents: mockAutonomousAgents.filter(a => a.status === "active").length,
    totalTransactions: mockAutonomousTransactions.length,
    approvedTransactions: mockAutonomousTransactions.filter(tx => tx.reasoning.decision === "approve").length,
    rejectedTransactions: mockAutonomousTransactions.filter(tx => tx.reasoning.decision === "reject").length,
    completedTransactions: mockAutonomousTransactions.filter(tx => tx.status === "completed").length,
    totalWorkflows: mockAutonomousWorkflows.length,
    completedWorkflows: mockAutonomousWorkflows.filter(w => w.status === "completed").length,
    totalCommerce: mockAgentToAgentCommerce.length,
    totalBudgetAllocated: mockBudgetAllocations.reduce((sum, b) => sum + b.allocatedAmount, 0),
    totalBudgetSpent: mockBudgetAllocations.reduce((sum, b) => sum + b.spentAmount, 0),
    averageConfidence: mockAutonomousTransactions.reduce((sum, tx) => sum + tx.reasoning.confidence, 0) / mockAutonomousTransactions.length,
  };
}

