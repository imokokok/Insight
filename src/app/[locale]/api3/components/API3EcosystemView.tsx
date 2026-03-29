'use client';

import { useState, useMemo } from 'react';

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

import { type API3EcosystemViewProps } from '../types';

// TVL Trend Data (12 months) - API3 specific
const tvlTrendData = [
  {
    month: '2024-01',
    ethereum: 45.2,
    arbitrum: 12.5,
    polygon: 8.3,
    optimism: 6.1,
    avalanche: 4.2,
    base: 2.1,
    total: 78.4,
  },
  {
    month: '2024-02',
    ethereum: 48.5,
    arbitrum: 14.2,
    polygon: 9.1,
    optimism: 7.0,
    avalanche: 4.8,
    base: 2.8,
    total: 86.4,
  },
  {
    month: '2024-03',
    ethereum: 52.1,
    arbitrum: 16.1,
    polygon: 10.2,
    optimism: 8.1,
    avalanche: 5.3,
    base: 3.5,
    total: 95.3,
  },
  {
    month: '2024-04',
    ethereum: 50.8,
    arbitrum: 17.5,
    polygon: 10.8,
    optimism: 8.9,
    avalanche: 5.1,
    base: 4.2,
    total: 97.3,
  },
  {
    month: '2024-05',
    ethereum: 55.3,
    arbitrum: 19.8,
    polygon: 12.1,
    optimism: 10.2,
    avalanche: 5.8,
    base: 5.1,
    total: 108.3,
  },
  {
    month: '2024-06',
    ethereum: 61.2,
    arbitrum: 22.4,
    polygon: 13.5,
    optimism: 11.5,
    avalanche: 6.4,
    base: 6.2,
    total: 121.2,
  },
  {
    month: '2024-07',
    ethereum: 58.9,
    arbitrum: 24.1,
    polygon: 13.2,
    optimism: 12.3,
    avalanche: 6.1,
    base: 7.1,
    total: 121.7,
  },
  {
    month: '2024-08',
    ethereum: 64.5,
    arbitrum: 26.8,
    polygon: 14.8,
    optimism: 13.6,
    avalanche: 6.9,
    base: 8.4,
    total: 135.0,
  },
  {
    month: '2024-09',
    ethereum: 69.2,
    arbitrum: 29.5,
    polygon: 16.2,
    optimism: 15.1,
    avalanche: 7.5,
    base: 9.8,
    total: 147.3,
  },
  {
    month: '2024-10',
    ethereum: 67.8,
    arbitrum: 31.2,
    polygon: 17.1,
    optimism: 16.2,
    avalanche: 7.8,
    base: 11.2,
    total: 151.3,
  },
  {
    month: '2024-11',
    ethereum: 73.5,
    arbitrum: 34.1,
    polygon: 18.5,
    optimism: 17.8,
    avalanche: 8.4,
    base: 12.8,
    total: 165.1,
  },
  {
    month: '2024-12',
    ethereum: 78.2,
    arbitrum: 36.8,
    polygon: 19.8,
    optimism: 19.2,
    avalanche: 9.1,
    base: 14.5,
    total: 177.6,
  },
];

// Projects by Chain Data - API3 specific
const projectsByChainData = [
  { chain: 'Ethereum', projects: 145, color: '#627eea' },
  { chain: 'Arbitrum', projects: 68, color: '#28a0f0' },
  { chain: 'Polygon', projects: 52, color: '#8247e5' },
  { chain: 'Optimism', projects: 38, color: '#ff0420' },
  { chain: 'Base', projects: 29, color: '#0052ff' },
  { chain: 'Avalanche', projects: 24, color: '#e84142' },
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

function TimeRangeButton({
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
        active ? 'text-gray-900 border-b-2 border-emerald-600' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}

export function API3EcosystemView({ isLoading }: API3EcosystemViewProps) {
  const t = useTranslations('api3');
  const [selectedChains, setSelectedChains] = useState<string[]>([
    'ethereum',
    'arbitrum',
    'polygon',
  ]);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');

  // Filter TVL data based on time range
  const filteredTvlData = useMemo(() => {
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
    return tvlTrendData.slice(-months[timeRange]);
  }, [timeRange]);

  // Calculate TVL stats
  const tvlStats = useMemo(() => {
    const latest = filteredTvlData[filteredTvlData.length - 1];
    const previous = filteredTvlData[0];
    const change = ((latest.total - previous.total) / previous.total) * 100;
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

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
          <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* TVL Trend Analysis */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {t('ecosystem.tvlAnalysis.title') || 'TVL Analysis'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('ecosystem.tvlTrend')}</p>
          </div>
          <div className="flex items-center border-b border-gray-200">
            {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
              <TimeRangeButton
                key={range}
                active={timeRange === range}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </TimeRangeButton>
            ))}
          </div>
        </div>

        {/* TVL Stats - Clean text layout */}
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('ecosystem.tvlAnalysis.totalTvl') || 'Total TVL'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">${tvlStats.current.toFixed(1)}M</p>
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
              {t('ecosystem.tvlAnalysis.ethereum') || 'Ethereum'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${tvlStats.breakdown[0].value.toFixed(1)}M
              </p>
              <span className="text-xs text-gray-500">
                {((tvlStats.breakdown[0].value / tvlStats.current) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('ecosystem.tvlAnalysis.l2Networks') || 'L2 Networks'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                $
                {(
                  tvlStats.breakdown[1].value +
                  tvlStats.breakdown[3].value +
                  tvlStats.breakdown[5].value
                ).toFixed(1)}
                M
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
              {t('ecosystem.tvlAnalysis.altL1') || 'Alt L1'}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${(tvlStats.breakdown[2].value + tvlStats.breakdown[4].value).toFixed(1)}M
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
            {t('ecosystem.tvlAnalysis.filterByChain') || 'Filter by chain'}:
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
                'inline-flex items-center gap-1.5 px-3 py-1 text-xs transition-all border rounded-md',
                selectedChains.includes(item.chain.toLowerCase())
                  ? 'bg-emerald-600 text-white border-emerald-600'
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
                tickFormatter={(value) => `$${value}M`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`$${Number(value).toFixed(2)}M`, '']}
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
              {t('ecosystem.distributionByNetwork')}
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
              {t('ecosystem.projectAnalysis.totalProjects') || 'Total Projects'}:{' '}
              <span className="font-medium text-gray-900">356+</span>
            </span>
            <span className="text-emerald-600 font-medium">
              +42 {t('ecosystem.projectAnalysis.thisMonth') || 'this month'}
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
            <p className="text-sm text-gray-500 mt-0.5">{t('ecosystem.keyIndicators')}</p>
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
                <p className="text-lg font-semibold text-gray-900">42</p>
                <p className="text-xs text-emerald-600">+18.5%</p>
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
                <p className="text-lg font-semibold text-gray-900">186</p>
                <p className="text-xs text-emerald-600">+24.2%</p>
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
                <p className="text-lg font-semibold text-gray-900">28.3K</p>
                <p className="text-xs text-emerald-600">+22.1%</p>
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
                <p className="text-lg font-semibold text-gray-900">$890K</p>
                <p className="text-xs text-emerald-600">+31.4%</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default API3EcosystemView;
