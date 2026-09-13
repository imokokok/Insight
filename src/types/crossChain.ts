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
  // The comparison table currently has snapshot-only data and therefore
  // cannot calculate a defensible ATR or rolling-volatility threshold.
  // Keep the declared mode aligned with the actual fixed 0.5% behaviour.
  type: 'fixed',
  fixedThreshold: 0.5,
  atrMultiplier: 2.0,
  volatilityWindow: 20,
  priceJumpMethod: 'zscore',
  priceJumpThreshold: 2.0,
  outlierDetectionMethod: 'iqr',
  outlierThreshold: 1.5,
};
