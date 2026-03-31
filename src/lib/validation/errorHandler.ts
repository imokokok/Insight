import { type NextResponse } from 'next/server';

import { type ZodError } from 'zod';

import { type AppError, isAppError } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';

import { ZodValidationError } from './errors';

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

export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  statusCode: number = 400
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
    },
    { status: statusCode }
  );
}

export function handleValidationError(
  error: ZodError | ZodValidationError,
  context?: string
): NextResponse<ErrorResponse> {
  let errors: ValidationErrorDetail[];
  let message: string;

  if (error instanceof ZodValidationError) {
    errors = error.details?.errors || [];
    message = error.message;
  } else {
    errors = error.issues.map((issue) => ({
      field: issue.path.join('.') || 'root',
      message: issue.message,
    }));
    message =
      errors.length === 1
        ? `Validation error: ${errors[0].message}`
        : `Validation failed with ${errors.length} errors`;
  }

  const contextMessage = context ? ` in ${context}` : '';
  logger.warn(`Validation error${contextMessage}`, { errors, context });

  return createErrorResponse('VALIDATION_ERROR', message, { errors });
}

export function handleAppError(error: AppError): NextResponse<ErrorResponse> {
  logger.error(`Application error: ${error.message}`, {
    code: error.code,
    statusCode: error.statusCode,
    details: error.details,
  });

  return createErrorResponse(error.code, error.message, error.details, error.statusCode);
}

export function handleUnknownError(error: unknown): NextResponse<ErrorResponse> {
  logger.error(
    'Unexpected error occurred',
    error instanceof Error ? error : new Error(String(error))
  );

  return createErrorResponse(
    'INTERNAL_ERROR',
    'An unexpected error occurred. Please try again later.',
    undefined,
    500
  );
}

export function handleError(error: unknown, context?: string): NextResponse<ErrorResponse> {
  if (error instanceof ZodValidationError) {
    return handleValidationError(error, context);
  }

  if (isAppError(error)) {
    return handleAppError(error);
  }

  return handleUnknownError(error);
}

export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch((error) => handleError(error, context));
}

export function createValidationErrorResponse(
  field: string,
  message: string,
  value?: unknown
): NextResponse<ErrorResponse> {
  return createErrorResponse('VALIDATION_ERROR', message, {
    errors: [{ field, message }],
    value,
  });
}

export function createNotFoundErrorResponse(
  resource: string,
  id?: string
): NextResponse<ErrorResponse> {
  const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;
  return createErrorResponse('NOT_FOUND', message, { resource, id }, 404);
}

export function createUnauthorizedErrorResponse(
  message: string = 'Unauthorized'
): NextResponse<ErrorResponse> {
  return createErrorResponse('UNAUTHORIZED', message, undefined, 401);
}

export function createForbiddenErrorResponse(
  message: string = 'Forbidden'
): NextResponse<ErrorResponse> {
  return createErrorResponse('FORBIDDEN', message, undefined, 403);
}

export function createRateLimitErrorResponse(retryAfter?: number): NextResponse<ErrorResponse> {
  const details = retryAfter ? { retryAfter } : undefined;
  return createErrorResponse(
    'RATE_LIMIT_EXCEEDED',
    'Too many requests. Please try again later.',
    details,
    429
  );
}
