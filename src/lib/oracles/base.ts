import { PriceData, OracleProvider, OracleError, Blockchain } from '@/lib/types/oracle';
import {
  shouldUseDatabase,
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  OracleStorageConfig,
  configureStorage,
  getStorageConfig,
} from './storage';

export { shouldUseDatabase, configureStorage, getStorageConfig };
export type { OracleStorageConfig };

export const UNIFIED_BASE_PRICES: Record<string, number> = {
  BTC: 68000,
  ETH: 3500,
  SOL: 180,
  LINK: 18,
  BAND: 2.5,
  API3: 2.8,
  PYTH: 1.2,
  UMA: 8.5,
  USDC: 1,
  ATOM: 10,
  OSMO: 4,
  JUNO: 3,
  AVAX: 35,
  MATIC: 0.6,
  DOT: 7,
  UNI: 10,
  CRO: 0.08,
  FTM: 0.3,
  DAI: 1,
  WBTC: 68000,
  WETH: 3500,
};

export interface OracleClientConfig {
  useDatabase?: boolean;
  fallbackToMock?: boolean;
}

const DEFAULT_CLIENT_CONFIG: OracleClientConfig = {
  useDatabase: true,
  fallbackToMock: true,
};

export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  abstract getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  abstract getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]>;

  protected config: OracleClientConfig;

  constructor(config?: OracleClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
  }

  protected createError(message: string, code?: string): OracleError {
    return {
      message,
      provider: this.name,
      code,
    };
  }

  protected generateMockPrice(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    timestamp?: number
  ): PriceData {
    const chainVolatility: Record<Blockchain, number> = {
      [Blockchain.ETHEREUM]: 0.02,
      [Blockchain.ARBITRUM]: 0.018,
      [Blockchain.OPTIMISM]: 0.022,
      [Blockchain.POLYGON]: 0.025,
      [Blockchain.SOLANA]: 0.03,
      [Blockchain.AVALANCHE]: 0.028,
      [Blockchain.FANTOM]: 0.032,
      [Blockchain.CRONOS]: 0.035,
      [Blockchain.JUNO]: 0.025,
      [Blockchain.COSMOS]: 0.022,
      [Blockchain.OSMOSIS]: 0.028,
      [Blockchain.BNB_CHAIN]: 0.02,
      [Blockchain.BASE]: 0.022,
      [Blockchain.SCROLL]: 0.024,
      [Blockchain.ZKSYNC]: 0.026,
      [Blockchain.APTOS]: 0.03,
      [Blockchain.SUI]: 0.032,
      [Blockchain.GNOSIS]: 0.02,
      [Blockchain.MANTLE]: 0.023,
      [Blockchain.LINEA]: 0.024,
      [Blockchain.CELESTIA]: 0.028,
      [Blockchain.INJECTIVE]: 0.035,
      [Blockchain.SEI]: 0.04,
    };
    const volatility = chain ? chainVolatility[chain] : 0.02;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const price = basePrice * (1 + randomChange);

    return {
      provider: this.name,
      chain,
      symbol,
      price: Number(price.toFixed(4)),
      timestamp: timestamp || Date.now(),
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
    };
  }

  protected generateMockHistoricalPrices(
    symbol: string,
    basePrice: number,
    chain?: Blockchain,
    period: number = 24
  ): PriceData[] {
    const prices: PriceData[] = [];
    const now = Date.now();
    const interval = (period * 60 * 60 * 1000) / (period * 4);

    for (let i = 0; i < period * 4; i++) {
      const timestamp = now - i * interval;
      prices.push(this.generateMockPrice(symbol, basePrice, chain, timestamp));
    }

    return prices.reverse();
  }

  async fetchPriceWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    mockGenerator: () => PriceData
  ): Promise<PriceData> {
    if (this.config.useDatabase && shouldUseDatabase()) {
      const dbPrice = await getPriceFromDatabase(this.name, symbol, chain);
      if (dbPrice) {
        return dbPrice;
      }
    }

    const priceData = mockGenerator();

    if (this.config.useDatabase && shouldUseDatabase()) {
      await savePriceToDatabase(priceData);
    }

    return priceData;
  }

  async fetchHistoricalPricesWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    period: number,
    mockGenerator: () => PriceData[]
  ): Promise<PriceData[]> {
    if (this.config.useDatabase && shouldUseDatabase()) {
      const dbPrices = await getHistoricalPricesFromDatabase(this.name, symbol, chain, period);
      if (dbPrices && dbPrices.length > 0) {
        return dbPrices;
      }
    }

    const pricesData = mockGenerator();

    if (this.config.useDatabase && shouldUseDatabase()) {
      await savePricesToDatabase(pricesData);
    }

    return pricesData;
  }
}
