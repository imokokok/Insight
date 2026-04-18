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
 * Field validation error
 * Validation error for a specific field
 */
class FieldValidationError extends ValidationError {
  constructor(field: string, message: string, value?: unknown) {
    super(message, { field, value });
    this.name = 'FieldValidationError';
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
 * Token expired error
 */
class TokenExpiredError extends AuthenticationError {
  constructor(message = 'Token has expired', details?: AuthenticationErrorDetails) {
    super(message, { ...details, reason: 'token_expired' });
    this.name = 'TokenExpiredError';
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
interface ConflictErrorDetails extends AppErrorDetails {
  resource?: string;
  conflictingValue?: unknown;
  existingResource?: unknown;
}

/**
 * Resource conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: ConflictErrorDetails) {
    super({
      message,
      code: ErrorCodes.CONFLICT,
      statusCode: HttpStatusCodes.CONFLICT,
      category: 'conflict',
      severity: 'medium',
      details,
    });
  }
}

/**
 * Duplicate entry error
 */
class DuplicateEntryError extends ConflictError {
  constructor(resource: string, field: string, value: unknown) {
    super(`${resource} with ${field} '${value}' already exists`, {
      resource,
      conflictingValue: { field, value },
    });
    this.name = 'DuplicateEntryError';
  }
}

/**
 * Rate limit error details
 */
interface RateLimitErrorDetails extends AppErrorDetails {
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  window?: number;
}

/**
 * Rate limit error
 */
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
 * Service unavailable error
 */
class ServiceUnavailableError extends InternalError {
  constructor(service: string, details?: InternalErrorDetails, cause?: Error) {
    super(
      `Service '${service}' is currently unavailable`,
      { ...details, operation: service },
      cause
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Database error
 */
class DatabaseError extends InternalError {
  constructor(message: string, operation?: string, cause?: Error) {
    super(message, { operation, originalError: cause?.message }, cause);
    this.name = 'DatabaseError';
  }
}

/**
 * Not implemented error
 */
export class NotImplementedError extends AppError {
  constructor(feature: string) {
    super({
      message: `Feature '${feature}' is not implemented yet`,
      code: 'NOT_IMPLEMENTED',
      statusCode: HttpStatusCodes.NOT_FOUND,
      category: 'internal',
      severity: 'medium',
      isOperational: true,
    });
    this.name = 'NotImplementedError';
  }
}

/**
 * Network error details
 */
interface NetworkErrorDetails extends AppErrorDetails {
  url?: string;
  method?: string;
  timeout?: number;
}

/**
 * Network error
 */
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

/**
 * Timeout error
 */
class TimeoutError extends NetworkError {
  constructor(operation: string, timeout: number, details?: NetworkErrorDetails, cause?: Error) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      { ...details, timeout, operation },
      cause
    );
    this.name = 'TimeoutError';
  }
}

/**
 * External service error details
 */
interface ExternalServiceErrorDetails extends AppErrorDetails {
  service?: string;
  endpoint?: string;
  responseStatus?: number;
  responseBody?: unknown;
}

/**
 * External service error
 */
class ExternalServiceError extends AppError {
  constructor(
    service: string,
    message: string,
    details?: ExternalServiceErrorDetails,
    cause?: Error
  ) {
    super({
      message: `${service} error: ${message}`,
      code: ErrorCodes.EXTERNAL_SERVICE_ERROR,
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: 'high',
      retryable: true,
      details: { service, ...details },
      cause,
    });
  }
}
