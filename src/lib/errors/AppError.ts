/**
 * 应用错误详情接口
 * 所有错误详情对象的基础接口
 */
export interface AppErrorDetails {
  [key: string]: unknown;
}

/**
 * 应用错误选项
 * 用于创建 AppError 的完整配置选项
 */
export interface AppErrorOptions {
  message: string;
  code: string;
  statusCode: number;
  isOperational?: boolean;
  details?: AppErrorDetails;
  i18nKey?: string;
  cause?: Error;
}

/**
 * 错误严重级别
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * 错误分类
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
 * 扩展的错误选项
 */
export interface ExtendedAppErrorOptions extends AppErrorOptions {
  severity?: ErrorSeverity;
  category?: ErrorCategory;
  retryable?: boolean;
  retryAfter?: number;
  requestId?: string;
}

/**
 * 应用基础错误类
 * 所有自定义错误的基类，提供统一的错误处理接口
 */
export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: AppErrorDetails;
  public readonly i18nKey?: string;
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
    this.i18nKey = options.i18nKey;
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
   * 生成唯一请求ID
   */
  private static generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 转换为JSON对象
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
      i18nKey: this.i18nKey,
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
   * 转换为API响应格式
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
   * 转换为日志格式
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
   * 根据严重级别获取日志级别
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
   * 检查是否应该重试
   */
  shouldRetry(): boolean {
    return this.retryable;
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    if (this.i18nKey) {
      return this.i18nKey;
    }
    return this.isOperational ? this.message : 'An unexpected error occurred';
  }
}

/**
 * 错误代码常量
 */
export const ErrorCodes = {
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // 认证/授权错误
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_INVALID: 'SESSION_INVALID',

  // 资源错误
  NOT_FOUND: 'NOT_FOUND',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND: 'USER_NOT_FOUND',

  // 冲突错误
  CONFLICT: 'CONFLICT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  RESOURCE_EXISTS: 'RESOURCE_EXISTS',

  // 限流错误
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',

  // 服务器错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR',

  // 外部服务错误
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  ORACLE_ERROR: 'ORACLE_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // 业务逻辑错误
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * HTTP状态码映射
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

export type HttpStatusCode = (typeof HttpStatusCodes)[keyof typeof HttpStatusCodes];
