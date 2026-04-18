export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  stdDev: number[];
}

export interface BollingerBandsExtendedResult {
  upper: number[];
  middle: number[];
  lower: number[];
  stdDev: number[];
  bandwidth: number[];
  bandwidthPercent: number[];
  position: number[];
}

export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export interface MACDExtendedResult {
  dif: number[];
  dea: number[];
  macd: number[];
  signals: Array<'golden' | 'death' | null>;
}

export interface ATRResult {
  tr: number[];
  atr: number[];
}

interface RSIResult {
  values: number[];
  avgGain: number[];
  avgLoss: number[];
}

interface BollingerBandsConfig {
  period: number;
  multiplier: number;
}

interface RSIConfig {
  period: number;
  overbought: number;
  oversold: number;
}

interface MACDConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

interface MAConfig {
  enabled: boolean;
  period: number;
  color: string;
}

interface IndicatorSettings {
  showMA7: boolean;
  showMA14: boolean;
  showMA30: boolean;
  showMA60: boolean;
  showMA20: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
  bollingerBands: BollingerBandsConfig;
  rsi: RSIConfig;
  macd: MACDConfig;
}

export interface OHLCVDataPoint {
  price: number;
  high?: number;
  low?: number;
  close?: number;
  open?: number;
  volume?: number;
  timestamp?: number;
}

export type NullableNumber = number | null;

type NullableArray = NullableNumber[];
