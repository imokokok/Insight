import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { CACHE_CONFIG } from '@/lib/config/cacheConfig';
import { API3Client } from '@/lib/oracles/api3';

interface CachedDataEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
}

interface API3OfflineDBSchema extends DBSchema {
  cache: {
    key: string;
    value: CachedDataEntry<unknown>;
    indexes: {
      'by-timestamp': number;
      'by-ttl': number;
    };
  };
  metadata: {
    key: string;
    value: {
      totalSize: number;
      lastCleanup: number;
      version: number;
    };
  };
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  hitRate: number;
  missRate: number;
}

export interface StorageError {
  type: 'quota_exceeded' | 'init_failed' | 'read_failed' | 'write_failed' | 'unknown';
  message: string;
  originalError?: unknown;
  timestamp: number;
}

const STORAGE_ERRORS = {
  QUOTA_EXCEEDED: 'quota_exceeded' as const,
  INIT_FAILED: 'init_failed' as const,
  READ_FAILED: 'read_failed' as const,
  WRITE_FAILED: 'write_failed' as const,
  UNKNOWN: 'unknown' as const,
};

function createStorageError(type: StorageError['type'], message: string, originalError?: unknown): StorageError {
  return {
    type,
    message,
    originalError,
    timestamp: Date.now(),
  };
}

function logStorageError(error: StorageError): void {
  const prefix = `[API3OfflineStorage][${error.type.toUpperCase()}]`;
  console.error(prefix, error.message, error.originalError || '');
}

export class API3OfflineStorage {
  private dbName = 'api3-offline-data';
  private dbVersion = 1;
  private db: IDBPDatabase<API3OfflineDBSchema> | null = null;
  private initPromise: Promise<void> | null = null;
  private hitCount = 0;
  private missCount = 0;
  private client: API3Client;
  private lastError: StorageError | null = null;
  private errorListeners: Set<(error: StorageError) => void> = new Set();
  private quotaExceeded = false;

  constructor(client?: API3Client) {
    this.client = client || new API3Client();
  }

  subscribeToErrors(callback: (error: StorageError) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  getLastError(): StorageError | null {
    return this.lastError;
  }

  isQuotaExceeded(): boolean {
    return this.quotaExceeded;
  }

  private notifyErrorListeners(error: StorageError): void {
    this.lastError = error;
    this.errorListeners.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.error('[API3OfflineStorage] Error in error listener:', e);
      }
    });
  }

  private handleError(type: StorageError['type'], message: string, originalError?: unknown): StorageError {
    const error = createStorageError(type, message, originalError);
    logStorageError(error);
    this.notifyErrorListeners(error);
    
    if (type === STORAGE_ERRORS.QUOTA_EXCEEDED) {
      this.quotaExceeded = true;
    }
    
    return error;
  }

  async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeDB();
    return this.initPromise;
  }

  private async initializeDB(): Promise<void> {
    try {
      this.db = await openDB<API3OfflineDBSchema>(this.dbName, this.dbVersion, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('cache')) {
            const cacheStore = db.createObjectStore('cache');
            cacheStore.createIndex('by-timestamp', 'timestamp');
            cacheStore.createIndex('by-ttl', 'ttl');
          }
          if (!db.objectStoreNames.contains('metadata')) {
            db.createObjectStore('metadata');
          }
        },
      });

      await this.clearExpired();
    } catch (error) {
      this.handleError(STORAGE_ERRORS.INIT_FAILED, 'Failed to initialize IndexedDB', error);
      throw error;
    }
  }

  async setData<T>(key: string, data: T | null, ttl?: number): Promise<void> {
    await this.init();
    if (!this.db) {
      this.handleError(STORAGE_ERRORS.WRITE_FAILED, 'Database not initialized');
      return;
    }

    if (data === null) {
      try {
        await this.db.delete('cache', key);
      } catch (error) {
        this.handleError(STORAGE_ERRORS.WRITE_FAILED, `Failed to delete key: ${key}`, error);
      }
      return;
    }

    const serializedData = JSON.stringify(data);
    const size = new Blob([serializedData]).size;

    const maxSize = CACHE_CONFIG.offline.maxSize;
    const currentSize = await this.getCurrentSize();

    if (currentSize + size > maxSize) {
      await this.evictOldest(size);
    }

    const entry: CachedDataEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || CACHE_CONFIG.offline.maxAge,
      size,
    };

    try {
      await this.db.put('cache', entry as CachedDataEntry<unknown>, key);
      this.quotaExceeded = false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('QuotaExceededError') || errorMessage.includes('quota')) {
        this.handleError(STORAGE_ERRORS.QUOTA_EXCEEDED, 'Storage quota exceeded. Consider clearing old data.', error);
        await this.handleQuotaExceeded();
        try {
          await this.db.put('cache', entry as CachedDataEntry<unknown>, key);
        } catch (retryError) {
          this.handleError(STORAGE_ERRORS.WRITE_FAILED, `Failed to write data for key: ${key} after quota handling`, retryError);
        }
      } else {
        this.handleError(STORAGE_ERRORS.WRITE_FAILED, `Failed to write data for key: ${key}`, error);
      }
    }
  }

  private async handleQuotaExceeded(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    
    try {
      await store.clear();
      await tx.done;
    } catch (error) {
      this.handleError(STORAGE_ERRORS.WRITE_FAILED, 'Failed to clear cache during quota handling', error);
    }
  }

  async getData<T>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) {
      this.handleError(STORAGE_ERRORS.READ_FAILED, 'Database not initialized');
      return null;
    }

    try {
      const entry = await this.db.get('cache', key);

      if (!entry) {
        this.missCount++;
        return null;
      }

      const now = Date.now();
      if (now - entry.timestamp > entry.ttl) {
        await this.db.delete('cache', key);
        this.missCount++;
        return null;
      }

      this.hitCount++;
      return entry.data as T;
    } catch (error) {
      this.handleError(STORAGE_ERRORS.READ_FAILED, `Failed to read data for key: ${key}`, error);
      this.missCount++;
      return null;
    }
  }

  async clearExpired(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const now = Date.now();
    const tx = this.db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const index = store.index('by-ttl');

    let cursor = await index.openCursor();

    while (cursor) {
      const entry = cursor.value;
      if (now - entry.timestamp > entry.ttl) {
        await cursor.delete();
      }
      cursor = await cursor.continue();
    }

    await tx.done;

    await this.db.put(
      'metadata',
      {
        totalSize: await this.getCurrentSize(),
        lastCleanup: now,
        version: this.dbVersion,
      },
      'stats'
    );
  }

  async getAllKeys(): Promise<string[]> {
    await this.init();
    if (!this.db) return [];

    const keys = await this.db.getAllKeys('cache');
    return Array.from(keys);
  }

  async getCacheStats(): Promise<CacheStats> {
    await this.init();
    if (!this.db) {
      return {
        totalEntries: 0,
        totalSize: 0,
        oldestEntry: 0,
        newestEntry: 0,
        hitRate: 0,
        missRate: 0,
      };
    }

    const keys = await this.getAllKeys();
    let totalSize = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    for (const key of keys) {
      const entry = await this.db.get('cache', key);
      if (entry) {
        totalSize += entry.size;
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
        if (entry.timestamp > newestTimestamp) {
          newestTimestamp = entry.timestamp;
        }
      }
    }

    const totalRequests = this.hitCount + this.missCount;

    return {
      totalEntries: keys.length,
      totalSize,
      oldestEntry: keys.length > 0 ? oldestTimestamp : 0,
      newestEntry: keys.length > 0 ? newestTimestamp : 0,
      hitRate: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      missRate: totalRequests > 0 ? this.missCount / totalRequests : 0,
    };
  }

  async precacheCriticalData(): Promise<{ success: string[]; failed: { type: string; error: string }[] }> {
    await this.init();
    if (!this.db) {
      this.handleError(STORAGE_ERRORS.WRITE_FAILED, 'Database not initialized for precaching');
      return { success: [], failed: [{ type: 'init', error: 'Database not initialized' }] };
    }

    const criticalTypes = CACHE_CONFIG.offline.criticalDataTypes;
    const success: string[] = [];
    const failed: { type: string; error: string }[] = [];
    const precachePromises: Promise<void>[] = [];

    if (criticalTypes.includes('price' as never)) {
      const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'API3/USD'];
      for (const symbol of symbols) {
        precachePromises.push(
          this.precachePriceData(symbol).then(() => {
            success.push(`price-${symbol}`);
          }).catch((error) => {
            failed.push({ type: `price-${symbol}`, error: error instanceof Error ? error.message : String(error) });
          })
        );
      }
    }

    if (criticalTypes.includes('alerts' as never)) {
      precachePromises.push(
        this.precacheAlerts().then(() => {
          success.push('alerts');
        }).catch((error) => {
          failed.push({ type: 'alerts', error: error instanceof Error ? error.message : String(error) });
        })
      );
    }

    if (criticalTypes.includes('airnodeStats' as never)) {
      precachePromises.push(
        this.precacheAirnodeStats().then(() => {
          success.push('airnodeStats');
        }).catch((error) => {
          failed.push({ type: 'airnodeStats', error: error instanceof Error ? error.message : String(error) });
        })
      );
    }

    await Promise.allSettled(precachePromises);

    if (failed.length > 0) {
      console.warn('[API3OfflineStorage] Some precache operations failed:', failed);
    }

    return { success, failed };
  }

  private async precachePriceData(symbol: string): Promise<void> {
    try {
      const priceData = await this.client.getPrice(symbol);
      await this.setData(`price-${symbol}-default`, priceData, CACHE_CONFIG.api3.price.gcTime);
    } catch (error) {
      console.warn(`Failed to precache price data for ${symbol}:`, error);
    }
  }

  private async precacheAlerts(): Promise<void> {
    try {
      const alerts = await this.client.getActiveAlerts();
      await this.setData('alerts', alerts, CACHE_CONFIG.api3.alerts.gcTime);
    } catch (error) {
      console.warn('Failed to precache alerts:', error);
    }
  }

  private async precacheAirnodeStats(): Promise<void> {
    try {
      const stats = await this.client.getAirnodeNetworkStats();
      await this.setData('airnodeStats', stats, CACHE_CONFIG.api3.airnodeStats.gcTime);
    } catch (error) {
      console.warn('Failed to precache airnode stats:', error);
    }
  }

  private async getCurrentSize(): Promise<number> {
    if (!this.db) return 0;

    const keys = await this.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
      const entry = await this.db.get('cache', key);
      if (entry) {
        totalSize += entry.size;
      }
    }

    return totalSize;
  }

  private async evictOldest(requiredSpace: number): Promise<void> {
    if (!this.db) return;

    const tx = this.db.transaction('cache', 'readwrite');
    const store = tx.objectStore('cache');
    const index = store.index('by-timestamp');

    let freedSpace = 0;
    let cursor = await index.openCursor();

    while (cursor && freedSpace < requiredSpace) {
      const entry = cursor.value;
      freedSpace += entry.size;
      await cursor.delete();
      cursor = await cursor.continue();
    }

    await tx.done;
  }

  async clearAll(): Promise<void> {
    await this.init();
    if (!this.db) return;

    const tx = this.db.transaction('cache', 'readwrite');
    await tx.objectStore('cache').clear();
    await tx.done;

    this.hitCount = 0;
    this.missCount = 0;
  }

  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async getOfflineDataStatus(): Promise<{
    isOffline: boolean;
    lastSync: number | null;
    cachedDataTypes: string[];
  }> {
    await this.init();

    const keys = await this.getAllKeys();
    const cachedDataTypes = new Set<string>();

    for (const key of keys) {
      const parts = key.split('-');
      if (parts.length > 0) {
        cachedDataTypes.add(parts[0]);
      }
    }

    const metadata = this.db ? await this.db.get('metadata', 'stats') : null;

    return {
      isOffline: !navigator.onLine,
      lastSync: metadata?.lastCleanup || null,
      cachedDataTypes: Array.from(cachedDataTypes),
    };
  }

  resetHitMissCounters(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }
}

export const api3OfflineStorage = new API3OfflineStorage();
