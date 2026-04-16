import { NextResponse } from 'next/server';

export interface ApiError {
  code: string;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
  i18nKey?: string;
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

export interface ApiErrorResponse {
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

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiPaginatedResponse<T = unknown> extends ApiSuccessResponse<T[]> {
  pagination: PaginationMeta;
}

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
      i18nKey?: string;
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
        i18nKey: options?.i18nKey,
      },
      meta: {
        timestamp: Date.now(),
        requestId: options?.requestId,
      },
    };
  }

  static unauthorized(message = 'Unauthorized', options?: { i18nKey?: string }): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('UNAUTHORIZED', message, options), {
      status: 401,
    });
  }

  static forbidden(message = 'Forbidden', options?: { i18nKey?: string }): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('FORBIDDEN', message, options), {
      status: 403,
    });
  }

  static notFound(message = 'Not found', options?: { i18nKey?: string }): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('NOT_FOUND', message, options), {
      status: 404,
    });
  }

  static badRequest(
    message: string,
    options?: { i18nKey?: string; details?: Record<string, unknown> }
  ): NextResponse {
    return NextResponse.json(ApiResponseBuilder.error('BAD_REQUEST', message, options), {
      status: 400,
    });
  }

  static serverError(
    message = 'Internal server error',
    options?: { i18nKey?: string }
  ): NextResponse {
    return NextResponse.json(
      ApiResponseBuilder.error('INTERNAL_ERROR', message, { ...options, retryable: true }),
      { status: 500 }
    );
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    meta?: { requestId?: string }
  ): ApiPaginatedResponse<T> {
    // 添加 limit > 0 验证
    const validLimit = limit > 0 ? limit : 10;

    return {
      success: true,
      data,
      pagination: {
        page,
        limit: validLimit,
        total,
        totalPages: Math.ceil(total / validLimit),
      },
      meta: {
        timestamp: Date.now(),
        ...meta,
      },
    };
  }
}

export function createCachedJsonResponse<T>(
  data: T,
  cacheConfig: { header: string }
): NextResponse<ApiSuccessResponse<T>> {
  const response = NextResponse.json(ApiResponseBuilder.success(data));
  response.headers.set('Cache-Control', cacheConfig.header);
  return response;
}
