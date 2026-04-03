'use client';

import { useEffect, useRef, useState } from 'react';

import { TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';
import { type PriceStreamPoint } from '@/lib/oracles/tellor';

interface TellorPriceStreamPanelProps {
  data: PriceStreamPoint[];
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export function TellorPriceStreamPanel({ data }: TellorPriceStreamPanelProps) {
  const t = useTranslations();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to avoid synchronous setState in effect
    requestAnimationFrame(() => {
      setMounted(true);
    });
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
                    {mounted ? formatTime(point.timestamp) : '--:--:--'}
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
