'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  LineChart,
  Line,
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
import {
  TrendingUp,
  Layers,
  Globe,
  Zap,
} from 'lucide-react';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { cn } from '@/lib/utils';

// TVL Trend Data (12 months)
const tvlTrendData = [
  { month: '2024-01', ethereum: 8.5, arbitrum: 2.1, polygon: 1.8, optimism: 1.2, avalanche: 0.9, base: 0.3, total: 14.8 },
  { month: '2024-02', ethereum: 9.2, arbitrum: 2.4, polygon: 1.9, optimism: 1.4, avalanche: 1.0, base: 0.5, total: 16.4 },
  { month: '2024-03', ethereum: 10.1, arbitrum: 2.8, polygon: 2.1, optimism: 1.6, avalanche: 1.1, base: 0.7, total: 18.4 },
  { month: '2024-04', ethereum: 9.8, arbitrum: 3.1, polygon: 2.0, optimism: 1.7, avalanche: 1.0, base: 0.9, total: 18.5 },
  { month: '2024-05', ethereum: 11.2, arbitrum: 3.5, polygon: 2.3, optimism: 1.9, avalanche: 1.2, base: 1.1, total: 21.2 },
  { month: '2024-06', ethereum: 12.5, arbitrum: 3.9, polygon: 2.5, optimism: 2.1, avalanche: 1.3, base: 1.4, total: 23.7 },
  { month: '2024-07', ethereum: 11.8, arbitrum: 4.2, polygon: 2.4, optimism: 2.3, avalanche: 1.2, base: 1.6, total: 23.5 },
  { month: '2024-08', ethereum: 13.2, arbitrum: 4.6, polygon: 2.7, optimism: 2.5, avalanche: 1.4, base: 1.9, total: 26.3 },
  { month: '2024-09', ethereum: 14.1, arbitrum: 5.1, polygon: 2.9, optimism: 2.7, avalanche: 1.5, base: 2.2, total: 28.5 },
  { month: '2024-10', ethereum: 13.8, arbitrum: 5.4, polygon: 3.1, optimism: 2.9, avalanche: 1.6, base: 2.5, total: 29.3 },
  { month: '2024-11', ethereum: 15.2, arbitrum: 5.8, polygon: 3.3, optimism: 3.1, avalanche: 1.7, base: 2.8, total: 31.9 },
  { month: '2024-12', ethereum: 16.5, arbitrum: 6.2, polygon: 3.5, optimism: 3.3, avalanche: 1.8, base: 3.1, total: 34.4 },
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

function FilterButton({
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
        'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      )}
    >
      {children}
    </button>
  );
}

export function ChainlinkEcosystemView() {
  const t = useTranslations('chainlink');
  const [selectedChains, setSelectedChains] = useState<string[]>(['ethereum', 'arbitrum', 'polygon']);
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

  return (
    <div className="space-y-6">
      {/* TVL Trend Analysis */}
      <DashboardCard
        title={t('ecosystem.tvlAnalysis.title')}
        headerAction={
          <div className="flex items-center gap-2">
            {(['1M', '3M', '6M', '1Y'] as const).map((range) => (
              <FilterButton
                key={range}
                active={timeRange === range}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </FilterButton>
            ))}
          </div>
        }
      >
        <div className="space-y-6">
          {/* TVL Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('ecosystem.tvlAnalysis.totalTvl')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">${tvlStats.current.toFixed(1)}B</p>
              <div className="mt-1">
                <span className={`text-sm ${tvlStats.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tvlStats.change >= 0 ? '+' : ''}{tvlStats.change.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('ecosystem.tvlAnalysis.ethereum')}</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">${tvlStats.breakdown[0].value.toFixed(1)}B</p>
              <p className="text-xs text-gray-500 mt-1">{((tvlStats.breakdown[0].value / tvlStats.current) * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('ecosystem.tvlAnalysis.l2Networks')}</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                ${(tvlStats.breakdown[1].value + tvlStats.breakdown[3].value + tvlStats.breakdown[5].value).toFixed(1)}B
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(((tvlStats.breakdown[1].value + tvlStats.breakdown[3].value + tvlStats.breakdown[5].value) / tvlStats.current) * 100).toFixed(1)}%
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider">{t('ecosystem.tvlAnalysis.altL1')}</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ${(tvlStats.breakdown[2].value + tvlStats.breakdown[4].value).toFixed(1)}B
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {(((tvlStats.breakdown[2].value + tvlStats.breakdown[4].value) / tvlStats.current) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Chain Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 mr-2">{t('ecosystem.tvlAnalysis.filterByChain')}:</span>
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
                  'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all',
                  selectedChains.includes(item.chain.toLowerCase())
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.chain}
              </button>
            ))}
          </div>

          {/* Stacked Area Chart */}
          <div className="h-80">
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
                    borderRadius: '8px',
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
        </div>
      </DashboardCard>

      {/* 生态概览 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 项目分布 */}
        <DashboardCard title={t('ecosystem.projectAnalysis.projectsByChain') || 'Projects by Chain'}>
          <div className="h-64">
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
                    borderRadius: '8px',
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
          <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
            <span>{t('ecosystem.projectAnalysis.totalProjects')}: 1,500+</span>
            <span className="text-emerald-600">+156 {t('ecosystem.projectAnalysis.thisMonth')}</span>
          </div>
        </DashboardCard>

        {/* 核心指标 */}
        <DashboardCard title={t('ecosystem.growth.title') || 'Ecosystem Growth'}>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-900">{t('ecosystem.growth.newProjects') || 'New Projects'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">156</p>
              <p className="text-xs text-emerald-600 mt-1">+21.9% {t('ecosystem.growth.vsLastMonth') || 'vs last month'}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-900">{t('ecosystem.growth.integrations') || 'Integrations'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">892</p>
              <p className="text-xs text-emerald-600 mt-1">+18.0% {t('ecosystem.growth.vsLastMonth') || 'vs last month'}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-900">{t('ecosystem.growth.communityGrowth') || 'Community'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">48.5K</p>
              <p className="text-xs text-emerald-600 mt-1">+17.7% {t('ecosystem.growth.vsLastMonth') || 'vs last month'}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-900">{t('ecosystem.growth.protocolRevenue') || 'Revenue'}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">$2.4M</p>
              <p className="text-xs text-emerald-600 mt-1">+15.3% {t('ecosystem.growth.vsLastMonth') || 'vs last month'}</p>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

export default ChainlinkEcosystemView;
