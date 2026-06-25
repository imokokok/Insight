type ThresholdType = 'fixed' | 'dynamic' | 'atr';

type OutlierDetectionMethod = 'zscore' | 'iqr';

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
