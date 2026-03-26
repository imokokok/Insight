'use client';

import Link from 'next/link';

import {
  Clock,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Activity,
  Link2,
} from 'lucide-react';

import { useLocale, useTranslations } from '@/i18n';
import { baseColors, semanticColors } from '@/lib/config/colors';

import { type OracleMarketData } from '../types';

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

// 迷你 Sparkline 图表组件
function MiniSparkline({
  data,
  color,
  isPositive,
}: {
  data: number[];
  color: string;
  isPositive: boolean;
}) {
  if (!data || data.length < 2) {
    // 生成模拟数据用于展示
    data = isPositive
      ? [30, 35, 32, 38, 42, 40, 45, 48, 52, 55]
      : [55, 52, 48, 45, 40, 42, 38, 35, 32, 30];
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 48;
  const height = 20;
  const padding = 2;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - padding - ((value - min) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 渐变填充 */}
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
    </svg>
  );
}

// 进度条组件
function ProgressBar({
  value,
  color,
  animated = false,
}: {
  value: number;
  color: string;
  animated?: boolean;
}) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${animated ? 'animate-pulse' : ''}`}
        style={{
          background: `linear-gradient(90deg, ${color}dd, ${color})`,
          width: `${Math.max(value, 1)}%`,
          boxShadow: `0 0 4px ${color}40`,
        }}
      />
    </div>
  );
}

// 变化率徽章组件
function ChangeBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded"
      style={{
        color: isPositive ? semanticColors.success.text : semanticColors.danger.text,
        backgroundColor: isPositive ? semanticColors.success.light : semanticColors.danger.light,
      }}
    >
      <Icon className="w-3 h-3" />
      {isPositive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
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
  const t = useTranslations('marketOverview');

  // 生成模拟的 sparkline 数据
  const generateSparklineData = (change24h: number): number[] => {
    const base = 50;
    const trend = change24h / 10;
    return Array.from({ length: 10 }, (_, i) => base + trend * i + (Math.random() - 0.5) * 10);
  };

  return (
    <div className="space-y-4">
      {/* 时间范围卡片 */}
      <div className="p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('timeRange') || 'Time Range'}
            </p>
            <p className="text-xl font-bold text-gray-900">{selectedTimeRange}</p>
          </div>
          <div
            className="p-2 rounded-md border"
            style={{ backgroundColor: baseColors.gray[50], borderColor: baseColors.gray[200] }}
          >
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {lastUpdated
            ? `${t('updatedAt') || 'Updated'} ${lastUpdated.toLocaleTimeString()}`
            : t('dataUpdated') || 'Data updated'}
        </div>
      </div>

      {/* 预言机列表 */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
          <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <PieChartIcon className="w-3 h-3" />
            {t('oracleMarketShare') || 'Oracle Market Share'}
          </h4>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {sortedOracleData.map((item, index) => (
            <Link
              key={item.name}
              href={`/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              className={`block px-3 py-2 border-l-2 transition-all duration-200 cursor-pointer ${
                selectedItem === item.name
                  ? 'bg-blue-50/70 border-blue-500'
                  : 'border-transparent hover:bg-gray-50/80'
              } ${hoveredItem && hoveredItem !== item.name ? 'opacity-40' : 'opacity-100'} ${
                index !== sortedOracleData.length - 1 ? 'border-b border-gray-50' : ''
              }`}
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
              {/* 第一行：名称、Sparkline、份额 */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}60` }}
                  />
                  <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MiniSparkline
                    data={generateSparklineData(item.change24h)}
                    color={item.color}
                    isPositive={item.change24h >= 0}
                  />
                  <span className="text-sm font-bold text-gray-900 w-10 text-right">
                    {item.share}%
                  </span>
                </div>
              </div>

              {/* 第二行：进度条 */}
              <ProgressBar
                value={item.share}
                color={item.color}
                animated={selectedItem === item.name}
              />

              {/* 第三行：统计数据 */}
              <div className="flex items-center justify-between mt-1.5">
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-500">
                    TVS: <span className="text-gray-700 font-medium">{item.tvs}</span>
                  </span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-500 flex items-center gap-0.5">
                    <Link2 className="w-3 h-3" />
                    {item.chains}
                  </span>
                </div>
                <ChangeBadge value={item.change24h} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 底部统计 */}
      <div className="p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5 font-medium">
              {t('totalMarketShare') || 'Total Market Share'}
            </p>
            <p className="text-xl font-bold text-gray-900">100%</p>
          </div>
          <div
            className="p-2 rounded-md border"
            style={{ backgroundColor: baseColors.gray[50], borderColor: baseColors.gray[200] }}
          >
            <PieChartIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-2 flex items-center justify-between">
          <span>
            {t('coveringOracles', { count: marketStats.oracleCount }) ||
              `Covering ${marketStats.oracleCount} major oracles`}
          </span>
          <span className="text-emerald-500 font-medium">{sortedOracleData.length} Active</span>
        </div>
      </div>
    </div>
  );
}
