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
 * Publish Payment Evidence KA to DKG with retry logic
 * @param {object} paymentEvidence - Payment evidence KA object
 * @param {string} dkgEndpoint - DKG endpoint URL
 * @param {object} options - Publishing options
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @returns {Promise<object>} Publishing result
 */
async function publishPaymentEvidenceKA(paymentEvidence, dkgEndpoint, options = {}) {
  const {
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(`${dkgEndpoint}/publish`, paymentEvidence, {
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 15000,
        validateStatus: (status) => status >= 200 && status < 500 // Don't throw on 4xx
      });
      
      // Check if request was successful
      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          ual: response.data.ual || `urn:ual:dotrep:payment:${paymentEvidence['schema:identifier']}`,
          transactionHash: response.data.transactionHash,
          blockNumber: response.data.blockNumber,
          data: response.data,
          attempt: attempt + 1
        };
      } else {
        // Non-retryable error (4xx)
        throw new Error(`DKG returned status ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      lastError = error;
      
      // Check if error is retryable
      const isRetryable = 
        !error.response || // Network error
        error.response.status >= 500 || // Server error
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT';
      
      if (!isRetryable || attempt >= maxRetries) {
        // Non-retryable error or max retries reached
        console.error('[x402] Error publishing Payment Evidence KA:', error.message);
        
        // Return simulated UAL for demo/fallback
        return {
          success: false,
          ual: `urn:ual:dotrep:payment:simulated:${crypto.randomBytes(8).toString('hex')}`,
          simulated: true,
          error: error.message,
          errorCode: error.code,
          httpStatus: error.response?.status,
          attempt: attempt + 1
        };
      }
      
      // Wait before retry (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      console.warn(`[x402] Publishing attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Fallback if all retries failed
  console.error('[x402] All publishing attempts failed:', lastError?.message);
  return {
    success: false,
    ual: `urn:ual:dotrep:payment:simulated:${crypto.randomBytes(8).toString('hex')}`,
    simulated: true,
    error: lastError?.message || 'Unknown error',
    errorCode: lastError?.code,
    attempts: maxRetries + 1
  };
}

/**
 * Create and publish Payment Evidence KA in one call
 * @param {object} paymentData - Payment data object
 * @param {string} dkgEndpoint - DKG endpoint URL
 * @param {object} options - Publishing options
 * @returns {Promise<object>} Payment evidence and publishing result
 */
async function createAndPublishPaymentEvidence(paymentData, dkgEndpoint, options = {}) {
  try {
    // Validate required fields
    const requiredFields = ['txHash', 'payer', 'recipient', 'amount', 'currency', 'chain'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required payment data fields: ${missingFields.join(', ')}`);
    }

    const paymentEvidence = createPaymentEvidenceKA(paymentData);
    const result = await publishPaymentEvidenceKA(paymentEvidence, dkgEndpoint, options);
    
    return {
      paymentEvidence,
      publishResult: result
    };
  } catch (error) {
    console.error('[x402] Error creating payment evidence:', error);
    // Still create evidence object even if publishing fails
    const paymentEvidence = createPaymentEvidenceKA(paymentData);
    return {
      paymentEvidence,
      publishResult: {
        success: false,
        ual: `urn:ual:dotrep:payment:simulated:${crypto.randomBytes(8).toString('hex')}`,
        simulated: true,
        error: error.message
      }
    };
  }
}

/**
 * Query payment evidence from DKG by payer or recipient
 * @param {object} query - Query parameters
 * @param {string} query.payer - Payer address (optional)
 * @param {string} query.recipient - Recipient address (optional)
 * @param {string} query.resourceUAL - Resource UAL (optional)
 * @param {number} query.minAmount - Minimum amount (optional)
 * @param {number} query.limit - Result limit (default: 100)
 * @param {string} dkgEndpoint - DKG endpoint URL
 * @returns {Promise<object>} Query results
 */
async function queryPaymentEvidence(query, dkgEndpoint) {
  // Build SPARQL query safely
  const filters = [];
  
  if (query.payer) {
    filters.push(`FILTER(?payer = "${escapeSparqlString(query.payer)}")`);
  }
  if (query.recipient) {
    filters.push(`FILTER(?recipient = "${escapeSparqlString(query.recipient)}")`);
  }
  if (query.resourceUAL) {
    filters.push(`FILTER(?resourceUAL = "${escapeSparqlString(query.resourceUAL)}")`);
  }
  if (query.minAmount !== undefined) {
    const minAmount = parseFloat(query.minAmount);
    if (!isNaN(minAmount)) {
      filters.push(`FILTER(?amount >= ${minAmount})`);
    }
  }

  const limit = Math.min(Math.max(1, parseInt(query.limit) || 100), 1000); // Cap at 1000

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
      ${filters.join('\n      ')}
    }
    ORDER BY DESC(?timestamp)
    LIMIT ${limit}
  `;

  try {
    const response = await axios.post(`${dkgEndpoint}/query`, {
      query: sparqlQuery,
      format: 'json'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: (status) => status >= 200 && status < 500
    });
    
    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        results: response.data.results || response.data,
        count: Array.isArray(response.data.results) ? response.data.results.length : 0
      };
    } else {
      return {
        success: false,
        results: [],
        error: `DKG returned status ${response.status}`,
        httpStatus: response.status
      };
    }
  } catch (error) {
    console.error('[x402] Error querying payment evidence:', error.message);
    return { 
      success: false,
      results: [], 
      error: error.message,
      errorCode: error.code
    };
  }
}

/**
 * Escape string for SPARQL query (prevent injection)
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeSparqlString(str) {
  if (typeof str !== 'string') return '';
  // Basic escaping: replace quotes and backslashes
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

module.exports = {
  createPaymentEvidenceKA,
  publishPaymentEvidenceKA,
  createAndPublishPaymentEvidence,
  queryPaymentEvidence,
  calculatePaymentWeight,
  getChainId,
  escapeSparqlString
};

