import { NextResponse } from 'next/server';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

export interface ApiErrorOptions {
  code: string;
  message: string;
  retryable: boolean;
  statusCode: number;
}

export const ErrorCodes = {
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  INVALID_PARAMS: 'INVALID_PARAMS',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  ORACLE_FETCH_FAILED: 'ORACLE_FETCH_FAILED',
  BATCH_REQUEST_FAILED: 'BATCH_REQUEST_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const CacheConfig = {
  PRICE: {
    maxAge: 30,
    staleWhileRevalidate: 60,
    get header() {
      return `public, s-maxage=${this.maxAge}, stale-while-revalidate=${this.staleWhileRevalidate}`;
    },
  },
  HISTORY: {
    maxAge: 300,
    staleWhileRevalidate: 600,
    get header() {
      return `public, s-maxage=${this.maxAge}, stale-while-revalidate=${this.staleWhileRevalidate}`;
    },
  },
} as const;

export function createErrorResponse(options: ApiErrorOptions): NextResponse<ApiErrorResponse> {
  const { code, message, retryable, statusCode } = options;

  console.error(`[API Error] Code: ${code}, Message: ${message}, Retryable: ${retryable}`);

  return NextResponse.json(
    {
      error: {
        code,
        message,
        retryable,
      },
    },
    { status: statusCode }
  );
}

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
): NextResponse<T> {
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', cacheConfig.header);
  return response;
}

export function handleApiError(
  error: unknown,
  context: {
    provider?: string;
    symbol?: string;
    operation: string;
  }
): NextResponse<ApiErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  const isNetworkError =
    error instanceof Error &&
    (error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED'));

  return createErrorResponse({
    code: ErrorCodes.ORACLE_FETCH_FAILED,
    message: `Failed to ${context.operation}: ${errorMessage}`,
    retryable: isNetworkError,
    statusCode: 500,
  });
}
