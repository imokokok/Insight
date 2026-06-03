import { AppError, type AppErrorDetails, HttpStatusCodes } from '@/lib/errors/AppError';

import { type OracleProvider } from './enums';

export type OracleErrorCode =
  | 'ORACLE_ERROR'
  | 'SYMBOL_NOT_SUPPORTED'
  | 'NO_DATA_AVAILABLE'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INVALID_RESPONSE'
  | 'PROVIDER_UNAVAILABLE'
  | 'STALE_DATA'
  | 'INVALID_PRICE'
  | 'INSUFFICIENT_DATA'
  | 'INVALID_SYMBOL'
  | 'REAL_DATA_NOT_AVAILABLE'
  | 'API3_PRICE_NOT_AVAILABLE'
  | 'API3_PRICE_ERROR'
  | 'CHAINLINK_ERROR'
  | 'DIA_ERROR'
  | 'PYTH_ERROR'
  | 'FETCH_ERROR'
  | 'REDSTONE_ERROR'
  | 'WINKLINK_ERROR'
  | 'SUPRA_ERROR'
  | 'TWAP_ERROR';

export class OracleServiceError extends AppError {
  public readonly provider: OracleProvider;

  constructor(
    message: string,
    provider: OracleProvider,
    code?: OracleErrorCode,
    options?: {
      retryable?: boolean;
      details?: AppErrorDetails;
      cause?: Error;
    }
  ) {
    super({
      message,
      code: code ?? 'ORACLE_ERROR',
      statusCode: HttpStatusCodes.BAD_GATEWAY,
      category: 'external_service',
      severity: 'medium',
      isOperational: true,
      retryable: options?.retryable ?? false,
      details: options?.details,
      cause: options?.cause,
    });
    this.provider = provider;
  }
}
