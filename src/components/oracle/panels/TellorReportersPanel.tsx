'use client';

import { ReporterStats } from '@/lib/oracles/tellor';
import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from '@/components/oracle';

interface TellorReportersPanelProps {
  data: ReporterStats;
}

export function TellorReportersPanel({ data }: TellorReportersPanelProps) {
  const { t } = useI18n();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard title={t('tellor.reporters.totalReporters')}>
          <div className="py-2">
            <p className="text-2xl font-bold text-cyan-600">{data.totalReporters}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.activeReporters} {t('tellor.reporters.active')}
            </p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.reporters.totalStaked')}>
          <div className="py-2">
            <p className="text-2xl font-bold text-cyan-600">
              {(data.totalStaked / 1000000).toFixed(2)}M TRB
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('tellor.reporters.avg')}: {(data.avgStakePerReporter / 1000).toFixed(1)}K TRB
            </p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.reporters.reports24h')}>
          <div className="py-2">
            <p className="text-2xl font-bold text-cyan-600">{data.totalReports24h.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('tellor.reporters.avgRewards')}: {(data.avgRewardsPerReporter / 1000).toFixed(1)}K TRB
            </p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.reporters.activityRate')}>
          <div className="py-2">
            <p className="text-2xl font-bold text-cyan-600">
              {((data.activeReporters / data.totalReporters) * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {data.activeReporters} / {data.totalReporters}
            </p>
          </div>
        </DashboardCard>
      </div>

      {/* Stake Distribution & Activity Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('tellor.reporters.stakeDistribution')}>
          <div className="py-4">
            <div className="space-y-3">
              {data.stakeDistribution.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-28">{item.range}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-16 text-right">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.reporters.activityTrend')}>
          <div className="py-4">
            <div className="h-48 flex items-end gap-1">
              {data.activityTrend.map((point, index) => {
                const maxReports = Math.max(...data.activityTrend.map(t => t.newReports));
                const height = maxReports > 0 ? (point.newReports / maxReports) * 100 : 0;
                return (
                  <div
                    key={index}
                    className="flex-1 bg-cyan-500/20 hover:bg-cyan-500/40 rounded-t transition-all duration-200 relative group"
                    style={{ height: `${height}%` }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {point.newReports} reports
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>24h ago</span>
              <span>Now</span>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Top Reporters */}
      <DashboardCard title={t('tellor.reporters.topReporters')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">{t('tellor.reporters.address')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">{t('tellor.reporters.staked')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">{t('tellor.reporters.reports')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">{t('tellor.reporters.successRate')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">{t('tellor.reporters.rewards')}</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">{t('tellor.reporters.status')}</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">{t('tellor.reporters.lastReport')}</th>
              </tr>
            </thead>
            <tbody>
              {data.reporters.map((reporter, index) => (
                <tr key={reporter.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6">#{index + 1}</span>
                      <span className="text-sm font-mono text-gray-700">{formatAddress(reporter.address)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {(reporter.stakedAmount / 1000).toFixed(1)}K TRB
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {reporter.totalReports.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-sm font-medium ${reporter.successRate >= 0.98 ? 'text-green-600' : reporter.successRate >= 0.95 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {(reporter.successRate * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {(reporter.rewardsEarned / 1000).toFixed(1)}K TRB
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      reporter.status === 'active' ? 'bg-green-100 text-green-700' :
                      reporter.status === 'slashed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {reporter.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-500">
                    {formatTimeAgo(reporter.lastReportTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
