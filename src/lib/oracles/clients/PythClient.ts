import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { pythSymbols, PYTH_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import { getPythDataService } from '@/lib/oracles/services/pythDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain, OracleError } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

const logger = createLogger('PythClient');

const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  AVAX: 0.05,
  LINK: 0.04,
  MATIC: 0.06,
  BNB: 0.04,
  ARB: 0.06,
  OP: 0.06,
  PYTH: 0.1,
  DOT: 0.07,
  UNI: 0.05,
  ATOM: 0.07,
  USDC: 0.01,
  USDT: 0.01,
  DAI: 0.01,
};

export class PythClient extends BaseOracleClient {
  name = OracleProvider.PYTH;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.SOLANA,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.APTOS,
    Blockchain.SUI,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 1;
  private pythDataService = getPythDataService();

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const baseSpread = SPREAD_PERCENTAGES[symbol?.toUpperCase()] || 0.1;

    let priceAdjustedSpread = baseSpread;
    if (price > 10000) {
      priceAdjustedSpread = baseSpread * 0.5;
    } else if (price > 1000) {
      priceAdjustedSpread = baseSpread * 0.7;
    } else if (price > 100) {
      priceAdjustedSpread = baseSpread * 0.85;
    }

    const halfSpread = price * (priceAdjustedSpread / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(priceAdjustedSpread.toFixed(4)),
    };
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    if (options?.signal?.aborted) {
      throw this.createError('Request was aborted', 'NETWORK_ERROR', { retryable: false });
    }

    const upperSymbol = symbol.toUpperCase();

    if (upperSymbol === 'PYTH') {
      try {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: this.name,
            symbol: upperSymbol,
            price: marketData.currentPrice,
            timestamp: new Date(marketData.lastUpdated).getTime(),
            decimals: 8,
            confidence: 0.95,
            change24h: marketData.priceChange24h,
            change24hPercent: marketData.priceChangePercentage24h,
            chain,
            source: 'binance-api',
          };
        }
      } catch (error) {
        if (error instanceof OracleError) throw error;
        throw this.createError(
          error instanceof Error ? error.message : 'Failed to fetch PYTH price from Binance',
          'PYTH_ERROR'
        );
      }
    }

    try {
      const realPrice = await this.pythDataService.getLatestPrice(symbol, options?.signal);
      if (realPrice) {
        if (!realPrice.confidenceInterval) {
          realPrice.confidenceInterval = this.generateConfidenceInterval(realPrice.price, symbol);
        }
        return {
          ...realPrice,
          chain,
          source: 'pyth-hermes-api',
        };
      }

      throw this.createError(
        `No price data available for ${symbol} from Pyth. Real data source returned no results.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      if (error instanceof OracleError) throw error;
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Pyth',
        'PYTH_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    if (options?.signal?.aborted) {
      return [];
    }

    try {
      const historicalPrices = await binanceMarketService.getHistoricalPricesByHours(
        symbol,
        period
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        logger.warn(`No historical data available for ${symbol}`, { symbol });
        return [];
      }

      logger.info(`Using Binance historical data for ${symbol}`, {
        symbol,
        points: historicalPrices.length,
        period,
      });

      const targetChain = chain || Blockchain.ETHEREUM;
      const latestPrice = historicalPrices[historicalPrices.length - 1].price;

      return historicalPrices.map((point) => {
        const change24h = latestPrice - point.price;
        const change24hPercent =
          point.price > 0 ? ((latestPrice - point.price) / point.price) * 100 : 0;

        return {
          provider: this.name,
          chain: targetChain,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          source: 'binance-api',
        };
      });
    } catch (error) {
      logger.error(
        `Failed to fetch historical prices for ${symbol}`,
        error instanceof Error ? error : new Error(String(error)),
        { symbol }
      );
      return [];
    }
  }

  getSupportedSymbols(): string[] {
    return [...pythSymbols];
  }

  /**
   * 获取指定链支持的所有币种
   * @param chain - 区块链
   * @returns 该链支持的币种列表
   */
  getSupportedSymbolsForChain(chain: Blockchain): string[] {
    const chainKey = chain.toLowerCase();
    return PYTH_AVAILABLE_PAIRS[chainKey] || [];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();

    if (chain !== undefined) {
      const chainKey = chain.toLowerCase();
      const chainSymbols = PYTH_AVAILABLE_PAIRS[chainKey];
      if (!chainSymbols) return false;
      return chainSymbols.includes(upperSymbol);
    }

    // 如果没有指定链，检查该币种是否在任何链上支持
    return Object.values(PYTH_AVAILABLE_PAIRS).some((symbols) => symbols.includes(upperSymbol));
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const upperSymbol = symbol.toUpperCase();
    const supportedChains: Blockchain[] = [];

    for (const [chain, symbols] of Object.entries(PYTH_AVAILABLE_PAIRS)) {
      if (symbols.includes(upperSymbol)) {
        // 将字符串链名转换为Blockchain枚举
        const blockchain = this.supportedChains.find(
          (c) => c.toLowerCase() === chain.toLowerCase()
        );
        if (blockchain) {
          supportedChains.push(blockchain);
        }
      }
    }

    return supportedChains;
  }
}
