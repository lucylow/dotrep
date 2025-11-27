/**
 * x402 Payment Gateway - Usage Examples
 * 
 * This file demonstrates how to use the improved x402 payments layer
 * with various patterns and configurations.
 */

const express = require('express');
const { x402Middleware, paymentMiddleware } = require('./x402-middleware');

const app = express();
app.use(express.json());

// Example 1: Simple static pricing
// GET /api/premium-data requires $0.10 USDC payment
app.get('/api/premium-data', 
  x402Middleware('premium-data'),
  (req, res) => {
    // Payment evidence is available in req.paymentEvidence
    res.json({
      data: 'This is premium content',
      paymentEvidence: req.paymentEvidence,
      timestamp: new Date().toISOString()
    });
  }
);

// Example 2: Dynamic pricing based on request context
// Price varies based on query parameters or user tier
app.get('/api/dynamic-resource',
  x402Middleware('dynamic-resource', {
    getPrice: (req) => {
      // Calculate price based on request
      const tier = req.query.tier || 'standard';
      const prices = {
        standard: { amount: '0.10', currency: 'USDC' },
        premium: { amount: '0.25', currency: 'USDC' },
        enterprise: { amount: '1.00', currency: 'USDC' }
      };
      return prices[tier] || prices.standard;
    },
    reputationRequirements: {
      minReputationScore: 0.7,
      minPaymentCount: 3
    }
  }),
  (req, res) => {
    res.json({
      data: 'Dynamic content based on tier',
      tier: req.query.tier,
      paymentEvidence: req.paymentEvidence
    });
  }
);

// Example 3: Reputation-gated endpoint
// Only high-reputation users can access
app.get('/api/trusted-creators',
  x402Middleware('verified-creators', {
    reputationRequirements: {
      minReputationScore: 0.8,
      minPaymentCount: 10,
      requireVerifiedIdentity: true,
      blockSybilAccounts: true
    },
    onPaymentSuccess: async (req, res, paymentData) => {
      console.log('Payment successful:', paymentData.proof.txHash);
      // Could log to analytics, update user stats, etc.
    },
    onPaymentFailure: async (req, res, error) => {
      console.warn('Payment failed:', error.message);
      // Could log failed attempts, update fraud detection, etc.
    }
  }),
  (req, res) => {
    res.json({
      creators: [
        { name: 'Alice', reputation: 0.95 },
        { name: 'Bob', reputation: 0.92 }
      ],
      paymentEvidence: req.paymentEvidence
    });
  }
);

// Example 4: Using paymentMiddleware pattern (similar to x402-express)
// This matches the pattern shown in the user's explanation
app.use(
  paymentMiddleware(
    process.env.WALLET_ADDRESS || '0x0000000000000000000000000000000000000000',
    {
      // Define protected endpoints and their prices
      'GET /authenticate': {
        price: '$0.10',
        network: 'base-sepolia',
        currency: 'USDC',
        description: 'User authentication service'
      },
      'GET /api/premium/influencers': {
        price: '$0.25',
        network: 'base',
        currency: 'USDC'
      },
      'GET /api/sybil-analysis/:userId': {
        price: '$0.10',
        network: 'base',
        currency: 'USDC'
      },
      'POST /api/endorsement-verification': {
        price: '$0.15',
        network: 'base',
        currency: 'USDC'
      }
    },
    {
      url: process.env.FACILITATOR_URL || 'https://x402.org/facilitator'
    }
  )
);

// Example 5: Pay-per-API endpoint
// Charge per API call with micropayments
app.get('/api/top-reputable-users',
  x402Middleware('top-reputable-users', {
    reputationRequirements: {
      minReputationScore: 0.5 // Lower threshold for discovery
    }
  }),
  async (req, res) => {
    const { category = 'all', limit = 10 } = req.query;
    
    // Query actual data (mock for example)
    const users = [
      { account: 'did:dkg:user:alice', reputation: 0.95, category: 'tech' },
      { account: 'did:dkg:user:bob', reputation: 0.92, category: 'tech' }
    ].filter(u => category === 'all' || u.category === category)
     .slice(0, parseInt(limit));

    res.json({
      resource: 'top-reputable-users',
      category,
      limit: parseInt(limit),
      users,
      paymentEvidence: req.paymentEvidence
    });
  }
);

// Example 6: Agent-to-agent commerce
// AI agents can autonomously purchase services
app.post('/api/agent/endorsement-verification',
  x402Middleware('endorsement-verification', {
    getPrice: (req) => {
      // Dynamic pricing based on complexity
      const complexity = req.body.complexity || 'standard';
      const prices = {
        simple: { amount: '0.05', currency: 'USDC' },
        standard: { amount: '0.15', currency: 'USDC' },
        complex: { amount: '0.50', currency: 'USDC' }
      };
      return prices[complexity] || prices.standard;
    },
    reputationRequirements: {
      minReputationScore: 0.6, // Allow agents with moderate reputation
      minPaymentCount: 1 // At least one previous payment
    }
  }),
  async (req, res) => {
    const { endorsementId, agentId } = req.body;
    
    // Process endorsement verification
    const verification = {
      endorsementId,
      verified: true,
      agentId,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      verification,
      paymentEvidence: req.paymentEvidence
    });
  }
);

// Example 7: Free discovery, paid access
// Discovery is free, but accessing details requires payment
app.get('/api/marketplace/discover', (req, res) => {
  // Free discovery endpoint
  res.json({
    products: [
      {
        id: 'product-1',
        name: 'Tech Trends Dataset',
        price: { amount: '10.00', currency: 'USDC' },
        description: 'Comprehensive tech trends analysis'
      }
    ]
  });
});

app.get('/api/marketplace/product/:productId',
  x402Middleware('marketplace-product', {
    getPrice: (req) => {
      // Get product price from database/cache
      // For demo, return fixed price
      return { amount: '10.00', currency: 'USDC' };
    }
  }),
  (req, res) => {
    const { productId } = req.params;
    
    res.json({
      productId,
      data: 'Full product details and access',
      downloadUrl: `https://marketplace.example.com/download/${productId}`,
      paymentEvidence: req.paymentEvidence
    });
  }
);

// Example 8: Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // If it's an x402-related error, format appropriately
  if (err.code && err.code.startsWith('X402_')) {
    return res.status(402).json({
      error: 'Payment Required',
      code: err.code,
      message: err.message,
      retryable: true
    });
  }
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 x402 Payment Gateway examples running on port ${PORT}`);
  console.log('\n📚 Available endpoints:');
  console.log('  GET  /api/premium-data');
  console.log('  GET  /api/dynamic-resource?tier=premium');
  console.log('  GET  /api/trusted-creators');
  console.log('  GET  /api/top-reputable-users?category=tech&limit=10');
  console.log('  POST /api/agent/endorsement-verification');
  console.log('  GET  /api/marketplace/discover');
  console.log('  GET  /api/marketplace/product/:productId');
});

module.exports = app;

