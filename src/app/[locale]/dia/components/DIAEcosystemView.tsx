'use client';

import { useTranslations } from '@/i18n';
import { useDIAEcosystem } from '@/hooks';
import { useState, useMemo } from 'react';
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
import { Building2 } from 'lucide-react';
import { Wallet } from 'lucide-react';
import { ArrowRightLeft } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { Shield } from 'lucide-react';
import { Sprout } from 'lucide-react';
import { Layers } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { FlaskConical } from 'lucide-react';
import { Globe } from 'lucide-react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// TVL Trend Data (12 months)
const tvlTrendData = [
  { month: '2024-01', ethereum: 2.1, arbitrum: 0.8, polygon: 0.6, optimism: 0.4, avalanche: 0.3, base: 0.1, total: 4.3 },
  { month: '2024-02', ethereum: 2.3, arbitrum: 0.9, polygon: 0.7, optimism: 0.5, avalanche: 0.3, base: 0.15, total: 4.85 },
  { month: '2024-03', ethereum: 2.5, arbitrum: 1.0, polygon: 0.75, optimism: 0.55, avalanche: 0.35, base: 0.2, total: 5.35 },
  { month: '2024-04', ethereum: 2.4, arbitrum: 1.1, polygon: 0.7, optimism: 0.6, avalanche: 0.3, base: 0.25, total: 5.35 },
  { month: '2024-05', ethereum: 2.8, arbitrum: 1.2, polygon: 0.85, optimism: 0.65, avalanche: 0.4, base: 0.3, total: 6.2 },
  { month: '2024-06', ethereum: 3.1, arbitrum: 1.35, polygon: 0.9, optimism: 0.75, avalanche: 0.45, base: 0.4, total: 6.95 },
  { month: '2024-07', ethereum: 2.9, arbitrum: 1.45, polygon: 0.85, optimism: 0.8, avalanche: 0.4, base: 0.5, total: 6.9 },
  { month: '2024-08', ethereum: 3.3, arbitrum: 1.6, polygon: 1.0, optimism: 0.9, avalanche: 0.5, base: 0.6, total: 7.9 },
  { month: '2024-09', ethereum: 3.5, arbitrum: 1.8, polygon: 1.1, optimism: 1.0, avalanche: 0.55, base: 0.75, total: 8.7 },
  { month: '2024-10', ethereum: 3.4, arbitrum: 1.9, polygon: 1.15, optimism: 1.1, avalanche: 0.6, base: 0.85, total: 9.0 },
  { month: '2024-11', ethereum: 3.8, arbitrum: 2.05, polygon: 1.25, optimism: 1.2, avalanche: 0.65, base: 0.95, total: 9.9 },
  { month: '2024-12', ethereum: 4.1, arbitrum: 2.2, polygon: 1.35, optimism: 1.3, avalanche: 0.7, base: 1.1, total: 10.75 },
];

// Projects by Chain Data
const projectsByChainData = [
  { chain: 'Ethereum', projects: 320, color: '#627eea' },
  { chain: 'Arbitrum', projects: 145, color: '#28a0f0' },
  { chain: 'Polygon', projects: 128, color: '#8247e5' },
  { chain: 'Optimism', projects: 95, color: '#ff0420' },
  { chain: 'Base', projects: 78, color: '#0052ff' },
  { chain: 'Avalanche', projects: 65, color: '#e84142' },
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

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-md ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

interface PartnerCardProps {
  name: string;
  category: string;
  tvl: number;
  integrationDepth: 'full' | 'partial' | 'experimental';
  dataFeedsUsed: string[];
  website: string;
  t: (key: string) => string;
}

function PartnerCard({
  name,
  category,
  tvl,
  integrationDepth,
  dataFeedsUsed,
  website,
  t,
}: PartnerCardProps) {
  const categoryIcons: Record<string, React.ReactNode> = {
    dex: <ArrowRightLeft className="w-4 h-4" />,
    lending: <Wallet className="w-4 h-4" />,
    derivatives: <TrendingUp className="w-4 h-4" />,
    yield: <Sprout className="w-4 h-4" />,
    insurance: <Shield className="w-4 h-4" />,
    other: <Layers className="w-4 h-4" />,
  };

  const categoryLabels: Record<string, string> = {
    dex: t('dia.ecosystem.category.dex'),
    lending: t('dia.ecosystem.category.lending'),
    derivatives: t('dia.ecosystem.category.derivatives'),
    yield: t('dia.ecosystem.category.yield'),
    insurance: t('dia.ecosystem.category.insurance'),
    other: t('dia.ecosystem.category.other'),
  };

  const depthConfig = {
    full: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      color: 'text-green-600 bg-green-50',
      label: t('dia.ecosystem.depth.full'),
    },
    partial: {
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-amber-600 bg-amber-50',
      label: t('dia.ecosystem.depth.partial'),
    },
    experimental: {
      icon: <FlaskConical className="w-4 h-4" />,
      color: 'text-indigo-600 bg-indigo-50',
      label: t('dia.ecosystem.depth.experimental'),
    },
  };

  const depth = depthConfig[integrationDepth];

  const formatTVL = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {categoryIcons[category]}
                {categoryLabels[category]}
              </span>
            </div>
          </div>
        </div>
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-indigo-600 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{t('dia.ecosystem.tvl')}</p>
          <p className="text-lg font-semibold text-gray-900">{formatTVL(tvl)}</p>
        </div>
        <span
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${depth.color}`}
        >
          {depth.icon}
          {depth.label}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500 mb-2">{t('dia.ecosystem.dataFeeds')}</p>
        <div className="flex flex-wrap gap-1">
          {dataFeedsUsed.slice(0, 3).map((feed, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded"
            >
              {feed}
            </span>
          ))}
          {dataFeedsUsed.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
              +{dataFeedsUsed.length - 3}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface IntegrationStatProps {
  category: string;
  count: number;
  total: number;
  icon: React.ReactNode;
  color: string;
  t: (key: string) => string;
}

function IntegrationStat({
  category,
  count,
  total,
  icon,
  color,
  t,
}: IntegrationStatProps) {
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  const categoryLabels: Record<string, string> = {
    dex: t('dia.ecosystem.category.dex'),
    lending: t('dia.ecosystem.category.lending'),
    derivatives: t('dia.ecosystem.category.derivatives'),
    yield: t('dia.ecosystem.category.yield'),
    insurance: t('dia.ecosystem.category.insurance'),
    other: t('dia.ecosystem.category.other'),
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200">
      <div className={`p-3 rounded-md ${color}`}>{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-900">{categoryLabels[category]}</span>
          <span className="text-lg font-semibold text-gray-900">{count}</span>
        </div>
        <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">{percentage}% {t('dia.ecosystem.ofTotal')}</p>
      </div>
    </div>
  );
}

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
        active
          ? 'text-gray-900 border-b-2 border-gray-900'
          : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}

export function DIAEcosystemView() {
  const t = useTranslations();
  const { ecosystem, isLoading, error } = useDIAEcosystem();
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

  const stats = useMemo(() => {
    if (!ecosystem || ecosystem.length === 0) {
      return {
        totalProtocols: 0,
        totalTVL: 0,
        dexCount: 0,
        lendingCount: 0,
      };
    }

    const totalTVL = ecosystem.reduce((sum, item) => sum + item.tvl, 0);
    const dexCount = ecosystem.filter((item) => item.category === 'dex').length;
    const lendingCount = ecosystem.filter((item) => item.category === 'lending').length;

    return {
      totalProtocols: ecosystem.length,
      totalTVL,
      dexCount,
      lendingCount,
    };
  }, [ecosystem]);

  const categoryCounts = useMemo(() => {
    if (!ecosystem) return {};

    const counts: Record<string, number> = {
      dex: 0,
      lending: 0,
      derivatives: 0,
      yield: 0,
      insurance: 0,
      other: 0,
    };

    ecosystem.forEach((item) => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      } else {
        counts.other++;
      }
    });

    return counts;
  }, [ecosystem]);

  const groupedPartners = useMemo(() => {
    if (!ecosystem) return {};

    const groups: Record<string, typeof ecosystem> = {
      dex: [],
      lending: [],
      derivatives: [],
      yield: [],
      insurance: [],
      other: [],
    };

    ecosystem.forEach((item) => {
      if (groups[item.category]) {
        groups[item.category].push(item);
      } else {
        groups.other.push(item);
      }
    });

    return groups;
  }, [ecosystem]);

  const categoryConfig: Record<
    string,
    { icon: React.ReactNode; color: string; bgColor: string }
  > = {
    dex: {
      icon: <ArrowRightLeft className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    lending: {
      icon: <Wallet className="w-5 h-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    derivatives: {
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    yield: {
      icon: <Sprout className="w-5 h-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    insurance: {
      icon: <Shield className="w-5 h-5" />,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
    },
    other: {
      icon: <Layers className="w-5 h-5" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
  };

  const formatTVL = (value: number): string => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          {t('dia.ecosystem.error.title')}
        </h3>
        <p className="text-red-700">{t('dia.ecosystem.error.message')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 统计概览卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dia.ecosystem.stats.totalProtocols')}
          value={stats.totalProtocols.toString()}
          icon={<Building2 className="w-6 h-6 text-indigo-600" />}
          color="bg-indigo-50"
        />
        <StatCard
          title={t('dia.ecosystem.stats.totalTVL')}
          value={formatTVL(stats.totalTVL)}
          icon={<Wallet className="w-6 h-6 text-indigo-600" />}
          color="bg-indigo-50"
        />
        <StatCard
          title={t('dia.ecosystem.stats.dexIntegrations')}
          value={stats.dexCount.toString()}
          icon={<ArrowRightLeft className="w-6 h-6 text-indigo-600" />}
          color="bg-indigo-50"
        />
        <StatCard
          title={t('dia.ecosystem.stats.lendingIntegrations')}
          value={stats.lendingCount.toString()}
          icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
          color="bg-indigo-50"
        />
      </div>

      {/* TVL Trend Analysis */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{t('dia.ecosystem.tvlAnalysis.title') || 'TVL Analysis'}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Total Value Locked across DIA ecosystem</p>
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
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('dia.ecosystem.tvlAnalysis.totalTvl') || 'Total TVL'}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">${tvlStats.current.toFixed(1)}B</p>
              <span className={cn('text-sm font-medium', tvlStats.change >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {tvlStats.change >= 0 ? '+' : ''}{tvlStats.change.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="h-8 w-px bg-gray-200 hidden sm:block" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('dia.ecosystem.tvlAnalysis.ethereum') || 'Ethereum'}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">${tvlStats.breakdown[0].value.toFixed(1)}B</p>
              <span className="text-xs text-gray-500">{((tvlStats.breakdown[0].value / tvlStats.current) * 100).toFixed(1)}%</span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('dia.ecosystem.tvlAnalysis.l2Networks') || 'L2 Networks'}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${(tvlStats.breakdown[1].value + tvlStats.breakdown[3].value + tvlStats.breakdown[5].value).toFixed(1)}B
              </p>
              <span className="text-xs text-gray-500">
                {(((tvlStats.breakdown[1].value + tvlStats.breakdown[3].value + tvlStats.breakdown[5].value) / tvlStats.current) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{t('dia.ecosystem.tvlAnalysis.altL1') || 'Alt L1'}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${(tvlStats.breakdown[2].value + tvlStats.breakdown[4].value).toFixed(1)}B
              </p>
              <span className="text-xs text-gray-500">
                {(((tvlStats.breakdown[2].value + tvlStats.breakdown[4].value) / tvlStats.current) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Chain Filter - Subtle pill buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-400 mr-1">{t('dia.ecosystem.tvlAnalysis.filterByChain') || 'Filter by chain'}:</span>
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
                style={{ backgroundColor: selectedChains.includes(item.chain.toLowerCase()) ? 'white' : item.color }}
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
            <h3 className="text-base font-semibold text-gray-900">{t('dia.ecosystem.projectAnalysis.projectsByChain') || 'Projects by Chain'}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Distribution of projects across supported networks</p>
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
            <span className="text-gray-500">{t('dia.ecosystem.projectAnalysis.totalProjects') || 'Total Projects'}: <span className="font-medium text-gray-900">800+</span></span>
            <span className="text-emerald-600 font-medium">+48 {t('dia.ecosystem.projectAnalysis.thisMonth') || 'this month'}</span>
          </div>
        </section>

        {/* Section Divider for mobile */}
        <div className="border-t border-gray-200 lg:hidden" />

        {/* 核心指标 - Clean layout without colored backgrounds */}
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">{t('dia.ecosystem.growth.title') || 'Ecosystem Growth'}</h3>
            <p className="text-sm text-gray-500 mt-0.5">Key performance indicators</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{t('dia.ecosystem.growth.newProjects') || 'New Projects'}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">48</p>
                <p className="text-xs text-emerald-600">+18.5%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{t('dia.ecosystem.growth.integrations') || 'Integrations'}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">256</p>
                <p className="text-xs text-emerald-600">+22.3%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{t('dia.ecosystem.growth.communityGrowth') || 'Community'}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">18.2K</p>
                <p className="text-xs text-emerald-600">+12.8%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{t('dia.ecosystem.growth.protocolRevenue') || 'Revenue'}</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">$680K</p>
                <p className="text-xs text-emerald-600">+8.7%</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* 生态合作伙伴列表 */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('dia.ecosystem.partners')}
        </h3>

        {Object.entries(groupedPartners).map(([category, partners]) => {
          if (partners.length === 0) return null;

          const config = categoryConfig[category];

          return (
            <div key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-md ${config.bgColor} ${config.color}`}>
                  {config.icon}
                </div>
                <h4 className="font-medium text-gray-900 capitalize">
                  {t(`dia.ecosystem.category.${category}`)} ({partners.length})
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map((partner) => (
                  <PartnerCard
                    key={partner.protocolId}
                    name={partner.name}
                    category={partner.category}
                    tvl={partner.tvl}
                    integrationDepth={partner.integrationDepth}
                    dataFeedsUsed={partner.dataFeedsUsed}
                    website={partner.website}
                    t={t}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* 集成统计 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('dia.ecosystem.integrations')}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryCounts).map(([category, count]) => {
            if (count === 0) return null;

            const config = categoryConfig[category];

            return (
              <IntegrationStat
                key={category}
                category={category}
                count={count}
                total={stats.totalProtocols}
                icon={config.icon}
                color={`${config.bgColor} ${config.color}`}
                t={t}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DIAEcosystemView;
