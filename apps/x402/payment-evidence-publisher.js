/**
 * Payment Evidence Knowledge Asset Publisher
 * Publishes x402 payment evidence to OriginTrail DKG for reputation tracking
 * 
 * This module creates properly structured JSON-LD Payment Evidence KAs that:
 * - Link payments to reputation signals
 * - Enable TraceRank-style payment graph analysis
 * - Support provenance tracking (prov:wasDerivedFrom)
 * - Anchor to NeuroWeb for tamper-proofing
 */

const crypto = require('crypto');
const axios = require('axios');

/**
 * Create Payment Evidence Knowledge Asset (JSON-LD)
 * Follows W3C standards and OriginTrail DKG requirements
 */
function createPaymentEvidenceKA({
  txHash,
  payer,
  recipient,
  amount,
  currency,
  chain,
  resourceUAL,
  challenge,
  facilitatorSig,
  signature,
  blockNumber,
  timestamp
}) {
  const contentHash = crypto.createHash('sha256')
    .update(JSON.stringify({
      txHash,
      payer,
      recipient,
      amount,
      currency,
      chain,
      resourceUAL,
      challenge,
      timestamp
    }))
    .digest('hex');

  const isoTimestamp = timestamp || new Date().toISOString();

  return {
    '@context': [
      'https://schema.org/',
      'https://www.w3.org/ns/prov#',
      'https://dotrep.io/ontology/'
    ],
    '@type': 'PaymentEvidence',
    '@id': `urn:ual:dotrep:payment:${txHash}`,
    
    // Schema.org properties
    'schema:identifier': txHash,
    'schema:dateCreated': isoTimestamp,
    'schema:dateModified': isoTimestamp,
    
    // Payment method
    'schema:paymentMethod': {
      '@type': 'PaymentMethod',
      'name': 'x402',
      'protocol': 'HTTP/1.1 402 Payment Required',
      'version': '1.0'
    },
    
    // Payer
    'payer': {
      '@type': 'Person',
      '@id': payer.startsWith('did:') ? payer : `did:key:${payer}`,
      'identifier': payer,
      'dotrep:paymentAddress': payer
    },
    
    // Recipient
    'recipient': {
      '@type': 'Organization',
      '@id': recipient.startsWith('did:') ? recipient : `did:key:${recipient}`,
      'identifier': recipient,
      'dotrep:paymentAddress': recipient
    },
    
    // Monetary amount
    'amount': {
      '@type': 'MonetaryAmount',
      'value': amount,
      'currency': currency,
      'dotrep:amountInSmallestUnit': amount // Preserve precision
    },
    
    // Blockchain transaction
    'blockchain': {
      '@type': 'Blockchain',
      'name': chain,
      'transactionHash': txHash,
      'blockNumber': blockNumber || 'pending',
      'dotrep:chainId': getChainId(chain)
    },
    
    // Resource being paid for
    'resourceUAL': resourceUAL,
    'dotrep:resourceType': 'reputationData', // or 'endorsement', 'verification', etc.
    
    // Settlement verification
    'settlement': {
      'verified': true,
      'method': facilitatorSig ? 'facilitator' : 'on-chain',
      'timestamp': isoTimestamp,
      'facilitatorSignature': facilitatorSig || null
    },
    
    // Challenge/nonce for replay protection
    'challenge': challenge,
    
    // Provenance links
    'prov:wasDerivedFrom': resourceUAL,
    'prov:wasGeneratedBy': {
      '@type': 'Activity',
      'name': 'x402 Payment',
      'startedAtTime': isoTimestamp,
      'endedAtTime': isoTimestamp
    },
    
    // Content integrity
    'contentHash': `sha256:${contentHash}`,
    
    // Signatures
    'signature': signature || null,
    'facilitatorSignature': facilitatorSig || null,
    
    // Reputation signals
    'dotrep:reputationSignal': {
      '@type': 'ReputationSignal',
      'signalType': 'payment',
      'value': parseFloat(amount),
      'weight': calculatePaymentWeight(amount, currency),
      'timestamp': isoTimestamp
    }
  };
}

/**
 * Get chain ID for common chains
 */
function getChainId(chain) {
  const chainIds = {
    'base': '8453',
    'base-sepolia': '84532',
    'solana': '101',
    'ethereum': '1',
    'polygon': '137',
    'arbitrum': '42161'
  };
  return chainIds[chain.toLowerCase()] || '0';
}

/**
 * Calculate payment weight for reputation scoring
 * Higher payments = higher weight (logarithmic scale to prevent gaming)
 */
function calculatePaymentWeight(amount, currency) {
  const amountNum = parseFloat(amount);
  if (amountNum <= 0) return 0;
  
  // Logarithmic scale: log10(amount) * 10
  // $1 = weight 0, $10 = weight 10, $100 = weight 20, $1000 = weight 30
  const weight = Math.log10(amountNum) * 10;
  
  // Cap at 50 to prevent extreme values
  return Math.min(weight, 50);
}

/**
 * Publish Payment Evidence KA to DKG
 */
async function publishPaymentEvidenceKA(paymentEvidence, dkgEndpoint) {
  try {
    const response = await axios.post(`${dkgEndpoint}/publish`, paymentEvidence, {
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    return {
      success: true,
      ual: response.data.ual || `urn:ual:dotrep:payment:${paymentEvidence['schema:identifier']}`,
      transactionHash: response.data.transactionHash,
      blockNumber: response.data.blockNumber,
      data: response.data
    };
  } catch (error) {
    console.error('Error publishing Payment Evidence KA:', error.message);
    
    // Return simulated UAL for demo/fallback
    return {
      success: false,
      ual: `urn:ual:dotrep:payment:simulated:${crypto.randomBytes(8).toString('hex')}`,
      simulated: true,
      error: error.message
    };
  }
}

/**
 * Create and publish Payment Evidence KA in one call
 */
async function createAndPublishPaymentEvidence(paymentData, dkgEndpoint) {
  const paymentEvidence = createPaymentEvidenceKA(paymentData);
  const result = await publishPaymentEvidenceKA(paymentEvidence, dkgEndpoint);
  
  return {
    paymentEvidence,
    publishResult: result
  };
}

/**
 * Query payment evidence from DKG by payer or recipient
 */
async function queryPaymentEvidence(query, dkgEndpoint) {
  const sparqlQuery = `
    PREFIX schema: <https://schema.org/>
    PREFIX dotrep: <https://dotrep.io/ontology/>
    PREFIX prov: <https://www.w3.org/ns/prov#>
    
    SELECT ?payment ?payer ?recipient ?amount ?currency ?txHash ?timestamp ?resourceUAL
    WHERE {
      ?payment a dotrep:PaymentEvidence .
      ?payment schema:identifier ?txHash .
      ?payment payer/schema:identifier ?payer .
      ?payment recipient/schema:identifier ?recipient .
      ?payment amount/schema:value ?amount .
      ?payment amount/schema:currency ?currency .
      ?payment schema:dateCreated ?timestamp .
      ?payment dotrep:resourceUAL ?resourceUAL .
      ${query.payer ? `FILTER(?payer = "${query.payer}")` : ''}
      ${query.recipient ? `FILTER(?recipient = "${query.recipient}")` : ''}
      ${query.resourceUAL ? `FILTER(?resourceUAL = "${query.resourceUAL}")` : ''}
      ${query.minAmount ? `FILTER(?amount >= ${query.minAmount})` : ''}
    }
    ORDER BY DESC(?timestamp)
    LIMIT ${query.limit || 100}
  `;

  try {
    const response = await axios.post(`${dkgEndpoint}/query`, {
      query: sparqlQuery,
      format: 'json'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });
    
    return response.data;
  } catch (error) {
    console.error('Error querying payment evidence:', error.message);
    return { results: [], error: error.message };
  }
}

module.exports = {
  createPaymentEvidenceKA,
  publishPaymentEvidenceKA,
  createAndPublishPaymentEvidence,
  queryPaymentEvidence,
  calculatePaymentWeight,
  getChainId
};

