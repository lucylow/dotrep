/**
 * Example: Enhanced DKG Agent with x402 Payment Integration
 * 
 * Demonstrates how to create and use an AI agent that queries the DKG
 * with autonomous payment capabilities using the x402 protocol.
 * 
 * This example shows:
 * - Setting up an agent with x402 payment support
 * - Querying the DKG with automatic payment handling
 * - Managing query budgets
 * - Accessing premium DKG data via x402 micropayments
 * - Tracking payment evidence for reputation scoring
 */

import { createDKGAIAgent, AgentConfig } from '../dkg-agent-launcher';
import { createDKGAgentQueryEnhancer } from '../dkg-agent-query-enhancer';

async function main() {
  console.log('🚀 Enhanced DKG Agent with x402 Integration Example\n');

  // Step 1: Configure agent with x402 payment support
  const agentConfig: AgentConfig = {
    agentId: 'example-agent-001',
    agentName: 'Reputation Research Agent',
    purpose: 'Query DKG for reputation data and payment evidence',
    capabilities: [
      'reputation_queries',
      'payment_evidence_analysis',
      'autonomous_payments',
      'knowledge_retrieval'
    ],
    dkgConfig: {
      environment: 'testnet',
      endpoint: process.env.DKG_OTNODE_URL || 'https://v6-pegasus-node-02.origin-trail.network:8900',
      useMockMode: process.env.DKG_USE_MOCK === 'true',
      fallbackToMock: true,
    },
    enableDRAG: true,
    enableCollectiveMemory: true,
    enableKnowledgeSharing: true,
    // x402 Payment Configuration
    x402Config: {
      payerAddress: process.env.AGENT_WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
      privateKey: process.env.AGENT_PRIVATE_KEY, // In production, use secure key management
      facilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.x402.org',
      preferredChain: 'base',
      maxPaymentAmount: 50.0, // Maximum $50 per query
      minRecipientReputation: 0.7, // Only pay to trusted sources
      enableNegotiation: true, // Allow price negotiation
      trackPaymentEvidence: true, // Track payments for reputation
    },
  };

  // Step 2: Create and initialize the agent
  console.log('📦 Creating agent...');
  const agent = createDKGAIAgent(agentConfig);
  
  try {
    await agent.initialize();
    console.log('✅ Agent initialized successfully\n');

    // Step 3: Query DKG with automatic payment handling
    console.log('🔍 Example 1: Query reputation data\n');
    const reputationQuery = await agent.processQuery(
      'Find reputation scores for developers with high contribution counts',
      {
        useHybrid: true,
        topK: 10,
        minProvenanceScore: 70,
        requireCitations: true,
        enablePayment: true, // Enable x402 payment
        maxPaymentAmount: 5.0, // Max $5 for this query
      }
    );

    console.log('📊 Query Results:');
    console.log(`   Response: ${reputationQuery.response.substring(0, 200)}...`);
    console.log(`   Confidence: ${(reputationQuery.confidence * 100).toFixed(1)}%`);
    console.log(`   Provenance Score: ${reputationQuery.provenanceScore}/100`);
    console.log(`   Citations: ${reputationQuery.citations.length}`);
    
    if (reputationQuery.paymentInfo) {
      console.log(`\n💰 Payment Information:`);
      console.log(`   Amount Paid: $${reputationQuery.paymentInfo.amountPaid || 'N/A'}`);
      console.log(`   Chain: ${reputationQuery.paymentInfo.chain || 'N/A'}`);
      console.log(`   Transaction: ${reputationQuery.paymentInfo.txHash || 'N/A'}`);
      if (reputationQuery.paymentInfo.paymentUAL) {
        console.log(`   Payment Evidence UAL: ${reputationQuery.paymentInfo.paymentUAL}`);
      }
    }

    // Step 4: Query payment evidence using enhanced query enhancer
    console.log('\n🔍 Example 2: Query payment evidence from DKG\n');
    
    // Get the query enhancer instance
    const queryEnhancer = agent.getQueryEnhancer();
    
    if (queryEnhancer) {
      // Set query budget for cost control
      queryEnhancer.setBudget({
        totalBudget: 100.0, // $100 total budget
        periodMs: 24 * 60 * 60 * 1000, // 24 hour period
        maxQueries: 50, // Maximum 50 queries
      });

      // Query payment evidence
      const paymentQueryResult = await queryEnhancer.queryDKG(
        {
          sparql: `
            PREFIX schema: <https://schema.org/>
            PREFIX dotrep: <https://dotrep.io/ontology/>
            
            SELECT ?paymentUAL ?payer ?recipient ?amount ?currency ?timestamp
            WHERE {
              ?paymentUAL a schema:PaymentChargeSpecification .
              ?paymentUAL schema:price ?amount .
              ?paymentUAL schema:priceCurrency ?currency .
              ?paymentUAL schema:payee ?payerObj .
              ?payerObj schema:id ?payer .
              ?paymentUAL schema:recipient ?recipientObj .
              ?recipientObj schema:id ?recipient .
              ?paymentUAL prov:generatedAtTime ?timestamp .
            }
            ORDER BY DESC(?timestamp)
            LIMIT 20
          `,
          type: 'payment_evidence',
        },
        {
          enablePayment: true,
          maxPaymentAmount: 3.0,
          useCache: true,
          cacheTTL: 10 * 60 * 1000, // 10 minute cache
        }
      );

      console.log(`📊 Payment Evidence Query Results:`);
      console.log(`   Found ${paymentQueryResult.results.length} payments`);
      console.log(`   Provenance Score: ${paymentQueryResult.provenanceScore}/100`);
      console.log(`   Cost: $${paymentQueryResult.cost?.actual?.toFixed(4) || '0.0000'}`);
      console.log(`   Execution Time: ${paymentQueryResult.metadata.executionTimeMs}ms`);
      console.log(`   Cached: ${paymentQueryResult.metadata.cached ? 'Yes' : 'No'}`);

      // Display budget status
      const budgetStatus = queryEnhancer.getBudgetStatus();
      if (budgetStatus) {
        console.log(`\n💰 Budget Status:`);
        console.log(`   Total Budget: $${budgetStatus.totalBudget.toFixed(2)}`);
        console.log(`   Spent: $${budgetStatus.spent.toFixed(2)}`);
        console.log(`   Remaining: $${budgetStatus.remaining.toFixed(2)}`);
        console.log(`   Queries: ${budgetStatus.queryCount}/${budgetStatus.maxQueries || 'unlimited'}`);
      }

      // Display analytics
      const analytics = queryEnhancer.getAnalytics();
      console.log(`\n📈 Query Analytics:`);
      console.log(`   Total Queries: ${analytics.totalQueries}`);
      console.log(`   Total Cost: $${analytics.totalCost.toFixed(2)}`);
      console.log(`   Average Cost per Query: $${analytics.avgCostPerQuery.toFixed(4)}`);
      console.log(`   Cache Hit Rate: ${(analytics.cacheHitRate * 100).toFixed(1)}%`);
    }

    // Step 5: Query using DRAG (Decentralized Retrieval Augmented Generation)
    console.log('\n🔍 Example 3: Natural language query with DRAG\n');
    const dragQuery = await agent.processQuery(
      'What are the most trusted developers in the blockchain ecosystem based on their payment history?',
      {
        useHybrid: true,
        topK: 5,
        requireCitations: true,
        enablePayment: true,
        maxPaymentAmount: 2.0,
      }
    );

    console.log(`📊 DRAG Query Results:`);
    console.log(`   Response: ${dragQuery.response.substring(0, 300)}...`);
    console.log(`   Citations: ${dragQuery.citations.length}`);
    console.log(`   Confidence: ${(dragQuery.confidence * 100).toFixed(1)}%`);

    // Step 6: Get agent status including payment information
    console.log('\n📊 Agent Status:\n');
    const status = agent.getStatus();
    console.log(JSON.stringify(status, null, 2));

    console.log('\n✅ Example completed successfully!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // Cleanup
    await agent.shutdown();
  }
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main as runExample };

