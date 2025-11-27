/**
 * Reputation-Based Transaction Filtering
 * Enables trusted transactions based on reputation scores from DKG
 * 
 * Features:
 * - Reputation threshold checks
 * - Payment history analysis
 * - Sybil resistance via payment graph
 * - TraceRank-style payment-weighted reputation
 */

const axios = require('axios');

/**
 * Check if payer meets reputation requirements
 */
async function checkReputationRequirement(payer, requirements, dkgEndpoint) {
  const {
    minReputationScore = 0,
    minPaymentCount = 0,
    minTotalPaymentValue = 0,
    requireVerifiedIdentity = false,
    blockSybilAccounts = true
  } = requirements;

  try {
    // Query payer's reputation from DKG
    const reputationQuery = `
      PREFIX schema: <https://schema.org/>
      PREFIX dotrep: <https://dotrep.io/ontology/>
      
      SELECT ?profile ?reputationScore ?totalPayments ?totalValue ?verified
      WHERE {
        ?profile a dotrep:TrustedUserProfile .
        ?profile schema:identifier "${payer}" .
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
      timeout: 5000
    });

    const results = response.data.results?.bindings || [];
    
    if (results.length === 0) {
      // New user - check if we allow new users
      return {
        allowed: minReputationScore === 0 && minPaymentCount === 0,
        reason: 'User not found in reputation system',
        reputationScore: 0,
        totalPayments: 0,
        totalValue: 0
      };
    }

    const profile = results[0];
    const reputationScore = parseFloat(profile.reputationScore?.value || 0);
    const totalPayments = parseInt(profile.totalPayments?.value || 0);
    const totalValue = parseFloat(profile.totalValue?.value || 0);
    const verified = profile.verified?.value === 'true';

    // Check requirements
    const checks = {
      reputationScore: reputationScore >= minReputationScore,
      paymentCount: totalPayments >= minPaymentCount,
      paymentValue: totalValue >= minTotalPaymentValue,
      verifiedIdentity: !requireVerifiedIdentity || verified
    };

    const allPassed = Object.values(checks).every(check => check === true);

    return {
      allowed: allPassed,
      reason: allPassed ? 'All requirements met' : 
        Object.entries(checks)
          .filter(([_, passed]) => !passed)
          .map(([key]) => `${key} requirement not met`)
          .join(', '),
      reputationScore,
      totalPayments,
      totalValue,
      verified,
      checks
    };
  } catch (error) {
    console.error('Error checking reputation:', error.message);
    // Fail open for demo (in production, might want to fail closed)
    return {
      allowed: true,
      reason: 'Reputation check failed, allowing transaction',
      error: error.message
    };
  }
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
 */
async function validateTransactionWithReputation(payer, recipient, amount, resourceUAL, dkgEndpoint, requirements = {}) {
  // Check basic reputation requirements
  const reputationCheck = await checkReputationRequirement(payer, requirements, dkgEndpoint);
  
  // Analyze payment graph for sybil
  const sybilAnalysis = await analyzePaymentGraph(payer, dkgEndpoint);
  
  // Calculate recipient's payment-weighted reputation
  const recipientReputation = await calculatePaymentWeightedReputation(recipient, dkgEndpoint);

  const allowed = reputationCheck.allowed && 
                  sybilAnalysis.sybilRisk !== 'high' &&
                  (requirements.minRecipientTrustLevel 
                    ? recipientReputation.trustLevel === 'high' 
                    : true);

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
       sybilAnalysis.sybilRisk === 'high' ? 'High sybil risk detected' :
       'Recipient trust level insufficient')
  };
}

module.exports = {
  checkReputationRequirement,
  analyzePaymentGraph,
  calculatePaymentWeightedReputation,
  validateTransactionWithReputation
};

