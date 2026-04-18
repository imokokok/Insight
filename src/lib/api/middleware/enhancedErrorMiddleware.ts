import { NextResponse } from 'next/server';

import { isAppError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('enhanced-error-middleware');

interface EnhancedErrorMiddlewareOptions {
  includeStackTrace?: boolean;
  logErrors?: boolean;
  includeRequestId?: boolean;
  includeTimestamp?: boolean;
  includeDocumentationUrl?: boolean;
  errorCodePrefix?: string;
}

export interface StandardizedErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
    documentationUrl?: string;
    requestId?: string;
    timestamp: number;
    stackTrace?: string;
  };
  meta: {
    requestId?: string;
    timestamp: number;
    path?: string;
    method?: string;
  };
}

/**
 * HTTP 状态码到错误码的映射
 */
const HTTP_STATUS_TO_ERROR_CODE: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  408: 'REQUEST_TIMEOUT',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT',
};

/**
 * 错误码到文档 URL 的映射
 */
const ERROR_CODE_DOCUMENTATION: Record<string, string> = {
  VALIDATION_ERROR: '/docs/errors/validation',
  AUTHENTICATION_ERROR: '/docs/errors/authentication',
  AUTHORIZATION_ERROR: '/docs/errors/authorization',
  NOT_FOUND: '/docs/errors/not-found',
  RATE_LIMIT_EXCEEDED: '/docs/errors/rate-limit',
  INTERNAL_ERROR: '/docs/errors/internal',
  PRICE_FETCH_ERROR: '/docs/errors/price-fetch',
  ORACLE_CLIENT_ERROR: '/docs/errors/oracle-client',
  BAD_REQUEST: '/docs/errors/bad-request',
  UNAUTHORIZED: '/docs/errors/unauthorized',
  FORBIDDEN: '/docs/errors/forbidden',
  CONFLICT: '/docs/errors/conflict',
  SERVICE_UNAVAILABLE: '/docs/errors/service-unavailable',
};

/**
 * 生成唯一请求 ID
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 获取错误对应的文档 URL
 */
function getDocumentationUrl(errorCode: string, baseUrl?: string): string | undefined {
  const docPath = ERROR_CODE_DOCUMENTATION[errorCode];
  if (!docPath) return undefined;
  return baseUrl ? `${baseUrl}${docPath}` : docPath;
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }

  if (error instanceof Error) {
    const retryablePatterns = [
      'network',
      'fetch',
      'timeout',
      'ECONNREFUSED',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
    ];
    return retryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  return false;
}

/**
 * 提取 HTTP 状态码
 */
function extractStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }

  if (error instanceof Error) {
    const statusMatch = error.message.match(/(?:status[:=\s]+|HTTP\s+)(\d{3})(?:\s|$|\b)/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      if (status >= 100 && status < 600) {
        return status;
      }
    }
  }

  return 500;
}

/**
 * 创建增强的错误响应
 */
function createErrorResponse(
  error: unknown,
  options: EnhancedErrorMiddlewareOptions,
  requestInfo?: { requestId?: string; path?: string; method?: string }
): StandardizedErrorResponse {
  const timestamp = Date.now();
  const requestId = requestInfo?.requestId || generateRequestId();

  let errorCode: string;
  let message: string;
  let details: Record<string, unknown> | undefined;
  let stackTrace: string | undefined;

  if (isAppError(error)) {
    errorCode = error.code;
    message = error.message;
    details = error.details as Record<string, unknown> | undefined;
  } else if (error instanceof SyntaxError && error.message.includes('JSON')) {
    errorCode = 'INVALID_JSON';
    message = 'Invalid JSON in request body';
  } else if (error instanceof Error) {
    const statusCode = extractStatusCode(error);
    errorCode = HTTP_STATUS_TO_ERROR_CODE[statusCode] || 'INTERNAL_ERROR';
    message = error.message;

    if (options.includeStackTrace && process.env.NODE_ENV !== 'production') {
      stackTrace = error.stack;
    }
  } else {
    errorCode = 'UNKNOWN_ERROR';
    message = 'An unexpected error occurred';
  }

  const documentationUrl = options.includeDocumentationUrl
    ? getDocumentationUrl(errorCode)
    : undefined;

  return {
    success: false,
    error: {
      code: errorCode,
      message,
      details,
      retryable: isRetryableError(error),
      documentationUrl,
      requestId: options.includeRequestId ? requestId : undefined,
      timestamp,
      stackTrace,
    },
    meta: {
      requestId: options.includeRequestId ? requestId : undefined,
      timestamp,
      path: requestInfo?.path,
      method: requestInfo?.method,
    },
  };
}

/**
 * 创建增强的错误处理中间件
 */
export function createEnhancedErrorMiddleware(options: EnhancedErrorMiddlewareOptions = {}) {
  const { logErrors = true, includeRequestId = true } = options;

  return async (
    error: unknown,
    request?: Request,
    requestId?: string
  ): Promise<NextResponse<StandardizedErrorResponse>> => {
    const generatedRequestId = requestId || generateRequestId();
    const requestInfo = request
      ? {
          requestId: generatedRequestId,
          path: new URL(request.url).pathname,
          method: request.method,
        }
      : { requestId: generatedRequestId };

    // 日志记录
    if (logErrors) {
      const logContext = {
        requestId: generatedRequestId,
        path: requestInfo.path,
        method: requestInfo.method,
        timestamp: new Date().toISOString(),
      };

      if (isAppError(error)) {
        logger.error(`[${error.code}] ${error.message}`, error as Error, {
          ...logContext,
          statusCode: error.statusCode,
          details: error.details,
          isOperational: error.isOperational,
        });
      } else if (error instanceof Error) {
        logger.error(`[Unhandled] ${error.message}`, error, logContext);
      } else {
        logger.error('[Unknown] Unknown error type', undefined, {
          ...logContext,
          error: String(error),
        });
      }
    }

    // 创建标准化错误响应
    const errorResponse = createErrorResponse(error, options, requestInfo);
    const statusCode = extractStatusCode(error);

    const response = NextResponse.json(errorResponse, { status: statusCode });

    // 添加响应头
    if (includeRequestId) {
      response.headers.set('X-Request-ID', generatedRequestId);
    }

    // 添加重试相关的响应头
    if (errorResponse.error.retryable) {
      response.headers.set('X-Retryable', 'true');
      const retryAfter = errorResponse.error.details?.retryAfter;
      if (typeof retryAfter === 'number') {
        response.headers.set('Retry-After', String(retryAfter));
      }
    }

    return response;
  };
}

/**
 * 默认的增强错误处理中间件
 */
export const enhancedErrorMiddleware = createEnhancedErrorMiddleware();

/**
 * 开发环境错误处理中间件（包含堆栈跟踪）
 */
export const developmentErrorMiddleware = createEnhancedErrorMiddleware({
  includeStackTrace: true,
  logErrors: true,
  includeRequestId: true,
  includeTimestamp: true,
  includeDocumentationUrl: true,
});

/**
 * 生产环境错误处理中间件（不包含敏感信息）
 */
export const productionErrorMiddleware = createEnhancedErrorMiddleware({
  includeStackTrace: false,
  logErrors: true,
  includeRequestId: true,
  includeTimestamp: true,
  includeDocumentationUrl: true,
});

/**
 * 包装 API 路由处理函数，自动处理错误
 */
export function withEnhancedErrorHandling<T>(
  handler: (request: Request) => Promise<T>,
  options?: EnhancedErrorMiddlewareOptions
): (request: Request) => Promise<T | NextResponse<StandardizedErrorResponse>> {
  const middleware = createEnhancedErrorMiddleware(options);

  return async (request: Request) => {
    try {
      return await handler(request);
    } catch (error) {
      return middleware(error, request);
    }
  };
}

/**
 * 错误分类工具函数
 */
export function classifyError(error: unknown): {
  category: 'client' | 'server' | 'network' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  if (isAppError(error)) {
    if (error.statusCode >= 500) {
      return { category: 'server', severity: 'high' };
    }
    if (error.statusCode >= 400) {
      return { category: 'client', severity: 'medium' };
    }
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('econnrefused')
    ) {
      return { category: 'network', severity: 'high' };
    }
  }

  return { category: 'unknown', severity: 'critical' };
}

/**
 * 获取建议的用户操作
 */
export function getSuggestedAction(errorCode: string): string | undefined {
  const suggestions: Record<string, string> = {
    VALIDATION_ERROR: 'Please check that the input data meets the requirements',
    AUTHENTICATION_ERROR: 'Please log in again or check your credentials',
    AUTHORIZATION_ERROR: 'Please confirm you have permission to perform this action',
    NOT_FOUND: 'Please confirm the requested resource exists',
    RATE_LIMIT_EXCEEDED: 'Please try again later or reduce request frequency',
    INTERNAL_ERROR: 'Please try again later. If the problem persists, contact support',
    PRICE_FETCH_ERROR: 'Please check your network connection or try again later',
    ORACLE_CLIENT_ERROR: 'Oracle service is temporarily unavailable, please try again later',
    BAD_REQUEST: 'Please check that the request parameters are correct',
    UNAUTHORIZED: 'Please log in before performing this action',
    FORBIDDEN: 'You do not have permission to access this resource',
    CONFLICT: 'The request conflicts with the current resource state, please refresh and retry',
    SERVICE_UNAVAILABLE: 'Service is temporarily unavailable, please try again later',
  };

  return suggestions[errorCode];
}
