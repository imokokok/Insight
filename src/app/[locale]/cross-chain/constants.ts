import {
  TIME_RANGES,
  DEVIATION_THRESHOLD,
  symbols,
  providerNames,
  chainNames,
  chainColors,
  type RefreshInterval,
} from '@/lib/constants';
import { type Blockchain, type OracleProvider } from '@/lib/oracles';

export {
  TIME_RANGES,
  DEVIATION_THRESHOLD,
  symbols,
  providerNames,
  chainNames,
  chainColors,
  type RefreshInterval,
};

export interface HeatmapData {
  x: string;
  y: string;
  value: number;
  percent: number;
  xChain: Blockchain;
  yChain: Blockchain;
}

export interface PriceDifference {
  chain: Blockchain;
  price: number;
  diff: number;
  diffPercent: number;
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

export interface BoxPlotData {
  chain: Blockchain;
  chainName: string;
  color: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  outliers: number[];
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
}

export interface ChartDataPoint {
  timestamp: number;
  time: string;
  [key: string]: number | string | null;
}

export interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}

export interface ProgressBarProps {
  value: number;
  color: string;
  max?: number;
  showValue?: boolean;
  suffix?: string;
}

export interface JumpIndicatorProps {
  count: number;
}

export interface CrossChainFiltersState {
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  selectedTimeRange: number;
  selectedBaseChain: Blockchain | null;
  visibleChains: Blockchain[];
  showMA: boolean;
  maPeriod: number;
}

export interface StabilityData {
  volatility: number;
  delay: { avgDelay: number; maxDelay: number } | undefined;
  stabilityRating: string;
  freshness: { status: string; color: string };
  integrity: number;
  jumpCount: number;
}
