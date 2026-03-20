'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';
import { Clock, PieChart as PieChartIcon } from 'lucide-react';
import Link from 'next/link';
import { OracleMarketData } from '../types';
import { baseColors, semanticColors } from '@/lib/config/colors';

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
    <div className="space-y-5">
      <div className="pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">
              {isChineseLocale(locale) ? '选中时间范围' : 'Time Range'}
            </p>
            <p className="text-2xl font-bold text-gray-900">{selectedTimeRange}</p>
          </div>
          <div
            className="p-2 border"
            style={{ backgroundColor: baseColors.gray[50], borderColor: baseColors.gray[200] }}
          >
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse" />
          {lastUpdated
            ? `${isChineseLocale(locale) ? '更新于' : 'Updated'} ${lastUpdated.toLocaleTimeString()}`
            : isChineseLocale(locale)
              ? '数据已更新'
              : 'Data updated'}
        </div>
      </div>

      <div className="overflow-hidden">
        <div className="pb-3 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {isChineseLocale(locale) ? '预言机市场份额' : 'Oracle Market Share'}
          </h4>
        </div>
        <div className="py-2 space-y-1 max-h-[320px] overflow-y-auto">
          {sortedOracleData.map((item, index) => (
            <Link
              key={item.name}
              href={`/${item.name.toLowerCase().replace(' ', '-')}`}
              className={`block py-2.5 px-2 -mx-2 border-l-2 transition-all duration-200 cursor-pointer ${
                selectedItem === item.name
                  ? 'bg-primary-50/60 border-primary-500'
                  : 'border-transparent hover:bg-gray-50'
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
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-2.5 h-2.5 flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-gray-900">{item.share}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 overflow-hidden mb-2">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{
                    backgroundColor: item.color,
                    width: `${item.share}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  TVS: <span className="text-gray-700 font-medium">{item.tvs}</span>
                </span>
                <span className="text-gray-500">
                  {isChineseLocale(locale) ? '链' : 'Chains'}:{' '}
                  <span className="text-gray-700 font-medium">{item.chains}</span>
                </span>
                <span
                  className="font-medium px-1.5 py-0.5 border"
                  style={{
                    color:
                      item.change24h >= 0
                        ? semanticColors.success.text
                        : semanticColors.danger.text,
                    backgroundColor:
                      item.change24h >= 0
                        ? semanticColors.success.light
                        : semanticColors.danger.light,
                    borderColor:
                      item.change24h >= 0
                        ? semanticColors.success.light
                        : semanticColors.danger.light,
                  }}
                >
                  {item.change24h >= 0 ? '+' : ''}
                  {item.change24h.toFixed(1)}%
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1 font-medium">
              {isChineseLocale(locale) ? '总市场份额' : 'Total Market Share'}
            </p>
            <p className="text-xl font-bold text-gray-900">100%</p>
          </div>
          <div
            className="p-2 border"
            style={{ backgroundColor: baseColors.gray[50], borderColor: baseColors.gray[200] }}
          >
            <PieChartIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          {isChineseLocale(locale)
            ? `覆盖 ${marketStats.oracleCount} 个主要预言机`
            : `Covering ${marketStats.oracleCount} major oracles`}
        </div>
      </div>
    </div>
  );
}
