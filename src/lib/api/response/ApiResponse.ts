import { NextResponse } from 'next/server';

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
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    i18nKey?: string;
  };
  meta?: {
    timestamp: number;
    requestId?: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export class ApiResponseHandler {
  static json<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
    // 添加状态码验证
    if (status < 100 || status >= 600) {
      throw new Error(`Invalid HTTP status code: ${status}`);
    }
    return NextResponse.json(ApiResponseBuilder.success(data), { status });
  }

  static error(
    code: string,
    message: string,
    statusCode: number,
    options?: {
      retryable?: boolean;
      details?: Record<string, unknown>;
      i18nKey?: string;
      requestId?: string;
    }
  ): NextResponse<ApiErrorResponse> {
    // 添加状态码验证
    if (statusCode < 100 || statusCode >= 600) {
      throw new Error(`Invalid HTTP status code: ${statusCode}`);
    }
    return NextResponse.json(ApiResponseBuilder.error(code, message, options), {
      status: statusCode,
    });
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
    meta?: { requestId?: string }
  ): NextResponse<ApiPaginatedResponse<T>> {
    return NextResponse.json(ApiResponseBuilder.paginated(data, page, limit, total, meta));
  }

  static created<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json(ApiResponseBuilder.success(data), { status: 201 });
  }

  static noContent(): NextResponse {
    return new NextResponse(null, { status: 204 });
  }

  static badRequest(
    message: string,
    details?: Record<string, unknown>
  ): NextResponse<ApiErrorResponse> {
    return this.error('BAD_REQUEST', message, 400, { details });
  }

  static unauthorized(
    message = 'Unauthorized access',
    details?: Record<string, unknown>
  ): NextResponse<ApiErrorResponse> {
    return this.error('UNAUTHORIZED', message, 401, { details });
  }

  static forbidden(
    message = 'Forbidden',
    details?: Record<string, unknown>
  ): NextResponse<ApiErrorResponse> {
    return this.error('FORBIDDEN', message, 403, { details });
  }

  static notFound(
    message = 'Resource not found',
    details?: Record<string, unknown>
  ): NextResponse<ApiErrorResponse> {
    return this.error('NOT_FOUND', message, 404, { details });
  }

  static conflict(
    message: string,
    details?: Record<string, unknown>
  ): NextResponse<ApiErrorResponse> {
    return this.error('CONFLICT', message, 409, { details });
  }

  static tooManyRequests(
    retryAfter: number,
    message = 'Too many requests'
  ): NextResponse<ApiErrorResponse> {
    const response = this.error('RATE_LIMIT_EXCEEDED', message, 429, {
      retryable: true,
      details: { retryAfter },
    });
    response.headers.set('Retry-After', String(retryAfter));
    return response;
  }

  static internalError(
    message = 'Internal server error',
    details?: Record<string, unknown>
  ): NextResponse<ApiErrorResponse> {
    return this.error('INTERNAL_ERROR', message, 500, {
      retryable: true,
      details,
    });
  }
}

// 辅助函数：验证缓存配置值
function validateCacheValue(value: number, name: string): number {
  if (value < 0) {
    throw new Error(`Cache ${name} cannot be negative: ${value}`);
  }
  return value;
}

export const CacheConfig = {
  PRICE: {
    maxAge: 30,
    staleWhileRevalidate: 60,
    get header() {
      const maxAge = validateCacheValue(this.maxAge, 'maxAge');
      const staleWhileRevalidate = validateCacheValue(this.staleWhileRevalidate, 'staleWhileRevalidate');
      return `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
    },
  },
  HISTORY: {
    maxAge: 300,
    staleWhileRevalidate: 600,
    get header() {
      const maxAge = validateCacheValue(this.maxAge, 'maxAge');
      const staleWhileRevalidate = validateCacheValue(this.staleWhileRevalidate, 'staleWhileRevalidate');
      return `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
    },
  },
  SHORT: {
    maxAge: 10,
    staleWhileRevalidate: 30,
    get header() {
      const maxAge = validateCacheValue(this.maxAge, 'maxAge');
      const staleWhileRevalidate = validateCacheValue(this.staleWhileRevalidate, 'staleWhileRevalidate');
      return `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
    },
  },
  NONE: {
    get header() {
      return 'no-store, no-cache, must-revalidate';
    },
  },
} as const;

export function withCacheHeaders<T>(
  response: NextResponse<T>,
  cacheConfig: { header: string }
): NextResponse<T> {
  response.headers.set('Cache-Control', cacheConfig.header);
  return response;
}

export function createCachedJsonResponse<T>(
  data: T,
  cacheConfig: { header: string }
): NextResponse<ApiSuccessResponse<T>> {
  const response = NextResponse.json(ApiResponseBuilder.success(data));
  response.headers.set('Cache-Control', cacheConfig.header);
  return response;
}
