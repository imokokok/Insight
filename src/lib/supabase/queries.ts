import { type SupabaseClient } from '@supabase/supabase-js';

import { createLogger } from '@/lib/utils/logger';
import { RequestQueue } from '@/lib/utils/requestQueue';
import { normalizeTimestamp } from '@/lib/utils/timestamp';
import { type UserProfile, type UserPreferences } from '@/types/analytics';
import { type OracleProvider, type Blockchain } from '@/types/oracle';
import type { OnChainVerification } from '@/types/oracle/price';

const logger = createLogger('supabase-queries');

const queryQueue = new RequestQueue({
  maxConcurrency: 5,
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
  decimals?: number;
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
        logger.error(
          'Failed to get latest price',
          error instanceof Error ? error : new Error(String(error))
        );
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
        logger.error(
          'Failed to get price records',
          error instanceof Error ? error : new Error(String(error))
        );
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

    if (match) {
      const value = parseInt(match[1], 10);
      const unit = match[2];
      const multiplier: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
      };
      const ms = value * multiplier[unit];
      return new Date(now.getTime() + ms).toISOString();
    }

    return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
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
        logger.error(
          'Failed to get oracle feeds',
          error instanceof Error ? error : new Error(String(error))
        );
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
        logger.error(
          'Failed to get oracle feed',
          error instanceof Error ? error : new Error(String(error))
        );
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
        logger.error(
          'Failed to upsert oracle feeds',
          error instanceof Error ? error : new Error(String(error))
        );
        return 0;
      }

      return data?.length || 0;
    });
  }

  async deactivateOracleFeeds(provider: string, symbol: string, chainId: number): Promise<boolean> {
    return queryQueue.add(async () => {
      const { error } = await this.client
        .from('oracle_feeds')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('provider', provider)
        .eq('symbol', symbol)
        .eq('chain_id', chainId);

      if (error) {
        logger.error(
          'Failed to deactivate oracle feed',
          error instanceof Error ? error : new Error(String(error))
        );
        return false;
      }

      return true;
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
        logger.error(
          'Failed to get user profile',
          error instanceof Error ? error : new Error(String(error))
        );
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
      logger.error(
        'Failed to upsert user profile',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return upserted;
  }
}

export function createQueries(client: SupabaseClient): DatabaseQueries {
  return new DatabaseQueries(client);
}
