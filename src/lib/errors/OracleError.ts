import { AppError, type AppErrorDetails, ErrorCodes, HttpStatusCodes } from './AppError';

interface OracleErrorDetails extends AppErrorDetails {
  provider?: string;
  symbol?: string;
  chain?: string;
  endpoint?: string;
}

export class OracleClientError extends AppError {
  constructor(message: string, details?: OracleErrorDetails, cause?: Error) {
    super({
      message,
      code: ErrorCodes.ORACLE_ERROR,
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: 'high',
      isOperational: false,
      details,
      cause,
    });
  }
}

interface PriceFetchErrorDetails extends OracleErrorDetails {
  timestamp?: number;
  retryable?: boolean;
  attemptCount?: number;
  lastSuccessfulPrice?: number;
  deviation?: number;
}

export class PriceFetchError extends AppError {
  public readonly retryable: boolean;
  public readonly attemptCount: number;

  constructor(message: string, details?: PriceFetchErrorDetails, cause?: Error) {
    const retryable = details?.retryable ?? true;
    super({
      message,
      code: ErrorCodes.ORACLE_ERROR,
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: 'high',
      isOperational: true,
      retryable,
      details,
      cause,
    });
    this.retryable = retryable;
    this.attemptCount = details?.attemptCount ?? 1;
  }

  static nonRetryable(
    message: string,
    details?: Omit<PriceFetchErrorDetails, 'retryable'>,
    cause?: Error
  ): PriceFetchError {
    return new PriceFetchError(message, { ...details, retryable: false }, cause);
  }

  static retryable(
    message: string,
    details?: Omit<PriceFetchErrorDetails, 'retryable'>,
    cause?: Error
  ): PriceFetchError {
    return new PriceFetchError(message, { ...details, retryable: true }, cause);
  }

  toApiResponse(): {
    success: false;
    error: {
      code: string;
      message: string;
      retryable: boolean;
      attemptCount: number;
      requestId: string | undefined;
      details?: AppErrorDetails;
    };
    timestamp: string;
  } {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        attemptCount: this.attemptCount,
        requestId: this.requestId,
        details: this.details,
      },
      timestamp: this.timestamp.toISOString(),
    };
  }
}

interface UnsupportedChainErrorDetails extends OracleErrorDetails {
  supportedChains?: string[];
  requestedChain?: string;
}

export class UnsupportedChainError extends AppError {
  constructor(message: string, details?: UnsupportedChainErrorDetails) {
    super({
      message,
      code: 'UNSUPPORTED_CHAIN',
      statusCode: HttpStatusCodes.BAD_REQUEST,
      category: 'validation',
      severity: 'low',
      details,
    });
  }

  static create(
    chain: string,
    supportedChains: string[],
    provider?: string
  ): UnsupportedChainError {
    return new UnsupportedChainError(
      `Chain '${chain}' is not supported${provider ? ` by ${provider}` : ''}`,
      { chain, supportedChains, requestedChain: chain, provider }
    );
  }
}

interface UnsupportedSymbolErrorDetails extends OracleErrorDetails {
  supportedSymbols?: string[];
  requestedSymbol?: string;
}

export class UnsupportedSymbolError extends AppError {
  constructor(message: string, details?: UnsupportedSymbolErrorDetails) {
    super({
      message,
      code: 'UNSUPPORTED_SYMBOL',
      statusCode: HttpStatusCodes.BAD_REQUEST,
      category: 'validation',
      severity: 'low',
      details,
    });
  }

  static create(
    symbol: string,
    supportedSymbols: string[],
    provider?: string
  ): UnsupportedSymbolError {
    return new UnsupportedSymbolError(
      `Symbol '${symbol}' is not supported${provider ? ` by ${provider}` : ''}`,
      { symbol, supportedSymbols, requestedSymbol: symbol, provider }
    );
  }
}

interface ErrorConfig {
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  statusCode: number;
}

const PROVIDER_ERROR_CONFIGS: Record<string, Record<string, ErrorConfig>> = {
  redstone: {
    FETCH_ERROR: { retryable: true, severity: 'high', statusCode: 502 },
    PARSE_ERROR: { retryable: false, severity: 'high', statusCode: 422 },
    NETWORK_ERROR: { retryable: true, severity: 'medium', statusCode: 503 },
    TIMEOUT_ERROR: { retryable: true, severity: 'medium', statusCode: 504 },
    RATE_LIMIT_ERROR: { retryable: true, severity: 'low', statusCode: 429 },
    INVALID_RESPONSE: { retryable: false, severity: 'high', statusCode: 422 },
    DATA_STALE: { retryable: true, severity: 'medium', statusCode: 502 },
    PRICE_DEVIATION: { retryable: false, severity: 'critical', statusCode: 502 },
  },
  chainlink: {
    AGGREGATOR_OFFLINE: { retryable: true, severity: 'high', statusCode: 502 },
    STALE_DATA: { retryable: true, severity: 'high', statusCode: 502 },
    PRICE_DEVIATION: { retryable: false, severity: 'critical', statusCode: 502 },
    ROUND_INCOMPLETE: { retryable: true, severity: 'medium', statusCode: 502 },
    INVALID_ANSWER: { retryable: false, severity: 'critical', statusCode: 502 },
    HEARTBEAT_VIOLATION: { retryable: true, severity: 'low', statusCode: 502 },
  },
  api3: {
    DAPI_NOT_FOUND: { retryable: false, severity: 'low', statusCode: 502 },
    AIRNODE_ERROR: { retryable: true, severity: 'medium', statusCode: 502 },
    SPONSOR_WALLET_ERROR: { retryable: false, severity: 'high', statusCode: 502 },
    TEMPLATE_NOT_FOUND: { retryable: false, severity: 'low', statusCode: 502 },
    BEACON_OFFLINE: { retryable: true, severity: 'high', statusCode: 502 },
  },
  supra: {
    DORA_CONNECTION_ERROR: { retryable: true, severity: 'medium', statusCode: 502 },
    STALE_PRICE: { retryable: true, severity: 'high', statusCode: 502 },
    INVALID_PRICE: { retryable: false, severity: 'critical', statusCode: 502 },
    PAIR_NOT_FOUND: { retryable: false, severity: 'low', statusCode: 502 },
    PRICE_DEVIATION: { retryable: false, severity: 'critical', statusCode: 502 },
  },
  flare: {
    FTSO_RPC_ERROR: { retryable: true, severity: 'medium', statusCode: 502 },
    FEED_NOT_FOUND: { retryable: false, severity: 'low', statusCode: 502 },
    STALE_PRICE: { retryable: true, severity: 'high', statusCode: 502 },
    INVALID_PRICE: { retryable: false, severity: 'critical', statusCode: 502 },
    INVALID_FEED_ID: { retryable: false, severity: 'low', statusCode: 502 },
    CONTRACT_CALL_FAILED: { retryable: true, severity: 'medium', statusCode: 502 },
  },
  dia: {
    FETCH_ERROR: { retryable: false, severity: 'critical', statusCode: 502 },
    PARSE_ERROR: { retryable: false, severity: 'high', statusCode: 422 },
    NETWORK_ERROR: { retryable: true, severity: 'medium', statusCode: 503 },
    TIMEOUT_ERROR: { retryable: true, severity: 'medium', statusCode: 504 },
    RATE_LIMIT_ERROR: { retryable: true, severity: 'low', statusCode: 429 },
    INVALID_RESPONSE: { retryable: false, severity: 'high', statusCode: 422 },
  },
  winklink: {
    CONTRACT_CALL_ERROR: { retryable: true, severity: 'medium', statusCode: 502 },
    STALE_DATA: { retryable: true, severity: 'high', statusCode: 502 },
    INVALID_PRICE: { retryable: false, severity: 'critical', statusCode: 502 },
    PAIR_NOT_FOUND: { retryable: false, severity: 'low', statusCode: 404 },
    TRON_RPC_ERROR: { retryable: true, severity: 'medium', statusCode: 503 },
    GAMING_DATA_ERROR: { retryable: false, severity: 'low', statusCode: 502 },
  },
};

interface OracleProviderErrorDetails extends OracleErrorDetails {
  errorCode?: string;
  attemptCount?: number;
}

export class OracleProviderError extends AppError {
  public readonly provider: string;
  public readonly errorCode: string;
  public readonly retryable: boolean;
  public readonly attemptCount: number;

  constructor(
    message: string,
    provider: string,
    errorCode: string,
    details?: Partial<OracleProviderErrorDetails>,
    cause?: Error
  ) {
    const config = OracleProviderError.getConfig(provider, errorCode);
    super({
      message,
      code: `${provider.toUpperCase()}_ERROR`,
      statusCode: config.statusCode,
      category: 'external_service',
      severity: config.severity,
      isOperational: true,
      retryable: config.retryable,
      details: { ...details, provider, errorCode },
      cause,
    });
    this.provider = provider;
    this.errorCode = errorCode;
    this.retryable = config.retryable;
    this.attemptCount = details?.attemptCount ?? 1;
  }

  private static getConfig(provider: string, errorCode: string): ErrorConfig {
    const providerConfigs = PROVIDER_ERROR_CONFIGS[provider];
    if (providerConfigs && providerConfigs[errorCode]) {
      return providerConfigs[errorCode];
    }
    return { retryable: true, severity: 'medium', statusCode: HttpStatusCodes.BAD_GATEWAY };
  }

  static isRetryableError(provider: string, errorCode: string): boolean {
    return OracleProviderError.getConfig(provider, errorCode).retryable;
  }

  toApiResponse(): {
    success: false;
    error: {
      code: string;
      message: string;
      retryable: boolean;
      errorCode: string;
      provider: string;
      attemptCount: number;
      requestId: string | undefined;
      details?: AppErrorDetails;
    };
    timestamp: string;
  } {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        errorCode: this.errorCode,
        provider: this.provider,
        attemptCount: this.attemptCount,
        requestId: this.requestId,
        details: this.details,
      },
      timestamp: this.timestamp.toISOString(),
    };
  }
}
