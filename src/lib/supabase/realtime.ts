import {
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { createLogger } from '@/lib/utils/logger';

import { supabase } from './client';

import type { PriceRecord, AlertEvent, UserSnapshot, UserFavorite } from './queries';

const logger = createLogger('supabase-realtime');

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface PriceUpdatePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: PriceRecord;
  old: Partial<PriceRecord>;
  schema: string;
  table: string;
  commit_timestamp: string;
}

export interface AlertEventPayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: AlertEvent;
  old: Partial<AlertEvent>;
  schema: string;
  table: string;
  commit_timestamp: string;
}

export interface SnapshotChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: UserSnapshot;
  old: Partial<UserSnapshot>;
  schema: string;
  table: string;
  commit_timestamp: string;
}

export interface FavoriteChangePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: UserFavorite;
  old: Partial<UserFavorite>;
  schema: string;
  table: string;
  commit_timestamp: string;
}

type SubscriptionCallback<T> = (payload: T) => void;

class RealtimeManager {
  private client: SupabaseClient;
  private subscriptions: Map<string, RealtimeChannel> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionCheckTimer: NodeJS.Timeout | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring() {
    this.updateConnectionStatus('connecting');

    const checkConnection = () => {
      const status = this.client.realtime.connectionState();
      if (status === 'open') {
        this.updateConnectionStatus('connected');
        this.reconnectAttempts = 0;
      } else if (status === 'connecting') {
        this.updateConnectionStatus('connecting');
      } else if (status === 'closed' || status === 'closing') {
        this.updateConnectionStatus('disconnected');
        this.handleReconnect();
      }
    };

    this.client.realtime.connect();

    this.connectionCheckTimer = setInterval(checkConnection, 5000);
  }

  private clearConnectionCheckTimer() {
    if (this.connectionCheckTimer) {
      clearInterval(this.connectionCheckTimer);
      this.connectionCheckTimer = null;
    }
  }

  private updateConnectionStatus(status: ConnectionStatus) {
    this.connectionStatus = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.updateConnectionStatus('error');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    logger.info(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.updateConnectionStatus('connecting');
      this.client.realtime.connect();
    }, delay);
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.connectionStatus);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public subscribeToPriceUpdates(
    callback: SubscriptionCallback<PriceUpdatePayload>,
    filters?: { provider?: string; symbol?: string; chain?: string }
  ): () => void {
    // Sort by key to ensure consistency
    const sortedFilters = filters
      ? Object.fromEntries(Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)))
      : {};
    const subscriptionId = `price_updates_${JSON.stringify(sortedFilters)}`;

    if (this.subscriptions.has(subscriptionId)) {
      logger.warn('Price updates subscription already exists');
      return () => this.unsubscribe(subscriptionId);
    }

    const channel = this.client.channel(subscriptionId).on<PriceRecord>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'price_records',
        filter: filters ? this.buildFilter(filters) : undefined,
      },
      (payload: RealtimePostgresChangesPayload<PriceRecord>) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as PriceRecord,
          old: payload.old as Partial<PriceRecord>,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp,
        });
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Subscribed to price updates');
      } else if (status === 'CLOSED') {
        logger.info('Price updates subscription closed');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Price updates subscription error');
      }
    });

    this.subscriptions.set(subscriptionId, channel);

    return () => this.unsubscribe(subscriptionId);
  }

  public subscribeToAlertEvents(
    userId: string,
    callback: SubscriptionCallback<AlertEventPayload>
  ): () => void {
    const subscriptionId = `alert_events_${userId}`;

    if (this.subscriptions.has(subscriptionId)) {
      logger.warn('Alert events subscription already exists');
      return () => this.unsubscribe(subscriptionId);
    }

    const channel = this.client.channel(subscriptionId).on<AlertEvent>(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'alert_events',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<AlertEvent>) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as AlertEvent,
          old: payload.old as Partial<AlertEvent>,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp,
        });
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Subscribed to alert events');
      } else if (status === 'CLOSED') {
        logger.info('Alert events subscription closed');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Alert events subscription error');
      }
    });

    this.subscriptions.set(subscriptionId, channel);

    return () => this.unsubscribe(subscriptionId);
  }

  public subscribeToSnapshotChanges(
    userId: string,
    callback: SubscriptionCallback<SnapshotChangePayload>
  ): () => void {
    const subscriptionId = `snapshot_changes_${userId}`;

    if (this.subscriptions.has(subscriptionId)) {
      logger.warn('Snapshot changes subscription already exists');
      return () => this.unsubscribe(subscriptionId);
    }

    const channel = this.client.channel(subscriptionId).on<UserSnapshot>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_snapshots',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<UserSnapshot>) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as UserSnapshot,
          old: payload.old as Partial<UserSnapshot>,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp,
        });
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Subscribed to snapshot changes');
      } else if (status === 'CLOSED') {
        logger.info('Snapshot changes subscription closed');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Snapshot changes subscription error');
      }
    });

    this.subscriptions.set(subscriptionId, channel);

    return () => this.unsubscribe(subscriptionId);
  }

  public subscribeToFavoriteChanges(
    userId: string,
    callback: SubscriptionCallback<FavoriteChangePayload>
  ): () => void {
    const subscriptionId = `favorite_changes_${userId}`;

    if (this.subscriptions.has(subscriptionId)) {
      logger.warn('Favorite changes subscription already exists');
      return () => this.unsubscribe(subscriptionId);
    }

    const channel = this.client.channel(subscriptionId).on<UserFavorite>(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_favorites',
        filter: `user_id=eq.${userId}`,
      },
      (payload: RealtimePostgresChangesPayload<UserFavorite>) => {
        callback({
          eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
          new: payload.new as UserFavorite,
          old: payload.old as Partial<UserFavorite>,
          schema: payload.schema,
          table: payload.table,
          commit_timestamp: payload.commit_timestamp,
        });
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.info('Subscribed to favorite changes');
      } else if (status === 'CLOSED') {
        logger.info('Favorite changes subscription closed');
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Favorite changes subscription error');
      }
    });

    this.subscriptions.set(subscriptionId, channel);

    return () => this.unsubscribe(subscriptionId);
  }

  private buildFilter(filters: Record<string, string | number | boolean>): string {
    const filterParts: string[] = [];

    if (filters.provider) {
      filterParts.push(`provider=eq.${filters.provider}`);
    }

    if (filters.symbol) {
      filterParts.push(`symbol=eq.${filters.symbol}`);
    }

    if (filters.chain) {
      filterParts.push(`chain=eq.${filters.chain}`);
    }

    return filterParts.join(',');
  }

  private unsubscribe(subscriptionId: string) {
    const channel = this.subscriptions.get(subscriptionId);
    if (channel) {
      channel.unsubscribe();
      this.subscriptions.delete(subscriptionId);
      logger.info(`Unsubscribed from ${subscriptionId}`);
    }
  }

  public unsubscribeAll() {
    this.subscriptions.forEach((channel, subscriptionId) => {
      channel.unsubscribe();
      logger.info(`Unsubscribed from ${subscriptionId}`);
    });
    this.subscriptions.clear();
  }

  public reconnect() {
    this.reconnectAttempts = 0;
    this.updateConnectionStatus('connecting');
    this.client.realtime.connect();
  }

  public destroy() {
    this.clearConnectionCheckTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.unsubscribeAll();
    this.statusListeners.clear();
    this.client.realtime.disconnect();
  }

  public getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

export const realtimeManager = new RealtimeManager(supabase);
