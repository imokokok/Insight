'use client';

import { useMemo } from 'react';

import Link from 'next/link';

import {
  Clock,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Activity,
  Link2,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { semanticColors } from '@/lib/config/colors';

import { type OracleMarketData, type TVSTrendData } from '../types';

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
  trendData: TVSTrendData[];
}

// 预言机名称到 trendData 字段的映射
const ORACLE_FIELD_MAP: Record<string, string> = {
  Chainlink: 'chainlink',
  Pyth: 'pyth',
  Band: 'band',
  API3: 'api3',
  UMA: 'uma',
  RedStone: 'redstone',
  DIA: 'dia',
  Tellor: 'tellor',
  Chronicle: 'chronicle',
  WinkLink: 'winklink',
};

// 迷你 Sparkline 图表组件
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) {
    return (
      <svg width={48} height={24} className="flex-shrink-0">
        <line x1="0" y1="12" x2="48" y2="12" stroke={color} strokeWidth="1" strokeDasharray="2,2" />
      </svg>
    );
  }

  const { points, width, height } = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 48;
    const height = 24;
    const padding = 2;

    const points = data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = height - padding - ((value - min) / range) * (height - 2 * padding);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

    return { points, width, height };
  }, [data]);

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
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
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

// 变化率徽章组件
function ChangeBadge({ value }: { value: number }) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className="inline-flex items-center gap-0.5 text-xs font-medium"
      style={{
        color: isPositive ? semanticColors.success.text : semanticColors.danger.text,
      }}
    >
      <Icon className="w-3 h-3" />
      {isPositive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

// Tooltip 组件
function Tooltip({ children, content }: { children: React.ReactNode; content: React.ReactNode }) {
  return (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-10">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
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
  trendData,
}: MarketSidebarProps) {
  const t = useTranslations('marketOverview');

  // 从 trendData 提取真实历史数据生成 sparkline
  const getSparklineData = (oracleName: string): number[] => {
    const fieldName = ORACLE_FIELD_MAP[oracleName];
    if (!fieldName || !trendData || trendData.length === 0) {
      return [];
    }

    // 提取该预言机的历史数据（最多取最近20个点）
    const data = trendData
      .slice(-20)
      .map((item) => (item as unknown as Record<string, number>)[fieldName])
      .filter((v): v is number => typeof v === 'number');

    return data;
  };

  return (
    <div className="space-y-3">
      {/* 时间范围卡片 - 简化：移除 bg-white border */}
      <div className="py-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-0.5 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {t('timeRange') || 'Time Range'}
            </p>
            <p className="text-xl font-bold text-gray-900">{selectedTimeRange}</p>
          </div>
          <div className="p-2">
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

      {/* 预言机列表 - 简化：移除外层卡片样式 */}
      <div className="overflow-hidden">
        {/* 标题简化：使用 text-xs text-gray-500 uppercase tracking-wider */}
        <div className="py-2 border-b border-gray-100">
          <h4 className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
            <PieChartIcon className="w-3 h-3" />
            {t('oracleMarketShare') || 'Oracle Market Share'}
          </h4>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {sortedOracleData.map((item, index) => {
            const isSelected = selectedItem === item.name;
            const isHovered = hoveredItem === item.name;
            const hasHover = hoveredItem !== null;
            const sparklineData = getSparklineData(item.name);
            const isLast = index === sortedOracleData.length - 1;

            return (
              <Tooltip
                key={item.name}
                content={
                  <div className="flex items-center gap-3">
                    <span>
                      TVS: <span className="font-semibold">{item.tvs}</span>
                    </span>
                    <span className="text-gray-500">|</span>
                    <span className="flex items-center gap-1">
                      <Link2 className="w-3 h-3" />
                      {item.chains} chains
                    </span>
                  </div>
                }
              >
                <Link
                  href={`/${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`flex items-center py-2 pl-3 transition-all duration-200 cursor-pointer border-l-2 ${
                    isSelected ? 'border-primary-500' : 'border-transparent'
                  } ${!isLast ? 'border-b border-gray-100' : ''} ${
                    hasHover && !isHovered ? 'opacity-50' : 'opacity-100'
                  } hover:text-primary-600`}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={(e) => {
                    e.preventDefault();
                    if (isSelected) {
                      setSelectedItem(null);
                    } else {
                      setSelectedItem(item.name);
                    }
                  }}
                >
                  {/* 左侧：名称 + 颜色点 */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color, boxShadow: `0 0 4px ${item.color}60` }}
                    />
                    <span
                      className={`font-semibold text-sm truncate ${isSelected ? 'text-primary-600' : 'text-gray-900'}`}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* 中间：迷你图 */}
                  <div className="flex-shrink-0 mx-2">
                    <MiniSparkline data={sparklineData} color={item.color} />
                  </div>

                  {/* 右侧：份额 + 变化 */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900 w-10 text-right">
                      {item.share}%
                    </span>
                    <ChangeBadge value={item.change24h} />
                  </div>
                </Link>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* 底部统计 - 简化版 */}
      <div className="py-2 text-xs text-gray-400 flex items-center justify-between">
        <span>
          {t('coveringOracles', { count: marketStats.oracleCount }) ||
            `Covering ${marketStats.oracleCount} major oracles`}
        </span>
        <span className="text-emerald-500 font-medium">{sortedOracleData.length} Active</span>
      </div>
    </div>
  );
}
