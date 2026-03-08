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
