import { type NextRequest, NextResponse } from 'next/server';

import {
  ApiResponseBuilder,
  createCachedJsonResponse as newCreateCachedJsonResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from './response';

export const ErrorCodes = {
  MISSING_PARAMS: 'MISSING_PARAMS',
  INVALID_PROVIDER: 'INVALID_PROVIDER',
  INVALID_PARAMS: 'INVALID_PARAMS',
  CLIENT_NOT_FOUND: 'CLIENT_NOT_FOUND',
  ORACLE_FETCH_FAILED: 'ORACLE_FETCH_FAILED',
  BATCH_REQUEST_FAILED: 'BATCH_REQUEST_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
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
): NextResponse<T> {
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', cacheConfig.header);
  return response;
}

export async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  const { createServerClient } = await import('@/lib/supabase/server');
  const client = createServerClient();

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) {
    return null;
  }

  return user.id;
}

export { ApiResponseBuilder, newCreateCachedJsonResponse as createCachedJsonResponseNew };

export type { ApiSuccessResponse, ApiErrorResponse };
