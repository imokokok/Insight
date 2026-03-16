export interface ApiResponse<T> {
  data: T;
  meta?: {
    timestamp: number;
    source: string;
  };
}

export interface PaginatedResponse<T> {
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

export type RequestConfig = {
  headers?: Record<string, string>;
  timeout?: number;
  signal?: AbortSignal;
  cache?: RequestCache;
};
