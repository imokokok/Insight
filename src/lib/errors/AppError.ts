/**
 * Application error details interface
 * Base interface for all error details objects
 */
export interface AppErrorDetails {
  [key: string]: unknown;
}

/**
 * Application error options
 * Complete configuration options for creating AppError
 */
export interface AppErrorOptions {
  message: string;
  code: string;
  statusCode: number;
  isOperational?: boolean;
  details?: AppErrorDetails;
  cause?: Error;
}

/**
 * Error severity level
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error category
 */
export type ErrorCategory =
  | 'validation'
  | 'authentication'
  | 'authorization'
  | 'not_found'
  | 'conflict'
  | 'rate_limit'
  | 'internal'
  | 'external_service'
  | 'network'
  | 'timeout'
  | 'unknown';

/**
 * Extended error options
 */
export interface ExtendedAppErrorOptions extends AppErrorOptions {
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  retryable?: boolean;
  retryAfter?: number;
  requestId?: string;
}

/**
 * Application base error class
 * Base class for all custom errors, providing a unified error handling interface
 */
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: AppErrorDetails;
  public readonly severity: ErrorSeverity;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly requestId?: string;
  public readonly timestamp: Date;
  public readonly cause?: Error;

  constructor(options: ExtendedAppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;
    this.severity = options.severity ?? 'medium';
    this.category = options.category ?? 'unknown';
    this.retryable = options.retryable ?? options.isOperational !== false;
    this.retryAfter = options.retryAfter;
    this.requestId = options.requestId ?? AppError.generateRequestId();
    this.timestamp = new Date();

    if (options.cause) {
      this.cause = options.cause;
    }

    Object.setPrototypeOf(this, new.target.prototype);
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Convert to JSON object
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      severity: this.severity,
      category: this.category,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      stack: this.stack,
      cause:
        this.cause instanceof Error
          ? {
              name: this.cause.name,
              message: this.cause.message,
              stack: this.cause.stack,
            }
          : undefined,
    };
  }

  /**
   * Convert to API response format
   */
  toApiResponse(): {
    success: false;
    error: {
      code: string;
      message: string;
      retryable: boolean;
      retryAfter?: number;
      requestId: string | undefined;
      details?: AppErrorDetails;
    };
    timestamp: string;
  } {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        retryAfter: this.retryAfter,
        requestId: this.requestId,
        details: this.details,
      },
      timestamp: this.timestamp.toISOString(),
    };
  }

  /**
   * Convert to log format
   */
  toLogEntry(): Record<string, unknown> {
    return {
      level: this.getLogLevel(),
      code: this.code,
      message: this.message,
      severity: this.severity,
      category: this.category,
      statusCode: this.statusCode,
      requestId: this.requestId,
      timestamp: this.timestamp.toISOString(),
      isOperational: this.isOperational,
      retryable: this.retryable,
      details: this.details,
      stack: this.stack,
    };
  }

  /**
   * Get log level based on severity level
   */
  private getLogLevel(): 'debug' | 'info' | 'warn' | 'error' {
    switch (this.severity) {
      case 'critical':
      case 'high':
        return 'error';
      case 'medium':
        return 'warn';
      case 'low':
        return 'info';
      default:
        return 'error';
    }
  }

  /**
   * Check if should retry
   */
  shouldRetry(): boolean {
    return this.retryable;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    return this.isOperational ? this.message : 'An unexpected error occurred';
  }
}

/**
 * Error code constants
 */
export const ErrorCodes = {
  // validateerror
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // authentication/authorizationerror
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_INVALID: 'SESSION_INVALID',

 // error
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // conflicterror
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',

 // error
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

 // serviceerror
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',

  // externalserviceerror
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  ORACLE_ERROR: 'ORACLE_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

 // error
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
} as const;

type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * HTTP status code mapping
 */
export const HttpStatusCodes = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

type HttpStatusCode = (typeof HttpStatusCodes)[keyof typeof HttpStatusCodes];
