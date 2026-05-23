import { calculateConsensusPrice } from '@/lib/analytics/consensusPrice';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { createServerClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type PriceData } from '@/types/oracle';

import { oracleSupportedSymbols } from '../constants/supportedSymbols';

const logger = createLogger('ReputationService');

const TOP_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'USDC', 'USDT', 'DAI', 'XAU', 'EUR'] as const;

interface ReputationHistoryEntry {
  provider: string;
  symbol: string;
  price: number;
  consensus_price: number;
  deviation_pct: number;
  latency_ms: number;
  confidence: number;
  is_success: boolean;
  error_message?: string;
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
  is_success: boolean;
  error_message: string | null;
  snapshot_time: string;
}

class ReputationService {
  async calculateAndStore(): Promise<{ total: number; success: number; failed: number }> {
    const supabase = createServerClient();
    const factory = getDefaultFactory();
    const now = Date.now();
    let total = 0;
    let success = 0;
    let failed = 0;

    const entries: ReputationHistoryEntry[] = [];

    for (const symbol of TOP_SYMBOLS) {
      const result = await this.calculateSymbolEntries(factory, symbol);
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
              await supabase.rpc('aggregate_oracle_reputation', {
                p_provider: provider,
                p_lookback_days: 7,
              });
            } catch (rpcError) {
              logger.warn(
                `Failed to aggregate reputation for ${provider}`,
                rpcError instanceof Error ? rpcError : undefined
              );
            }
          })
        );
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
        confidence: price.confidence,
      }));

      try {
        const consensus = calculateConsensusPrice(inputs, 'median', `${symbol}/USD`);
        const consensusPrice = consensus.price;

        if (consensusPrice > 0) {
          for (const entry of entries) {
            if (entry.is_success) {
              entry.consensus_price = consensusPrice;
              entry.deviation_pct = ((entry.price - consensusPrice) / consensusPrice) * 100;
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
      is_success: entry.is_success,
      error_message: entry.error_message || null,
      snapshot_time: snapshotTime,
    };
  }

  private async insertReputationHistory(
    supabase: ReturnType<typeof createServerClient>,
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
      const latencyMs = Date.now() - startTime;

      if (price && Number.isFinite(price.price) && price.price > 0) {
        return {
          entry: {
            provider,
            symbol,
            price: price.price,
            consensus_price: 0,
            deviation_pct: 0,
            latency_ms: latencyMs,
            confidence: price.confidence ?? 0,
            is_success: true,
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
          is_success: false,
          error_message: 'Price returned invalid value',
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

      return {
        entry: {
          provider,
          symbol,
          price: 0,
          consensus_price: 0,
          deviation_pct: 0,
          latency_ms: 0,
          confidence: 0,
          is_success: false,
          error_message: error instanceof Error ? error.message : String(error),
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
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('oracle_reputation')
      .select('*')
      .order('overall_score', { ascending: false });

    if (error) {
      logger.error('Failed to get reputations', error);
      return [];
    }

    return data.map((row: Record<string, unknown>) => ({
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
    }));
  }

  async getReputation(provider: OracleProvider): Promise<OracleReputation | null> {
    const supabase = createServerClient();

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
    const supabase = createServerClient();
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
    const supabase = createServerClient();
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
