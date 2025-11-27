/**
 * x402 HTTP Response Handlers
 * 
 * Provides standardized HTTP response handling for x402 protocol,
 * ensuring proper HTTP semantics and RFC compliance.
 * 
 * Features:
 * - RFC-compliant HTTP 402 Payment Required responses
 * - Proper HTTP header management
 * - Standardized error responses
 * - HTTP caching directives
 * - Content negotiation support
 */

/**
 * HTTP 402 Payment Required Response Builder
 * 
 * Creates RFC-compliant HTTP 402 responses with proper headers
 * and machine-readable payment request payloads.
 */
class HTTP402ResponseBuilder {
  constructor() {
    this.version = '1.0';
  }

  /**
   * Build HTTP 402 Payment Required response
   * 
   * @param {object} paymentRequest - Payment request object
   * @param {object} options - Response options
   * @returns {object} Response object with status, headers, and body
   */
  buildPaymentRequired(paymentRequest, options = {}) {
    const {
      retryAfter = 60,
      includeClientGuidance = true,
      cacheControl = 'no-cache, no-store, must-revalidate',
      contentType = 'application/json',
      charset = 'utf-8'
    } = options;

    // Build standard 402 response body
    const body = {
      error: 'Payment Required',
      code: 'PAYMENT_REQUIRED',
      paymentRequest,
      message: 'Include X-PAYMENT header with payment transaction proof to access this resource',
      documentation: 'https://x402.org/docs/client-integration'
    };

    // Add client guidance if requested
    if (includeClientGuidance) {
      body.clientGuidance = {
        headerName: 'X-PAYMENT',
        headerFormat: 'JSON string',
        facilitator: paymentRequest.facilitator,
        supportedChains: paymentRequest.chains || [],
        example: {
          txHash: '0x...',
          chain: paymentRequest.chains?.[0] || 'base',
          payer: '0x...',
          amount: paymentRequest.amount,
          currency: paymentRequest.currency,
          challenge: paymentRequest.challenge
        }
      };
    }

    // Build headers according to HTTP standards
    const headers = {
      'Content-Type': `${contentType}; charset=${charset}`,
      'Retry-After': String(retryAfter),
      'X-x402-Version': this.version,
      'X-Payment-Required': 'true',
      'Cache-Control': cacheControl,
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // Add Vary header for content negotiation
    if (options.vary) {
      headers['Vary'] = Array.isArray(options.vary) 
        ? options.vary.join(', ') 
        : options.vary;
    }

    // Add Link header for payment facilitator
    if (paymentRequest.facilitator) {
      headers['Link'] = `<${paymentRequest.facilitator}>; rel="payment-facilitator"`;
    }

    return {
      status: 402,
      statusText: 'Payment Required',
      headers,
      body
    };
  }

  /**
   * Build HTTP 200 OK response with payment evidence
   * 
   * @param {object} data - Response data
   * @param {object} paymentEvidence - Payment evidence object
   * @param {object} options - Response options
   * @returns {object} Response object
   */
  buildSuccess(data, paymentEvidence = null, options = {}) {
    const {
      cacheControl = 'private, max-age=300',
      contentType = 'application/json',
      charset = 'utf-8',
      etag = null
    } = options;

    const body = {
      resource: options.resourceUAL || 'unknown',
      data,
      timestamp: new Date().toISOString()
    };

    if (paymentEvidence) {
      body.paymentEvidence = paymentEvidence;
    }

    const headers = {
      'Content-Type': `${contentType}; charset=${charset}`,
      'Cache-Control': cacheControl,
      'X-x402-Version': this.version
    };

    if (etag) {
      headers['ETag'] = etag;
    }

    return {
      status: 200,
      statusText: 'OK',
      headers,
      body
    };
  }

  /**
   * Build error response with proper HTTP status code
   * 
   * @param {string|Error} error - Error object or message
   * @param {number} statusCode - HTTP status code
   * @param {object} options - Response options
   * @returns {object} Response object
   */
  buildError(error, statusCode = 400, options = {}) {
    const {
      code = 'ERROR',
      paymentRequest = null,
      retryable = false,
      retryAfter = null,
      contentType = 'application/json',
      charset = 'utf-8'
    } = options;

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error && options.includeStack 
      ? error.stack 
      : undefined;

    const body = {
      error: this.getErrorTitle(statusCode),
      code,
      message: errorMessage,
      timestamp: new Date().toISOString()
    };

    if (errorStack && process.env.NODE_ENV === 'development') {
      body.stack = errorStack;
    }

    if (paymentRequest) {
      body.paymentRequest = paymentRequest;
    }

    if (retryable) {
      body.retryable = true;
      if (retryAfter) {
        body.retryAfter = retryAfter;
      }
    }

    const headers = {
      'Content-Type': `${contentType}; charset=${charset}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-x402-Version': this.version
    };

    if (retryAfter) {
      headers['Retry-After'] = String(retryAfter);
    }

    return {
      status: statusCode,
      statusText: this.getStatusText(statusCode),
      headers,
      body
    };
  }

  /**
   * Get error title for status code
   */
  getErrorTitle(statusCode) {
    const titles = {
      400: 'Bad Request',
      401: 'Unauthorized',
      402: 'Payment Required',
      403: 'Forbidden',
      404: 'Not Found',
      408: 'Request Timeout',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return titles[statusCode] || 'Error';
  }

  /**
   * Get HTTP status text
   */
  getStatusText(statusCode) {
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      202: 'Accepted',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      402: 'Payment Required',
      403: 'Forbidden',
      404: 'Not Found',
      408: 'Request Timeout',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
    return statusTexts[statusCode] || 'Unknown';
  }
}

/**
 * X-PAYMENT Header Parser
 * 
 * Parses and validates X-PAYMENT header according to x402 protocol
 */
class XPaymentHeaderParser {
  /**
   * Parse X-PAYMENT header
   * 
   * @param {string|object} header - X-PAYMENT header value
   * @returns {object} Parsed payment proof or null
   */
  parse(header) {
    if (!header) {
      return null;
    }

    try {
      // Handle string JSON
      if (typeof header === 'string') {
        // Try to parse as JSON
        try {
          return JSON.parse(header);
        } catch (e) {
          // If not JSON, might be a simple string (invalid format)
          throw new Error('X-PAYMENT header must be valid JSON');
        }
      }

      // Already an object
      if (typeof header === 'object' && header !== null) {
        return header;
      }

      return null;
    } catch (error) {
      throw new Error(`Invalid X-PAYMENT header format: ${error.message}`);
    }
  }

  /**
   * Validate payment proof structure
   * 
   * @param {object} proof - Payment proof object
   * @returns {object} Validation result
   */
  validate(proof) {
    const errors = [];
    const warnings = [];

    if (!proof) {
      return {
        valid: false,
        errors: ['Payment proof is required'],
        warnings: []
      };
    }

    // Required fields
    const required = ['txHash', 'chain', 'payer', 'amount', 'currency', 'challenge'];
    for (const field of required) {
      if (!proof[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate field types
    if (proof.amount && isNaN(parseFloat(proof.amount))) {
      errors.push('Amount must be a valid number');
    }

    if (proof.chain && typeof proof.chain !== 'string') {
      errors.push('Chain must be a string');
    }

    if (proof.payer && typeof proof.payer !== 'string') {
      errors.push('Payer must be a string');
    }

    // Validate transaction hash format
    if (proof.txHash && proof.chain) {
      const isValid = this.validateTxHash(proof.txHash, proof.chain);
      if (!isValid) {
        warnings.push(`Transaction hash format may be invalid for chain: ${proof.chain}`);
      }
    }

    // Validate address formats
    if (proof.payer) {
      const isValid = this.validateAddress(proof.payer, proof.chain);
      if (!isValid) {
        warnings.push('Payer address format may be invalid');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate transaction hash format
   */
  validateTxHash(txHash, chain) {
    if (!txHash || typeof txHash !== 'string') return false;

    const chainLower = (chain || '').toLowerCase();

    // EVM chains
    if (['base', 'base-sepolia', 'ethereum', 'polygon', 'arbitrum', 'neuroweb-evm'].includes(chainLower)) {
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
   * Validate address format
   */
  validateAddress(address, chain) {
    if (!address || typeof address !== 'string') return false;

    const chainLower = (chain || '').toLowerCase();

    // EVM chains
    if (['base', 'base-sepolia', 'ethereum', 'polygon', 'arbitrum', 'neuroweb-evm'].includes(chainLower)) {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    // Solana
    if (chainLower === 'solana') {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
    }

    // Default: try EVM format
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}

/**
 * HTTP Header Utilities
 */
class HTTPHeaderUtils {
  /**
   * Parse Accept header for content negotiation
   */
  static parseAccept(acceptHeader) {
    if (!acceptHeader) {
      return [{ type: '*/*', q: 1.0 }];
    }

    const types = acceptHeader.split(',').map(s => s.trim());
    const parsed = [];

    for (const type of types) {
      const [mimeType, ...params] = type.split(';');
      let q = 1.0;

      for (const param of params) {
        const [key, value] = param.trim().split('=');
        if (key === 'q' && value) {
          q = parseFloat(value);
        }
      }

      parsed.push({ type: mimeType.trim(), q });
    }

    return parsed.sort((a, b) => b.q - a.q);
  }

  /**
   * Get best content type from Accept header
   */
  static getBestContentType(acceptHeader, availableTypes = ['application/json', 'text/plain']) {
    const accepted = this.parseAccept(acceptHeader);
    
    for (const acceptedType of accepted) {
      for (const availableType of availableTypes) {
        if (this.matchesContentType(acceptedType.type, availableType)) {
          return availableType;
        }
      }
    }

    return availableTypes[0]; // Default
  }

  /**
   * Check if content types match
   */
  static matchesContentType(accepted, available) {
    if (accepted === '*/*' || accepted === available) {
      return true;
    }

    const [acceptedType, acceptedSubtype] = accepted.split('/');
    const [availableType, availableSubtype] = available.split('/');

    if (acceptedType === '*' || acceptedType === availableType) {
      if (acceptedSubtype === '*' || acceptedSubtype === availableSubtype) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse Cache-Control header
   */
  static parseCacheControl(header) {
    if (!header) return {};

    const directives = {};
    const parts = header.split(',').map(s => s.trim());

    for (const part of parts) {
      const [key, value] = part.split('=').map(s => s.trim());
      if (value) {
        directives[key] = isNaN(value) ? value : parseInt(value, 10);
      } else {
        directives[key] = true;
      }
    }

    return directives;
  }

  /**
   * Build Cache-Control header
   */
  static buildCacheControl(directives) {
    const parts = [];

    for (const [key, value] of Object.entries(directives)) {
      if (value === true) {
        parts.push(key);
      } else if (value !== false) {
        parts.push(`${key}=${value}`);
      }
    }

    return parts.join(', ');
  }
}

module.exports = {
  HTTP402ResponseBuilder,
  XPaymentHeaderParser,
  HTTPHeaderUtils
};

