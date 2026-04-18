import { NextResponse } from 'next/server';

import { type ZodError } from 'zod';

import { type AppError, isAppError, errorToResponse as baseErrorToResponse } from '@/lib/errors';
import { createLogger } from '@/lib/utils/logger';
import { createErrorResponse as createStandardErrorResponse, ErrorCode } from '@/types/api/error';

import { ZodValidationError, isZodValidationError } from './errors';

const logger = createLogger('error-handler');

interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: number;
}

interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Create error response
 * Reuse the standard error response creation function from errorTypes.ts
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: unknown,
  statusCode: number = 400
): NextResponse {
  // Convert string code to ErrorCode enum (if matching)
  const errorCode = Object.values(ErrorCode).includes(code as ErrorCode)
    ? (code as ErrorCode)
    : ErrorCode.BAD_REQUEST;

  const standardResponse = createStandardErrorResponse(errorCode, message, {
    details: details as Record<string, unknown>,
  });

  return NextResponse.json(standardResponse, { status: statusCode });
}

/**
 * Handle Zod validation error
 * Unified use of ZodValidationError.fromZodError to convert error
 */
export function handleValidationError(
  error: ZodError | ZodValidationError,
  context?: string
): NextResponse {
  // Unified conversion to ZodValidationError
  const zodValidationError =
    error instanceof ZodValidationError ? error : ZodValidationError.fromZodError(error);

  const errors = zodValidationError.details?.errors || [];

  const contextMessage = context ? ` in ${context}` : '';
  logger.warn(`Validation error${contextMessage}`, { errors, context });

  // Use ZodValidationError's toResponse method
  const response = zodValidationError.toResponse();
  return NextResponse.json(response, { status: 400 });
}

/**
 * Handle AppError
 * Reuse base error handling function
 */
function handleAppError(error: AppError): NextResponse {
  // Use errorToResponse directly
  return baseErrorToResponse(error);
}

/**
 * Handle unknown error
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
 * unifiederrorhandle
 */
export function handleError(error: unknown, context?: string): NextResponse {
  // prioritizehandle ZodValidationError
  if (isZodValidationError(error)) {
    return handleValidationError(error, context);
  }

  // handle ZodError
  if (error && typeof error === 'object' && 'issues' in error) {
    return handleValidationError(error as ZodError, context);
  }

  // Handle AppError
  if (isAppError(error)) {
    return handleAppError(error);
  }

  // handleOthererror
  return handleUnknownError(error);
}

/**
 * packagehandle，handleerror
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse> {
  return handler().catch((error) => handleError(error, context));
}

/**
 * createvalidateerrorresponse
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
 * createtoerrorresponse
 */
export function createNotFoundErrorResponse(resource: string, id?: string): NextResponse {
  const message = id ? `${resource} with id "${id}" not found` : `${resource} not found`;

  const standardResponse = createStandardErrorResponse(ErrorCode.NOT_FOUND, message, {
    details: { resource, id },
  });

  return NextResponse.json(standardResponse, { status: 404 });
}

/**
 * createauthorizationerrorresponse
 */
export function createUnauthorizedErrorResponse(message: string = 'Unauthorized'): NextResponse {
  const standardResponse = createStandardErrorResponse(ErrorCode.UNAUTHORIZED, message);

  return NextResponse.json(standardResponse, { status: 401 });
}

/**
 * createerrorresponse
 */
export function createForbiddenErrorResponse(message: string = 'Forbidden'): NextResponse {
  const standardResponse = createStandardErrorResponse(ErrorCode.FORBIDDEN, message);

  return NextResponse.json(standardResponse, { status: 403 });
}

/**
 * createerrorresponse
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
