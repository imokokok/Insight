import type { TrendDirection, DataStatus } from './constants';
import type { OracleProvider, Blockchain } from './enums';

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
  provider: OracleProvider;
  chain?: Blockchain;
  decimals?: number;
  confidence?: number;
  source?: string;
  change?: number;
  change24h?: number;
  change24hPercent?: number;
  confidenceInterval?: ConfidenceInterval;
  dataSource?: 'real' | 'mock' | 'api' | 'fallback';
  // Chainlink Feed 元数据
  roundId?: string;
  answeredInRound?: string;
  version?: string;
  startedAt?: number;
  // Pyth 元数据
  priceId?: string; // Price Feed ID
  exponent?: number; // 价格指数
  conf?: number; // 置信区间绝对值
  publishTime?: number; // 发布时间
}

export interface OracleSymbolSupport {
  symbol: string;
  supportedOracles: OracleProvider[];
  supportedChains: Partial<Record<OracleProvider, Blockchain[]>>;
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
  trend: TrendDirection;
  status: DataStatus;
}

export interface PriceDataForAlert extends PriceDataBase {
  change24h: number;
  changePercent24h: number;
}
