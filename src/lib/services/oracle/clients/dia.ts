import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import {
  getDIADataService,
  type DIAStakingData,
  type DIANFTData,
  type DIANFTCollection,
  type DIAEcosystemIntegration,
  type DIANetworkStatsData,
} from '@/lib/oracles/diaDataService';
import { diaSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

export type StakingDetails = DIAStakingData;
export type NFTData = DIANFTData;
export type NFTCollection = DIANFTCollection;
export type EcosystemIntegration = DIAEcosystemIntegration;

export interface DataSourceTransparency {
  sourceId: string;
  name: string;
  type: 'exchange' | 'defi_protocol' | 'aggregator';
  credibilityScore: number;
  lastUpdate: number;
  status: 'active' | 'inactive' | 'suspended';
  verificationMethod: string;
  dataPoints: number;
}

interface CrossChainAsset {
  symbol: string;
  name: string;
  chains: Blockchain[];
  coverageStatus: 'full' | 'partial' | 'limited';
  updateFrequency: number;
  confidence: number;
}

export interface CrossChainCoverage {
  totalAssets: number;
  byChain: Partial<Record<Blockchain, number>>;
  byAssetType: {
    crypto: number;
    stablecoin: number;
    defi: number;
    nft: number;
  };
  assets: CrossChainAsset[];
}

export interface DataSourceVerification {
  verificationId: string;
  sourceId: string;
  timestamp: number;
  status: 'verified' | 'pending' | 'failed';
  method: string;
  details: string;
  validatorCount: number;
}

export interface DIANetworkStats extends DIANetworkStatsData {
  uptime?: number;
  dataQuality?: number;
  oracleDiversity?: number;
  avgConfidence?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface CustomFeed {
  feedId: string;
  name: string;
  description: string;
  assetType: 'crypto' | 'fiat' | 'commodity' | 'nft' | 'custom';
  chains: Blockchain[];
  updateFrequency: number;
  confidence: number;
  dataSources: string[];
  createdAt: number;
  status: 'active' | 'paused' | 'deprecated';
}

export class DIAClient extends BaseOracleClient {
  name = OracleProvider.DIA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 5;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  /**
   * 获取代币价格
   * 当查询 DIA 代币价格时，直接使用 Binance API
   * 其他代币使用 DIA 数据服务
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const upperSymbol = symbol.toUpperCase();

      if (upperSymbol === 'DIA') {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: OracleProvider.DIA,
            symbol: upperSymbol,
            price: marketData.currentPrice,
            timestamp: new Date(marketData.lastUpdated).getTime(),
            decimals: 8,
            confidence: 0.95,
            change24h: marketData.priceChange24h,
            change24hPercent: marketData.priceChangePercentage24h,
            chain: chain || Blockchain.ETHEREUM,
            source: 'binance-api',
          };
        }
        console.error(
          '[DIA] Failed to fetch DIA token price from Binance API: no market data returned'
        );
        throw this.createError(
          'Failed to fetch DIA token price from Binance API. Binance returned no market data.',
          'BINANCE_NO_DATA'
        );
      }

      const diaService = getDIADataService();

      const livePrice = await diaService.getAssetPrice(symbol, chain);

      if (livePrice) {
        return livePrice;
      }

      throw this.createError(
        `No price data available for ${symbol} from DIA. Real data source returned no results.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from DIA',
        'DIA_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const diaService = getDIADataService();

      const liveHistoricalPrices = await diaService.getHistoricalPrices(symbol, chain, period);

      if (liveHistoricalPrices && liveHistoricalPrices.length > 0) {
        return liveHistoricalPrices;
      }

      throw this.createError(
        `No historical price data available for ${symbol} from DIA. Real data source returned no results.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from DIA',
        'DIA_HISTORICAL_ERROR'
      );
    }
  }

  async getDataTransparency(): Promise<DataSourceTransparency[]> {
    // Fetch real exchanges data from DIA API
    const diaService = getDIADataService();
    const exchanges = await diaService.getExchanges();

    // Map real exchanges to data source transparency
    const exchangeSources: DataSourceTransparency[] = exchanges
      .filter((exchange) => exchange.ScraperActive)
      .slice(0, 10)
      .map((exchange, index) => ({
        sourceId: `dia-src-${String(index + 1).padStart(3, '0')}`,
        name: exchange.Name,
        type: exchange.Type === 'CEX' ? 'exchange' : 'defi_protocol',
        credibilityScore: exchange.Type === 'CEX' ? 95 : 92,
        lastUpdate: Date.now(),
        status: 'active' as const,
        verificationMethod: exchange.Type === 'CEX' ? 'API Verification' : 'On-chain Verification',
        dataPoints: exchange.Trades || Math.floor(exchange.Volume24h / 1000),
      }));

    // If no exchanges found, return empty array
    if (exchangeSources.length === 0) {
      console.warn('[DIA] No exchanges found from API');
      return [];
    }

    return exchangeSources;
  }

  async getCrossChainCoverage(): Promise<CrossChainCoverage> {
    // Fetch real digital assets data from DIA API
    const diaService = getDIADataService();

    try {
      // Get supported assets from DIA API
      const supportedSymbols = this.getSupportedSymbols();
      const assets: CrossChainAsset[] = [];
      const byChain: Partial<Record<Blockchain, number>> = {};
      const assetTypes = { crypto: 0, stablecoin: 0, defi: 0, nft: 0 };

      // Check each supported symbol for multi-chain availability
      for (const symbol of supportedSymbols.slice(0, 20)) {
        const supportedChains = this.getSupportedChainsForSymbol(symbol);
        if (supportedChains.length > 0) {
          // Try to get price to verify asset exists
          try {
            const priceData = await diaService.getAssetPrice(symbol);
            if (priceData) {
              const isStablecoin = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD'].includes(symbol);
              const isDeFi = ['UNI', 'AAVE', 'COMP', 'CRV', 'MKR', 'SNX'].includes(symbol);

              if (isStablecoin) {
                assetTypes.stablecoin++;
              } else if (isDeFi) {
                assetTypes.defi++;
              } else {
                assetTypes.crypto++;
              }

              assets.push({
                symbol,
                name: symbol,
                chains: supportedChains,
                coverageStatus: supportedChains.length >= 4 ? 'full' : supportedChains.length >= 2 ? 'partial' : 'limited',
                updateFrequency: 60,
                confidence: 0.95,
              });

              // Count assets per chain
              supportedChains.forEach(chain => {
                byChain[chain] = (byChain[chain] || 0) + 1;
              });
            }
          } catch {
            // Skip assets that can't be fetched
          }
        }
      }

      return {
        totalAssets: assets.length,
        byChain,
        byAssetType: assetTypes,
        assets: assets.slice(0, 10), // Return top 10 assets
      };
    } catch (error) {
      console.error('[DIA] Failed to fetch cross-chain coverage:', error);
      // Return empty data instead of hardcoded fallback
      return {
        totalAssets: 0,
        byChain: {},
        byAssetType: { crypto: 0, stablecoin: 0, defi: 0, nft: 0 },
        assets: [],
      };
    }
  }

  async getDataSourceVerification(): Promise<DataSourceVerification[]> {
    console.warn('[DIA] Data source verification not available from API');
    return [];
  }

  async getNetworkStats(): Promise<DIANetworkStats | null> {
    const diaService = getDIADataService();
    const realStats = await diaService.getNetworkStats();

    if (!realStats) {
      return null;
    }

    return {
      ...realStats,
      // Add risk view properties
      uptime: realStats.nodeUptime,
      dataQuality: 0.95,
      oracleDiversity: 0.88,
      avgConfidence: 0.96,
      riskLevel: 'low',
    };
  }

  async getStakingData(): Promise<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  } | null> {
    const data = await this.getStakingDetails();
    if (!data) {
      return null;
    }
    return {
      totalStaked: data.totalStaked,
      stakingApr: data.stakingApr,
      stakerCount: data.stakerCount,
      rewardPool: data.rewardPool,
    };
  }

  async getNFTData(): Promise<NFTData> {
    return getDIADataService().getNFTData();
  }

  async getStakingDetails(): Promise<StakingDetails | null> {
    return getDIADataService().getStakingData();
  }

  async getCustomFeeds(): Promise<CustomFeed[]> {
    console.warn('[DIA] Custom feeds not available from API');
    return [];
  }

  async getEcosystemIntegrations(): Promise<EcosystemIntegration[]> {
    return getDIADataService().getEcosystemIntegrations();
  }

  getSupportedSymbols(): string[] {
    return [...diaSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = diaSymbols.includes(symbol.toUpperCase() as (typeof diaSymbols)[number]);
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }
}
