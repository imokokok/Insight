'use client';

import { PriceStreamPoint } from '@/lib/oracles/tellor';
import { useTranslations } from '@/i18n';
import { useEffect, useRef } from 'react';
import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { TrendingUp } from 'lucide-react';
import { TrendingDown } from 'lucide-react';
import { Activity } from 'lucide-react';
import { Clock } from 'lucide-react';

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
    if (change > 0) return 'text-success-600';
    if (change < 0) return 'text-danger-600';
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
    <DashboardCard title={t('tellor.priceStream.title')}>
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
          className="bg-gray-50 border border-gray-200 rounded-md p-4 h-96 overflow-y-auto font-mono text-sm"
        >
          <div className="space-y-1">
            {data.map((point, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-200"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-500 text-xs">
                    {new Date(point.timestamp).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                  <span className="text-cyan-600 font-semibold">${point.price.toFixed(4)}</span>
                  <span className={`${getChangeColor(point.change)}`}>
                    {getChangeIcon(point.change)}
                    {Math.abs(point.changePercent).toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-gray-500">
                    {t('tellor.priceStream.volume')}: {point.volume}
                  </span>
                  <span className="text-gray-400">{point.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export { TellorPriceStreamPanel as TellarPriceStreamPanel };
