import type { Blockchain } from '@/types/oracle';

export type RefreshInterval = 0 | 30000 | 60000 | 300000;

export type ThresholdType = 'fixed' | 'dynamic' | 'atr';

export type OutlierDetectionMethod = 'zscore' | 'iqr';

export interface ThresholdConfig {
  type: ThresholdType;
  fixedThreshold: number;
  atrMultiplier: number;
  volatilityWindow: number;
  priceJumpMethod: 'std' | 'zscore' | 'simple';
  priceJumpThreshold: number;
  outlierDetectionMethod: OutlierDetectionMethod;
  outlierThreshold: number;
}

export const defaultThresholdConfig: ThresholdConfig = {
  type: 'dynamic',
  fixedThreshold: 0.5,
  atrMultiplier: 2.0,
  volatilityWindow: 20,
  priceJumpMethod: 'zscore',
  priceJumpThreshold: 2.0,
  outlierDetectionMethod: 'iqr',
  outlierThreshold: 1.5,
};

export interface AnomalousPricePoint {
  chain: Blockchain;
  price: number;
  timestamp: number;
  reason: 'iqr_outlier' | 'std_dev_outlier';
  deviation: number;
}
