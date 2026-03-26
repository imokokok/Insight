'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, Layers, Globe, Zap, Shield, Clock, Users, Building2 } from 'lucide-react';
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

import { type UmaEcosystemViewProps } from '../types';

// TVL Trend Data (12 months) - UMA ecosystem
const tvlTrendData = [
  { month: '2024-01', ethereum: 180, arbitrum: 45, polygon: 25, optimism: 15, total: 265 },
  { month: '2024-02', ethereum: 195, arbitrum: 52, polygon: 28, optimism: 18, total: 293 },
  { month: '2024-03', ethereum: 210, arbitrum: 58, polygon: 32, optimism: 22, total: 322 },
  { month: '2024-04', ethereum: 205, arbitrum: 65, polygon: 35, optimism: 25, total: 330 },
  { month: '2024-05', ethereum: 225, arbitrum: 72, polygon: 38, optimism: 28, total: 363 },
  { month: '2024-06', ethereum: 240, arbitrum: 78, polygon: 42, optimism: 32, total: 392 },
  { month: '2024-07', ethereum: 235, arbitrum: 85, polygon: 45, optimism: 35, total: 400 },
  { month: '2024-08', ethereum: 255, arbitrum: 92, polygon: 48, optimism: 38, total: 433 },
  { month: '2024-09', ethereum: 270, arbitrum: 98, polygon: 52, optimism: 42, total: 462 },
  { month: '2024-10', ethereum: 265, arbitrum: 105, polygon: 55, optimism: 45, total: 470 },
  { month: '2024-11', ethereum: 285, arbitrum: 112, polygon: 58, optimism: 48, total: 503 },
  { month: '2024-12', ethereum: 305, arbitrum: 120, polygon: 62, optimism: 52, total: 539 },
];

// Projects by Chain Data - UMA ecosystem
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

export function UmaEcosystemView({ config }: UmaEcosystemViewProps) {
  const t = useTranslations();
  const [selectedChains, setSelectedChains] = useState<string[]>([
    'ethereum',
    'arbitrum',
    'polygon',
  ]);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');

  const integrations = [
    { name: 'Across Protocol', category: 'bridge', tvl: '$450M' },
    { name: 'Polymarket', category: 'prediction', tvl: '$120M' },
    { name: 'SuperUMAn', category: 'community', tvl: '$25M' },
    { name: 'Risk Labs', category: 'infrastructure', tvl: '$180M' },
    { name: 'Outcome.Finance', category: 'derivatives', tvl: '$85M' },
    { name: 'Sherlock', category: 'insurance', tvl: '$45M' },
  ];

  const supportedChains = config.supportedChains.map((chain) => chain.toString());

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
      ],
    };
  }, [filteredTvlData]);

  return (
    <div className="space-y-8">
      {/* TVL Trend Analysis */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">TVL Trend Analysis</h3>
            <p className="text-sm text-gray-500 mt-0.5">Total Value Locked across UMA ecosystem</p>
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
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total TVL</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">${tvlStats.current}M</p>
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
            <p className="text-xs text-gray-500 uppercase tracking-wide">Ethereum</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">${tvlStats.breakdown[0].value}M</p>
              <span className="text-xs text-gray-500">
                {((tvlStats.breakdown[0].value / tvlStats.current) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">L2 Networks</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${(tvlStats.breakdown[1].value + tvlStats.breakdown[3].value).toFixed(0)}M
              </p>
              <span className="text-xs text-gray-500">
                {(
                  ((tvlStats.breakdown[1].value + tvlStats.breakdown[3].value) / tvlStats.current) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Sidechains</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">${tvlStats.breakdown[2].value}M</p>
              <span className="text-xs text-gray-500">
                {((tvlStats.breakdown[2].value / tvlStats.current) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chain Filter - Subtle pill buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-400 mr-1">Filter by chain:</span>
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
                <linearGradient id="colorOptimism" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chainColors.optimism} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={chainColors.optimism} stopOpacity={0.1} />
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
              {selectedChains.includes('optimism') && (
                <Area
                  type="monotone"
                  dataKey="optimism"
                  name="Optimism"
                  stackId="1"
                  stroke={chainColors.optimism}
                  fill="url(#colorOptimism)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* 生态概览 - 两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 项目分布 */}
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Projects by Chain</h3>
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
              Total Projects: <span className="font-medium text-gray-900">58</span>
            </span>
            <span className="text-emerald-600 font-medium">+12 this month</span>
          </div>
        </section>

        {/* Section Divider for mobile */}
        <div className="border-t border-gray-200 lg:hidden" />

        {/* 核心指标 - Clean layout without colored backgrounds */}
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Ecosystem Growth</h3>
            <p className="text-sm text-gray-500 mt-0.5">Key performance indicators</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">New Projects</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">12</p>
                <p className="text-xs text-emerald-600">+26.3%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Integrations</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">25+</p>
                <p className="text-xs text-emerald-600">+19.0%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Supported Chains</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {config.supportedChains.length}
                </p>
                <p className="text-xs text-emerald-600">+2 new</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Total Value Secured</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">$905M+</p>
                <p className="text-xs text-emerald-600">+15.3%</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* Supported Chains */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            {t('uma.ecosystem.supportedChains')}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Active blockchain networks</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {supportedChains.map((chain, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-200"
            >
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
              {chain}
            </span>
          ))}
        </div>
      </section>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* Integrations - Table format */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            {t('uma.ecosystem.integrations')}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Projects integrated with UMA</p>
        </div>
        <div className="overflow-hidden border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Project</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Category</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">TVL</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((integration, index) => (
                <tr key={index} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">{integration.name}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
                      {integration.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-gray-900">
                    {integration.tvl}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* UMA Features */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">{t('uma.ecosystem.features')}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Core capabilities and advantages</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.optimisticOracle')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.ecosystem.optimisticOracleDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.disputeResolution')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.ecosystem.disputeResolutionDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.fastFinality')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">{t('uma.ecosystem.fastFinalityDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.decentralizedValidators')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.ecosystem.decentralizedValidatorsDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default UmaEcosystemView;
