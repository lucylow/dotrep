# x402 HTTP Layer Improvements

This document describes the enhancements made to the x402 protocol implementation to provide a robust layer on top of HTTP.

## Overview

The x402 protocol is designed as a specialized payment layer on top of HTTP, enabling autonomous agents to make payments natively as they browse the web and use APIs. These improvements enhance the HTTP foundation to ensure:

- **RFC Compliance**: Proper HTTP status codes, headers, and semantics
- **Performance**: Connection pooling, keep-alive, and HTTP caching
- **Reliability**: Automatic retry with exponential backoff
- **Developer Experience**: Standardized error handling and response formats

## Key Improvements

### 1. Enhanced HTTP Client (`x402-http-client.js`)

A production-ready HTTP client specifically designed for x402 protocol:

#### Features:
- **Connection Pooling**: Reuses HTTP connections for better performance
- **Keep-Alive Support**: Maintains persistent connections
- **Automatic Retry**: Retries failed requests with exponential backoff
- **HTTP Caching**: Intelligent caching of GET requests
- **Request/Response Interceptors**: Extensible middleware pattern
- **Proper Error Handling**: Distinguishes retryable vs non-retryable errors

#### Usage:
```javascript
const { createX402HTTPClient } = require('./x402-http-client');

const client = createX402HTTPClient({
  timeout: 30000,
  keepAlive: true,
  maxRetries: 3,
  enableCache: true
});

const response = await client.request('https://api.example.com/resource', {
  method: 'GET',
  headers: {
    'X-PAYMENT': JSON.stringify(paymentProof)
  }
});
```

### 2. HTTP Response Handlers (`x402-http-handlers.js`)

Standardized HTTP response building and parsing:

#### Components:

**HTTP402ResponseBuilder**: Creates RFC-compliant HTTP 402 responses
- Proper HTTP headers (Retry-After, Cache-Control, etc.)
- Machine-readable payment request payloads
- Client guidance for autonomous agents
- Standardized error responses

**XPaymentHeaderParser**: Parses and validates X-PAYMENT headers
- JSON parsing with error handling
- Structure validation
- Transaction hash format validation
- Address format validation

**HTTPHeaderUtils**: Utility functions for HTTP headers
- Content negotiation (Accept header parsing)
- Cache-Control parsing and building
- Header normalization

#### Usage:
```javascript
const { HTTP402ResponseBuilder, XPaymentHeaderParser } = require('./x402-http-handlers');

const builder = new HTTP402ResponseBuilder();
const response = builder.buildPaymentRequired(paymentRequest, {
  retryAfter: 60,
  includeClientGuidance: true
});

// In Express middleware:
res.status(response.status);
Object.entries(response.headers).forEach(([key, value]) => {
  res.setHeader(key, value);
});
res.json(response.body);
```

### 3. Enhanced Middleware (`x402-middleware.js`)

Updated middleware to use the new HTTP handlers:

#### Improvements:
- Uses `HTTP402ResponseBuilder` for standardized responses
- Uses `XPaymentHeaderParser` for header parsing
- Better error handling with proper HTTP status codes
- Improved cache control headers
- Content negotiation support

### 4. Enhanced Autonomous Agent (`x402AutonomousAgent.ts`)

Improved HTTP request handling in the TypeScript agent:

#### Improvements:
- Better HTTP headers (Accept, Accept-Encoding, Connection)
- Timeout support
- Enhanced error handling
- Better retry logic

## HTTP Protocol Compliance

### HTTP 402 Payment Required Response

The implementation now follows RFC standards for HTTP 402:

```
HTTP/1.1 402 Payment Required
Content-Type: application/json; charset=utf-8
Retry-After: 60
X-x402-Version: 1.0
X-Payment-Required: true
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
Link: <https://facilitator.example.com>; rel="payment-facilitator"
Vary: Accept, X-PAYMENT

{
  "error": "Payment Required",
  "code": "PAYMENT_REQUIRED",
  "paymentRequest": {
    "x402": "1.0",
    "amount": "0.10",
    "currency": "USDC",
    "recipient": "0x...",
    "chains": ["base", "solana"],
    "challenge": "...",
    "expires": "2024-01-01T00:00:00Z",
    "resourceUAL": "urn:ual:..."
  },
  "message": "Include X-PAYMENT header with payment transaction proof to access this resource",
  "documentation": "https://x402.org/docs/client-integration",
  "clientGuidance": {
    "headerName": "X-PAYMENT",
    "headerFormat": "JSON string",
    "facilitator": "https://facilitator.example.com",
    "supportedChains": ["base", "solana"],
    "example": { ... }
  }
}
```

### X-PAYMENT Header Format

The X-PAYMENT header contains a JSON-encoded payment proof:

```json
{
  "txHash": "0x...",
  "chain": "base",
  "payer": "0x...",
  "amount": "0.10",
  "currency": "USDC",
  "recipient": "0x...",
  "challenge": "...",
  "signature": "0x...",
  "facilitatorSig": "0x...",
  "metadata": {
    "agentId": "...",
    "timestamp": 1234567890
  }
}
```

## Performance Optimizations

### Connection Pooling

The HTTP client maintains connection pools for both HTTP and HTTPS:

```javascript
const client = createX402HTTPClient({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10
});
```

### HTTP Caching

GET requests are automatically cached based on Cache-Control headers:

```javascript
const client = createX402HTTPClient({
  enableCache: true,
  cacheMaxAge: 300000 // 5 minutes
});
```

### Retry Logic

Automatic retry with exponential backoff for transient failures:

```javascript
const client = createX402HTTPClient({
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 1000,
    exponentialBackoff: true,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504]
  }
});
```

## Error Handling

### Standardized Error Responses

All errors follow a consistent format:

```json
{
  "error": "Error Title",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2024-01-01T00:00:00Z",
  "retryable": true,
  "retryAfter": 60,
  "paymentRequest": { ... } // If applicable
}
```

### HTTP Status Codes

- `200 OK`: Request successful with payment
- `402 Payment Required`: Payment required to access resource
- `400 Bad Request`: Invalid request format
- `403 Forbidden`: Payment valid but access denied (reputation, etc.)
- `409 Conflict`: Transaction already processed (replay detected)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `502 Bad Gateway`: Facilitator or upstream service error
- `503 Service Unavailable`: Service temporarily unavailable

## Best Practices

### For Server Implementations

1. **Use the HTTP Response Builder**: Always use `HTTP402ResponseBuilder` for consistent responses
2. **Set Proper Cache Headers**: Use appropriate Cache-Control headers for different resources
3. **Handle Retry-After**: Set Retry-After header appropriately for rate limiting
4. **Validate Headers**: Use `XPaymentHeaderParser` to validate X-PAYMENT headers
5. **Content Negotiation**: Support Accept header for different response formats

### For Client Implementations

1. **Use Connection Pooling**: Reuse HTTP connections for better performance
2. **Handle Retries**: Implement retry logic for transient failures
3. **Respect Cache Headers**: Cache responses when appropriate
4. **Error Handling**: Handle different HTTP status codes appropriately
5. **Timeout Management**: Set appropriate timeouts for requests

## Migration Guide

### Updating Existing Middleware

**Before:**
```javascript
res.status(402).json({
  error: 'Payment Required',
  paymentRequest: paymentRequest
});
```

**After:**
```javascript
const { HTTP402ResponseBuilder } = require('./x402-http-handlers');
const builder = new HTTP402ResponseBuilder();
const response = builder.buildPaymentRequired(paymentRequest);

res.status(response.status);
Object.entries(response.headers).forEach(([key, value]) => {
  res.setHeader(key, value);
});
res.json(response.body);
```

### Updating Client Code

**Before:**
```javascript
const response = await fetch(url, options);
```

**After:**
```javascript
const { createX402HTTPClient } = require('./x402-http-client');
const client = createX402HTTPClient();
const response = await client.request(url, options);
```

## Testing

The improvements include better testability:

- Mock-friendly interfaces
- Interceptor support for testing
- Cache statistics for monitoring
- Detailed error information

## Future Enhancements

Potential future improvements:

1. **HTTP/2 Support**: Native HTTP/2 support for better multiplexing
2. **HTTP/3 Support**: QUIC protocol support for lower latency
3. **Compression**: Automatic request/response compression
4. **Metrics**: Built-in metrics and monitoring
5. **Circuit Breaker**: Circuit breaker pattern for resilience

## References

- [x402 Protocol Specification](https://www.x402.org/x402-whitepaper.pdf)
- [HTTP/1.1 RFC 7231](https://tools.ietf.org/html/rfc7231)
- [HTTP Status Code 402](https://tools.ietf.org/html/rfc7231#section-6.5.2)

