'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePriceHistory } from '@/hooks';
import { PriceAccuracyStats } from '../common/PriceAccuracyStats';
import { ExtremeMarketAnalysis } from '../common/ExtremeMarketAnalysis';
import { AccuracyTrendChart } from '../charts/AccuracyTrendChart';

type ViewMode = 'stats' | 'extreme' | 'trend';
type TrendType = 'improving' | 'stable' | 'declining';

export function AccuracyAnalysisPanel() {
  const t = useTranslations();
  const [activeView, setActiveView] = useState<ViewMode>('stats');
  const { stats, extremeEvents, accuracyTrend, recentTrend, isLoading } = usePriceHistory({
    maxDataPoints: 100,
  });

  const viewTabs: { key: ViewMode; label: string; icon: React.JSX.Element }[] = [
    {
      key: 'stats',
      label: t('pyth.tabs.stats'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
    {
      key: 'extreme',
      label: t('pyth.tabs.extreme'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
    },
    {
      key: 'trend',
      label: t('pyth.tabs.trend'),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
          />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {viewTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveView(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border transition-colors ${
                activeView === tab.key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'stats' && (
        <PriceAccuracyStats stats={stats} recentTrend={recentTrend as TrendType} />
      )}

      {activeView === 'extreme' && <ExtremeMarketAnalysis events={extremeEvents} />}

      {activeView === 'trend' && <AccuracyTrendChart data={accuracyTrend} />}

      <div className="bg-white border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-gray-100 border border-gray-200 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900 mb-2">{t('pyth.info.title')}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{t('pyth.info.description')}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="https://pyth.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-200 hover:border-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                {t('pyth.info.learnMore')}
              </a>
              <a
                href="https://docs.pyth.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium border border-gray-200 hover:border-gray-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                {t('pyth.info.documentation')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
