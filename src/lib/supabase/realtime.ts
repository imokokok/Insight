import { type SupabaseClient } from '@supabase/supabase-js';

import { createLogger } from '@/lib/utils/logger';

import { supabase } from './client';

const logger = createLogger('supabase-realtime');

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

// Best-effort `.unref()` for timer handles. On Node.js this prevents the
// interval from keeping the event loop alive (important for serverless
// freeze/recycle); in browsers (where handles are numbers) it is a no-op.
function unrefTimer(handle: ReturnType<typeof setInterval> | null): void {
  if (!handle) return;
  const unref = (handle as { unref?: () => void }).unref;
  if (typeof unref === 'function') {
    unref.call(handle);
  }
}

class RealtimeManager {
  private client: SupabaseClient;
  private connectionStatus: ConnectionStatus = 'disconnected';
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionCheckTimer: ReturnType<typeof setInterval> | null = null;
  private static instance: RealtimeManager | null = null;
  private initialized = false;
  private onVisibilityChange: (() => void) | null = null;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  static getInstance(client: SupabaseClient): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager(client);
    }
    return RealtimeManager.instance;
  }

  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
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

    this.safeConnect();

    this.connectionCheckTimer = setInterval(checkConnection, 5000);
    // On Node.js (serverless / SSR), unref the timer so it does not keep the
    // process alive and defeat freeze/recycle optimizations. In the browser
    // `unref` is not available on number handles, so guard with typeof.
    unrefTimer(this.connectionCheckTimer);

    if (typeof window !== 'undefined') {
      this.onVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          if (!this.connectionCheckTimer) {
            this.connectionCheckTimer = setInterval(checkConnection, 5000);
            unrefTimer(this.connectionCheckTimer);
          }
          this.reconnect();
        } else {
          this.clearConnectionCheckTimer();
        }
      };
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    }
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
      this.safeConnect();
    }, delay);
  }

  private safeConnect() {
    try {
      this.client.realtime.connect();
    } catch (error) {
      logger.error(
        'Failed to connect realtime client',
        error instanceof Error ? error : new Error(String(error))
      );
      this.updateConnectionStatus('error');
    }
  }

  public getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    if (!this.initialized) {
      this.initialize();
    }
    this.statusListeners.add(callback);
    callback(this.connectionStatus);

    return () => {
      this.statusListeners.delete(callback);
    };
  }

  public reconnect() {
    if (!this.initialized) {
      this.initialize();
      return;
    }
    this.reconnectAttempts = 0;
    this.updateConnectionStatus('connecting');
    this.safeConnect();
  }

  public destroy() {
    if (this.onVisibilityChange && typeof window !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      this.onVisibilityChange = null;
    }
    this.clearConnectionCheckTimer();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.statusListeners.clear();
    this.client.realtime.disconnect();
    RealtimeManager.instance = null;
    this.initialized = false;
  }
}

export const realtimeManager = RealtimeManager.getInstance(supabase);
