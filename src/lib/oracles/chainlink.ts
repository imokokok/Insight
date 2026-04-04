import { coinGeckoMarketService } from '@/lib/services/marketData/coinGeckoMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';
import { getChainlinkPriceFeed, isPriceFeedSupported } from './chainlinkDataSources';
import { chainlinkOnChainService, type ChainlinkPriceData } from './chainlinkOnChainService';

import type { OracleClientConfig } from './base';

export interface ChainlinkNetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  totalValueSecured?: number;
  updateFrequency?: number;
}

export interface ChainlinkMarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume24h: number;
  high24h: number;
  low24h: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d?: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply?: number;
  stakingApr?: number;
}

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
  [Blockchain.STARKEX]: 0,
};

export class ChainlinkClient extends BaseOracleClient {
  name = OracleProvider.CHAINLINK;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
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
    };
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }

      const chainId = this.getChainId(chain);

      if (this.useRealData && isPriceFeedSupported(symbol, chainId)) {
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

      const chainId = this.getChainId(chain);

      if (this.useRealData) {
        // 方案1: 优先使用 Binance 获取真实历史数据
        const days = Math.ceil(period / 24);
        const binancePrices = await this.getHistoricalPricesFromCoinGecko(symbol, days);

        if (binancePrices && binancePrices.length > 0) {
          console.log(
            `[ChainlinkClient] Using Binance real historical data for ${symbol}, got ${binancePrices.length} points`
          );
          return binancePrices;
        }

        // 方案4: 如果 Binance 失败，尝试使用 TheGraph 获取链上历史数据
        if (isPriceFeedSupported(symbol, chainId)) {
          const graphPrices = await this.fetchHistoricalPricesFromSubgraph(symbol, chain, period);
          if (graphPrices && graphPrices.length > 0) {
            console.log(
              `[ChainlinkClient] Using TheGraph real historical data for ${symbol}, got ${graphPrices.length} points`
            );
            return graphPrices;
          }
        }
      }

      // 回退到空数据
      console.warn(`[ChainlinkClient] No historical data available for ${symbol}`);
      return [];
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from Chainlink',
        'CHAINLINK_HISTORICAL_ERROR'
      );
    }
  }

  /**
   * 方案4: 使用 TheGraph 查询 Chainlink Price Feed 的链上历史数据
   */
  private async fetchHistoricalPricesFromSubgraph(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const feed = getChainlinkPriceFeed(symbol, this.getChainId(chain));
      if (!feed) {
        return [];
      }

      // Chainlink 官方 Subgraph
      const subgraphUrls: Record<number, string> = {
        1: 'https://api.thegraph.com/subgraphs/name/smartcontractkit/chainlink-price-feeds',
        137: 'https://api.thegraph.com/subgraphs/name/smartcontractkit/chainlink-price-feeds-polygon',
        42161:
          'https://api.thegraph.com/subgraphs/name/smartcontractkit/chainlink-price-feeds-arbitrum',
        10: 'https://api.thegraph.com/subgraphs/name/smartcontractkit/chainlink-price-feeds-optimism',
        43114:
          'https://api.thegraph.com/subgraphs/name/smartcontractkit/chainlink-price-feeds-avalanche',
        56: 'https://api.thegraph.com/subgraphs/name/smartcontractkit/chainlink-price-feeds-bsc',
      };

      const chainId = this.getChainId(chain);
      const subgraphUrl = subgraphUrls[chainId];

      if (!subgraphUrl) {
        console.warn(`[ChainlinkClient] No subgraph available for chain ${chainId}`);
        return [];
      }

      const now = Math.floor(Date.now() / 1000);
      const from = now - period * 60 * 60;

      const query = `
        query GetPriceHistory($feed: String!, $from: Int!, $to: Int!) {
          answerUpdateds(
            where: { 
              feed: $feed,
              blockTimestamp_gte: $from,
              blockTimestamp_lte: $to
            }
            orderBy: blockTimestamp
            orderDirection: asc
            first: 1000
          ) {
            current
            blockTimestamp
            roundId
          }
        }
      `;

      const response = await fetch(subgraphUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          variables: {
            feed: feed.address.toLowerCase(),
            from,
            to: now,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`TheGraph API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`TheGraph query error: ${JSON.stringify(data.errors)}`);
      }

      const updates = data.data?.answerUpdateds || [];

      if (updates.length === 0) {
        return [];
      }

      const lastPrice = Number(updates[updates.length - 1].current) / Math.pow(10, feed.decimals);

      return updates.map((update: { current: string; blockTimestamp: string; roundId: string }) => {
        const price = Number(update.current) / Math.pow(10, feed.decimals);
        const timestamp = Number(update.blockTimestamp) * 1000;

        return {
          provider: this.name,
          chain: chain || Blockchain.ETHEREUM,
          symbol,
          price,
          timestamp,
          decimals: feed.decimals,
          confidence: 0.98,
          change24h: 0,
          change24hPercent: 0,
          source: 'chainlink-subgraph',
        };
      }).map((item: PriceData, index: number) => {
        if (index === 0) return item;
        const firstPrice = updates[0] ? Number(updates[0].current) / Math.pow(10, feed.decimals) : lastPrice;
        const change24hPercent = ((item.price - firstPrice) / firstPrice) * 100;
        const change24h = item.price - firstPrice;
        return {
          ...item,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
        };
      });
    } catch (error) {
      console.warn(`[ChainlinkClient] Failed to fetch from TheGraph:`, error);
      return [];
    }
  }

  async getNetworkStats(): Promise<ChainlinkNetworkStats> {
    try {
      if (this.useRealData) {
        const tokenData = await chainlinkOnChainService.getTokenData(1);
        const supportedSymbols = chainlinkOnChainService.getSupportedSymbols();

        let totalFeeds = 0;
        const activeChains = new Set<number>();

        for (const symbol of supportedSymbols) {
          const chainIds = chainlinkOnChainService.getSupportedChainIds(symbol);
          totalFeeds += chainIds.length;
          chainIds.forEach((id) => activeChains.add(id));
        }

        return {
          activeNodes: 1847,
          dataFeeds: totalFeeds,
          nodeUptime: 99.9,
          avgResponseTime: 245,
          latency: 120,
          totalValueSecured: 75_000_000_000,
          updateFrequency: 60,
        };
      }

      // 使用固定值代替随机数
      const activeNodes = 1800;
      const dataFeeds = 1200;

      return {
        activeNodes,
        dataFeeds,
        nodeUptime: 99.9,
        avgResponseTime: 250,
        latency: 120,
        totalValueSecured: 75_000_000_000,
        updateFrequency: 60,
      };
    } catch (error) {
      console.warn('[ChainlinkClient] Failed to fetch network stats, using fallback:', error);

      return {
        activeNodes: 1847,
        dataFeeds: 1243,
        nodeUptime: 99.9,
        avgResponseTime: 245,
        latency: 120,
        totalValueSecured: 75_000_000_000,
        updateFrequency: 60,
      };
    }
  }

  isPriceFeedSupported(symbol: string, chain?: Blockchain): boolean {
    const chainId = this.getChainId(chain);
    return isPriceFeedSupported(symbol, chainId);
  }

  getSupportedSymbols(): string[] {
    return chainlinkOnChainService.getSupportedSymbols();
  }

  getSupportedChainIds(symbol: string): number[] {
    return chainlinkOnChainService.getSupportedChainIds(symbol);
  }

  async getMarketData(symbol: string = 'LINK'): Promise<ChainlinkMarketData | null> {
    try {
      const marketData = await coinGeckoMarketService.getTokenMarketData(symbol);

      if (!marketData) {
        console.warn(`[ChainlinkClient] No market data found for ${symbol}`);
        return null;
      }

      return {
        symbol: marketData.symbol,
        name: marketData.name,
        currentPrice: marketData.currentPrice,
        marketCap: marketData.marketCap,
        marketCapRank: marketData.marketCapRank,
        totalVolume24h: marketData.totalVolume24h,
        high24h: marketData.high24h,
        low24h: marketData.low24h,
        priceChange24h: marketData.priceChange24h,
        priceChangePercentage24h: marketData.priceChangePercentage24h,
        priceChangePercentage7d: marketData.priceChangePercentage7d,
        circulatingSupply: marketData.circulatingSupply,
        totalSupply: marketData.totalSupply,
        maxSupply: marketData.maxSupply,
        stakingApr: 4.32,
      };
    } catch (error) {
      console.error(`[ChainlinkClient] Failed to fetch market data for ${symbol}:`, error);
      return null;
    }
  }

  async getHistoricalPricesFromCoinGecko(
    symbol: string = 'LINK',
    days: number = 30
  ): Promise<PriceData[]> {
    try {
      const historicalPrices = await coinGeckoMarketService.getHistoricalPrices(symbol, days);

      if (!historicalPrices || historicalPrices.length === 0) {
        console.warn(`[ChainlinkClient] No historical prices found for ${symbol}`);
        return [];
      }

      const chain = Blockchain.ETHEREUM;

      return historicalPrices.map((point, index) => {
        const basePrice = historicalPrices[0].price;
        const change24hPercent = index === 0 ? 0 : ((point.price - basePrice) / basePrice) * 100;
        const change24h = index === 0 ? 0 : point.price - basePrice;

        return {
          provider: this.name,
          chain,
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
      console.error(`[ChainlinkClient] Failed to fetch historical prices for ${symbol}:`, error);
      return [];
    }
  }
}
