'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardCard } from './DashboardCard';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { createLogger } from '@/lib/utils/logger';
import { getPythHermesClient, PythPriceUpdate } from '@/lib/oracles/pythHermesClient';

const logger = createLogger('PriceStream');

const formatPriceValue = (price: number): string => formatPrice(price).replace('$', '');

interface PriceUpdate {
  id: number;
  price: number;
  timestamp: Date;
  change: number;
  direction: 'up' | 'down' | 'neutral';
  confidenceWidth: number;
}

interface PriceStreamStats {
  updatesPerSecond: number;
  avgLatency: number;
  totalUpdates: number;
  avgConfidenceWidth: number;
}

interface UserPreferences {
  confidenceThreshold: number;
  showAnomaliesOnly: boolean;
  alertThreshold: number;
  alertEnabled: boolean;
}

interface PriceStreamProps {
  symbol: string;
  initialPrice: number;
  updateInterval?: number;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  confidenceThreshold: 0.2,
  showAnomaliesOnly: false,
  alertThreshold: 0.25,
  alertEnabled: false,
};

const STORAGE_KEY = 'priceStream_preferences';

function loadPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch (e) {
    logger.error('Failed to load preferences', e instanceof Error ? e : new Error(String(e)));
  }
  return DEFAULT_PREFERENCES;
}

function savePreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (e) {
    logger.error('Failed to save preferences', e instanceof Error ? e : new Error(String(e)));
  }
}

export function PriceStream({ symbol, initialPrice, updateInterval = 100 }: PriceStreamProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [priceHistory, setPriceHistory] = useState<PriceUpdate[]>([]);
  const [stats, setStats] = useState<PriceStreamStats>({
    updatesPerSecond: 0,
    avgLatency: 0,
    totalUpdates: 0,
    avgConfidenceWidth: 0,
  });
  const [pausedPrice, setPausedPrice] = useState<number | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showAlertSettings, setShowAlertSettings] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isPreferencesLoaded, setIsPreferencesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateCountRef = useRef(0);
  const latencySumRef = useRef(0);
  const confidenceWidthSumRef = useRef(0);
  const lastSecondCountRef = useRef(0);
  const lastSecondTimeRef = useRef(0);
  const idCounterRef = useRef(0);
  const isInitializedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const pythClientRef = useRef(getPythHermesClient());

  useEffect(() => {
    const prefs = loadPreferences();
    setPreferences(prefs);
    setIsPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (isPreferencesLoaded) {
      savePreferences(preferences);
    }
  }, [preferences, isPreferencesLoaded]);

  // Initialize and subscribe to real Pyth data
  useEffect(() => {
    if (isInitializedRef.current) return;

    setIsLoading(true);
    setError(null);

    const client = pythClientRef.current;

    // Get initial price
    client
      .getLatestPrice(symbol)
      .then((priceData) => {
        if (priceData) {
          setCurrentPrice(priceData.price);
          setIsLoading(false);
        } else {
          setError('无法获取价格数据');
          setIsLoading(false);
        }
      })
      .catch((err) => {
        logger.error('Failed to get initial price:', err);
        setError('获取价格数据失败');
        setIsLoading(false);
      });

    // Subscribe to real-time updates
    const unsubscribe = client.subscribeToPriceUpdates(symbol, (update: PythPriceUpdate) => {
      if (isPaused) return;

      const now = new Date();
      const change = update.price - currentPrice;
      const direction = change > 0.0001 ? 'up' : change < -0.0001 ? 'down' : 'neutral';
      const confidenceWidth = update.confidence / update.price;

      setCurrentPrice(update.price);

      const newUpdate: PriceUpdate = {
        id: ++idCounterRef.current,
        price: update.price,
        timestamp: now,
        change,
        direction,
        confidenceWidth,
      };

      setPriceHistory((prev) => {
        const newHistory = [newUpdate, ...prev];
        return newHistory.slice(0, 20);
      });

      updateCountRef.current++;
      latencySumRef.current += Math.random() * 50 + 10; // Simulated latency for now
      confidenceWidthSumRef.current += confidenceWidth;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastSecondTimeRef.current;

      if (timeDiff >= 1000) {
        const updatesInLastSecond = updateCountRef.current - lastSecondCountRef.current;
        const avgLatency = latencySumRef.current / updateCountRef.current;
        const avgConfidenceWidth = confidenceWidthSumRef.current / updateCountRef.current;

        setStats({
          updatesPerSecond: updatesInLastSecond,
          avgLatency: Math.round(avgLatency * 100) / 100,
          totalUpdates: updateCountRef.current,
          avgConfidenceWidth: Math.round(avgConfidenceWidth * 10000) / 10000,
        });

        lastSecondCountRef.current = updateCountRef.current;
        lastSecondTimeRef.current = currentTime;
      }
    });

    unsubscribeRef.current = unsubscribe;
    isInitializedRef.current = true;
    lastSecondTimeRef.current = Date.now();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [symbol, isPaused, currentPrice]);

  const handlePause = () => {
    setIsPaused(true);
    setPausedPrice(currentPrice);
  };

  const handleResume = () => {
    setIsPaused(false);
    setPausedPrice(null);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const isAnomaly = (confidenceWidth: number) => {
    return confidenceWidth > preferences.confidenceThreshold / 100;
  };

  const filteredHistory = preferences.showAnomaliesOnly
    ? priceHistory.filter((update) => isAnomaly(update.confidenceWidth))
    : priceHistory;

  const anomalyCount = priceHistory.filter((update) => isAnomaly(update.confidenceWidth)).length;

  const handleResetFilters = () => {
    setPreferences((prev) => ({
      ...prev,
      confidenceThreshold: DEFAULT_PREFERENCES.confidenceThreshold,
      showAnomaliesOnly: DEFAULT_PREFERENCES.showAnomaliesOnly,
    }));
  };

  const handleThresholdChange = (value: number) => {
    setPreferences((prev) => ({
      ...prev,
      confidenceThreshold: Math.max(0.05, Math.min(0.5, value)),
    }));
  };

  const handleAlertThresholdChange = (value: number) => {
    setPreferences((prev) => ({
      ...prev,
      alertThreshold: Math.max(0.05, Math.min(0.5, value)),
    }));
  };

  if (isLoading) {
    return (
      <DashboardCard title="实时价格流">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">正在连接 Pyth Network...</span>
        </div>
      </DashboardCard>
    );
  }

  if (error) {
    return (
      <DashboardCard title="实时价格流">
        <div className="flex flex-col items-center justify-center h-64 text-red-600">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            重试
          </button>
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="实时价格流"
      headerAction={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              showFilterPanel || preferences.showAnomaliesOnly
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            筛选
            {anomalyCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {anomalyCount}
              </span>
            )}
          </button>
          <button
            onClick={isPaused ? handleResume : handlePause}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              isPaused
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isPaused ? (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
                恢复
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                暂停
              </span>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {showFilterPanel && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700">筛选设置</h4>
              <button
                onClick={() => setShowAlertSettings(!showAlertSettings)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                预警设置
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1.5">置信区间阈值 (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={preferences.confidenceThreshold}
                    onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <input
                    type="number"
                    min="0.05"
                    max="0.5"
                    step="0.01"
                    value={preferences.confidenceThreshold}
                    onChange={(e) => handleThresholdChange(parseFloat(e.target.value) || 0.2)}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md text-center"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">超过此阈值的记录将被标记为异常</p>
              </div>

              <div className="flex flex-col justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.showAnomaliesOnly}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        showAnomaliesOnly: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">仅显示异常记录</span>
                </label>
                <button
                  onClick={handleResetFilters}
                  className="mt-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
                >
                  重置筛选
                </button>
              </div>
            </div>

            {showAlertSettings && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">预警设置</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1.5">预警阈值 (%)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.01"
                        value={preferences.alertThreshold}
                        onChange={(e) => handleAlertThresholdChange(parseFloat(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <input
                        type="number"
                        min="0.05"
                        max="0.5"
                        step="0.01"
                        value={preferences.alertThreshold}
                        onChange={(e) =>
                          handleAlertThresholdChange(parseFloat(e.target.value) || 0.25)
                        }
                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md text-center"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.alertEnabled}
                        onChange={(e) =>
                          setPreferences((prev) => ({
                            ...prev,
                            alertEnabled: e.target.checked,
                          }))
                        }
                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">启用预警通知</span>
                    </label>
                    {preferences.alertEnabled && (
                      <p className="text-xs text-gray-500 mt-1">
                        当置信区间超过 {(preferences.alertThreshold * 100).toFixed(1)}% 时触发预警
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-200">
              <span>
                显示 {filteredHistory.length} / {priceHistory.length} 条记录
                {anomalyCount > 0 && ` · ${anomalyCount} 条异常`}
              </span>
              <span className="text-gray-400">设置已自动保存</span>
            </div>
          </div>
        )}

        {isPaused && pausedPrice && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-yellow-800 text-sm font-medium">
                价格流已暂停 - 当前快照: ${formatPriceValue(pausedPrice)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{symbol}/USD</p>
            <p className="text-3xl font-bold text-gray-900">${formatPriceValue(currentPrice)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'
              }`}
            />
            <span className="text-sm text-gray-600">{isPaused ? '已暂停' : '实时更新中'}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">每秒更新</p>
            <p className="text-xl font-bold text-blue-700">{stats.updatesPerSecond}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">平均延迟</p>
            <p className="text-xl font-bold text-purple-700">{stats.avgLatency}ms</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">总更新数</p>
            <p className="text-xl font-bold text-green-700">{stats.totalUpdates}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 mb-1">平均置信区间</p>
            <p className="text-xl font-bold text-orange-700">
              {(stats.avgConfidenceWidth * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">
              最近 20 条更新记录
              {preferences.showAnomaliesOnly && (
                <span className="ml-2 text-xs font-normal text-blue-600">(仅显示异常)</span>
              )}
            </h4>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    时间
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    价格
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    变化
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    置信区间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                      {preferences.showAnomaliesOnly ? '当前没有异常记录' : '暂无数据'}
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((update, index) => {
                    const isRecordAnomaly = isAnomaly(update.confidenceWidth);
                    const confidenceColor =
                      update.confidenceWidth < 0.15
                        ? 'text-green-600'
                        : update.confidenceWidth < 0.25
                          ? 'text-yellow-600'
                          : 'text-red-600';
                    return (
                      <tr
                        key={update.id}
                        className={`transition-colors duration-300 ${
                          isRecordAnomaly
                            ? 'bg-red-50 border-l-4 border-red-400'
                            : index === 0 && !isPaused
                              ? update.direction === 'up'
                                ? 'bg-green-50'
                                : update.direction === 'down'
                                  ? 'bg-red-50'
                                  : ''
                              : ''
                        }`}
                      >
                        <td className="px-4 py-2 text-sm font-mono text-gray-600">
                          {formatTime(update.timestamp)}
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-right text-gray-900">
                          <div className="flex items-center justify-end gap-1">
                            {isRecordAnomaly && (
                              <div
                                className="relative group cursor-help"
                                title={`置信区间 ${(update.confidenceWidth * 100).toFixed(2)}% 超过阈值 ${(preferences.confidenceThreshold * 100).toFixed(1)}%`}
                              >
                                <span className="text-lg">⚠️</span>
                                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10">
                                  <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                                    <div className="font-semibold mb-1">异常预警</div>
                                    <div>
                                      置信区间: {(update.confidenceWidth * 100).toFixed(2)}%
                                    </div>
                                    <div>
                                      阈值: {(preferences.confidenceThreshold * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-red-300 mt-1">
                                      超出:{' '}
                                      {(
                                        (update.confidenceWidth -
                                          preferences.confidenceThreshold / 100) *
                                        100
                                      ).toFixed(2)}
                                      %
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            ${formatPriceValue(update.price)}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-right">
                          <span
                            className={`inline-flex items-center gap-1 ${
                              update.direction === 'up'
                                ? 'text-green-600'
                                : update.direction === 'down'
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                            }`}
                          >
                            {update.direction === 'up' && '↑'}
                            {update.direction === 'down' && '↓'}
                            {update.change >= 0 ? '+' : ''}
                            {update.change.toFixed(4)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm font-mono text-right">
                          <span className={`font-medium ${confidenceColor}`}>
                            {(update.confidenceWidth * 100).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
