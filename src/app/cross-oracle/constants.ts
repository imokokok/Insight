/**
 * @fileoverview Cross-oracle comparison page constants
 */

import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { OracleProvider } from '@/types/oracle';

import { DEVIATION_THRESHOLDS } from './thresholds';

// ============================================================================
// Time ranges
// ============================================================================

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

type TimeRangeValue = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y';

export function timeRangeToValue(range: TimeRange): TimeRangeValue {
  const map: Record<TimeRange, TimeRangeValue> = {
    '1h': '1H',
    '24h': '24H',
    '7d': '7D',
    '30d': '30D',
    '90d': '90D',
    '1y': '1Y',
  };
  return map[range];
}

const timeRangeLabels: Record<TimeRange, string> = {
  '1h': '1 Hour',
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  '1y': '1 Year',
};

export const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '1h', label: timeRangeLabels['1h'] },
  { value: '24h', label: timeRangeLabels['24h'] },
  { value: '7d', label: timeRangeLabels['7d'] },
  { value: '30d', label: timeRangeLabels['30d'] },
  { value: '90d', label: timeRangeLabels['90d'] },
  { value: '1y', label: timeRangeLabels['1y'] },
];

// ============================================================================
// Trading pairs - generated from unified symbol list
// ============================================================================

// Get all supported trading pairs and convert to BTC/USD format
const allSymbols = getAllSupportedSymbols();
export const tradingPairs = allSymbols.map((symbol) => `${symbol}/USD`);

// ============================================================================
// Oracle providers - using unified OracleProvider enum
// ============================================================================

// Export for backward compatibility - using OracleProvider enum
export const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.WINKLINK]: 'WINkLink',
  [OracleProvider.SUPRA]: 'Supra',
  [OracleProvider.TWAP]: 'TWAP',
  [OracleProvider.REFLECTOR]: 'Reflector',
  [OracleProvider.FLARE]: 'Flare',
};

// ============================================================================
// Refresh intervals
// ============================================================================

export type RefreshInterval = 'off' | '10s' | '30s' | '1m' | '5m';

// ============================================================================
// Threshold configuration
// ============================================================================

export const ANOMALY_ZSCORE_THRESHOLD = 2;

export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

/**
 * Check if a z-score indicates an outlier/anomaly value
 */
export function isOutlier(zScore: number, threshold: number = ANOMALY_ZSCORE_THRESHOLD): boolean {
  return Math.abs(zScore) > threshold;
}

/**
 * Get deviation background CSS class
 */
export function getDeviationBgClass(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation >= DEVIATION_THRESHOLDS.CRITICAL) {
    return 'bg-red-100 text-red-800';
  }
  if (absDeviation >= DEVIATION_THRESHOLDS.WARNING) {
    return 'bg-yellow-100 text-yellow-800';
  }
  if (absDeviation >= DEVIATION_THRESHOLDS.NORMAL) {
    return 'bg-blue-100 text-blue-800';
  }
  return 'bg-green-100 text-green-800';
}

/**
 * Get freshness information based on timestamp
 */
export function getFreshnessInfo(timestamp: number): {
  text: string;
  color: string;
  seconds?: number;
} {
  const age = Date.now() - timestamp;
  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(age / 60000);

  if (minutes < 1) {
    return { text: 'Just now', color: '#22c55e', seconds };
  }
  if (minutes < 5) {
    return {
      text: `${minutes} minutes ago`,
      color: '#22c55e',
      seconds,
    };
  }
  if (minutes < 30) {
    return {
      text: `${minutes} minutes ago`,
      color: '#f59e0b',
      seconds,
    };
  }
  if (minutes < 60) {
    return {
      text: `${minutes} minutes ago`,
      color: '#ef4444',
      seconds,
    };
  }
  return {
    text: `${Math.floor(minutes / 60)} hours ago`,
    color: '#7f1d1d',
    seconds,
  };
}

/**
 * Get freshness dot color based on seconds
 */
export function getFreshnessDotColor(freshnessSeconds: number): string {
  const minutes = Math.floor(freshnessSeconds / 60);

  if (minutes < 1) return '#22c55e';
  if (minutes < 5) return '#22c55e';
  if (minutes < 30) return '#f59e0b';
  if (minutes < 60) return '#ef4444';
  return '#7f1d1d';
}

// ============================================================================
// Sort and filter types
// ============================================================================

export type SortColumn = 'oracle' | 'price' | 'deviation' | 'timestamp' | 'confidence';
export type SortDirection = 'asc' | 'desc';
export type DeviationFilter = 'all' | 'normal' | 'warning' | 'critical';

// ============================================================================
// Export functionality
// ============================================================================
