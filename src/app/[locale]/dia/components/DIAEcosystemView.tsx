'use client';

import { useState, useMemo } from 'react';

import {
  Building2,
  Wallet,
  ArrowRightLeft,
  TrendingUp,
  Shield,
  Sprout,
  Layers,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Globe,
  Zap,
} from 'lucide-react';
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

import { useDIAEcosystem } from '@/hooks';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Blockchain } from '@/types/oracle';

interface TVLTrendDataPoint {
  month: string;
  total: number;
  [key: string]: number | string;
}

const chainColors: Record<string, string> = {
  ethereum: '#627eea',
  arbitrum: '#28a0f0',
  polygon: '#8247e5',
  optimism: '#ff0420',
  avalanche: '#e84142',
  base: '#0052ff',
  'bnb-chain': '#f0b90b',
};

const chainLabels: Record<string, string> = {
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  polygon: 'Polygon',
  optimism: 'Optimism',
  avalanche: 'Avalanche',
  base: 'Base',
  'bnb-chain': 'BNB Chain',
};

function getChainLabel(chain: Blockchain): string {
  return chainLabels[chain] || chain;
}

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
            <span key={index} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded">
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

function IntegrationStat({ category, count, total, icon, color, t }: IntegrationStatProps) {
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
        <p className="text-xs text-gray-500 mt-1">
          {percentage}% {t('dia.ecosystem.ofTotal')}
        </p>
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
        active ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700'
      )}
    >
      {children}
    </button>
  );
}

export function DIAEcosystemView() {
  const t = useTranslations();
  const { ecosystem, isLoading, error } = useDIAEcosystem();
  const [selectedChains, setSelectedChains] = useState<string[]>([
    'ethereum',
    'arbitrum',
    'polygon',
  ]);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y'>('1Y');

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

  // TVL趋势数据 - 从API获取，没有则显示空
  const tvlTrendData = useMemo((): TVLTrendDataPoint[] => {
    // Only show TVL data if we have real ecosystem data
    if (stats.totalTVL <= 0) {
      return [];
    }

    // Return empty array - real historical TVL data would require additional API calls
    // to DeFiLlama for historical data points
    return [];
  }, [stats.totalTVL]);

  const projectsByChainData = useMemo(() => {
    if (!ecosystem || ecosystem.length === 0) {
      return [];
    }

    const chainCounts: Record<string, number> = {};
    ecosystem.forEach((item) => {
      chainCounts[item.chain] = (chainCounts[item.chain] || 0) + 1;
    });

    return Object.entries(chainCounts)
      .map(([chain, count]) => ({
        chain: getChainLabel(chain as Blockchain),
        projects: count,
        color: chainColors[chain.toLowerCase()] || '#6b7280',
      }))
      .sort((a, b) => b.projects - a.projects);
  }, [ecosystem]);

  const filteredTvlData = useMemo(() => {
    if (tvlTrendData.length === 0) return [];
    const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 };
    return tvlTrendData.slice(-months[timeRange]);
  }, [timeRange, tvlTrendData]);

  const tvlStats = useMemo(() => {
    if (filteredTvlData.length === 0) {
      return {
        current: 0,
        change: 0,
        breakdown: [] as { chain: string; value: number; color: string }[],
      };
    }

    const latest = filteredTvlData[filteredTvlData.length - 1];
    const previous = filteredTvlData[0];
    const change =
      previous.total > 0 ? ((latest.total - previous.total) / previous.total) * 100 : 0;

    const breakdown = Object.entries(chainColors)
      .filter(([chain]) => chain in latest && typeof latest[chain] === 'number')
      .map(([chain, color]) => ({
        chain: getChainLabel(chain as Blockchain),
        value: latest[chain] as number,
        color,
      }));

    return {
      current: latest.total,
      change,
      breakdown,
    };
  }, [filteredTvlData]);

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

  const categoryConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> =
    {
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
            <h3 className="text-base font-semibold text-gray-900">
              {t('dia.ecosystem.tvlAnalysis.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('dia.ecosystem.tvlAnalysis.desc')}</p>
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
              {t('dia.ecosystem.tvlAnalysis.totalTvl')}
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
              {t('dia.ecosystem.tvlAnalysis.ethereum')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${tvlStats.breakdown[0]?.value.toFixed(1) ?? '-'}B
              </p>
              <span className="text-xs text-gray-500">
                {tvlStats.breakdown[0]?.value
                  ? ((tvlStats.breakdown[0].value / tvlStats.current) * 100).toFixed(1)
                  : '-'}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('dia.ecosystem.tvlAnalysis.l2Networks')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                $
                {tvlStats.breakdown.length >= 6
                  ? (
                      tvlStats.breakdown[1].value +
                      tvlStats.breakdown[3].value +
                      tvlStats.breakdown[5].value
                    ).toFixed(1)
                  : '-'}
                B
              </p>
              <span className="text-xs text-gray-500">
                {tvlStats.breakdown.length >= 6 && tvlStats.current > 0
                  ? (
                      ((tvlStats.breakdown[1].value +
                        tvlStats.breakdown[3].value +
                        tvlStats.breakdown[5].value) /
                        tvlStats.current) *
                      100
                    ).toFixed(1)
                  : '-'}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              {t('dia.ecosystem.tvlAnalysis.altL1')}
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-xl font-semibold text-gray-900">
                ${tvlStats.breakdown.length >= 5
                  ? (tvlStats.breakdown[2].value + tvlStats.breakdown[4].value).toFixed(1)
                  : '-'}B
              </p>
              <span className="text-xs text-gray-500">
                {tvlStats.breakdown.length >= 5 && tvlStats.current > 0
                  ? (
                      ((tvlStats.breakdown[2].value + tvlStats.breakdown[4].value) /
                        tvlStats.current) *
                      100
                    ).toFixed(1)
                  : '-'}%
              </span>
            </div>
          </div>
        </div>

        {/* Chain Filter - Subtle pill buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-xs text-gray-400 mr-1">
            {t('dia.ecosystem.tvlAnalysis.filterByChain')}:
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
              {t('dia.ecosystem.projectAnalysis.projectsByChain')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('dia.ecosystem.projectAnalysis.desc')}
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
              {t('dia.ecosystem.projectAnalysis.totalProjects')}:{' '}
              <span className="font-medium text-gray-900">800+</span>
            </span>
            <span className="text-emerald-600 font-medium">
              +48 {t('dia.ecosystem.projectAnalysis.thisMonth')}
            </span>
          </div>
        </section>

        {/* Section Divider for mobile */}
        <div className="border-t border-gray-200 lg:hidden" />

        {/* 核心指标 - Clean layout without colored backgrounds */}
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">
              {t('dia.ecosystem.growth.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('dia.ecosystem.growth.desc')}</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('dia.ecosystem.growth.newProjects')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">48</p>
                <p className="text-xs text-emerald-600">+18.5%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('dia.ecosystem.growth.integrations')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">256</p>
                <p className="text-xs text-emerald-600">+22.3%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('dia.ecosystem.growth.communityGrowth')}
                </span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">18.2K</p>
                <p className="text-xs text-emerald-600">+12.8%</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {t('dia.ecosystem.growth.protocolRevenue')}
                </span>
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
        <h3 className="text-lg font-semibold text-gray-900">{t('dia.ecosystem.partners')}</h3>

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
        <h3 className="text-lg font-semibold text-gray-900">{t('dia.ecosystem.integrations')}</h3>

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
