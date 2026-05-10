import { type SupabaseClient } from '@supabase/supabase-js';

import { createLogger } from '@/lib/utils/logger';

import { hashApiKey, PLAN_RATE_LIMITS, type ApiKeyPlan } from './middleware/apiKeyMiddleware';

const logger = createLogger('api-key-service');

export interface CreateApiKeyInput {
  name: string;
  plan?: ApiKeyPlan;
  expiresAt?: string;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  key_prefix: string;
  plan: ApiKeyPlan;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface ApiKeyWithSecret extends ApiKeyListItem {
  key: string;
}

function generateApiKey(): { key: string; prefix: string } {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const key = `ik_${hex}`;
  const prefix = key.substring(0, 11);
  return { key, prefix };
}

export class ApiKeyService {
  constructor(private client: SupabaseClient) {}

  async createApiKey(userId: string, input: CreateApiKeyInput): Promise<ApiKeyWithSecret | null> {
    const { key, prefix } = generateApiKey();
    const keyHash = await hashApiKey(key);
    const plan = input.plan || 'free';
    const rateLimit = PLAN_RATE_LIMITS[plan];

    const { data, error } = await this.client
      .from('api_keys')
      .insert({
        user_id: userId,
        name: input.name,
        key_hash: keyHash,
        key_prefix: prefix,
        plan,
        rate_limit: rateLimit,
        is_active: true,
        expires_at: input.expiresAt || null,
      })
      .select(
        'id, name, key_prefix, plan, rate_limit, is_active, last_used_at, created_at, expires_at'
      )
      .single();

    if (error) {
      logger.error(
        'Failed to create API key',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return {
      ...data,
      key,
    };
  }

  async listApiKeys(userId: string): Promise<ApiKeyListItem[]> {
    const { data, error } = await this.client
      .from('api_keys')
      .select(
        'id, name, key_prefix, plan, rate_limit, is_active, last_used_at, created_at, expires_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(
        'Failed to list API keys',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }

    return data || [];
  }

  async getApiKey(keyId: string, userId: string): Promise<ApiKeyListItem | null> {
    const { data, error } = await this.client
      .from('api_keys')
      .select(
        'id, name, key_prefix, plan, rate_limit, is_active, last_used_at, created_at, expires_at'
      )
      .eq('id', keyId)
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error(
        'Failed to get API key',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async revokeApiKey(keyId: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('api_keys')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      logger.error(
        'Failed to revoke API key',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async deleteApiKey(keyId: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', userId);

    if (error) {
      logger.error(
        'Failed to delete API key',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async updateApiKey(
    keyId: string,
    userId: string,
    updates: { name?: string; plan?: ApiKeyPlan }
  ): Promise<ApiKeyListItem | null> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.plan) {
      updateData.plan = updates.plan;
      updateData.rate_limit = PLAN_RATE_LIMITS[updates.plan];
    }

    const { data, error } = await this.client
      .from('api_keys')
      .update(updateData)
      .eq('id', keyId)
      .eq('user_id', userId)
      .select(
        'id, name, key_prefix, plan, rate_limit, is_active, last_used_at, created_at, expires_at'
      )
      .single();

    if (error) {
      logger.error(
        'Failed to update API key',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async getApiKeyUsage(keyId: string): Promise<{
    totalRequests: number;
    last24h: number;
    last7d: number;
  } | null> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const { count: count24h, error: error24h } = await this.client
        .from('api_key_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', keyId)
        .gte('created_at', last24h);

      const { count: count7d, error: error7d } = await this.client
        .from('api_key_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', keyId)
        .gte('created_at', last7d);

      if (error24h || error7d) {
        logger.warn('Failed to get API key usage stats');
        return null;
      }

      return {
        totalRequests: -1,
        last24h: count24h || 0,
        last7d: count7d || 0,
      };
    } catch (error) {
      logger.warn('API key usage table may not exist yet', { error });
      return null;
    }
  }
}

export function createApiKeyService(client: SupabaseClient): ApiKeyService {
  return new ApiKeyService(client);
}
