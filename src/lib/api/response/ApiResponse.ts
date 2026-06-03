import { NextResponse } from 'next/server';

interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  documentationUrl?: string;
  requestId?: string;
  timestamp?: number;
  stackTrace?: string;
  suggestedAction?: string;
}

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: number;
    requestId?: string;
    [key: string]: unknown;
  };
}

interface ApiErrorResponse {
  success: false;
  error: ApiError;
  meta?: {
    timestamp: number;
    requestId?: string;
    path?: string;
    method?: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiResponseBuilder {
  static success<T>(
    data: T,
    meta?: { requestId?: string; [key: string]: unknown }
  ): ApiSuccessResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: Date.now(),
        ...meta,
      },
    };
  }

  static error(
    code: string,
    message: string,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      requestId?: string;
    }
  ): ApiErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
        retryable: options?.retryable ?? false,
        details: options?.details,
      },
      meta: {
        timestamp: Date.now(),
        requestId: options?.requestId,
      },
    };
  }

  static unauthorized(message = 'Unauthorized'): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', message), {
      status: 401,
    });
  }

  static notFound(message = 'Not found'): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('NOT_FOUND', message), {
      status: 404,
    });
  }

  static badRequest(
    message: string,
    options?: { details?: Record<string, unknown> }
  ): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('BAD_REQUEST', message, options), {
      status: 400,
    });
  }

  static serverError(message = 'Internal server error'): NextResponse {
    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', message, { retryable: true }),
      { status: 500 }
    );
  }
}
