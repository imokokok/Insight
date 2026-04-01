/**
 * Price Query Constants
 * Centralized constants for price query functionality
 */

import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';

/**
 * Maximum number of concurrent requests to prevent overwhelming the system
 */
export const MAX_CONCURRENT_REQUESTS = 6;

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT_MS = 30000;

/**
 * Maximum number of symbols to display in the selector
 */
export const MAX_VISIBLE_SYMBOLS = 12;

/**
 * Default stale time for price data cache (5 minutes)
 */
export const DEFAULT_PRICE_STALE_TIME = 5 * 60 * 1000;

/**
 * Default garbage collection time for price data cache (10 minutes)
 */
export const DEFAULT_PRICE_GC_TIME = 10 * 60 * 1000;

/**
 * Default retry count for failed requests
 */
export const DEFAULT_RETRY_COUNT = 2;

/**
 * Chart colors for different series
 */
export const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
] as const;

/**
 * Export field configurations
 */
export const EXPORT_FIELDS = [
  { key: 'oracle', label: 'Oracle', enabled: true },
  { key: 'blockchain', label: 'Blockchain', enabled: true },
  { key: 'price', label: 'Price', enabled: true },
  { key: 'timestamp', label: 'Timestamp', enabled: true },
  { key: 'change24h', label: '24h Change', enabled: true },
  { key: 'confidence', label: 'Confidence', enabled: false },
  { key: 'source', label: 'Source', enabled: false },
] as const;

/**
 * Time range options in hours
 */
export const TIME_RANGES = [
  { value: 1, key: '1h' },
  { value: 6, key: '6h' },
  { value: 24, key: '24h' },
  { value: 72, key: '3d' },
  { value: 168, key: '7d' },
  { value: 720, key: '30d' },
] as const;

/**
 * Type for export field keys
 */
export type ExportFieldKey = (typeof EXPORT_FIELDS)[number]['key'];

/**
 * Type for time range values
 */
export type TimeRangeValue = (typeof TIME_RANGES)[number]['value'];

/**
 * Interface for query task
 */
export interface QueryTask {
  provider: OracleProvider;
  chain: Blockchain;
  timeRange: number;
  isCompare: boolean;
}

/**
 * Interface for query result with history
 */
export interface QueryResultWithHistory {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
  history: PriceData[];
  isCompare: boolean;
}
