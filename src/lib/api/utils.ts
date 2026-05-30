import { NextResponse } from 'next/server';

import { ApiResponseBuilder } from './response';

export const AUTH_MODERATE_MIDDLEWARE = {
  middlewares: {
    logging: true,
    rateLimit: { preset: 'moderate' },
    auth: { required: true },
  },
} as const;

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

const API_KEY_SALT = process.env.API_KEY_HASH_SALT || 'insight-api-key-salt-2024';

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const saltedKey = API_KEY_SALT + key;
  const data = encoder.encode(saltedKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
