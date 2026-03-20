import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData, OracleError } from '@/types/oracle';
import {
  shouldUseDatabase,
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  configureStorage,
  getStorageConfig,
} from './storage';
import type { OracleStorageConfig } from './storage';
import { PriceFetchError, OracleClientError } from '@/lib/errors';

export { shouldUseDatabase, configureStorage, getStorageConfig };
export type { OracleStorageConfig };

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
      [Blockchain.TRON]: 0.025,
      [Blockchain.TON]: 0.028,
      [Blockchain.NEAR]: 0.026,
      [Blockchain.AURORA]: 0.024,
      [Blockchain.CELO]: 0.022,
    };
    const volatility =
      chain && chainVolatility[chain] !== undefined ? chainVolatility[chain] : 0.02;
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const price = basePrice * (1 + randomChange);

    // Generate 24h change data (-5% to +5% range)
    const change24hPercent = (Math.random() - 0.5) * 10;
    const change24h = basePrice * (change24hPercent / 100);

    return {
      provider: this.name,
      chain,
      symbol,
      price: Number(price.toFixed(4)),
      timestamp: timestamp || Date.now(),
      decimals: 8,
      confidence: 0.95 + Math.random() * 0.05,
      change24h: Number(change24h.toFixed(4)),
      change24hPercent: Number(change24hPercent.toFixed(2)),
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
    const dataPoints = period * 4;
    const interval = (period * 60 * 60 * 1000) / dataPoints;

    const chainVolatility: Record<Blockchain, number> = {
      [Blockchain.ETHEREUM]: 0.002,
      [Blockchain.ARBITRUM]: 0.0018,
      [Blockchain.OPTIMISM]: 0.0022,
      [Blockchain.POLYGON]: 0.0025,
      [Blockchain.SOLANA]: 0.003,
      [Blockchain.AVALANCHE]: 0.0028,
      [Blockchain.FANTOM]: 0.0032,
      [Blockchain.CRONOS]: 0.0035,
      [Blockchain.JUNO]: 0.0025,
      [Blockchain.COSMOS]: 0.0022,
      [Blockchain.OSMOSIS]: 0.0028,
      [Blockchain.BNB_CHAIN]: 0.002,
      [Blockchain.BASE]: 0.0022,
      [Blockchain.SCROLL]: 0.0024,
      [Blockchain.ZKSYNC]: 0.0026,
      [Blockchain.APTOS]: 0.003,
      [Blockchain.SUI]: 0.0032,
      [Blockchain.GNOSIS]: 0.002,
      [Blockchain.MANTLE]: 0.0023,
      [Blockchain.LINEA]: 0.0024,
      [Blockchain.CELESTIA]: 0.0028,
      [Blockchain.INJECTIVE]: 0.0035,
      [Blockchain.SEI]: 0.004,
      [Blockchain.TRON]: 0.0025,
      [Blockchain.TON]: 0.0028,
      [Blockchain.NEAR]: 0.0026,
      [Blockchain.AURORA]: 0.0024,
      [Blockchain.CELO]: 0.0022,
    };
    const volatility =
      chain && chainVolatility[chain] !== undefined ? chainVolatility[chain] : 0.002;

    // 随机选择趋势方向：-1 下跌, 0 震荡, 1 上涨
    const trendDirection = Math.random() > 0.6 ? 1 : Math.random() > 0.6 ? -1 : 0;
    const trendStrength = 0.0003 * trendDirection;

    // 使用随机游走模型生成价格序列
    let currentPrice = basePrice * (0.95 + Math.random() * 0.1);

    for (let i = 0; i < dataPoints; i++) {
      const timestamp = now - (dataPoints - 1 - i) * interval;

      // 随机游走：基于前一个价格计算新价格
      const randomWalk = (Math.random() - 0.5) * 2 * volatility;
      const trendComponent = trendStrength * (1 + Math.sin((i / dataPoints) * Math.PI) * 0.5);

      currentPrice = currentPrice * (1 + randomWalk + trendComponent);

      // 边界检查：确保价格在合理范围内（基准价格的 ±20%）
      const maxPrice = basePrice * 1.2;
      const minPrice = basePrice * 0.8;
      currentPrice = Math.max(minPrice, Math.min(maxPrice, currentPrice));

      // 计算 24h 变化（基于基准价格）
      const change24hPercent = ((currentPrice - basePrice) / basePrice) * 100;
      const change24h = currentPrice - basePrice;

      prices.push({
        provider: this.name,
        chain,
        symbol,
        price: Number(currentPrice.toFixed(4)),
        timestamp,
        decimals: 8,
        confidence: 0.95 + Math.random() * 0.05,
        change24h: Number(change24h.toFixed(4)),
        change24hPercent: Number(change24hPercent.toFixed(2)),
      });
    }

    return prices;
  }

  async fetchPriceWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    mockGenerator: () => PriceData
  ): Promise<PriceData> {
    try {
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
    } catch (error) {
      if (error instanceof PriceFetchError || error instanceof OracleClientError) {
        throw error;
      }
      throw new PriceFetchError(
        `Failed to fetch price for ${symbol} from ${this.name}`,
        {
          provider: this.name,
          symbol,
          chain,
          retryable: true,
        },
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async fetchHistoricalPricesWithDatabase(
    symbol: string,
    chain: Blockchain | undefined,
    period: number,
    mockGenerator: () => PriceData[]
  ): Promise<PriceData[]> {
    try {
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
    } catch (error) {
      if (error instanceof PriceFetchError || error instanceof OracleClientError) {
        throw error;
      }
      throw new PriceFetchError(
        `Failed to fetch historical prices for ${symbol} from ${this.name}`,
        {
          provider: this.name,
          symbol,
          chain,
          timestamp: Date.now(),
          retryable: true,
        },
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}
