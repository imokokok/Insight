/**
 * Price Query Type Definitions
 * Centralized type definitions for price query functionality
 */

import type { PriceData } from '@/types/oracle';

/**
 * Base chart data point with required fields
 */
export interface ChartDataPointBase {
  timestamp: number;
  time: string;
}

/**
 * Chart data point with dynamic series values
 * Series values are stored with string keys and number values
 */
export interface ChartDataPoint extends ChartDataPointBase {
  [seriesKey: string]: number | string | object;
}

/**
 * Enhanced chart data point with internal metadata
 * Used for tooltip and advanced chart features
 */
export interface EnhancedChartDataPoint extends ChartDataPoint {
  _avgPrice: number;
  _prevValues: Record<string, number>;
  _oracleInfo: Record<string, { chain?: string; provider?: string }>;
}

/**
 * Query result interface
 */
export interface QueryResult {
  provider: string;
  chain: string;
  priceData: PriceData;
}

/**
 * Export field configuration
 */
export interface ExportField {
  key: string;
  label: string;
  enabled: boolean;
}

/**
 * Export configuration data
 */
export interface ExportConfigData {
  format: 'csv' | 'json' | 'pdf';
  fields: ExportField[];
  timeRange: {
    start: number | null;
    end: number | null;
  };
  includeChart: boolean;
  includeStats: boolean;
}

/**
 * Price statistics result
 */
export interface PriceStats {
  avg: number;
  max: number;
  min: number;
  range: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

/**
 * Query error information
 */
export interface QueryError {
  provider: string;
  chain: string;
  error: string;
}

/**
 * Query progress information
 */
export interface QueryProgress {
  completed: number;
  total: number;
}

/**
 * Sort configuration for query results
 */
export interface SortConfig {
  field: 'oracle' | 'blockchain' | 'price' | 'timestamp';
  direction: 'asc' | 'desc';
}

/**
 * Time comparison configuration
 */
export interface TimeComparisonConfig {
  enabled: boolean;
  primaryTimeRange: number;
  compareTimeRange: number;
}

/**
 * Series visibility state
 */
export type SeriesVisibility = Set<string>;

/**
 * Filter predicate function type
 */
export type FilterPredicate<T> = (item: T) => boolean;

/**
 * Generic data transform function type
 */
export type DataTransform<T, R> = (data: T) => R;
