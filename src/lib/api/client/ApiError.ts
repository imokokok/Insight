import { AppError, type ErrorCategory, type ErrorSeverity } from '@/lib/errors/AppError';

import { type ApiErrorBody } from './types';

export class ApiError extends AppError {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    { code, message, statusCode, details }: ApiErrorBody,
    cause?: Error,
    severity?: ErrorSeverity,
    category?: ErrorCategory
  ) {
    super({
      message,
      code,
      statusCode,
      isOperational: true,
      details,
      cause,
      severity: severity ?? (statusCode >= 500 ? 'high' : statusCode >= 400 ? 'medium' : 'low'),
      category:
        category ??
        (statusCode >= 500
          ? 'external_service'
          : statusCode === 401 || statusCode === 403
            ? 'authentication'
            : statusCode === 429
              ? 'rate_limit'
              : 'unknown'),
      retryable: statusCode >= 500 || statusCode === 429 || statusCode === 408,
    });
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }
    if (error instanceof Error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 500;
      return new ApiError(
        {
          code: 'UNKNOWN_ERROR',
          message: error.message,
          statusCode,
        },
        error instanceof Error ? error : undefined
      );
    }
    return new ApiError({
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      statusCode: 500,
    });
  }
}
