import { TRPCError } from "@trpc/server";
import type { 
  HttpError, 
  DatabaseError, 
  ExternalApiError, 
  ValidationError,
  NetworkError,
  TimeoutError,
  ConfigurationError
} from "@shared/_core/errors";

/**
 * Error logging utility
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const errorContext = {
    name: errorObj.name,
    message: errorObj.message,
    stack: errorObj.stack,
    ...context,
  };

  // Log to console with context
  console.error("[Error]", errorContext);

  // In production, you might want to send to an error tracking service
  // e.g., Sentry, LogRocket, etc.
  if (process.env.NODE_ENV === "production" && process.env.ERROR_TRACKING_ENABLED === "true") {
    // Example: Sentry.captureException(errorObj, { extra: errorContext });
  }
}

/**
 * Convert application errors to TRPC errors
 */
export function toTRPCError(error: unknown): TRPCError {
  // Already a TRPCError
  if (error instanceof TRPCError) {
    return error;
  }

  // HttpError
  if (error instanceof HttpError) {
    const codeMap: Record<number, TRPCError["code"]> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      500: "INTERNAL_SERVER_ERROR",
      503: "SERVICE_UNAVAILABLE",
    };

    return new TRPCError({
      code: codeMap[error.statusCode] || "INTERNAL_SERVER_ERROR",
      message: error.message,
      cause: error,
    });
  }

  // DatabaseError
  if (error instanceof DatabaseError) {
    logError(error, { operation: error.operation });
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database operation failed",
      cause: error,
    });
  }

  // ExternalApiError
  if (error instanceof ExternalApiError) {
    logError(error, { service: error.service, statusCode: error.statusCode });
    return new TRPCError({
      code: error.statusCode && error.statusCode >= 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST",
      message: `External service error: ${error.message}`,
      cause: error,
    });
  }

  // ValidationError
  if (error instanceof ValidationError) {
    return new TRPCError({
      code: "BAD_REQUEST",
      message: error.message,
      cause: error,
    });
  }

  // NetworkError
  if (error instanceof NetworkError) {
    logError(error, { endpoint: error.endpoint });
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Network request failed",
      cause: error,
    });
  }

  // TimeoutError
  if (error instanceof TimeoutError) {
    return new TRPCError({
      code: "TIMEOUT",
      message: error.message,
      cause: error,
    });
  }

  // ConfigurationError
  if (error instanceof ConfigurationError) {
    logError(error, { configKey: error.configKey });
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Configuration error",
      cause: error,
    });
  }

  // Generic Error
  if (error instanceof Error) {
    logError(error);
    return new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message || "An unexpected error occurred",
      cause: error,
    });
  }

  // Unknown error type
  const unknownError = new Error(String(error));
  logError(unknownError);
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
    cause: unknownError,
  });
}

/**
 * Wrap async functions with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { context, function: fn.name });
      throw toTRPCError(error);
    }
  }) as T;
}

/**
 * Retry utility with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    retryable?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    retryable = () => true,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Timeout wrapper
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message?: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(message || `Operation timed out after ${timeoutMs}ms`, timeoutMs));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]);
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }

  if (error instanceof ExternalApiError) {
    // Retry on 5xx errors and network issues
    return !error.statusCode || error.statusCode >= 500;
  }

  if (error instanceof DatabaseError) {
    // Retry on connection errors
    const message = error.message.toLowerCase();
    return message.includes("connection") || message.includes("timeout");
  }

  if (error instanceof TimeoutError) {
    return true;
  }

  return false;
}

