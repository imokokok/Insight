import { type SupabaseClient } from '@supabase/supabase-js';

import { createLogger } from '@/lib/utils/logger';

import { supabase } from './client';

const logger = createLogger('supabase-realtime');

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

class RealtimeManager {
  private client: SupabaseClient;
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
    this.statusListeners.clear();
    this.client.realtime.disconnect();
  }
}

export const realtimeManager = new RealtimeManager(supabase);
