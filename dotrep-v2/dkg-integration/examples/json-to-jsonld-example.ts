/**
 * JSON to JSON-LD Conversion Examples
 * 
 * Demonstrates how to convert plain JSON data into JSON-LD format
 * for publishing to the DKG as Knowledge Assets.
 */

import { DKGClientV8 } from '../dkg-client-v8';
import { 
  convertToJSONLD, 
  convertArrayToJSONLD,
  convertWithSchema,
  mergeJSONLD,
  flattenJSONLD
} from '../json-to-jsonld';

/**
 * Example 1: Basic conversion with Schema.org
 */
export async function example1_BasicConversion() {
  const json = {
    name: "Alice",
    homepage: "http://alice.example.com",
    email: "alice@example.com"
  };

  const jsonld = convertToJSONLD(json, {
    baseContext: 'https://schema.org/',
    type: 'Person',
    id: 'did:example:alice',
    urlFields: ['homepage']
  });

  console.log('Example 1 - Basic Conversion:');
  console.log(JSON.stringify(jsonld, null, 2));
  return jsonld;
}

/**
 * Example 2: Reputation asset conversion
 */
export async function example2_ReputationAsset() {
  const reputationJSON = {
    developerId: "alice",
    reputationScore: 850,
    contributions: [
      {
        id: "contrib-1",
        title: "Feature X",
        url: "https://github.com/example/repo/pull/123",
        date: "2025-01-15",
        impact: 75
      }
    ],
    timestamp: Date.now()
  };

  const jsonld = convertToJSONLD(reputationJSON, {
    baseContext: 'https://schema.org/',
    context: {
      'dotrep': 'https://dotrep.io/ontology/',
      'reputationScore': 'dotrep:reputationScore',
      'contributions': 'dotrep:contributions',
      'contributionType': 'dotrep:contributionType',
      'impactScore': 'dotrep:impactScore'
    },
    type: 'Person',
    id: `did:polkadot:${reputationJSON.developerId}`,
    dateFields: ['timestamp', 'date'],
    urlFields: ['url'],
    nestedObjectFields: ['contributions']
  });

  console.log('Example 2 - Reputation Asset:');
  console.log(JSON.stringify(jsonld, null, 2));
  return jsonld;
}

/**
 * Example 3: Content verification report
 */
export async function example3_VerificationReport() {
  const verificationJSON = {
    contentUrl: "https://example.com/content/image.jpg",
    confidence: 0.95,
    matchFound: true,
    matchType: "deepfake",
    recommendedAction: "flag",
    timestamp: new Date().toISOString(),
    matches: [
      {
        matchId: "match-1",
        confidence: 0.92,
        matchType: "deepfake",
        sourceUAL: "ual:dkg:videntifier:abc123"
      }
    ]
  };

  const jsonld = convertToJSONLD(verificationJSON, {
    context: {
      'schema': 'https://schema.org/',
      'guardian': 'https://guardian.umanitek.ai/schema/',
      'prov': 'http://www.w3.org/ns/prov#',
      'contentUrl': { '@id': 'schema:about', '@type': '@id' },
      'confidence': 'guardian:confidence',
      'matchFound': 'guardian:matchFound',
      'matchType': 'guardian:matchType',
      'recommendedAction': 'guardian:recommendedAction',
      'wasDerivedFrom': 'prov:wasDerivedFrom'
    },
    type: 'guardian:ContentVerificationReport',
    id: `urn:ual:guardian:verification:${Date.now()}`,
    dateFields: ['timestamp'],
    nestedObjectFields: ['matches']
  });

  console.log('Example 3 - Verification Report:');
  console.log(JSON.stringify(jsonld, null, 2));
  return jsonld;
}

/**
 * Example 4: Using a schema
 */
export async function example4_WithSchema() {
  const paymentSchema = {
    context: {
      'schema': 'https://schema.org/',
      'dotrep': 'https://dotrep.io/ontology/',
      'price': 'schema:price',
      'priceCurrency': 'schema:priceCurrency',
      'txHash': 'dotrep:txHash',
      'payer': 'schema:payee',
      'recipient': 'schema:recipient',
      'chain': 'dotrep:chain'
    },
    type: 'schema:PaymentChargeSpecification',
    idField: 'txHash',
    dateFields: ['timestamp'],
    urlFields: []
  };

  const paymentJSON = {
    txHash: "0xabc123...",
    payer: "0xBuyer",
    recipient: "0xSeller",
    amount: "10.00",
    currency: "USDC",
    chain: "base",
    timestamp: Date.now()
  };

  const jsonld = convertWithSchema(paymentJSON, paymentSchema);

  console.log('Example 4 - Payment with Schema:');
  console.log(JSON.stringify(jsonld, null, 2));
  return jsonld;
}

/**
 * Example 5: Converting arrays
 */
export async function example5_ArrayConversion() {
  const developers = [
    { name: "Alice", email: "alice@example.com", reputationScore: 850 },
    { name: "Bob", email: "bob@example.com", reputationScore: 720 },
    { name: "Charlie", email: "charlie@example.com", reputationScore: 910 }
  ];

  const jsonldArray = convertArrayToJSONLD(developers, {
    baseContext: 'https://schema.org/',
    context: {
      'dotrep': 'https://dotrep.io/ontology/',
      'reputationScore': 'dotrep:reputationScore'
    },
    type: 'Person',
    autoGenerateId: true,
    idPrefix: 'did:example:'
  });

  console.log('Example 5 - Array Conversion:');
  console.log(JSON.stringify(jsonldArray, null, 2));
  return jsonldArray;
}

/**
 * Example 6: Merging multiple documents
 */
export async function example6_Merging() {
  const doc1 = convertToJSONLD(
    { name: "Alice", email: "alice@example.com" },
    { baseContext: 'https://schema.org/', type: 'Person', id: 'did:example:alice' }
  );

  const doc2 = convertToJSONLD(
    { name: "Bob", email: "bob@example.com" },
    { baseContext: 'https://schema.org/', type: 'Person', id: 'did:example:bob' }
  );

  const merged = mergeJSONLD([doc1, doc2]);

  console.log('Example 6 - Merged Documents:');
  console.log(JSON.stringify(merged, null, 2));
  return merged;
}

/**
 * Example 7: Using with DKG Client
 */
export async function example7_WithDKGClient() {
  const dkgClient = new DKGClientV8({
    environment: 'testnet',
    useMockMode: true
  });

  const json = {
    name: "Alice",
    reputationScore: 850,
    timestamp: Date.now()
  };

  // Convert to JSON-LD using DKG client method
  const jsonld = await dkgClient.convertToJSONLD(json, {
    baseContext: 'https://schema.org/',
    context: {
      'dotrep': 'https://dotrep.io/ontology/',
      'reputationScore': 'dotrep:reputationScore'
    },
    type: 'Person',
    dateFields: ['timestamp']
  });

  console.log('Example 7 - With DKG Client:');
  console.log(JSON.stringify(jsonld, null, 2));

  // Validate before publishing
  const { validateJSONLD } = await import('../jsonld-validator');
  const validation = await validateJSONLD(jsonld);

  if (validation.valid) {
    console.log('✅ JSON-LD is valid');
    console.log(`📝 Content hash: ${validation.contentHash}`);
  } else {
    console.error('❌ Validation errors:', validation.errors);
  }

  return jsonld;
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(60));
  console.log('JSON to JSON-LD Conversion Examples');
  console.log('='.repeat(60));
  console.log();

  await example1_BasicConversion();
  console.log();

  await example2_ReputationAsset();
  console.log();

  await example3_VerificationReport();
  console.log();

  await example4_WithSchema();
  console.log();

  await example5_ArrayConversion();
  console.log();

  await example6_Merging();
  console.log();

  await example7_WithDKGClient();
  console.log();

  console.log('='.repeat(60));
  console.log('All examples completed!');
  console.log('='.repeat(60));
}

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

