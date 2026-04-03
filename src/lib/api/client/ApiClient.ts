import { ApiError } from './ApiError';
import { type ApiClientResponse, type RequestConfig } from './types';

type RequestInterceptor = (config: RequestInit) => RequestInit;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

class ApiClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
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
    let init: RequestInit = {
      method,
      headers: { ...this.defaultHeaders, ...config?.headers },
    };

    for (const interceptor of this.requestInterceptors) {
      init = interceptor(init);
    }

    if (data) {
      init.body = JSON.stringify(data);
    }

    const fullUrl = this.baseURL + url;
    let response = await fetch(fullUrl, init);

    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw new ApiError({
        code: error.code || 'API_ERROR',
        message: error.message || 'Request failed',
        statusCode: response.status,
        details: error.details,
      });
    }

    const result = await response.json();
    return {
      data: result,
      meta: {
        timestamp: Date.now(),
        source: 'api',
      },
    };
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

export const apiClient = new ApiClient();
export { ApiClient };
