'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardCard } from './DashboardCard';

export type UpdateInterval = 5000 | 10000 | 30000 | 60000;

export type ConnectionStatus = 'connected' | 'unstable' | 'disconnected';

export interface RealtimeUpdateControlProps {
  autoUpdate?: boolean;
  updateInterval?: UpdateInterval;
  onAutoUpdateChange?: (enabled: boolean) => void;
  onIntervalChange?: (interval: UpdateInterval) => void;
  onManualRefresh?: () => void;
  lastUpdateTime?: Date | null;
  connectionStatus?: ConnectionStatus;
  className?: string;
}

const INTERVAL_OPTIONS: { value: UpdateInterval; labelKey: string }[] = [
  { value: 5000, labelKey: 'realtimeUpdate.interval.5s' },
  { value: 10000, labelKey: 'realtimeUpdate.interval.10s' },
  { value: 30000, labelKey: 'realtimeUpdate.interval.30s' },
  { value: 60000, labelKey: 'realtimeUpdate.interval.1m' },
];

export function RealtimeUpdateControl({
  autoUpdate = true,
  updateInterval = 10000,
  onAutoUpdateChange,
  onIntervalChange,
  onManualRefresh,
  lastUpdateTime = null,
  connectionStatus = 'connected',
  className = '',
}: RealtimeUpdateControlProps) {
  const t = useTranslations();
  const [isAutoUpdateEnabled, setIsAutoUpdateEnabled] = useState(autoUpdate);
  const [currentInterval, setCurrentInterval] = useState<UpdateInterval>(updateInterval);
  const [countdown, setCountdown] = useState(() => (autoUpdate ? updateInterval / 1000 : 0));
  const [currentTime, setCurrentTime] = useState(new Date());

  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const clockRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<UpdateInterval>(updateInterval);
  const autoUpdateEnabledRef = useRef(autoUpdate);

  useEffect(() => {
    autoUpdateEnabledRef.current = isAutoUpdateEnabled;
  }, [isAutoUpdateEnabled]);

  useEffect(() => {
    intervalRef.current = currentInterval;
  }, [currentInterval]);

  useEffect(() => {
    clockRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      if (clockRef.current) {
        clearInterval(clockRef.current);
      }
    };
  }, []);

  useEffect(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (!autoUpdateEnabledRef.current) {
          return 0;
        }
        if (prev <= 1) {
          return intervalRef.current / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const handleAutoUpdateToggle = useCallback(() => {
    const newValue = !isAutoUpdateEnabled;
    setIsAutoUpdateEnabled(newValue);
    if (newValue) {
      setCountdown(currentInterval / 1000);
    }
    onAutoUpdateChange?.(newValue);
  }, [isAutoUpdateEnabled, onAutoUpdateChange, currentInterval]);

  const handleIntervalChange = useCallback(
    (interval: UpdateInterval) => {
      setCurrentInterval(interval);
      if (isAutoUpdateEnabled) {
        setCountdown(interval / 1000);
      }
      onIntervalChange?.(interval);
    },
    [onIntervalChange, isAutoUpdateEnabled]
  );

  const handleManualRefresh = useCallback(() => {
    onManualRefresh?.();
    if (isAutoUpdateEnabled) {
      setCountdown(currentInterval / 1000);
    }
  }, [onManualRefresh, isAutoUpdateEnabled, currentInterval]);

  const formatLastUpdateTime = (time: Date | null) => {
    if (!time) return t('realtimeUpdate.noData');
    return time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getConnectionStatusConfig = (status: ConnectionStatus) => {
    const configs = {
      connected: {
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        labelKey: 'realtimeUpdate.connectionStatus.connected',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
      unstable: {
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        labelKey: 'realtimeUpdate.connectionStatus.unstable',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
      disconnected: {
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        labelKey: 'realtimeUpdate.connectionStatus.disconnected',
        icon: (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
    };
    return configs[status];
  };

  const statusConfig = getConnectionStatusConfig(connectionStatus);

  return (
    <DashboardCard title={t('realtimeUpdate.title')} className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {t('realtimeUpdate.autoUpdate')}
            </span>
            <button
              onClick={handleAutoUpdateToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isAutoUpdateEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isAutoUpdateEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${statusConfig.bgColor}`}>
            <span className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
            <span className={`text-sm font-medium ${statusConfig.textColor}`}>
              {t(statusConfig.labelKey)}
            </span>
            {statusConfig.icon}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('realtimeUpdate.updateInterval')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {INTERVAL_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleIntervalChange(option.value)}
                disabled={!isAutoUpdateEnabled}
                className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                  currentInterval === option.value
                    ? 'bg-blue-600 text-white'
                    : isAutoUpdateEnabled
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {t('realtimeUpdate.countdown')}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {isAutoUpdateEnabled ? `${countdown}${t('common.unit')}` : '--'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-4 h-4 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {t('realtimeUpdate.lastUpdate')}
              </span>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatLastUpdateTime(lastUpdateTime)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {t('realtimeUpdate.currentTime')}: {currentTime.toLocaleTimeString('zh-CN')}
          </div>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('realtimeUpdate.manualRefresh')}
          </button>
        </div>
      </div>
    </DashboardCard>
  );
}
