import { bandRpcService } from '@/lib/oracles/bandProtocol/bandRpcService';
import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { bandProtocolSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import type { PriceData } from '@/types/oracle';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type {
  BandProtocolMarketData,
  ValidatorInfo,
  BandNetworkStats,
  CrossChainStats,
  CrossChainTrend,
  CrossChainComparison,
  TrendPeriod,
  HistoricalPricePoint,
  ValidatorHistory,
  HistoryPeriod,
  BandCrossChainSnapshot,
  CrossChainPriceComparison,
  ChainEvent,
  OracleScript,
  IBCConnection,
  IBCTransferStats,
  IBCTransferTrend,
  StakingInfo,
  StakingDistribution,
  StakingReward,
  RiskMetrics,
  RiskTrendData,
  RiskEvent,
  BandGovernanceProposal,
  ProposalStatus,
  GovernanceParams,
  DataSource,
  DataSourceListResponse,
  PriceFeed,
  IBCRelayer,
} from '@/types/oracle/band';
import { EventType } from '@/types/oracle/band';

export * from '@/types/oracle/band';

export interface BandProtocolClientConfig extends OracleClientConfig {
  rpcUrl?: string;
  restUrl?: string;
}

export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.COSMOS,
    Blockchain.OSMOSIS,
    Blockchain.JUNO,
  ];

  defaultUpdateIntervalMinutes = 30;

  constructor(config?: BandProtocolClientConfig) {
    super(config);
  }

  /**
   * 获取代币价格
   * 当查询 BAND 代币价格时，直接使用 Binance API
   * 其他代币返回默认数据
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();

    // 当查询自己预言机的代币 (BAND) 时，直接使用 Binance API
    if (upperSymbol === 'BAND') {
      try {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: OracleProvider.BAND_PROTOCOL,
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
        console.error(`[BandProtocolClient] Failed to fetch BAND price from Binance:`, error);
      }
    }

    // Return default price data instead of throwing error
    return {
      symbol: upperSymbol,
      price: 0,
      timestamp: Date.now(),
      provider: OracleProvider.BAND_PROTOCOL,
      confidence: 0,
    };
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    throw this.createError(
      'Band Protocol does not provide direct historical price feeds.',
      'BAND_PROTOCOL_NO_HISTORICAL_PRICES'
    );
  }

  async getAllDataSources(): Promise<DataSource[]> {
    try {
      return await bandRpcService.getDataSources();
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch data sources from Band Protocol',
        'BAND_PROTOCOL_DATA_SOURCES_ERROR'
      );
    }
  }

  async getValidators(limit?: number): Promise<ValidatorInfo[]> {
    try {
      return await bandRpcService.getValidators(limit);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch validators from Band Protocol',
        'BAND_PROTOCOL_VALIDATORS_ERROR'
      );
    }
  }

  async getNetworkStats(): Promise<BandNetworkStats> {
    try {
      return await bandRpcService.getNetworkStats();
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch network stats from Band Protocol',
        'BAND_PROTOCOL_NETWORK_STATS_ERROR'
      );
    }
  }

  async getCrossChainStats(): Promise<CrossChainStats> {
    // Return default empty data instead of throwing error
    return {
      totalRequests24h: 0,
      totalRequests7d: 0,
      totalRequests30d: 0,
      chains: [],
      timestamp: Date.now(),
    };
  }

  async getCrossChainTrend(period: TrendPeriod = '7d'): Promise<CrossChainTrend[]> {
    // Return empty array instead of throwing error
    return [];
  }

  async getHistoricalBandPrices(
    symbol: string,
    period: number = 24
  ): Promise<HistoricalPricePoint[]> {
    // Return empty array instead of throwing error
    return [];
  }

  async getValidatorHistory(
    validatorAddress: string,
    period: HistoryPeriod = 7
  ): Promise<ValidatorHistory[]> {
    throw this.createError(
      'Validator history not available from Band Protocol RPC.',
      'BAND_PROTOCOL_VALIDATOR_HISTORY_NOT_AVAILABLE'
    );
  }

  async getCrossChainSnapshots(): Promise<BandCrossChainSnapshot[]> {
    throw this.createError(
      'Cross-chain snapshots not available from Band Protocol RPC.',
      'BAND_PROTOCOL_CROSS_CHAIN_SNAPSHOTS_NOT_AVAILABLE'
    );
  }

  async getCrossChainPriceComparison(
    symbol: string,
    chains: string[]
  ): Promise<CrossChainPriceComparison> {
    throw this.createError(
      'Cross-chain price comparison not available from Band Protocol RPC.',
      'BAND_PROTOCOL_CROSS_CHAIN_PRICE_COMPARISON_NOT_AVAILABLE'
    );
  }

  async getCrossChainComparison(period: TrendPeriod = '7d'): Promise<CrossChainComparison> {
    // Return default data instead of throwing error
    return {
      period,
      currentTotal: 0,
      previousTotal: 0,
      changeAmount: 0,
      changePercent: 0,
      avgLatencyChange: 0,
      successRateChange: 0,
    };
  }

  async getChainEvents(limit: number = 100, eventType?: EventType): Promise<ChainEvent[]> {
    try {
      const type = eventType || EventType.DELEGATION;
      return await bandRpcService.getChainEvents(type, limit);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch chain events from Band Protocol',
        'BAND_PROTOCOL_CHAIN_EVENTS_ERROR'
      );
    }
  }

  async getOracleScripts(): Promise<OracleScript[]> {
    try {
      return await bandRpcService.getOracleScripts();
    } catch {
      // Return empty array instead of throwing error
      return [];
    }
  }

  async getOracleScriptById(id: number): Promise<OracleScript | null> {
    try {
      const scripts = await this.getOracleScripts();
      return scripts.find((s) => s.id === id) || null;
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch oracle script',
        'ORACLE_SCRIPT_ERROR'
      );
    }
  }

  async getIBCConnections(): Promise<IBCConnection[]> {
    throw this.createError(
      'IBC connections not available from Band Protocol RPC.',
      'BAND_PROTOCOL_IBC_CONNECTIONS_NOT_AVAILABLE'
    );
  }

  async getIBCTransferStats(): Promise<IBCTransferStats> {
    throw this.createError(
      'IBC transfer stats not available from Band Protocol RPC.',
      'BAND_PROTOCOL_IBC_TRANSFER_STATS_NOT_AVAILABLE'
    );
  }

  async getIBCTransferTrend(period: TrendPeriod = '7d'): Promise<IBCTransferTrend> {
    throw this.createError(
      'IBC transfer trend not available from Band Protocol RPC.',
      'BAND_PROTOCOL_IBC_TRANSFER_TREND_NOT_AVAILABLE'
    );
  }

  async getIBCTransferTrends(days: number): Promise<IBCTransferTrend[]> {
    throw this.createError(
      'IBC transfer trends not available from Band Protocol RPC.',
      'BAND_PROTOCOL_IBC_TRANSFER_TRENDS_NOT_AVAILABLE'
    );
  }

  async getStakingInfo(): Promise<StakingInfo> {
    try {
      return await bandRpcService.getStakingInfo();
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch staking info from Band Protocol',
        'BAND_PROTOCOL_STAKING_INFO_ERROR'
      );
    }
  }

  async getStakingDistribution(): Promise<StakingDistribution[]> {
    throw this.createError(
      'Staking distribution not available from Band Protocol RPC.',
      'BAND_PROTOCOL_STAKING_DISTRIBUTION_NOT_AVAILABLE'
    );
  }

  async getStakingRewards(validatorAddress: string): Promise<StakingReward[]> {
    throw this.createError(
      'Staking rewards not available from Band Protocol RPC.',
      'BAND_PROTOCOL_STAKING_REWARDS_NOT_AVAILABLE'
    );
  }

  async getRiskMetrics(): Promise<RiskMetrics> {
    throw this.createError(
      'Risk metrics not available from Band Protocol RPC.',
      'BAND_PROTOCOL_RISK_METRICS_NOT_AVAILABLE'
    );
  }

  async getRiskTrendData(period: TrendPeriod | number = 7): Promise<RiskTrendData[]> {
    throw this.createError(
      'Risk trend data not available from Band Protocol RPC.',
      'BAND_PROTOCOL_RISK_TREND_NOT_AVAILABLE'
    );
  }

  async getRiskEvents(limit: number = 100): Promise<RiskEvent[]> {
    throw this.createError(
      'Risk events not available from Band Protocol RPC.',
      'BAND_PROTOCOL_RISK_EVENTS_NOT_AVAILABLE'
    );
  }

  async getSecurityAuditEvents(): Promise<RiskEvent[]> {
    throw this.createError(
      'Security audit events not available from Band Protocol RPC.',
      'BAND_PROTOCOL_SECURITY_AUDIT_EVENTS_NOT_AVAILABLE'
    );
  }

  async getGovernanceProposals(status?: ProposalStatus): Promise<BandGovernanceProposal[]> {
    try {
      return await bandRpcService.getProposals(status);
    } catch {
      // Return empty array instead of throwing error
      return [];
    }
  }

  async getGovernanceParams(): Promise<GovernanceParams> {
    try {
      return await bandRpcService.getGovernanceParams();
    } catch (error) {
      throw this.createError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch governance params from Band Protocol',
        'BAND_PROTOCOL_GOVERNANCE_PARAMS_ERROR'
      );
    }
  }

  async getDataSources(page: number = 1, limit: number = 20): Promise<DataSourceListResponse> {
    try {
      const dataSources = await bandRpcService.getDataSources(limit);
      const start = (page - 1) * limit;
      const paginatedData = dataSources.slice(start, start + limit);
      return {
        dataSources: paginatedData,
        total: dataSources.length,
        hasMore: start + limit < dataSources.length,
      };
    } catch {
      // Return default empty data instead of throwing error
      return {
        dataSources: [],
        total: 0,
        hasMore: false,
      };
    }
  }

  // Alias for getDataSources to match hook interface
  async getDataSourceList(page: number = 1, limit: number = 20): Promise<DataSourceListResponse> {
    return this.getDataSources(page, limit);
  }

  async getDataSourceById(id: number): Promise<DataSource | null> {
    try {
      return await bandRpcService.getDataSourceById(id);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch data source from Band Protocol',
        'BAND_PROTOCOL_DATA_SOURCE_ERROR'
      );
    }
  }

  async getPriceFeeds(): Promise<PriceFeed[]> {
    throw this.createError(
      'Price feeds not available from Band Protocol RPC.',
      'BAND_PROTOCOL_PRICE_FEEDS_NOT_AVAILABLE'
    );
  }

  async getIBCRelayers(): Promise<IBCRelayer[]> {
    throw this.createError(
      'IBC relayers not available from Band Protocol RPC.',
      'BAND_PROTOCOL_IBC_RELAYERS_NOT_AVAILABLE'
    );
  }

  getSupportedSymbols(): string[] {
    return [...bandProtocolSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = bandProtocolSymbols.includes(
      symbol.toUpperCase() as (typeof bandProtocolSymbols)[number]
    );
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

  /**
   * 获取可用的快照日期（模拟数据）
   */
  getAvailableSnapshotDates(): string[] {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }

  /**
   * 计算质押奖励
   */
  calculateStakingReward(
    amount: number,
    durationDays: number
  ): { principal: number; duration: number; estimatedReward: number; apy: number } {
    // 模拟计算质押奖励
    const apy = 0.15; // 15% APY
    const durationYears = durationDays / 365;
    const estimatedReward = amount * apy * durationYears;
    return {
      principal: amount,
      duration: durationDays,
      estimatedReward,
      apy: apy * 100,
    };
  }
}
