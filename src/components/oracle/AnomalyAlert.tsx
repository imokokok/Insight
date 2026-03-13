'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from './DashboardCard';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
  PriceData,
  OracleProvider,
  Blockchain,
} from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('AnomalyAlert');

export type AnomalyType = 'price_spike' | 'price_deviation' | 'data_delay' | 'price_drop';
export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface AnomalyEvent {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  provider: OracleProvider;
  symbol: string;
  chain: Blockchain;
  timestamp: number;
  details: {
    currentValue: number;
    expectedValue?: number;
    deviationPercent?: number;
    delay?: number;
    threshold?: number;
  };
  message: string;
  acknowledged: boolean;
  resolved: boolean;
}

interface AnomalyStats {
  totalAnomalies: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  priceSpikeCount: number;
  priceDeviationCount: number;
  dataDelayCount: number;
  priceDropCount: number;
  avgResolutionTime: number;
}

interface AnomalyDetectionConfig {
  priceSpikeThreshold: number;
  priceDropThreshold: number;
  priceDeviationThreshold: number;
  dataDelayThreshold: number;
  checkInterval: number;
}

const PROVIDER_NAMES: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH_NETWORK]: 'Pyth',
  [OracleProvider.BAND_PROTOCOL]: 'Band',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.API3]: 'API3',
};

const SEVERITY_COLORS = {
  high: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  medium: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  low: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
};

const ANOMALY_TYPE_ICONS = {
  price_spike: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  ),
  price_deviation: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  ),
  data_delay: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  price_drop: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
      />
    </svg>
  ),
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function generateAnomalyId(): string {
  return `anomaly_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function AnomalyAlert() {
  const { t } = useI18n();
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [stats, setStats] = useState<AnomalyStats>({
    totalAnomalies: 0,
    highSeverityCount: 0,
    mediumSeverityCount: 0,
    lowSeverityCount: 0,
    priceSpikeCount: 0,
    priceDeviationCount: 0,
    dataDelayCount: 0,
    priceDropCount: 0,
    avgResolutionTime: 0,
  });
  const [filter, setFilter] = useState<{
    type: AnomalyType | 'all';
    severity: AnomalySeverity | 'all';
    acknowledged: 'all' | boolean;
  }>({
    type: 'all',
    severity: 'all',
    acknowledged: 'all',
  });
  const [config, setConfig] = useState<AnomalyDetectionConfig>({
    priceSpikeThreshold: 5,
    priceDropThreshold: 5,
    priceDeviationThreshold: 2,
    dataDelayThreshold: 60000,
    checkInterval: 15000,
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());
  const [loading, setLoading] = useState(false);
  const previousPricesRef = useRef<Map<string, { price: number; timestamp: number }>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      logger.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        return true;
      }
    }

    return false;
  }, []);

  const sendNotification = useCallback(
    (anomaly: AnomalyEvent) => {
      if (!notificationsEnabled || Notification.permission !== 'granted') return;

      const title = t('anomalyAlert.notificationTitle');
      const body = `${t(`anomalyAlert.type_${anomaly.type}`)} - ${PROVIDER_NAMES[anomaly.provider]} ${anomaly.symbol}`;

      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: anomaly.id,
        requireInteraction: anomaly.severity === 'high',
      });
    },
    [notificationsEnabled, t]
  );

  const detectAnomalies = useCallback(
    (prices: PriceData[]): AnomalyEvent[] => {
      const newAnomalies: AnomalyEvent[] = [];
      const now = Date.now();

      if (prices.length === 0) return newAnomalies;

      const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;

      prices.forEach((price) => {
        const key = `${price.provider}-${price.symbol}-${price.chain || 'default'}`;
        const previous = previousPricesRef.current.get(key);

        if (previous) {
          const priceChangePercent = Math.abs(
            ((price.price - previous.price) / previous.price) * 100
          );
          const timeDiff = now - previous.timestamp;

          if (priceChangePercent >= config.priceSpikeThreshold && price.price > previous.price) {
            newAnomalies.push({
              id: generateAnomalyId(),
              type: 'price_spike',
              severity:
                priceChangePercent >= config.priceSpikeThreshold * 2
                  ? 'high'
                  : priceChangePercent >= config.priceSpikeThreshold * 1.5
                    ? 'medium'
                    : 'low',
              provider: price.provider,
              symbol: price.symbol,
              chain: price.chain || Blockchain.ETHEREUM,
              timestamp: now,
              details: {
                currentValue: price.price,
                expectedValue: previous.price,
                deviationPercent: priceChangePercent,
                threshold: config.priceSpikeThreshold,
              },
              message: t('anomalyAlert.priceSpikeMessage', {
                provider: PROVIDER_NAMES[price.provider],
                symbol: price.symbol,
                percent: priceChangePercent.toFixed(2),
              }),
              acknowledged: false,
              resolved: false,
            });
          }

          if (priceChangePercent >= config.priceDropThreshold && price.price < previous.price) {
            newAnomalies.push({
              id: generateAnomalyId(),
              type: 'price_drop',
              severity:
                priceChangePercent >= config.priceDropThreshold * 2
                  ? 'high'
                  : priceChangePercent >= config.priceDropThreshold * 1.5
                    ? 'medium'
                    : 'low',
              provider: price.provider,
              symbol: price.symbol,
              chain: price.chain || Blockchain.ETHEREUM,
              timestamp: now,
              details: {
                currentValue: price.price,
                expectedValue: previous.price,
                deviationPercent: priceChangePercent,
                threshold: config.priceDropThreshold,
              },
              message: t('anomalyAlert.priceDropMessage', {
                provider: PROVIDER_NAMES[price.provider],
                symbol: price.symbol,
                percent: priceChangePercent.toFixed(2),
              }),
              acknowledged: false,
              resolved: false,
            });
          }

          if (timeDiff > config.dataDelayThreshold) {
            newAnomalies.push({
              id: generateAnomalyId(),
              type: 'data_delay',
              severity:
                timeDiff > config.dataDelayThreshold * 3
                  ? 'high'
                  : timeDiff > config.dataDelayThreshold * 2
                    ? 'medium'
                    : 'low',
              provider: price.provider,
              symbol: price.symbol,
              chain: price.chain || Blockchain.ETHEREUM,
              timestamp: now,
              details: {
                currentValue: price.price,
                delay: timeDiff,
                threshold: config.dataDelayThreshold,
              },
              message: t('anomalyAlert.dataDelayMessage', {
                provider: PROVIDER_NAMES[price.provider],
                symbol: price.symbol,
                delay: formatDuration(timeDiff),
              }),
              acknowledged: false,
              resolved: false,
            });
          }
        }

        const deviationPercent = Math.abs(((price.price - avgPrice) / avgPrice) * 100);
        if (deviationPercent >= config.priceDeviationThreshold) {
          newAnomalies.push({
            id: generateAnomalyId(),
            type: 'price_deviation',
            severity:
              deviationPercent >= config.priceDeviationThreshold * 2
                ? 'high'
                : deviationPercent >= config.priceDeviationThreshold * 1.5
                  ? 'medium'
                  : 'low',
            provider: price.provider,
            symbol: price.symbol,
            chain: price.chain || Blockchain.ETHEREUM,
            timestamp: now,
            details: {
              currentValue: price.price,
              expectedValue: avgPrice,
              deviationPercent,
              threshold: config.priceDeviationThreshold,
            },
            message: t('anomalyAlert.priceDeviationMessage', {
              provider: PROVIDER_NAMES[price.provider],
              symbol: price.symbol,
              percent: deviationPercent.toFixed(2),
            }),
            acknowledged: false,
            resolved: false,
          });
        }

        previousPricesRef.current.set(key, { price: price.price, timestamp: now });
      });

      return newAnomalies;
    },
    [config, t]
  );

  const fetchPricesAndDetect = useCallback(async () => {
    setLoading(true);
    try {
      const chainlinkClient = new ChainlinkClient();
      const pythClient = new PythNetworkClient();
      const bandClient = new BandProtocolClient();
      const umaClient = new UMAClient();
      const api3Client = new API3Client();

      const symbols = ['LINK', 'BTC', 'ETH'];
      const chain = Blockchain.ETHEREUM;

      const pricePromises: Promise<PriceData[]>[] = symbols.map(async (symbol) => {
        const results = await Promise.allSettled([
          chainlinkClient.getPrice(symbol, chain),
          pythClient.getPrice(symbol, chain),
          bandClient.getPrice(symbol, chain),
          umaClient.getPrice(symbol, chain),
          api3Client.getPrice(symbol, chain),
        ]);

        return results
          .filter((r): r is PromiseFulfilledResult<PriceData> => r.status === 'fulfilled')
          .map((r) => r.value);
      });

      const allPricesArrays = await Promise.all(pricePromises);
      const allPrices = allPricesArrays.flat();

      const newAnomalies = detectAnomalies(allPrices);

      if (newAnomalies.length > 0) {
        setAnomalies((prev) => {
          const updated = [...newAnomalies, ...prev].slice(0, 100);
          return updated;
        });

        newAnomalies.forEach((anomaly) => {
          sendNotification(anomaly);
        });
      }

      setLastCheck(Date.now());
    } catch (error) {
      logger.error(
        'Error fetching prices',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setLoading(false);
    }
  }, [detectAnomalies, sendNotification]);

  const updateStats = useCallback(() => {
    setAnomalies((currentAnomalies) => {
      const newStats: AnomalyStats = {
        totalAnomalies: currentAnomalies.length,
        highSeverityCount: currentAnomalies.filter((a) => a.severity === 'high').length,
        mediumSeverityCount: currentAnomalies.filter((a) => a.severity === 'medium').length,
        lowSeverityCount: currentAnomalies.filter((a) => a.severity === 'low').length,
        priceSpikeCount: currentAnomalies.filter((a) => a.type === 'price_spike').length,
        priceDeviationCount: currentAnomalies.filter((a) => a.type === 'price_deviation').length,
        dataDelayCount: currentAnomalies.filter((a) => a.type === 'data_delay').length,
        priceDropCount: currentAnomalies.filter((a) => a.type === 'price_drop').length,
        avgResolutionTime: 0,
      };

      const resolvedAnomalies = currentAnomalies.filter((a) => a.resolved);
      if (resolvedAnomalies.length > 0) {
        const totalTime = resolvedAnomalies.reduce((sum, a) => {
          return sum + (Date.now() - a.timestamp);
        }, 0);
        newStats.avgResolutionTime = totalTime / resolvedAnomalies.length;
      }

      setStats(newStats);
      return currentAnomalies;
    });
  }, []);

  useEffect(() => {
    fetchPricesAndDetect();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchPricesAndDetect, config.checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, config.checkInterval, fetchPricesAndDetect]);

  useEffect(() => {
    updateStats();
  }, [anomalies, updateStats]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  }, []);

  const acknowledgeAnomaly = (id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const resolveAnomaly = (id: string) => {
    setAnomalies((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  };

  const clearAnomaly = (id: string) => {
    setAnomalies((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAllAnomalies = () => {
    setAnomalies([]);
  };

  const filteredAnomalies = anomalies.filter((a) => {
    if (filter.type !== 'all' && a.type !== filter.type) return false;
    if (filter.severity !== 'all' && a.severity !== filter.severity) return false;
    if (filter.acknowledged !== 'all' && a.acknowledged !== filter.acknowledged) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={requestNotificationPermission}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              notificationsEnabled
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {notificationsEnabled
              ? t('anomalyAlert.notificationsEnabled')
              : t('anomalyAlert.enableNotifications')}
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {t('anomalyAlert.config')}
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {t('anomalyAlert.history')}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('anomalyAlert.autoRefresh')}</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={fetchPricesAndDetect}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t('anomalyAlert.refresh')}
          </button>
        </div>
      </div>

      {showConfig && (
        <DashboardCard title={t('anomalyAlert.configTitle')}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('anomalyAlert.priceSpikeThreshold')} (%)
              </label>
              <input
                type="number"
                value={config.priceSpikeThreshold}
                onChange={(e) =>
                  setConfig({ ...config, priceSpikeThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('anomalyAlert.priceDropThreshold')} (%)
              </label>
              <input
                type="number"
                value={config.priceDropThreshold}
                onChange={(e) =>
                  setConfig({ ...config, priceDropThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('anomalyAlert.priceDeviationThreshold')} (%)
              </label>
              <input
                type="number"
                value={config.priceDeviationThreshold}
                onChange={(e) =>
                  setConfig({ ...config, priceDeviationThreshold: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                min="0"
                step="0.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('anomalyAlert.dataDelayThreshold')} (秒)
              </label>
              <input
                type="number"
                value={config.dataDelayThreshold / 1000}
                onChange={(e) =>
                  setConfig({ ...config, dataDelayThreshold: Number(e.target.value) * 1000 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('anomalyAlert.checkInterval')} (秒)
              </label>
              <input
                type="number"
                value={config.checkInterval / 1000}
                onChange={(e) =>
                  setConfig({ ...config, checkInterval: Number(e.target.value) * 1000 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                min="5"
              />
            </div>
          </div>
        </DashboardCard>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-gray-900">{stats.totalAnomalies}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.totalAnomalies')}</div>
        </DashboardCard>

        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.highSeverityCount}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.highSeverity')}</div>
        </DashboardCard>

        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.mediumSeverityCount}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.mediumSeverity')}</div>
        </DashboardCard>

        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.lowSeverityCount}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.lowSeverity')}</div>
        </DashboardCard>

        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.priceSpikeCount}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.priceSpikeCount')}</div>
        </DashboardCard>

        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.priceDeviationCount}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.priceDeviationCount')}</div>
        </DashboardCard>

        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.dataDelayCount}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.dataDelayCount')}</div>
        </DashboardCard>

        <DashboardCard className="text-center">
          <div className="text-2xl font-bold text-pink-600">{stats.priceDropCount}</div>
          <div className="text-xs text-gray-600 mt-1">{t('anomalyAlert.priceDropCount')}</div>
        </DashboardCard>
      </div>

      <DashboardCard
        title={t('anomalyAlert.realtimeAlerts')}
        headerAction={
          <button
            onClick={clearAllAnomalies}
            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            {t('anomalyAlert.clearAll')}
          </button>
        }
      >
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value as AnomalyType | 'all' })}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('anomalyAlert.allTypes')}</option>
            <option value="price_spike">{t('anomalyAlert.type_price_spike')}</option>
            <option value="price_deviation">{t('anomalyAlert.type_price_deviation')}</option>
            <option value="data_delay">{t('anomalyAlert.type_data_delay')}</option>
            <option value="price_drop">{t('anomalyAlert.type_price_drop')}</option>
          </select>

          <select
            value={filter.severity}
            onChange={(e) =>
              setFilter({ ...filter, severity: e.target.value as AnomalySeverity | 'all' })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('anomalyAlert.allSeverities')}</option>
            <option value="high">{t('anomalyAlert.severity_high')}</option>
            <option value="medium">{t('anomalyAlert.severity_medium')}</option>
            <option value="low">{t('anomalyAlert.severity_low')}</option>
          </select>

          <select
            value={filter.acknowledged === 'all' ? 'all' : filter.acknowledged ? 'true' : 'false'}
            onChange={(e) =>
              setFilter({
                ...filter,
                acknowledged: e.target.value === 'all' ? 'all' : e.target.value === 'true',
              })
            }
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('anomalyAlert.allStatus')}</option>
            <option value="false">{t('anomalyAlert.unacknowledged')}</option>
            <option value="true">{t('anomalyAlert.acknowledged')}</option>
          </select>
        </div>

        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>{t('anomalyAlert.noAnomalies')}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredAnomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`border rounded-lg p-4 ${
                  SEVERITY_COLORS[anomaly.severity].border
                } ${anomaly.acknowledged ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${SEVERITY_COLORS[anomaly.severity].bg}`}>
                      <div className={SEVERITY_COLORS[anomaly.severity].text}>
                        {ANOMALY_TYPE_ICONS[anomaly.type]}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            SEVERITY_COLORS[anomaly.severity].bg
                          } ${SEVERITY_COLORS[anomaly.severity].text}`}
                        >
                          {t(`anomalyAlert.severity_${anomaly.severity}`)}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {t(`anomalyAlert.type_${anomaly.type}`)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{anomaly.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>
                          {PROVIDER_NAMES[anomaly.provider]} • {anomaly.symbol}
                        </span>
                        <span>{formatTime(anomaly.timestamp)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!anomaly.acknowledged && (
                      <button
                        onClick={() => acknowledgeAnomaly(anomaly.id)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        {t('anomalyAlert.acknowledge')}
                      </button>
                    )}
                    {!anomaly.resolved && (
                      <button
                        onClick={() => resolveAnomaly(anomaly.id)}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        {t('anomalyAlert.resolve')}
                      </button>
                    )}
                    <button
                      onClick={() => clearAnomaly(anomaly.id)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      {t('anomalyAlert.clear')}
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">{t('anomalyAlert.currentValue')}:</span>
                      <span className="ml-1 font-medium">
                        ${anomaly.details.currentValue.toFixed(4)}
                      </span>
                    </div>
                    {anomaly.details.expectedValue !== undefined && (
                      <div>
                        <span className="text-gray-500">{t('anomalyAlert.expectedValue')}:</span>
                        <span className="ml-1 font-medium">
                          ${anomaly.details.expectedValue.toFixed(4)}
                        </span>
                      </div>
                    )}
                    {anomaly.details.deviationPercent !== undefined && (
                      <div>
                        <span className="text-gray-500">{t('anomalyAlert.deviation')}:</span>
                        <span className="ml-1 font-medium">
                          {anomaly.details.deviationPercent.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {anomaly.details.delay !== undefined && (
                      <div>
                        <span className="text-gray-500">{t('anomalyAlert.delay')}:</span>
                        <span className="ml-1 font-medium">
                          {formatDuration(anomaly.details.delay)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          {t('anomalyAlert.lastCheck')}: {formatTime(lastCheck)}
        </div>
      </DashboardCard>

      {showHistory && (
        <DashboardCard title={t('anomalyAlert.historyTitle')}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">{t('anomalyAlert.last24Hours')}</div>
                <div className="text-3xl font-bold text-gray-900">
                  {anomalies.filter((a) => Date.now() - a.timestamp < 24 * 60 * 60 * 1000).length}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">{t('anomalyAlert.last7Days')}</div>
                <div className="text-3xl font-bold text-gray-900">
                  {
                    anomalies.filter((a) => Date.now() - a.timestamp < 7 * 24 * 60 * 60 * 1000)
                      .length
                  }
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">
                  {t('anomalyAlert.avgResolutionTime')}
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.avgResolutionTime > 0 ? formatDuration(stats.avgResolutionTime) : '--'}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('anomalyAlert.typeDistribution')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('anomalyAlert.type_price_spike')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${stats.totalAnomalies > 0 ? (stats.priceSpikeCount / stats.totalAnomalies) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {stats.priceSpikeCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('anomalyAlert.type_price_deviation')}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${stats.totalAnomalies > 0 ? (stats.priceDeviationCount / stats.totalAnomalies) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {stats.priceDeviationCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('anomalyAlert.type_data_delay')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{
                          width: `${stats.totalAnomalies > 0 ? (stats.dataDelayCount / stats.totalAnomalies) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {stats.dataDelayCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('anomalyAlert.type_price_drop')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-pink-600 h-2 rounded-full"
                        style={{
                          width: `${stats.totalAnomalies > 0 ? (stats.priceDropCount / stats.totalAnomalies) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {stats.priceDropCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('anomalyAlert.severityDistribution')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('anomalyAlert.severity_high')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-600 h-2 rounded-full"
                        style={{
                          width: `${stats.totalAnomalies > 0 ? (stats.highSeverityCount / stats.totalAnomalies) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {stats.highSeverityCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('anomalyAlert.severity_medium')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{
                          width: `${stats.totalAnomalies > 0 ? (stats.mediumSeverityCount / stats.totalAnomalies) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {stats.mediumSeverityCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{t('anomalyAlert.severity_low')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{
                          width: `${stats.totalAnomalies > 0 ? (stats.lowSeverityCount / stats.totalAnomalies) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {stats.lowSeverityCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      )}
    </div>
  );
}
