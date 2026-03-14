'use client';

import { useMemo } from 'react';
import { DashboardCard } from './DashboardCard';
import { useI18n } from '@/lib/i18n/provider';

export interface VolatilityAlertProps {
  threshold: number;
  currentVolatility: number;
  className?: string;
}

interface HistoricalEvent {
  date: string;
  volatility: number;
  duration: string;
  impact: string;
}

interface AlertLevel {
  level: 'low' | 'medium' | 'high';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

function getAlertLevel(
  currentVolatility: number,
  threshold: number,
  t: (key: string) => string
): AlertLevel {
  const ratio = currentVolatility / threshold;

  if (ratio < 1) {
    return {
      level: 'low',
      label: t('volatilityAlert.riskLevel.low'),
      color: '#059669',
      bgColor: '#ECFDF5',
      borderColor: '#10B981',
      icon: '✓',
    };
  } else if (ratio < 1.5) {
    return {
      level: 'medium',
      label: t('volatilityAlert.riskLevel.medium'),
      color: '#D97706',
      bgColor: '#FFFBEB',
      borderColor: '#F59E0B',
      icon: '⚠',
    };
  } else {
    return {
      level: 'high',
      label: t('volatilityAlert.riskLevel.high'),
      color: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#EF4444',
      icon: '⚠',
    };
  }
}

function generateHistoricalEvents(
  currentVolatility: number,
  t: (key: string) => string
): HistoricalEvent[] {
  const events: HistoricalEvent[] = [];
  const baseDate = new Date();

  const eventConfigs = [
    {
      daysAgo: 7,
      volatilityMultiplier: 1.1,
      duration: t('volatilityAlert.duration.2hours'),
      impact: t('volatilityAlert.impact.priceCorrection3'),
    },
    {
      daysAgo: 14,
      volatilityMultiplier: 1.3,
      duration: t('volatilityAlert.duration.4hours'),
      impact: t('volatilityAlert.impact.priceFluctuation5'),
    },
    {
      daysAgo: 30,
      volatilityMultiplier: 0.9,
      duration: t('volatilityAlert.duration.1hour'),
      impact: t('volatilityAlert.impact.priceCorrection2'),
    },
  ];

  eventConfigs.forEach((config) => {
    const eventDate = new Date(baseDate);
    eventDate.setDate(eventDate.getDate() - config.daysAgo);

    events.push({
      date: eventDate.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      volatility: currentVolatility * config.volatilityMultiplier,
      duration: config.duration,
      impact: config.impact,
    });
  });

  return events;
}

export function VolatilityAlert({ threshold, currentVolatility, className }: VolatilityAlertProps) {
  const { t } = useI18n();

  const alertLevel = useMemo(
    () => getAlertLevel(currentVolatility, threshold, t),
    [currentVolatility, threshold, t]
  );

  const historicalEvents = useMemo(
    () => generateHistoricalEvents(currentVolatility, t),
    [currentVolatility, t]
  );

  const isAlertActive = currentVolatility >= threshold;

  return (
    <DashboardCard title={t('volatilityAlert.title')} className={className}>
      <div className="space-y-4">
        <div
          className="rounded-lg p-4 border-2 transition-all duration-300"
          style={{
            backgroundColor: alertLevel.bgColor,
            borderColor: alertLevel.borderColor,
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                style={{ backgroundColor: `${alertLevel.color}20` }}
              >
                {alertLevel.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {t('volatilityAlert.currentVolatility')}
                </p>
                <p className="text-2xl font-bold" style={{ color: alertLevel.color }}>
                  {currentVolatility.toFixed(4)}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">{t('volatilityAlert.threshold')}</p>
              <p className="text-sm font-semibold text-gray-700">{threshold.toFixed(4)}%</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: alertLevel.color,
                  color: 'white',
                }}
              >
                {alertLevel.label}
              </span>
              {isAlertActive && (
                <span className="text-xs text-gray-600">
                  {t('volatilityAlert.exceedsThreshold')}{' '}
                  {((currentVolatility / threshold - 1) * 100).toFixed(1)}%
                </span>
              )}
            </div>
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min((currentVolatility / threshold) * 100, 100)}%`,
                  backgroundColor: alertLevel.color,
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('volatilityAlert.historicalEvents')}
          </h4>
          <div className="space-y-2">
            {historicalEvents.map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-xs text-gray-500">{event.date}</p>
                    <p className="text-sm font-medium text-gray-900">{event.impact}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t('volatilityAlert.volatility')}</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {event.volatility.toFixed(4)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
          <div className="text-center p-2 rounded bg-green-50">
            <p className="text-xs text-gray-500 mb-1">{t('volatilityAlert.riskLevel.low')}</p>
            <p className="text-xs font-medium text-green-600">&lt; {threshold.toFixed(2)}%</p>
          </div>
          <div className="text-center p-2 rounded bg-yellow-50">
            <p className="text-xs text-gray-500 mb-1">{t('volatilityAlert.riskLevel.medium')}</p>
            <p className="text-xs font-medium text-yellow-600">
              {threshold.toFixed(2)}% - {(threshold * 1.5).toFixed(2)}%
            </p>
          </div>
          <div className="text-center p-2 rounded bg-red-50">
            <p className="text-xs text-gray-500 mb-1">{t('volatilityAlert.riskLevel.high')}</p>
            <p className="text-xs font-medium text-red-600">&gt; {(threshold * 1.5).toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
