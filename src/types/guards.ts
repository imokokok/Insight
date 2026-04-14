import { type ApiResponse, type ApiError, type PaginatedResponse } from './api/responses';
import { DataStatus, TrendDirection } from './oracle/constants';
import { OracleProvider, Blockchain } from './oracle/enums';
import { type PriceData } from './oracle/price';
import { type PublisherStatus } from './oracle/publisher';
import { type RiskLevel } from './risk';

const ORACLE_PROVIDER_VALUES = Object.values(OracleProvider) as string[];
const BLOCKCHAIN_VALUES = Object.values(Blockchain) as string[];
const DATA_STATUS_VALUES = Object.values(DataStatus) as string[];
const TREND_DIRECTION_VALUES = Object.values(TrendDirection) as string[];

export function isOracleProvider(value: unknown): value is OracleProvider {
  return typeof value === 'string' && ORACLE_PROVIDER_VALUES.includes(value);
}

export function isBlockchain(value: unknown): value is Blockchain {
  return typeof value === 'string' && BLOCKCHAIN_VALUES.includes(value);
}

export function isDataStatus(value: unknown): value is DataStatus {
  return typeof value === 'string' && DATA_STATUS_VALUES.includes(value);
}

export function isTrendDirection(value: unknown): value is TrendDirection {
  return typeof value === 'string' && TREND_DIRECTION_VALUES.includes(value);
}

export function isPublisherStatus(value: unknown): value is PublisherStatus {
  return typeof value === 'string' && ['active', 'inactive', 'degraded'].includes(value);
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && ['low', 'medium', 'high'].includes(value);
}

export function isPriceData(value: unknown): value is PriceData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'symbol' in value &&
    'price' in value &&
    'timestamp' in value &&
    typeof (value as PriceData).symbol === 'string' &&
    typeof (value as PriceData).price === 'number' &&
    typeof (value as PriceData).timestamp === 'number'
  );
}

export function isPriceDataArray(value: unknown): value is PriceData[] {
  return Array.isArray(value) && value.every(isPriceData);
}

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    'timestamp' in value &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string' &&
    typeof (value as ApiError).timestamp === 'number'
  );
}

export function isApiResponse<T>(
  value: unknown,
  guard?: (val: unknown) => val is T
): value is ApiResponse<T> {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('success' in value) ||
    !('timestamp' in value)
  ) {
    return false;
  }

  const response = value as ApiResponse<T>;

  if (typeof response.success !== 'boolean' || typeof response.timestamp !== 'number') {
    return false;
  }

  if (response.error && !isApiError(response.error)) {
    return false;
  }

  if (guard && response.data !== undefined) {
    return guard(response.data);
  }

  return true;
}

export function isPaginatedResponse<T>(
  value: unknown,
  itemGuard?: (val: unknown) => val is T
): value is PaginatedResponse<T> {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('items' in value) ||
    !('total' in value) ||
    !('page' in value) ||
    !('pageSize' in value) ||
    !('hasMore' in value)
  ) {
    return false;
  }

  const response = value as PaginatedResponse<T>;

  if (
    !Array.isArray(response.items) ||
    typeof response.total !== 'number' ||
    typeof response.page !== 'number' ||
    typeof response.pageSize !== 'number' ||
    typeof response.hasMore !== 'boolean'
  ) {
    return false;
  }

  if (itemGuard) {
    return response.items.every(itemGuard);
  }

  return true;
}

export function assertIsOracleProvider(value: unknown): asserts value is OracleProvider {
  if (!isOracleProvider(value)) {
    throw new Error(`Invalid OracleProvider: ${value}`);
  }
}

export function assertIsBlockchain(value: unknown): asserts value is Blockchain {
  if (!isBlockchain(value)) {
    throw new Error(`Invalid Blockchain: ${value}`);
  }
}

export function assertIsPriceData(value: unknown): asserts value is PriceData {
  if (!isPriceData(value)) {
    throw new Error('Invalid PriceData object');
  }
}

export function assertIsApiResponse<T>(
  value: unknown,
  guard?: (val: unknown) => val is T
): asserts value is ApiResponse<T> {
  if (!isApiResponse(value, guard)) {
    throw new Error('Invalid ApiResponse object');
  }
}

export function hasProperty<K extends string>(obj: unknown, key: K): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && keys.every((key) => key in obj);
}
