import { NextResponse } from 'next/server';

import { type ErrorCode } from '@/types/api/error';

interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  stackTrace?: string;
}
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: number;
    requestId?: string;
    /**
     * Always true on every Insight response. Read-only advisory boundary:
     * Insight never signs or broadcasts transactions, never gates or blocks
     * execution, never proves a price is correct. Applications and agents
     * own the decision to act on any verdict. The boundary is published
     * here as well as in GET /.well-known/oracle-keys.json advisory_boundary
     * so verifiers and SDK consumers see it at every entry point.
     */
    insightDoesNotEnforce?: true;
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
    /** Same advisory boundary as success responses — always true. */
    insightDoesNotEnforce?: true;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiResponseBuilder {
  static success<T>(
    data: T,
    options?: { requestId?: string; meta?: Record<string, unknown> }
  ): ApiSuccessResponse<T> {
    const meta: ApiSuccessResponse<T>['meta'] = {
      timestamp: Date.now(),
      ...options?.meta,
      // Force advisory boundary — callers cannot override this
      insightDoesNotEnforce: true,
    };
    if (options?.requestId) {
      meta.requestId = options.requestId;
    }
    return {
      success: true,
      data,
      meta,
    };
  }

  static error(
    code: ErrorCode | (string & {}),
    message: string,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      requestId?: string;
    }
  ): ApiErrorResponse {
    const meta: ApiErrorResponse['meta'] = {
      timestamp: Date.now(),
      // Force advisory boundary — callers cannot override this
      insightDoesNotEnforce: true,
    };
    if (options?.requestId) {
      meta.requestId = options.requestId;
    }
    return {
      success: false,
      error: {
        code,
        message,
        retryable: options?.retryable ?? false,
        details: options?.details,
      },
      meta,
    };
  }

  static unauthorized(message = 'Unauthorized'): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', message), {
      status: 401,
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

  static serverError(message = 'Internal server error', requestId?: string): NextResponse {
    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', message, { retryable: true, requestId }),
      { status: 500 }
    );
  }
}
