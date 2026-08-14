import { type SupabaseClient } from '@supabase/supabase-js';

import { createLogger, normalizeError } from '@/lib/utils/logger';
import { RequestQueue } from '@/lib/utils/requestQueue';
import { normalizeTimestamp } from '@/lib/utils/timestamp';
import { type UserProfile, type UserPreferences } from '@/types/analytics';
import { type OracleProvider, type Blockchain } from '@/types/oracle';
import type { OnChainVerification } from '@/types/oracle/price';

const logger = createLogger('supabase-queries');

// Concurrency raised from 5 → 15: this queue backs ALL DatabaseQueries
// methods (reads + writes). The previous value of 5 was overly conservative
// for Supabase pooler connections (free-tier pooler allows 200) and caused
// head-of-line blocking when many price reads/writes queued up behind a
// single slow query (e.g. the dashboard SSR fires 20 parallel reads).
// 15 is still well within Supabase connection limits and leaves headroom
// for concurrent API requests sharing the same serverless instance.
const queryQueue = new RequestQueue({
  maxConcurrency: 15,
  defaultTimeout: 30000,
});

export interface PriceRecord {
  id?: string;
  provider: string;
  symbol: string;
  chain?: string | null;
  price: number;
  timestamp: string;
  decimals?: number | null;
  confidence?: number | null;
  source?: string | null;
  verification?: OnChainVerification | null;
  ingestion_timestamp?: string | null;
  metadata_fallback?: boolean | null;
  failure_mode?: string | null;
  signal_vector?: Record<string, number> | null;
  created_at?: string;
  ttl?: string;
}

export interface PriceRecordInsert {
  provider: OracleProvider | string;
  symbol: string;
  chain?: Blockchain | string | null;
  price: number;
  timestamp: number | string;
  decimals?: number | null;
  confidence?: number | null;
  source?: string | null;
  verification?: OnChainVerification | null;
  ingestion_timestamp?: number | string | null;
  metadata_fallback?: boolean | null;
  failure_mode?: string | null;
  signal_vector?: Record<string, number> | null;
  ttl?: string;
}

interface PriceRecordsFilters {
  provider?: OracleProvider | string;
  symbol?: string;
  chain?: Blockchain | string | null;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface OracleFeed {
  id?: string;
  provider: string;
  symbol: string;
  chain_id: number;
  address: string;
  name: string;
  decimals: number;
  category: string;
  is_active: boolean;
  source: string;
  metadata: Record<string, unknown> | null;
  consecutive_failures?: number;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  // Lifecycle observability (migration 0025)
  deactivated_reason?: string | null;
  deactivated_at?: string | null;
  absent_discovery_runs?: number;
  last_discovery_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OracleFeedInsert {
  provider: string;
  symbol: string;
  chain_id: number;
  address: string;
  name: string;
  decimals: number;
  category: string;
  is_active?: boolean;
  source?: string;
  metadata?: Record<string, unknown> | null;
  // Optional lifecycle fields — set by the discover/upsert pass so a
  // rediscovered feed resets its absent counter and stamps last_discovery_at.
  deactivated_reason?: string | null;
  deactivated_at?: string | null;
  absent_discovery_runs?: number;
  last_discovery_at?: string | null;
}

export interface UserProfileUpdate {
  display_name?: string;
  preferences?: UserPreferences;
}

export class DatabaseQueries {
  constructor(private client: SupabaseClient) {}

  async savePriceRecord(record: PriceRecordInsert): Promise<PriceRecord | null> {
    return queryQueue.add(async () => {
      const timestamp = new Date(normalizeTimestamp(record.timestamp)).toISOString();
      const ingestionTimestamp = record.ingestion_timestamp
        ? new Date(normalizeTimestamp(record.ingestion_timestamp)).toISOString()
        : null;
      const ttlInterval = record.ttl || '1h';
      const ttl = this.calculateTtlTimestamp(ttlInterval);

      // price_records.price is DECIMAL(20, 8)
      const maxPrice = 999_999_999_999.99999999;
      if (!Number.isFinite(record.price) || record.price <= 0 || record.price > maxPrice) {
        logger.warn(
          `Skipping price record save: price ${record.price} out of DECIMAL(20,8) range`,
          {
            provider: record.provider,
            symbol: record.symbol,
            chain: record.chain,
            price: record.price,
          }
        );
        return null;
      }

      const { data, error } = await this.client
        .from('price_records')
        .insert({
          provider: record.provider,
          symbol: record.symbol,
          chain: record.chain || null,
          price: record.price,
          timestamp,
          confidence: record.confidence || null,
          source: record.source || null,
          verification: record.verification || null,
          ingestion_timestamp: ingestionTimestamp,
          metadata_fallback: record.metadata_fallback || null,
          failure_mode: record.failure_mode || null,
          signal_vector: record.signal_vector || null,
          ttl,
        })
        .select()
        .single();

      if (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : ((error as { message?: string }).message ?? JSON.stringify(error));
        logger.error('Failed to save price record', new Error(errorMessage));
        return null;
      }

      return data;
    });
  }

  async getLatestPrice(
    provider: OracleProvider | string,
    symbol: string,
    chain?: Blockchain | string | null
  ): Promise<PriceRecord | null> {
    return queryQueue.add(async () => {
      const now = new Date().toISOString();

      let query = this.client
        .from('price_records')
        .select('*')
        .eq('provider', provider)
        .eq('symbol', symbol)
        .gte('ttl', now)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (chain) {
        query = query.eq('chain', chain);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        logger.error('Failed to get latest price', normalizeError(error));
        return null;
      }

      return data;
    });
  }

  async getPriceRecords(filters: PriceRecordsFilters): Promise<PriceRecord[] | null> {
    return queryQueue.add(async () => {
      let query = this.client
        .from('price_records')
        .select('*')
        .order('timestamp', { ascending: false });

      if (filters.provider) {
        query = query.eq('provider', filters.provider);
      }

      if (filters.symbol) {
        query = query.eq('symbol', filters.symbol);
      }

      if (filters.chain) {
        query = query.eq('chain', filters.chain);
      }

      if (filters.startTime) {
        const startTimeStr = new Date(normalizeTimestamp(filters.startTime)).toISOString();
        query = query.gte('timestamp', startTimeStr);
      }

      if (filters.endTime) {
        const endTimeStr = new Date(normalizeTimestamp(filters.endTime)).toISOString();
        query = query.lte('timestamp', endTimeStr);
      }

      if (filters.offset && filters.limit) {
        query = query.range(filters.offset, filters.offset + filters.limit - 1);
      } else if (filters.offset) {
        query = query.range(filters.offset, filters.offset + 99);
      } else if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get price records', normalizeError(error));
        return null;
      }

      return data;
    });
  }

  private calculateTtlTimestamp(ttl: string): string {
    if (ttl.includes('T') || ttl.includes('-')) {
      return ttl;
    }

    const now = new Date();
    const match = ttl.match(/^(\d+)([smhd])$/);
    const multiplier: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      const ms = value * multiplier[unit];
      return new Date(now.getTime() + ms).toISOString();
    }

    // Fallback: 1 hour, mirroring the `h` unit above (single source of truth).
    return new Date(now.getTime() + multiplier.h).toISOString();
  }

  // ─── Oracle Feeds ──────────────────────────────────────────────────

  async getOracleFeeds(provider: string, chainId?: number): Promise<OracleFeed[]> {
    return queryQueue.add(async () => {
      let query = this.client.from('oracle_feeds').select('*').eq('is_active', true);

      if (provider) {
        query = query.eq('provider', provider);
      }

      if (chainId !== undefined) {
        query = query.eq('chain_id', chainId);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Failed to get oracle feeds', normalizeError(error));
        return [];
      }

      return data || [];
    });
  }

  async getOracleFeed(
    provider: string,
    symbol: string,
    chainId: number
  ): Promise<OracleFeed | null> {
    return queryQueue.add(async () => {
      const { data, error } = await this.client
        .from('oracle_feeds')
        .select('*')
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        logger.error('Failed to get oracle feed', normalizeError(error));
        return null;
      }

      return data;
    });
  }

  async upsertOracleFeeds(feeds: OracleFeedInsert[]): Promise<number> {
    if (feeds.length === 0) return 0;

    return queryQueue.add(async () => {
      const rows = feeds.map((f) => ({
        ...f,
        is_active: f.is_active ?? true,
        source: f.source || 'sync',
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await this.client
        .from('oracle_feeds')
        .upsert(rows, { onConflict: 'provider,symbol,chain_id' })
        .select();

      if (error) {
        logger.error('Failed to upsert oracle feeds', normalizeError(error));
        return 0;
      }

      return data?.length || 0;
    });
  }

  async deactivateOracleFeeds(provider: string, symbol: string, chainId: number): Promise<boolean> {
    return queryQueue.add(async () => {
      const now = new Date().toISOString();
      const { error } = await this.client
        .from('oracle_feeds')
        .update({
          is_active: false,
          updated_at: now,
          deactivated_reason: 'discover_pruned',
          deactivated_at: now,
        })
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId);

      if (error) {
        logger.error('Failed to deactivate oracle feed', normalizeError(error));
        return false;
      }

      return true;
    });
  }

  // ─── Feed Health ──────────────────────────────────────────────────

  /**
   * Update feed health after a price-fetch result.
   * On success: reset consecutive_failures to 0 and set last_success_at.
   * On failure: increment consecutive_failures and set last_failure_at.
   */
  async updateFeedHealth(
    provider: string,
    symbol: string,
    chainId: number,
    isSuccess: boolean
  ): Promise<void> {
    return queryQueue.add(async () => {
      const now = new Date().toISOString();
      const update = isSuccess
        ? { consecutive_failures: 0, last_success_at: now, updated_at: now }
        : {
            consecutive_failures: 1, // incremented via raw SQL below
            last_failure_at: now,
            updated_at: now,
          };

      if (isSuccess) {
        const { error } = await this.client
          .from('oracle_feeds')
          .update(update)
          .eq('provider', provider)
          .eq('symbol', symbol)
          .eq('chain_id', chainId);

        if (error) {
          logger.error('Failed to update feed health (success)', normalizeError(error));
        }
      } else {
        // Increment consecutive_failures atomically
        const { error } = await this.client.rpc('increment_feed_failures', {
          p_provider: provider,
          p_symbol: symbol,
          p_chain_id: chainId,
          p_failure_at: now,
        });

        if (error) {
          // Fallback: manually read-and-increment if the RPC is not deployed.
          logger.warn(
            'increment_feed_failures RPC not available, using read-and-increment fallback',
            error instanceof Error ? error : undefined
          );
          const { data: feed } = await this.client
            .from('oracle_feeds')
            .select('consecutive_failures')
            .eq('provider', provider)
            .eq('symbol', symbol)
            .eq('chain_id', chainId)
            .maybeSingle();

          const newCount = (feed?.consecutive_failures ?? 0) + 1;
          const { error: fallbackError } = await this.client
            .from('oracle_feeds')
            .update({
              consecutive_failures: newCount,
              last_failure_at: now,
              updated_at: now,
            })
            .eq('provider', provider)
            .eq('symbol', symbol)
            .eq('chain_id', chainId);

          if (fallbackError) {
            // Previously the fallback update ignored its own error, so a
            // failed read-and-increment silently lost the failure increment.
            logger.error(
              'Failed to update feed health (fallback)',
              fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError))
            );
          }
        }
      }
    });
  }

  /**
   * Batch update feed health for multiple feeds at once.
   * Uses a single RPC call instead of N+1 individual queries.
   */
  async batchUpdateFeedHealth(
    results: Array<{
      provider: string;
      symbol: string;
      chainId: number;
      isSuccess: boolean;
    }>
  ): Promise<{ updated: number }> {
    if (results.length === 0) return { updated: 0 };

    return queryQueue.add(async () => {
      const successes = results
        .filter((r) => r.isSuccess)
        .map(({ provider, symbol, chainId }) => ({ provider, symbol, chainId }));
      const failures = results
        .filter((r) => !r.isSuccess)
        .map(({ provider, symbol, chainId }) => ({ provider, symbol, chainId }));

      // Single RPC call processes all successes and failures in one round-trip
      const { data, error } = await this.client.rpc('batch_update_feed_health', {
        p_results: { successes, failures },
      });

      if (error) {
        // Fallback to individual updates if RPC is not available (e.g. migration not applied)
        return this.batchUpdateFeedHealthFallback(results);
      }

      return { updated: data ?? results.length };
    });
  }

  /**
   * Fallback for batchUpdateFeedHealth when the RPC function is not available.
   * Uses individual updates — slower but always works.
   */
  private async batchUpdateFeedHealthFallback(
    results: Array<{
      provider: string;
      symbol: string;
      chainId: number;
      isSuccess: boolean;
    }>
  ): Promise<{ updated: number }> {
    const now = new Date().toISOString();
    let updated = 0;

    const successes = results.filter((r) => r.isSuccess);
    const failures = results.filter((r) => !r.isSuccess);

    for (const { provider, symbol, chainId } of successes) {
      const { error } = await this.client
        .from('oracle_feeds')
        .update({
          consecutive_failures: 0,
          last_success_at: now,
          updated_at: now,
        })
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId);

      if (!error) updated++;
    }

    for (const { provider, symbol, chainId } of failures) {
      const { error } = await this.client.rpc('increment_feed_failures', {
        p_provider: provider,
        p_symbol: symbol,
        p_chain_id: chainId,
        p_failure_at: now,
      });

      if (!error) {
        updated++;
      } else {
        const { data: feed } = await this.client
          .from('oracle_feeds')
          .select('consecutive_failures')
          .eq('provider', provider)
          .eq('symbol', symbol)
          .eq('chain_id', chainId)
          .maybeSingle();

        const newCount = (feed?.consecutive_failures ?? 0) + 1;
        const { error: updateError } = await this.client
          .from('oracle_feeds')
          .update({
            consecutive_failures: newCount,
            last_failure_at: now,
            updated_at: now,
          })
          .eq('provider', provider)
          .eq('symbol', symbol)
          .eq('chain_id', chainId);

        if (!updateError) updated++;
      }
    }

    return { updated };
  }

  /**
   * Auto-deactivate feeds that have exceeded the consecutive failure threshold.
   * Returns the number of feeds deactivated.
   *
   * Uses a single UPDATE...RETURNING query instead of a separate SELECT +
   * UPDATE pair, halving the round-trips while preserving the same filter
   * and returning the exact affected-row count.
   */
  async deactivateStaleFeeds(threshold: number = 3): Promise<number> {
    return queryQueue.add(async () => {
      const now = new Date().toISOString();

      const { data: deactivated, error } = await this.client
        .from('oracle_feeds')
        .update({
          is_active: false,
          updated_at: now,
          deactivated_reason: 'health_failed',
          deactivated_at: now,
        })
        .eq('is_active', true)
        .gte('consecutive_failures', threshold)
        .select('provider, symbol, chain_id');

      if (error) {
        logger.error('Failed to deactivate stale feeds', normalizeError(error));
        return 0;
      }

      const count = deactivated?.length ?? 0;
      if (count > 0) {
        logger.info(`Auto-deactivated ${count} feeds with >= ${threshold} consecutive failures`);
      }
      return count;
    });
  }

  /**
   * Return feeds that are currently deactivated (is_active=false), optionally
   * limited to a single provider. Used by the reactivation pass to re-probe
   * feeds whose upstream may have recovered. Ordered by last_failure_at DESC
   * (nulls last) so feeds that failed most recently — most likely to be
   * transient outages that just resolved — are re-probed first.
   */
  async getInactiveFeeds(provider?: string, limit: number = 200): Promise<OracleFeed[]> {
    return queryQueue.add(async () => {
      let query = this.client
        .from('oracle_feeds')
        .select('*')
        .eq('is_active', false)
        .order('last_failure_at', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query;
      if (error) {
        logger.error('Failed to get inactive feeds', normalizeError(error));
        return [];
      }
      return (data as OracleFeed[]) ?? [];
    });
  }

  /**
   * Reactivate a previously-deactivated feed after a successful re-probe.
   * Resets consecutive_failures to 0 and stamps last_success_at so the feed
   * immediately rejoins the active set consumed by the daily report.
   *
   * The `is_active=false` guard makes this idempotent and prevents clobbering
   * an active feed's failure counter in a race with a concurrent health write.
   */
  async reactivateOracleFeed(provider: string, symbol: string, chainId: number): Promise<boolean> {
    return queryQueue.add(async () => {
      const now = new Date().toISOString();
      const { error } = await this.client
        .from('oracle_feeds')
        .update({
          is_active: true,
          consecutive_failures: 0,
          last_success_at: now,
          updated_at: now,
          // Clear deactivation audit fields and the absent counter so the feed
          // fully rejoins the active set (no stale "discover_pruned" reason).
          deactivated_reason: null,
          deactivated_at: null,
          absent_discovery_runs: 0,
        })
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId)
        .eq('is_active', false);

      if (error) {
        logger.error('Failed to reactivate feed', normalizeError(error));
        return false;
      }
      return true;
    });
  }

  /**
   * Mark a feed as confirmed present by discovery. Keeps it active and clears
   * its absent counter — used both when a feed re-verifies during the graceful
   * pruning reconciliation and when it is rediscovered normally. Without this
   * reset a transient discovery miss would accumulate and eventually trip the
   * ABSENT_PRUNE_THRESHOLD even for a healthy feed.
   */
  async recordFeedDiscovered(provider: string, symbol: string, chainId: number): Promise<boolean> {
    return queryQueue.add(async () => {
      const now = new Date().toISOString();
      const { error } = await this.client
        .from('oracle_feeds')
        .update({
          last_discovery_at: now,
          absent_discovery_runs: 0,
          updated_at: now,
        })
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId);

      if (error) {
        logger.error('Failed to record feed discovered', normalizeError(error));
        return false;
      }
      return true;
    });
  }

  /**
   * Increment a feed's absent_discovery_runs counter and return the new value.
   * Called when a feed is missing from discovery AND fails re-verification; the
   * discover pass deactivates the feed only once the count reaches
   * ABSENT_PRUNE_THRESHOLD. Read-modify-write is used (no dedicated RPC) since
   * reconciliation runs serially within a single cron job — races are not a
   * concern. Returns -1 on error.
   */
  async incrementAbsentDiscoveryRuns(
    provider: string,
    symbol: string,
    chainId: number
  ): Promise<number> {
    return queryQueue.add(async () => {
      const { data: current, error: readError } = await this.client
        .from('oracle_feeds')
        .select('absent_discovery_runs')
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId)
        .maybeSingle();

      if (readError) {
        logger.error(
          'Failed to read absent discovery runs',
          readError instanceof Error ? readError : new Error(String(readError))
        );
        return -1;
      }

      const next = (current?.absent_discovery_runs ?? 0) + 1;
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from('oracle_feeds')
        .update({ absent_discovery_runs: next, updated_at: now })
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId)
        .select('absent_discovery_runs')
        .single();

      if (error) {
        logger.error('Failed to increment absent discovery runs', normalizeError(error));
        return -1;
      }
      return (data as { absent_discovery_runs: number } | null)?.absent_discovery_runs ?? next;
    });
  }

  // ─── User Profiles ────────────────────────────────────────────────

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error('Failed to get user profile', normalizeError(error));
      }
      return null;
    }

    return data;
  }

  async upsertUserProfile(userId: string, data: UserProfileUpdate): Promise<UserProfile | null> {
    const { data: upserted, error } = await this.client
      .from('user_profiles')
      .upsert({
        id: userId,
        ...data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to upsert user profile', normalizeError(error));
      return null;
    }

    return upserted;
  }
}

export function createQueries(client: SupabaseClient): DatabaseQueries {
  return new DatabaseQueries(client);
}
