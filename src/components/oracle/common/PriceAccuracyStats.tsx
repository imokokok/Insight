'use client';

import { useMemo } from 'react';
import GaugeChart from '@/components/GaugeChart';
import { useTranslations } from '@/i18n';
import { AccuracyStats } from '@/hooks';
import { semanticColors } from '@/lib/config/colors';

interface PriceAccuracyStatsProps {
  stats: AccuracyStats;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export function PriceAccuracyStats({ stats, recentTrend }: PriceAccuracyStatsProps) {
  const t = useTranslations();

  const trendData = useMemo(() => {
    switch (recentTrend) {
      case 'improving':
        return {
          icon: (
            <svg
              className="w-5 h-5 text-success-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
          text: t('pyth.accuracy.trendImproving'),
          color: 'text-success-500',
        };
      case 'declining':
        return {
          icon: (
            <svg
              className="w-5 h-5 text-danger-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          ),
          text: t('pyth.accuracy.trendDeclining'),
          color: 'text-danger-500',
        };
      default:
        return {
          icon: (
            <svg
              className="w-5 h-5 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
            </svg>
          ),
          text: t('pyth.accuracy.trendStable'),
          color: 'text-primary-500',
        };
    }
  }, [recentTrend, t]);

  const conditionCards = useMemo(
    () => [
      {
        title: t('pyth.accuracy.normalMarket'),
        accuracy: stats.normalAccuracy,
        color: 'bg-success-50 border-green-200',
        textColor: 'text-success-600',
        icon: (
          <svg
            className="w-5 h-5 text-success-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        title: t('pyth.accuracy.volatileMarket'),
        accuracy: stats.volatileAccuracy,
        color: 'bg-warning-50 border-yellow-200',
        textColor: 'text-warning-600',
        icon: (
          <svg
            className="w-5 h-5 text-warning-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        ),
      },
      {
        title: t('pyth.accuracy.extremeMarket'),
        accuracy: stats.extremeAccuracy,
        color: 'bg-danger-50 border-danger-200',
        textColor: 'text-danger-600',
        icon: (
          <svg
            className="w-5 h-5 text-danger-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
      },
    ],
    [stats, t]
  );

  return (
    <div className="bg-white  border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('pyth.accuracy.title')}</h3>
        <div className="flex items-center gap-2">
          {trendData.icon}
          <span className={`text-sm font-medium ${trendData.color}`}>{trendData.text}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50 ">
          <GaugeChart
            value={stats.overallAccuracy}
            maxValue={100}
            label={t('pyth.accuracy.overallScore')}
            size={180}
          />
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              {t('pyth.accuracy.basedOn')} {stats.totalDataPoints} {t('pyth.accuracy.dataPoints')}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 ">
              <p className="text-sm text-gray-600 mb-1">{t('pyth.accuracy.avgDeviation')}</p>
              <p className="text-xl font-bold text-gray-900">{stats.avgDeviation}%</p>
            </div>
            <div className="p-4 bg-gray-50 ">
              <p className="text-sm text-gray-600 mb-1">{t('pyth.accuracy.maxDeviation')}</p>
              <p className="text-xl font-bold text-warning-600">{stats.maxDeviation}%</p>
            </div>
          </div>

          <div className="space-y-3">
            {conditionCards.map((card, index) => (
              <div key={index} className={`p-4  border ${card.color} transition-all hover:`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {card.icon}
                    <span className="text-sm font-medium text-gray-700">{card.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200  overflow-hidden">
                      <div
                        className="h-full bg-current  transition-all duration-500"
                        style={{ width: `${card.accuracy}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold ${card.textColor}`}>
                      {card.accuracy.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{t('pyth.accuracy.last7Days')}</h4>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => {
            const accuracy = 95 + Math.random() * 4;
            const day = new Date();
            day.setDate(day.getDate() - (6 - i));
            const dayName = day.toLocaleDateString('zh-CN', { weekday: 'short' });

            return (
              <div key={i} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{dayName}</div>
                <div
                  className="h-16 rounded relative overflow-hidden"
                  style={{
                    background: `linear-gradient(to top, ${semanticColors.success.DEFAULT}${Math.round(accuracy)}, ${semanticColors.success.DEFAULT}${Math.round(accuracy / 2)})`,
                  }}
                >
                  <div className="absolute bottom-0 left-0 right-0 text-xs font-bold text-white p-1">
                    {accuracy.toFixed(0)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
