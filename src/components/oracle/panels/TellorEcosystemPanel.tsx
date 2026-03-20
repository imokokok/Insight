'use client';

import { EcosystemStats, EcosystemProtocol } from '@/lib/oracles/tellor';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/oracle';

interface TellorEcosystemPanelProps {
  data: EcosystemStats;
}

export function TellorEcosystemPanel({ data }: TellorEcosystemPanelProps) {
  const t = useTranslations();

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      lending: t('tellor.ecosystem.lending'),
      dex: t('tellor.ecosystem.dex'),
      derivatives: t('tellor.ecosystem.derivatives'),
      yield: t('tellor.ecosystem.yield'),
      insurance: t('tellor.ecosystem.insurance'),
      other: t('tellor.ecosystem.other'),
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      lending: 'bg-primary-100 text-primary-700',
      dex: 'bg-purple-100 text-purple-700',
      derivatives: 'bg-warning-100 text-orange-700',
      yield: 'bg-success-100 text-success-700',
      insurance: 'bg-pink-100 text-pink-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard title={t('tellor.ecosystem.totalProtocols')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">{data.totalProtocols}</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.ecosystem.integrated')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.ecosystem.totalTvl')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">${(data.totalTvl / 1e9).toFixed(2)}B</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.ecosystem.tvl')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.ecosystem.dataFeeds')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">
              {data.dataFeedUsage.reduce((sum, feed) => sum + feed.usageCount, 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.ecosystem.totalUsage')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.ecosystem.avgTvlPerProtocol')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">
              ${(data.totalTvl / data.totalProtocols / 1e6).toFixed(1)}M
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.ecosystem.avgTvl')}</p>
          </div>
        </DashboardCard>
      </div>

      {/* Categories & Top Protocols */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('tellor.ecosystem.protocolsByCategory')}>
          <div className="py-4">
            <div className="space-y-3">
              {data.protocolsByCategory.map((category, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">
                    {getCategoryLabel(category.category)}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(category.count / Math.max(...data.protocolsByCategory.map((c) => c.count))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-16 text-right">
                    {category.count}
                  </span>
                  <span className="text-xs text-gray-500 w-20 text-right">
                    ${(category.tvl / 1e9).toFixed(2)}B
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.ecosystem.topProtocols')}>
          <div className="py-4">
            <div className="space-y-3">
              {data.topProtocols.map((protocol, index) => (
                <div
                  key={protocol.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400 w-6">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-gray-900">{protocol.name}</p>
                      <p className="text-xs text-gray-500">{protocol.dataFeeds.join(', ')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${getCategoryColor(protocol.category)}`}
                    >
                      {getCategoryLabel(protocol.category)}
                    </span>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      ${(protocol.tvl / 1e9).toFixed(2)}B
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Growth Trend */}
      <DashboardCard title={t('tellor.ecosystem.growthTrend')}>
        <div className="py-4">
          <div className="h-48 flex items-end gap-2">
            {data.monthlyGrowth.map((point, index) => {
              const maxTvl = Math.max(...data.monthlyGrowth.map((m) => m.totalTvl));
              const height = maxTvl > 0 ? (point.totalTvl / maxTvl) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-cyan-500/20 hover:bg-cyan-500/40 rounded-t transition-all duration-200 relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      ${(point.totalTvl / 1e9).toFixed(2)}B
                      <br />
                      {point.protocolCount} protocols
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(point.timestamp).toLocaleDateString('zh-CN', { month: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </DashboardCard>

      {/* Data Feed Usage */}
      <DashboardCard title={t('tellor.ecosystem.dataFeedUsage')}>
        <div className="py-4">
          <div className="space-y-4">
            {data.dataFeedUsage.map((feed) => (
              <div key={feed.feedId} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">{feed.feedName}</span>
                  <span className="text-sm text-cyan-600 font-medium">
                    {feed.usageCount} {t('tellor.ecosystem.uses')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {feed.protocols.map((protocol) => (
                    <span
                      key={protocol}
                      className="inline-block px-2 py-1 text-xs bg-white rounded border border-gray-200 text-gray-600"
                    >
                      {protocol}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
