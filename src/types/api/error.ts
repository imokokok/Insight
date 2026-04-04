export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable: boolean;
    i18nKey?: string;
    documentationUrl?: string;
    requestId?: string;
    timestamp: number;
    stackTrace?: string;
    suggestedAction?: string;
  };
  meta: {
    requestId?: string;
    timestamp: number;
    path?: string;
    method?: string;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: number;
    requestId?: string;
    [key: string]: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedApiResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: PaginationMeta;
}

export type ErrorCategory = 'client' | 'server' | 'network' | 'auth' | 'validation' | 'unknown';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
}

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  GONE = 410,
  PAYLOAD_TOO_LARGE = 413,
  UNSUPPORTED_MEDIA_TYPE = 415,
  UNPROCESSABLE_ENTITY = 422,
  RATE_LIMIT_EXCEEDED = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  CONFLICT = 'CONFLICT',
  GONE = 'GONE',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  ORACLE_CLIENT_ERROR = 'ORACLE_CLIENT_ERROR',
  PRICE_FETCH_ERROR = 'PRICE_FETCH_ERROR',
  UNSUPPORTED_CHAIN = 'UNSUPPORTED_CHAIN',
  UNSUPPORTED_SYMBOL = 'UNSUPPORTED_SYMBOL',
  REDSTONE_API_ERROR = 'REDSTONE_API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INVALID_JSON = 'INVALID_JSON',
}

export const ERROR_CODE_TO_HTTP_STATUS: Record<ErrorCode, HttpStatusCode> = {
  [ErrorCode.BAD_REQUEST]: HttpStatusCode.BAD_REQUEST,
  [ErrorCode.UNAUTHORIZED]: HttpStatusCode.UNAUTHORIZED,
  [ErrorCode.FORBIDDEN]: HttpStatusCode.FORBIDDEN,
  [ErrorCode.NOT_FOUND]: HttpStatusCode.NOT_FOUND,
  [ErrorCode.METHOD_NOT_ALLOWED]: HttpStatusCode.METHOD_NOT_ALLOWED,
  [ErrorCode.REQUEST_TIMEOUT]: HttpStatusCode.REQUEST_TIMEOUT,
  [ErrorCode.CONFLICT]: HttpStatusCode.CONFLICT,
  [ErrorCode.GONE]: HttpStatusCode.GONE,
  [ErrorCode.PAYLOAD_TOO_LARGE]: HttpStatusCode.PAYLOAD_TOO_LARGE,
  [ErrorCode.UNSUPPORTED_MEDIA_TYPE]: HttpStatusCode.UNSUPPORTED_MEDIA_TYPE,
  [ErrorCode.UNPROCESSABLE_ENTITY]: HttpStatusCode.UNPROCESSABLE_ENTITY,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: HttpStatusCode.RATE_LIMIT_EXCEEDED,
  [ErrorCode.INTERNAL_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  [ErrorCode.BAD_GATEWAY]: HttpStatusCode.BAD_GATEWAY,
  [ErrorCode.SERVICE_UNAVAILABLE]: HttpStatusCode.SERVICE_UNAVAILABLE,
  [ErrorCode.GATEWAY_TIMEOUT]: HttpStatusCode.GATEWAY_TIMEOUT,
  [ErrorCode.VALIDATION_ERROR]: HttpStatusCode.BAD_REQUEST,
  [ErrorCode.AUTHENTICATION_ERROR]: HttpStatusCode.UNAUTHORIZED,
  [ErrorCode.AUTHORIZATION_ERROR]: HttpStatusCode.FORBIDDEN,
  [ErrorCode.ORACLE_CLIENT_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  [ErrorCode.PRICE_FETCH_ERROR]: HttpStatusCode.BAD_GATEWAY,
  [ErrorCode.UNSUPPORTED_CHAIN]: HttpStatusCode.BAD_REQUEST,
  [ErrorCode.UNSUPPORTED_SYMBOL]: HttpStatusCode.BAD_REQUEST,
  [ErrorCode.REDSTONE_API_ERROR]: HttpStatusCode.BAD_GATEWAY,
  [ErrorCode.NETWORK_ERROR]: HttpStatusCode.SERVICE_UNAVAILABLE,
  [ErrorCode.TIMEOUT_ERROR]: HttpStatusCode.GATEWAY_TIMEOUT,
  [ErrorCode.CONNECTION_ERROR]: HttpStatusCode.SERVICE_UNAVAILABLE,
  [ErrorCode.UNKNOWN_ERROR]: HttpStatusCode.INTERNAL_SERVER_ERROR,
  [ErrorCode.INVALID_JSON]: HttpStatusCode.BAD_REQUEST,
};

export const HTTP_STATUS_TO_CATEGORY: Record<number, ErrorCategory> = {
  400: 'client',
  401: 'auth',
  403: 'auth',
  404: 'client',
  405: 'client',
  408: 'network',
  409: 'client',
  410: 'client',
  413: 'client',
  415: 'client',
  422: 'validation',
  429: 'client',
  500: 'server',
  502: 'server',
  503: 'server',
  504: 'network',
};

export const RETRYABLE_ERROR_CODES: ErrorCode[] = [
  ErrorCode.RATE_LIMIT_EXCEEDED,
  ErrorCode.INTERNAL_ERROR,
  ErrorCode.BAD_GATEWAY,
  ErrorCode.SERVICE_UNAVAILABLE,
  ErrorCode.GATEWAY_TIMEOUT,
  ErrorCode.REQUEST_TIMEOUT,
  ErrorCode.NETWORK_ERROR,
  ErrorCode.TIMEOUT_ERROR,
  ErrorCode.CONNECTION_ERROR,
  ErrorCode.PRICE_FETCH_ERROR,
  ErrorCode.REDSTONE_API_ERROR,
];

export const RETRYABLE_HTTP_STATUSES: number[] = [
  HttpStatusCode.REQUEST_TIMEOUT,
  HttpStatusCode.RATE_LIMIT_EXCEEDED,
  HttpStatusCode.INTERNAL_SERVER_ERROR,
  HttpStatusCode.BAD_GATEWAY,
  HttpStatusCode.SERVICE_UNAVAILABLE,
  HttpStatusCode.GATEWAY_TIMEOUT,
];

export const ERROR_CODE_SUGGESTIONS: Record<string, string> = {
  [ErrorCode.VALIDATION_ERROR]: '请检查输入数据是否符合要求',
  [ErrorCode.AUTHENTICATION_ERROR]: '请重新登录或检查您的认证信息',
  [ErrorCode.AUTHORIZATION_ERROR]: '请确认您有权限执行此操作',
  [ErrorCode.NOT_FOUND]: '请确认请求的资源存在',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '请稍后再试，或降低请求频率',
  [ErrorCode.INTERNAL_ERROR]: '请稍后重试，如果问题持续存在请联系支持团队',
  [ErrorCode.PRICE_FETCH_ERROR]: '请检查网络连接或稍后重试',
  [ErrorCode.ORACLE_CLIENT_ERROR]: '预言机服务暂时不可用，请稍后重试',
  [ErrorCode.BAD_REQUEST]: '请检查请求参数是否正确',
  [ErrorCode.UNAUTHORIZED]: '请先登录后再执行此操作',
  [ErrorCode.FORBIDDEN]: '您没有权限访问此资源',
  [ErrorCode.CONFLICT]: '请求与当前资源状态冲突，请刷新后重试',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
  [ErrorCode.NETWORK_ERROR]: '网络连接异常，请检查网络设置',
  [ErrorCode.TIMEOUT_ERROR]: '请求超时，请稍后重试',
  [ErrorCode.UNKNOWN_ERROR]: '发生未知错误，请稍后重试或联系支持',
};

export const ERROR_CODE_DOCUMENTATION: Record<string, string> = {
  [ErrorCode.VALIDATION_ERROR]: '/docs/errors/validation',
  [ErrorCode.AUTHENTICATION_ERROR]: '/docs/errors/authentication',
  [ErrorCode.AUTHORIZATION_ERROR]: '/docs/errors/authorization',
  [ErrorCode.NOT_FOUND]: '/docs/errors/not-found',
  [ErrorCode.RATE_LIMIT_EXCEEDED]: '/docs/errors/rate-limit',
  [ErrorCode.INTERNAL_ERROR]: '/docs/errors/internal',
  [ErrorCode.PRICE_FETCH_ERROR]: '/docs/errors/price-fetch',
  [ErrorCode.ORACLE_CLIENT_ERROR]: '/docs/errors/oracle-client',
  [ErrorCode.BAD_REQUEST]: '/docs/errors/bad-request',
  [ErrorCode.UNAUTHORIZED]: '/docs/errors/unauthorized',
  [ErrorCode.FORBIDDEN]: '/docs/errors/forbidden',
  [ErrorCode.CONFLICT]: '/docs/errors/conflict',
  [ErrorCode.SERVICE_UNAVAILABLE]: '/docs/errors/service-unavailable',
  [ErrorCode.NETWORK_ERROR]: '/docs/errors/network',
  [ErrorCode.TIMEOUT_ERROR]: '/docs/errors/timeout',
};

export function isRetryableError(error: { code?: string; statusCode?: number }): boolean {
  if (error.code && RETRYABLE_ERROR_CODES.includes(error.code as ErrorCode)) {
    return true;
  }

  if (error.statusCode && RETRYABLE_HTTP_STATUSES.includes(error.statusCode)) {
    return true;
  }

  return false;
}

export function classifyError(error: { code?: string; statusCode?: number }): ErrorClassification {
  const category: ErrorCategory = HTTP_STATUS_TO_CATEGORY[error.statusCode || 500] || 'unknown';

  let severity: ErrorSeverity = 'medium';
  if (error.statusCode) {
    if (error.statusCode >= 500) {
      severity = 'high';
    } else if (error.statusCode >= 400) {
      severity = 'medium';
    }
  }

  if (category === 'network') {
    severity = 'high';
  }

  return {
    category,
    severity,
    retryable: isRetryableError(error),
  };
}

export function getSuggestedAction(errorCode: string): string {
  return ERROR_CODE_SUGGESTIONS[errorCode] || '请稍后重试或联系支持团队';
}

export function getErrorDocumentationUrl(errorCode: string, baseUrl?: string): string | undefined {
  const docPath = ERROR_CODE_DOCUMENTATION[errorCode];
  if (!docPath) return undefined;
  return baseUrl ? `${baseUrl}${docPath}` : docPath;
}

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    requestId?: string;
    includeStackTrace?: boolean;
    stackTrace?: string;
  }
): ApiErrorResponse {
  const timestamp = Date.now();

  return {
    success: false,
    error: {
      code,
      message,
      details: options?.details,
      retryable: RETRYABLE_ERROR_CODES.includes(code),
      i18nKey: `errors.${code.toLowerCase()}`,
      documentationUrl: getErrorDocumentationUrl(code),
      requestId: options?.requestId,
      timestamp,
      stackTrace: options?.includeStackTrace ? options?.stackTrace : undefined,
      suggestedAction: getSuggestedAction(code),
    },
    meta: {
      requestId: options?.requestId,
      timestamp,
    },
  };
}

export function createSuccessResponse<T>(
  data: T,
  options?: {
    requestId?: string;
    meta?: Record<string, unknown>;
  }
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: Date.now(),
      requestId: options?.requestId,
      ...options?.meta,
    },
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  options?: {
    requestId?: string;
  }
): PaginatedApiResponse<T> {
  const validLimit = Math.max(1, limit);

  return {
    success: true,
    data,
    pagination: {
      page: Math.max(1, page),
      limit: validLimit,
      total,
      totalPages: Math.ceil(total / validLimit),
    },
    meta: {
      timestamp: Date.now(),
      requestId: options?.requestId,
    },
  };
}
