/**
 * Quality Data Exchange Example
 * 
 * Demonstrates how to use the quality data exchange features:
 * 1. Register a data product with complete metadata
 * 2. Search and discover data products
 * 3. Purchase data products with fair exchange
 * 4. Validate data quality
 * 5. Handle disputes
 * 
 * This example shows the complete flow of a quality data exchange marketplace.
 */

import { DKGClientV8 } from '../dkg-client-v8';
import { DataProductMetadata } from '../data-product-registry';
import { ExchangeRequest } from '../fair-exchange-protocol';

async function main() {
  console.log('🚀 Quality Data Exchange Example\n');

  // Initialize DKG client
  const dkgClient = new DKGClientV8({
    environment: 'testnet',
    useMockMode: true // Use mock mode for demo
  });

  // Get marketplace instance
  const marketplace = await dkgClient.getDataMarketplace();

  // ============================================
  // Example 1: Register a Data Product
  // ============================================
  console.log('📦 Example 1: Registering a Data Product\n');

  const dataProductMetadata: DataProductMetadata = {
    id: 'dataset-ai-training-v1',
    name: 'AI Training Dataset - Open Source Contributions',
    description: 'A comprehensive dataset of verified open-source contributions for AI training',
    type: 'dataset',
    creator: 'did:polkadot:alice',
    creatorDID: 'did:polkadot:alice',
    timestamp: Date.now(),
    version: '1.0.0',
    license: 'CC-BY',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    usageTerms: 'Attribution required. Commercial use allowed.',
    attributionRequired: true,
    qualityMetrics: {
      completeness: 95,
      accuracy: 92,
      freshness: 30, // 30 days old
      validationScore: 88,
      schemaCompliance: 90,
      communityRating: 4.5
    },
    format: 'JSON',
    size: 1024 * 1024 * 50, // 50 MB
    recordCount: 10000,
    schema: {
      type: 'object',
      properties: {
        contributionId: { type: 'string' },
        developerId: { type: 'string' },
        type: { type: 'string' },
        impact: { type: 'number' }
      }
    },
    sampleData: {
      contributionId: 'cont-001',
      developerId: 'alice',
      type: 'github_pr',
      impact: 85
    },
    storageLocation: 'ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
    accessControl: 'public',
    price: {
      amount: 100,
      currency: 'TRAC',
      paymentMethod: 'escrow'
    },
    providerReputation: 850,
    endorsementCount: 25,
    tags: ['AI', 'ML', 'Open Source', 'Contributions'],
    category: 'AI/ML',
    domain: 'Software Development',
    documentationUrl: 'https://docs.example.com/dataset-ai-training',
    readme: '# AI Training Dataset\n\nThis dataset contains...'
  };

  const registry = await dkgClient.getDataProductRegistry();
  const registerResult = await registry.registerDataProduct(dataProductMetadata);

  console.log(`✅ Data product registered!`);
  console.log(`   UAL: ${registerResult.UAL}`);
  console.log(`   Content Hash: ${registerResult.contentHash}\n`);

  // ============================================
  // Example 2: Search Data Products
  // ============================================
  console.log('🔍 Example 2: Searching Data Products\n');

  const searchResults = await marketplace.listProducts({
    type: 'dataset',
    minQuality: 80,
    minReputation: 700,
    tags: ['AI'],
    sortBy: 'quality',
    sortOrder: 'desc',
    limit: 10
  });

  console.log(`✅ Found ${searchResults.length} data products:`);
  searchResults.forEach((listing, index) => {
    console.log(`\n   ${index + 1}. ${listing.entry.metadata.name}`);
    console.log(`      Type: ${listing.entry.metadata.type}`);
    console.log(`      Quality Score: ${listing.qualityScore}/100`);
    console.log(`      Provider Reputation: ${listing.providerReputation}/1000`);
    console.log(`      Price: ${listing.price?.amount} ${listing.price?.currency || 'N/A'}`);
    console.log(`      UAL: ${listing.entry.ual}`);
  });
  console.log();

  // ============================================
  // Example 3: Purchase Data Product
  // ============================================
  console.log('💰 Example 3: Purchasing a Data Product\n');

  const purchaseRequest = {
    dataProductUAL: registerResult.UAL,
    buyer: 'did:polkadot:bob',
    buyerDID: 'did:polkadot:bob',
    paymentMethod: 'escrow' as const,
    deliveryVerification: {
      required: true,
      validationRequired: true
    }
  };

  const purchaseResult = await marketplace.purchaseProduct(purchaseRequest);

  console.log(`✅ Purchase initiated!`);
  console.log(`   Exchange ID: ${purchaseResult.exchangeId}`);
  console.log(`   Exchange UAL: ${purchaseResult.exchangeUAL}`);
  console.log(`   Status: ${purchaseResult.status}\n`);

  // ============================================
  // Example 4: Deliver Data Product
  // ============================================
  console.log('📦 Example 4: Delivering Data Product\n');

  const deliveryResult = await marketplace.deliverProduct(
    purchaseResult.exchangeId!,
    'ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx',
    registerResult.contentHash
  );

  console.log(`✅ Delivery ${deliveryResult.verificationPassed ? 'verified' : 'failed'}!`);
  console.log(`   Status: ${deliveryResult.status}`);
  console.log(`   Delivery Location: ${deliveryResult.deliveryLocation}`);
  console.log(`   Verification Passed: ${deliveryResult.verificationPassed}\n`);

  // ============================================
  // Example 5: Validate Data Product
  // ============================================
  console.log('🔍 Example 5: Validating Data Product Quality\n');

  const validationReport = await marketplace.validateProduct(
    registerResult.UAL,
    'ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx'
  );

  console.log(`✅ Validation complete!`);
  console.log(`   Overall Score: ${validationReport.overallScore}/100`);
  console.log(`   Passed: ${validationReport.passed}`);
  console.log(`   Validation UAL: ${validationReport.validationUAL}`);
  console.log(`\n   Validation Results:`);
  validationReport.results.forEach(result => {
    console.log(`     - ${result.type}: ${result.score}/100 (${result.passed ? 'PASSED' : 'FAILED'})`);
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`       ${issue.severity.toUpperCase()}: ${issue.message}`);
      });
    }
  });
  console.log();

  // ============================================
  // Example 6: Handle Dispute
  // ============================================
  console.log('⚠️  Example 6: Handling a Dispute\n');

  // Raise dispute
  const disputeResult = await marketplace.raiseDispute(
    purchaseResult.exchangeId!,
    'Data does not match description',
    'did:polkadot:bob'
  );

  console.log(`⚠️  Dispute raised!`);
  console.log(`   Exchange ID: ${disputeResult.exchangeId}`);
  console.log(`   Status: ${disputeResult.status}\n`);

  // Resolve dispute (as arbitrator)
  const resolutionResult = await marketplace.resolveDispute(
    purchaseResult.exchangeId!,
    'Data verified to match description. Dispute dismissed.',
    false, // No refund
    'did:polkadot:arbitrator'
  );

  console.log(`✅ Dispute resolved!`);
  console.log(`   Status: ${resolutionResult.status}\n`);

  // ============================================
  // Example 7: Marketplace Statistics
  // ============================================
  console.log('📊 Example 7: Marketplace Statistics\n');

  const stats = await marketplace.getStatistics();

  console.log(`✅ Marketplace Statistics:`);
  console.log(`   Total Products: ${stats.totalProducts}`);
  console.log(`   Average Quality Score: ${stats.averageQualityScore.toFixed(1)}/100`);
  console.log(`   Average Reputation: ${stats.averageReputation.toFixed(1)}/1000`);
  console.log(`   Products by Type:`);
  Object.entries(stats.productsByType).forEach(([type, count]) => {
    console.log(`     - ${type}: ${count}`);
  });
  console.log(`   Products by License:`);
  Object.entries(stats.productsByLicense).forEach(([license, count]) => {
    console.log(`     - ${license}: ${count}`);
  });
  console.log();

  console.log('✅ Quality Data Exchange Example Complete!');
}

// Run example
if (require.main === module) {
  main().catch(console.error);
}

export default main;

