import { NextResponse } from 'next/server';

import { ApiResponseBuilder } from './response';

export function requireAuth(context: { auth?: { userId?: string | null } }): string | NextResponse {
  const userId = context.auth?.userId;
  if (!userId) {
    return ApiResponseBuilder.unauthorized();
  }
  return userId;
}

export function createCachedJsonResponse<T>(
  data: T,
  cacheConfig: { header: string }
): NextResponse<T> {
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', cacheConfig.header);
  return response;
}
