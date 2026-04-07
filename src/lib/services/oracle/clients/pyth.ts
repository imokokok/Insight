import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { getPythDataService } from '@/lib/oracles/pythDataService';
import { pythSymbols, PYTH_AVAILABLE_PAIRS } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

const logger = createLogger('PythClient');

const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  PYTH: 0.1,
  USDC: 0.01,
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

  /**
   * 获取代币价格
   * 当查询 PYTH 代币价格时，直接使用 Binance API
   * 其他代币使用 Pyth 预言机 API
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }

      const upperSymbol = symbol.toUpperCase();

      // 当查询自己预言机的代币 (PYTH) 时，直接使用 Binance API
      if (upperSymbol === 'PYTH') {
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
      }

      const realPrice = await this.pythDataService.getLatestPrice(symbol);
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
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Pyth',
        'PYTH_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }

      const historicalPrices = await this.pythDataService.getHistoricalPrices(symbol, period, 60);

      if (historicalPrices.length >= 12) {
        logger.info(`Using Pyth real historical data for ${symbol}`, {
          symbol,
          points: historicalPrices.length,
        });
        return historicalPrices
          .map((price) => ({
            ...price,
            chain,
            source: 'pyth-hermes-api',
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
      }

      logger.info(`Pyth historical data insufficient for ${symbol}, trying CoinGecko...`, {
        symbol,
      });
      const { coinGeckoMarketService } =
        await import('@/lib/services/marketData/coinGeckoMarketService');
      const days = Math.ceil(period / 24);
      const coinGeckoPrices = await coinGeckoMarketService.getHistoricalPrices(symbol, days);

      if (coinGeckoPrices && coinGeckoPrices.length > 0) {
        logger.info(`Using CoinGecko historical data for ${symbol}`, {
          symbol,
          points: coinGeckoPrices.length,
        });
        return coinGeckoPrices.map((point) => ({
          provider: this.name,
          chain: chain || Blockchain.ETHEREUM,
          symbol,
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: 0,
          change24hPercent: 0,
          source: 'coingecko-api',
        }));
      }

      logger.warn(`No historical data available for ${symbol}`, { symbol });
      return [];
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
