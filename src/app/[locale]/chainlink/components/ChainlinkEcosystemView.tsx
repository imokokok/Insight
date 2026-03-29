'use client';

import { useState, useMemo, useCallback, memo } from 'react';

import { TrendingUp, Layers, Globe, Zap } from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import { safeDivide, safeGetLastElement, safeGetFirstElement } from '../utils/helpers';

// TVL Trend Data (12 months)
const tvlTrendData = [
  {
    month: '2024-01',
    ethereum: 8.5,
    arbitrum: 2.1,
    polygon: 1.8,
    optimism: 1.2,
    avalanche: 0.9,
    base: 0.3,
    total: 14.8,
  },
  {
    month: '2024-02',
    ethereum: 9.2,
    arbitrum: 2.4,
    polygon: 1.9,
    optimism: 1.4,
    avalanche: 1.0,
    base: 0.5,
    total: 16.4,
  },
  {
    month: '2024-03',
    ethereum: 10.1,
    arbitrum: 2.8,
    polygon: 2.1,
    optimism: 1.6,
    avalanche: 1.1,
    base: 0.7,
    total: 18.4,
  },
  {
    month: '2024-04',
    ethereum: 9.8,
    arbitrum: 3.1,
    polygon: 2.0,
    optimism: 1.7,
    avalanche: 1.0,
    base: 0.9,
    total: 18.5,
  },
  {
    month: '2024-05',
    ethereum: 11.2,
    arbitrum: 3.5,
    polygon: 2.3,
    optimism: 1.9,
    avalanche: 1.2,
    base: 1.1,
    total: 21.2,
  },
  {
    month: '2024-06',
    ethereum: 12.5,
    arbitrum: 3.9,
    polygon: 2.5,
    optimism: 2.1,
    avalanche: 1.3,
    base: 1.4,
    total: 23.7,
  },
  {
    month: '2024-07',
    ethereum: 11.8,
    arbitrum: 4.2,
    polygon: 2.4,
    optimism: 2.3,
    avalanche: 1.2,
    base: 1.6,
    total: 23.5,
  },
  {
    month: '2024-08',
    ethereum: 13.2,
    arbitrum: 4.6,
    polygon: 2.7,
    optimism: 2.5,
    avalanche: 1.4,
    base: 1.9,
    total: 26.3,
  },
  {
    month: '2024-09',
    ethereum: 14.1,
    arbitrum: 5.1,
    polygon: 2.9,
    optimism: 2.7,
    avalanche: 1.5,
    base: 2.2,
    total: 28.5,
  },
  {
    month: '2024-10',
    ethereum: 13.8,
    arbitrum: 5.4,
    polygon: 3.1,
    optimism: 2.9,
    avalanche: 1.6,
    base: 2.5,
    total: 29.3,
  },
  {
    month: '2024-11',
    ethereum: 15.2,
    arbitrum: 5.8,
    polygon: 3.3,
    optimism: 3.1,
    avalanche: 1.7,
    base: 2.8,
    total: 31.9,
  },
  {
    month: '2024-12',
    ethereum: 16.5,
    arbitrum: 6.2,
    polygon: 3.5,
    optimism: 3.3,
    avalanche: 1.8,
    base: 3.1,
    total: 34.4,
  },
];

// Projects by Chain Data
const projectsByChainData = [
  { chain: 'Ethereum', projects: 850, color: '#627eea' },
  { chain: 'Arbitrum', projects: 320, color: '#28a0f0' },
  { chain: 'Polygon', projects: 280, color: '#8247e5' },
  { chain: 'Optimism', projects: 195, color: '#ff0420' },
  { chain: 'Base', projects: 165, color: '#0052ff' },
  { chain: 'Avalanche', projects: 145, color: '#e84142' },
];

// Chain Colors
const chainColors: Record<string, string> = {
  ethereum: '#627eea',
  arbitrum: '#28a0f0',
  polygon: '#8247e5',
  optimism: '#ff0420',
  avalanche: '#e84142',
  base: '#0052ff',
};

const TimeRangeButton = memo(function TimeRangeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1 text-xs font-medium transition-colors',
        active ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
});

export function ChainlinkEcosystemView() {
  const t = useTranslations('chainlink');
  const [selectedChains, setSelectedChains] = useState<string[]>([
    'ethereum',
    'arbitrum',
    'polygon',
  ]);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');

  const handleTimeRangeChange = useCallback((range: '1M' | '3M' | '6M' | '1Y') => {
    setTimeRange(range);
  }, []);

  const timeRangeButtons = useMemo(
    () =>
      (['1M', '3M', '6M', '1Y'] as const).map((range) => (
        <TimeRangeButton
          key={range}
          active={timeRange === range}
          onClick={() => handleTimeRangeChange(range)}
        >
          {range}
        </TimeRangeButton>
      )),
    [timeRange, handleTimeRangeChange]
  );

  // Filter TVL data based on time range
  const filteredTvlData = useMemo(() => {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
    return tvlTrendData.slice(-months[timeRange]);
  }, [timeRange]);

  // Calculate TVL stats
  const tvlStats = useMemo(() => {
    const latest = safeGetLastElement(filteredTvlData);
    const previous = safeGetFirstElement(filteredTvlData);
    if (!latest || !previous) {
      return {
        current: 0,
        change: 0,
        breakdown: [],
      };
    }
    const change = safeDivide(latest.total - previous.total, previous.total) * 100;
    return {
      current: latest.total,
      change,
      breakdown: [
        { chain: 'Ethereum', value: latest.ethereum, color: chainColors.ethereum },
        { chain: 'Arbitrum', value: latest.arbitrum, color: chainColors.arbitrum },
        { chain: 'Polygon', value: latest.polygon, color: chainColors.polygon },
        { chain: 'Optimism', value: latest.optimism, color: chainColors.optimism },
        { chain: 'Avalanche', value: latest.avalanche, color: chainColors.avalanche },
        { chain: 'Base', value: latest.base, color: chainColors.base },
      ],
    };
  }, [filteredTvlData]);

  return (
    <div className="space-y-8">
      {/* TVL Trend Analysis */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {t('ecosystem.tvlAnalysis.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('common.totalValueLockedEcosystem')}
            </p>
          </div>
          <div className="flex items-center border-b border-gray-200">
            {timeRangeButtons}
          </div>
        </div>

        {/* TVL Stats - Clean text layout */}
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('ecosystem.tvlAnalysis.totalTvl')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">${tvlStats.current.toFixed(1)}B</p>
              <span
                className={cn(
                  'text-sm font-medium',
                  tvlStats.change >= 0 ? 'text-emerald-600' : 'text-red-600'
                )}
              >
                {tvlStats.change >= 0 ? '+' : ''}
                {tvlStats.change.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('ecosystem.tvlAnalysis.ethereum')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${tvlStats.breakdown[0].value.toFixed(1)}B
              </p>
              <span className="text-xs text-gray-500">
                {((tvlStats.breakdown[0].value / tvlStats.current) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('ecosystem.tvlAnalysis.l2Networks')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                $
                {(
                  tvlStats.breakdown[1].value +
                  tvlStats.breakdown[3].value +
                  tvlStats.breakdown[5].value
                ).toFixed(1)}
                B
              </p>
              <span className="text-xs text-gray-500">
                {(
                  ((tvlStats.breakdown[1].value +
                    tvlStats.breakdown[3].value +
                    tvlStats.breakdown[5].value) /
                    tvlStats.current) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('ecosystem.tvlAnalysis.altL1')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${(tvlStats.breakdown[2].value + tvlStats.breakdown[4].value).toFixed(1)}B
              </p>
              <span className="text-xs text-gray-500">
                {(
                  ((tvlStats.breakdown[2].value + tvlStats.breakdown[4].value) / tvlStats.current) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
        </div>

        {/* Chain Filter - Subtle pill buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-400 mr-1">
            {t('ecosystem.tvlAnalysis.filterByChain')}:
          </span>
          {tvlStats.breakdown.map((item) => (
            <button
              key={item.chain}
              onClick={() => {
                setSelectedChains((prev) =>
                  prev.includes(item.chain.toLowerCase())
                    ? prev.filter((c) => c !== item.chain.toLowerCase())
                    : [...prev, item.chain.toLowerCase()]
                );
              }}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1 text-xs transition-all border',
                selectedChains.includes(item.chain.toLowerCase())
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: selectedChains.includes(item.chain.toLowerCase())
                    ? 'white'
                    : item.color,
                }}
              />
              {item.chain}
            </button>
          ))}
        </div>

        {/* Stacked Area Chart */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredTvlData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEthereum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColors.ethereum} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chainColors.ethereum} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorArbitrum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColors.arbitrum} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chainColors.arbitrum} stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPolygon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColors.polygon} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chainColors.polygon} stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="month"
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.slice(5)}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `$${value}B`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`$${Number(value).toFixed(2)}B`, '']}
              />
              {selectedChains.includes('ethereum') && (
                <Area
                  type="monotone"
                  dataKey="ethereum"
                  name="Ethereum"
                  stackId="1"
                  stroke={chainColors.ethereum}
                  fill="url(#colorEthereum)"
                />
              )}
              {selectedChains.includes('arbitrum') && (
                <Area
                  type="monotone"
                  dataKey="arbitrum"
                  name="Arbitrum"
                  stackId="1"
                  stroke={chainColors.arbitrum}
                  fill="url(#colorArbitrum)"
                />
              )}
              {selectedChains.includes('polygon') && (
                <Area
                  type="monotone"
                  dataKey="polygon"
                  name="Polygon"
                  stackId="1"
                  stroke={chainColors.polygon}
                  fill="url(#colorPolygon)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* 生态概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 项目分布 */}
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              {t('ecosystem.projectAnalysis.projectsByChain') || 'Projects by Chain'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('common.distributionProjectsNetworks')}
            </p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectsByChainData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="chain"
                  stroke="#9ca3af"
                  tick={{ fontSize: 11 }}
                  width={60}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="projects" radius={[0, 4, 4, 0]}>
                  {projectsByChainData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              {t('ecosystem.projectAnalysis.totalProjects')}:{' '}
              <span className="font-medium text-gray-900">1,500+</span>
            </span>
            <span className="text-emerald-600 font-medium">
              +156 {t('ecosystem.projectAnalysis.thisMonth')}
            </span>
          </div>
        </section>

        {/* Section Divider for mobile */}
        <div className="border-t border-gray-200 lg:hidden" />

        {/* 核心指标 - Clean layout without colored backgrounds */}
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              {t('ecosystem.growth.title') || 'Ecosystem Growth'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('common.keyPerformanceIndicators')}</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('ecosystem.growth.newProjects') || 'New Projects'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">156</p>
                <p className="text-xs text-emerald-600">+21.9%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('ecosystem.growth.integrations') || 'Integrations'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">892</p>
                <p className="text-xs text-emerald-600">+18.0%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('ecosystem.growth.communityGrowth') || 'Community'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">48.5K</p>
                <p className="text-xs text-emerald-600">+17.7%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('ecosystem.growth.protocolRevenue') || 'Revenue'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">$2.4M</p>
                <p className="text-xs text-emerald-600">+15.3%</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ChainlinkEcosystemView;
