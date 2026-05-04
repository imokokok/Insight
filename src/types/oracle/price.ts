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
  confidenceSource?: 'original' | 'estimated';
  source?: string;
  change?: number;
  change24h?: number;
  change24hPercent?: number;
  confidenceInterval?: ConfidenceInterval;
  dataSource?: 'real' | 'mock' | 'api' | 'fallback';
  // Chainlink Feed metadata
  roundId?: string;
  answeredInRound?: string;
  version?: string;
  startedAt?: number;
  // Pyth metadata
  priceId?: string; // Price Feed ID
  exponent?: number; // price exponent
  conf?: number; // confidence interval absolute value
  publishTime?: number; // publish time
  // API3 metadata
  dapiName?: string; // dAPI name， "ETH/USD"
  proxyAddress?: string; // dAPI Proxy contract address
  dataAge?: number; // （seconds）
  // Supra metadata
  pairIndex?: number; // Supra DORA forindex
  // TWAP metadata
  poolAddress?: string;
  feeTier?: number;
  sqrtPriceX96?: string;
  tick?: number;
  twapInterval?: number;
  twapPrice?: number;
  spotPrice?: number;
  liquidity?: string;
  // Reflector metadata
  resolution?: number;
  contractVersion?: number;
}
