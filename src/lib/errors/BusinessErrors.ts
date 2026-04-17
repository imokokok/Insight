import { AppError, type AppErrorDetails, ErrorCodes, HttpStatusCodes } from './AppError';

/**
 * 验证错误详情
 */
export interface ValidationErrorDetails extends AppErrorDetails {
  field?: string;
  value?: unknown;
  constraints?: Record<string, unknown>;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * 验证错误
 * 用于输入验证失败的情况
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
 * 字段验证错误
 * 针对特定字段的验证错误
 */
export class FieldValidationError extends ValidationError {
  constructor(field: string, message: string, value?: unknown) {
    super(message, { field, value });
    this.name = 'FieldValidationError';
  }
}

/**
 * 未找到错误详情
 */
export interface NotFoundErrorDetails extends AppErrorDetails {
  resource?: string;
  identifier?: string | number;
  resourceType?: string;
}

/**
 * 资源未找到错误
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
   * 创建资源未找到错误
   */
  static forResource(resourceType: string, identifier: string | number): NotFoundError {
    return new NotFoundError(`${resourceType} with identifier '${identifier}' was not found`, {
      resourceType,
      identifier,
    });
  }
}

/**
 * 认证错误详情
 */
export interface AuthenticationErrorDetails extends AppErrorDetails {
  reason?: string;
  provider?: string;
}

/**
 * 认证错误
 * 用户身份验证失败
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
 * Token过期错误
 */
export class TokenExpiredError extends AuthenticationError {
  constructor(message = 'Token has expired', details?: AuthenticationErrorDetails) {
    super(message, { ...details, reason: 'token_expired' });
    this.name = 'TokenExpiredError';
  }
}

/**
 * 授权错误详情
 */
export interface AuthorizationErrorDetails extends AppErrorDetails {
  resource?: string;
  action?: string;
  requiredPermission?: string;
  currentUser?: string;
}

/**
 * 授权错误
 * 用户没有权限执行操作
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
 * 冲突错误详情
 */
export interface ConflictErrorDetails extends AppErrorDetails {
  resource?: string;
  conflictingValue?: unknown;
  existingResource?: unknown;
}

/**
 * 资源冲突错误
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
 * 重复条目错误
 */
export class DuplicateEntryError extends ConflictError {
  constructor(resource: string, field: string, value: unknown) {
    super(`${resource} with ${field} '${value}' already exists`, {
      resource,
      conflictingValue: { field, value },
    });
    this.name = 'DuplicateEntryError';
  }
}

/**
 * 限流错误详情
 */
export interface RateLimitErrorDetails extends AppErrorDetails {
  retryAfter?: number;
  limit?: number;
  remaining?: number;
  window?: number;
}

/**
 * 限流错误
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
 * 内部错误详情
 */
export interface InternalErrorDetails extends AppErrorDetails {
  operation?: string;
  originalError?: string;
  component?: string;
}

/**
 * 内部服务器错误
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
 * 服务不可用错误
 */
export class ServiceUnavailableError extends InternalError {
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
 * 数据库错误
 */
export class DatabaseError extends InternalError {
  constructor(message: string, operation?: string, cause?: Error) {
    super(message, { operation, originalError: cause?.message }, cause);
    this.name = 'DatabaseError';
  }
}

/**
 * 未实现错误
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
 * 网络错误详情
 */
export interface NetworkErrorDetails extends AppErrorDetails {
  url?: string;
  method?: string;
  timeout?: number;
}

/**
 * 网络错误
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
 * 超时错误
 */
export class TimeoutError extends NetworkError {
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
 * 外部服务错误详情
 */
export interface ExternalServiceErrorDetails extends AppErrorDetails {
  service?: string;
  endpoint?: string;
  responseStatus?: number;
  responseBody?: unknown;
}

/**
 * 外部服务错误
 */
export class ExternalServiceError extends AppError {
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
