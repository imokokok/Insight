'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { ExtremeMarketEvent } from '@/hooks/usePriceHistory';

interface ExtremeMarketAnalysisProps {
  events: ExtremeMarketEvent[];
}

const EVENT_TYPE_CONFIG = {
  flash_crash: {
    color: '#ef4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
        />
      </svg>
    ),
  },
  pump: {
    color: '#10b981',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
        />
      </svg>
    ),
  },
  high_volatility: {
    color: '#f59e0b',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  liquidity_crisis: {
    color: '#8b5cf6',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

const SEVERITY_CONFIG = {
  low: { color: '#10b981', label: '低' },
  medium: { color: '#f59e0b', label: '中' },
  high: { color: '#ef4444', label: '高' },
};

export function ExtremeMarketAnalysis({ events }: ExtremeMarketAnalysisProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    if (events.length === 0) {
      return {
        totalEvents: 0,
        avgRecoveryTime: 0,
        avgDeviation: 0,
        highSeverityCount: 0,
      };
    }

    const avgRecoveryTime = events.reduce((sum, e) => sum + e.recoveryTime, 0) / events.length;
    const avgDeviation = events.reduce((sum, e) => sum + Math.abs(e.deviation), 0) / events.length;
    const highSeverityCount = events.filter((e) => e.severity === 'high').length;

    return {
      totalEvents: events.length,
      avgRecoveryTime: Math.round(avgRecoveryTime),
      avgDeviation: avgDeviation.toFixed(4),
      highSeverityCount,
    };
  }, [events]);

  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((event) => {
      counts[event.type] = (counts[event.type] || 0) + 1;
    });
    return counts;
  }, [events]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('pyth.extreme.title')}</h3>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
            {stats.totalEvents} {t('pyth.extreme.events')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">{t('pyth.extreme.totalEvents')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">{t('pyth.extreme.avgRecovery')}</p>
          <p className="text-2xl font-bold text-blue-600">{stats.avgRecoveryTime}s</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">{t('pyth.extreme.avgDeviation')}</p>
          <p className="text-2xl font-bold text-orange-600">{stats.avgDeviation}%</p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">{t('pyth.extreme.highSeverity')}</p>
          <p className="text-2xl font-bold text-red-600">{stats.highSeverityCount}</p>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{t('pyth.extreme.eventTypes')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
            <div
              key={type}
              className={`p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: config.color }}>{config.icon}</span>
                <span className="text-sm font-medium text-gray-700">
                  {t(`pyth.extreme.type_${type}`)}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: config.color }}>
                {eventTypeCounts[type] || 0}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">{t('pyth.extreme.timeline')}</h4>
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('pyth.extreme.noEvents')}</div>
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-4">
              {events.map((event, index) => {
                const typeConfig = EVENT_TYPE_CONFIG[event.type];
                const severityConfig = SEVERITY_CONFIG[event.severity];

                return (
                  <div key={event.id} className="relative pl-10">
                    <div
                      className="absolute left-2.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{ backgroundColor: typeConfig.color, top: '1.25rem' }}
                    />

                    <div
                      className={`p-4 rounded-lg border ${typeConfig.bgColor} ${typeConfig.borderColor}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
                          <span className="font-medium text-gray-900">
                            {t(`pyth.extreme.type_${event.type}`)}
                          </span>
                          <span
                            className="px-2 py-0.5 text-xs font-medium rounded-full"
                            style={{
                              backgroundColor: `${severityConfig.color}20`,
                              color: severityConfig.color,
                            }}
                          >
                            {severityConfig.label}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">{event.date}</span>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{event.description}</p>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">{t('pyth.extreme.oraclePrice')}:</span>
                          <span className="ml-2 font-mono font-medium">
                            ${event.oraclePrice.toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('pyth.extreme.marketPrice')}:</span>
                          <span className="ml-2 font-mono font-medium">
                            ${event.marketPrice.toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('pyth.extreme.recovery')}:</span>
                          <span className="ml-2 font-medium text-blue-600">
                            {event.recoveryTime}s
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            {t('pyth.extreme.deviation')}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(Math.abs(event.deviation) * 20, 100)}%`,
                                  backgroundColor: typeConfig.color,
                                }}
                              />
                            </div>
                            <span className="text-sm font-bold" style={{ color: typeConfig.color }}>
                              {event.deviation.toFixed(3)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
