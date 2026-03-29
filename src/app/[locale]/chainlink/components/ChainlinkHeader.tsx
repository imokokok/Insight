'use client';

import { useTranslations } from '@/i18n';

import { type ChainlinkHeaderProps } from '../types';

export function ChainlinkHeader({
  config,
  price,
  isLoading,
  lastUpdated,
  onRefresh,
  onExport,
  isRefreshing,
}: ChainlinkHeaderProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <img src="/logos/oracles/chainlink.svg" alt="Chainlink" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{t('chainlink.title')}</h1>
              <p className="text-xs text-gray-500">{t('chainlink.symbol')}</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-200 mx-2" />

          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs text-gray-500">{t('chainlink.price')}</p>
              <p className="text-lg font-semibold text-gray-900">
                ${isLoading ? '-' : currentPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">{t('chainlink.change24h')}</p>
              <p
                className={`text-sm font-medium ${
                  isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {isPositive ? '+' : ''}
                {priceChange24h.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500">
              {t('chainlink.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('common.refresh')}
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {t('common.export')}
          </button>
        </div>
      </div>
    </header>
  );
}
