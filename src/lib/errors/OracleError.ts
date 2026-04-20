import { AppError, type AppErrorDetails, ErrorCodes, HttpStatusCodes } from './AppError';

/**
 * Oracle error details base interface
 */
interface OracleErrorDetails extends AppErrorDetails {
  provider?: string;
  symbol?: string;
  chain?: string;
  endpoint?: string;
}

/**
 * Oracle client error
 * Oracle service client connection or configuration error
 */
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

/**
 * Price fetch error details
 */
interface PriceFetchErrorDetails extends OracleErrorDetails {
  timestamp?: number;
  retryable?: boolean;
  attemptCount?: number;
  lastSuccessfulPrice?: number;
  deviation?: number;
}

/**
 * Price fetch error
 * Failed to fetch price data from Oracle
 */
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

/**
 * Unsupported chain error details
 */
interface UnsupportedChainErrorDetails extends OracleErrorDetails {
  supportedChains?: string[];
  requestedChain?: string;
}

/**
 * Unsupported chain error
 */
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

  /**
   * Create unsupported chain error
   */
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

/**
 * Unsupported symbol error details
 */
interface UnsupportedSymbolErrorDetails extends OracleErrorDetails {
  supportedSymbols?: string[];
  requestedSymbol?: string;
}

/**
 * Unsupported symbol error
 */
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

  /**
   * Create unsupported symbol error
   */
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

/**
 * RedStone API error codes
 */
export type RedStoneErrorCode =
  | 'FETCH_ERROR'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_RESPONSE'
  | 'DATA_STALE'
  | 'PRICE_DEVIATION';

/**
 * RedStone API error details
 */
interface RedStoneApiErrorDetails extends OracleErrorDetails {
  errorCode: RedStoneErrorCode;
  retryable: boolean;
  attemptCount?: number;
  lastSuccessfulFetch?: number;
}

/**
 * RedStone API error
 */
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
      category: 'external_service',
      severity: RedStoneApiError.getSeverity(errorCode),
      isOperational: true,
      retryable: isRetryable,
      details: {
        ...details,
        errorCode,
        retryable: isRetryable,
      },
      cause,
    });
    this.errorCode = errorCode;
    this.retryable = isRetryable;
    this.attemptCount = details?.attemptCount ?? 1;
  }

  private static isRetryableError(errorCode: RedStoneErrorCode): boolean {
    const retryableCodes: RedStoneErrorCode[] = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'FETCH_ERROR',
      'DATA_STALE',
    ];
    return retryableCodes.includes(errorCode);
  }

  private static getStatusCode(errorCode: RedStoneErrorCode): number {
    switch (errorCode) {
      case 'RATE_LIMIT_ERROR':
        return HttpStatusCodes.TOO_MANY_REQUESTS;
      case 'TIMEOUT_ERROR':
        return HttpStatusCodes.GATEWAY_TIMEOUT;
      case 'NETWORK_ERROR':
        return HttpStatusCodes.SERVICE_UNAVAILABLE;
      case 'INVALID_RESPONSE':
      case 'PARSE_ERROR':
        return HttpStatusCodes.UNPROCESSABLE_ENTITY;
      default:
        return HttpStatusCodes.BAD_GATEWAY;
    }
  }

  private static getSeverity(errorCode: RedStoneErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'RATE_LIMIT_ERROR':
        return 'low';
      case 'TIMEOUT_ERROR':
      case 'NETWORK_ERROR':
        return 'medium';
      case 'INVALID_RESPONSE':
      case 'PARSE_ERROR':
        return 'high';
      case 'PRICE_DEVIATION':
        return 'critical';
      default:
        return 'medium';
    }
  }

  toApiResponse(): {
    success: false;
    error: {
      code: string;
      message: string;
      retryable: boolean;
      errorCode: RedStoneErrorCode;
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
        attemptCount: this.attemptCount,
        requestId: this.requestId,
        details: this.details,
      },
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Chainlink error codes
 */
type ChainlinkErrorCode =
  | 'AGGREGATOR_OFFLINE'
  | 'STALE_DATA'
  | 'PRICE_DEVIATION'
  | 'ROUND_INCOMPLETE'
  | 'INVALID_ANSWER'
  | 'HEARTBEAT_VIOLATION';

/**
 * Chainlink error details
 */
interface ChainlinkErrorDetails extends OracleErrorDetails {
  errorCode: ChainlinkErrorCode;
  aggregator?: string;
  roundId?: number;
  updatedAt?: number;
  heartbeat?: number;
}

/**
 * Chainlink error
 */
export class ChainlinkError extends AppError {
  public readonly errorCode: ChainlinkErrorCode;

  constructor(
    message: string,
    errorCode: ChainlinkErrorCode,
    details?: Partial<ChainlinkErrorDetails>,
    cause?: Error
  ) {
    super({
      message,
      code: 'CHAINLINK_ERROR',
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: ChainlinkError.getSeverity(errorCode),
      isOperational: true,
      retryable: ChainlinkError.isRetryableError(errorCode),
      details: { ...details, errorCode },
      cause,
    });
    this.errorCode = errorCode;
  }

  private static isRetryableError(errorCode: ChainlinkErrorCode): boolean {
    const retryableCodes: ChainlinkErrorCode[] = [
      'AGGREGATOR_OFFLINE',
      'STALE_DATA',
      'ROUND_INCOMPLETE',
    ];
    return retryableCodes.includes(errorCode);
  }

  private static getSeverity(
    errorCode: ChainlinkErrorCode
  ): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'HEARTBEAT_VIOLATION':
        return 'low';
      case 'ROUND_INCOMPLETE':
        return 'medium';
      case 'AGGREGATOR_OFFLINE':
      case 'STALE_DATA':
        return 'high';
      case 'PRICE_DEVIATION':
      case 'INVALID_ANSWER':
        return 'critical';
      default:
        return 'medium';
    }
  }
}

/**
 * Pyth error codes
 */
type PythErrorCode =
  | 'PRICE_FEED_NOT_FOUND'
  | 'STALE_PRICE'
  | 'INVALID_PRICE'
  | 'CONFIDENCE_INTERVAL_TOO_LARGE'
  | 'HERMES_CONNECTION_ERROR';

/**
 * Pyth error details
 */
interface PythErrorDetails extends OracleErrorDetails {
  errorCode: PythErrorCode;
  priceFeedId?: string;
  publishTime?: number;
  confidence?: number;
}

/**
 * Pyth error
 */
export class PythError extends AppError {
  public readonly errorCode: PythErrorCode;

  constructor(
    message: string,
    errorCode: PythErrorCode,
    details?: Partial<PythErrorDetails>,
    cause?: Error
  ) {
    super({
      message,
      code: 'PYTH_ERROR',
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: PythError.getSeverity(errorCode),
      isOperational: true,
      retryable: PythError.isRetryableError(errorCode),
      details: { ...details, errorCode },
      cause,
    });
    this.errorCode = errorCode;
  }

  private static isRetryableError(errorCode: PythErrorCode): boolean {
    const retryableCodes: PythErrorCode[] = ['STALE_PRICE', 'HERMES_CONNECTION_ERROR'];
    return retryableCodes.includes(errorCode);
  }

  private static getSeverity(errorCode: PythErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'HERMES_CONNECTION_ERROR':
        return 'medium';
      case 'STALE_PRICE':
        return 'high';
      case 'PRICE_FEED_NOT_FOUND':
        return 'low';
      case 'INVALID_PRICE':
      case 'CONFIDENCE_INTERVAL_TOO_LARGE':
        return 'critical';
      default:
        return 'medium';
    }
  }
}

/**
 * API3 error codes
 */
type API3ErrorCode =
  | 'DAPI_NOT_FOUND'
  | 'AIRNODE_ERROR'
  | 'SPONSOR_WALLET_ERROR'
  | 'TEMPLATE_NOT_FOUND'
  | 'BEACON_OFFLINE';

/**
 * API3 error details
 */
interface API3ErrorDetails extends OracleErrorDetails {
  errorCode: API3ErrorCode;
  dapiName?: string;
  airnodeAddress?: string;
  templateId?: string;
}

/**
 * API3 error
 */
export class API3Error extends AppError {
  public readonly errorCode: API3ErrorCode;

  constructor(
    message: string,
    errorCode: API3ErrorCode,
    details?: Partial<API3ErrorDetails>,
    cause?: Error
  ) {
    super({
      message,
      code: 'API3_ERROR',
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: API3Error.getSeverity(errorCode),
      isOperational: true,
      retryable: API3Error.isRetryableError(errorCode),
      details: { ...details, errorCode },
      cause,
    });
    this.errorCode = errorCode;
  }

  private static isRetryableError(errorCode: API3ErrorCode): boolean {
    const retryableCodes: API3ErrorCode[] = ['AIRNODE_ERROR', 'BEACON_OFFLINE'];
    return retryableCodes.includes(errorCode);
  }

  private static getSeverity(errorCode: API3ErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'TEMPLATE_NOT_FOUND':
      case 'DAPI_NOT_FOUND':
        return 'low';
      case 'AIRNODE_ERROR':
        return 'medium';
      case 'SPONSOR_WALLET_ERROR':
      case 'BEACON_OFFLINE':
        return 'high';
      default:
        return 'medium';
    }
  }
}

/**
 * Supra error codes
 */
type SupraErrorCode =
  | 'DORA_CONNECTION_ERROR'
  | 'STALE_PRICE'
  | 'INVALID_PRICE'
  | 'PAIR_NOT_FOUND'
  | 'PRICE_DEVIATION';

/**
 * Supra error details
 */
interface SupraErrorDetails extends OracleErrorDetails {
  errorCode: SupraErrorCode;
  pairIndex?: number;
  doraTimestamp?: number;
}

/**
 * Supra error
 */
export class SupraError extends AppError {
  public readonly errorCode: SupraErrorCode;

  constructor(
    message: string,
    errorCode: SupraErrorCode,
    details?: Partial<SupraErrorDetails>,
    cause?: Error
  ) {
    super({
      message,
      code: 'SUPRA_ERROR',
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: SupraError.getSeverity(errorCode),
      isOperational: true,
      retryable: SupraError.isRetryableError(errorCode),
      details: { ...details, errorCode },
      cause,
    });
    this.errorCode = errorCode;
  }

  private static isRetryableError(errorCode: SupraErrorCode): boolean {
    const retryableCodes: SupraErrorCode[] = ['DORA_CONNECTION_ERROR', 'STALE_PRICE'];
    return retryableCodes.includes(errorCode);
  }

  private static getSeverity(errorCode: SupraErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'PAIR_NOT_FOUND':
        return 'low';
      case 'DORA_CONNECTION_ERROR':
        return 'medium';
      case 'STALE_PRICE':
        return 'high';
      case 'INVALID_PRICE':
      case 'PRICE_DEVIATION':
        return 'critical';
      default:
        return 'medium';
    }
  }
}

/**
 * Flare error codes
 */
type FlareErrorCode =
  | 'FTSO_RPC_ERROR'
  | 'FEED_NOT_FOUND'
  | 'STALE_PRICE'
  | 'INVALID_PRICE'
  | 'INVALID_FEED_ID'
  | 'CONTRACT_CALL_FAILED';

/**
 * Flare error details
 */
interface FlareErrorDetails extends OracleErrorDetails {
  errorCode?: FlareErrorCode;
  feedId?: string;
  network?: string;
  timestamp?: number;
}

/**
 * Flare error
 */
export class FlareError extends AppError {
  public readonly errorCode: FlareErrorCode;

  constructor(
    message: string,
    errorCode: FlareErrorCode,
    details?: Partial<FlareErrorDetails>,
    cause?: Error
  ) {
    super({
      message,
      code: 'FLARE_ERROR',
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: FlareError.getSeverity(errorCode),
      isOperational: true,
      retryable: FlareError.isRetryableError(errorCode),
      details: { ...details, errorCode },
      cause,
    });
    this.errorCode = errorCode;
  }

  private static isRetryableError(errorCode: FlareErrorCode): boolean {
    const retryableCodes: FlareErrorCode[] = [
      'FTSO_RPC_ERROR',
      'STALE_PRICE',
      'CONTRACT_CALL_FAILED',
    ];
    return retryableCodes.includes(errorCode);
  }

  private static getSeverity(errorCode: FlareErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'FEED_NOT_FOUND':
      case 'INVALID_FEED_ID':
        return 'low';
      case 'FTSO_RPC_ERROR':
      case 'CONTRACT_CALL_FAILED':
        return 'medium';
      case 'STALE_PRICE':
        return 'high';
      case 'INVALID_PRICE':
        return 'critical';
      default:
        return 'medium';
    }
  }
}

type DIAErrorCode =
  | 'FETCH_ERROR'
  | 'PARSE_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_RESPONSE'
  | 'NFT_DATA_ERROR';

interface DIAErrorDetails extends OracleErrorDetails {
  errorCode: DIAErrorCode;
  symbol?: string;
  blockchain?: string;
  attemptCount?: number;
}

export class DIAError extends AppError {
  public readonly errorCode: DIAErrorCode;
  public readonly retryable: boolean;
  public readonly attemptCount: number;

  constructor(
    message: string,
    errorCode: DIAErrorCode,
    details?: Partial<DIAErrorDetails>,
    cause?: Error
  ) {
    const isRetryable = DIAError.isRetryableError(errorCode);
    super({
      message,
      code: 'DIA_ERROR',
      statusCode: DIAError.getStatusCode(errorCode),
      category: 'external_service',
      severity: DIAError.getSeverity(errorCode),
      isOperational: true,
      retryable: isRetryable,
      details: { ...details, errorCode },
      cause,
    });
    this.errorCode = errorCode;
    this.retryable = isRetryable;
    this.attemptCount = details?.attemptCount ?? 1;
  }

  private static isRetryableError(errorCode: DIAErrorCode): boolean {
    const retryableCodes: DIAErrorCode[] = [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'RATE_LIMIT_ERROR',
      'FETCH_ERROR',
    ];
    return retryableCodes.includes(errorCode);
  }

  private static getStatusCode(errorCode: DIAErrorCode): number {
    switch (errorCode) {
      case 'RATE_LIMIT_ERROR':
        return HttpStatusCodes.TOO_MANY_REQUESTS;
      case 'TIMEOUT_ERROR':
        return HttpStatusCodes.GATEWAY_TIMEOUT;
      case 'NETWORK_ERROR':
        return HttpStatusCodes.SERVICE_UNAVAILABLE;
      case 'INVALID_RESPONSE':
      case 'PARSE_ERROR':
        return HttpStatusCodes.UNPROCESSABLE_ENTITY;
      default:
        return HttpStatusCodes.BAD_GATEWAY;
    }
  }

  private static getSeverity(errorCode: DIAErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'RATE_LIMIT_ERROR':
        return 'low';
      case 'TIMEOUT_ERROR':
      case 'NETWORK_ERROR':
        return 'medium';
      case 'INVALID_RESPONSE':
      case 'PARSE_ERROR':
      case 'NFT_DATA_ERROR':
        return 'high';
      case 'FETCH_ERROR':
        return 'critical';
      default:
        return 'medium';
    }
  }
}

type WINkLinkErrorCode =
  | 'CONTRACT_CALL_ERROR'
  | 'STALE_DATA'
  | 'INVALID_PRICE'
  | 'PAIR_NOT_FOUND'
  | 'TRON_RPC_ERROR'
  | 'GAMING_DATA_ERROR';

interface WINkLinkErrorDetails extends OracleErrorDetails {
  errorCode: WINkLinkErrorCode;
  pairIndex?: number;
  contractAddress?: string;
  attemptCount?: number;
}

export class WINkLinkError extends AppError {
  public readonly errorCode: WINkLinkErrorCode;
  public readonly retryable: boolean;
  public readonly attemptCount: number;

  constructor(
    message: string,
    errorCode: WINkLinkErrorCode,
    details?: Partial<WINkLinkErrorDetails>,
    cause?: Error
  ) {
    const isRetryable = WINkLinkError.isRetryableError(errorCode);
    super({
      message,
      code: 'WINKLINK_ERROR',
      statusCode: WINkLinkError.getStatusCode(errorCode),
      category: 'external_service',
      severity: WINkLinkError.getSeverity(errorCode),
      isOperational: true,
      retryable: isRetryable,
      details: { ...details, errorCode },
      cause,
    });
    this.errorCode = errorCode;
    this.retryable = isRetryable;
    this.attemptCount = details?.attemptCount ?? 1;
  }

  private static isRetryableError(errorCode: WINkLinkErrorCode): boolean {
    const retryableCodes: WINkLinkErrorCode[] = [
      'CONTRACT_CALL_ERROR',
      'STALE_DATA',
      'TRON_RPC_ERROR',
    ];
    return retryableCodes.includes(errorCode);
  }

  private static getStatusCode(errorCode: WINkLinkErrorCode): number {
    switch (errorCode) {
      case 'TRON_RPC_ERROR':
        return HttpStatusCodes.SERVICE_UNAVAILABLE;
      case 'CONTRACT_CALL_ERROR':
        return HttpStatusCodes.BAD_GATEWAY;
      case 'PAIR_NOT_FOUND':
        return HttpStatusCodes.NOT_FOUND;
      default:
        return HttpStatusCodes.BAD_GATEWAY;
    }
  }

  private static getSeverity(errorCode: WINkLinkErrorCode): 'low' | 'medium' | 'high' | 'critical' {
    switch (errorCode) {
      case 'PAIR_NOT_FOUND':
      case 'GAMING_DATA_ERROR':
        return 'low';
      case 'TRON_RPC_ERROR':
      case 'CONTRACT_CALL_ERROR':
        return 'medium';
      case 'STALE_DATA':
        return 'high';
      case 'INVALID_PRICE':
        return 'critical';
      default:
        return 'medium';
    }
  }
}
