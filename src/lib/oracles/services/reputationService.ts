import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { TTLCache } from '@/lib/utils/cache';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type PriceData } from '@/types/oracle';
import {
  FailureMode,
  classifyFailureMode,
  buildSignalVector,
  calculateConsistencySignal,
  type ConsensusContext,
  type OracleSignalVector,
} from '@/types/oracle/signals';

import { oracleSupportedSymbols } from '../constants/supportedSymbols';

const logger = createLogger('ReputationService');

// Short-lived in-memory cache for the directory list. The table is small
// (10 providers) and recalculated at most hourly, so a 15s TTL absorbs burst
// traffic and the periodic client refetch without serving noticeably stale
// data. Writes (calculateAndStore / seedInitialReputations) invalidate it.
const REPUTATIONS_CACHE_TTL_MS = 15 * 1000;
const REPUTATIONS_CACHE_KEY = 'all';

const TOP_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'USDC', 'USDT', 'DAI', 'XRP', 'ADA'] as const;

export const PROVIDER_TYPE_CONFIG: Record<
  OracleProvider,
  { type: 'onchain' | 'api' | 'hybrid'; latencyBaseline: number }
> = {
  [OracleProvider.FLARE]: { type: 'onchain', latencyBaseline: 1500 },
  [OracleProvider.CHAINLINK]: { type: 'onchain', latencyBaseline: 1200 },
  [OracleProvider.API3]: { type: 'onchain', latencyBaseline: 1000 },
  [OracleProvider.TWAP]: { type: 'onchain', latencyBaseline: 1400 },
  [OracleProvider.WINKLINK]: { type: 'onchain', latencyBaseline: 1200 },
  [OracleProvider.REFLECTOR]: { type: 'onchain', latencyBaseline: 1200 },
  [OracleProvider.DIA]: { type: 'api', latencyBaseline: 500 },
  [OracleProvider.PYTH]: { type: 'api', latencyBaseline: 400 },
  [OracleProvider.REDSTONE]: { type: 'api', latencyBaseline: 350 },
  [OracleProvider.SUPRA]: { type: 'api', latencyBaseline: 500 },
};

interface ReputationHistoryEntry {
  provider: string;
  symbol: string;
  price: number;
  consensus_price: number;
  deviation_pct: number;
  latency_ms: number;
  confidence: number;
  data_age_seconds: number;
  is_success: boolean;
  error_message?: string;
  failure_mode: FailureMode;
  signal_vector: OracleSignalVector | null;
  consensus_context: ConsensusContext | null;
}

export interface OracleReputation {
  provider: OracleProvider;
  overall_score: number;
  accuracy_score: number;
  uptime_percentage: number;
  avg_latency_ms: number;
  avg_deviation_pct: number;
  reliability_score: number;
  freshness_score: number;
  total_queries: number;
  failed_queries: number;
  supported_symbols_count: number;
  supported_chains_count: number;
  last_calculated_at: string | null;
}

export interface ReputationTrendPoint {
  snapshot_time: string;
  success_rate: number;
  avg_deviation_pct: number;
  avg_latency_ms: number;
  query_count: number;
}

interface ProviderFetchResult {
  entry?: ReputationHistoryEntry;
  price?: PriceData;
  total: number;
  success: number;
  failed: number;
}

interface SymbolCalculationResult {
  entries: ReputationHistoryEntry[];
  total: number;
  success: number;
  failed: number;
}

interface ReputationHistoryInsertRow {
  provider: string;
  symbol: string;
  price: number | null;
  consensus_price: number | null;
  deviation_pct: number | null;
  latency_ms: number | null;
  confidence: number | null;
  data_age_seconds: number | null;
  is_success: boolean;
  error_message: string | null;
  failure_mode: string;
  signal_vector: Record<string, number> | null;
  consensus_context: Record<string, unknown> | null;
  snapshot_time: string;
}

class ReputationService {
  // Module-level cache shared across requests within a server instance.
  private readonly reputationsCache = new TTLCache({ cleanupIntervalMs: 0 });

  async calculateAndStore(): Promise<{ total: number; success: number; failed: number }> {
    const supabase = createServiceRoleClient();
    const factory = getDefaultFactory();
    const now = Date.now();
    let total = 0;
    let success = 0;
    let failed = 0;

    const entries: ReputationHistoryEntry[] = [];

    const results = await Promise.all(
      TOP_SYMBOLS.map((symbol) => this.calculateSymbolEntries(factory, symbol))
    );
    for (const result of results) {
      entries.push(...result.entries);
      total += result.total;
      success += result.success;
      failed += result.failed;
    }

    if (entries.length > 0) {
      try {
        const snapshotTime = new Date(now).toISOString();
        const historyRows = entries.map((entry) => this.buildHistoryInsertRow(entry, snapshotTime));
        await this.insertReputationHistory(supabase, historyRows);

        const uniqueProviders = [...new Set(entries.map((e) => e.provider))];
        await Promise.all(
          uniqueProviders.map(async (provider) => {
            try {
              const providerConfig = PROVIDER_TYPE_CONFIG[provider as OracleProvider];
              await supabase.rpc('aggregate_oracle_reputation_v4', {
                p_provider: provider,
                p_lookback_days: 7,
                p_latency_baseline: providerConfig?.latencyBaseline ?? 1000,
                p_provider_type: providerConfig?.type ?? 'api',
              });
            } catch (rpcError) {
              logger.warn(
                `Failed to aggregate reputation for ${provider}`,
                rpcError instanceof Error ? rpcError : undefined
              );
            }
          })
        );

        // Fresh aggregations were persisted, drop the list cache so the next
        // read sees the new scores immediately.
        this.reputationsCache.delete(REPUTATIONS_CACHE_KEY);
      } catch (dbError) {
        logger.error(
          'Failed to persist reputation data',
          dbError instanceof Error ? dbError : undefined
        );
        throw dbError instanceof Error ? dbError : new Error(String(dbError));
      }
    }

    logger.info(
      `Reputation calculation complete: ${success} success, ${failed} failed out of ${total}`
    );
    return { total, success, failed };
  }

  private async calculateSymbolEntries(
    factory: ReturnType<typeof getDefaultFactory>,
    symbol: string
  ): Promise<SymbolCalculationResult> {
    const providers = this.getProvidersForSymbol(symbol);
    const results = await Promise.all(
      providers.map((provider) => this.fetchProviderResult(factory, provider, symbol))
    );

    const entries: ReputationHistoryEntry[] = [];
    const prices: PriceData[] = [];
    let total = 0;
    let success = 0;
    let failed = 0;

    for (const result of results) {
      total += result.total;
      success += result.success;
      failed += result.failed;
      if (result.entry) entries.push(result.entry);
      if (result.price) prices.push(result.price);
    }

    if (prices.length >= 2) {
      const inputs = prices.map((price) => ({
        provider: price.provider,
        price: price.price,
        timestamp: price.timestamp,
        ingestionTimestamp: price.ingestionTimestamp,
        confidence: price.confidence,
      }));

      try {
        const consensus = calculateConsensusPrice(inputs, 'weighted_median', `${symbol}/USD`);
        const consensusPrice = consensus.price;

        if (consensusPrice > 0) {
          for (const entry of entries) {
            if (entry.is_success) {
              entry.consensus_price = consensusPrice;
              entry.deviation_pct = ((entry.price - consensusPrice) / consensusPrice) * 100;

              entry.consensus_context = {
                consensusPrice,
                agreement: consensus.agreement,
                participantCount: consensus.participantCount,
                isOutlier: consensus.excludedProviders.includes(entry.provider),
                excludedProviders: consensus.excludedProviders,
                method: consensus.method,
                confidenceLevel: consensus.confidenceLevel,
              };

              if (entry.signal_vector) {
                entry.signal_vector.consistency = calculateConsistencySignal({
                  deviationFromConsensus: entry.deviation_pct,
                  isOutlier: entry.consensus_context.isOutlier,
                  agreement: consensus.agreement,
                });
              }
            }
          }
        }
      } catch {
        logger.warn(`Failed to calculate consensus for ${symbol}`);
      }
    }

    return { entries, total, success, failed };
  }

  private buildHistoryInsertRow(
    entry: ReputationHistoryEntry,
    snapshotTime: string
  ): ReputationHistoryInsertRow {
    const consensusPrice = this.toPositiveDecimal(entry.consensus_price, 8);
    const deviationPct =
      consensusPrice !== null ? this.toBoundedDecimal(entry.deviation_pct, 4, 9999.9999) : null;

    return {
      provider: entry.provider,
      symbol: entry.symbol,
      price: this.toPositiveDecimal(entry.price, 8),
      consensus_price: consensusPrice,
      deviation_pct: deviationPct,
      latency_ms: this.toNullableLatency(entry.latency_ms),
      confidence: this.toNormalizedConfidence(entry.confidence),
      data_age_seconds: entry.data_age_seconds,
      is_success: entry.is_success,
      error_message: entry.error_message || null,
      failure_mode: entry.failure_mode,
      signal_vector: entry.signal_vector ? { ...entry.signal_vector } : null,
      consensus_context: entry.consensus_context ? { ...entry.consensus_context } : null,
      snapshot_time: snapshotTime,
    };
  }

  private async insertReputationHistory(
    supabase: ReturnType<typeof createServiceRoleClient>,
    rows: ReputationHistoryInsertRow[]
  ): Promise<void> {
    const { error } = await supabase.from('reputation_history').insert(rows);

    if (!error) return;

    logger.error('Failed to insert reputation history in batch', error);

    let insertedCount = 0;
    let lastInsertError: Error | null = null;

    for (const row of rows) {
      const { error: rowError } = await supabase.from('reputation_history').insert(row);
      if (rowError) {
        lastInsertError = rowError;
        logger.warn(
          `Failed to insert reputation history row for ${row.provider}/${row.symbol}`,
          rowError
        );
        continue;
      }
      insertedCount++;
    }

    if (insertedCount === 0) {
      throw lastInsertError ?? new Error('Failed to insert any reputation history rows');
    }

    logger.warn(`Inserted ${insertedCount}/${rows.length} reputation history rows after fallback`);
  }

  private async fetchProviderResult(
    factory: ReturnType<typeof getDefaultFactory>,
    provider: OracleProvider,
    symbol: string
  ): Promise<ProviderFetchResult> {
    try {
      const startTime = Date.now();
      const client = factory.getClient(provider);
      const price = await client.getPrice(symbol);
      const rawLatencyMs = Date.now() - startTime;

      if (price && Number.isFinite(price.price) && price.price > 0) {
        const refTime = price.ingestionTimestamp ?? price.timestamp;
        const dataAgeSeconds = refTime ? Math.floor((Date.now() - refTime) / 1000) : 0;

        const adjustedConfidence = price.metadataFallback
          ? Math.min(price.confidence ?? 0, 0.5)
          : (price.confidence ?? 0);

        const providerConfig = PROVIDER_TYPE_CONFIG[provider];
        const isOnChain = providerConfig?.type === 'onchain' || providerConfig?.type === 'hybrid';

        const failureMode = classifyFailureMode({
          isAvailable: true,
          dataAgeSeconds,
          isMetadataFallback: price.metadataFallback ?? false,
          hasPartialData: !price.confidence,
          isInvalidResponse: false,
          isNetworkError: false,
          isTimeout: false,
          isRateLimited: false,
        });

        const signalVector = buildSignalVector({
          dataAgeSeconds,
          isOnChain,
          hasVerification: !!price.verification,
          providerUptime: 99,
          hasConfidence: price.confidence !== undefined,
          hasTimestamp: price.timestamp > 0,
          hasDecimals: price.decimals !== undefined,
          hasSource: !!price.source,
        });

        return {
          entry: {
            provider,
            symbol,
            price: price.price,
            consensus_price: 0,
            deviation_pct: 0,
            latency_ms: rawLatencyMs,
            confidence: adjustedConfidence,
            data_age_seconds: dataAgeSeconds,
            is_success: true,
            failure_mode: price.failureMode ?? failureMode,
            signal_vector: price.signalVector ?? signalVector,
            consensus_context: price.consensusContext ?? null,
          },
          price: { ...price, provider, symbol },
          total: 1,
          success: 1,
          failed: 0,
        };
      }

      return {
        entry: {
          provider,
          symbol,
          price: 0,
          consensus_price: 0,
          deviation_pct: 0,
          latency_ms: 0,
          confidence: 0,
          data_age_seconds: 0,
          is_success: false,
          error_message: 'Price returned invalid value',
          failure_mode: FailureMode.INVALID_RESPONSE,
          signal_vector: null,
          consensus_context: null,
        },
        total: 1,
        success: 0,
        failed: 1,
      };
    } catch (error) {
      logger.warn(
        `Failed to fetch ${provider} for ${symbol}`,
        error instanceof Error ? error : undefined
      );

      const errorMessage = error instanceof Error ? error.message : String(error);
      let failureMode = FailureMode.SOURCE_UNAVAILABLE;
      if (errorMessage.toLowerCase().includes('timeout')) {
        failureMode = FailureMode.TIMEOUT;
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        failureMode = FailureMode.RATE_LIMITED;
      } else if (errorMessage.toLowerCase().includes('network')) {
        failureMode = FailureMode.NETWORK_ERROR;
      }

      return {
        entry: {
          provider,
          symbol,
          price: 0,
          consensus_price: 0,
          deviation_pct: 0,
          latency_ms: 0,
          confidence: 0,
          data_age_seconds: 0,
          is_success: false,
          error_message: errorMessage,
          failure_mode: failureMode,
          signal_vector: null,
          consensus_context: null,
        },
        total: 1,
        success: 0,
        failed: 1,
      };
    }
  }

  private toPositiveDecimal(value: number, scale: number): number | null {
    if (!Number.isFinite(value) || value <= 0) return null;
    const rounded = Number(value.toFixed(scale));
    return Number.isFinite(rounded) ? rounded : null;
  }

  private toBoundedDecimal(value: number, scale: number, maxAbs: number): number | null {
    if (!Number.isFinite(value)) return null;
    const bounded = Math.max(-maxAbs, Math.min(maxAbs, value));
    const rounded = Number(bounded.toFixed(scale));
    return Number.isFinite(rounded) ? rounded : null;
  }

  private toNullableLatency(value: number): number | null {
    if (!Number.isFinite(value) || value <= 0) return null;
    const rounded = Math.round(value);
    return rounded > 0 ? rounded : null;
  }

  private toNormalizedConfidence(value: number): number | null {
    if (!Number.isFinite(value)) return null;
    const normalized = value > 1 && value <= 100 ? value / 100 : value;
    const bounded = Math.max(0, Math.min(0.9999, normalized));
    const rounded = Number(bounded.toFixed(4));
    return Number.isFinite(rounded) ? rounded : null;
  }

  async getReputations(): Promise<OracleReputation[]> {
    const cached = this.reputationsCache.get<OracleReputation[]>(REPUTATIONS_CACHE_KEY);
    if (cached) return cached;

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('oracle_reputation')
      .select('*')
      .order('overall_score', { ascending: false });

    if (error) {
      logger.error('Failed to get reputations', error);
      return [];
    }

    const result =
      data?.map((row: Record<string, unknown>) => ({
        provider: row.provider as OracleProvider,
        overall_score: Number(row.overall_score) || 0,
        accuracy_score: Number(row.accuracy_score) || 0,
        uptime_percentage: Number(row.uptime_percentage) || 100,
        avg_latency_ms: Number(row.avg_latency_ms) || 0,
        avg_deviation_pct: Number(row.avg_deviation_pct) || 0,
        reliability_score: Number(row.reliability_score) || 0,
        freshness_score: Number(row.freshness_score) || 0,
        total_queries: Number(row.total_queries) || 0,
        failed_queries: Number(row.failed_queries) || 0,
        supported_symbols_count: Number(row.supported_symbols_count) || 0,
        supported_chains_count: Number(row.supported_chains_count) || 0,
        last_calculated_at: row.last_calculated_at as string | null,
      })) ?? [];

    this.reputationsCache.set(REPUTATIONS_CACHE_KEY, result, REPUTATIONS_CACHE_TTL_MS);
    return result;
  }

  async getReputation(provider: OracleProvider): Promise<OracleReputation | null> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('oracle_reputation')
      .select('*')
      .eq('provider', provider)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error(`Failed to get reputation for ${provider}`, error);
      }
      return null;
    }

    return {
      provider: data.provider as OracleProvider,
      overall_score: Number(data.overall_score) || 0,
      accuracy_score: Number(data.accuracy_score) || 0,
      uptime_percentage: Number(data.uptime_percentage) || 100,
      avg_latency_ms: Number(data.avg_latency_ms) || 0,
      avg_deviation_pct: Number(data.avg_deviation_pct) || 0,
      reliability_score: Number(data.reliability_score) || 0,
      freshness_score: Number(data.freshness_score) || 0,
      total_queries: Number(data.total_queries) || 0,
      failed_queries: Number(data.failed_queries) || 0,
      supported_symbols_count: Number(data.supported_symbols_count) || 0,
      supported_chains_count: Number(data.supported_chains_count) || 0,
      last_calculated_at: data.last_calculated_at as string | null,
    };
  }

  async getReputationTrend(
    provider: OracleProvider,
    days: number = 30
  ): Promise<ReputationTrendPoint[]> {
    const supabase = createServiceRoleClient();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('reputation_history')
      .select('snapshot_time, is_success, deviation_pct, latency_ms')
      .eq('provider', provider)
      .gte('snapshot_time', since)
      .order('snapshot_time', { ascending: true });

    if (error) {
      logger.error(`Failed to get reputation trend for ${provider}`, error);
      return [];
    }

    const grouped = new Map<
      string,
      { success: number; total: number; deviations: number[]; latencies: number[]; count: number }
    >();

    for (const row of data) {
      const dateKey = new Date(row.snapshot_time).toISOString().split('T')[0];
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, { success: 0, total: 0, deviations: [], latencies: [], count: 0 });
      }
      const group = grouped.get(dateKey)!;
      group.total++;
      group.count++;
      if (row.is_success) {
        group.success++;
      }
      if (row.deviation_pct != null) {
        group.deviations.push(Math.abs(Number(row.deviation_pct)));
      }
      if (row.latency_ms != null) {
        group.latencies.push(Number(row.latency_ms));
      }
    }

    return Array.from(grouped.entries())
      .map(([dateKey, group]) => ({
        snapshot_time: dateKey,
        success_rate: group.total > 0 ? (group.success / group.total) * 100 : 0,
        avg_deviation_pct:
          group.deviations.length > 0
            ? group.deviations.reduce((a, b) => a + b, 0) / group.deviations.length
            : 0,
        avg_latency_ms:
          group.latencies.length > 0
            ? Math.round(group.latencies.reduce((a, b) => a + b, 0) / group.latencies.length)
            : 0,
        query_count: group.count,
      }))
      .sort((a, b) => a.snapshot_time.localeCompare(b.snapshot_time));
  }

  async seedInitialReputations(): Promise<void> {
    const supabase = createServiceRoleClient();
    const providers = Object.values(OracleProvider);

    for (const provider of providers) {
      const symbols = oracleSupportedSymbols[
        provider as keyof typeof oracleSupportedSymbols
      ] as readonly string[];
      const chains = this.getSupportedChainsCount(provider);

      const { error } = await supabase.from('oracle_reputation').upsert(
        {
          provider,
          overall_score: 75,
          accuracy_score: 80,
          uptime_percentage: 99,
          avg_latency_ms: 500,
          avg_deviation_pct: 0.5,
          reliability_score: 78,
          freshness_score: 82,
          total_queries: 100,
          failed_queries: 2,
          supported_symbols_count: symbols?.length ?? 0,
          supported_chains_count: chains,
          last_calculated_at: new Date().toISOString(),
        },
        { onConflict: 'provider', ignoreDuplicates: true }
      );

      if (error) {
        logger.warn(`Failed to seed reputation for ${provider}`, error);
      }
    }

    this.reputationsCache.delete(REPUTATIONS_CACHE_KEY);
    logger.info(`Seeded initial reputations for ${providers.length} providers`);
  }

  private getProvidersForSymbol(symbol: string): OracleProvider[] {
    const providers = Object.values(OracleProvider);
    return providers.filter((provider) => {
      const key = provider as keyof typeof oracleSupportedSymbols;
      const supported = oracleSupportedSymbols[key] as readonly string[] | undefined;
      return supported?.includes(symbol.toUpperCase());
    });
  }

  private getSupportedChainsCount(provider: OracleProvider): number {
    try {
      const factory = getDefaultFactory();
      const client = factory.getClient(provider);
      return client.supportedChains.length;
    } catch {
      return 0;
    }
  }
}

export const reputationService = new ReputationService();
