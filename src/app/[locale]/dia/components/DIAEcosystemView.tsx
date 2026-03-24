'use client';

import { useTranslations } from 'next-intl';
import { useDIAEcosystem } from '@/hooks/useDIAData';
import { useMemo } from 'react';
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
} from 'lucide-react';

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

export function DIAEcosystemView() {
  const t = useTranslations();
  const { ecosystem, isLoading, error } = useDIAEcosystem();

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
