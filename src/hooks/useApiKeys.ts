'use client';

import { useState, useCallback, useEffect } from 'react';

import { apiClient } from '@/lib/api';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useApiKeys');

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  plan: 'free' | 'pro' | 'enterprise';
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  usage?: {
    last24h: number;
    last7d: number;
  };
}

interface V1ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

interface CreateApiKeyData {
  id: string;
  name: string;
  key_prefix: string;
  plan: string;
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  expires_at: string | null;
  key: string;
}

function unwrapV1Response<T>(raw: unknown): T {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as V1ApiResponse<T>).data;
  }
  return raw as T;
}

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<V1ApiResponse<ApiKeyItem[]>>('/api/v1/api-keys');
      const list = unwrapV1Response<ApiKeyItem[]>(response.data);
      setKeys(Array.isArray(list) ? list : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load API keys';
      logger.error('Failed to fetch API keys', err instanceof Error ? err : new Error(String(err)));
      setError(message);
      setKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const createKey = useCallback(
    async (name: string, plan: 'free' | 'pro' | 'enterprise' = 'free') => {
      setError(null);
      try {
        const response = await apiClient.post<V1ApiResponse<CreateApiKeyData>>('/api/v1/api-keys', {
          name,
          plan,
        });
        const result = unwrapV1Response<CreateApiKeyData>(response.data);
        await fetchKeys();
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create API key';
        setError(message);
        return null;
      }
    },
    [fetchKeys]
  );

  const deleteKey = useCallback(
    async (keyId: string) => {
      setError(null);
      try {
        await apiClient.delete(`/api/v1/api-keys/${keyId}`);
        await fetchKeys();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete API key';
        setError(message);
        return false;
      }
    },
    [fetchKeys]
  );

  const updateKey = useCallback(
    async (keyId: string, updates: { name?: string; plan?: 'free' | 'pro' | 'enterprise' }) => {
      setError(null);
      try {
        await apiClient.patch(`/api/v1/api-keys/${keyId}`, updates);
        await fetchKeys();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update API key';
        setError(message);
        return false;
      }
    },
    [fetchKeys]
  );

  return { keys, isLoading, error, createKey, deleteKey, updateKey, refresh: fetchKeys };
}
