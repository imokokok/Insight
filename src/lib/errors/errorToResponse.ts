import { NextResponse } from 'next/server';

import {
  createErrorResponse as createStandardErrorResponse,
  ErrorCode,
} from '@/lib/api/types/errorTypes';
import { createLogger } from '@/lib/utils/logger';

import { AppError } from './AppError';

const logger = createLogger('error-handler');

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    i18nKey?: string;
  };
}

/**
 * 将错误转换为 NextResponse 响应
 * 复用 errorTypes.ts 中的标准错误响应创建函数
 */
export function errorToResponse(error: unknown): NextResponse {
  // 记录错误日志
  if (error instanceof AppError) {
    logger.error(`AppError: ${error.code} - ${error.message}`, error as Error, {
      statusCode: error.statusCode,
      details: error.details,
    });

    // 使用标准的错误响应创建函数
    const standardResponse = createStandardErrorResponse(error.code as ErrorCode, error.message, {
      details: error.details,
    });

    return NextResponse.json(standardResponse, { status: error.statusCode });
  }

  // 处理原生 Error
  if (error instanceof Error) {
    logger.error(`Unhandled Error: ${error.message}`, error);

    const standardResponse = createStandardErrorResponse(ErrorCode.INTERNAL_ERROR, error.message);

    return NextResponse.json(standardResponse, { status: 500 });
  }

  // 处理未知错误类型
  logger.error('Unknown error type');

  const standardResponse = createStandardErrorResponse(
    ErrorCode.UNKNOWN_ERROR,
    'An unexpected error occurred'
  );

  return NextResponse.json(standardResponse, { status: 500 });
}

/**
 * 处理错误并添加上下文信息
 */
export function handleError(
  error: unknown,
  context?: {
    operation?: string;
    provider?: string;
    symbol?: string;
  }
): NextResponse {
  if (context) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error in ${context.operation || 'unknown operation'}`, err, {
      context,
    });
  }

  return errorToResponse(error);
}

/**
 * 检查错误是否为 AppError 类型
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * 检查错误是否为可预期的操作错误
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * 检查错误是否应该重试
 * 复用 errorTypes.ts 中的逻辑
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.retryable;
  }

  if (error instanceof Error) {
    // 检查错误消息中是否包含可重试的模式
    const retryablePatterns = [
      'network',
      'timeout',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'fetch',
      'abort',
      'ECONNRESET',
      'EAI_AGAIN',
    ];
    return retryablePatterns.some((pattern) =>
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  return false;
}
