import { AppError, AppErrorDetails } from './AppError';

export interface OracleErrorDetails extends AppErrorDetails {
  provider?: string;
  symbol?: string;
  chain?: string;
}

export class OracleClientError extends AppError {
  constructor(
    message: string,
    details?: OracleErrorDetails,
    i18nKey?: string
  ) {
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

  constructor(
    message: string,
    details?: PriceFetchErrorDetails,
    i18nKey?: string,
    cause?: Error
  ) {
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

  toApiResponse(): { error: { code: string; message: string; retryable: boolean; details?: AppErrorDetails } } {
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
  constructor(
    message: string,
    details?: UnsupportedChainErrorDetails,
    i18nKey?: string
  ) {
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
  constructor(
    message: string,
    details?: UnsupportedSymbolErrorDetails,
    i18nKey?: string
  ) {
    super({
      message,
      code: 'UNSUPPORTED_SYMBOL',
      statusCode: 400,
      details,
      i18nKey: i18nKey ?? 'errors.oracle.unsupportedSymbol',
    });
  }
}
