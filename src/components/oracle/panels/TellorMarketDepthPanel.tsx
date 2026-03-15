'use client';

import { MarketDepth } from '@/lib/oracles/tellor';
import { useI18n } from '@/lib/i18n/provider';

interface TellorMarketDepthPanelProps {
  data: MarketDepth;
}

export function TellorMarketDepthPanel({ data }: TellorMarketDepthPanelProps) {
  const { t } = useI18n();

  const maxVolume = Math.max(...data.levels.map((l) => Math.max(l.bidVolume, l.askVolume)));

  const bidLevels = data.levels.filter((l) => l.bidVolume > 0);
  const askLevels = data.levels.filter((l) => l.askVolume > 0);

  return (
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold mb-3">{t('tellor.marketDepth.title')}</h3>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.symbol')}</p>
            <p className="text-lg font-bold text-cyan-600">{data.symbol}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.totalBid')}</p>
            <p className="text-lg font-bold text-green-600">
              {data.totalBidVolume.toLocaleString()}
            </p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.totalAsk')}</p>
            <p className="text-lg font-bold text-red-600">{data.totalAskVolume.toLocaleString()}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.marketDepth.spread')}</p>
            <p className="text-lg font-bold text-cyan-600">{data.spreadPercent.toFixed(4)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-medium text-green-700 mb-3">
              {t('tellor.marketDepth.bids')}
            </h4>
            <div className="space-y-2">
              {bidLevels.map((level, index) => (
                <div key={index} className="relative">
                  <div
                    className="absolute inset-0 bg-green-100 rounded"
                    style={{ width: `${(level.bidVolume / maxVolume) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between py-2 px-3">
                    <span className="font-medium text-gray-900">${level.price.toFixed(4)}</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-700">
                        {level.bidVolume.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">({level.bidCount})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-medium text-red-700 mb-3">
              {t('tellor.marketDepth.asks')}
            </h4>
            <div className="space-y-2">
              {askLevels.map((level, index) => (
                <div key={index} className="relative">
                  <div
                    className="absolute inset-0 bg-red-100 rounded"
                    style={{ width: `${(level.askVolume / maxVolume) * 100}%` }}
                  />
                  <div className="relative flex items-center justify-between py-2 px-3">
                    <span className="font-medium text-gray-900">${level.price.toFixed(4)}</span>
                    <div className="text-right">
                      <span className="text-sm text-gray-700">
                        {level.askVolume.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">({level.askCount})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { TellorMarketDepthPanel as TellarMarketDepthPanel };
