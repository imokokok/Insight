import { type ZodSchema } from 'zod';

export interface ApiClientResponse<T> {
  data: T;
  meta?: {
    timestamp: number;
    source: string;
    duration?: number;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorBody {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  cache?: RequestCache;
  responseSchema?: ZodSchema;
}
