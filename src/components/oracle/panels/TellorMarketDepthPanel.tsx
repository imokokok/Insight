'use client';

import { useTranslations } from '@/i18n';
import { MarketDepth, MarketDepthLevel } from '@/lib/oracles/tellor';
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

  const imbalanceRatio = data.totalBidVolume / (data.totalAskVolume || 1);

  return (
    <DashboardCard title={t('tellor.marketDepth.title')}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.totalBidVolume')}</p>
            <p className="text-xl font-bold text-success-600">
              {data.totalBidVolume.toLocaleString()}
            </p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.totalAskVolume')}</p>
            <p className="text-xl font-bold text-danger-600">{data.totalAskVolume.toLocaleString()}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.spread')}</p>
            <p className="text-xl font-bold text-cyan-600">{data.spreadPercent.toFixed(4)}%</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.imbalanceRatio')}</p>
            <p className="text-xl font-bold text-cyan-600">{imbalanceRatio.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bids */}
          <div className="bg-success-50 border border-green-200 rounded-md p-4">
            <h4 className="text-sm font-semibold text-success-700 mb-3 flex items-center gap-2">
              <ArrowUp className="w-4 h-4" />
              {t('tellor.marketDepth.bids')}
            </h4>
            <div className="space-y-2">
              {bidLevels.slice(0, 10).map((level, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-success-700">
                    ${level.price.toFixed(4)}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-success-200 rounded-full h-2">
                      <div
                        className="bg-success-500 h-2 rounded-full"
                        style={{ width: `${(level.bidVolume / maxVolume) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-right">
                      {level.bidVolume.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Asks */}
          <div className="bg-danger-50 border border-danger-200 rounded-md p-4">
            <h4 className="text-sm font-semibold text-danger-700 mb-3 flex items-center gap-2">
              <ArrowDown className="w-4 h-4" />
              {t('tellor.marketDepth.asks')}
            </h4>
            <div className="space-y-2">
              {askLevels.slice(0, 10).map((level, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-sm font-medium text-danger-700">
                    ${level.price.toFixed(4)}
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="w-32 bg-danger-200 rounded-full h-2">
                      <div
                        className="bg-danger-500 h-2 rounded-full"
                        style={{ width: `${(level.askVolume / maxVolume) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-right">
                      {level.askVolume.toLocaleString()}
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
