/**
 * Reputation-Based Transaction Filtering
 * Enables trusted transactions based on reputation scores from DKG
 * 
 * Features:
 * - Reputation threshold checks
 * - Payment history analysis
 * - Sybil resistance via payment graph
 * - TraceRank-style payment-weighted reputation
 * - Integration with ReputationCalculator service
 */

const axios = require('axios');

// Cache for reputation queries (TTL: 5 minutes)
const reputationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if payer meets reputation requirements
 * @param {string} payer - Payer address/DID
 * @param {object} requirements - Reputation requirements
 * @param {string} dkgEndpoint - DKG endpoint URL
 * @param {object} options - Additional options
 * @param {string} options.reputationServiceUrl - Optional reputation calculator service URL
 * @returns {Promise<object>} Reputation check result
 */
async function checkReputationRequirement(payer, requirements, dkgEndpoint, options = {}) {
  const {
    minReputationScore = 0,
    minPaymentCount = 0,
    minTotalPaymentValue = 0,
    requireVerifiedIdentity = false,
    blockSybilAccounts = true
  } = requirements;

  const { reputationServiceUrl } = options;

  // Check cache first
  const cacheKey = `reputation:${payer}`;
  const cached = reputationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Use cached data but still validate against requirements
    return validateReputationData(cached.data, requirements);
  }

  try {
    // Try reputation service first if available
    if (reputationServiceUrl) {
      try {
        const serviceResponse = await axios.get(`${reputationServiceUrl}/reputation/${payer}`, {
          timeout: 5000,
          validateStatus: (status) => status >= 200 && status < 500
        });

        if (serviceResponse.status === 200 && serviceResponse.data) {
          const reputationData = {
            reputationScore: serviceResponse.data.overall || serviceResponse.data.score || 0,
            totalPayments: serviceResponse.data.totalPayments || 0,
            totalValue: serviceResponse.data.totalValue || 0,
            verified: serviceResponse.data.verified || false,
            breakdown: serviceResponse.data.breakdown || {}
          };

          // Cache the result
          reputationCache.set(cacheKey, {
            data: reputationData,
            timestamp: Date.now()
          });

          return validateReputationData(reputationData, requirements);
        }
      } catch (serviceError) {
        console.warn('[x402] Reputation service unavailable, falling back to DKG:', serviceError.message);
      }
    }

    // Fallback to DKG query
    const reputationQuery = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?profile ?reputationScore ?totalPayments ?totalValue ?verified
      WHERE {
        ?profile a dotrep:TrustedUserProfile .
        ?profile schema:identifier "${escapeSparqlString(payer)}" .
        ?profile dotrep:reputationScore ?reputationScore .
        OPTIONAL {
          ?profile dotrep:paymentStats/dotrep:totalPayments ?totalPayments .
          ?profile dotrep:paymentStats/dotrep:totalValue ?totalValue .
          ?profile dotrep:verifiedIdentity ?verified .
        }
      }
      LIMIT 1
    `;

    const response = await axios.post(`${dkgEndpoint}/query`, {
      query: reputationQuery,
      format: 'json'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
      validateStatus: (status) => status >= 200 && status < 500
    });

    const results = response.data.results?.bindings || [];
    
    if (results.length === 0) {
      // New user - check if we allow new users
      const result = {
        allowed: minReputationScore === 0 && minPaymentCount === 0,
        reason: 'User not found in reputation system',
        reputationScore: 0,
        totalPayments: 0,
        totalValue: 0,
        verified: false
      };
      
      // Cache negative result (shorter TTL)
      reputationCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    }

    const profile = results[0];
    const reputationData = {
      reputationScore: parseFloat(profile.reputationScore?.value || 0),
      totalPayments: parseInt(profile.totalPayments?.value || 0),
      totalValue: parseFloat(profile.totalValue?.value || 0),
      verified: profile.verified?.value === 'true' || profile.verified?.value === true
    };

    // Cache the result
    reputationCache.set(cacheKey, {
      data: reputationData,
      timestamp: Date.now()
    });

    return validateReputationData(reputationData, requirements);
  } catch (error) {
    console.error('[x402] Error checking reputation:', error.message);
    
    // Fail open for demo (in production, configure fail-closed for sensitive resources)
    // Check environment variable for fail mode
    const failMode = process.env.REPUTATION_FAIL_MODE || 'open';
    
    if (failMode === 'closed') {
      return {
        allowed: false,
        reason: 'Reputation check failed',
        error: error.message,
        reputationScore: 0,
        totalPayments: 0,
        totalValue: 0,
        verified: false
      };
    }
    
    return {
      allowed: true,
      reason: 'Reputation check failed, allowing transaction (fail-open mode)',
      error: error.message,
      reputationScore: 0,
      totalPayments: 0,
      totalValue: 0,
      verified: false
    };
  }
}

/**
 * Validate reputation data against requirements
 * @param {object} reputationData - Reputation data
 * @param {object} requirements - Requirements to check
 * @returns {object} Validation result
 */
function validateReputationData(reputationData, requirements) {
  const {
    minReputationScore = 0,
    minPaymentCount = 0,
    minTotalPaymentValue = 0,
    requireVerifiedIdentity = false
  } = requirements;

  const checks = {
    reputationScore: reputationData.reputationScore >= minReputationScore,
    paymentCount: reputationData.totalPayments >= minPaymentCount,
    paymentValue: reputationData.totalValue >= minTotalPaymentValue,
    verifiedIdentity: !requireVerifiedIdentity || reputationData.verified
  };

  const allPassed = Object.values(checks).every(check => check === true);

  return {
    allowed: allPassed,
    reason: allPassed ? 'All requirements met' : 
      Object.entries(checks)
        .filter(([_, passed]) => !passed)
        .map(([key]) => `${key} requirement not met`)
        .join(', '),
    reputationScore: reputationData.reputationScore,
    totalPayments: reputationData.totalPayments,
    totalValue: reputationData.totalValue,
    verified: reputationData.verified,
    checks
  };
}

/**
 * Escape string for SPARQL query
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeSparqlString(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

/**
 * Analyze payment graph for sybil detection
 * Uses payment patterns to detect coordinated attacks
 */
async function analyzePaymentGraph(payer, dkgEndpoint) {
  try {
    // Query payment history
    const paymentQuery = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?payment ?recipient ?amount ?timestamp
      WHERE {
        ?payment a dotrep:PaymentEvidence .
        ?payment payer/schema:identifier "${payer}" .
        ?payment recipient/schema:identifier ?recipient .
        ?payment amount/schema:value ?amount .
        ?payment schema:dateCreated ?timestamp .
      }
      ORDER BY DESC(?timestamp)
      LIMIT 100
    `;

    const response = await axios.post(`${dkgEndpoint}/query`, {
      query: paymentQuery,
      format: 'json'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    const payments = response.data.results?.bindings || [];
    
    if (payments.length === 0) {
      return {
        sybilRisk: 'low',
        riskScore: 0,
        reason: 'No payment history'
      };
    }

    // Analyze patterns
    const recipients = new Set();
    const amounts = [];
    const timestamps = [];
    
    payments.forEach(payment => {
      recipients.add(payment.recipient?.value);
      amounts.push(parseFloat(payment.amount?.value || 0));
      timestamps.push(new Date(payment.timestamp?.value).getTime());
    });

    // Sybil indicators:
    // 1. Many small payments to same recipient (potential gaming)
    // 2. Very recent burst of payments (coordination)
    // 3. Payments to known sybil addresses (would need blacklist)
    
    const uniqueRecipients = recipients.size;
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const recentPayments = timestamps.filter(ts => Date.now() - ts < 3600000).length; // Last hour
    
    let riskScore = 0;
    let reasons = [];

    // Many small payments
    if (uniqueRecipients === 1 && amounts.length > 10 && avgAmount < 1.0) {
      riskScore += 30;
      reasons.push('Many small payments to single recipient');
    }

    // Burst pattern
    if (recentPayments > 20) {
      riskScore += 40;
      reasons.push('Unusual payment burst detected');
    }

    // Very low average payment
    if (avgAmount < 0.10 && amounts.length > 5) {
      riskScore += 20;
      reasons.push('Suspiciously low payment amounts');
    }

    const sybilRisk = riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low';

    return {
      sybilRisk,
      riskScore,
      reason: reasons.length > 0 ? reasons.join('; ') : 'No suspicious patterns detected',
      stats: {
        totalPayments: payments.length,
        uniqueRecipients,
        avgAmount,
        recentPayments
      }
    };
  } catch (error) {
    console.error('Error analyzing payment graph:', error.message);
    return {
      sybilRisk: 'unknown',
      riskScore: 0,
      reason: 'Analysis failed',
      error: error.message
    };
  }
}

/**
 * Calculate payment-weighted reputation (TraceRank-style)
 * Higher-value payments from high-reputation payers = stronger signal
 */
async function calculatePaymentWeightedReputation(recipient, dkgEndpoint) {
  try {
    // Query all payments to this recipient
    const paymentQuery = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?payment ?payer ?amount ?payerReputation
      WHERE {
        ?payment a dotrep:PaymentEvidence .
        ?payment recipient/schema:identifier "${recipient}" .
        ?payment payer/schema:identifier ?payer .
        ?payment amount/schema:value ?amount .
        OPTIONAL {
          ?payerProfile a dotrep:TrustedUserProfile .
          ?payerProfile schema:identifier ?payer .
          ?payerProfile dotrep:reputationScore ?payerReputation .
        }
      }
    `;

    const response = await axios.post(`${dkgEndpoint}/query`, {
      query: paymentQuery,
      format: 'json'
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000
    });

    const payments = response.data.results?.bindings || [];
    
    if (payments.length === 0) {
      return {
        weightedScore: 0,
        totalPayments: 0,
        totalValue: 0,
        avgPayerReputation: 0
      };
    }

    let weightedSum = 0;
    let totalValue = 0;
    let payerReputations = [];

    payments.forEach(payment => {
      const amount = parseFloat(payment.amount?.value || 0);
      const payerRep = parseFloat(payment.payerReputation?.value || 0.5); // Default 0.5 if unknown
      
      totalValue += amount;
      payerReputations.push(payerRep);
      
      // Weight = amount * payer_reputation
      weightedSum += amount * payerRep;
    });

    const weightedScore = totalValue > 0 ? weightedSum / totalValue : 0;
    const avgPayerReputation = payerReputations.reduce((a, b) => a + b, 0) / payerReputations.length;

    return {
      weightedScore,
      totalPayments: payments.length,
      totalValue,
      avgPayerReputation,
      // TraceRank: higher score = more trusted (value-weighted endorsements)
      trustLevel: weightedScore >= 0.8 ? 'high' : weightedScore >= 0.5 ? 'medium' : 'low'
    };
  } catch (error) {
    console.error('Error calculating payment-weighted reputation:', error.message);
    return {
      weightedScore: 0,
      totalPayments: 0,
      totalValue: 0,
      avgPayerReputation: 0,
      error: error.message
    };
  }
}

/**
 * Comprehensive reputation check before allowing transaction
 * @param {string} payer - Payer address/DID
 * @param {string} recipient - Recipient address/DID
 * @param {string|number} amount - Payment amount
 * @param {string} resourceUAL - Resource UAL
 * @param {string} dkgEndpoint - DKG endpoint URL
 * @param {object} requirements - Reputation requirements
 * @param {object} options - Additional options
 * @returns {Promise<object>} Transaction validation result
 */
async function validateTransactionWithReputation(payer, recipient, amount, resourceUAL, dkgEndpoint, requirements = {}, options = {}) {
  try {
    // Check basic reputation requirements
    const reputationCheck = await checkReputationRequirement(payer, requirements, dkgEndpoint, options);
    
    // Analyze payment graph for sybil (async, don't block if it fails)
    let sybilAnalysis = { sybilRisk: 'unknown', riskScore: 0, reason: 'Analysis not performed' };
    try {
      sybilAnalysis = await Promise.race([
        analyzePaymentGraph(payer, dkgEndpoint),
        new Promise((resolve) => setTimeout(() => resolve({
          sybilRisk: 'unknown',
          riskScore: 0,
          reason: 'Analysis timeout'
        }), 3000)) // 3s timeout
      ]);
    } catch (sybilError) {
      console.warn('[x402] Sybil analysis failed:', sybilError.message);
    }
    
    // Calculate recipient's payment-weighted reputation (async, don't block if it fails)
    let recipientReputation = {
      weightedScore: 0,
      totalPayments: 0,
      totalValue: 0,
      trustLevel: 'unknown'
    };
    try {
      recipientReputation = await Promise.race([
        calculatePaymentWeightedReputation(recipient, dkgEndpoint),
        new Promise((resolve) => setTimeout(() => resolve({
          weightedScore: 0,
          totalPayments: 0,
          totalValue: 0,
          trustLevel: 'unknown',
          reason: 'Analysis timeout'
        }), 3000)) // 3s timeout
      ]);
    } catch (recipientError) {
      console.warn('[x402] Recipient reputation analysis failed:', recipientError.message);
    }

    // Determine if transaction is allowed
    const sybilCheck = sybilAnalysis.sybilRisk !== 'high' || requirements.allowHighSybilRisk === true;
    const recipientCheck = !requirements.minRecipientTrustLevel || 
                          recipientReputation.trustLevel === requirements.minRecipientTrustLevel ||
                          (requirements.minRecipientTrustLevel === 'high' && recipientReputation.trustLevel === 'high');

    const allowed = reputationCheck.allowed && sybilCheck && recipientCheck;

    return {
      allowed,
      payer: {
        reputation: reputationCheck,
        sybilAnalysis
      },
      recipient: {
        paymentWeightedReputation: recipientReputation
      },
      reason: allowed ? 'Transaction approved' : 
        (!reputationCheck.allowed ? reputationCheck.reason :
         sybilAnalysis.sybilRisk === 'high' && !requirements.allowHighSybilRisk ? 'High sybil risk detected' :
         !recipientCheck ? `Recipient trust level insufficient (required: ${requirements.minRecipientTrustLevel}, actual: ${recipientReputation.trustLevel})` :
         'Transaction not approved'),
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('[x402] Error in transaction validation:', error);
    // Fail based on configuration
    const failMode = process.env.REPUTATION_FAIL_MODE || 'open';
    return {
      allowed: failMode === 'open',
      reason: `Validation error: ${error.message}`,
      error: error.message,
      timestamp: Date.now()
    };
  }
}

module.exports = {
  checkReputationRequirement,
  analyzePaymentGraph,
  calculatePaymentWeightedReputation,
  validateTransactionWithReputation,
  validateReputationData,
  escapeSparqlString
};

