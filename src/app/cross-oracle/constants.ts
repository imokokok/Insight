import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { OracleProvider } from '@/types/oracle';

export type { RefreshInterval } from '@/types/common';

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

export const ANOMALY_ZSCORE_THRESHOLD = 2;
