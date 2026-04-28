import { type SupabaseClient } from '@supabase/supabase-js';

import { type AlertConditionType } from '@/lib/supabase/database.types';
import { createLogger } from '@/lib/utils/logger';
import { RequestQueue } from '@/lib/utils/requestQueue';
import { normalizeTimestamp } from '@/lib/utils/timestamp';
import { type OracleProvider, type Blockchain } from '@/types/oracle';

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
  ttl?: string;
}

export interface PriceRecordsFilters {
  provider?: OracleProvider | string;
  symbol?: string;
  chain?: Blockchain | string | null;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface UserSnapshot {
  id?: string;
  user_id: string;
  name?: string;
  symbol: string;
  selected_oracles: OracleProvider[];
  price_data: Array<{
    provider: OracleProvider;
    chain?: Blockchain;
    symbol: string;
    price: number;
    timestamp: number;
    decimals: number;
    confidence?: number;
    source?: string;
  }>;
  stats: {
    avgPrice: number;
    weightedAvgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    variance: number;
    standardDeviation: number;
    standardDeviationPercent: number;
  };
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserSnapshotInsert {
  user_id: string;
  name?: string;
  symbol: string;
  selected_oracles: OracleProvider[];
  price_data: Array<{
    provider: OracleProvider;
    chain?: Blockchain;
    symbol: string;
    price: number;
    timestamp: number;
    decimals: number;
    confidence?: number;
    source?: string;
  }>;
  stats: {
    avgPrice: number;
    weightedAvgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    variance: number;
    standardDeviation: number;
    standardDeviationPercent: number;
  };
  is_public?: boolean;
}

export interface UserFavorite {
  id?: string;
  user_id: string;
  name: string;
  config_type: 'oracle_config' | 'symbol' | 'chain_config';
  config_data: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface UserFavoriteInsert {
  user_id: string;
  name: string;
  config_type: 'oracle_config' | 'symbol' | 'chain_config';
  config_data: Record<string, unknown>;
}

export interface PriceAlert {
  id: string;
  user_id: string;
  name: string | null;
  symbol: string;
  chain: string | null;
  condition_type: AlertConditionType;
  target_value: number;
  provider: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceAlertInsert {
  user_id: string;
  name?: string | null;
  symbol: string;
  chain?: string | null;
  condition_type: AlertConditionType;
  target_value: number;
  provider?: string | null;
  is_active?: boolean;
}

export interface AlertEvent {
  id: string;
  alert_id: string;
  user_id: string;
  price: number;
  triggered_at: string;
  condition_met: string;
  acknowledged: boolean;
  acknowledged_at: string | null;
  created_at: string;
}

export interface AlertEventInsert {
  alert_id: string;
  user_id: string;
  price: number;
  triggered_at: string;
  condition_met: string;
  acknowledged?: boolean;
}

export interface UserProfile {
  id: string;
  email?: string;
  display_name?: string;
  preferences?: {
    defaultSymbol?: string;
    defaultChain?: Blockchain;
    defaultProvider?: OracleProvider;
    refreshInterval?: number;
    notificationsEnabled?: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileUpdate {
  display_name?: string;
  preferences?: {
    defaultSymbol?: string;
    defaultChain?: Blockchain;
    defaultProvider?: OracleProvider;
    refreshInterval?: number;
    notificationsEnabled?: boolean;
  };
  notification_settings?: Record<string, unknown>;
}

interface IAlertService {
  getAlerts(userId: string): Promise<PriceAlert[] | null>;
  createAlert(userId: string, alert: Omit<PriceAlertInsert, 'user_id'>): Promise<PriceAlert | null>;
  updateAlert(id: string, data: Partial<PriceAlertInsert>): Promise<PriceAlert | null>;
  deleteAlert(id: string, userId: string): Promise<boolean>;
  getAlertEvents(userId: string): Promise<AlertEvent[] | null>;
  acknowledgeAlertEvent(eventId: string): Promise<AlertEvent | null>;
}

interface IFavoriteService {
  getFavorites(userId: string): Promise<UserFavorite[] | null>;
  getFavoritesByType(
    userId: string,
    configType: 'oracle_config' | 'symbol' | 'chain_config'
  ): Promise<UserFavorite[] | null>;
  addFavorite(
    userId: string,
    favorite: Omit<UserFavoriteInsert, 'user_id'>
  ): Promise<UserFavorite | null>;
  updateFavorite(id: string, data: Partial<UserFavoriteInsert>): Promise<UserFavorite | null>;
  deleteFavorite(id: string, userId: string): Promise<boolean>;
}

export class DatabaseQueries {
  constructor(private client: SupabaseClient) {}

  async savePriceRecord(record: PriceRecordInsert): Promise<PriceRecord | null> {
    return queryQueue.add(async () => {
      const timestamp = new Date(normalizeTimestamp(record.timestamp)).toISOString();
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
          ttl,
        })
        .select()
        .single();

      if (error) {
        logger.error(
          'Failed to save price record',
          error instanceof Error ? error : new Error(String(error))
        );
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

  async saveSnapshot(
    userId: string,
    snapshot: Omit<UserSnapshotInsert, 'user_id'>
  ): Promise<UserSnapshot | null> {
    const { data, error } = await this.client
      .from('user_snapshots')
      .insert({ ...snapshot, user_id: userId })
      .select()
      .single();

    if (error) {
      logger.error(
        'Failed to save snapshot',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async getSnapshots(userId: string): Promise<UserSnapshot[] | null> {
    const { data, error } = await this.client
      .from('user_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(
        'Failed to get snapshots',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async getSnapshotById(id: string): Promise<UserSnapshot | null> {
    const { data, error } = await this.client
      .from('user_snapshots')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error(
          'Failed to get snapshot',
          error instanceof Error ? error : new Error(String(error))
        );
      }
      return null;
    }

    return data;
  }

  async updateSnapshot(
    id: string,
    data: Partial<UserSnapshotInsert>
  ): Promise<UserSnapshot | null> {
    const { data: updated, error } = await this.client
      .from('user_snapshots')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error(
        'Failed to update snapshot',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return updated;
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    const { error } = await this.client.from('user_snapshots').delete().eq('id', id);

    if (error) {
      logger.error(
        'Failed to delete snapshot',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async addFavorite(
    userId: string,
    favorite: Omit<UserFavoriteInsert, 'user_id'>
  ): Promise<UserFavorite | null> {
    const { data, error } = await this.client
      .from('user_favorites')
      .insert({ ...favorite, user_id: userId })
      .select()
      .single();

    if (error) {
      logger.error(
        'Failed to add favorite',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async getFavoriteById(id: string, userId: string): Promise<UserFavorite | null> {
    const { data, error } = await this.client
      .from('user_favorites')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error(
          'Failed to get favorite by id',
          error instanceof Error ? error : new Error(String(error))
        );
      }
      return null;
    }

    return data;
  }

  async getFavorites(userId: string): Promise<UserFavorite[] | null> {
    const { data, error } = await this.client
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(
        'Failed to get favorites',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async getFavoritesByType(
    userId: string,
    configType: 'oracle_config' | 'symbol' | 'chain_config'
  ): Promise<UserFavorite[] | null> {
    const { data, error } = await this.client
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('config_type', configType)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(
        'Failed to get favorites by type',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async updateFavorite(
    id: string,
    data: Partial<UserFavoriteInsert>
  ): Promise<UserFavorite | null> {
    const { data: updated, error } = await this.client
      .from('user_favorites')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error(
        'Failed to update favorite',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return updated;
  }

  async deleteFavorite(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('user_favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      logger.error(
        'Failed to delete favorite',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async deleteAllFavorites(userId: string): Promise<boolean> {
    const { error } = await this.client.from('user_favorites').delete().eq('user_id', userId);

    if (error) {
      logger.error(
        'Failed to delete all favorites',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async deleteAllAlerts(userId: string): Promise<boolean> {
    const { error } = await this.client.from('price_alerts').delete().eq('user_id', userId);

    if (error) {
      logger.error(
        'Failed to delete all alerts',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async deleteAllSnapshots(userId: string): Promise<boolean> {
    const { error } = await this.client.from('user_snapshots').delete().eq('user_id', userId);

    if (error) {
      logger.error(
        'Failed to delete all snapshots',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async createAlert(
    userId: string,
    alert: Omit<PriceAlertInsert, 'user_id'>
  ): Promise<PriceAlert | null> {
    const { data, error } = await this.client
      .from('price_alerts')
      .insert({ ...alert, user_id: userId, is_active: alert.is_active ?? true })
      .select()
      .single();

    if (error) {
      logger.error(
        'Failed to create alert',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async getAlertById(id: string, userId: string): Promise<PriceAlert | null> {
    const { data, error } = await this.client
      .from('price_alerts')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error(
          'Failed to get alert by id',
          error instanceof Error ? error : new Error(String(error))
        );
      }
      return null;
    }

    return data;
  }

  async getAlerts(userId: string): Promise<PriceAlert[] | null> {
    const { data, error } = await this.client
      .from('price_alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error(
        'Failed to get alerts',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async updateAlert(id: string, data: Partial<PriceAlertInsert>): Promise<PriceAlert | null> {
    const { data: updated, error } = await this.client
      .from('price_alerts')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error(
        'Failed to update alert',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return updated;
  }

  async deleteAlert(id: string, userId: string): Promise<boolean> {
    const { error } = await this.client
      .from('price_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      logger.error(
        'Failed to delete alert',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }

    return true;
  }

  async getAlertEventById(id: string, userId: string): Promise<AlertEvent | null> {
    const { data, error } = await this.client
      .from('alert_events')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        logger.error(
          'Failed to get alert event by id',
          error instanceof Error ? error : new Error(String(error))
        );
      }
      return null;
    }

    return data;
  }

  async getAlertEvents(userId: string): Promise<AlertEvent[] | null> {
    const { data, error } = await this.client
      .from('alert_events')
      .select('*')
      .eq('user_id', userId)
      .order('triggered_at', { ascending: false });

    if (error) {
      logger.error(
        'Failed to get alert events',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

  async acknowledgeAlertEvent(eventId: string, userId?: string): Promise<AlertEvent | null> {
    let query = this.client
      .from('alert_events')
      .update({
        acknowledged: true,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.select().single();

    if (error) {
      logger.error(
        'Failed to acknowledge alert event',
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }

    return data;
  }

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
