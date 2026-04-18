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
  // API3 元数据
  dapiName?: string; // dAPI 名称，如 "ETH/USD"
  proxyAddress?: string; // dAPI Proxy 合约地址
  dataAge?: number; // 数据年龄（毫秒）
  // Supra 元数据
  pairIndex?: number; // Supra DORA 交易对索引
  // TWAP 元数据
  poolAddress?: string;
  feeTier?: number;
  sqrtPriceX96?: string;
  tick?: number;
  twapInterval?: number;
  twapPrice?: number;
  spotPrice?: number;
  liquidity?: string;
  // Reflector 元数据
  resolution?: number; // 数据更新分辨率（秒）
  contractVersion?: number; // 合约版本
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
