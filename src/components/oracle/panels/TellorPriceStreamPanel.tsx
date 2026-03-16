'use client';

import { PriceStreamPoint } from '@/lib/oracles/tellor';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

interface TellorPriceStreamPanelProps {
  data: PriceStreamPoint[];
}

export function TellorPriceStreamPanel({ data }: TellorPriceStreamPanelProps) {
  const t = useTranslations();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '−';
  };

  const latestPrice = data[data.length - 1]?.price ?? 0;
  const avgPrice = data.reduce((acc, p) => acc + p.price, 0) / (data.length || 1);
  const volume24h = data.reduce((acc, p) => acc + p.volume, 0);

  return (
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold mb-3">{t('tellor.priceStream.title')}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.priceStream.currentPrice')}</p>
            <p className="text-xl font-bold text-cyan-600">${latestPrice.toFixed(4)}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.priceStream.avgPrice')}</p>
            <p className="text-xl font-bold text-cyan-600">${avgPrice.toFixed(4)}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.priceStream.volume')}</p>
            <p className="text-xl font-bold text-cyan-600">{volume24h.toLocaleString()}</p>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="bg-gray-900 rounded-md p-4 h-96 overflow-y-auto font-mono text-sm"
        >
          <div className="space-y-1">
            {data.map((point, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-800"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-xs">
                    {new Date(point.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="text-cyan-400 font-semibold">${point.price.toFixed(4)}</span>
                  <span className={`${getChangeColor(point.change)}`}>
                    {getChangeIcon(point.change)}
                    {Math.abs(point.changePercent).toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-400">
                    {t('tellor.priceStream.volume')}: {point.volume}
                  </span>
                  <span className="text-gray-500">{point.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TellorPriceStreamPanel as TellarPriceStreamPanel };
