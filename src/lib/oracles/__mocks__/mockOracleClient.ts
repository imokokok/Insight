import { PriceData, OracleProvider, Blockchain, OracleError } from '@/types/oracle';
import {
  IMockOracleClient,
  MockCallHistory,
  IOracleClientConfig,
  MockDataConfig,
} from '../interfaces';

export class MockOracleClient implements IMockOracleClient {
  readonly name: OracleProvider;
  readonly supportedChains: Blockchain[];

  private mockPrices: Map<string, PriceData> = new Map();
  private mockHistoricalPrices: Map<string, PriceData[]> = new Map();
  private mockErrors: Map<string, OracleError> = new Map();
  private callHistory: MockCallHistory[] = [];
  private config: IOracleClientConfig;
  private latency: number = 0;

  constructor(
    name: OracleProvider = 'chainlink' as OracleProvider,
    supportedChains: Blockchain[] = [Blockchain.ETHEREUM],
    config: IOracleClientConfig = {}
  ) {
    this.name = name;
    this.supportedChains = supportedChains;
    this.config = config;
  }

  setMockPrice(symbol: string, price: PriceData): void {
    this.mockPrices.set(symbol, price);
  }

  setMockHistoricalPrices(symbol: string, prices: PriceData[]): void {
    this.mockHistoricalPrices.set(symbol, prices);
  }

  setMockError(symbol: string, error: OracleError): void {
    this.mockErrors.set(symbol, error);
  }

  setLatency(ms: number): void {
    this.latency = ms;
  }

  clearMocks(): void {
    this.mockPrices.clear();
    this.mockHistoricalPrices.clear();
    this.mockErrors.clear();
    this.callHistory = [];
  }

  getCallHistory(): MockCallHistory[] {
    return [...this.callHistory];
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    this.callHistory.push({
      method: 'getPrice',
      symbol,
      chain,
      timestamp: Date.now(),
    });

    if (this.latency > 0) {
      await this.delay(this.latency);
    }

    const error = this.mockErrors.get(symbol);
    if (error) {
      throw error;
    }

    const price = this.mockPrices.get(symbol);
    if (price) {
      return { ...price, chain: chain ?? price.chain };
    }

    return this.createDefaultPrice(symbol, chain);
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    this.callHistory.push({
      method: 'getHistoricalPrices',
      symbol,
      chain,
      period,
      timestamp: Date.now(),
    });

    if (this.latency > 0) {
      await this.delay(this.latency);
    }

    const error = this.mockErrors.get(symbol);
    if (error) {
      throw error;
    }

    const prices = this.mockHistoricalPrices.get(symbol);
    if (prices) {
      return prices.map((p) => ({ ...p, chain: chain ?? p.chain }));
    }

    return this.createDefaultHistoricalPrices(symbol, period, chain);
  }

  private createDefaultPrice(symbol: string, chain?: Blockchain): PriceData {
    return {
      provider: this.name,
      symbol,
      price: 100,
      timestamp: Date.now(),
      decimals: 8,
      confidence: 0.95,
      chain,
      change24h: 0,
      change24hPercent: 0,
    };
  }

  private createDefaultHistoricalPrices(
    symbol: string,
    period: number,
    chain?: Blockchain
  ): PriceData[] {
    const prices: PriceData[] = [];
    const now = Date.now();
    const dataPoints = period * 60 * 1000;
    const interval = (period * 60 * 60 * 1000) / dataPoints;

    for (let i = 0; i < dataPoints; i++) {
      prices.push({
        provider: this.name,
        symbol,
        price: 100 + Math.random() * 10 - 5,
        timestamp: now - (dataPoints - 1 - i) * interval,
        decimals: 8,
        confidence: 0.95,
        chain,
        change24h: 0,
        change24hPercent: 0,
      });
    }

    return prices;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class MockOracleClientBuilder {
  private name: OracleProvider = 'chainlink' as OracleProvider;
  private supportedChains: Blockchain[] = [Blockchain.ETHEREUM];
  private config: IOracleClientConfig = {};
  private mockData: MockDataConfig = {};

  withName(name: OracleProvider): MockOracleClientBuilder {
    this.name = name;
    return this;
  }

  withSupportedChains(chains: Blockchain[]): MockOracleClientBuilder {
    this.supportedChains = chains;
    return this;
  }

  withConfig(config: IOracleClientConfig): MockOracleClientBuilder {
    this.config = { ...this.config, ...config };
    return this;
  }

  withMockData(data: MockDataConfig): MockOracleClientBuilder {
    this.mockData = { ...this.mockData, ...data };
    return this;
  }

  build(): IMockOracleClient {
    const client = new MockOracleClient(this.name, this.supportedChains, this.config);

    if (this.mockData.prices) {
      Object.entries(this.mockData.prices).forEach(([symbol, price]) => {
        client.setMockPrice(symbol, price);
      });
    }

    if (this.mockData.historicalPrices) {
      Object.entries(this.mockData.historicalPrices).forEach(([symbol, prices]) => {
        client.setMockHistoricalPrices(symbol, prices);
      });
    }

    if (this.mockData.errors) {
      Object.entries(this.mockData.errors).forEach(([symbol, error]) => {
        client.setMockError(symbol, error);
      });
    }

    if (this.mockData.latency) {
      client.setLatency(this.mockData.latency);
    }

    return client;
  }
}

export function createMockOracleClient(
  name?: OracleProvider,
  supportedChains?: Blockchain[]
): IMockOracleClient {
  return new MockOracleClient(name, supportedChains);
}

export function createMockOracleClientBuilder(): MockOracleClientBuilder {
  return new MockOracleClientBuilder();
}
