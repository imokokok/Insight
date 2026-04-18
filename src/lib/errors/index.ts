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

export { AppError } from './AppError';

// ==================== 业务错误 ====================
export {
  // 验证错误
  ValidationError,

  // 资源错误
  NotFoundError,

  // 认证/授权错误
  AuthenticationError,
  AuthorizationError,

  // 冲突错误

  // 限流错误
  RateLimitError,

  // 内部错误
  InternalError,

  // 网络错误
  NetworkError,

  // 外部服务错误
} from './BusinessErrors';

// ==================== Oracle 错误 ====================
export {
  // 基础 Oracle 错误
  OracleClientError,

  // 通用 Oracle 错误类 (支持 instanceof 检查)

  // 价格获取错误
  PriceFetchError,

  // 支持性错误

  // RedStone 错误
  RedStoneApiError,
  type RedStoneErrorCode,

  // Chainlink 错误

  // Pyth 错误

  // API3 错误

  // Supra 错误

  // Flare 错误
  FlareError,
} from './OracleError';

// ==================== 错误响应处理 ====================
export { errorToResponse, isAppError } from './errorToResponse';

// ==================== 错误恢复 ====================
// ==================== 错误工具函数 ====================

/**
 * 检查错误是否为特定类型
 */
function isValidationError(error: unknown): error is InstanceType<typeof ValidationError> {
  return error instanceof ValidationError;
}

function isNotFoundError(error: unknown): error is InstanceType<typeof NotFoundError> {
  return error instanceof NotFoundError;
}

function isAuthenticationError(error: unknown): error is InstanceType<typeof AuthenticationError> {
  return error instanceof AuthenticationError;
}

function isAuthorizationError(error: unknown): error is InstanceType<typeof AuthorizationError> {
  return error instanceof AuthorizationError;
}

function isRateLimitError(error: unknown): error is InstanceType<typeof RateLimitError> {
  return error instanceof RateLimitError;
}

function isNetworkError(error: unknown): error is InstanceType<typeof NetworkError> {
  return error instanceof NetworkError;
}

/**
 * 安全地获取错误消息
 */
function getErrorMessage(error: unknown): string {
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
function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * 检查错误是否应该显示给用户
 */
function shouldShowErrorToUser(error: unknown): boolean {
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
/**
 * 将未知错误转换为 AppError
 */
function toAppError(error: unknown): AppErrorType {
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
interface ErrorClassification {
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
function createErrorHandler<T>(
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
interface ErrorBoundaryHandler {
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  onReset?: () => void;
  fallback?: React.ReactNode;
}
