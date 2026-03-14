export interface ConfidenceInterval {
  bid: number;
  ask: number;
  widthPercentage: number;
}

export interface PriceDataBase {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface PriceData extends PriceDataBase {
  provider: import('./enums').OracleProvider;
  chain?: import('./enums').Blockchain;
  decimals?: number;
  confidence?: number;
  source?: string;
  change?: number;
  change24h?: number;
  change24hPercent?: number;
  confidenceInterval?: ConfidenceInterval;
}

export interface PriceDataPoint extends PriceDataBase {
  change24h?: number;
  changePercent24h?: number;
}

export interface PriceDataForTechnicalAnalysis {
  price: number;
  timestamp: number;
}

export interface PriceDataForChart extends PriceDataBase {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

export interface PriceDataExtended extends PriceData {
  changePercent?: number;
}

export interface PriceDeviation {
  symbol: string;
  oraclePrice: number;
  marketPrice?: number;
  deviation: number;
  deviationPercent: number;
  trend: import('./constants').TrendDirection;
  status: import('./constants').DataStatus;
}

export interface PriceDataForAlert extends PriceDataBase {
  change24h: number;
  changePercent24h: number;
}
