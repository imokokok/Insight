export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    timestamp: number;
    requestId?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiResponseBuilder {
  static success<T>(data: T, meta?: { requestId?: string }): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: Date.now(),
        ...meta,
      },
    };
  }

  static error(code: string, message: string, details?: Record<string, unknown>): ApiResponse {
    return {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: Date.now(),
      },
    };
  }

  static paginated<T>(data: T[], page: number, limit: number, total: number): PaginatedResponse<T> {
    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      meta: {
        timestamp: Date.now(),
      },
    };
  }
}

export const ApiErrors = {
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Unauthorized access' },
  FORBIDDEN: { code: 'FORBIDDEN', message: 'Forbidden' },
  BAD_REQUEST: { code: 'BAD_REQUEST', message: 'Bad request' },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Validation error' },
} as const;
