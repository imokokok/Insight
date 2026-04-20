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

export function createErrorResponse(
  code: ErrorCode,
  message: string,
  options?: {
    details?: Record<string, unknown>;
    requestId?: string;
    includeStackTrace?: boolean;
    stackTrace?: string;
  }
) {
  const timestamp = Date.now();

  return {
    success: false as const,
    error: {
      code,
      message,
      details: options?.details,
      retryable: false,
      requestId: options?.requestId,
      timestamp,
      stackTrace: options?.includeStackTrace ? options?.stackTrace : undefined,
    },
    meta: {
      requestId: options?.requestId,
      timestamp,
    },
  };
}
