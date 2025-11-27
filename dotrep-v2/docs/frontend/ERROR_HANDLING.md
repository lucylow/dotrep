# Error Handling Implementation

This document describes the comprehensive error handling system implemented across the DotRep application.

## Overview

The error handling system provides:
- **Structured error types** for different error scenarios
- **Automatic retry logic** with exponential backoff
- **Comprehensive error logging** with context
- **User-friendly error messages** in the frontend
- **Error recovery mechanisms** for network and database operations

## Error Types

### Server-Side Error Types (`shared/_core/errors.ts`)

- **`HttpError`**: Base HTTP error with status code
- **`DatabaseError`**: Database operation errors
- **`ExternalApiError`**: External API call errors (GitHub, Polkadot, etc.)
- **`ValidationError`**: Input validation errors
- **`NetworkError`**: Network connection errors
- **`TimeoutError`**: Operation timeout errors
- **`ConfigurationError`**: Configuration/missing env var errors

### Convenience Constructors

```typescript
BadRequestError(msg, code?, details?)
UnauthorizedError(msg, code?, details?)
ForbiddenError(msg, code?, details?)
NotFoundError(msg, code?, details?)
ConflictError(msg, code?, details?)
InternalServerError(msg, code?, details?)
ServiceUnavailableError(msg, code?, details?)
```

## Error Handling Utilities

### Server-Side (`server/_core/errorHandler.ts`)

#### `toTRPCError(error)`
Converts application errors to tRPC errors for consistent API responses.

#### `logError(error, context?)`
Logs errors with context for debugging and monitoring.

#### `retryWithBackoff(fn, options?)`
Retries operations with exponential backoff:
- `maxRetries`: Maximum retry attempts (default: 3)
- `initialDelay`: Initial delay in ms (default: 1000)
- `maxDelay`: Maximum delay in ms (default: 10000)
- `backoffFactor`: Backoff multiplier (default: 2)
- `retryable`: Function to determine if error is retryable

#### `withTimeout(promise, timeoutMs, message?)`
Wraps promises with timeout protection.

#### `isRetryableError(error)`
Determines if an error should trigger a retry.

#### `withErrorHandling(fn, context?)`
Wraps async functions with automatic error handling.

### Frontend (`client/src/_core/errorHandler.ts`)

#### `getErrorMessage(error)`
Extracts user-friendly error messages from various error types.

#### `handleError(error, options?)`
Handles errors and shows appropriate user feedback:
- Shows toast notifications
- Logs errors in development
- Calls custom error handlers

#### `handleAsync(operation, options?)`
Wraps async operations with error handling.

#### `retryOperation(operation, options?)`
Retries operations with exponential backoff on the frontend.

## Implementation Details

### Database Error Handling

- **Connection pooling** with automatic retry
- **Retry logic** for transient database errors
- **Graceful degradation** when database is unavailable
- **Detailed error logging** with operation context

Example:
```typescript
export async function upsertUser(user: InsertUser): Promise<void> {
  return retryWithBackoff(
    async () => {
      const db = await getDb();
      // ... operation
    },
    {
      maxRetries: 3,
      retryable: isRetryableError,
    }
  ).catch((error) => {
    logError(error, { operation: "upsertUser", openId: user.openId });
    throw new DatabaseError("Failed to upsert user", "upsertUser", error);
  });
}
```

### Polkadot API Error Handling

- **Automatic reconnection** with exponential backoff
- **Connection health checks** every 30 seconds
- **Timeout protection** for all API calls
- **Retry logic** for transient network errors

Example:
```typescript
async getReputation(accountId: string) {
  await this.ensureConnected();
  return retryWithBackoff(
    async () => {
      const result = await withTimeout(
        this.api!.query.reputation.reputationScores(account),
        10000,
        "Reputation query timed out"
      );
      // ... process result
    },
    { maxRetries: 2, retryable: isRetryableError }
  );
}
```

### GitHub API Error Handling

- **Request timeout protection** (30 seconds)
- **Retry logic** for network errors
- **Detailed error messages** with status codes
- **Validation** before making requests

Example:
```typescript
export async function fetchUserContributions(...) {
  return retryWithBackoff(
    async () => {
      const response = await withTimeout(
        axios.post(GITHUB_API_URL, ...),
        30000,
        "GitHub API request timed out"
      );
      // ... handle response
    },
    { maxRetries: 3, retryable: isRetryableError }
  );
}
```

### Router Error Handling

All tRPC routers use the error handling utilities:

```typescript
.query(async ({ input }) => {
  try {
    return await db.getAllContributors(input.limit);
  } catch (error) {
    logError(error, { operation: "getAllContributors", limit: input.limit });
    throw toTRPCError(error);
  }
})
```

### Frontend Error Handling

#### Error Boundary

Enhanced `ErrorBoundary` component:
- Catches React component errors
- Shows user-friendly error UI
- Provides recovery options (Try Again, Reload, Go Home)
- Logs errors in development

#### API Error Handling

```typescript
const { data, error } = await handleAsync(
  () => trpc.contributor.getAll.query({ limit: 10 }),
  {
    showToast: true,
    toastTitle: "Failed to load contributors",
  }
);

if (error) {
  // Handle error
}
```

## Error Logging

Errors are logged with:
- **Error message and stack trace**
- **Operation context** (function name, parameters)
- **Timestamp**
- **Environment** (development/production)

In production, errors can be sent to error tracking services (Sentry, LogRocket, etc.) by setting `ERROR_TRACKING_ENABLED=true`.

## Best Practices

1. **Always use structured error types** instead of generic `Error`
2. **Include context** when logging errors
3. **Use retry logic** for transient errors (network, database)
4. **Provide user-friendly messages** in the frontend
5. **Log errors** before re-throwing
6. **Use timeouts** for external API calls
7. **Handle errors at the appropriate level** (component, service, router)

## Error Recovery

The system includes automatic recovery mechanisms:

- **Database**: Retry with exponential backoff
- **Network**: Retry with exponential backoff
- **Polkadot API**: Automatic reconnection with health checks
- **Frontend**: Error boundary with recovery options

## Testing Error Handling

To test error handling:

1. **Database errors**: Stop database service
2. **Network errors**: Disconnect network
3. **API errors**: Use invalid endpoints
4. **Timeout errors**: Set very short timeouts
5. **Validation errors**: Send invalid input

## Future Improvements

- [ ] Error tracking service integration (Sentry)
- [ ] Error analytics dashboard
- [ ] Custom error pages for different error types
- [ ] Error reporting from frontend to backend
- [ ] Circuit breaker pattern for external services

