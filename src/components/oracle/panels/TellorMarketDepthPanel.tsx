'use client';

import { useTranslations } from 'next-intl';
import { MarketDepth, OrderBookLevel } from '@/lib/oracles/tellor';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { BarChart3, ArrowUp, ArrowDown } from 'lucide-react';

interface TellorMarketDepthPanelProps {
  data: MarketDepth;
}

export function TellorMarketDepthPanel({ data }: TellorMarketDepthPanelProps) {
  const t = useTranslations();

  const maxVolume = Math.max(...data.levels.map((l) => Math.max(l.bidVolume, l.askVolume)));

  const bidLevels = data.levels.filter((l) => l.bidVolume > 0);
  const askLevels = data.levels.filter((l) => l.askVolume > 0);

  return (
    <DashboardCard title={t('tellor.marketDepth.title')}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.totalBidVolume')}</p>
            <p className="text-xl font-bold text-green-600">{data.totalBidVolume.toLocaleString()}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.totalAskVolume')}</p>
            <p className="text-xl font-bold text-red-600">{data.totalAskVolume.toLocaleString()}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.spread')}</p>
            <p className="text-xl font-bold text-cyan-600">{data.spread.toFixed(4)}%</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.imbalanceRatio')}</p>
            <p className="text-xl font-bold text-cyan-600">{data.imbalanceRatio.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bids */}
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
              <ArrowUp className="w-4 h-4" />
              {t('tellor.marketDepth.bids')}
            </h4>
            <div className="space-y-2">
              {data.bids.map((level, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-green-700">
                    ${level.price.toFixed(4)}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-green-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(level.volume / data.totalBidVolume) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-right">
                      {level.volume.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asks */}
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
              <ArrowDown className="w-4 h-4" />
              {t('tellor.marketDepth.asks')}
            </h4>
            <div className="space-y-2">
              {data.asks.map((level, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-red-700">${level.price.toFixed(4)}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-red-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${(level.volume / data.totalAskVolume) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-right">
                      {level.volume.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export { TellorMarketDepthPanel as TellarMarketDepthPanel };
