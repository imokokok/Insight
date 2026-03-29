'use client';

import { memo, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { RefreshCw, Wifi, WifiOff, Clock, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { useCacheStatus, useAPI3CacheActions } from '@/hooks/oracles/api3';
import { api3OfflineStorage } from '@/lib/oracles/api3OfflineStorage';
import type { CacheStats } from '@/lib/oracles/api3OfflineStorage';

export interface CacheStatusIndicatorProps {
  dataType: string;
  params?: Record<string, unknown>;
  showDetails?: boolean;
  onRefresh?: () => void;
  className?: string;
}

function CacheStatusIndicatorComponent({
  dataType,
  params,
  showDetails = false,
  onRefresh,
  className,
}: CacheStatusIndicatorProps) {
  const cacheStatus = useCacheStatus(dataType as never, params);
  const { invalidateType } = useAPI3CacheActions();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      const stats = await api3OfflineStorage.getCacheStats();
      setCacheStats(stats);
    };
    loadStats();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await invalidateType(dataType as never);
      onRefresh?.();
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTime = (timestamp: number | null): string => {
    if (!timestamp) return '从未更新';
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 1000) return '刚刚';
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  const getStatusColor = (): string => {
    if (cacheStatus.isOffline) return 'text-amber-500';
    if (cacheStatus.isStale) return 'text-orange-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (cacheStatus.isOffline) {
      return <WifiOff className="h-4 w-4" />;
    }
    if (cacheStatus.isStale) {
      return <AlertCircle className="h-4 w-4" />;
    }
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = (): string => {
    if (cacheStatus.isOffline) return '离线模式';
    if (cacheStatus.isStale) return '数据过期';
    return '数据新鲜';
  };

  const getSourceIcon = () => {
    switch (cacheStatus.source) {
      case 'network':
        return <Wifi className="h-3 w-3" />;
      case 'cache':
        return <Database className="h-3 w-3" />;
      case 'offline':
        return <WifiOff className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getSourceText = (): string => {
    switch (cacheStatus.source) {
      case 'network':
        return '网络';
      case 'cache':
        return '缓存';
      case 'offline':
        return '离线存储';
      default:
        return '未知';
    }
  };

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <div className={clsx('flex items-center gap-1.5', getStatusColor())}>
        {getStatusIcon()}
        <span className="text-xs font-medium">{getStatusText()}</span>
      </div>

      {showDetails && (
        <>
          <div className="flex items-center gap-1 text-gray-400">
            {getSourceIcon()}
            <span className="text-xs">{getSourceText()}</span>
          </div>

          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{formatTime(cacheStatus.lastUpdated)}</span>
          </div>

          {cacheStats && (
            <div className="flex items-center gap-1 text-gray-400">
              <Database className="h-3 w-3" />
              <span className="text-xs">
                {cacheStats.totalEntries} 条 / {(cacheStats.totalSize / 1024).toFixed(1)} KB
              </span>
            </div>
          )}

          {cacheStats && cacheStats.hitRate > 0 && (
            <div className="text-xs text-gray-400">
              命中率: {(cacheStats.hitRate * 100).toFixed(1)}%
            </div>
          )}
        </>
      )}

      <button
        onClick={handleRefresh}
        disabled={isRefreshing || cacheStatus.isOffline}
        className={clsx(
          'flex items-center justify-center rounded p-1 transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
        title="刷新数据"
      >
        <RefreshCw
          className={clsx('h-3.5 w-3.5 text-gray-500', isRefreshing && 'animate-spin')}
        />
      </button>
    </div>
  );
}

export const CacheStatusIndicator = memo(CacheStatusIndicatorComponent);

export interface CacheStatusPanelProps {
  className?: string;
}

export function CacheStatusPanel({ className }: CacheStatusPanelProps) {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [offlineStatus, setOfflineStatus] = useState<{
    isOffline: boolean;
    lastSync: number | null;
    cachedDataTypes: string[];
  } | null>(null);
  const { clearOfflineCache, precacheCritical } = useAPI3CacheActions();

  useEffect(() => {
    const loadData = async () => {
      const [cacheStats, offline] = await Promise.all([
        api3OfflineStorage.getCacheStats(),
        api3OfflineStorage.getOfflineDataStatus(),
      ]);
      setStats(cacheStats);
      setOfflineStatus(offline);
    };
    loadData();

    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    await clearOfflineCache();
    const newStats = await api3OfflineStorage.getCacheStats();
    setStats(newStats);
  };

  const handlePrecache = async () => {
    await precacheCritical();
    const newStats = await api3OfflineStorage.getCacheStats();
    setStats(newStats);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className={clsx('rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800', className)}>
      <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
        缓存状态
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">网络状态</span>
          <div className={clsx(
            'flex items-center gap-1 text-xs font-medium',
            offlineStatus?.isOffline ? 'text-amber-500' : 'text-green-500'
          )}>
            {offlineStatus?.isOffline ? (
              <>
                <WifiOff className="h-3 w-3" />
                离线
              </>
            ) : (
              <>
                <Wifi className="h-3 w-3" />
                在线
              </>
            )}
          </div>
        </div>

        {stats && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">缓存条目</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {stats.totalEntries}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">缓存大小</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {formatBytes(stats.totalSize)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">命中率</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {(stats.hitRate * 100).toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">未命中</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {(stats.missRate * 100).toFixed(1)}%
              </span>
            </div>
          </>
        )}

        {offlineStatus?.cachedDataTypes && offlineStatus.cachedDataTypes.length > 0 && (
          <div className="pt-2">
            <span className="text-xs text-gray-500">已缓存数据类型</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {offlineStatus.cachedDataTypes.map((type) => (
                <span
                  key={type}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            onClick={handlePrecache}
            className="flex-1 rounded bg-blue-500 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-600"
          >
            预缓存关键数据
          </button>
          <button
            onClick={handleClearCache}
            className="flex-1 rounded bg-gray-200 px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            清除缓存
          </button>
        </div>
      </div>
    </div>
  );
}
