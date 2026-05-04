import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { OracleProvider } from '@/types/oracle';

type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y';

const timeRangeLabels: Record<TimeRange, string> = {
  '1h': '1 Hour',
  '24h': '24 Hours',
  '7d': '7 Days',
  '30d': '30 Days',
  '90d': '90 Days',
  '1y': '1 Year',
};

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '1h', label: timeRangeLabels['1h'] },
  { value: '24h', label: timeRangeLabels['24h'] },
  { value: '7d', label: timeRangeLabels['7d'] },
  { value: '30d', label: timeRangeLabels['30d'] },
  { value: '90d', label: timeRangeLabels['90d'] },
  { value: '1y', label: timeRangeLabels['1y'] },
];

const allSymbols = getAllSupportedSymbols();
export const tradingPairs = allSymbols.map((symbol) => `${symbol}/USD`);

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

export type { RefreshInterval } from '@/types/common';
export {
  REFRESH_INTERVAL_OPTIONS,
  refreshIntervalToLabel,
  labelToRefreshInterval,
} from '@/types/common';

export const ANOMALY_ZSCORE_THRESHOLD = 2;

export { calculateZScore } from '@/lib/utils/statistics';
