'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DashboardCard } from '../common/DashboardCard';
import { useTranslations } from 'next-intl';

export type AlertType = 'sudden_expansion' | 'sustained_high';
export type AlertSeverity = 'warning' | 'critical';

export interface ConfidenceAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  timestamp: number;
  symbol: string;
  details: {
    previousWidth?: number;
    currentWidth: number;
    expansionPercent?: number;
    duration?: number;
    threshold: number;
  };
  message: string;
  acknowledged: boolean;
}

interface ConfidenceDataPoint {
  timestamp: number;
  width: number;
  symbol: string;
}

interface AlertStats {
  totalAlerts: number;
  warningCount: number;
  criticalCount: number;
  suddenExpansionCount: number;
  sustainedHighCount: number;
  acknowledgedCount: number;
  unacknowledgedCount: number;
}

interface ConfidenceAlertPanelProps {
  symbol?: string;
  threshold?: number;
  data?: ConfidenceDataPoint[];
  className?: string;
  checkInterval?: number;
  onAlert?: (alert: ConfidenceAlert) => void;
}

const ALERT_CONFIG = {
  suddenExpansion: {
    timeWindow: 5 * 60 * 1000,
    expansionThreshold: 0.5,
  },
  sustainedHigh: {
    duration: 10 * 60 * 1000,
    threshold: 0.003,
  },
};

const SEVERITY_CONFIG = {
  warning: {
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
    iconBg: 'bg-yellow-500',
  },
  critical: {
    bgColor: 'bg-red-100',
    textColor: 'text-red-700',
    borderColor: 'border-red-300',
    iconBg: 'bg-red-500',
  },
};

const ALERT_TYPE_CONFIG = {
  sudden_expansion: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  sustained_high: {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(
  ms: number,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes > 0) {
    return t('confidenceAlert.duration.minutes', { minutes, seconds });
  }
  return t('confidenceAlert.duration.seconds', { seconds });
}

function generateMockData(symbol: string): ConfidenceDataPoint[] {
  const now = Date.now();
  const data: ConfidenceDataPoint[] = [];

  for (let i = 60; i >= 0; i--) {
    const timestamp = now - i * 60000;
    const baseWidth = 0.0015;
    const randomVariance = (Math.random() - 0.5) * 0.001;
    let width = baseWidth + randomVariance;

    if (i === 30) {
      width = 0.004;
    }
    if (i <= 15 && i >= 5) {
      width = 0.0035 + Math.random() * 0.0005;
    }

    data.push({
      timestamp,
      width: Number(width.toFixed(6)),
      symbol,
    });
  }

  return data;
}

export function ConfidenceAlertPanel({
  symbol = 'BTC/USD',
  threshold = 0.003,
  data: propData,
  className,
  checkInterval = 60000,
  onAlert,
}: ConfidenceAlertPanelProps) {
  const t = useTranslations();
  const [alerts, setAlerts] = useState<ConfidenceAlert[]>([]);
  const [data, setData] = useState<ConfidenceDataPoint[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastCheck, setLastCheck] = useState<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousWidthRef = useRef<Map<string, { width: number; timestamp: number }>>(new Map());
  const highWidthStartRef = useRef<Map<string, number>>(new Map());

  const detectSuddenExpansion = useCallback(
    (currentData: ConfidenceDataPoint[]): ConfidenceAlert | null => {
      if (currentData.length < 2) return null;

      const current = currentData[currentData.length - 1];
      const key = current.symbol;
      const previous = previousWidthRef.current.get(key);

      if (!previous) {
        previousWidthRef.current.set(key, {
          width: current.width,
          timestamp: current.timestamp,
        });
        return null;
      }

      const timeDiff = current.timestamp - previous.timestamp;
      if (timeDiff > ALERT_CONFIG.suddenExpansion.timeWindow) {
        previousWidthRef.current.set(key, {
          width: current.width,
          timestamp: current.timestamp,
        });
        return null;
      }

      if (previous.width > 0) {
        const expansionPercent = (current.width - previous.width) / previous.width;

        if (expansionPercent >= ALERT_CONFIG.suddenExpansion.expansionThreshold) {
          const severity: AlertSeverity = expansionPercent >= 1 ? 'critical' : 'warning';

          const alert: ConfidenceAlert = {
            id: generateAlertId(),
            type: 'sudden_expansion',
            severity,
            timestamp: current.timestamp,
            symbol: current.symbol,
            details: {
              previousWidth: previous.width,
              currentWidth: current.width,
              expansionPercent: expansionPercent * 100,
              threshold: ALERT_CONFIG.suddenExpansion.expansionThreshold * 100,
            },
            message: t('confidenceAlert.message.suddenExpansion', {
              symbol: current.symbol,
              duration: formatDuration(timeDiff, t),
              percent: (expansionPercent * 100).toFixed(1),
            }),
            acknowledged: false,
          };

          previousWidthRef.current.set(key, {
            width: current.width,
            timestamp: current.timestamp,
          });

          return alert;
        }
      }

      previousWidthRef.current.set(key, {
        width: current.width,
        timestamp: current.timestamp,
      });

      return null;
    },
    [t]
  );

  const detectSustainedHigh = useCallback(
    (currentData: ConfidenceDataPoint[]): ConfidenceAlert | null => {
      if (currentData.length < 2) return null;

      const current = currentData[currentData.length - 1];
      const key = current.symbol;

      if (current.width > threshold) {
        const startTime = highWidthStartRef.current.get(key);

        if (!startTime) {
          highWidthStartRef.current.set(key, current.timestamp);
          return null;
        }

        const duration = current.timestamp - startTime;

        if (duration >= ALERT_CONFIG.sustainedHigh.duration) {
          const severity: AlertSeverity =
            duration >= ALERT_CONFIG.sustainedHigh.duration * 2 ? 'critical' : 'warning';

          const alert: ConfidenceAlert = {
            id: generateAlertId(),
            type: 'sustained_high',
            severity,
            timestamp: current.timestamp,
            symbol: current.symbol,
            details: {
              currentWidth: current.width,
              duration,
              threshold,
            },
            message: t('confidenceAlert.message.sustainedHigh', {
              symbol: current.symbol,
              duration: formatDuration(duration, t),
              threshold: threshold.toFixed(4),
            }),
            acknowledged: false,
          };

          return alert;
        }
      } else {
        highWidthStartRef.current.delete(key);
      }

      return null;
    },
    [threshold, t]
  );

  const runDetection = useCallback(() => {
    const currentData = data;
    if (currentData.length === 0) return;

    const newAlerts: ConfidenceAlert[] = [];

    const suddenAlert = detectSuddenExpansion(currentData);
    if (suddenAlert) {
      newAlerts.push(suddenAlert);
    }

    const sustainedAlert = detectSustainedHigh(currentData);
    if (sustainedAlert) {
      newAlerts.push(sustainedAlert);
    }

    if (newAlerts.length > 0) {
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const uniqueNewAlerts = newAlerts.filter((a) => !existingIds.has(a.id));
        return [...uniqueNewAlerts, ...prev].slice(0, 100);
      });

      newAlerts.forEach((alert) => {
        onAlert?.(alert);
      });
    }

    setLastCheck(Date.now());
  }, [data, detectSuddenExpansion, detectSustainedHigh, onAlert]);

  const refreshData = useCallback(() => {
    const newData = propData || generateMockData(symbol);
    setData(newData);
  }, [propData, symbol]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (data.length > 0) {
      runDetection();
    }
  }, [data, runDetection]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(refreshData, checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, checkInterval, refreshData]);

  const stats = useMemo<AlertStats>(() => {
    return {
      totalAlerts: alerts.length,
      warningCount: alerts.filter((a) => a.severity === 'warning').length,
      criticalCount: alerts.filter((a) => a.severity === 'critical').length,
      suddenExpansionCount: alerts.filter((a) => a.type === 'sudden_expansion').length,
      sustainedHighCount: alerts.filter((a) => a.type === 'sustained_high').length,
      acknowledgedCount: alerts.filter((a) => a.acknowledged).length,
      unacknowledgedCount: alerts.filter((a) => !a.acknowledged).length,
    };
  }, [alerts]);

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)));
  };

  const dismissAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const currentWidth = data.length > 0 ? data[data.length - 1].width : 0;
  const isAboveThreshold = currentWidth > threshold;

  return (
    <DashboardCard
      title={t('confidenceAlert.title')}
      headerAction={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('confidenceAlert.autoRefresh')}</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-5 w-9 items-center  transition-colors ${
                autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform  bg-white transition-transform ${
                  autoRefresh ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <button
            onClick={refreshData}
            className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700  hover:bg-blue-200 font-medium"
          >
            {t('confidenceAlert.refresh')}
          </button>
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-50  p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{t('confidenceAlert.currentWidth')}</p>
            <p
              className={`text-xl font-bold ${isAboveThreshold ? 'text-red-600' : 'text-gray-900'}`}
            >
              {currentWidth.toFixed(6)}
            </p>
          </div>
          <div className="bg-red-50  p-3 text-center">
            <p className="text-xs text-red-600 mb-1">{t('confidenceAlert.criticalAlerts')}</p>
            <p className="text-xl font-bold text-red-700">{stats.criticalCount}</p>
          </div>
          <div className="bg-yellow-50  p-3 text-center">
            <p className="text-xs text-yellow-600 mb-1">{t('confidenceAlert.warningAlerts')}</p>
            <p className="text-xl font-bold text-yellow-700">{stats.warningCount}</p>
          </div>
          <div className="bg-blue-50  p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">{t('confidenceAlert.unacknowledged')}</p>
            <p className="text-xl font-bold text-blue-700">{stats.unacknowledgedCount}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2  bg-red-500" />
            <span>{t('confidenceAlert.criticalRule')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2  bg-yellow-500" />
            <span>{t('confidenceAlert.warningRule')}</span>
          </div>
        </div>

        <div className="bg-blue-50  p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-blue-600">
              {t('confidenceAlert.threshold')}: {threshold.toFixed(4)}
            </span>
            <span className="text-xs text-blue-600">
              {t('confidenceAlert.current')}:{' '}
              {isAboveThreshold ? t('confidenceAlert.exceeded') : t('confidenceAlert.normal')}
            </span>
          </div>
          <div className="w-full h-2 bg-blue-200  overflow-hidden">
            <div
              className={`h-full  transition-all duration-300 ${
                isAboveThreshold ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{
                width: `${Math.min((currentWidth / threshold) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">{t('confidenceAlert.alertList')}</h4>
            {alerts.length > 0 && (
              <button
                onClick={clearAllAlerts}
                className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
              >
                {t('confidenceAlert.clearAll')}
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">{t('confidenceAlert.noAlerts')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('confidenceAlert.noAlertsDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {alerts.map((alert) => {
                const severityConfig = SEVERITY_CONFIG[alert.severity];
                const typeConfig = ALERT_TYPE_CONFIG[alert.type];

                return (
                  <div
                    key={alert.id}
                    className={`border-2  p-3 ${
                      severityConfig.borderColor
                    } ${alert.acknowledged ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <div
                          className={`p-1.5 rounded ${severityConfig.iconBg} text-white flex-shrink-0`}
                        >
                          {typeConfig.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${
                                severityConfig.bgColor
                              } ${severityConfig.textColor}`}
                            >
                              {t(`confidenceAlert.severity.${alert.severity}`)}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {t(`confidenceAlert.type.${alert.type}`)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{alert.message}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{alert.symbol}</span>
                            <span>{formatTime(alert.timestamp)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            {t('confidenceAlert.acknowledge')}
                          </button>
                        )}
                        <button
                          onClick={() => dismissAlert(alert.id)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          {t('confidenceAlert.dismiss')}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">
                            {t('confidenceAlert.currentWidthLabel')}
                          </span>
                          <span className="ml-1 font-medium text-gray-900">
                            {alert.details.currentWidth.toFixed(6)}
                          </span>
                        </div>
                        {alert.details.previousWidth !== undefined && (
                          <div>
                            <span className="text-gray-500">
                              {t('confidenceAlert.previousWidthLabel')}
                            </span>
                            <span className="ml-1 font-medium text-gray-900">
                              {alert.details.previousWidth.toFixed(6)}
                            </span>
                          </div>
                        )}
                        {alert.details.expansionPercent !== undefined && (
                          <div>
                            <span className="text-gray-500">
                              {t('confidenceAlert.expansionPercentLabel')}
                            </span>
                            <span className="ml-1 font-medium text-red-600">
                              +{alert.details.expansionPercent.toFixed(1)}%
                            </span>
                          </div>
                        )}
                        {alert.details.duration !== undefined && (
                          <div>
                            <span className="text-gray-500">
                              {t('confidenceAlert.durationLabel')}
                            </span>
                            <span className="ml-1 font-medium text-orange-600">
                              {formatDuration(alert.details.duration, t)}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">
                            {t('confidenceAlert.thresholdLabel')}
                          </span>
                          <span className="ml-1 font-medium text-gray-900">
                            {alert.details.threshold.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('confidenceAlert.alertStats')}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50  p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">
                  {t('confidenceAlert.suddenExpansion')}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {stats.suddenExpansionCount}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-200  overflow-hidden">
                <div
                  className="h-full bg-orange-500 "
                  style={{
                    width: `${
                      stats.totalAlerts > 0
                        ? (stats.suddenExpansionCount / stats.totalAlerts) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div className="bg-gray-50  p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{t('confidenceAlert.sustainedHigh')}</span>
                <span className="text-sm font-bold text-gray-900">{stats.sustainedHighCount}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200  overflow-hidden">
                <div
                  className="h-full bg-purple-500 "
                  style={{
                    width: `${
                      stats.totalAlerts > 0
                        ? (stats.sustainedHighCount / stats.totalAlerts) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 text-right">
          {t('confidenceAlert.lastCheck')}: {formatTime(lastCheck)}
        </div>
      </div>
    </DashboardCard>
  );
}
