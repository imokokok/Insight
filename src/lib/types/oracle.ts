export enum OracleProvider {
  CHAINLINK = 'chainlink',
  BAND_PROTOCOL = 'band-protocol',
  UMA = 'uma',
  PYTH_NETWORK = 'pyth-network',
  API3 = 'api3',
}

export enum Blockchain {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  POLYGON = 'polygon',
  SOLANA = 'solana',
  AVALANCHE = 'avalanche',
  FANTOM = 'fantom',
  CRONOS = 'cronos',
  JUNO = 'juno',
  COSMOS = 'cosmos',
  OSMOSIS = 'osmosis',
  BNB_CHAIN = 'bnb-chain',
  BASE = 'base',
  SCROLL = 'scroll',
  ZKSYNC = 'zksync',
  APTOS = 'aptos',
  SUI = 'sui',
  GNOSIS = 'gnosis',
  MANTLE = 'mantle',
  LINEA = 'linea',
  CELESTIA = 'celestia',
  INJECTIVE = 'injective',
  SEI = 'sei',
}

export const BINANCE = Blockchain.BNB_CHAIN;

export interface ConfidenceInterval {
  bid: number;
  ask: number;
  widthPercentage: number;
}

export interface PriceData {
  provider: OracleProvider;
  chain?: Blockchain;
  symbol: string;
  price: number;
  timestamp: number;
  decimals: number;
  confidence?: number;
  source?: string;
  change?: number;
  confidenceInterval?: ConfidenceInterval;
}

export interface OracleClient {
  getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  getHistoricalPrices(symbol: string, chain?: Blockchain, period?: number): Promise<PriceData[]>;
  name: OracleProvider;
  supportedChains: Blockchain[];
}

export interface OracleError {
  message: string;
  provider: OracleProvider;
  code?: string;
}

export type PublisherStatus = 'active' | 'inactive' | 'degraded';

export interface Publisher {
  id: string;
  name: string;
  reliabilityScore: number;
  latency: number;
  status: PublisherStatus;
  submissionCount: number;
  lastUpdate: number;
  accuracy?: number;
  priceDeviation?: number;
  submissionFrequency?: number;
}

export interface PublisherStats {
  publisherId: string;
  historicalAccuracy: number[];
  priceDeviations: number[];
  submissionFrequency: number;
  averageDeviation: number;
  trend: 'improving' | 'stable' | 'declining';
}
