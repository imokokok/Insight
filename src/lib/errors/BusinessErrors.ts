import { AppError, type AppErrorDetails, ErrorCodes, HttpStatusCodes } from './AppError';

/**
 * Validation error details
 */
interface ValidationErrorDetails extends AppErrorDetails {
  field?: string;
  value?: unknown;
  constraints?: Record<string, unknown>;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Validation error
 * Used when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ValidationErrorDetails) {
    super({
      message,
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: HttpStatusCodes.BAD_REQUEST,
      category: 'validation',
      severity: 'low',
      details,
    });
  }
}

/**
 * Not found error details
 */
interface NotFoundErrorDetails extends AppErrorDetails {
  resource?: string;
  identifier?: string | number;
  resourceType?: string;
}

/**
 * Resource not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string, details?: NotFoundErrorDetails) {
    super({
      message,
      code: ErrorCodes.NOT_FOUND,
      statusCode: HttpStatusCodes.NOT_FOUND,
      category: 'not_found',
      severity: 'low',
      details,
    });
  }

  /**
   * Create resource not found error
   */
  static forResource(resourceType: string, identifier: string | number): NotFoundError {
    return new NotFoundError(`${resourceType} with identifier '${identifier}' was not found`, {
      resourceType,
      identifier,
    });
  }
}

/**
 * Authentication error details
 */
interface AuthenticationErrorDetails extends AppErrorDetails {
  reason?: string;
  provider?: string;
}

/**
 * Authentication error
 * User authentication failed
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: AuthenticationErrorDetails) {
    super({
      message,
      code: ErrorCodes.AUTHENTICATION_ERROR,
      statusCode: HttpStatusCodes.UNAUTHORIZED,
      category: 'authentication',
      severity: 'medium',
      details,
    });
  }
}

/**
 * Authorization error details
 */
interface AuthorizationErrorDetails extends AppErrorDetails {
  resource?: string;
  action?: string;
  requiredPermission?: string;
  currentUser?: string;
}

/**
 * Authorization error
 * User does not have permission to perform the operation
 */
export class AuthorizationError extends AppError {
  constructor(message: string, details?: AuthorizationErrorDetails) {
    super({
      message,
      code: ErrorCodes.AUTHORIZATION_ERROR,
      statusCode: HttpStatusCodes.FORBIDDEN,
      category: 'authorization',
      severity: 'high',
      details,
    });
  }
}

/**
 * Conflict error details
 */
interface RateLimitErrorDetails extends AppErrorDetails {
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  window?: number;
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string, details?: RateLimitErrorDetails) {
    super({
      message,
      code: ErrorCodes.RATE_LIMIT_EXCEEDED,
      statusCode: HttpStatusCodes.TOO_MANY_REQUESTS,
      category: 'rate_limit',
      severity: 'medium',
      retryable: true,
      retryAfter: details?.retryAfter,
      details,
    });
    this.retryAfter = details?.retryAfter;
  }
}

/**
 * Internal error details
 */
interface InternalErrorDetails extends AppErrorDetails {
  operation?: string;
  originalError?: string;
  component?: string;
}

/**
 * Internal server error
 */
export class InternalError extends AppError {
  constructor(message: string, details?: InternalErrorDetails, cause?: Error) {
    super({
      message,
      code: ErrorCodes.INTERNAL_ERROR,
      statusCode: HttpStatusCodes.INTERNAL_SERVER_ERROR,
      category: 'internal',
      severity: 'critical',
      isOperational: false,
      details,
      cause,
    });
  }
}

/**
 * Not implemented error
 */
interface NetworkErrorDetails extends AppErrorDetails {
  url?: string;
  method?: string;
  timeout?: number;
}

export class NetworkError extends AppError {
  constructor(message: string, details?: NetworkErrorDetails, cause?: Error) {
    super({
      message,
      code: ErrorCodes.NETWORK_ERROR,
      statusCode: HttpStatusCodes.SERVICE_UNAVAILABLE,
      category: 'network',
      severity: 'high',
      retryable: true,
      details,
      cause,
    });
  }
}
