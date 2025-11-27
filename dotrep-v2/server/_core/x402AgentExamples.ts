/**
 * x402 Autonomous Agent Examples
 * 
 * Comprehensive examples demonstrating how to use x402 protocol
 * for autonomous agent payments in various scenarios.
 * 
 * Use cases:
 * 1. Pay-per-API access
 * 2. Autonomous content purchases
 * 3. Agent-to-agent marketplace transactions
 * 4. Verified information queries
 * 5. Multi-agent payment coordination
 */

import { createX402AutonomousAgent, type AgentPaymentConfig } from './x402AutonomousAgent';
import { AgentMarketplaceClient } from './x402AgentIntegration';
import { ReputationCalculator } from './reputationCalculator';

/**
 * Example 1: Basic Pay-per-API Access
 * 
 * An agent requests premium API data and automatically pays for it.
 */
export async function examplePayPerAPI() {
  console.log('\n📡 Example 1: Pay-per-API Access\n');

  const agentConfig: AgentPaymentConfig = {
    agentId: 'data-analytics-agent-001',
    payerAddress: '0x1234567890123456789012345678901234567890',
    preferredChain: 'base',
    maxPaymentAmount: 10.0,
    enableNegotiation: true,
  };

  const agent = createX402AutonomousAgent(agentConfig);

  // Request premium reputation data
  const result = await agent.requestResource<{
    users: Array<{
      userId: string;
      reputation: number;
      trustLevel: string;
    }>;
  }>('http://localhost:4000/api/top-reputable-users?category=tech&limit=10');

  if (result.success) {
    console.log('✅ API access granted!');
    console.log(`   Users retrieved: ${result.data?.users.length || 0}`);
    console.log(`   Amount paid: ${result.amountPaid} ${result.chain}`);
    console.log(`   Payment evidence: ${result.paymentEvidence?.ual}`);
  } else {
    console.error('❌ API access failed:', result.error);
  }

  return result;
}

/**
 * Example 2: Autonomous Content Purchase
 * 
 * An agent autonomously purchases premium content based on user request.
 */
export async function exampleContentPurchase() {
  console.log('\n🛒 Example 2: Autonomous Content Purchase\n');

  const agentConfig: AgentPaymentConfig = {
    agentId: 'content-purchasing-agent-001',
    payerAddress: '0x1234567890123456789012345678901234567890',
    preferredChain: 'solana',
    maxPaymentAmount: 50.0,
    minRecipientReputation: 0.7,
    enableNegotiation: true,
  };

  const agent = createX402AutonomousAgent(agentConfig);

  // Purchase premium content
  const result = await agent.requestResource(
    'http://localhost:4000/api/marketplace/purchase',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productUAL: 'urn:ual:dotrep:product:report:marketing-trends-2024',
        buyer: agentConfig.payerAddress,
        paymentMethod: 'x402',
      }),
    }
  );

  if (result.success) {
    console.log('✅ Content purchased successfully!');
    console.log(`   Amount paid: ${result.amountPaid}`);
    console.log(`   Chain: ${result.chain}`);
  } else {
    console.error('❌ Content purchase failed:', result.error);
  }

  return result;
}

/**
 * Example 3: Agent-to-Agent Marketplace Transaction
 * 
 * An agent discovers and purchases services from other agents.
 */
export async function exampleAgentMarketplace() {
  console.log('\n🤝 Example 3: Agent-to-Agent Marketplace\n');

  const reputationCalculator = new ReputationCalculator();

  const agentConfig: AgentPaymentConfig = {
    agentId: 'marketplace-agent-001',
    payerAddress: '0x1234567890123456789012345678901234567890',
    preferredChain: 'base',
    maxPaymentAmount: 100.0,
    minRecipientReputation: 0.8,
    enableNegotiation: true,
  };

  const marketplace = new AgentMarketplaceClient(
    agentConfig,
    reputationCalculator,
    'http://localhost:4000'
  );

  // Discover available services
  console.log('🔍 Discovering available services...');
  const services = await marketplace.discoverServices({
    minSellerReputation: 0.8,
    maxPrice: 50.0,
    limit: 5,
  });

  console.log(`   Found ${services.length} services`);

  if (services.length > 0) {
    const service = services[0];
    console.log(`\n💰 Purchasing service: ${service.service.name}`);
    console.log(`   Seller: ${service.sellerAgentId}`);
    console.log(`   Price: ${service.service.price.amount} ${service.service.price.currency}`);
    console.log(`   Seller reputation: ${(service.sellerReputation * 100).toFixed(1)}%`);

    // Purchase service
    const purchaseResult = await marketplace.purchaseService({
      serviceId: service.service.serviceId,
      agentId: agentConfig.agentId,
      maxPrice: '50.00',
      minSellerReputation: 0.8,
      negotiationEnabled: true,
    });

    if (purchaseResult.success) {
      console.log('✅ Service purchased successfully!');
      if (purchaseResult.negotiationResult) {
        console.log(`   Original price: ${purchaseResult.negotiationResult.originalPrice}`);
        console.log(`   Final price: ${purchaseResult.negotiationResult.finalPrice}`);
      }
    } else {
      console.error('❌ Service purchase failed:', purchaseResult.error);
    }

    return purchaseResult;
  }

  return { success: false, error: 'No services available' };
}

/**
 * Example 4: Verified Information Query
 * 
 * An agent queries verified information and pays for high-quality data.
 */
export async function exampleVerifiedInfoQuery() {
  console.log('\n🔍 Example 4: Verified Information Query\n');

  const agentConfig: AgentPaymentConfig = {
    agentId: 'info-query-agent-001',
    payerAddress: '0x1234567890123456789012345678901234567890',
    preferredChain: 'solana',
    maxPaymentAmount: 5.0,
    minRecipientReputation: 0.9,
  };

  const agent = createX402AutonomousAgent(agentConfig);

  // Query verified information
  const result = await agent.requestResource<{
    answer: string;
    sources: Array<{
      ual: string;
      reputation: number;
      verified: boolean;
    }>;
  }>('http://localhost:4000/api/verified-info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'What is the current reputation score of user 0xABC123?',
      sourceReputation: 0.9,
    }),
  });

  if (result.success && result.data) {
    console.log('✅ Verified information retrieved!');
    console.log(`   Answer: ${result.data.answer}`);
    console.log(`   Sources: ${result.data.sources.length}`);
    console.log(`   Amount paid: ${result.amountPaid}`);
  } else {
    console.error('❌ Query failed:', result.error);
  }

  return result;
}

/**
 * Example 5: Multi-Agent Payment Coordination
 * 
 * Multiple agents coordinate to purchase a shared resource.
 */
export async function exampleMultiAgentCoordination() {
  console.log('\n👥 Example 5: Multi-Agent Payment Coordination\n');

  const agents = [
    createX402AutonomousAgent({
      agentId: 'agent-001',
      payerAddress: '0x1111111111111111111111111111111111111111',
      preferredChain: 'base',
      maxPaymentAmount: 20.0,
    }),
    createX402AutonomousAgent({
      agentId: 'agent-002',
      payerAddress: '0x2222222222222222222222222222222222222222',
      preferredChain: 'base',
      maxPaymentAmount: 20.0,
    }),
    createX402AutonomousAgent({
      agentId: 'agent-003',
      payerAddress: '0x3333333333333333333333333333333333333333',
      preferredChain: 'base',
      maxPaymentAmount: 20.0,
    }),
  ];

  // Each agent attempts to purchase the same resource
  const resourceUrl = 'http://localhost:4000/api/premium-dataset/ai-models-2024';
  
  console.log('🔄 Coordinating multi-agent purchase...');
  
  const results = await Promise.allSettled(
    agents.map(agent => agent.requestResource(resourceUrl))
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success));

  console.log(`   Successful purchases: ${successful.length}`);
  console.log(`   Failed purchases: ${failed.length}`);

  if (successful.length > 0) {
    console.log('✅ Multi-agent coordination successful!');
    successful.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`   Agent ${index + 1}: Paid ${result.value.amountPaid}`);
      }
    });
  }

  return { successful: successful.length, failed: failed.length };
}

/**
 * Example 6: Reputation-Aware Payment Decision
 * 
 * An agent makes payment decisions based on recipient reputation.
 */
export async function exampleReputationAwarePayment() {
  console.log('\n⭐ Example 6: Reputation-Aware Payment Decision\n');

  const agentConfig: AgentPaymentConfig = {
    agentId: 'reputation-aware-agent-001',
    payerAddress: '0x1234567890123456789012345678901234567890',
    preferredChain: 'base',
    maxPaymentAmount: 100.0,
    minRecipientReputation: 0.85, // High reputation requirement
    enableNegotiation: true,
  };

  const agent = createX402AutonomousAgent(agentConfig);

  // Request service from high-reputation provider
  const result = await agent.requestResource(
    'http://localhost:4000/api/premium-service/data-analysis',
    {
      method: 'GET',
    }
  );

  if (result.success) {
    console.log('✅ High-reputation service accessed!');
    console.log(`   Payment decision: Approved`);
    console.log(`   Amount paid: ${result.amountPaid}`);
  } else {
    console.log('❌ Payment rejected:', result.error);
    console.log('   Reason: Reputation or price constraints not met');
  }

  return result;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('\n🚀 Running x402 Autonomous Agent Examples\n');
  console.log('=' .repeat(60));

  try {
    await examplePayPerAPI();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleContentPurchase();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleAgentMarketplace();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleVerifiedInfoQuery();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleMultiAgentCoordination();
    await new Promise(resolve => setTimeout(resolve, 1000));

    await exampleReputationAwarePayment();

    console.log('\n' + '='.repeat(60));
    console.log('✅ All examples completed!\n');
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Export for use in other modules
export {
  examplePayPerAPI,
  exampleContentPurchase,
  exampleAgentMarketplace,
  exampleVerifiedInfoQuery,
  exampleMultiAgentCoordination,
  exampleReputationAwarePayment,
};

