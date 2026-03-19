'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { DashboardCard } from '../DashboardCard';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  PriceData,
  Blockchain,
} from '@/lib/oracles';
import { createLogger } from '@/lib/utils/logger';
import { AnomalyEvent, AnomalyStats, AnomalyDetectionConfig, AnomalyFilter } from './types';
import { PROVIDER_NAMES, formatTime, generateAnomalyId } from './anomalyUtils';
import { AlertItem } from './AlertItem';
import { AlertFilters } from './AlertFilters';
import { AlertStats } from './AlertStats';
import { AlertConfig } from './AlertConfig';
import { AlertHistory } from './AlertHistory';

const logger = createLogger('AnomalyAlert');

export * from './types';

export function AnomalyAlert() {
  const t = useTranslations();
  const locale = useLocale();
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
  const [filter, setFilter] = useState<AnomalyFilter>({
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
                delay: formatDuration(timeDiff, t),
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
      const pythClient = new PythClient();
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
            className={`px-4 py-2  text-sm font-medium flex items-center gap-2 ${
              notificationsEnabled
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
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
            className="px-4 py-2 bg-gray-100 text-gray-700  hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('anomalyAlert.config')}
          </button>

          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 bg-gray-100 text-gray-700  hover:bg-gray-200 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
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
              className={`relative inline-flex h-6 w-11 items-center  transition-colors ${
                autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform  bg-white transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={fetchPricesAndDetect}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
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

      {showConfig && <AlertConfig config={config} onConfigChange={setConfig} />}

      <AlertStats stats={stats} />

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
        <AlertFilters filter={filter} onFilterChange={setFilter} />

        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
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
              <AlertItem
                key={anomaly.id}
                anomaly={anomaly}
                locale={locale}
                onAcknowledge={acknowledgeAnomaly}
                onResolve={resolveAnomaly}
                onClear={clearAnomaly}
              />
            ))}
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          {t('anomalyAlert.lastCheck')}: {formatTime(lastCheck, locale)}
        </div>
      </DashboardCard>

      {showHistory && <AlertHistory anomalies={anomalies} stats={stats} />}
    </div>
  );
}
