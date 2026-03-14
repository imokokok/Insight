import { PriceData, OracleProvider, Blockchain, OracleError } from '@/lib/types/oracle';

export interface IOracleClient {
  readonly name: OracleProvider;
  readonly supportedChains: Blockchain[];
  getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  getHistoricalPrices(symbol: string, chain?: Blockchain, period?: number): Promise<PriceData[]>;
}

export interface IOracleClientFactory {
  getClient(provider: OracleProvider): IOracleClient;
  getAllClients(): Record<OracleProvider, IOracleClient>;
  hasClient(provider: OracleProvider): boolean;
  clearInstances(): void;
}

export interface IOracleClientConfig {
  useDatabase?: boolean;
  fallbackToMock?: boolean;
}

export interface IMockOracleClient extends IOracleClient {
  setMockPrice(symbol: string, price: PriceData): void;
  setMockHistoricalPrices(symbol: string, prices: PriceData[]): void;
  setMockError(symbol: string, error: OracleError): void;
  clearMocks(): void;
  getCallHistory(): MockCallHistory[];
}

export interface MockCallHistory {
  method: 'getPrice' | 'getHistoricalPrices';
  symbol: string;
  chain?: Blockchain;
  period?: number;
  timestamp: number;
}

export interface IOracleClientBuilder {
  withConfig(config: IOracleClientConfig): IOracleClientBuilder;
  withMockData(data: MockDataConfig): IOracleClientBuilder;
  build(): IOracleClient;
}

export interface MockDataConfig {
  prices?: Record<string, PriceData>;
  historicalPrices?: Record<string, PriceData[]>;
  errors?: Record<string, OracleError>;
  latency?: number;
}
