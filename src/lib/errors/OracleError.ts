import { AppError, type AppErrorDetails, ErrorCodes, HttpStatusCodes } from './AppError';

export { OracleError } from '@/types/oracle';

/**
 * Oracle错误详情基础接口
 */
export interface OracleErrorDetails extends AppErrorDetails {
  provider?: string;
  symbol?: string;
  chain?: string;
  endpoint?: string;
}

/**
 * Oracle客户端错误
 * Oracle服务客户端连接或配置错误
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
 * 价格获取错误详情
 */
export interface PriceFetchErrorDetails extends OracleErrorDetails {
  timestamp?: number;
  retryable?: boolean;
  attemptCount?: number;
  lastSuccessfulPrice?: number;
  deviation?: number;
}

/**
 * 价格获取错误
 * 从Oracle获取价格数据失败
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
 * 不支持的链错误详情
 */
export interface UnsupportedChainErrorDetails extends OracleErrorDetails {
  supportedChains?: string[];
  requestedChain?: string;
}

/**
 * 不支持的链错误
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
   * 创建不支持的链错误
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
 * 不支持的代币错误详情
 */
export interface UnsupportedSymbolErrorDetails extends OracleErrorDetails {
  supportedSymbols?: string[];
  requestedSymbol?: string;
}

/**
 * 不支持的代币错误
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
   * 创建不支持的代币错误
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
 * RedStone API 错误代码
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
 * RedStone API 错误详情
 */
export interface RedStoneApiErrorDetails extends OracleErrorDetails {
  errorCode: RedStoneErrorCode;
  retryable: boolean;
  attemptCount?: number;
  lastSuccessfulFetch?: number;
}

/**
 * RedStone API 错误
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
 * Chainlink 错误代码
 */
export type ChainlinkErrorCode =
  | 'AGGREGATOR_OFFLINE'
  | 'STALE_DATA'
  | 'PRICE_DEVIATION'
  | 'ROUND_INCOMPLETE'
  | 'INVALID_ANSWER'
  | 'HEARTBEAT_VIOLATION';

/**
 * Chainlink 错误详情
 */
export interface ChainlinkErrorDetails extends OracleErrorDetails {
  errorCode: ChainlinkErrorCode;
  aggregator?: string;
  roundId?: number;
  updatedAt?: number;
  heartbeat?: number;
}

/**
 * Chainlink 错误
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
 * Pyth 错误代码
 */
export type PythErrorCode =
  | 'PRICE_FEED_NOT_FOUND'
  | 'STALE_PRICE'
  | 'INVALID_PRICE'
  | 'CONFIDENCE_INTERVAL_TOO_LARGE'
  | 'HERMES_CONNECTION_ERROR';

/**
 * Pyth 错误详情
 */
export interface PythErrorDetails extends OracleErrorDetails {
  errorCode: PythErrorCode;
  priceFeedId?: string;
  publishTime?: number;
  confidence?: number;
}

/**
 * Pyth 错误
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
 * API3 错误代码
 */
export type API3ErrorCode =
  | 'DAPI_NOT_FOUND'
  | 'AIRNODE_ERROR'
  | 'SPONSOR_WALLET_ERROR'
  | 'TEMPLATE_NOT_FOUND'
  | 'BEACON_OFFLINE';

/**
 * API3 错误详情
 */
export interface API3ErrorDetails extends OracleErrorDetails {
  errorCode: API3ErrorCode;
  dapiName?: string;
  airnodeAddress?: string;
  templateId?: string;
}

/**
 * API3 错误
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
 * Supra 错误代码
 */
export type SupraErrorCode =
  | 'DORA_CONNECTION_ERROR'
  | 'STALE_PRICE'
  | 'INVALID_PRICE'
  | 'PAIR_NOT_FOUND'
  | 'PRICE_DEVIATION';

/**
 * Supra 错误详情
 */
export interface SupraErrorDetails extends OracleErrorDetails {
  errorCode: SupraErrorCode;
  pairIndex?: number;
  doraTimestamp?: number;
}

/**
 * Supra 错误
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
 * Flare 错误代码
 */
export type FlareErrorCode =
  | 'FTSO_RPC_ERROR'
  | 'FEED_NOT_FOUND'
  | 'STALE_PRICE'
  | 'INVALID_PRICE'
  | 'INVALID_FEED_ID'
  | 'CONTRACT_CALL_FAILED';

/**
 * Flare 错误详情
 */
export interface FlareErrorDetails extends OracleErrorDetails {
  errorCode?: FlareErrorCode;
  feedId?: string;
  network?: string;
  timestamp?: number;
}

/**
 * Flare 错误
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
