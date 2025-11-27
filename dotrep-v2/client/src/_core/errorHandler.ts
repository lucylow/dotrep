import { TRPCClientError } from "@trpc/client";
import { toast } from "sonner";

/**
 * Error types for frontend
 */
export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof TRPCClientError) {
    // tRPC errors
    return error.message || "An error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
}

/**
 * Extract error code from various error types
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error instanceof TRPCClientError) {
    return error.data?.code || error.data?.httpStatus?.toString();
  }

  if (error && typeof error === "object" && "code" in error) {
    return String(error.code);
  }

  return undefined;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    return error.data?.code === "INTERNAL_SERVER_ERROR" || 
           error.message.toLowerCase().includes("network") ||
           error.message.toLowerCase().includes("fetch");
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("network") ||
           error.message.toLowerCase().includes("fetch") ||
           error.message.toLowerCase().includes("connection");
  }

  return false;
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    return error.data?.code === "TIMEOUT" ||
           error.message.toLowerCase().includes("timeout");
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("timeout");
  }

  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    return error.data?.code === "BAD_REQUEST" ||
           error.data?.code === "VALIDATION_ERROR";
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("validation") ||
           error.message.toLowerCase().includes("invalid");
  }

  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof TRPCClientError) {
    return error.data?.code === "UNAUTHORIZED" ||
           error.data?.code === "FORBIDDEN";
  }

  return false;
}

/**
 * Handle error and show appropriate user feedback
 */
export function handleError(error: unknown, options?: {
  showToast?: boolean;
  toastTitle?: string;
  fallbackMessage?: string;
  onError?: (error: unknown) => void;
}): AppError {
  const {
    showToast = true,
    toastTitle,
    fallbackMessage = "An error occurred",
    onError,
  } = options || {};

  const message = getErrorMessage(error) || fallbackMessage;
  const code = getErrorCode(error);

  // Log error to console in development
  if (process.env.NODE_ENV === "development") {
    console.error("[Error Handler]", error);
  }

  // Show toast notification
  if (showToast) {
    if (isNetworkError(error)) {
      toast.error(toastTitle || "Network Error", {
        description: "Please check your internet connection and try again.",
      });
    } else if (isTimeoutError(error)) {
      toast.error(toastTitle || "Request Timeout", {
        description: "The request took too long. Please try again.",
      });
    } else if (isAuthError(error)) {
      toast.error(toastTitle || "Authentication Error", {
        description: "Please log in again to continue.",
      });
    } else if (isValidationError(error)) {
      toast.error(toastTitle || "Validation Error", {
        description: message,
      });
    } else {
      toast.error(toastTitle || "Error", {
        description: message,
      });
    }
  }

  // Call custom error handler if provided
  if (onError) {
    onError(error);
  }

  return {
    message,
    code,
  };
}

/**
 * Handle async operation with error handling
 */
export async function handleAsync<T>(
  operation: () => Promise<T>,
  options?: {
    showToast?: boolean;
    toastTitle?: string;
    fallbackMessage?: string;
    onError?: (error: unknown) => void;
  }
): Promise<{ data?: T; error?: AppError }> {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const appError = handleError(error, options);
    return { error: appError };
  }
}

/**
 * Retry operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
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
    retryable = (error) => isNetworkError(error) || isTimeoutError(error),
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
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

