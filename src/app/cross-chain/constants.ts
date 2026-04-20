import {
  TIME_RANGES,
  symbols,
  providerNames,
  chainNames,
  chainColors,
  type RefreshInterval,
} from '@/lib/constants';
import { type Blockchain } from '@/types/oracle';

export { TIME_RANGES, symbols, providerNames, chainNames, chainColors, type RefreshInterval };

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
