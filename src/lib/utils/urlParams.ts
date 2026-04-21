import { isBlockchain } from '@/lib/utils/chainUtils';
import { type OracleProvider, type Blockchain, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

export interface QueryConfig {
  oracles: OracleProvider[];
  chains: Blockchain[];
  symbol: string;
  timeRange: number;
  refreshInterval?: number;
  isCompareMode?: boolean;
  compareTimeRange?: number;
}

const VALID_ORACLES = ORACLE_PROVIDER_VALUES;
const VALID_TIME_RANGES = [1, 6, 12, 24, 72, 168, 720];
const VALID_REFRESH_INTERVALS = [0, 30000, 60000, 300000];

export function parseQueryParams(search: string): Partial<QueryConfig> {
  const params = new URLSearchParams(search);
  const result: Partial<QueryConfig> = {};

  const oraclesParam = params.get('oracles');
  if (oraclesParam) {
    const oracleValues = oraclesParam
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => VALID_ORACLES.includes(v as OracleProvider));
    if (oracleValues.length > 0) {
      result.oracles = oracleValues as OracleProvider[];
    }
  }

  const chainsParam = params.get('chains');
  if (chainsParam) {
    const chainValues = chainsParam
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(isBlockchain);
    if (chainValues.length > 0) {
      result.chains = chainValues;
    }
  }

  const symbolParam = params.get('symbol');
  if (symbolParam) {
    const upperSymbol = symbolParam.trim().toUpperCase();
    result.symbol = upperSymbol;
  }

  const timeRangeParam = params.get('timeRange');
  if (timeRangeParam) {
    const timeRange = parseInt(timeRangeParam, 10);
    if (!isNaN(timeRange) && VALID_TIME_RANGES.includes(timeRange)) {
      result.timeRange = timeRange;
    }
  }

  const refreshIntervalParam = params.get('refresh');
  if (refreshIntervalParam) {
    const refreshInterval = parseInt(refreshIntervalParam, 10);
    if (!isNaN(refreshInterval) && VALID_REFRESH_INTERVALS.includes(refreshInterval)) {
      result.refreshInterval = refreshInterval;
    }
  }

  const compareModeParam = params.get('compare');
  if (compareModeParam === 'true') {
    result.isCompareMode = true;
  }

  const compareTimeRangeParam = params.get('compareTimeRange');
  if (compareTimeRangeParam) {
    const compareTimeRange = parseInt(compareTimeRangeParam, 10);
    if (!isNaN(compareTimeRange) && VALID_TIME_RANGES.includes(compareTimeRange)) {
      result.compareTimeRange = compareTimeRange;
    }
  }

  return result;
}

export function buildQueryParams(config: QueryConfig): string {
  const params = new URLSearchParams();

  if (config.oracles && config.oracles.length > 0) {
    params.set('oracles', config.oracles.join(','));
  }

  if (config.chains && config.chains.length > 0) {
    params.set('chains', config.chains.join(','));
  }

  if (config.symbol) {
    params.set('symbol', config.symbol);
  }

  if (config.timeRange !== undefined && config.timeRange !== null) {
    params.set('timeRange', config.timeRange.toString());
  }

  if (config.refreshInterval !== undefined && config.refreshInterval !== 0) {
    params.set('refresh', config.refreshInterval.toString());
  }

  if (config.isCompareMode) {
    params.set('compare', 'true');
  }

  if (config.compareTimeRange !== undefined && config.compareTimeRange !== 24) {
    params.set('compareTimeRange', config.compareTimeRange.toString());
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function updateUrlParams(config: QueryConfig): void {
  if (typeof window === 'undefined') {
    return;
  }

  const queryString = buildQueryParams(config);
  const newUrl = queryString
    ? `${window.location.pathname}${queryString}`
    : window.location.pathname;

  window.history.replaceState({}, '', newUrl);
}
