import { NextResponse } from 'next/server';

export function createCachedJsonResponse<T>(
  data: T,
  cacheConfig: { header: string }
): NextResponse<T> {
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', cacheConfig.header);
  return response;
}
