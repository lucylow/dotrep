/**
 * Machine-to-Machine Commerce Examples
 * 
 * Comprehensive examples demonstrating how to use the M2M commerce
 * infrastructure with x402 protocol for autonomous agent payments.
 */

import { x402PaymentMiddleware } from './x402PaymentMiddleware';
import { AutonomousPaymentAgent } from './autonomousPaymentAgent';
import { TrustBasedPricingEngine } from './trustBasedPricing';
import { AIEndorsementMarketplace, ReputationDataMarketplace } from './marketplaceServices';
import { CrossChainPaymentProcessor } from './crossChainPayments';

/**
 * Example 1: Setup x402-protected API endpoint
 */
export function example1_ProtectedEndpoint() {
  // In your Express app:
  /*
  import express from 'express';
  import { x402PaymentMiddleware } from './server/_core/m2mCommerce';
  
  const app = express();
  
  // Protect endpoint with x402 payment ($0.10 USDC)
  app.get('/api/premium/reputation-data',
    x402PaymentMiddleware({
      amount: '0.10',
      currency: 'USDC',
      recipient: process.env.MARKETPLACE_WALLET || '0x...',
      description: 'Premium reputation analytics report'
    }),
    async (req, res) => {
      const data = await generatePremiumReputationReport();
      res.json(data);
    }
  );
  */
}

/**
 * Example 2: Autonomous agent acquiring paid resource
 */
export async function example2_AutonomousAgent() {
  // Create autonomous payment agent
  const agent = new AutonomousPaymentAgent({
    agentId: 'my-ai-agent',
    payerAddress: '0x742d35Cc6634C0532925a3b8D...',
    maxPaymentAmount: '100.0',
    minRecipientReputation: 0.7,
    enableNegotiation: true
  });

  // Agent automatically handles payment and acquires resource
  try {
    const data = await agent.acquireResource(
      'https://api.example.com/premium/reputation-data',
      '0.15' // Max price willing to pay
    );
    
    console.log('Acquired data:', data);
  } catch (error) {
    console.error('Failed to acquire resource:', error);
  }
}

/**
 * Example 3: Trust-based dynamic pricing
 */
export async function example3_DynamicPricing() {
  const pricingEngine = new TrustBasedPricingEngine();
  
  // Calculate price based on reputation
  const price = await pricingEngine.calculateDynamicPrice({
    basePrice: '10.00',
    buyerReputation: 0.85, // High reputation buyer
    sellerReputation: 0.92, // High reputation seller
  });
  
  console.log(`Dynamic price: $${price}`);
  // High reputation buyer gets discount, but high reputation seller charges premium
  // Result: Price might be around $10.00 - $1.00 (discount) + $2.50 (premium) = $11.50
  
  // Calculate optimal price
  const optimalPrice = pricingEngine.calculateOptimalPrice({
    costBasis: 5.00,
    demandElasticity: 0.8,
    competitorPrices: [9.50, 10.00, 10.50],
    buyerReputation: 0.75,
    sellerReputation: 0.88
  });
  
  console.log(`Optimal price: $${optimalPrice}`);
}

/**
 * Example 4: AI agent endorsement marketplace
 */
export async function example4_EndorsementMarketplace() {
  const marketplace = new AIEndorsementMarketplace({
    agentId: 'campaign-agent',
    payerAddress: '0x...',
    maxPaymentAmount: '1000.00'
  });
  
  // Find and purchase endorsements automatically
  const endorsements = await marketplace.findAndPurchaseEndorsements({
    id: 'campaign-1',
    minInfluencerReputation: 0.8,
    maxBudget: 500,
    minROI: 2.0,
    requiredCapabilities: ['tech', 'developer-audience']
  });
  
  console.log(`Purchased ${endorsements.length} endorsements`);
  endorsements.forEach(endorsement => {
    console.log(`- ${endorsement.influencerId}: $${endorsement.cost}, ROI: ${endorsement.expectedROI}x`);
  });
}

/**
 * Example 5: Reputation data marketplace
 */
export function example5_DataMarketplace() {
  // Setup data product
  /*
  const dataMarketplace = new ReputationDataMarketplace(x402Handler);
  
  dataMarketplace.setupDataProduct({
    id: 'reputation-analytics',
    name: 'Premium Reputation Analytics',
    description: 'Detailed reputation analysis with DKG verification',
    price: '0.50',
    currency: 'USDC',
    dataType: 'reputation-report',
    provider: 'dotrep-marketplace',
    providerReputation: 0.95,
    accessUrl: '/api/data/reputation-analytics'
  }, app);
  
  // AI agent subscribes to data feed
  const agent = new AutonomousPaymentAgent({...});
  const data = await dataMarketplace.subscribeToDataFeed(
    agent,
    'reputation-analytics'
  );
  */
}

/**
 * Example 6: Cross-chain payment
 */
export async function example6_CrossChainPayment() {
  const processor = new CrossChainPaymentProcessor();
  
  // Pay for service on different chain
  const result = await processor.handleCrossChainPayment({
    fromChain: 'base',
    toChain: 'polygon',
    amount: '50.00',
    currency: 'USDC',
    recipient: '0x...',
    payer: '0x...'
  }, 'layerzero');
  
  console.log(`Cross-chain payment: ${result.status}`);
  console.log(`Bridge TX: ${result.bridgeTxHash}`);
  console.log(`Estimated arrival: ${new Date(result.estimatedArrival || 0).toISOString()}`);
}

/**
 * Example 7: Complete M2M commerce workflow
 */
export async function example7_CompleteWorkflow() {
  // Step 1: Create autonomous agent
  const agent = new AutonomousPaymentAgent({
    agentId: 'reputation-buyer-agent',
    payerAddress: '0x...',
    maxPaymentAmount: '100.00',
    minRecipientReputation: 0.75
  });
  
  // Step 2: Discover reputation data products (via marketplace)
  // Step 3: Evaluate prices with trust-based pricing
  const pricingEngine = new TrustBasedPricingEngine();
  const buyerReputation = 0.85; // Would fetch from reputation calculator
  const sellerReputation = 0.92;
  
  const basePrice = '0.50';
  const adjustedPrice = await pricingEngine.calculateDynamicPrice({
    basePrice,
    buyerReputation,
    sellerReputation
  });
  
  console.log(`Base price: $${basePrice}, Adjusted: $${adjustedPrice}`);
  
  // Step 4: Acquire resource with autonomous payment
  const data = await agent.acquireResource(
    'https://marketplace.example.com/api/data/reputation-analytics',
    adjustedPrice
  );
  
  console.log('Acquired reputation data:', data);
  
  // Step 5: Process and use data
  // ... use data for AI agent decision-making
}

