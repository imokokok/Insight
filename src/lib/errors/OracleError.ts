import { AppError, type AppErrorDetails } from './AppError';

export interface OracleErrorDetails extends AppErrorDetails {
  provider?: string;
  symbol?: string;
  chain?: string;
}

export class OracleClientError extends AppError {
  constructor(message: string, details?: OracleErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'ORACLE_CLIENT_ERROR',
      statusCode: 500,
      isOperational: false,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.client',
    });
  }
}

export interface PriceFetchErrorDetails extends OracleErrorDetails {
  timestamp?: number;
  retryable?: boolean;
}

export class PriceFetchError extends AppError {
  public readonly retryable: boolean;

  constructor(message: string, details?: PriceFetchErrorDetails, i18nKey?: string, cause?: Error) {
    super({
      message,
      code: 'PRICE_FETCH_ERROR',
      statusCode: 502,
      isOperational: true,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.priceFetch',
      cause,
    });
    this.retryable = details?.retryable ?? false;
  }

  toApiResponse(): {
    error: { code: string; message: string; retryable: boolean; details?: AppErrorDetails };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        details: this.details,
      },
    };
  }
}

export interface UnsupportedChainErrorDetails extends OracleErrorDetails {
  supportedChains?: string[];
}

export class UnsupportedChainError extends AppError {
  constructor(message: string, details?: UnsupportedChainErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'UNSUPPORTED_CHAIN',
      statusCode: 400,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.unsupportedChain',
    });
  }
}

export interface UnsupportedSymbolErrorDetails extends OracleErrorDetails {
  supportedSymbols?: string[];
}

export class UnsupportedSymbolError extends AppError {
  constructor(message: string, details?: UnsupportedSymbolErrorDetails, i18nKey?: string) {
    super({
      message,
      code: 'UNSUPPORTED_SYMBOL',
      statusCode: 400,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.unsupportedSymbol',
    });
  }
}

export type RedStoneErrorCode =
  | 'FETCH_ERROR'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_RESPONSE';

export interface RedStoneApiErrorDetails extends OracleErrorDetails {
  errorCode: RedStoneErrorCode;
  retryable: boolean;
  attemptCount?: number;
}

export class RedStoneApiError extends AppError {
  public readonly errorCode: RedStoneErrorCode;
  public readonly retryable: boolean;
  public readonly attemptCount: number;

  constructor(
    message: string,
    errorCode: RedStoneErrorCode,
    details?: Partial<RedStoneApiErrorDetails>,
    cause?: Error
  ) {
    const isRetryable = RedStoneApiError.isRetryableError(errorCode);
    super({
      message,
      code: 'REDSTONE_API_ERROR',
      statusCode: RedStoneApiError.getStatusCode(errorCode),
      isOperational: true,
      details: {
        ...details,
        errorCode,
        retryable: isRetryable,
      },
      i18nKey: 'errors.oracle.redstoneApi',
      cause,
    });
    this.errorCode = errorCode;
    this.retryable = isRetryable;
    this.attemptCount = details?.attemptCount ?? 1;
  }

  private static isRetryableError(errorCode: RedStoneErrorCode): boolean {
    return ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'RATE_LIMIT_ERROR', 'FETCH_ERROR'].includes(
      errorCode
    );
  }

  private static getStatusCode(errorCode: RedStoneErrorCode): number {
    switch (errorCode) {
      case 'RATE_LIMIT_ERROR':
        return 429;
      case 'TIMEOUT_ERROR':
        return 504;
      case 'NETWORK_ERROR':
        return 503;
      default:
        return 502;
    }
  }

  toApiResponse(): {
    error: {
      code: string;
      message: string;
      retryable: boolean;
      errorCode: RedStoneErrorCode;
      details?: AppErrorDetails;
    };
  } {
    return {
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        errorCode: this.errorCode,
        details: this.details,
      },
    };
  }
}
