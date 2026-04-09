import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { isPriceFeedSupported } from '@/lib/oracles/chainlinkDataSources';
import {
  chainlinkOnChainService,
  type ChainlinkPriceData,
} from '@/lib/oracles/chainlinkOnChainService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('ChainlinkClient');

const BLOCKCHAIN_TO_CHAIN_ID: Record<Blockchain, number> = {
  [Blockchain.ETHEREUM]: 1,
  [Blockchain.ARBITRUM]: 42161,
  [Blockchain.OPTIMISM]: 10,
  [Blockchain.POLYGON]: 137,
  [Blockchain.AVALANCHE]: 43114,
  [Blockchain.BNB_CHAIN]: 56,
  [Blockchain.BASE]: 8453,
  [Blockchain.SOLANA]: 0,
  [Blockchain.FANTOM]: 250,
  [Blockchain.CRONOS]: 25,
  [Blockchain.JUNO]: 0,
  [Blockchain.COSMOS]: 0,
  [Blockchain.OSMOSIS]: 0,
  [Blockchain.SCROLL]: 534352,
  [Blockchain.ZKSYNC]: 324,
  [Blockchain.APTOS]: 0,
  [Blockchain.SUI]: 0,
  [Blockchain.GNOSIS]: 100,
  [Blockchain.MANTLE]: 5000,
  [Blockchain.LINEA]: 59144,
  [Blockchain.CELESTIA]: 0,
  [Blockchain.INJECTIVE]: 0,
  [Blockchain.SEI]: 0,
  [Blockchain.TRON]: 0,
  [Blockchain.TON]: 0,
  [Blockchain.NEAR]: 0,
  [Blockchain.AURORA]: 1313161554,
  [Blockchain.CELO]: 42220,
  [Blockchain.STARKNET]: 0,
  [Blockchain.BLAST]: 81457,
  [Blockchain.CARDANO]: 0,
  [Blockchain.POLKADOT]: 0,
  [Blockchain.KAVA]: 2222,
  [Blockchain.MOONBEAM]: 1284,
  [Blockchain.MOONRIVER]: 1285,
  [Blockchain.METIS]: 1088,
  [Blockchain.STARKEX]: 0,
};

export class ChainlinkClient extends BaseOracleClient {
  name = OracleProvider.CHAINLINK;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    // Blockchain.AVALANCHE, // 暂时移除：ETH/USD Price Feed 地址配置错误
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 60;
  private useRealData: boolean;

  constructor(config?: OracleClientConfig & { useRealData?: boolean }) {
    super(config);
    this.useRealData = config?.useRealData ?? true;
  }

  private getChainId(chain?: Blockchain): number {
    if (!chain) return 1;
    return BLOCKCHAIN_TO_CHAIN_ID[chain] || 1;
  }

  private convertToPriceData(chainlinkData: ChainlinkPriceData, chain?: Blockchain): PriceData {
    return {
      provider: this.name,
      chain: chain || Blockchain.ETHEREUM,
      symbol: chainlinkData.symbol,
      price: chainlinkData.price,
      timestamp: chainlinkData.timestamp,
      decimals: chainlinkData.decimals,
      confidence: 0.98,
      change24h: 0,
      change24hPercent: 0,
      // Chainlink Feed 元数据
      source: chainlinkData.description || `Chainlink:${chainlinkData.symbol}`,
      // 扩展字段存储额外元数据
      ...(chainlinkData.roundId !== undefined && {
        roundId: chainlinkData.roundId.toString(),
        answeredInRound: chainlinkData.answeredInRound.toString(),
        version: chainlinkData.version?.toString(),
        startedAt: chainlinkData.startedAt,
      }),
    };
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }

      const chainId = this.getChainId(chain);

      if (this.useRealData && this.isPriceFeedSupported(symbol, chain)) {
        const realData = await chainlinkOnChainService.getPrice(symbol, chainId);
        return this.convertToPriceData(realData, chain);
      }

      throw this.createError(
        `No price data available for ${symbol}. Real data is not enabled or price feed is not supported on this chain.`,
        'REAL_DATA_NOT_AVAILABLE'
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Chainlink',
        'CHAINLINK_ERROR'
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

      // 使用 Binance API 获取历史价格数据
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
      const basePrice = historicalPrices[0].price;

      return historicalPrices.map((point, index) => {
        const change24hPercent = index === 0 ? 0 : ((point.price - basePrice) / basePrice) * 100;
        const change24h = index === 0 ? 0 : point.price - basePrice;

        return {
          provider: this.name,
          chain: targetChain,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.98,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
        };
      });
    } catch (error) {
      logger.error(
        `Failed to fetch historical prices for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from Chainlink',
        'CHAINLINK_HISTORICAL_ERROR'
      );
    }
  }

  private isPriceFeedSupported(symbol: string, chain?: Blockchain): boolean {
    const chainId = this.getChainId(chain);
    return isPriceFeedSupported(symbol, chainId);
  }

  getSupportedSymbols(): string[] {
    return chainlinkOnChainService.getSupportedSymbols();
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    return this.isPriceFeedSupported(symbol, chain);
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const chainIds = chainlinkOnChainService.getSupportedChainIds(symbol);
    const chains: Blockchain[] = [];

    for (const [blockchain, chainId] of Object.entries(BLOCKCHAIN_TO_CHAIN_ID)) {
      if (chainIds.includes(chainId)) {
        chains.push(blockchain as Blockchain);
      }
    }

    return chains;
  }
}
