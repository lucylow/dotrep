/**
 * x402 Payment Gateway - Canonical Implementation
 * Implements HTTP 402 Payment Required standard for trusted transactions
 * Based on x402.org specification and Coinbase/Cloudflare implementations
 * 
 * Features:
 * - Canonical 402 response with machine-readable payment terms
 * - X-PAYMENT header support (standard)
 * - Challenge/nonce for replay protection
 * - Facilitator support (Coinbase, Cloudflare, or custom)
 * - Multi-chain support (Base, Solana, Ethereum, etc.)
 * - Payment Evidence KA publishing to OriginTrail DKG
 * - Reputation-based access control
 */

const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { createAndPublishPaymentEvidence } = require('./payment-evidence-publisher');
const { validateTransactionWithReputation } = require('./reputation-filter');
const { createRateLimiter, Cache, validatePaymentProofStructure } = require('./x402-utils');
const { createBlockchainPaymentService } = require('./blockchain-payment-service');

const app = express();
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/payment')) {
    const hasPayment = !!(req.headers['x-payment'] || req.headers['x-payment-proof']);
    console.log(`[x402] ${req.method} ${req.path} - ${hasPayment ? 'with payment' : 'no payment'}`);
  }
  next();
});

// Rate limiting middleware (applied to all x402 endpoints)
const rateLimiter = createRateLimiter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100') // 100 requests per minute
});

// Apply rate limiting to payment endpoints
app.use('/api/', rateLimiter);
app.use('/payment', rateLimiter);

// Cache for payment challenges and settlements
const paymentCache = new Cache({
  defaultTTL: 15 * 60 * 1000 // 15 minutes (matches challenge expiry)
});

// Initialize x402 utilities - must be defined before use
// Note: Functions are defined below, but we'll set them up after initialization
let x402Utils = null;

// Initialize x402 utilities function
function initializeX402Utils() {
  if (!x402Utils) {
    const { createAndPublishPaymentEvidence } = require('./payment-evidence-publisher');
    const { validateTransactionWithReputation } = require('./reputation-filter');

    x402Utils = {
      accessPolicies,
      paymentChallenges,
      paymentProofs,
      paymentSettlements,
      validatePaymentProof,
      verifySettlement,
      createPaymentRequest,
      generateChallenge,
      createAndPublishPaymentEvidence,
      validateTransactionWithReputation,
      ENABLE_REPUTATION_FILTER,
      EDGE_PUBLISH_URL,
      FACILITATOR_URL,
      X402_VERSION
    };
  }
  return x402Utils;
}

// Make x402 utilities available to middleware
// Use Proxy to lazy-load utilities and ensure proper initialization
app.locals.x402 = new Proxy({}, {
  get: (target, prop) => {
    const utils = initializeX402Utils();
    if (prop in utils) {
      return utils[prop];
    }
    // Return undefined for missing properties (allows optional chaining)
    return undefined;
  },
  has: (target, prop) => {
    const utils = initializeX402Utils();
    return prop in utils;
  }
});

const PORT = process.env.PORT || 4000;
const EDGE_PUBLISH_URL = process.env.EDGE_PUBLISH_URL || 'http://mock-dkg:8080';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'https://facil.example/pay';
const X402_VERSION = process.env.X402_VERSION || '1.0';
const ENABLE_REPUTATION_FILTER = process.env.ENABLE_REPUTATION_FILTER !== 'false';

// Initialize blockchain payment service
const blockchainPaymentService = createBlockchainPaymentService({
  coinbaseFacilitatorUrl: process.env.COINBASE_FACILITATOR_URL,
  cloudflareFacilitatorUrl: process.env.CLOUDFLARE_FACILITATOR_URL,
  baseRpcUrl: process.env.BASE_RPC_URL,
  ethereumRpcUrl: process.env.ETHEREUM_RPC_URL,
  solanaRpcUrl: process.env.SOLANA_RPC_URL,
});

// Validate environment variables
if (!process.env.X402_RECIPIENT && process.env.NODE_ENV === 'production') {
  console.warn('[x402] WARNING: X402_RECIPIENT not set in production environment!');
}

// In-memory stores (in production, use database)
const paymentChallenges = new Map(); // challenge -> { policy, expires, nonce }
const paymentProofs = new Map(); // txHash -> proof
const paymentSettlements = new Map(); // txHash -> settlement status

// Access policies for resources
const accessPolicies = {
  'verified-creators': {
    amount: '2.50',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana', 'ethereum'],
    resourceUAL: 'urn:ual:dotrep:verified-creators',
    description: 'Access to verified creators with high reputation scores'
  },
  'trusted-feed': {
    amount: '1.00',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:trusted-feed',
    description: 'Trusted feed of high-quality content'
  },
  'reputation-data': {
    amount: '5.00',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana', 'ethereum'],
    resourceUAL: 'urn:ual:dotrep:reputation-data',
    description: 'Access to detailed reputation analytics'
  },
  // Pay-per-API endpoints
  'top-reputable-users': {
    amount: '0.01',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:top-reputable-users',
    description: 'List of top-N reputable users by category'
  },
  'user-reputation-profile': {
    amount: '0.05',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:user-reputation-profile',
    description: 'Detailed reputation profile from DKG'
  },
  // Quality data endpoints
  'verified-info': {
    amount: '0.01',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:verified-info',
    description: 'Verified information backed by high-reputation sources'
  },
  'quality-data-query': {
    amount: '0.02',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:quality-data-query',
    description: 'Query verified data with provenance'
  },
  // Data marketplace endpoints
  'marketplace-discovery': {
    amount: '0.00', // Free discovery
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:marketplace-discovery',
    description: 'Discover data products in marketplace'
  },
  'marketplace-product': {
    amount: '0.00', // Free to view, payment required for purchase
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:marketplace-product',
    description: 'View data product details'
  },
  // E-commerce endpoints
  'product-provenance': {
    amount: '0.50',
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'neuroweb-evm'],
    resourceUAL: 'urn:ual:dotrep:product-provenance',
    description: 'Pay-to-unlock product provenance data'
  },
  'agent-purchase': {
    amount: '0.00', // Dynamic pricing
    currency: 'USDC',
    recipient: process.env.X402_RECIPIENT || '0x0000000000000000000000000000000000000000',
    chains: ['base', 'solana'],
    resourceUAL: 'urn:ual:dotrep:agent-purchase',
    description: 'AI agent-driven purchase with reputation verification'
  }
};

/**
 * Generate a unique challenge/nonce for payment request
 */
function generateChallenge() {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  return `x402-${timestamp}-${random}`;
}

/**
 * Create canonical x402 payment request response
 * Follows x402.org specification for machine-readable payment terms
 * @param {object} policy - Access policy
 * @param {string} challenge - Payment challenge/nonce
 * @param {object} options - Additional options
 * @returns {object} Payment request object
 */
function createPaymentRequest(policy, challenge, options = {}) {
  const {
    expiryMinutes = 15,
    includeMetadata = true
  } = options;

  const expires = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
  
  // Store challenge for verification
  paymentChallenges.set(challenge, {
    policy,
    expires: new Date(expires).getTime(),
    nonce: crypto.randomBytes(8).toString('hex'),
    createdAt: Date.now()
  });

  // Create canonical payment request following x402 spec
  const paymentRequest = {
    x402: X402_VERSION,
    amount: policy.amount,
    currency: policy.currency,
    recipient: policy.recipient,
    chains: policy.chains || ['base', 'solana'],
    facilitator: FACILITATOR_URL,
    challenge: challenge,
    expires: expires,
    resourceUAL: policy.resourceUAL,
    description: policy.description || 'Payment required to access this resource'
  };

  // Add metadata if requested (useful for client integration)
  if (includeMetadata) {
    paymentRequest.metadata = {
      protocol: 'x402',
      version: X402_VERSION,
      paymentMethod: 'EIP-3009', // Transfer With Authorization
      supportedTokens: policy.chains?.includes('base') || policy.chains?.includes('base-sepolia') 
        ? ['USDC'] 
        : ['USDC', 'USDT'],
      networkInfo: policy.chains?.map(chain => ({
        chain,
        rpcUrl: getChainRpcUrl(chain),
        explorerUrl: getChainExplorerUrl(chain)
      })) || []
    };
  }

  return paymentRequest;
}

/**
 * Get RPC URL for a chain (for client integration)
 * @param {string} chain - Chain identifier
 * @returns {string|null} RPC URL or null
 */
function getChainRpcUrl(chain) {
  const rpcUrls = {
    'base': 'https://mainnet.base.org',
    'base-sepolia': 'https://sepolia.base.org',
    'ethereum': 'https://eth.llamarpc.com',
    'polygon': 'https://polygon-rpc.com',
    'arbitrum': 'https://arb1.arbitrum.io/rpc',
    'solana': 'https://api.mainnet-beta.solana.com'
  };
  return rpcUrls[chain.toLowerCase()] || null;
}

/**
 * Get block explorer URL for a chain
 * @param {string} chain - Chain identifier
 * @returns {string|null} Explorer URL or null
 */
function getChainExplorerUrl(chain) {
  const explorerUrls = {
    'base': 'https://basescan.org',
    'base-sepolia': 'https://sepolia.basescan.org',
    'ethereum': 'https://etherscan.io',
    'polygon': 'https://polygonscan.com',
    'arbitrum': 'https://arbiscan.io',
    'solana': 'https://solscan.io'
  };
  return explorerUrls[chain.toLowerCase()] || null;
}

/**
 * Validate payment proof from X-PAYMENT header
 * Enhanced with better structure validation, nonce-based replay prevention, and time-bounded authorizations
 */
function validatePaymentProof(proof, challenge) {
  // First, validate proof structure
  const structureValidation = validatePaymentProofStructure(proof);
  if (!structureValidation.valid) {
    return { 
      valid: false, 
      error: 'Invalid payment proof structure',
      details: structureValidation.errors,
      warnings: structureValidation.warnings
    };
  }

  const challengeData = paymentChallenges.get(challenge);
  
  if (!challengeData) {
    return { valid: false, error: 'Invalid or expired challenge', code: 'INVALID_CHALLENGE' };
  }

  // Check expiry
  if (Date.now() > challengeData.expires) {
    paymentChallenges.delete(challenge);
    return { valid: false, error: 'Challenge expired', code: 'CHALLENGE_EXPIRED' };
  }

  // Validate challenge matches
  if (proof.challenge !== challenge) {
    return { valid: false, error: 'Challenge mismatch', code: 'CHALLENGE_MISMATCH' };
  }

  // Enhanced nonce-based replay prevention
  // If proof includes a nonce, validate it separately from challenge
  if (proof.nonce) {
    // Check if nonce was already used (additional layer of replay protection)
    const nonceKey = `nonce:${proof.nonce}:${proof.payer}`;
    if (paymentSettlements.has(nonceKey)) {
      return {
        valid: false,
        error: 'Nonce already used (replay attack detected)',
        code: 'NONCE_REPLAY_DETECTED'
      };
    }
  }

  // Time-bounded authorization validation (EIP-712 compatible)
  if (proof.validAfter && proof.validBefore) {
    const now = Math.floor(Date.now() / 1000);
    if (now < proof.validAfter) {
      return {
        valid: false,
        error: `Authorization not yet valid. Valid after: ${new Date(proof.validAfter * 1000).toISOString()}`,
        code: 'AUTHORIZATION_NOT_YET_VALID'
      };
    }
    if (now > proof.validBefore) {
      return {
        valid: false,
        error: `Authorization expired. Valid before: ${new Date(proof.validBefore * 1000).toISOString()}`,
        code: 'AUTHORIZATION_EXPIRED'
      };
    }
  }

  // Validate amount and currency match policy (with tolerance for floating point)
  const proofAmount = parseFloat(proof.amount);
  const policyAmount = parseFloat(challengeData.policy.amount);
  const amountTolerance = 0.0001; // Small tolerance for floating point comparison
  
  if (Math.abs(proofAmount - policyAmount) > amountTolerance) {
    return { 
      valid: false, 
      error: 'Amount mismatch',
      code: 'AMOUNT_MISMATCH',
      details: {
        expected: challengeData.policy.amount,
        received: proof.amount
      }
    };
  }

  if (proof.currency !== challengeData.policy.currency) {
    return { 
      valid: false, 
      error: 'Currency mismatch',
      code: 'CURRENCY_MISMATCH',
      details: {
        expected: challengeData.policy.currency,
        received: proof.currency
      }
    };
  }

  // Validate recipient (if provided)
  if (proof.recipient && proof.recipient.toLowerCase() !== challengeData.policy.recipient.toLowerCase()) {
    return { 
      valid: false, 
      error: 'Recipient mismatch',
      code: 'RECIPIENT_MISMATCH',
      details: {
        expected: challengeData.policy.recipient,
        received: proof.recipient
      }
    };
  }

  // Validate chain is supported
  const proofChain = proof.chain.toLowerCase();
  const supportedChains = challengeData.policy.chains.map(c => c.toLowerCase());
  if (!supportedChains.includes(proofChain)) {
    return { 
      valid: false, 
      error: 'Unsupported chain',
      code: 'UNSUPPORTED_CHAIN',
      details: {
        received: proof.chain,
        supported: challengeData.policy.chains
      }
    };
  }

  // Validate signature format (if provided)
  if (proof.signature) {
    // EVM signature format: 0x followed by 130 hex characters (65 bytes)
    const evmSigPattern = /^0x[a-fA-F0-9]{130}$/;
    // Solana signature format: base58, typically 88 characters
    const solanaSigPattern = /^[A-Za-z0-9]{80,100}$/;
    
    if (!evmSigPattern.test(proof.signature) && !solanaSigPattern.test(proof.signature)) {
      return { 
        valid: false, 
        error: 'Invalid signature format',
        code: 'INVALID_SIGNATURE_FORMAT'
      };
    }
  }

  // Enhanced replay detection: Check both txHash and nonce
  if (paymentSettlements.has(proof.txHash)) {
    const existingSettlement = paymentSettlements.get(proof.txHash);
    return { 
      valid: false, 
      error: 'Transaction already processed (replay detected)',
      code: 'REPLAY_DETECTED',
      details: {
        originalTimestamp: existingSettlement.timestamp,
        originalResource: existingSettlement.resourceId,
        originalChallenge: existingSettlement.challenge
      }
    };
  }

  // Additional nonce-based replay check
  if (proof.nonce) {
    const nonceKey = `nonce:${proof.nonce}:${proof.payer}`;
    if (paymentSettlements.has(nonceKey)) {
      return {
        valid: false,
        error: 'Nonce already used for this payer (replay attack)',
        code: 'NONCE_REPLAY_DETECTED'
      };
    }
  }

  return { valid: true, challengeData };
}

/**
 * Verify payment settlement (via facilitator or on-chain)
 * Enhanced with real blockchain verification using blockchain-payment-service
 * @param {object} proof - Payment proof object
 * @param {object} options - Verification options
 * @param {boolean} options.requireOnChainConfirmation - Require on-chain confirmation (default: false for demo)
 * @param {number} options.confirmationBlocks - Number of confirmations required (default: 1)
 * @returns {Promise<object>} Settlement verification result
 */
async function verifySettlement(proof, options = {}) {
  const {
    requireOnChainConfirmation = process.env.REQUIRE_ON_CHAIN_CONFIRMATION === 'true',
    confirmationBlocks = parseInt(process.env.CONFIRMATION_BLOCKS || '1')
  } = options;

  // Validate proof structure
  if (!proof || !proof.txHash) {
    return { verified: false, error: 'Invalid proof: missing txHash' };
  }

  // Step 1: Try facilitator verification first (fastest, gasless)
  if (proof.facilitatorSig && FACILITATOR_URL) {
    try {
      const facilitatorResponse = await axios.post(
        `${FACILITATOR_URL}/verify`,
        {
          txHash: proof.txHash,
          chain: proof.chain,
          signature: proof.facilitatorSig,
          payer: proof.payer,
          amount: proof.amount,
          currency: proof.currency
        },
        {
          timeout: 10000, // 10s timeout for facilitator
          validateStatus: (status) => status >= 200 && status < 500,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (facilitatorResponse.status === 200 && facilitatorResponse.data) {
        const facilitatorData = facilitatorResponse.data;
        
        // Facilitator verified the payment
        if (facilitatorData.verified === true || facilitatorData.status === 'verified') {
          // If on-chain confirmation required, verify on-chain as well
          if (requireOnChainConfirmation) {
            try {
              const onChainVerification = await blockchainPaymentService.verifyTransaction(
                proof.txHash,
                proof.chain,
                proof.recipient,
                proof.amount
              );
              
              if (onChainVerification.verified) {
                return {
                  verified: true,
                  method: 'facilitator+on-chain',
                  blockNumber: onChainVerification.blockNumber || facilitatorData.blockNumber || 'pending',
                  facilitatorData: facilitatorData,
                  onChainVerification: onChainVerification,
                  confirmations: onChainVerification.confirmations || facilitatorData.confirmations || 0,
                  timestamp: facilitatorData.timestamp || new Date().toISOString()
                };
              }
            } catch (onChainError) {
              console.warn('[x402] On-chain verification failed after facilitator verification:', onChainError.message);
            }
          }
          
          return { 
            verified: true, 
            method: 'facilitator', 
            blockNumber: facilitatorData.blockNumber || facilitatorData.block || 'pending',
            facilitatorData: facilitatorData,
            facilitatorTxHash: facilitatorData.facilitatorTxHash,
            timestamp: facilitatorData.timestamp || new Date().toISOString(),
            confirmations: facilitatorData.confirmations || 0
          };
        }
        
        // Facilitator returned pending status
        if (facilitatorData.status === 'pending' && !requireOnChainConfirmation) {
          return {
            verified: true,
            method: 'facilitator-pending',
            blockNumber: 'pending',
            facilitatorData: facilitatorData,
            note: 'Payment submitted via facilitator, awaiting on-chain confirmation'
          };
        }
      }
    } catch (error) {
      // Log but don't fail - fall back to on-chain verification
      console.warn('[x402] Facilitator verification failed, falling back to on-chain:', error.message);
      if (error.response) {
        console.warn('[x402] Facilitator response:', error.response.status, error.response.data);
      }
    }
  }

  // Step 2: Verify on-chain using blockchain payment service
  try {
    const onChainVerification = await blockchainPaymentService.verifyTransaction(
      proof.txHash,
      proof.chain,
      proof.recipient,
      proof.amount
    );
    
    if (onChainVerification.verified) {
      return {
        verified: true,
        method: 'on-chain',
        blockNumber: onChainVerification.blockNumber || 'pending',
        chain: proof.chain,
        confirmations: onChainVerification.confirmations || 0,
        status: onChainVerification.status || 'success',
        gasUsed: onChainVerification.gasUsed,
        pending: onChainVerification.pending || false
      };
    } else {
      return {
        verified: false,
        error: onChainVerification.error || 'On-chain verification failed',
        method: 'on-chain',
        chain: proof.chain,
        txHash: proof.txHash
      };
    }
  } catch (error) {
    console.error('[x402] On-chain verification error:', error.message);
    
    // Fallback: validate transaction hash format
    const txHashPattern = /^0x[a-fA-F0-9]{64}$/;
    const isEVMChain = proof.txHash && txHashPattern.test(proof.txHash);
    const isSolanaChain = proof.txHash && 
      proof.txHash.length >= 32 && 
      proof.txHash.length <= 128 &&
      !proof.txHash.startsWith('0x') &&
      /^[A-Za-z0-9]+$/.test(proof.txHash);
    
    if (isEVMChain || isSolanaChain) {
      // Format is valid, but couldn't verify on-chain
      // In production, this should fail, but for demo we allow it
      const allowFormatOnly = process.env.ALLOW_FORMAT_ONLY_VERIFICATION === 'true';
      
      if (allowFormatOnly) {
        return {
          verified: true,
          method: 'format-validation',
          blockNumber: 'pending',
          chain: proof.chain,
          note: 'Transaction hash format validated (on-chain verification unavailable)',
          warning: 'On-chain verification failed, using format validation only'
        };
      }
    }
    
    return {
      verified: false,
      error: error.message || 'Settlement verification failed',
      details: {
        txHash: proof.txHash,
        chain: proof.chain,
        error: error.message
      }
    };
  }
}

// Payment Evidence KA creation and publishing moved to payment-evidence-publisher.js

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'x402-gateway',
    version: X402_VERSION,
    facilitator: FACILITATOR_URL
  });
});

/**
 * Canonical x402 endpoint: Request resource → 402 with payment terms → retry with X-PAYMENT → serve resource
 */
app.get('/api/verified-creators', async (req, res) => {
  const policy = accessPolicies['verified-creators'];
  const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof']; // Support both for compatibility
  
  // Check if payment proof provided
  if (xPaymentHeader) {
    try {
      const proof = typeof xPaymentHeader === 'string' 
        ? JSON.parse(xPaymentHeader) 
        : xPaymentHeader;
      
      // Validate payment proof
      const validation = validatePaymentProof(proof, proof.challenge);
      if (!validation.valid) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          message: validation.error,
          paymentRequest
        });
      }

      // Verify settlement with enhanced verification
      const settlement = await verifySettlement(proof, {
        requireOnChainConfirmation: process.env.REQUIRE_ON_CHAIN_CONFIRMATION === 'true',
        confirmationBlocks: parseInt(process.env.CONFIRMATION_BLOCKS || '1')
      });
      
      if (!settlement.verified) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          code: 'SETTLEMENT_NOT_VERIFIED',
          message: settlement.error || 'Payment settlement not verified',
          paymentRequest,
          settlementDetails: settlement,
          retryable: true
        });
      }

      // Reputation-based validation (if enabled)
      if (ENABLE_REPUTATION_FILTER) {
        const reputationValidation = await validateTransactionWithReputation(
          proof.payer,
          policy.recipient,
          proof.amount,
          policy.resourceUAL,
          EDGE_PUBLISH_URL,
          {
            minReputationScore: parseFloat(process.env.MIN_REPUTATION_SCORE || '0'),
            minPaymentCount: parseInt(process.env.MIN_PAYMENT_COUNT || '0'),
            requireVerifiedIdentity: process.env.REQUIRE_VERIFIED_IDENTITY === 'true'
          }
        );

        if (!reputationValidation.allowed) {
          const challenge = generateChallenge();
          const paymentRequest = createPaymentRequest(policy, challenge);
          
          res.status(403).setHeader('Retry-After', '60');
          return res.json({
            error: 'Transaction Not Allowed',
            message: reputationValidation.reason,
            reputationCheck: reputationValidation,
            paymentRequest // Allow retry with different account
          });
        }
      }

      // Mark as settled (prevent replay)
      paymentSettlements.set(proof.txHash, {
        ...settlement,
        timestamp: Date.now()
      });
      paymentProofs.set(proof.txHash, proof);

      // Publish Payment Evidence KA to DKG using improved publisher
      const paymentData = {
        txHash: proof.txHash,
        payer: proof.payer,
        recipient: policy.recipient,
        amount: proof.amount,
        currency: proof.currency,
        chain: proof.chain,
        resourceUAL: policy.resourceUAL,
        challenge: proof.challenge,
        facilitatorSig: proof.facilitatorSig,
        signature: proof.signature,
        blockNumber: settlement.blockNumber,
        timestamp: new Date().toISOString()
      };
      
      const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

      // Query DKG for safe creators (mock for demo)
      const safeCreators = [
        {
          creator: 'did:dkg:creator:alice',
          name: 'Alice Developer',
          safetyScore: 0.95,
          totalVerifications: 25,
          reputationScore: 0.88
        },
        {
          creator: 'did:dkg:creator:bob',
          name: 'Bob Creator',
          safetyScore: 0.93,
          totalVerifications: 18,
          reputationScore: 0.85
        },
        {
          creator: 'did:dkg:creator:charlie',
          name: 'Charlie Verified',
          safetyScore: 0.91,
          totalVerifications: 12,
          reputationScore: 0.82
        }
      ];

      // Return resource with payment evidence UAL
      return res.json({
        resource: 'verified-creators',
        creators: safeCreators,
        paymentEvidence: {
          ual: publishResult.ual,
          txHash: proof.txHash,
          chain: proof.chain,
          verified: true,
          dkgTransactionHash: publishResult.transactionHash
        },
        reputationCheck: ENABLE_REPUTATION_FILTER ? {
          allowed: true,
          payerReputation: 'verified'
        } : undefined,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      
      res.status(402).setHeader('Retry-After', '60');
      return res.json({
        error: 'Payment Required',
        message: 'Invalid payment proof format',
        paymentRequest
      });
    }
  }

  // Return 402 Payment Required with payment terms
  const challenge = generateChallenge();
  const paymentRequest = createPaymentRequest(policy, challenge);
  
  res.status(402).setHeader('Retry-After', '60');
  res.json({
    error: 'Payment Required',
    paymentRequest,
    message: 'Include X-PAYMENT header with payment transaction proof to access this resource'
  });
});

/**
 * Generic x402-protected endpoint
 */
app.get('/api/:resource', async (req, res) => {
  const { resource } = req.params;
  const policy = accessPolicies[resource];
  
  if (!policy) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
  
  if (xPaymentHeader) {
    try {
      const proof = typeof xPaymentHeader === 'string' 
        ? JSON.parse(xPaymentHeader) 
        : xPaymentHeader;
      
      const validation = validatePaymentProof(proof, proof.challenge);
      if (!validation.valid) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          message: validation.error,
          paymentRequest
        });
      }

      const settlement = await verifySettlement(proof);
      if (!settlement.verified) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest(policy, challenge);
        res.status(402).setHeader('Retry-After', '60');
        return res.json({
          error: 'Payment Required',
          message: 'Payment settlement not verified',
          paymentRequest
        });
      }

      // Reputation-based validation (if enabled)
      if (ENABLE_REPUTATION_FILTER) {
        const reputationValidation = await validateTransactionWithReputation(
          proof.payer,
          policy.recipient,
          proof.amount,
          policy.resourceUAL,
          EDGE_PUBLISH_URL
        );

        if (!reputationValidation.allowed) {
          const challenge = generateChallenge();
          const paymentRequest = createPaymentRequest(policy, challenge);
          res.status(403).setHeader('Retry-After', '60');
          return res.json({
            error: 'Transaction Not Allowed',
            message: reputationValidation.reason,
            reputationCheck: reputationValidation,
            paymentRequest
          });
        }
      }

      // Store settlement with enhanced replay protection
      paymentSettlements.set(proof.txHash, { 
        ...settlement, 
        timestamp: Date.now(),
        challenge: proof.challenge,
        resourceId: challengeData.policy.resourceUAL,
        payer: proof.payer
      });
      paymentProofs.set(proof.txHash, proof);
      
      // Also store by nonce if provided (additional replay protection)
      if (proof.nonce) {
        const nonceKey = `nonce:${proof.nonce}:${proof.payer}`;
        paymentSettlements.set(nonceKey, {
          ...settlement,
          timestamp: Date.now(),
          challenge: proof.challenge,
          txHash: proof.txHash,
          nonce: proof.nonce
        });
      }

      // Publish Payment Evidence KA using improved publisher
      const paymentData = {
        txHash: proof.txHash,
        payer: proof.payer,
        recipient: policy.recipient,
        amount: proof.amount,
        currency: proof.currency,
        chain: proof.chain,
        resourceUAL: policy.resourceUAL,
        challenge: proof.challenge,
        facilitatorSig: proof.facilitatorSig,
        signature: proof.signature,
        blockNumber: settlement.blockNumber,
        timestamp: new Date().toISOString()
      };
      
      const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

      return res.json({
        resource: resource,
        content: {
          type: 'protectedResource',
          data: `Content for ${resource}`,
          verified: true
        },
        paymentEvidence: {
          ual: publishResult.ual,
          txHash: proof.txHash,
          chain: proof.chain
        }
      });
    } catch (error) {
      console.error('Error processing payment:', error);
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      res.status(402).setHeader('Retry-After', '60');
      return res.json({
        error: 'Payment Required',
        message: 'Invalid payment proof format',
        paymentRequest
      });
    }
  }

  // Return 402
  const challenge = generateChallenge();
  const paymentRequest = createPaymentRequest(policy, challenge);
  res.status(402).setHeader('Retry-After', '60');
  res.json({
    error: 'Payment Required',
    paymentRequest
  });
});

/**
 * Get payment evidence by UAL or txHash
 */
app.get('/payment-evidence/:identifier', (req, res) => {
  const { identifier } = req.params;
  
  // Try to find by txHash
  const proof = paymentProofs.get(identifier);
  if (proof) {
    return res.json({
      identifier,
      proof,
      message: 'Query DKG for full Payment Evidence KA',
      dkgEndpoint: `${EDGE_PUBLISH_URL}/asset/${identifier}`
    });
  }

  res.json({
    identifier,
    message: 'Payment evidence not found locally. Query DKG for full details.',
    dkgEndpoint: `${EDGE_PUBLISH_URL}/asset/${identifier}`
  });
});

/**
 * Payment statistics endpoint
 */
app.get('/stats', (req, res) => {
  res.json({
    totalChallenges: paymentChallenges.size,
    totalSettlements: paymentSettlements.size,
    totalProofs: paymentProofs.size,
    version: X402_VERSION,
    facilitator: FACILITATOR_URL
  });
});

/**
 * E-Commerce: Pay-to-unlock product provenance
 * 
 * Flow: Buyer requests provenance → 402 with x402 terms → Buyer pays →
 * Payment Evidence KA published → Provenance returned
 */
app.get('/api/ecommerce/product/:productUAL/provenance', async (req, res) => {
  const { productUAL } = req.params;
  const policy = accessPolicies['product-provenance'];
  const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
  
  if (xPaymentHeader) {
    try {
      const proof = typeof xPaymentHeader === 'string' 
        ? JSON.parse(xPaymentHeader) 
        : xPaymentHeader;
      
      const validation = validatePaymentProof(proof, proof.challenge);
      if (!validation.valid) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest({ ...policy, resourceUAL: `ual:org:dkgreputation:product:${productUAL}` }, challenge);
        res.status(402).json({ error: 'Payment Required', message: validation.error, paymentRequest });
        return;
      }

      const settlement = await verifySettlement(proof);
      if (!settlement.verified) {
        const challenge = generateChallenge();
        const paymentRequest = createPaymentRequest({ ...policy, resourceUAL: `ual:org:dkgreputation:product:${productUAL}` }, challenge);
        res.status(402).json({ error: 'Payment Required', message: 'Payment settlement not verified', paymentRequest });
        return;
      }

      // Mark as settled
      // Store settlement with enhanced replay protection
      paymentSettlements.set(proof.txHash, { 
        ...settlement, 
        timestamp: Date.now(),
        challenge: proof.challenge,
        resourceId: challengeData.policy.resourceUAL,
        payer: proof.payer
      });
      paymentProofs.set(proof.txHash, proof);
      
      // Also store by nonce if provided (additional replay protection)
      if (proof.nonce) {
        const nonceKey = `nonce:${proof.nonce}:${proof.payer}`;
        paymentSettlements.set(nonceKey, {
          ...settlement,
          timestamp: Date.now(),
          challenge: proof.challenge,
          txHash: proof.txHash,
          nonce: proof.nonce
        });
      }

      // Publish Payment Evidence KA
      const paymentData = {
        txHash: proof.txHash,
        payer: proof.payer,
        recipient: policy.recipient,
        amount: proof.amount,
        currency: proof.currency,
        chain: proof.chain,
        resourceUAL: `ual:org:dkgreputation:product:${productUAL}`,
        challenge: proof.challenge,
        facilitatorSig: proof.facilitatorSig,
        signature: proof.signature,
        blockNumber: settlement.blockNumber,
        timestamp: new Date().toISOString()
      };
      
      const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

      // Query provenance from DKG (mock for demo)
      const provenance = {
        productUAL: productUAL,
        supplyChain: [
          { step: 'Manufacturing', location: 'Factory A', timestamp: '2025-01-15T10:00:00Z' },
          { step: 'Quality Check', location: 'QC Lab', timestamp: '2025-01-16T14:30:00Z' },
          { step: 'Shipping', location: 'Warehouse B', timestamp: '2025-01-18T09:00:00Z' }
        ],
        authenticity: {
          verified: true,
          verificationUAL: 'urn:ual:dotrep:authenticity:product:123',
          timestamp: new Date().toISOString()
        }
      };

      return res.json({
        success: true,
        productUAL,
        provenance,
        paymentEvidence: {
          ual: publishResult.ual,
          txHash: proof.txHash,
          chain: proof.chain,
          verified: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing provenance unlock:', error);
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest({ ...policy, resourceUAL: `ual:org:dkgreputation:product:${productUAL}` }, challenge);
      res.status(402).json({ error: 'Payment Required', message: 'Invalid payment proof', paymentRequest });
    }
  }

  // Return 402 Payment Required
  const challenge = generateChallenge();
  const paymentRequest = createPaymentRequest({ ...policy, resourceUAL: `ual:org:dkgreputation:product:${productUAL}` }, challenge);
  res.status(402).setHeader('Retry-After', '60');
  res.json({
    error: 'Payment Required',
    paymentRequest,
    message: `Pay ${policy.amount} ${policy.currency} to unlock provenance for product ${productUAL}`
  });
});

/**
 * E-Commerce: Initiate escrow purchase
 * 
 * POST /api/ecommerce/escrow/purchase
 * Body: { productUAL, buyer, seller, price: { amount, currency }, deliveryVerification: {...} }
 */
app.post('/api/ecommerce/escrow/purchase', async (req, res) => {
  try {
    const { productUAL, buyer, seller, price, deliveryVerification } = req.body;

    if (!productUAL || !buyer || !seller || !price) {
      return res.status(400).json({ error: 'Missing required fields: productUAL, buyer, seller, price' });
    }

    // In production, would use ECommerceService
    // For now, create exchange record
    const exchangeId = `escrow-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    
    console.log(`💰 Escrow purchase initiated: ${exchangeId}`);
    console.log(`   Product: ${productUAL}`);
    console.log(`   Buyer: ${buyer} → Seller: ${seller}`);
    console.log(`   Amount: ${price.amount} ${price.currency}`);

    // Return escrow details
    res.json({
      success: true,
      exchangeId,
      status: 'pending',
      escrowAddress: `0x${crypto.randomBytes(20).toString('hex')}`, // Mock escrow address
      message: 'Escrow purchase initiated. Payment required to proceed.',
      paymentRequest: {
        x402: X402_VERSION,
        amount: price.amount,
        currency: price.currency,
        recipient: seller,
        chains: ['base', 'neuroweb-evm'],
        facilitator: FACILITATOR_URL,
        challenge: `escrow-${exchangeId}`,
        resourceUAL: productUAL
      }
    });
  } catch (error) {
    console.error('Error initiating escrow purchase:', error);
    res.status(500).json({ error: 'Failed to initiate escrow purchase', message: error.message });
  }
});

/**
 * E-Commerce: Submit delivery evidence
 * 
 * POST /api/ecommerce/escrow/:exchangeId/delivery
 * Body: { trackingNumber, images, deliveredAt, buyerConfirmed }
 */
app.post('/api/ecommerce/escrow/:exchangeId/delivery', async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { trackingNumber, images, deliveredAt, buyerConfirmed } = req.body;

    console.log(`📦 Processing delivery evidence for exchange: ${exchangeId}`);

    // In production, would:
    // 1. Verify images with Umanitek
    // 2. Submit to FairExchangeProtocol
    // 3. Auto-release escrow if verified

    res.json({
      success: true,
      exchangeId,
      status: buyerConfirmed ? 'completed' : 'delivery_initiated',
      message: buyerConfirmed 
        ? 'Delivery confirmed. Escrow funds released.'
        : 'Delivery evidence submitted. Awaiting buyer confirmation.',
      deliveryEvidenceUAL: `urn:ual:dotrep:delivery:${exchangeId}`
    });
  } catch (error) {
    console.error('Error processing delivery evidence:', error);
    res.status(500).json({ error: 'Failed to process delivery evidence', message: error.message });
  }
});

/**
 * Pay-per-API: Get top-N reputable users by category
 * GET /api/top-reputable-users?category=tech&limit=10
 */
app.get('/api/top-reputable-users', async (req, res) => {
  const policy = accessPolicies['top-reputable-users'];
  const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
  const { category = 'all', limit = 10 } = req.query;
  
  if (!xPaymentHeader) {
    const challenge = generateChallenge();
    const paymentRequest = createPaymentRequest(policy, challenge);
    res.status(402).setHeader('Retry-After', '60');
    return res.json({
      error: 'Payment Required',
      paymentRequest,
      message: 'Pay $0.01 to access top reputable users list'
    });
  }

  try {
    const proof = typeof xPaymentHeader === 'string' ? JSON.parse(xPaymentHeader) : xPaymentHeader;
    const validation = validatePaymentProof(proof, proof.challenge);
    
    if (!validation.valid) {
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      res.status(402).json({ error: 'Payment Required', message: validation.error, paymentRequest });
      return;
    }

    const settlement = await verifySettlement(proof);
    if (!settlement.verified) {
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      res.status(402).json({ error: 'Payment Required', message: 'Payment not verified', paymentRequest });
      return;
    }

    paymentSettlements.set(proof.txHash, { ...settlement, timestamp: Date.now() });
    paymentProofs.set(proof.txHash, proof);

    const paymentData = {
      txHash: proof.txHash,
      payer: proof.payer,
      recipient: policy.recipient,
      amount: proof.amount,
      currency: proof.currency,
      chain: proof.chain,
      resourceUAL: policy.resourceUAL,
      challenge: proof.challenge,
      facilitatorSig: proof.facilitatorSig,
      signature: proof.signature,
      blockNumber: settlement.blockNumber,
      timestamp: new Date().toISOString()
    };
    
    const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

    // Query top users from DKG (mock for demo - would query actual DKG)
    const topUsers = [
      { account: 'did:dkg:user:alice', reputation: 0.95, category: 'tech', endorsements: 42 },
      { account: 'did:dkg:user:bob', reputation: 0.92, category: 'tech', endorsements: 38 },
      { account: 'did:dkg:user:charlie', reputation: 0.89, category: 'tech', endorsements: 35 },
      { account: 'did:dkg:user:diana', reputation: 0.87, category: 'finance', endorsements: 31 },
      { account: 'did:dkg:user:eve', reputation: 0.85, category: 'finance', endorsements: 28 }
    ].filter(u => category === 'all' || u.category === category)
     .slice(0, parseInt(limit));

    res.json({
      resource: 'top-reputable-users',
      category,
      limit: parseInt(limit),
      users: topUsers,
      paymentEvidence: {
        ual: publishResult.ual,
        txHash: proof.txHash,
        chain: proof.chain,
        verified: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing request:', error);
    const challenge = generateChallenge();
    const paymentRequest = createPaymentRequest(policy, challenge);
    res.status(402).json({ error: 'Payment Required', message: 'Invalid payment', paymentRequest });
  }
});

/**
 * Pay-per-API: Get detailed reputation profile for a user
 * GET /api/user-reputation-profile?account=did:dkg:user:alice
 */
app.get('/api/user-reputation-profile', async (req, res) => {
  const policy = accessPolicies['user-reputation-profile'];
  const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
  const { account } = req.query;
  
  if (!account) {
    return res.status(400).json({ error: 'Missing required parameter: account' });
  }

  if (!xPaymentHeader) {
    const challenge = generateChallenge();
    const paymentRequest = createPaymentRequest(policy, challenge);
    res.status(402).setHeader('Retry-After', '60');
    return res.json({
      error: 'Payment Required',
      paymentRequest,
      message: 'Pay $0.05 to access detailed reputation profile'
    });
  }

  try {
    const proof = typeof xPaymentHeader === 'string' ? JSON.parse(xPaymentHeader) : xPaymentHeader;
    const validation = validatePaymentProof(proof, proof.challenge);
    
    if (!validation.valid) {
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      res.status(402).json({ error: 'Payment Required', message: validation.error, paymentRequest });
      return;
    }

    const settlement = await verifySettlement(proof);
    if (!settlement.verified) {
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      res.status(402).json({ error: 'Payment Required', message: 'Payment not verified', paymentRequest });
      return;
    }

    paymentSettlements.set(proof.txHash, { ...settlement, timestamp: Date.now() });
    paymentProofs.set(proof.txHash, proof);

    const paymentData = {
      txHash: proof.txHash,
      payer: proof.payer,
      recipient: policy.recipient,
      amount: proof.amount,
      currency: proof.currency,
      chain: proof.chain,
      resourceUAL: policy.resourceUAL,
      challenge: proof.challenge,
      facilitatorSig: proof.facilitatorSig,
      signature: proof.signature,
      blockNumber: settlement.blockNumber,
      timestamp: new Date().toISOString()
    };
    
    const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

    // Query detailed profile from DKG (mock for demo)
    const profile = {
      account,
      reputationScore: 0.95,
      trustMetrics: {
        paymentWeightedScore: 0.94,
        endorsementCount: 42,
        verificationCount: 18,
        totalPaymentsReceived: 1250.50,
        avgPayerReputation: 0.88
      },
      categories: ['tech', 'developer', 'blockchain'],
      verifiedIdentity: true,
      paymentHistory: {
        totalTransactions: 156,
        successfulTransactions: 154,
        disputeRate: 0.01
      },
      provenanceUAL: `urn:ual:dotrep:profile:${account}`,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      resource: 'user-reputation-profile',
      account,
      profile,
      paymentEvidence: {
        ual: publishResult.ual,
        txHash: proof.txHash,
        chain: proof.chain,
        verified: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing request:', error);
    const challenge = generateChallenge();
    const paymentRequest = createPaymentRequest(policy, challenge);
    res.status(402).json({ error: 'Payment Required', message: 'Invalid payment', paymentRequest });
  }
});

/**
 * Quality Data: Verified info service
 * POST /api/verified-info
 * Body: { query: "What is the current price of Bitcoin?", sourceReputation: 0.8 }
 */
app.post('/api/verified-info', async (req, res) => {
  const policy = accessPolicies['verified-info'];
  const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
  const { query, sourceReputation = 0.8 } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Missing required field: query' });
  }

  if (!xPaymentHeader) {
    const challenge = generateChallenge();
    const paymentRequest = createPaymentRequest(policy, challenge);
    res.status(402).setHeader('Retry-After', '60');
    return res.json({
      error: 'Payment Required',
      paymentRequest,
      message: 'Pay $0.01 to access verified information'
    });
  }

  try {
    const proof = typeof xPaymentHeader === 'string' ? JSON.parse(xPaymentHeader) : xPaymentHeader;
    const validation = validatePaymentProof(proof, proof.challenge);
    
    if (!validation.valid) {
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      res.status(402).json({ error: 'Payment Required', message: validation.error, paymentRequest });
      return;
    }

    const settlement = await verifySettlement(proof);
    if (!settlement.verified) {
      const challenge = generateChallenge();
      const paymentRequest = createPaymentRequest(policy, challenge);
      res.status(402).json({ error: 'Payment Required', message: 'Payment not verified', paymentRequest });
      return;
    }

    paymentSettlements.set(proof.txHash, { ...settlement, timestamp: Date.now() });
    paymentProofs.set(proof.txHash, proof);

    const paymentData = {
      txHash: proof.txHash,
      payer: proof.payer,
      recipient: policy.recipient,
      amount: proof.amount,
      currency: proof.currency,
      chain: proof.chain,
      resourceUAL: policy.resourceUAL,
      challenge: proof.challenge,
      facilitatorSig: proof.facilitatorSig,
      signature: proof.signature,
      blockNumber: settlement.blockNumber,
      timestamp: new Date().toISOString()
    };
    
    const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

    // Query verified info from DKG (mock for demo)
    const verifiedInfo = {
      query,
      answer: 'Bitcoin price: $43,250 (verified from 3 high-reputation sources)',
      sources: [
        { account: 'did:dkg:source:coinbase', reputation: 0.95, confidence: 0.98 },
        { account: 'did:dkg:source:binance', reputation: 0.93, confidence: 0.96 },
        { account: 'did:dkg:source:reuters', reputation: 0.91, confidence: 0.94 }
      ],
      provenanceUAL: `urn:ual:dotrep:verified-info:${crypto.createHash('sha256').update(query).digest('hex')}`,
      minSourceReputation: sourceReputation,
      verifiedAt: new Date().toISOString()
    };

    res.json({
      resource: 'verified-info',
      query,
      result: verifiedInfo,
      paymentEvidence: {
        ual: publishResult.ual,
        txHash: proof.txHash,
        chain: proof.chain,
        verified: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing request:', error);
    const challenge = generateChallenge();
    const paymentRequest = createPaymentRequest(policy, challenge);
    res.status(402).json({ error: 'Payment Required', message: 'Invalid payment', paymentRequest });
  }
});

/**
 * Data Marketplace: Discover data products
 * GET /api/marketplace/discover?type=dataset&minReputation=0.8&limit=20
 */
app.get('/api/marketplace/discover', async (req, res) => {
  const { type, minReputation = 0.7, limit = 20, category } = req.query;
  
  // Discovery is free, but listing details may require payment
  try {
    // Query marketplace (mock for demo - would integrate with DataMarketplace service)
    const products = [
      {
        ual: 'urn:ual:dotrep:product:dataset:tech-trends-2025',
        name: 'Tech Trends 2025 Dataset',
        type: 'dataset',
        provider: 'did:dkg:provider:tech-analyst',
        providerReputation: 0.92,
        price: { amount: '10.00', currency: 'USDC' },
        qualityScore: 0.89,
        endorsementCount: 15,
        description: 'Comprehensive tech trends analysis for 2025'
      },
      {
        ual: 'urn:ual:dotrep:product:report:market-analysis',
        name: 'Q4 2025 Market Analysis Report',
        type: 'report',
        provider: 'did:dkg:provider:finance-expert',
        providerReputation: 0.88,
        price: { amount: '25.00', currency: 'USDC' },
        qualityScore: 0.87,
        endorsementCount: 12,
        description: 'Detailed market analysis with predictions'
      }
    ].filter(p => {
      if (type && p.type !== type) return false;
      if (p.providerReputation < parseFloat(minReputation)) return false;
      return true;
    }).slice(0, parseInt(limit));

    res.json({
      resource: 'marketplace-discovery',
      filters: { type, minReputation, category, limit },
      products,
      totalFound: products.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error discovering products:', error);
    res.status(500).json({ error: 'Failed to discover products', message: error.message });
  }
});

/**
 * Data Marketplace: Purchase data product via x402
 * POST /api/marketplace/purchase
 * Body: { productUAL, buyer, paymentMethod: 'x402' }
 */
app.post('/api/marketplace/purchase', async (req, res) => {
  const { productUAL, buyer, paymentMethod = 'x402' } = req.body;
  
  if (!productUAL || !buyer) {
    return res.status(400).json({ error: 'Missing required fields: productUAL, buyer' });
  }

  // Get product details (mock)
  const product = {
    ual: productUAL,
    name: 'Tech Trends 2025 Dataset',
    provider: 'did:dkg:provider:tech-analyst',
    price: { amount: '10.00', currency: 'USDC' },
    providerReputation: 0.92
  };

  // For x402 payment, require payment proof
  if (paymentMethod === 'x402') {
    const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
    
    if (!xPaymentHeader) {
      const challenge = generateChallenge();
      const paymentRequest = {
        x402: X402_VERSION,
        amount: product.price.amount,
        currency: product.price.currency,
        recipient: product.provider, // Direct payment to provider
        chains: ['base', 'solana'],
        facilitator: FACILITATOR_URL,
        challenge: challenge,
        expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        resourceUAL: productUAL,
        description: `Purchase ${product.name}`
      };
      
      res.status(402).setHeader('Retry-After', '60');
      return res.json({
        error: 'Payment Required',
        paymentRequest,
        message: `Pay ${product.price.amount} ${product.price.currency} to purchase this data product`
      });
    }

    try {
      const proof = typeof xPaymentHeader === 'string' ? JSON.parse(xPaymentHeader) : xPaymentHeader;
      
      // Verify payment matches product price
      if (proof.amount !== product.price.amount || proof.currency !== product.price.currency) {
        return res.status(400).json({ 
          error: 'Payment Mismatch', 
          message: `Expected ${product.price.amount} ${product.price.currency}, got ${proof.amount} ${proof.currency}` 
        });
      }

      // Validate and verify payment
      const validation = validatePaymentProof(proof, proof.challenge);
      if (!validation.valid) {
        return res.status(402).json({ error: 'Payment Required', message: validation.error });
      }

      const settlement = await verifySettlement(proof);
      if (!settlement.verified) {
        return res.status(402).json({ error: 'Payment Required', message: 'Payment not verified' });
      }

      // Store settlement with enhanced replay protection
      paymentSettlements.set(proof.txHash, { 
        ...settlement, 
        timestamp: Date.now(),
        challenge: proof.challenge,
        resourceId: challengeData.policy.resourceUAL,
        payer: proof.payer
      });
      paymentProofs.set(proof.txHash, proof);
      
      // Also store by nonce if provided (additional replay protection)
      if (proof.nonce) {
        const nonceKey = `nonce:${proof.nonce}:${proof.payer}`;
        paymentSettlements.set(nonceKey, {
          ...settlement,
          timestamp: Date.now(),
          challenge: proof.challenge,
          txHash: proof.txHash,
          nonce: proof.nonce
        });
      }

      // Publish Payment Evidence KA
      const paymentData = {
        txHash: proof.txHash,
        payer: buyer,
        recipient: product.provider,
        amount: proof.amount,
        currency: proof.currency,
        chain: proof.chain,
        resourceUAL: productUAL,
        challenge: proof.challenge,
        facilitatorSig: proof.facilitatorSig,
        signature: proof.signature,
        blockNumber: settlement.blockNumber,
        timestamp: new Date().toISOString()
      };
      
      const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

      // Return purchase confirmation with data access
      res.json({
        success: true,
        purchaseId: `purchase-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        productUAL,
        productName: product.name,
        paymentEvidence: {
          ual: publishResult.ual,
          txHash: proof.txHash,
          chain: proof.chain,
          verified: true
        },
        dataAccess: {
          downloadUrl: `https://marketplace.dotrep.io/download/${productUAL}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          accessToken: crypto.randomBytes(32).toString('hex')
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error processing purchase:', error);
      res.status(500).json({ error: 'Failed to process purchase', message: error.message });
    }
  } else {
    // Other payment methods (escrow, smart contract, etc.)
    res.status(501).json({ error: 'Not Implemented', message: `Payment method ${paymentMethod} not yet implemented` });
  }
});

/**
 * Agent-Driven E-Commerce: AI agent purchases with reputation verification
 * POST /api/agent/purchase
 * Body: { productUAL, agentId, buyer, maxPrice, minSellerReputation }
 */
app.post('/api/agent/purchase', async (req, res) => {
  const { productUAL, agentId, buyer, maxPrice, minSellerReputation = 0.8 } = req.body;
  
  if (!productUAL || !buyer) {
    return res.status(400).json({ error: 'Missing required fields: productUAL, buyer' });
  }

  // Get product details and verify seller reputation
  const product = {
    ual: productUAL,
    name: 'Q4 2025 Digital Marketing Trends Report',
    seller: 'did:dkg:seller:marketing-expert',
    sellerReputation: 0.94,
    price: { amount: '15.00', currency: 'USDC' },
    description: 'Comprehensive digital marketing trends analysis'
  };

  // Verify seller reputation meets minimum
  if (product.sellerReputation < minSellerReputation) {
    return res.status(403).json({
      error: 'Seller Reputation Insufficient',
      message: `Seller reputation ${product.sellerReputation} below required ${minSellerReputation}`,
      sellerReputation: product.sellerReputation,
      required: minSellerReputation
    });
  }

  // Check if price is within agent's budget
  if (maxPrice && parseFloat(product.price.amount) > parseFloat(maxPrice)) {
    return res.status(400).json({
      error: 'Price Exceeds Budget',
      message: `Product price ${product.price.amount} exceeds maximum ${maxPrice}`,
      productPrice: product.price.amount,
      maxPrice
    });
  }

  // Require x402 payment
  const xPaymentHeader = req.headers['x-payment'] || req.headers['x-payment-proof'];
  
  if (!xPaymentHeader) {
    const challenge = generateChallenge();
    const paymentRequest = {
      x402: X402_VERSION,
      amount: product.price.amount,
      currency: product.price.currency,
      recipient: product.seller,
      chains: ['base', 'solana'],
      facilitator: FACILITATOR_URL,
      challenge: challenge,
      expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      resourceUAL: productUAL,
      description: `Agent purchase: ${product.name}`,
      metadata: {
        agentId,
        buyer,
        sellerReputation: product.sellerReputation,
        purchaseType: 'agent-driven'
      }
    };
    
    res.status(402).setHeader('Retry-After', '60');
    return res.json({
      error: 'Payment Required',
      paymentRequest,
      message: `AI agent must pay ${product.price.amount} ${product.price.currency} to complete purchase`,
      productInfo: {
        name: product.name,
        sellerReputation: product.sellerReputation,
        verified: true
      }
    });
  }

  try {
    const proof = typeof xPaymentHeader === 'string' ? JSON.parse(xPaymentHeader) : xPaymentHeader;
    
    const validation = validatePaymentProof(proof, proof.challenge);
    if (!validation.valid) {
      return res.status(402).json({ error: 'Payment Required', message: validation.error });
    }

    const settlement = await verifySettlement(proof);
    if (!settlement.verified) {
      return res.status(402).json({ error: 'Payment Required', message: 'Payment not verified' });
    }

    paymentSettlements.set(proof.txHash, { ...settlement, timestamp: Date.now() });
    paymentProofs.set(proof.txHash, proof);

    // Publish Payment Evidence KA
    const paymentData = {
      txHash: proof.txHash,
      payer: buyer,
      recipient: product.seller,
      amount: proof.amount,
      currency: proof.currency,
      chain: proof.chain,
      resourceUAL: productUAL,
      challenge: proof.challenge,
      facilitatorSig: proof.facilitatorSig,
      signature: proof.signature,
      blockNumber: settlement.blockNumber,
      timestamp: new Date().toISOString()
    };
    
    const { publishResult } = await createAndPublishPaymentEvidence(paymentData, EDGE_PUBLISH_URL);

    // Return purchase confirmation
    res.json({
      success: true,
      purchaseId: `agent-purchase-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      agentId,
      productUAL,
      productName: product.name,
      seller: product.seller,
      sellerReputation: product.sellerReputation,
      paymentEvidence: {
        ual: publishResult.ual,
        txHash: proof.txHash,
        chain: proof.chain,
        verified: true
      },
      delivery: {
        reportUrl: `https://marketplace.dotrep.io/reports/${productUAL}`,
        accessToken: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      },
      timestamp: new Date().toISOString(),
      note: 'Autonomous agent purchase completed successfully'
    });
  } catch (error) {
    console.error('Error processing agent purchase:', error);
    res.status(500).json({ error: 'Failed to process agent purchase', message: error.message });
  }
});

// Initialize x402 utilities before starting server
initializeX402Utils();

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 x402 Payment Gateway v${X402_VERSION}`);
  console.log('='.repeat(60));
  console.log(`📍 Listening on port ${PORT}`);
  console.log(`🔗 Facilitator: ${FACILITATOR_URL}`);
  console.log(`📦 DKG Endpoint: ${EDGE_PUBLISH_URL}`);
  console.log(`🛡️  Reputation Filter: ${ENABLE_REPUTATION_FILTER ? 'ENABLED' : 'DISABLED'}`);
  console.log(`💰 Recipient: ${process.env.X402_RECIPIENT || 'NOT SET (using default)'}`);
  console.log(`📊 Resources: ${Object.keys(accessPolicies).length} access policies configured`);
  console.log('='.repeat(60));
  console.log(`\n🔐 Protected Resources:`);
  Object.keys(accessPolicies).forEach(resource => {
    const policy = accessPolicies[resource];
    console.log(`   - /api/${resource}: ${policy.amount} ${policy.currency}`);
  });
  console.log(`\n💰 Pay-per-API Endpoints:`);
  console.log(`   - GET  /api/top-reputable-users - Top-N users by category`);
  console.log(`   - GET  /api/user-reputation-profile - Detailed reputation profile`);
  console.log(`   - POST /api/verified-info - Verified information service`);
  console.log(`\n🛒 E-Commerce Endpoints:`);
  console.log(`   - GET  /api/ecommerce/product/:productUAL/provenance - Pay-to-unlock provenance`);
  console.log(`   - POST /api/ecommerce/escrow/purchase - Initiate escrow purchase`);
  console.log(`   - POST /api/ecommerce/escrow/:exchangeId/delivery - Submit delivery evidence`);
  console.log(`   - POST /api/agent/purchase - AI agent-driven purchase`);
  console.log(`\n📊 Data Marketplace Endpoints:`);
  console.log(`   - GET  /api/marketplace/discover - Discover data products`);
  console.log(`   - POST /api/marketplace/purchase - Purchase data product via x402`);
});

