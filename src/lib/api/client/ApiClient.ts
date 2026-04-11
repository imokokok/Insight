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

type RequestInterceptor = (config: RequestInit) => RequestInit;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private defaultTimeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || '';
    this.defaultTimeout = options.defaultTimeout || DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders,
    };
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
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

    let init: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...config?.headers },
      signal: config?.signal ?? controller.signal,
      cache: config?.cache,
    };

    for (const interceptor of this.requestInterceptors) {
      init = interceptor(init);
    }

    if (data) {
      init.body = JSON.stringify(data);
    }

    const fullUrl = this.baseURL + url;
    const startTime = Date.now();

    try {
      let response = await fetch(fullUrl, init);

      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

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

      const result = await response.json();
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

  async put<T>(url: string, data: unknown, config?: RequestConfig): Promise<ApiClientResponse<T>> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiClientResponse<T>> {
    return this.request<T>('DELETE', url, undefined, config);
  }
}

export const apiClient = new ApiClient({ defaultTimeout: DEFAULT_TIMEOUT });
export { ApiClient, ApiError, DEFAULT_TIMEOUT };
export type { ApiClientOptions };
