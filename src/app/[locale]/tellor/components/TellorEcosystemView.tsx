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

// TVL Trend Data (12 months)
const tvlTrendData = [
  {
    month: '2024-01',
    ethereum: 450,
    arbitrum: 120,
    polygon: 85,
    optimism: 65,
    base: 25,
    total: 745,
  },
  {
    month: '2024-02',
    ethereum: 480,
    arbitrum: 135,
    polygon: 92,
    optimism: 72,
    base: 35,
    total: 814,
  },
  {
    month: '2024-03',
    ethereum: 520,
    arbitrum: 155,
    polygon: 105,
    optimism: 85,
    base: 48,
    total: 913,
  },
  {
    month: '2024-04',
    ethereum: 495,
    arbitrum: 168,
    polygon: 98,
    optimism: 92,
    base: 62,
    total: 915,
  },
  {
    month: '2024-05',
    ethereum: 550,
    arbitrum: 185,
    polygon: 115,
    optimism: 105,
    base: 78,
    total: 1033,
  },
  {
    month: '2024-06',
    ethereum: 620,
    arbitrum: 210,
    polygon: 128,
    optimism: 118,
    base: 95,
    total: 1171,
  },
  {
    month: '2024-07',
    ethereum: 585,
    arbitrum: 225,
    polygon: 122,
    optimism: 132,
    base: 115,
    total: 1179,
  },
  {
    month: '2024-08',
    ethereum: 650,
    arbitrum: 248,
    polygon: 145,
    optimism: 148,
    base: 138,
    total: 1329,
  },
  {
    month: '2024-09',
    ethereum: 720,
    arbitrum: 275,
    polygon: 162,
    optimism: 165,
    base: 165,
    total: 1487,
  },
  {
    month: '2024-10',
    ethereum: 695,
    arbitrum: 295,
    polygon: 175,
    optimism: 182,
    base: 192,
    total: 1539,
  },
  {
    month: '2024-11',
    ethereum: 780,
    arbitrum: 325,
    polygon: 195,
    optimism: 205,
    base: 225,
    total: 1730,
  },
  {
    month: '2024-12',
    ethereum: 850,
    arbitrum: 355,
    polygon: 220,
    optimism: 235,
    base: 265,
    total: 1925,
  },
];

// Projects by Chain Data
const projectsByChainData = [
  { chain: 'Ethereum', projects: 28, color: '#627eea' },
  { chain: 'Arbitrum', projects: 12, color: '#28a0f0' },
  { chain: 'Polygon', projects: 8, color: '#8247e5' },
  { chain: 'Optimism', projects: 6, color: '#ff0420' },
  { chain: 'Base', projects: 4, color: '#0052ff' },
];

// Chain Colors
const chainColors: Record<string, string> = {
  ethereum: '#627eea',
  arbitrum: '#28a0f0',
  polygon: '#8247e5',
  optimism: '#ff0420',
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
        active ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}

interface TellorEcosystemViewProps {
  isLoading?: boolean;
}

export function TellorEcosystemView({ isLoading }: TellorEcosystemViewProps) {
  const t = useTranslations('tellor');
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
              {t('ecosystem.tvlAnalysis.title') || 'TVL Analysis'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Total Value Locked across Tellor ecosystem
            </p>
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
              <p className="text-3xl font-bold text-gray-900">${tvlStats.current.toFixed(0)}M</p>
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
              <p className="text-xl font-semibold text-gray-900">${tvlStats.breakdown[0].value}M</p>
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
                  tvlStats.breakdown[4].value
                ).toFixed(0)}
                M
              </p>
              <span className="text-xs text-gray-500">
                {(
                  ((tvlStats.breakdown[1].value +
                    tvlStats.breakdown[3].value +
                    tvlStats.breakdown[4].value) /
                    tvlStats.current) *
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
                tickFormatter={(value) => `$${value}M`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
                formatter={(value) => [`$${Number(value).toFixed(0)}M`, '']}
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
              Distribution of projects across supported networks
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
              <span className="font-medium text-gray-900">58</span>
            </span>
            <span className="text-emerald-600 font-medium">
              +8 {t('ecosystem.projectAnalysis.thisMonth') || 'this month'}
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
            <p className="text-sm text-gray-500 mt-0.5">Key performance indicators</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('ecosystem.growth.protocols') || 'Protocols'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">45+</p>
                <p className="text-xs text-emerald-600">+3</p>
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
                <p className="text-lg font-semibold text-gray-900">120+</p>
                <p className="text-xs text-emerald-600">+8</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('ecosystem.growth.chains') || 'Supported Chains'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">6</p>
                <p className="text-xs text-emerald-600">+1</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('ecosystem.growth.tvlGrowth') || 'TVL Growth'}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">$850M</p>
                <p className="text-xs text-emerald-600">+12%</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* 协议集成 */}
      <section>
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t('tellor.ecosystem.protocolIntegrations') || 'Protocol Integrations'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { name: 'Aave', category: 'Lending', tvl: '$450M', status: 'active' },
            { name: 'Compound', category: 'Lending', tvl: '$180M', status: 'active' },
            { name: 'Synthetix', category: 'Derivatives', tvl: '$120M', status: 'active' },
            { name: 'Liquity', category: 'Stablecoin', tvl: '$85M', status: 'active' },
            { name: 'Alchemix', category: 'Yield', tvl: '$45M', status: 'active' },
            { name: 'Float Capital', category: 'Derivatives', tvl: '$25M', status: 'active' },
          ].map((protocol, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{protocol.name}</p>
                <p className="text-xs text-gray-500">{protocol.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">{protocol.tvl}</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  {protocol.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
