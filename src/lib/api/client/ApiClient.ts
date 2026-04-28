import { createLogger } from '@/lib/utils/logger';

import { ApiError } from './ApiError';
import { type ApiClientResponse, type RequestConfig } from './types';

const logger = createLogger('ApiClient');

const DEFAULT_TIMEOUT = 30000;

interface ApiClientOptions {
  baseURL?: string;
  defaultTimeout?: number;
  defaultHeaders?: HeadersInit;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private defaultTimeout: number;

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultTimeout = options.defaultTimeout || DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders,
    };
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      const { supabase } = await import('@/lib/supabase/client');
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  }

  private async request<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiClientResponse<T>> {
    const controller = new AbortController();
    const timeout = config?.timeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => {
      controller.abort();
      logger.warn(`Request timeout after ${timeout}ms`, { method, url });
    }, timeout);

    const combinedSignal =
      config?.signal && controller.signal
        ? AbortSignal.any([config.signal, controller.signal])
        : (config?.signal ?? controller.signal);

    const headers: Record<string, string> = {
      ...(this.defaultHeaders as Record<string, string>),
      ...(config?.headers as Record<string, string>),
    };

    const token = await this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method,
      headers,
      signal: combinedSignal,
      cache: config?.cache,
    };

    if (data !== undefined) {
      try {
        init.body = JSON.stringify(data);
      } catch (err) {
        throw new ApiError(
          {
            code: 'SERIALIZATION_ERROR',
            message: 'Failed to serialize request data',
            statusCode: 400,
          },
          err instanceof Error ? err : undefined
        );
      }
    }

    const base = this.baseURL.replace(/\/+$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = base + path;
    const startTime = Date.now();

    try {
      const response = await fetch(fullUrl, init);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: 'Unknown error' };
        }
        throw new ApiError({
          code: errorData.code || 'API_ERROR',
          message: errorData.message || 'Request failed',
          statusCode: response.status,
          details: errorData.details,
        });
      }

      let result;
      try {
        result = await response.json();
      } catch {
        throw new ApiError({
          code: 'INVALID_RESPONSE',
          message: 'Failed to parse response body as JSON',
          statusCode: response.status,
        });
      }

      if (config?.responseSchema) {
        const parsed = config.responseSchema.safeParse(result);
        if (!parsed.success) {
          throw new ApiError({
            code: 'VALIDATION_ERROR',
            message: 'Response validation failed',
            statusCode: response.status,
            details: { errors: parsed.error.issues },
          });
        }
        result = parsed.data;
      }

      const duration = Date.now() - startTime;
      logger.debug(`Request completed in ${duration}ms`, { method, url, status: response.status });

      return {
        data: result,
        meta: {
          timestamp: Date.now(),
          source: 'api',
          duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiError({
          code: 'TIMEOUT_ERROR',
          message: `Request timeout after ${timeout}ms`,
          statusCode: 408,
          details: { method, url, timeout, duration },
        });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiClientResponse<T>> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>(url: string, data: unknown, config?: RequestConfig): Promise<ApiClientResponse<T>> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiClientResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<ApiClientResponse<T>> {
    return this.request<T>('PATCH', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiClientResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

export const apiClient = new ApiClient({ defaultTimeout: DEFAULT_TIMEOUT });
export { ApiClient, ApiError, DEFAULT_TIMEOUT };
