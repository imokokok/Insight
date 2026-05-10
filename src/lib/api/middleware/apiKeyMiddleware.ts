import { type NextRequest, NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { ApiResponseBuilder } from '../response';

const logger = createLogger('api-key-middleware');

export interface ApiKeyContext {
  keyId: string;
  userId: string;
  plan: ApiKeyPlan;
  rateLimit: number;
}

export type ApiKeyPlan = 'free' | 'pro' | 'enterprise';

export interface ApiKeyMiddlewareOptions {
  required?: boolean;
}

type ApiKeyMiddlewareResult =
  | { success: true; context: ApiKeyContext }
  | { success: false; response: NextResponse };

const PLAN_RATE_LIMITS: Record<ApiKeyPlan, number> = {
  free: 60,
  pro: 600,
  enterprise: 6000,
};

function extractApiKey(request: NextRequest): string | null {
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey.trim();

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.startsWith('ik_')) return token;
  }

  return null;
}

async function validateApiKey(key: string): Promise<ApiKeyContext | null> {
  if (!key.startsWith('ik_')) {
    logger.debug('API key has invalid prefix');
    return null;
  }

  try {
    const client = createServerClient();
    const keyHash = await hashApiKey(key);

    const { data, error } = await client
      .from('api_keys')
      .select('id, user_id, name, key_hash, key_prefix, plan, rate_limit, is_active, expires_at')
      .eq('key_hash', keyHash)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      logger.debug('API key not found or inactive', { keyPrefix: key.substring(0, 8) });
      return null;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      logger.debug('API key expired', { keyId: data.id });
      await client.from('api_keys').update({ is_active: false }).eq('id', data.id);
      return null;
    }

    await client
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    const plan = (data.plan as ApiKeyPlan) || 'free';
    return {
      keyId: data.id,
      userId: data.user_id,
      plan,
      rateLimit: data.rate_limit || PLAN_RATE_LIMITS[plan],
    };
  } catch (error) {
    logger.error(
      'API key validation failed',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function createApiKeyMiddleware(options: ApiKeyMiddlewareOptions = {}) {
  const { required = true } = options;

  return async (request: NextRequest): Promise<ApiKeyMiddlewareResult> => {
    const apiKey = extractApiKey(request);

    if (!apiKey) {
      if (!required) {
        return {
          success: true,
          context: { keyId: '', userId: '', plan: 'free', rateLimit: PLAN_RATE_LIMITS.free },
        };
      }
      logger.warn('API key required but not provided');
      return {
        success: false,
        response: NextResponse.json(
          ApiResponseBuilder.error(
            'API_KEY_REQUIRED',
            'API key is required. Pass it via x-api-key header or Bearer token.',
            {
              retryable: false,
              details: {
                header: 'x-api-key',
                format: 'ik_xxxxxxxxxxxxxxxx',
                documentation: '/api/v1/docs',
              },
            }
          ),
          { status: 401 }
        ),
      };
    }

    const keyContext = await validateApiKey(apiKey);

    if (!keyContext) {
      logger.warn('Invalid API key provided', { keyPrefix: apiKey.substring(0, 8) });
      return {
        success: false,
        response: NextResponse.json(
          ApiResponseBuilder.error(
            'INVALID_API_KEY',
            'The provided API key is invalid, inactive, or expired.',
            {
              retryable: false,
              details: { documentation: '/api/v1/docs' },
            }
          ),
          { status: 401 }
        ),
      };
    }

    logger.debug('API key validated', { keyId: keyContext.keyId, plan: keyContext.plan });
    return { success: true, context: keyContext };
  };
}

export { hashApiKey, PLAN_RATE_LIMITS };
