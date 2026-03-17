import { OracleProvider, Blockchain } from '@/types/oracle';

export interface QueryConfig {
  oracles: OracleProvider[];
  chains: Blockchain[];
  symbol: string;
  timeRange: number;
}

const VALID_ORACLES = Object.values(OracleProvider);
const VALID_CHAINS = Object.values(Blockchain);
const VALID_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'BAND', 'UMA', 'PYTH', 'API3', 'USDC'];
const VALID_TIME_RANGES = [1, 6, 12, 24, 72, 168, 720];

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
      .filter((v) => VALID_CHAINS.includes(v as Blockchain));
    if (chainValues.length > 0) {
      result.chains = chainValues as Blockchain[];
    }
  }

  const symbolParam = params.get('symbol');
  if (symbolParam) {
    const upperSymbol = symbolParam.trim().toUpperCase();
    // 允许任意币种代码，不限于预定义列表
    result.symbol = upperSymbol;
  }

  const timeRangeParam = params.get('timeRange');
  if (timeRangeParam) {
    const timeRange = parseInt(timeRangeParam, 10);
    if (!isNaN(timeRange) && VALID_TIME_RANGES.includes(timeRange)) {
      result.timeRange = timeRange;
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
