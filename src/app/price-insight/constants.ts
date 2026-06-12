import {
  TIME_RANGES,
  symbols,
  providerNames as oracleNames,
  chainNames,
  chainColors,
} from '@/lib/constants';
import { getAllSupportedSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { type Blockchain } from '@/types/oracle';

export type { RefreshInterval } from '@/types/common';

// Cross-oracle constants
const allSymbols = getAllSupportedSymbols();
export const tradingPairs = allSymbols.map((symbol) => `${symbol}/USD`);

export { oracleNames };
export const providerNames = oracleNames;

export const ANOMALY_ZSCORE_THRESHOLD = 2;

// Cross-chain constants
export { TIME_RANGES, symbols, chainNames, chainColors };

export const CHAIN_EXPECTED_INTERVALS: Record<string, number> = {
  solana: 1,
  arbitrum: 2,
  optimism: 2,
  base: 2,
  polygon: 5,
  avalanche: 5,
  'bnb-chain': 5,
  ethereum: 12,
  fantom: 5,
  cronos: 5,
  juno: 6,
  cosmos: 6,
  osmosis: 6,
  scroll: 3,
  zksync: 2,
  aptos: 1,
  sui: 1,
  gnosis: 5,
  mantle: 2,
  linea: 2,
};

export interface HeatmapData {
  x: string;
  y: string;
  value: number;
  percent: number;
  xChain: Blockchain;
  yChain: Blockchain;
}

export interface ChainStats {
  label: string;
  value: string;
  trend: number | null;
  subValue?: string | null;
  tooltip: string;
}

export interface Outlier {
  chain: Blockchain;
  price: number;
  deviationPercent: number;
  boundType: 'lower' | 'upper';
  expectedRange: string;
}

export interface IqrOutliers {
  outliers: Outlier[];
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
}
