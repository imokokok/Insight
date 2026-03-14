import { AppError, AppErrorDetails } from './AppError';

export interface ValidationErrorDetails extends AppErrorDetails {
  field?: string;
  value?: unknown;
  constraints?: Record<string, string>;
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: ValidationErrorDetails,
    i18nKey?: string
  ) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details,
      i18nKey: i18nKey ?? 'errors.validation',
    });
  }
}

export interface NotFoundErrorDetails extends AppErrorDetails {
  resource?: string;
  identifier?: string | number;
}

export class NotFoundError extends AppError {
  constructor(
    message: string,
    details?: NotFoundErrorDetails,
    i18nKey?: string
  ) {
    super({
      message,
      code: 'NOT_FOUND',
      statusCode: 404,
      details,
      i18nKey: i18nKey ?? 'errors.notFound',
    });
  }
}

export interface AuthenticationErrorDetails extends AppErrorDetails {
  reason?: string;
}

export class AuthenticationError extends AppError {
  constructor(
    message: string,
    details?: AuthenticationErrorDetails,
    i18nKey?: string
  ) {
    super({
      message,
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      details,
      i18nKey: i18nKey ?? 'errors.authentication',
    });
  }
}

export interface AuthorizationErrorDetails extends AppErrorDetails {
  resource?: string;
  action?: string;
  requiredPermission?: string;
}

export class AuthorizationError extends AppError {
  constructor(
    message: string,
    details?: AuthorizationErrorDetails,
    i18nKey?: string
  ) {
    super({
      message,
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      details,
      i18nKey: i18nKey ?? 'errors.authorization',
    });
  }
}

export interface ConflictErrorDetails extends AppErrorDetails {
  resource?: string;
  conflictingValue?: unknown;
}

export class ConflictError extends AppError {
  constructor(
    message: string,
    details?: ConflictErrorDetails,
    i18nKey?: string
  ) {
    super({
      message,
      code: 'CONFLICT',
      statusCode: 409,
      details,
      i18nKey: i18nKey ?? 'errors.conflict',
    });
  }
}

export interface RateLimitErrorDetails extends AppErrorDetails {
  retryAfter?: number;
  limit?: number;
  remaining?: number;
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(
    message: string,
    details?: RateLimitErrorDetails,
    i18nKey?: string
  ) {
    super({
      message,
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      details,
      i18nKey: i18nKey ?? 'errors.rateLimit',
    });
    this.retryAfter = details?.retryAfter;
  }
}

export interface InternalErrorDetails extends AppErrorDetails {
  operation?: string;
  originalError?: string;
}

export class InternalError extends AppError {
  constructor(
    message: string,
    details?: InternalErrorDetails,
    i18nKey?: string,
    cause?: Error
  ) {
    super({
      message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
      isOperational: false,
      details,
      i18nKey: i18nKey ?? 'errors.internal',
      cause,
    });
  }
}
