/**
 * Custom error classes for better error handling
 * 
 * Provides typed errors with consistent structure:
 * - Error code for programmatic handling
 * - Status code for HTTP responses
 * - Context for additional error information
 * 
 * Usage:
 * ```typescript
 * import { ValidationError, NotFoundError } from '@/lib/errors';
 * 
 * if (!userId) {
 *   throw new ValidationError('User ID is required', 'userId');
 * }
 * 
 * if (!profile) {
 *   throw new NotFoundError('Profile');
 * }
 * ```
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Validation error (400)
 * Used when input validation fails
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    public field?: string,
    context?: Record<string, any>
  ) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...context });
    this.name = 'ValidationError';
  }
}

/**
 * Authentication error (401)
 * Used when user is not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTH_ERROR', 401, context);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization error (403)
 * Used when user is authenticated but not authorized
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Not authorized', context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not found error (404)
 * Used when resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, ...context });
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict error (409)
 * Used when resource conflict occurs (e.g., duplicate)
 */
export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFLICT_ERROR', 409, context);
    this.name = 'ConflictError';
  }
}

/**
 * Rate limit error (429)
 * Used when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number,
    context?: Record<string, any>
  ) {
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter, ...context });
    this.name = 'RateLimitError';
  }
}

/**
 * Server error (500)
 * Used for unexpected server errors
 */
export class ServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 'SERVER_ERROR', 500, context);
    this.name = 'ServerError';
  }
}

/**
 * Network error
 * Used when network request fails
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 0, context);
    this.name = 'NetworkError';
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Extract error code from any error
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  
  if (error instanceof Error) {
    return 'UNKNOWN_ERROR';
  }
  
  return 'UNKNOWN_ERROR';
}

