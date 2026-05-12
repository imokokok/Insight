import { providerNames as oracleNames } from '@/lib/constants';
import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';

export type { RefreshInterval } from '@/types/common';

const allSymbols = getAllSupportedSymbols();
export const tradingPairs = allSymbols.map((symbol) => `${symbol}/USD`);

export { oracleNames };

export const ANOMALY_ZSCORE_THRESHOLD = 2;
