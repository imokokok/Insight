import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import type { BaseOracleClient } from '@/lib/oracles/base';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { getAllActiveFeedsByProvider } from '@/lib/oracles/utils/dynamicFeedResolver';
import { extractBaseSymbol } from '@/lib/oracles/utils/oracleDataUtils';
import { type OracleFeed } from '@/lib/supabase/queries';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { TTLCache } from '@/lib/utils/cache';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';
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

// Bound parallel upstream price fetches during reputation calculation. The
// cron fan-out (TOP_SYMBOLS × providers ≈ 90 calls) previously hit upstream
// rate limits, triggering exponential-backoff retries that extended load.
const REPUTATION_FETCH_CONCURRENCY = 6;

// Short-lived in-memory cache for the directory list. The table is small
// (11 providers) and recalculated at most hourly, so a 15s TTL absorbs burst
// traffic and the periodic client refetch without serving noticeably stale
// data. Writes (calculateAndStore / seedInitialReputations) invalidate it.
const REPUTATIONS_CACHE_TTL_MS = 15 * 1000;
const REPUTATIONS_CACHE_KEY = 'all';

// Fallback "test basket" used when the DB is unreachable or empty. These
// 9 symbols cover major crypto + stablecoins so reputation scoring can
// still produce a meaningful cross-provider comparison.
const FALLBACK_TOP_SYMBOLS = [
  'BTC',
  'ETH',
  'SOL',
  'BNB',
  'USDC',
  'USDT',
  'DAI',
  'XRP',
  'ADA',
] as const;

const TOP_SYMBOLS_TARGET_COUNT = 9;

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
  [OracleProvider.REDSTONE]: { type: 'api', latencyBaseline: 350 },
  [OracleProvider.SUPRA]: { type: 'api', latencyBaseline: 500 },
  [OracleProvider.SWITCHBOARD]: { type: 'api', latencyBaseline: 450 },
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

  /**
   * Load the active symbol set for every provider from the database.
   * Falls back to the hard-coded symbol list when a provider has no active
   * feeds so the reputation cron still works before the first feed sync.
   *
   * Backed by a single DB query via `getAllActiveFeedsByProvider` (5-min
   * cache) instead of one `getActiveSymbols(provider)` call per provider.
   */
  private async loadActiveSymbolsByProvider(): Promise<
    Partial<Record<OracleProvider, Set<string>>>
  > {
    const result: Partial<Record<OracleProvider, Set<string>>> = {};

    let feedsByProvider: Map<string, OracleFeed[]> | undefined;
    try {
      feedsByProvider = await getAllActiveFeedsByProvider();
    } catch (error) {
      logger.warn(
        'Failed to load active feeds by provider — using fallback symbols',
        error instanceof Error ? error : undefined
      );
    }

    for (const provider of Object.values(OracleProvider)) {
      const feeds = feedsByProvider?.get(provider);
      if (feeds && feeds.length > 0) {
        const symbols = new Set<string>();
        for (const feed of feeds) {
          symbols.add(extractBaseSymbol(feed.symbol).toUpperCase());
        }
        result[provider] = symbols;
        continue;
      }

      // Fallback to hard-coded constants only when the database is empty or
      // unreachable. This preserves the original behaviour while the DB is
      // being seeded.
      const fallbackSymbols = oracleSupportedSymbols[
        provider as keyof typeof oracleSupportedSymbols
      ] as readonly string[] | undefined;
      if (fallbackSymbols) {
        result[provider] = new Set(fallbackSymbols.map((s) => s.toUpperCase()));
      }
    }

    return result;
  }

  /**
   * Resolve the "test basket" of symbols for reputation scoring.
   *
   * Picks the symbols that are covered by the MOST providers, so each
   * fetch produces a meaningful cross-provider comparison. Ties are
   * broken alphabetically for deterministic output. Falls back to
   * FALLBACK_TOP_SYMBOLS when the DB is unreachable or empty.
   *
   * Backed by the 5-minute aggregate cache in dynamicFeedResolver, so
   * the typical cron tick pays no DB round-trip here.
   */
  private async resolveTopSymbols(): Promise<string[]> {
    const feedsByProvider = await getAllActiveFeedsByProvider();
    if (feedsByProvider.size === 0) return [...FALLBACK_TOP_SYMBOLS];

    const providerCountBySymbol = new Map<string, number>();
    for (const feeds of feedsByProvider.values()) {
      const seen = new Set<string>();
      for (const feed of feeds) {
        seen.add(extractBaseSymbol(feed.symbol).toUpperCase());
      }
      for (const sym of seen) {
        providerCountBySymbol.set(sym, (providerCountBySymbol.get(sym) ?? 0) + 1);
      }
    }

    const ranked = Array.from(providerCountBySymbol.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, TOP_SYMBOLS_TARGET_COUNT)
      .map(([sym]) => sym);

    return ranked.length > 0 ? ranked : [...FALLBACK_TOP_SYMBOLS];
  }

  async calculateAndStore(): Promise<{ total: number; success: number; failed: number }> {
    const supabase = createServiceRoleClient();
    const factory = getDefaultFactory();
    const now = Date.now();
    let total = 0;
    let success = 0;
    let failed = 0;

    const entries: ReputationHistoryEntry[] = [];
    const activeSymbolsByProvider = await this.loadActiveSymbolsByProvider();
    const topSymbols = await this.resolveTopSymbols();

    const results = await mapWithConcurrency(topSymbols, REPUTATION_FETCH_CONCURRENCY, (symbol) =>
      this.calculateSymbolEntries(factory, symbol, activeSymbolsByProvider)
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
    symbol: string,
    activeSymbolsByProvider?: Partial<Record<OracleProvider, Set<string>>>
  ): Promise<SymbolCalculationResult> {
    const providers = this.getProvidersForSymbol(symbol, activeSymbolsByProvider);
    const results = await mapWithConcurrency(providers, REPUTATION_FETCH_CONCURRENCY, (provider) =>
      this.fetchProviderResult(factory, provider, symbol)
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
      } catch (error) {
        // Previously this was a bare `catch {}` with only a generic message,
        // so consensus failures left entries with consensus_price=0 /
        // deviation_pct=0 (silently persisted) AND left no trace of WHY the
        // consensus calc failed. Log the actual error so it is diagnosable.
        logger.warn(`Failed to calculate consensus for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
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

  private resolveChainForSymbol(client: BaseOracleClient, symbol: string): Blockchain | undefined {
    // Prefer a chain-specific lookup when the client supports it.
    try {
      const chains = client.getSupportedChainsForSymbol(symbol);
      if (chains.length > 0) {
        return chains[0];
      }
    } catch {
      // Client does not implement chain-per-symbol resolution.
    }

    // Single-chain providers (e.g. WINkLink on TRON, Flare on Flare, Reflector on Stellar)
    // should always be tested on their native chain.
    if (client.supportedChains.length === 1) {
      return client.supportedChains[0];
    }

    return undefined;
  }

  private async fetchProviderResult(
    factory: ReturnType<typeof getDefaultFactory>,
    provider: OracleProvider,
    symbol: string
  ): Promise<ProviderFetchResult> {
    try {
      const startTime = Date.now();
      const client = factory.getClient(provider);
      const chain = this.resolveChainForSymbol(client, symbol);
      const price = await client.getPrice(symbol, chain);
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

    let result = await this.fetchReputationsFromDb();

    // Auto-seed placeholder rows for newly-integrated providers (e.g. a new
    // oracle was added to the OracleProvider enum) so the directory lists
    // every provider immediately, instead of waiting for the next
    // calculation cycle to happen to fetch a successful price for it.
    // seedInitialReputations is idempotent (ON CONFLICT DO NOTHING) and only
    // runs when a provider is missing — the empty-table first-run is left to
    // the route layer so it can also kick off the background calculation.
    const expectedCount = Object.values(OracleProvider).length;
    if (result.length > 0 && result.length < expectedCount) {
      await this.seedInitialReputations();
      result = await this.fetchReputationsFromDb();
    }

    this.reputationsCache.set(REPUTATIONS_CACHE_KEY, result, REPUTATIONS_CACHE_TTL_MS);
    return result;
  }

  private async fetchReputationsFromDb(): Promise<OracleReputation[]> {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('oracle_reputation')
      .select('*')
      .order('overall_score', { ascending: false });

    if (error) {
      logger.error('Failed to get reputations', error);
      return [];
    }

    return (
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
      })) ?? []
    );
  }

  async getReputation(provider: OracleProvider): Promise<OracleReputation | null> {
    // 先从缓存的全量列表中查找，避免单条 DB 查询
    const allReputations = await this.getReputations();
    const cached = allReputations.find((r) => r.provider === provider);
    if (cached) return cached;

    // 缓存未命中（极端情况），回退到单条查询
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

  private getProvidersForSymbol(
    symbol: string,
    activeSymbolsByProvider?: Partial<Record<OracleProvider, Set<string>>>
  ): OracleProvider[] {
    const providers = Object.values(OracleProvider);
    const upperSymbol = symbol.toUpperCase();

    return providers.filter((provider) => {
      const activeSymbols = activeSymbolsByProvider?.[provider];
      if (activeSymbols) {
        return activeSymbols.has(upperSymbol);
      }

      const key = provider as keyof typeof oracleSupportedSymbols;
      const supported = oracleSupportedSymbols[key] as readonly string[] | undefined;
      return supported?.includes(upperSymbol);
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
