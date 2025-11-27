/**
 * x402 HTTP Client Layer
 * 
 * Enhanced HTTP client specifically designed for x402 protocol,
 * providing a robust layer on top of HTTP with:
 * - Connection pooling and keep-alive
 * - Automatic retry with exponential backoff
 * - Proper HTTP header management
 * - HTTP caching support
 * - Request/response interceptors
 * - Comprehensive error handling
 * 
 * This client ensures x402 protocol compliance while providing
 * optimal HTTP performance and reliability.
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * HTTP Client Configuration
 */
class HTTPClientConfig {
  constructor(options = {}) {
    this.timeout = options.timeout || 30000; // 30 seconds
    this.keepAlive = options.keepAlive !== false; // Default: true
    this.keepAliveMsecs = options.keepAliveMsecs || 1000;
    this.maxSockets = options.maxSockets || 50;
    this.maxFreeSockets = options.maxFreeSockets || 10;
    this.retryConfig = {
      maxRetries: options.maxRetries || 3,
      retryDelayMs: options.retryDelayMs || 1000,
      exponentialBackoff: options.exponentialBackoff !== false,
      retryableStatusCodes: options.retryableStatusCodes || [408, 429, 500, 502, 503, 504],
      retryableErrors: options.retryableErrors || ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
    };
    this.enableCache = options.enableCache !== false;
    this.cacheMaxAge = options.cacheMaxAge || 300000; // 5 minutes
    this.userAgent = options.userAgent || 'x402-HTTP-Client/1.0';
  }
}

/**
 * HTTP Cache Entry
 */
class CacheEntry {
  constructor(data, headers, maxAge) {
    this.data = data;
    this.headers = headers;
    this.expires = Date.now() + maxAge;
    this.created = Date.now();
  }

  isExpired() {
    return Date.now() > this.expires;
  }

  getAge() {
    return Date.now() - this.created;
  }

  getMaxAge() {
    return this.expires - this.created;
  }
}

/**
 * Enhanced HTTP Client for x402 Protocol
 */
class X402HTTPClient {
  constructor(config = {}) {
    this.config = new HTTPClientConfig(config);
    this.cache = new Map();
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    this.agents = {
      http: null,
      https: null
    };
    
    this.initializeAgents();
  }

  /**
   * Initialize HTTP/HTTPS agents with connection pooling
   */
  initializeAgents() {
    if (this.config.keepAlive) {
      this.agents.http = new http.Agent({
        keepAlive: true,
        keepAliveMsecs: this.config.keepAliveMsecs,
        maxSockets: this.config.maxSockets,
        maxFreeSockets: this.config.maxFreeSockets,
        timeout: this.config.timeout
      });

      this.agents.https = new https.Agent({
        keepAlive: true,
        keepAliveMsecs: this.config.keepAliveMsecs,
        maxSockets: this.config.maxSockets,
        maxFreeSockets: this.config.maxFreeSockets,
        timeout: this.config.timeout,
        rejectUnauthorized: true
      });
    }
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Make HTTP request with automatic retry and caching
   */
  async request(url, options = {}) {
    const parsedUrl = new URL(url);
    const method = options.method || 'GET';
    const cacheKey = this.getCacheKey(method, url, options);

    // Check cache for GET requests
    if (this.config.enableCache && method === 'GET' && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey);
      if (!entry.isExpired()) {
        return {
          status: 200,
          statusText: 'OK',
          ok: true,
          headers: entry.headers,
          data: entry.data,
          cached: true,
          age: entry.getAge()
        };
      } else {
        this.cache.delete(cacheKey);
      }
    }

    // Apply request interceptors
    let finalOptions = { ...options };
    for (const interceptor of this.requestInterceptors) {
      finalOptions = await interceptor(finalOptions, url) || finalOptions;
    }

    // Make request with retry logic
    let lastError;
    for (let attempt = 0; attempt <= this.config.retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(parsedUrl, finalOptions);
        
        // Apply response interceptors
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse, url) || finalResponse;
        }

        // Cache successful GET responses
        if (this.config.enableCache && method === 'GET' && finalResponse.ok) {
          const cacheControl = this.parseCacheControl(finalResponse.headers['cache-control']);
          const maxAge = cacheControl.maxAge 
            ? cacheControl.maxAge * 1000 
            : this.config.cacheMaxAge;
          
          if (maxAge > 0 && !cacheControl.noCache && !cacheControl.noStore) {
            this.cache.set(cacheKey, new CacheEntry(
              finalResponse.data,
              finalResponse.headers,
              maxAge
            ));
          }
        }

        return finalResponse;
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (attempt < this.config.retryConfig.maxRetries) {
          const isRetryable = this.isRetryableError(error, finalOptions);
          
          if (isRetryable) {
            const delay = this.calculateRetryDelay(attempt);
            await this.sleep(delay);
            continue;
          }
        }
        
        throw error;
      }
    }

    throw lastError;
  }

  /**
   * Make actual HTTP request
   */
  makeRequest(parsedUrl, options) {
    return new Promise((resolve, reject) => {
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      const agent = isHttps ? this.agents.https : this.agents.http;

      const requestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'application/json, */*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': this.config.keepAlive ? 'keep-alive' : 'close',
          ...options.headers
        },
        agent: agent || undefined,
        timeout: this.config.timeout
      };

      // Add body for POST/PUT/PATCH
      if (options.body && ['POST', 'PUT', 'PATCH'].includes(requestOptions.method)) {
        if (typeof options.body === 'string') {
          requestOptions.headers['Content-Type'] = requestOptions.headers['Content-Type'] || 'application/json';
          requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
        } else if (Buffer.isBuffer(options.body)) {
          requestOptions.headers['Content-Length'] = options.body.length;
        }
      }

      const req = httpModule.request(requestOptions, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('end', () => {
          const data = Buffer.concat(chunks);
          const headers = this.normalizeHeaders(res.headers);
          
          let parsedData;
          const contentType = headers['content-type'] || '';
          
          if (contentType.includes('application/json')) {
            try {
              parsedData = JSON.parse(data.toString());
            } catch (e) {
              parsedData = data.toString();
            }
          } else {
            parsedData = data.toString();
          }

          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            ok: res.statusCode >= 200 && res.statusCode < 300,
            headers,
            data: parsedData,
            raw: data,
            cached: false
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      // Write body if present
      if (options.body) {
        if (Buffer.isBuffer(options.body)) {
          req.write(options.body);
        } else {
          req.write(options.body);
        }
      }

      req.end();
    });
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error, options) {
    // Check for retryable status codes in response
    if (error.status && this.config.retryConfig.retryableStatusCodes.includes(error.status)) {
      return true;
    }

    // Check for retryable network errors
    if (error.code && this.config.retryConfig.retryableErrors.includes(error.code)) {
      return true;
    }

    // Don't retry on 402 Payment Required (client should handle payment first)
    if (error.status === 402) {
      return false;
    }

    // Don't retry on 4xx client errors (except specific ones)
    if (error.status >= 400 && error.status < 500) {
      return this.config.retryConfig.retryableStatusCodes.includes(error.status);
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attempt) {
    if (this.config.retryConfig.exponentialBackoff) {
      return this.config.retryConfig.retryDelayMs * Math.pow(2, attempt);
    }
    return this.config.retryConfig.retryDelayMs;
  }

  /**
   * Get cache key for request
   */
  getCacheKey(method, url, options) {
    const bodyHash = options.body ? this.hashString(String(options.body)) : '';
    return `${method}:${url}:${bodyHash}`;
  }

  /**
   * Parse Cache-Control header
   */
  parseCacheControl(header) {
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
   * Normalize headers to lowercase keys
   */
  normalizeHeaders(headers) {
    const normalized = {};
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  /**
   * Hash string for cache key
   */
  hashString(str) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const expired = entries.filter(e => e.isExpired()).length;
    const valid = entries.length - expired;

    return {
      total: entries.length,
      valid,
      expired,
      hitRate: 0 // Would need to track hits/misses
    };
  }

  /**
   * Destroy agents and cleanup
   */
  destroy() {
    if (this.agents.http) {
      this.agents.http.destroy();
    }
    if (this.agents.https) {
      this.agents.https.destroy();
    }
    this.cache.clear();
  }
}

/**
 * Create x402 HTTP client with default configuration
 */
function createX402HTTPClient(config = {}) {
  return new X402HTTPClient(config);
}

/**
 * Default x402 HTTP client instance
 */
let defaultClient = null;

function getDefaultX402HTTPClient() {
  if (!defaultClient) {
    defaultClient = createX402HTTPClient({
      timeout: 30000,
      keepAlive: true,
      maxRetries: 3,
      enableCache: true
    });
  }
  return defaultClient;
}

module.exports = {
  X402HTTPClient,
  createX402HTTPClient,
  getDefaultX402HTTPClient,
  HTTPClientConfig
};

