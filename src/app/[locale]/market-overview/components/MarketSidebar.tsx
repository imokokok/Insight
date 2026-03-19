'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { Clock, PieChart as PieChartIcon } from 'lucide-react';
import Link from 'next/link';
import { OracleMarketData } from '../types';

interface MarketSidebarProps {
  selectedTimeRange: string;
  lastUpdated: Date | null;
  sortedOracleData: OracleMarketData[];
  selectedItem: string | null;
  setSelectedItem: (item: string | null) => void;
  hoveredItem: string | null;
  setHoveredItem: (item: string | null) => void;
  marketStats: {
    oracleCount: number;
  };
}

export default function MarketSidebar({
  selectedTimeRange,
  lastUpdated,
  sortedOracleData,
  selectedItem,
  setSelectedItem,
  hoveredItem,
  setHoveredItem,
  marketStats,
}: MarketSidebarProps) {
  const locale = useLocale();

  return (
    <div className="space-y-4">
      <div className="py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">
              {isChineseLocale(locale) ? '选中时间范围' : 'Time Range'}
            </p>
            <p className="text-xl font-bold text-gray-900">{selectedTimeRange}</p>
          </div>
          <Clock className="w-5 h-5 text-gray-400" />
        </div>
        <div className="mt-2 text-xs text-gray-400">
          {lastUpdated
            ? `${isChineseLocale(locale) ? '更新于' : 'Updated'} ${lastUpdated.toLocaleTimeString()}`
            : isChineseLocale(locale)
              ? '数据已更新'
              : 'Data updated'}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="py-2 border-b border-gray-100">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {isChineseLocale(locale) ? '预言机市场份额' : 'Oracle Market Share'}
          </h4>
        </div>
        <div className="py-2 space-y-1 max-h-[280px] overflow-y-auto">
          {sortedOracleData.map((item) => (
            <Link
              key={item.name}
              href={`/${item.name.toLowerCase().replace(' ', '-')}`}
              className={`block py-2 border-b border-gray-50 transition-all cursor-pointer hover:bg-gray-50 last:border-b-0 ${
                selectedItem === item.name ? 'bg-blue-50/30' : ''
              } ${hoveredItem && hoveredItem !== item.name ? 'opacity-50' : 'opacity-100'}`}
              onMouseEnter={() => setHoveredItem(item.name)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(e) => {
                e.preventDefault();
                if (selectedItem === item.name) {
                  setSelectedItem(null);
                } else {
                  setSelectedItem(item.name);
                }
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-gray-900 text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-gray-900">{item.share}%</span>
                </div>
              </div>
              <div className="h-1 bg-gray-100 overflow-hidden mb-1">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    backgroundColor: item.color,
                    width: `${item.share}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  TVS: <span className="text-gray-700">{item.tvs}</span>
                </span>
                <span>
                  {isChineseLocale(locale) ? '链' : 'Chains'}:{' '}
                  <span className="text-gray-700">{item.chains}</span>
                </span>
                <span className={item.change24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {item.change24h >= 0 ? '+' : ''}
                  {item.change24h.toFixed(1)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="py-3 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">
              {isChineseLocale(locale) ? '总市场份额' : 'Total Market Share'}
            </p>
            <p className="text-lg font-bold text-gray-900">100%</p>
          </div>
          <PieChartIcon className="w-4 h-4 text-gray-400" />
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {isChineseLocale(locale)
            ? `覆盖 ${marketStats.oracleCount} 个主要预言机`
            : `Covering ${marketStats.oracleCount} major oracles`}
        </div>
      </div>
    </div>
  );
}
