import { NextResponse } from 'next/server';

import { type ZodError } from 'zod';

import { type AppError, isAppError, errorToResponse as baseErrorToResponse } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { createErrorResponse as createStandardErrorResponse, ErrorCode } from '@/types/api/error';

import { ZodValidationError, isZodValidationError } from './errors';

const logger = createLogger('error-handler');

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    i18nKey?: string;
  };
  timestamp: number;
}

export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * 创建错误响应
 * 复用 errorTypes.ts 中的标准错误响应创建函数
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  statusCode: number = 400
): NextResponse {
  // 将字符串 code 转换为 ErrorCode 枚举（如果匹配）
  const errorCode = Object.values(ErrorCode).includes(code as ErrorCode)
    ? (code as ErrorCode)
    : ErrorCode.BAD_REQUEST;

  const standardResponse = createStandardErrorResponse(errorCode, message, {
    details: details as Record<string, unknown>,
  });

  return NextResponse.json(standardResponse, { status: statusCode });
}

/**
 * 处理 Zod 验证错误
 * 统一使用 ZodValidationError.fromZodError 来转换错误
 */
export function handleValidationError(
  error: ZodError | ZodValidationError,
  context?: string
): NextResponse {
  // 统一转换为 ZodValidationError
  const zodValidationError =
    error instanceof ZodValidationError ? error : ZodValidationError.fromZodError(error);

  const errors = zodValidationError.details?.errors || [];

  const contextMessage = context ? ` in ${context}` : '';
  logger.warn(`Validation error${contextMessage}`, { errors, context });

  // 使用 ZodValidationError 的 toResponse 方法
  const response = zodValidationError.toResponse();
  return NextResponse.json(response, { status: 400 });
}

/**
 * 处理 AppError
 * 复用基础错误处理函数
 */
export function handleAppError(error: AppError): NextResponse {
  // 直接使用 errorToResponse 处理
  return baseErrorToResponse(error);
}

/**
 * 处理未知错误
 */
export function handleUnknownError(error: unknown): NextResponse {
  logger.error(
    'Unexpected error occurred',
    error instanceof Error ? error : new Error(String(error))
  );

  const standardResponse = createStandardErrorResponse(
    ErrorCode.INTERNAL_ERROR,
    'An unexpected error occurred. Please try again later.'
  );

  return NextResponse.json(standardResponse, { status: 500 });
}

/**
 * 统一错误处理入口
 */
export function handleError(error: unknown, context?: string): NextResponse {
  // 优先处理 ZodValidationError
  if (isZodValidationError(error)) {
    return handleValidationError(error, context);
  }

  // 处理原生 ZodError
  if (error && typeof error === 'object' && 'issues' in error) {
    return handleValidationError(error as ZodError, context);
  }

  // 处理 AppError
  if (isAppError(error)) {
    return handleAppError(error);
  }

  // 处理其他错误
  return handleUnknownError(error);
}

/**
 * 包装处理器，自动处理错误
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse> {
  return handler().catch((error) => handleError(error, context));
}

/**
 * 创建字段验证错误响应
 */
export function createValidationErrorResponse(
  field: string,
  message: string,
  value?: unknown
): NextResponse {
  const standardResponse = createStandardErrorResponse(ErrorCode.VALIDATION_ERROR, message, {
    details: { errors: [{ field, message }], value },
  });

  return NextResponse.json(standardResponse, { status: 400 });
}

/**
 * 创建未找到错误响应
 */
export function createNotFoundErrorResponse(resource: string, id?: string): NextResponse {
  const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;

  const standardResponse = createStandardErrorResponse(ErrorCode.NOT_FOUND, message, {
    details: { resource, id },
  });

  return NextResponse.json(standardResponse, { status: 404 });
}

/**
 * 创建未授权错误响应
 */
export function createUnauthorizedErrorResponse(message: string = 'Unauthorized'): NextResponse {
  const standardResponse = createStandardErrorResponse(ErrorCode.UNAUTHORIZED, message);

  return NextResponse.json(standardResponse, { status: 401 });
}

/**
 * 创建禁止访问错误响应
 */
export function createForbiddenErrorResponse(message: string = 'Forbidden'): NextResponse {
  const standardResponse = createStandardErrorResponse(ErrorCode.FORBIDDEN, message);

  return NextResponse.json(standardResponse, { status: 403 });
}

/**
 * 创建限流错误响应
 */
export function createRateLimitErrorResponse(retryAfter?: number): NextResponse {
  const standardResponse = createStandardErrorResponse(
    ErrorCode.RATE_LIMIT_EXCEEDED,
    'Too many requests. Please try again later.',
    {
      details: retryAfter ? { retryAfter } : undefined,
    }
  );

  const response = NextResponse.json(standardResponse, { status: 429 });

  if (retryAfter) {
    response.headers.set('Retry-After', String(retryAfter));
  }

  return response;
}
