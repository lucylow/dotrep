# DotRep REST API Documentation

## Overview

The DotRep REST API provides a RESTful HTTP interface to the DotRep decentralized reputation system. This API makes the system accessible to external systems, AI agents, and non-TypeScript clients.

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://api.dotrep.io/api`

## Authentication

Currently, most endpoints are public. For operations requiring authentication (e.g., staking, publishing), you may need to provide authentication tokens in the future.

## API Documentation

- **Interactive Documentation (Swagger UI)**: `http://localhost:3000/api/docs`
- **OpenAPI Specification**: `http://localhost:3000/api/openapi.json`
- **API Information**: `GET /api` - Returns API information and available endpoints

## Endpoints

### Health & Information

#### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "dotrep-api",
  "version": "1.0.0"
}
```

#### `GET /api`
Returns API information and available endpoints.

### DKG Operations

#### `GET /api/v1/dkg/node/info`
Get DKG node information.

#### `GET /api/v1/dkg/health`
Check DKG connection health.

**Response:**
```json
{
  "success": true,
  "healthy": true,
  "status": {
    "initialized": true,
    "environment": "testnet",
    "endpoint": "https://v6-pegasus-node-02.origin-trail.network:8900",
    "mockMode": false
  }
}
```

#### `POST /api/v1/dkg/query`
Execute a SPARQL query on the DKG graph.

**Request Body:**
```json
{
  "query": "PREFIX schema: <https://schema.org/> SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10",
  "queryType": "SELECT",
  "allowUpdates": false
}
```

**Response:**
```json
{
  "success": true,
  "data": [...]
}
```

### Reputation Management

#### `POST /api/v1/reputation`
Publish a reputation asset to DKG.

**Request Body:**
```json
{
  "developerId": "alice",
  "reputationScore": 850,
  "contributions": [
    {
      "id": "pr-123",
      "type": "github_pr",
      "url": "https://github.com/org/repo/pull/123",
      "title": "Fix bug in authentication",
      "date": "2024-01-01T00:00:00.000Z",
      "impact": 50
    }
  ],
  "timestamp": 1704067200000,
  "metadata": {},
  "epochs": 2,
  "validateSchema": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ual": "urn:ual:dotrep:reputation:alice:1234567890",
    "transactionHash": "0x...",
    "blockNumber": 12345,
    "costEstimate": {
      "tracFee": "1000000000000000000",
      "neuroGasFee": "500000000000000000",
      "totalCostUSD": 0.15
    }
  }
}
```

#### `GET /api/v1/reputation/:ual`
Query a reputation asset by its UAL.

**Example:**
```
GET /api/v1/reputation/urn:ual:dotrep:reputation:alice:1234567890
```

#### `GET /api/v1/reputation/search?developerId=alice&limit=10`
Search for reputation assets by developer ID.

#### `GET /api/v1/reputation/developer/:developerId`
Get reputation for a specific developer.

### Payment Evidence

#### `POST /api/v1/payment-evidence`
Publish payment evidence to DKG.

**Request Body:**
```json
{
  "txHash": "0xabc123...",
  "payer": "0xBuyerAddress",
  "recipient": "0xSellerAddress",
  "amount": "10.00",
  "currency": "USDC",
  "chain": "base",
  "resourceUAL": "urn:ual:dotrep:product:123",
  "challenge": "pay-chal-20241126-0001",
  "epochs": 2
}
```

#### `GET /api/v1/payment-evidence`
Query payment evidence with filters.

**Query Parameters:**
- `payer` - Filter by payer address
- `recipient` - Filter by recipient address
- `minAmount` - Minimum payment amount
- `chain` - Blockchain name
- `resourceUAL` - Resource UAL
- `limit` - Maximum results (default: 100)

### Trust Layer

#### `POST /api/v1/trust/stake`
Stake tokens for trust layer participation.

**Request Body:**
```json
{
  "userDID": "did:polkadot:alice",
  "amount": "1000000000000000000",
  "targetTier": "VERIFIED"
}
```

#### `POST /api/v1/trust/unstake`
Unstake tokens.

**Request Body:**
```json
{
  "userDID": "did:polkadot:alice",
  "amount": "500000000000000000"
}
```

#### `GET /api/v1/trust/stake/:userDID`
Get stake information for a user.

#### `GET /api/v1/trust/score/:userDID`
Get trust score for a user.

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "score": 85.5
  }
}
```

#### `GET /api/v1/trust/report/:userDID`
Get comprehensive trust report for a user.

### Polkadot Integration

#### `GET /api/v1/polkadot/reputation/:accountId`
Get reputation from Polkadot chain.

**Example:**
```
GET /api/v1/polkadot/reputation/5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY
```

#### `GET /api/v1/polkadot/chain/info`
Get chain information.

#### `GET /api/v1/polkadot/governance/proposals`
Get governance proposals.

### Contributors

#### `GET /api/v1/contributors`
List all contributors.

**Query Parameters:**
- `limit` - Maximum number of results (1-1000)

#### `GET /api/v1/contributors/:id`
Get contributor by ID.

#### `GET /api/v1/contributors/username/:username`
Get contributor by GitHub username.

#### `GET /api/v1/contributors/:id/stats`
Get contributor statistics.

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "developerId and reputationScore are required",
    "cause": "..."
  }
}
```

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `408` - Timeout
- `409` - Conflict
- `422` - Unprocessable Entity
- `429` - Too Many Requests
- `500` - Internal Server Error
- `503` - Service Unavailable

## Examples

### Publish Reputation Asset

```bash
curl -X POST http://localhost:3000/api/v1/reputation \
  -H "Content-Type: application/json" \
  -d '{
    "developerId": "alice",
    "reputationScore": 850,
    "contributions": [],
    "epochs": 2
  }'
```

### Query Reputation

```bash
curl http://localhost:3000/api/v1/reputation/search?developerId=alice&limit=10
```

### Execute SPARQL Query

```bash
curl -X POST http://localhost:3000/api/v1/dkg/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "PREFIX schema: <https://schema.org/> SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10",
    "queryType": "SELECT"
  }'
```

### Get Trust Score

```bash
curl http://localhost:3000/api/v1/trust/score/did:polkadot:alice
```

## Integration with AI Agents

The REST API is designed to be easily consumed by AI agents and external systems:

1. **Standard HTTP**: Uses standard HTTP methods and status codes
2. **JSON Format**: All requests and responses use JSON
3. **OpenAPI Documentation**: Full OpenAPI 3.0 specification available
4. **Error Handling**: Consistent error format across all endpoints
5. **Idempotency**: Safe to retry operations

## Rate Limiting

Rate limiting may be implemented in the future. Check response headers for rate limit information:
- `X-RateLimit-Limit` - Request limit per window
- `X-RateLimit-Remaining` - Remaining requests in current window
- `X-RateLimit-Reset` - Time when rate limit resets

## Best Practices

1. **Always check the response status code** before processing data
2. **Handle errors gracefully** - check the error object in responses
3. **Use appropriate HTTP methods** - GET for queries, POST for mutations
4. **Include proper Content-Type headers** - `application/json` for JSON payloads
5. **Implement retry logic** for transient failures (5xx errors)
6. **Respect rate limits** if implemented

## Comparison with tRPC API

The REST API wraps the existing tRPC functionality:

- **tRPC**: Type-safe, TypeScript-first, optimized for frontend
- **REST API**: Language-agnostic, standard HTTP, better for external systems

Both APIs access the same backend logic, so you can use either based on your needs.

## Support

For issues or questions:
- Check the interactive documentation at `/api/docs`
- Review the OpenAPI specification at `/api/openapi.json`
- Check the main project README for more information

