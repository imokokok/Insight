'use client';

import { useI18n } from '@/lib/i18n/context';
import KeyMetrics from '@/components/market-overview/KeyMetrics';
import TopAssets from '@/components/market-overview/TopAssets';
import OracleMarketShare from '@/components/market-overview/OracleMarketShare';
import PriceChangeLeaderboard from '@/components/market-overview/PriceChangeLeaderboard';

export default function MarketOverviewPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('home.professional.market.title')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('home.professional.market.subtitle')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Key Metrics */}
          <KeyMetrics />

          {/* Two Column Layout for Market Share and Price Change */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OracleMarketShare title={t('home.ecosystemMap.marketShare') || 'Oracle Market Share'} />
            <PriceChangeLeaderboard title={t('home.livePrices.title') || '24h Price Change'} />
          </div>

          {/* Top Assets Table */}
          <TopAssets title={t('home.livePrices.title') || 'Top Assets'} />
        </div>
      </div>
    </div>
  );
}
