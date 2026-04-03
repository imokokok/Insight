import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';
import {
  getChroniclePriceFeed,
  CHRONICLE_RPC_CONFIG,
  CHRONICLE_PRICE_FEEDS,
} from './chronicleDataSources';
import {
  getChroniclePriceFromChain,
  getChroniclePriceWithRead,
  getMakerDAOVaultData,
  formatChroniclePrice,
  formatMakerDAORay,
  formatMakerDAOWad,
  isRealDataAvailable,
} from './chronicleOnChainService';

import type { OracleClientConfig } from './base';

const logger = createLogger('ChronicleClient');

interface ChronicleCacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface ChronicleConfig {
  cacheTtlMs: number;
  priceVolatility: number;
  historicalVolatility: number;
  trendStrength: number;
  maxCacheSize: number;
  useRealData: boolean;
}

const DEFAULT_CHRONICLE_CONFIG: ChronicleConfig = {
  cacheTtlMs: 60000,
  priceVolatility: 0.015,
  historicalVolatility: 0.002,
  trendStrength: 0.0003,
  maxCacheSize: 100,
  useRealData: process.env.NEXT_PUBLIC_USE_REAL_CHRONICLE_DATA === 'true',
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function generateDeterministicPrice(
  basePrice: number,
  timestamp: number,
  volatility: number
): number {
  const timeSeed = Math.floor(timestamp / 60000);
  const random = seededRandom(timeSeed);
  const change = (random - 0.5) * 2 * volatility;
  return basePrice * (1 + change);
}

export interface ScuttlebuttData {
  securityLevel: 'high' | 'medium' | 'low';
  verificationStatus: 'verified' | 'pending' | 'failed';
  lastAuditTimestamp: number;
  auditScore: number;
  securityFeatures: string[];
  historicalEvents: {
    timestamp: number;
    event: string;
    severity: 'critical' | 'warning' | 'info';
    resolution?: string;
  }[];
}

export interface MakerDAOAsset {
  symbol: string;
  name: string;
  type: 'stablecoin' | 'crypto' | 'rwa';
  collateralRatio: number;
  debtCeiling: number;
  stabilityFee: number;
  liquidationPenalty: number;
  price: number;
  lastUpdate: number;
}

export interface MakerDAOIntegration {
  integrationVersion: string;
  supportedAssets: MakerDAOAsset[];
  totalValueLocked: number;
  daiSupply: number;
  systemSurplus: number;
  systemDebt: number;
  globalDebtCeiling: number;
}

export interface ChronicleValidator {
  id: string;
  address: string;
  name: string;
  reputationScore: number;
  uptime: number;
  responseTime: number;
  stakedAmount: number;
  validatedFeeds: number;
  joinDate: number;
  lastActivity: number;
  status: 'active' | 'inactive' | 'jailed';
}

export interface ValidatorNetwork {
  totalValidators: number;
  activeValidators: number;
  averageReputation: number;
  totalStaked: number;
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
  validators: ChronicleValidator[];
}

export interface ChronicleNetworkStats {
  activeValidators: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  latency: number;
  stakingTokenSymbol: string;
}

export interface VaultTypeData {
  id: string;
  type: string;
  name: string;
  totalVaults: number;
  collateralValue: number;
  debtValue: number;
  collateralRatio: number;
  stabilityFee: number;
  debtCeiling: number;
  debtCeilingUsed: number;
}

export interface AuctionData {
  id: string;
  vaultId: string;
  collateralType: string;
  collateralAmount: number;
  debtAmount: number;
  startTime: string;
  status: 'active' | 'completed' | 'pending';
  currentBid?: number;
}

export interface LiquidationHistory {
  id: string;
  vaultId: string;
  collateralType: string;
  liquidatedCollateral: number;
  debtCovered: number;
  liquidationDate: string;
  price: number;
}

export interface VaultData {
  totalVaults: number;
  totalCollateralValue: number;
  totalDebtValue: number;
  averageCollateralRatio: number;
  vaultTypes: VaultTypeData[];
  activeAuctions: AuctionData[];
  liquidationHistory: LiquidationHistory[];
}

export interface ScuttlebuttConsensus {
  votingProgress: number;
  consensusTime: number;
  validatorVotes: ValidatorVote[];
  forkStatus: 'none' | 'detected' | 'resolved';
}

export interface ValidatorVote {
  validatorId: string;
  voteWeight: number;
  voteStatus: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

export interface CrossChainPrice {
  chain: string;
  price: number;
  lastUpdate: number;
  deviation: number;
  latency: number;
}

export interface ChainPriceData {
  chain: string;
  chainId: number;
  price: number;
  deviation: number;
  lastUpdate: string;
  status: 'active' | 'warning' | 'inactive';
  confirmations: number;
}

export interface ChainLatencyData {
  chain: string;
  avgBlockTime: number;
  finalityTime: number;
  gasPrice: number;
  gasPriceUnit: string;
}

export interface BridgeStatusData {
  bridge: string;
  sourceChain: string;
  targetChain: string;
  totalTransactions: number;
  avgDelay: number;
  status: 'healthy' | 'degraded' | 'down';
  lastUpdate: string;
}

export interface CrossChainData {
  prices: ChainPriceData[];
  latencies: ChainLatencyData[];
  bridges: BridgeStatusData[];
  medianPrice: number;
}

export interface PriceDeviation {
  symbol: string;
  chroniclePrice: number;
  referencePrice: number;
  deviation: number;
  deviationPercent: number;
  source: string;
  timestamp: number;
}

export interface DeviationDataSource {
  name: string;
  price: number;
  deviation: number;
  deviationDirection: 'up' | 'down' | 'neutral';
  lastUpdate: string;
  reliability: number;
}

export interface DeviationHistoryPoint {
  timestamp: number;
  deviation: number;
}

export interface DeviationStats {
  maxDeviation: number;
  avgDeviation: number;
  minDeviation: number;
  deviationCount: number;
}

export interface DeviationFactor {
  name: string;
  impact: number;
  description: string;
  status: 'low' | 'medium' | 'high';
}

export interface DeviationImpact {
  affectedVaults: number;
  liquidationRisk: 'low' | 'medium' | 'high';
  arbitrageOpportunity: boolean;
  potentialProfit: number;
}

export interface DeviationData {
  chroniclePrice: number;
  sources: DeviationDataSource[];
  history: DeviationHistoryPoint[];
  stats: DeviationStats;
  factors: DeviationFactor[];
  impact: DeviationImpact;
}

export class ChronicleClient extends BaseOracleClient {
  name = OracleProvider.CHRONICLE;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.AVALANCHE,
  ];

  defaultUpdateIntervalMinutes = 5;

  private chronicleConfig: ChronicleConfig;
  private priceCache: Map<string, ChronicleCacheEntry<PriceData>> = new Map();
  private historicalCache: Map<string, ChronicleCacheEntry<PriceData[]>> = new Map();
  private networkStatsCache: ChronicleCacheEntry<ChronicleNetworkStats> | null = null;
  private stakingDataCache: ChronicleCacheEntry<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  }> | null = null;
  private realDataAvailable: boolean | null = null;

  constructor(config?: OracleClientConfig) {
    super(config);
    this.chronicleConfig = { ...DEFAULT_CHRONICLE_CONFIG };
    this.checkRealDataAvailability();
  }

  private async checkRealDataAvailability(): Promise<void> {
    if (this.realDataAvailable === null) {
      this.realDataAvailable = await isRealDataAvailable(1);
      logger.info(`Real Chronicle data available: ${this.realDataAvailable}`);
    }
  }

  private shouldUseRealData(): boolean {
    return this.chronicleConfig.useRealData && this.realDataAvailable === true;
  }

  private getCacheKey(symbol: string, chain?: Blockchain): string {
    return `${symbol}:${chain || 'default'}`;
  }

  private isCacheValid<T>(entry: ChronicleCacheEntry<T> | null | undefined): boolean {
    if (!entry) return false;
    return Date.now() < entry.expiresAt;
  }

  private evictOldestCacheEntry(): void {
    if (this.priceCache.size >= this.chronicleConfig.maxCacheSize) {
      let oldestKey = '';
      let oldestTimestamp = Infinity;
      this.priceCache.forEach((entry, key) => {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
          oldestKey = key;
        }
      });
      if (oldestKey) {
        this.priceCache.delete(oldestKey);
      }
    }
  }

  private generateRealisticPrice(
    _symbol: string,
    _basePrice: number,
    _chain?: Blockchain,
    _timestamp?: number
  ): PriceData {
    throw this.createError(
      'Mock price generation is disabled. Please use real data sources only.',
      'MOCK_DATA_DISABLED'
    );
  }

  private generateRealisticHistoricalPrices(
    _symbol: string,
    _basePrice: number,
    _chain?: Blockchain,
    _period: number = 24
  ): PriceData[] {
    throw this.createError(
      'Mock historical price generation is disabled. Please use real data sources only.',
      'MOCK_DATA_DISABLED'
    );
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      await this.checkRealDataAvailability();

      const cacheKey = this.getCacheKey(symbol, chain);
      const cachedEntry = this.priceCache.get(cacheKey);

      if (this.isCacheValid(cachedEntry)) {
        logger.debug(`Cache hit for ${symbol} price`);
        return cachedEntry!.data;
      }

      let result: PriceData;

      if (this.shouldUseRealData()) {
        // Use real on-chain data
        try {
          const chainId = chain ? this.getChainId(chain) : 1;
          const feed = getChroniclePriceFeed(symbol, chainId);

          if (feed) {
            const priceResult = await getChroniclePriceFromChain(symbol, chainId);
            const formattedPrice = formatChroniclePrice(priceResult.price, feed.decimals);

            result = {
              provider: this.name,
              chain,
              symbol,
              price: formattedPrice,
              timestamp: priceResult.timestamp,
              decimals: feed.decimals,
              confidence: priceResult.isValid ? 0.98 : 0.5,
              change24h: 0,
              change24hPercent: 0,
            };
            logger.info(`Fetched real Chronicle price for ${symbol}: ${formattedPrice}`);
          } else {
            throw new Error(`No price feed for ${symbol}`);
          }
        } catch (error) {
          logger.error(
            `Failed to fetch real data for ${symbol}:`,
            error as Error
          );
          throw this.createError(
            error instanceof Error ? error.message : 'Failed to fetch price from Chronicle',
            'CHRONICLE_ERROR'
          );
        }
      } else {
        throw this.createError(
          'Real data is not available. Cannot use mock data.',
          'CHRONICLE_REAL_DATA_UNAVAILABLE'
        );
      }

      this.evictOldestCacheEntry();
      this.priceCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.chronicleConfig.cacheTtlMs,
      });

      return result;
    } catch (error) {
      logger.error(`Failed to fetch price for ${symbol}:`, error as Error);
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Chronicle',
        'CHRONICLE_ERROR'
      );
    }
  }

  private getChainId(chain: Blockchain): number {
    const chainMap: Record<Blockchain, number> = {
      [Blockchain.ETHEREUM]: 1,
      [Blockchain.ARBITRUM]: 42161,
      [Blockchain.OPTIMISM]: 10,
      [Blockchain.POLYGON]: 137,
      [Blockchain.BASE]: 8453,
      [Blockchain.AVALANCHE]: 43114,
      [Blockchain.BSC]: 56,
      [Blockchain.FANTOM]: 250,
      [Blockchain.GNOSIS]: 100,
      [Blockchain.KAVA]: 2222,
      [Blockchain.METIS]: 1088,
      [Blockchain.MOONBEAM]: 1284,
      [Blockchain.MOONRIVER]: 1285,
      [Blockchain.OPTIMISM_GOERLI]: 420,
      [Blockchain.POLYGON_ZKEVM]: 1101,
      [Blockchain.SCROLL]: 534352,
      [Blockchain.SEPOLIA]: 11155111,
      [Blockchain.ZKSYNC]: 324,
    };
    return chainMap[chain] || 1;
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const cacheKey = `${this.getCacheKey(symbol, chain)}:${period}`;
      const cachedEntry = this.historicalCache.get(cacheKey);

      if (this.isCacheValid(cachedEntry)) {
        logger.debug(`Cache hit for ${symbol} historical prices`);
        return cachedEntry!.data;
      }

      // 优先使用 Binance 获取真实历史数据
      const { coinGeckoMarketService } = await import('@/lib/services/marketData/coinGeckoMarketService');
      const days = Math.ceil(period / 24);
      const binancePrices = await coinGeckoMarketService.getHistoricalPrices(symbol, days);

      if (binancePrices && binancePrices.length > 0) {
        logger.info(`[ChronicleClient] Using Binance real historical data for ${symbol}, got ${binancePrices.length} points`);
        const result = binancePrices.map((point) => ({
          provider: this.name,
          chain: chain || Blockchain.ETHEREUM,
          symbol,
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          source: 'binance-api',
        }));

        this.historicalCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.chronicleConfig.cacheTtlMs * 5,
        });

        return result;
      }

      // 回退到空数据
      logger.warn(`[ChronicleClient] No historical data available for ${symbol}`);
      return [];
    } catch (error) {
      logger.error(`[ChronicleClient] Failed to fetch historical prices for ${symbol}:`, error as Error);
      return [];
    }
  }

  clearCache(): void {
    this.priceCache.clear();
    this.historicalCache.clear();
    this.networkStatsCache = null;
    this.stakingDataCache = null;
    logger.info('Chronicle cache cleared');
  }

  configure(config: Partial<ChronicleConfig>): void {
    this.chronicleConfig = { ...this.chronicleConfig, ...config };
    logger.info('Chronicle config updated', config);
  }

  async getScuttlebuttSecurity(): Promise<ScuttlebuttData> {
    throw this.createError(
      'Failed to fetch scuttlebutt security data. No mock data available.',
      'CHRONICLE_SECURITY_ERROR'
    );
  }

  async getMakerDAOIntegration(): Promise<MakerDAOIntegration> {
    await this.checkRealDataAvailability();

    try {
      if (this.shouldUseRealData()) {
        const vaultData = await getMakerDAOVaultData(1);

        const supportedAssets: MakerDAOAsset[] = [];
        const ilkMapping: Record<
          string,
          { name: string; type: 'stablecoin' | 'crypto' | 'rwa'; penalty: number }
        > = {
          'ETH-A': { name: 'Ethereum-A', type: 'crypto', penalty: 13 },
          'ETH-B': { name: 'Ethereum-B', type: 'crypto', penalty: 13 },
          'ETH-C': { name: 'Ethereum-C', type: 'crypto', penalty: 13 },
          'WBTC-A': { name: 'Wrapped Bitcoin-A', type: 'crypto', penalty: 13 },
          'WBTC-B': { name: 'Wrapped Bitcoin-B', type: 'crypto', penalty: 13 },
          'USDC-A': { name: 'USD Coin-A', type: 'stablecoin', penalty: 0 },
          'USDC-B': { name: 'USD Coin-B', type: 'stablecoin', penalty: 0 },
          'USDT-A': { name: 'Tether USD-A', type: 'stablecoin', penalty: 0 },
          'LINK-A': { name: 'Chainlink-A', type: 'crypto', penalty: 13 },
          'STETH-A': { name: 'Lido Staked ETH-A', type: 'crypto', penalty: 13 },
          'WSTETH-A': { name: 'Wrapped Staked ETH-A', type: 'crypto', penalty: 13 },
          'RETH-A': { name: 'Rocket Pool ETH-A', type: 'crypto', penalty: 13 },
        };

        for (const [ilkType, ilkData] of Object.entries(vaultData.ilks)) {
          const ilkInfo = ilkMapping[ilkType] || { name: ilkType, type: 'crypto', penalty: 13 };
          const debt = formatMakerDAORay(ilkData.Art * ilkData.rate);
          const ceiling = formatMakerDAORay(ilkData.line);
          const spot = formatMakerDAORay(ilkData.spot);

          if (ceiling > 0) {
            supportedAssets.push({
              symbol: ilkType.split('-')[0],
              name: ilkInfo.name,
              type: ilkInfo.type,
              collateralRatio: spot > 0 ? Math.round((1 / spot) * 100) : 150,
              debtCeiling: ceiling,
              stabilityFee: 0,
              liquidationPenalty: ilkInfo.penalty,
              price: 0,
              lastUpdate: Date.now(),
            });
          }
        }

        return {
          integrationVersion: '2.5.1',
          supportedAssets,
          totalValueLocked: 0,
          daiSupply: formatMakerDAORay(vaultData.totalDebt),
          systemSurplus: formatMakerDAORay(vaultData.systemSurplus),
          systemDebt: formatMakerDAORay(vaultData.systemDebt),
          globalDebtCeiling: formatMakerDAORay(vaultData.globalDebtCeiling),
        };
      }
    } catch (error) {
      logger.error('Failed to fetch real MakerDAO data:', error as Error);
    }

    throw this.createError(
      'Failed to fetch MakerDAO integration data. No mock data available.',
      'CHRONICLE_MAKERDAO_ERROR'
    );
  }

  async getValidatorNetwork(): Promise<ValidatorNetwork> {
    throw this.createError(
      'Failed to fetch validator network data. No mock data available.',
      'CHRONICLE_VALIDATOR_ERROR'
    );
  }

  async getNetworkStats(): Promise<ChronicleNetworkStats> {
    throw this.createError(
      'Failed to fetch network stats. No mock data available.',
      'CHRONICLE_NETWORK_ERROR'
    );
  }

  async getStakingData(): Promise<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  }> {
    throw this.createError(
      'Failed to fetch staking data. No mock data available.',
      'CHRONICLE_STAKING_ERROR'
    );
  }

  async getVaultData(): Promise<VaultData> {
    await this.checkRealDataAvailability();

    try {
      if (this.shouldUseRealData()) {
        const vaultData = await getMakerDAOVaultData(1);

        const vaultTypes: VaultTypeData[] = [];
        const ilkMapping: Record<string, string> = {
          'ETH-A': 'Ethereum-A',
          'ETH-B': 'Ethereum-B',
          'ETH-C': 'Ethereum-C',
          'WBTC-A': 'Wrapped Bitcoin-A',
          'WBTC-B': 'Wrapped Bitcoin-B',
          'USDC-A': 'USD Coin-A',
          'USDC-B': 'USD Coin-B',
          'USDT-A': 'Tether USD-A',
          'LINK-A': 'Chainlink-A',
          'STETH-A': 'Lido Staked ETH-A',
          'WSTETH-A': 'Wrapped Staked ETH-A',
          'RETH-A': 'Rocket Pool ETH-A',
        };

        for (const [ilkType, ilkData] of Object.entries(vaultData.ilks)) {
          const debt = formatMakerDAORay(ilkData.Art * ilkData.rate);
          const ceiling = formatMakerDAORay(ilkData.line);
          const spot = formatMakerDAORay(ilkData.spot);

          if (ceiling > 0) {
            const collateralValue = debt * (spot > 0 ? 1 / spot : 0);
            const collateralRatio = spot > 0 ? Math.round((1 / spot) * 100) : 150;

            vaultTypes.push({
              id: ilkType,
              type: ilkType,
              name: ilkMapping[ilkType] || ilkType,
              totalVaults: 0, // 暂无数据
              collateralValue,
              debtValue: debt,
              collateralRatio,
              stabilityFee: 0,
              debtCeiling: ceiling,
              debtCeilingUsed: ceiling > 0 ? (debt / ceiling) * 100 : 0,
            });
          }
        }

        const totalCollateral = vaultTypes.reduce((sum, v) => sum + v.collateralValue, 0);
        const totalDebt = vaultTypes.reduce((sum, v) => sum + v.debtValue, 0);
        const avgCollateralRatio =
          vaultTypes.length > 0
            ? vaultTypes.reduce((sum, v) => sum + v.collateralRatio, 0) / vaultTypes.length
            : 0;

        return {
          totalVaults: vaultTypes.reduce((sum, v) => sum + v.totalVaults, 0),
          totalCollateralValue: totalCollateral,
          totalDebtValue: totalDebt,
          averageCollateralRatio: Number(avgCollateralRatio.toFixed(2)),
          vaultTypes,
          activeAuctions: [],
          liquidationHistory: [],
        };
      }
    } catch (error) {
      logger.error('Failed to fetch real vault data:', error as Error);
    }

    throw this.createError(
      'Failed to fetch vault data. No mock data available.',
      'CHRONICLE_VAULT_ERROR'
    );
  }

  async getScuttlebuttConsensus(): Promise<ScuttlebuttConsensus> {
    throw this.createError(
      'Failed to fetch scuttlebutt consensus data. No mock data available.',
      'CHRONICLE_SCUTTLEBUTT_ERROR'
    );
  }

  async getCrossChainPrices(_symbol: string): Promise<CrossChainData> {
    throw this.createError(
      'Failed to fetch cross-chain prices. No mock data available.',
      'CHRONICLE_CROSSCHAIN_ERROR'
    );
  }

  getSupportedSymbols(): string[] {
    return Object.keys(CHRONICLE_PRICE_FEEDS);
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const feeds = CHRONICLE_PRICE_FEEDS[symbol.toUpperCase()];
    if (!feeds) {
      return false;
    }
    if (chain !== undefined) {
      const chainId = this.getChainId(chain);
      return feeds[chainId] !== undefined;
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const feeds = CHRONICLE_PRICE_FEEDS[symbol.toUpperCase()];
    if (!feeds) {
      return [];
    }
    const chainIds = Object.keys(feeds).map(Number);
    const chainMap: Record<number, Blockchain> = {
      1: Blockchain.ETHEREUM,
      42161: Blockchain.ARBITRUM,
      10: Blockchain.OPTIMISM,
      137: Blockchain.POLYGON,
      8453: Blockchain.BASE,
      43114: Blockchain.AVALANCHE,
    };
    return chainIds.map((id) => chainMap[id]).filter(Boolean) as Blockchain[];
  }

  async getPriceDeviation(_symbol: string): Promise<DeviationData> {
    throw this.createError(
      'Failed to fetch price deviation data. No mock data available.',
      'CHRONICLE_DEVIATION_ERROR'
    );
  }
}
