/**
 * Autonomous Payment Demo
 * 
 * Demonstrates the autonomous payment decision system in action.
 * Shows how chatbots can autonomously decide to pay for premium data.
 */

import {
  AutonomousPaymentDecisionEngine,
  AutonomousBudgetManager,
  AutonomousPaymentOrchestrator,
  type UserContext
} from './autonomousPaymentDecisionEngine';
import { AutonomousPaymentAgent } from './autonomousPaymentAgent';
import { AutonomousChatbot } from './autonomousChatbotIntegration';

/**
 * Demo: Autonomous Payment Scenarios
 */
export async function demoAutonomousPayments() {
  console.log('\n=== DEMO: Autonomous x402 Payments ===\n');

  // Initialize components
  const budgetManager = new AutonomousBudgetManager({
    dailyBudget: 10.0,
    perQueryBudget: 2.0,
    monthlyBudget: 300.0
  });

  const decisionEngine = new AutonomousPaymentDecisionEngine({
    daily: 10.0,
    perQuery: 2.0,
    monthly: 300.0
  });

  const paymentAgent = new AutonomousPaymentAgent({
    agentId: 'demo-agent',
    payerAddress: '0x1234567890123456789012345678901234567890',
    maxPaymentAmount: '2.0'
  });

  const orchestrator = new AutonomousPaymentOrchestrator({
    decisionEngine,
    budgetManager,
    paymentAgent
  });

  // Scenario 1: Complex query justifying payment
  console.log('1. COMPLEX QUERY (Investment Analysis)');
  console.log('Query: "Analyze TechInnovate\'s market position and give investment recommendations"');
  
  const userContext1: UserContext = {
    userId: 'did:dkg:user:premium_trader',
    userDid: 'did:dkg:user:premium_trader',
    trustLevel: 0.9,
    reputationScore: 850
  };

  const result1 = await orchestrator.processQueryWithAutonomousPayment(
    "Analyze TechInnovate's market position and give investment recommendations",
    userContext1
  );

  console.log(`Decision: ${result1.decision?.shouldPay ? 'PAY' : 'DON\'T PAY'}`);
  console.log(`Rationale: ${result1.decision?.rationale}`);
  if (result1.sources) {
    console.log(`Data Sources Used: ${result1.sources.map(s => s.name).join(', ')}`);
  }
  console.log(`Total Spent: $${result1.amountPaid?.toFixed(2) || '0.00'}`);
  console.log(`Budget Remaining: $${budgetManager.getBudgetStatus().daily.remaining.toFixed(2)}`);
  console.log('');

  // Scenario 2: Simple query - no payment
  console.log('2. SIMPLE QUERY (Basic Info)');
  console.log('Query: "What is the current time?"');
  
  const userContext2: UserContext = {
    userId: 'did:dkg:user:basic_user',
    userDid: 'did:dkg:user:basic_user',
    trustLevel: 0.5,
    reputationScore: 600
  };

  const result2 = await orchestrator.processQueryWithAutonomousPayment(
    'What is the current time?',
    userContext2
  );

  console.log(`Decision: ${result2.decision?.shouldPay ? 'PAY' : 'DON\'T PAY'}`);
  console.log(`Rationale: ${result2.decision?.rationale}`);
  console.log(`Total Spent: $${result2.amountPaid?.toFixed(2) || '0.00'}`);
  console.log('');

  // Scenario 3: Financial query with real-time data needs
  console.log('3. FINANCIAL QUERY (Real-time Data)');
  console.log('Query: "Should I invest in TechInnovate? Analyze their Q4 prospects and competitor positioning."');
  
  const userContext3: UserContext = {
    userId: 'did:dkg:user:financial_analyst',
    userDid: 'did:dkg:user:financial_analyst',
    trustLevel: 0.85,
    reputationScore: 920
  };

  const result3 = await orchestrator.processQueryWithAutonomousPayment(
    'Should I invest in TechInnovate? Analyze their Q4 prospects and competitor positioning.',
    userContext3
  );

  console.log(`Decision: ${result3.decision?.shouldPay ? 'PAY' : 'DON\'T PAY'}`);
  console.log(`Rationale: ${result3.decision?.rationale}`);
  if (result3.sources) {
    console.log(`Data Sources Used: ${result3.sources.map(s => s.name).join(', ')}`);
    console.log(`Cost per Source: ${result3.sources.map(s => `$${s.cost.toFixed(2)}`).join(', ')}`);
  }
  console.log(`Total Spent: $${result3.amountPaid?.toFixed(2) || '0.00'}`);
  console.log(`Budget Remaining: $${budgetManager.getBudgetStatus().daily.remaining.toFixed(2)}`);
  console.log('');

  // Show budget summary
  console.log('=== BUDGET SUMMARY ===');
  const budgetStatus = budgetManager.getBudgetStatus();
  console.log(`Daily Budget: $${budgetStatus.daily.limit.toFixed(2)}`);
  console.log(`Spent Today: $${budgetStatus.daily.spent.toFixed(2)}`);
  console.log(`Remaining: $${budgetStatus.daily.remaining.toFixed(2)}`);
  if (budgetStatus.monthly) {
    console.log(`Monthly Budget: $${budgetStatus.monthly.limit.toFixed(2)}`);
    console.log(`Spent This Month: $${budgetStatus.monthly.spent.toFixed(2)}`);
    console.log(`Remaining: $${budgetStatus.monthly.remaining.toFixed(2)}`);
  }
  console.log('');

  // Show spending history
  console.log('=== SPENDING HISTORY ===');
  const history = budgetManager.getSpendingHistory({ limit: 10 });
  history.forEach((record, index) => {
    console.log(`${index + 1}. $${record.amount.toFixed(2)} - ${record.resource} (${new Date(record.timestamp).toLocaleString()})`);
    console.log(`   Rationale: ${record.rationale}`);
  });
}

/**
 * Demo: Autonomous Chatbot with Payment
 */
export async function demoAutonomousChatbot() {
  console.log('\n=== DEMO: Autonomous Chatbot with Payment ===\n');

  // Create autonomous chatbot
  const chatbot = new AutonomousChatbot({
    dailyBudget: 10.0,
    perQueryBudget: 2.0,
    monthlyBudget: 300.0
  });

  // Scenario 1: Investment query
  console.log('User: "Should I invest in TechInnovate? Analyze their Q4 prospects."');
  const response1 = await chatbot.processMessage(
    'Should I invest in TechInnovate? Analyze their Q4 prospects.',
    'user:premium_trader',
    {
      userReputation: 850,
      userTrustLevel: 0.9
    }
  );

  console.log(`\nChatbot Response:\n${response1.response}`);
  if (response1.paymentInfo) {
    console.log(`\nPayment Info:`);
    console.log(`  Amount Paid: $${response1.paymentInfo.amountPaid.toFixed(2)}`);
    console.log(`  Sources: ${response1.paymentInfo.sources.join(', ')}`);
    console.log(`  Rationale: ${response1.paymentInfo.rationale}`);
  }
  console.log(`\nConfidence: ${(response1.confidence * 100).toFixed(0)}%`);
  console.log('');

  // Scenario 2: Simple query
  console.log('User: "What is the current time?"');
  const response2 = await chatbot.processMessage(
    'What is the current time?',
    'user:basic_user',
    {
      userReputation: 600,
      userTrustLevel: 0.5
    }
  );

  console.log(`\nChatbot Response:\n${response2.response}`);
  if (response2.paymentInfo) {
    console.log(`\nPayment Info: Paid $${response2.paymentInfo.amountPaid.toFixed(2)}`);
  } else {
    console.log('\nPayment Info: No payment required - free data sufficient');
  }
  console.log('');

  // Show budget status
  const budgetStatus = chatbot.getBudgetStatus();
  console.log('=== BUDGET STATUS ===');
  console.log(`Daily Remaining: $${budgetStatus.daily.remaining.toFixed(2)}`);
  console.log(`Per-Query Limit: $${budgetStatus.perQuery.limit.toFixed(2)}`);
}

// Export demo runner
export async function runAutonomousPaymentDemos() {
  try {
    await demoAutonomousPayments();
    await demoAutonomousChatbot();
    console.log('\n✅ All demos completed successfully!');
  } catch (error) {
    console.error('❌ Demo failed:', error);
    throw error;
  }
}

