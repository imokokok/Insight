'use client';

import { useTranslations } from 'next-intl';
import { PriceChart } from '@/components/oracle';
import { PythClient } from '@/lib/oracles/pythNetwork';
import { PythMarketViewProps } from '../types';

export function PythMarketView({
  config,
  price,
  historicalData,
  networkStats,
  isLoading,
}: PythMarketViewProps) {
  const t = useTranslations();

  const client = new PythClient();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Price Chart - Takes 2/3 width on desktop */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('pyth.priceTrend')}
          </h3>
          <PriceChart
            client={client}
            symbol={config.symbol}
            chain={config.defaultChain}
            height={320}
            showToolbar={true}
            defaultPrice={config.marketData.change24hValue}
          />
        </div>

        {/* Quick Stats - Takes 1/3 width on desktop */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('pyth.quickStats')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('pyth.stats.volume24h')}</span>
              <span className="text-sm font-semibold text-gray-900">
                ${(config.marketData.volume24h / 1e6).toFixed(1)}M
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">{t('pyth.stats.marketCap')}</span>
              <span className="text-sm font-semibold text-gray-900">
                ${(config.marketData.marketCap / 1e9).toFixed(2)}B
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">
                {t('pyth.stats.circulatingSupply')}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {(config.marketData.circulatingSupply / 1e9).toFixed(1)}B PYTH
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">
                {t('pyth.stats.updateFrequency')}
              </span>
              <span className="text-sm font-semibold text-violet-600">
                {networkStats?.updateFrequency ?? 1}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
