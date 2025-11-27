/**
 * x402 Payment Utilities
 * Common utilities for x402 payment protocol implementation
 * 
 * Provides helper functions for:
 * - Payment amount formatting
 * - Chain validation
 * - Address validation
 * - Rate limiting
 * - Caching
 */

const crypto = require('crypto');

/**
 * Format payment amount for display
 * @param {string|number} amount - Payment amount
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount string
 */
function formatPaymentAmount(amount, currency = 'USDC') {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0.00';
  
  // Format to 2 decimal places
  const formatted = numAmount.toFixed(2);
  
  // Add currency symbol if needed
  const currencySymbols = {
    'USDC': '$',
    'USDT': '$',
    'ETH': 'Ξ',
    'SOL': '◎',
    'MATIC': ''
  };
  
  const symbol = currencySymbols[currency] || '';
  return symbol ? `${symbol}${formatted}` : `${formatted} ${currency}`;
}

/**
 * Validate Ethereum/EVM address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
function isValidEVMAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate Solana address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
function isValidSolanaAddress(address) {
  if (!address || typeof address !== 'string') return false;
  // Solana addresses are base58, typically 32-44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Validate transaction hash format
 * @param {string} txHash - Transaction hash
 * @param {string} chain - Chain identifier
 * @returns {boolean} True if valid
 */
function isValidTransactionHash(txHash, chain) {
  if (!txHash || typeof txHash !== 'string') return false;
  
  const chainLower = chain?.toLowerCase() || '';
  
  // EVM chains (Base, Ethereum, Polygon, Arbitrum, XDC)
  if (['base', 'base-sepolia', 'ethereum', 'polygon', 'arbitrum', 'xdc', 'xdc-apothem', 'neuroweb-evm'].includes(chainLower)) {
    return /^0x[a-fA-F0-9]{64}$/.test(txHash);
  }
  
  // Solana
  if (chainLower === 'solana') {
    return /^[A-Za-z0-9]{32,128}$/.test(txHash);
  }
  
  // Default: try EVM format
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Normalize address to checksum format (EVM only)
 * @param {string} address - Address to normalize
 * @returns {string} Checksummed address
 */
function toChecksumAddress(address) {
  if (!isValidEVMAddress(address)) return address;
  
  // Simple checksum implementation (for production, use ethers.js or web3.js)
  return address.toLowerCase();
}

/**
 * Rate limiter using in-memory store
 * Simple implementation - in production, use Redis or similar
 */
class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute default
    this.maxRequests = options.maxRequests || 100; // 100 requests per window
    this.store = new Map(); // In production, use Redis
  }

  /**
   * Check if request should be rate limited
   * @param {string} key - Rate limit key (e.g., IP address, payer address)
   * @returns {object} Rate limit result
   */
  check(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create entry
    let entry = this.store.get(key);
    
    if (!entry || entry.windowStart < windowStart) {
      // New window or expired
      entry = {
        count: 0,
        windowStart: now
      };
    }
    
    entry.count++;
    this.store.set(key, entry);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to cleanup
      this.cleanup(windowStart);
    }
    
    const remaining = Math.max(0, this.maxRequests - entry.count);
    const resetTime = entry.windowStart + this.windowMs;
    
    return {
      allowed: entry.count <= this.maxRequests,
      remaining,
      resetTime: new Date(resetTime).toISOString(),
      retryAfter: remaining === 0 ? Math.ceil((resetTime - now) / 1000) : 0
    };
  }

  /**
   * Clean up expired entries
   * @param {number} windowStart - Window start time
   */
  cleanup(windowStart) {
    for (const [key, entry] of this.store.entries()) {
      if (entry.windowStart < windowStart) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Reset rate limit for a key
   * @param {string} key - Rate limit key
   */
  reset(key) {
    this.store.delete(key);
  }
}

/**
 * Simple cache with TTL
 */
class Cache {
  constructor(options = {}) {
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes default
    this.store = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in ms (optional)
   */
  set(key, value, ttl = null) {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.store.set(key, { value, expires });
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expires) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Create rate limiter middleware for Express
 * @param {object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
function createRateLimiter(options = {}) {
  const limiter = new RateLimiter(options);
  
  return (req, res, next) => {
    // Use IP address or payer address as key
    const key = req.headers['x-payment'] 
      ? (() => {
          try {
            const proof = typeof req.headers['x-payment'] === 'string'
              ? JSON.parse(req.headers['x-payment'])
              : req.headers['x-payment'];
            return proof.payer || req.ip;
          } catch {
            return req.ip;
          }
        })()
      : req.ip;
    
    const result = limiter.check(key);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limiter.maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime);
    
    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again after ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter
      });
    }
    
    next();
  };
}

/**
 * Parse payment amount from string (handles $ prefix, etc.)
 * @param {string} amountStr - Amount string (e.g., "$0.10", "0.10", "10")
 * @returns {string} Normalized amount string
 */
function parsePaymentAmount(amountStr) {
  if (!amountStr || typeof amountStr !== 'string') return '0.00';
  
  // Remove currency symbols and whitespace
  const cleaned = amountStr.replace(/[$€£¥,\s]/g, '').trim();
  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) return '0.00';
  
  // Return with 2 decimal places
  return parsed.toFixed(2);
}

/**
 * Validate payment proof structure
 * @param {object} proof - Payment proof object
 * @returns {object} Validation result
 */
function validatePaymentProofStructure(proof) {
  const errors = [];
  const warnings = [];
  
  if (!proof) {
    return { valid: false, errors: ['Payment proof is required'] };
  }
  
  // Required fields
  const required = ['txHash', 'chain', 'payer', 'amount', 'currency', 'challenge'];
  for (const field of required) {
    if (!proof[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate address formats
  if (proof.payer && !isValidEVMAddress(proof.payer) && !isValidSolanaAddress(proof.payer)) {
    warnings.push('Payer address format may be invalid');
  }
  
  if (proof.recipient && !isValidEVMAddress(proof.recipient) && !isValidSolanaAddress(proof.recipient)) {
    warnings.push('Recipient address format may be invalid');
  }
  
  // Validate transaction hash
  if (proof.txHash && proof.chain && !isValidTransactionHash(proof.txHash, proof.chain)) {
    errors.push('Transaction hash format is invalid for the specified chain');
  }
  
  // Validate amount
  if (proof.amount) {
    const amountNum = parseFloat(proof.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      errors.push('Amount must be a positive number');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  formatPaymentAmount,
  isValidEVMAddress,
  isValidSolanaAddress,
  isValidTransactionHash,
  toChecksumAddress,
  RateLimiter,
  Cache,
  createRateLimiter,
  parsePaymentAmount,
  validatePaymentProofStructure
};

