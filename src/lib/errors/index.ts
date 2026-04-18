// ==================== 基础错误类 ====================
// ==================== 导入类型用于工具函数 ====================
import {
  ValidationError,
  NotFoundError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  NetworkError,
  InternalError,
} from './BusinessErrors';
import { isAppError } from './errorToResponse';

import type { AppError as AppErrorType } from './AppError';

export {
  AppError,
  type AppErrorDetails,
  type AppErrorOptions,
  type ExtendedAppErrorOptions,
  type ErrorSeverity,
  type ErrorCategory,
  ErrorCodes,
  type ErrorCode,
  HttpStatusCodes,
  type HttpStatusCode,
} from './AppError';

// ==================== 业务错误 ====================
export {
  // 验证错误
  ValidationError,
  FieldValidationError,
  type ValidationErrorDetails,

  // 资源错误
  NotFoundError,
  type NotFoundErrorDetails,

  // 认证/授权错误
  AuthenticationError,
  TokenExpiredError,
  type AuthenticationErrorDetails,
  AuthorizationError,
  type AuthorizationErrorDetails,

  // 冲突错误
  ConflictError,
  DuplicateEntryError,
  type ConflictErrorDetails,

  // 限流错误
  RateLimitError,
  type RateLimitErrorDetails,

  // 内部错误
  InternalError,
  ServiceUnavailableError,
  DatabaseError,
  NotImplementedError,
  type InternalErrorDetails,

  // 网络错误
  NetworkError,
  TimeoutError,
  type NetworkErrorDetails,

  // 外部服务错误
  ExternalServiceError,
  type ExternalServiceErrorDetails,
} from './BusinessErrors';

// ==================== Oracle 错误 ====================
export {
  // 基础 Oracle 错误
  OracleClientError,
  type OracleErrorDetails,

  // 通用 Oracle 错误类 (支持 instanceof 检查)
  OracleError,

  // 价格获取错误
  PriceFetchError,
  type PriceFetchErrorDetails,

  // 支持性错误
  UnsupportedChainError,
  type UnsupportedChainErrorDetails,
  UnsupportedSymbolError,
  type UnsupportedSymbolErrorDetails,

  // RedStone 错误
  RedStoneApiError,
  type RedStoneApiErrorDetails,
  type RedStoneErrorCode,

  // Chainlink 错误
  ChainlinkError,
  type ChainlinkErrorDetails,
  type ChainlinkErrorCode,

  // Pyth 错误
  PythError,
  type PythErrorDetails,
  type PythErrorCode,

  // API3 错误
  API3Error,
  type API3ErrorDetails,
  type API3ErrorCode,

  // Supra 错误
  SupraError,
  type SupraErrorDetails,
  type SupraErrorCode,

  // Flare 错误
  FlareError,
  type FlareErrorDetails,
  type FlareErrorCode,
} from './OracleError';

// ==================== 错误响应处理 ====================
export {
  errorToResponse,
  handleError,
  isAppError,
  isOperationalError,
  isRetryableError,
  type ErrorResponse,
} from './errorToResponse';

// ==================== 错误恢复 ====================
export {
  errorRecovery,
  errorReporting,
  useErrorRecovery,
  createRetryableFetch,
  ErrorReportingService,
  type RetryConfig,
  type ErrorLogEntry,
  type ErrorContext,
  type ErrorReport,
} from './errorRecovery';

// ==================== 错误工具函数 ====================

/**
 * 检查错误是否为特定类型
 */
export function isValidationError(error: unknown): error is InstanceType<typeof ValidationError> {
  return error instanceof ValidationError;
}

export function isNotFoundError(error: unknown): error is InstanceType<typeof NotFoundError> {
  return error instanceof NotFoundError;
}

export function isAuthenticationError(
  error: unknown
): error is InstanceType<typeof AuthenticationError> {
  return error instanceof AuthenticationError;
}

export function isAuthorizationError(
  error: unknown
): error is InstanceType<typeof AuthorizationError> {
  return error instanceof AuthorizationError;
}

export function isRateLimitError(error: unknown): error is InstanceType<typeof RateLimitError> {
  return error instanceof RateLimitError;
}

export function isNetworkError(error: unknown): error is InstanceType<typeof NetworkError> {
  return error instanceof NetworkError;
}

/**
 * 安全地获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.getUserMessage();
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
 * 安全地获取错误代码
 */
export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * 检查错误是否应该显示给用户
 */
export function shouldShowErrorToUser(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * 检查错误是否应该重试
 * isRetryableError 已经从 errorToResponse.ts 导出
 * 这里保留 shouldRetryError 作为别名以兼容旧代码
 */
export { isRetryableError as shouldRetryError } from './errorToResponse';

/**
 * 将未知错误转换为 AppError
 */
export function toAppError(error: unknown): AppErrorType {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, { originalError: error.name }, error) as AppErrorType;
  }

  return new InternalError(typeof error === 'string' ? error : 'An unexpected error occurred', {
    originalValue: String(error),
  }) as AppErrorType;
}

/**
 * 错误分类器
 */
export interface ErrorClassification {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * 分类错误
 */
export function classifyError(error: unknown): ErrorClassification {
  if (isAppError(error)) {
    return {
      category: error.category,
      severity: error.severity,
      retryable: error.retryable,
      logLevel: error.toLogEntry().level as 'debug' | 'info' | 'warn' | 'error',
    };
  }

  // 根据错误类型推断分类
  if (error instanceof TypeError) {
    return {
      category: 'validation',
      severity: 'medium',
      retryable: false,
      logLevel: 'warn',
    };
  }

  if (error instanceof RangeError) {
    return {
      category: 'internal',
      severity: 'high',
      retryable: false,
      logLevel: 'error',
    };
  }

  if (error instanceof SyntaxError) {
    return {
      category: 'validation',
      severity: 'high',
      retryable: false,
      logLevel: 'error',
    };
  }

  // 默认分类
  return {
    category: 'unknown',
    severity: 'critical',
    retryable: false,
    logLevel: 'error',
  };
}

/**
 * 创建错误处理器
 */
export function createErrorHandler<T>(
  handler: (error: AppErrorType) => T,
  fallback?: T
): (error: unknown) => T {
  return (error: unknown) => {
    try {
      const appError = toAppError(error);
      return handler(appError);
    } catch (handlerError) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw handlerError;
    }
  };
}

/**
 * 错误边界处理器
 */
export interface ErrorBoundaryHandler {
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  onReset?: () => void;
  fallback?: React.ReactNode;
}
