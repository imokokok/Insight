import { createLogger } from '@/lib/utils/logger';

import {
  getPerformanceMetricsConfig,
  type MemoryManagementConfig,
} from './performanceMetricsConfig';

const logger = createLogger('memoryManager');

export interface MemoryStats {
  totalEntries: number;
  estimatedBytes: number;
  providerCount: number;
  oldestEntryAge: number;
  config: MemoryManagementConfig;
}

interface PriceHistoryEntry {
  price: number;
  timestamp: number;
  responseTime: number;
  success: boolean;
  source?: string;
}

class MemoryManager {
  private static instance: MemoryManager | null = null;
  private cleanupTimerId: ReturnType<typeof setInterval> | null = null;
  private lastCleanupTime: number = 0;

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  startPeriodicCleanup(): void {
    const config = getPerformanceMetricsConfig().memoryManagement;

    if (!config.enabled || this.cleanupTimerId !== null) {
      return;
    }

    this.cleanupTimerId = setInterval(() => {
      this.performPeriodicCleanup();
    }, config.cleanupIntervalMs);

    logger.info('Started periodic memory cleanup', {
      intervalMs: config.cleanupIntervalMs,
    });
  }

  stopPeriodicCleanup(): void {
    if (this.cleanupTimerId !== null) {
      clearInterval(this.cleanupTimerId);
      this.cleanupTimerId = null;
      logger.info('Stopped periodic memory cleanup');
    }
  }

  private performPeriodicCleanup(): void {
    logger.debug('Performing periodic memory cleanup');
    this.lastCleanupTime = Date.now();
  }

  cleanupByTime<T extends PriceHistoryEntry>(data: T[], maxAgeMs?: number): T[] {
    const config = getPerformanceMetricsConfig().memoryManagement;
    const cutoff = Date.now() - (maxAgeMs ?? config.maxAgeMs);

    const filtered = data.filter((entry) => entry.timestamp >= cutoff);

    if (filtered.length < data.length) {
      logger.debug('Cleaned up entries by time', {
        removed: data.length - filtered.length,
        remaining: filtered.length,
      });
    }

    return filtered;
  }

  cleanupBySize<T extends PriceHistoryEntry>(data: T[], maxSize?: number): T[] {
    const config = getPerformanceMetricsConfig().memoryManagement;
    const limit = maxSize ?? config.maxSize;

    if (data.length <= limit) {
      return data;
    }

    const removed = data.length - limit;
    const result = data.slice(-limit);

    logger.debug('Cleaned up entries by size', {
      removed,
      remaining: result.length,
    });

    return result;
  }

  smartCleanup<T extends PriceHistoryEntry>(
    data: T[],
    options?: {
      maxAgeMs?: number;
      maxSize?: number;
    }
  ): T[] {
    const config = getPerformanceMetricsConfig().memoryManagement;

    if (!config.enabled) {
      return data;
    }

    let result = this.cleanupByTime(data, options?.maxAgeMs);
    result = this.cleanupBySize(result, options?.maxSize);

    return result;
  }

  estimateMemoryUsage(data: PriceHistoryEntry[]): number {
    const bytesPerEntry = 100;
    return data.length * bytesPerEntry;
  }

  getMemoryStats(
    dataMap: Map<string, PriceHistory[]> | Map<string, PriceHistoryEntry[]>
  ): MemoryStats {
    const config = getPerformanceMetricsConfig().memoryManagement;
    let totalEntries = 0;
    let oldestTimestamp = Date.now();
    const providers = new Set<string>();

    for (const [key, entries] of dataMap) {
      totalEntries += entries.length;
      const provider = key.split('-')[0];
      providers.add(provider);

      for (const entry of entries) {
        if (entry.timestamp < oldestTimestamp) {
          oldestTimestamp = entry.timestamp;
        }
      }
    }

    const oldestEntryAge = Date.now() - oldestTimestamp;
    const estimatedBytes = this.estimateMemoryUsage(
      Array.from({ length: totalEntries }).fill({} as PriceHistoryEntry) as PriceHistoryEntry[]
    );

    return {
      totalEntries,
      estimatedBytes,
      providerCount: providers.size,
      oldestEntryAge,
      config,
    };
  }

  checkMemoryThreshold(stats: MemoryStats): boolean {
    const config = getPerformanceMetricsConfig().memoryManagement;

    if (!config.enableDevWarnings) {
      return false;
    }

    if (stats.estimatedBytes > config.warningThresholdBytes) {
      logger.warn('Memory usage exceeds threshold', {
        estimatedBytes: stats.estimatedBytes,
        threshold: config.warningThresholdBytes,
        totalEntries: stats.totalEntries,
      });
      return true;
    }

    return false;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  getLastCleanupTime(): number {
    return this.lastCleanupTime;
  }

  destroy(): void {
    this.stopPeriodicCleanup();
    this.lastCleanupTime = 0;
  }
}

type PriceHistory = {
  price: number;
  timestamp: number;
  responseTime: number;
  success: boolean;
  source?: string;
};

export const memoryManager = MemoryManager.getInstance();
