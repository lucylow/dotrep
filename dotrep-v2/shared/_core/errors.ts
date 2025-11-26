/**
 * Base HTTP error class with status code.
 * Throw this from route handlers to send specific HTTP errors.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "HttpError";
    Error.captureStackTrace?.(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Database error class
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public operation?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "DatabaseError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * External API error class
 */
export class ExternalApiError extends Error {
  constructor(
    message: string,
    public service: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = "ExternalApiError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: unknown
  ) {
    super(message);
    this.name = "ValidationError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Network error class
 */
export class NetworkError extends Error {
  constructor(
    message: string,
    public endpoint?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = "NetworkError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Timeout error class
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public timeoutMs?: number
  ) {
    super(message);
    this.name = "TimeoutError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Configuration error class
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public configKey?: string
  ) {
    super(message);
    this.name = "ConfigurationError";
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Convenience constructors
export const BadRequestError = (msg: string, code?: string, details?: Record<string, unknown>) => 
  new HttpError(400, msg, code, details);
export const UnauthorizedError = (msg: string, code?: string, details?: Record<string, unknown>) => 
  new HttpError(401, msg, code, details);
export const ForbiddenError = (msg: string, code?: string, details?: Record<string, unknown>) => 
  new HttpError(403, msg, code, details);
export const NotFoundError = (msg: string, code?: string, details?: Record<string, unknown>) => 
  new HttpError(404, msg, code, details);
export const ConflictError = (msg: string, code?: string, details?: Record<string, unknown>) => 
  new HttpError(409, msg, code, details);
export const InternalServerError = (msg: string, code?: string, details?: Record<string, unknown>) => 
  new HttpError(500, msg, code, details);
export const ServiceUnavailableError = (msg: string, code?: string, details?: Record<string, unknown>) => 
  new HttpError(503, msg, code, details);
