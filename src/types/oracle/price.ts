import type { OracleProvider, Blockchain } from './enums';

export interface ConfidenceInterval {
  bid: number;
  ask: number;
  widthPercentage: number;
}

type VerificationType = 'on-chain' | 'api';

export interface OnChainVerification {
  type?: VerificationType;
  contractAddress: string;
  chainId: number;
  explorerUrl: string;
  method: string;
  blockNumber?: number;
}

interface PriceDataBase {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface PriceData extends PriceDataBase {
  provider: OracleProvider;
  chain?: Blockchain;
  decimals?: number;
  confidence?: number;
  confidenceSource?: 'original' | 'estimated' | 'calculated';
  source?: string;
  change?: number;
  change24h?: number;
  change24hPercent?: number;
  confidenceInterval?: ConfidenceInterval;
  dataSource?: 'real' | 'mock' | 'api' | 'fallback';
  verification?: OnChainVerification;
  // Chainlink Feed metadata
  roundId?: string;
  answeredInRound?: string;
  version?: string;
  startedAt?: number;
  // Pyth metadata
  priceId?: string;
  exponent?: number;
  conf?: number;
  publishTime?: number;
  // API3 metadata
  dapiName?: string;
  proxyAddress?: string;
  dataAge?: number;
  // Supra metadata
  pairIndex?: number;
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
