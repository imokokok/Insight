'use client';

import { useState } from 'react';
import { ReporterStats, Reporter } from '@/lib/oracles/tellor';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/oracle';

interface TellorReportersPanelProps {
  data: ReporterStats;
}

export function TellorReportersPanel({ data }: TellorReportersPanelProps) {
  const t = useTranslations();
  const [selectedReporter, setSelectedReporter] = useState<Reporter | null>(null);

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

  // Mock dispute stats for reporters
  const getReporterDisputeStats = (reporterId: string) => {
    return {
      disputesParticipated: Math.floor(Math.random() * 20),
      disputesWon: Math.floor(Math.random() * 15),
      disputeRewards: Math.floor(Math.random() * 50000) + 5000,
    };
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
            <p className="text-2xl font-bold text-cyan-600">
              {data.totalReports24h.toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {t('tellor.reporters.avgRewards')}: {(data.avgRewardsPerReporter / 1000).toFixed(1)}K
              TRB
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

      {/* Dispute Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DashboardCard title={t('tellor.reporters.avgDisputes')}>
          <div className="py-2">
            <p className="text-2xl font-bold text-purple-600">12.5</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.reporters.perReporter')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.reporters.disputeSuccessRate')}>
          <div className="py-2">
            <p className="text-2xl font-bold text-green-600">68.4%</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.reporters.won')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.reporters.totalDisputeRewards')}>
          <div className="py-2">
            <p className="text-2xl font-bold text-yellow-600">450K TRB</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.reporters.distributed')}</p>
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
                const maxReports = Math.max(...data.activityTrend.map((t) => t.newReports));
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
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.reporters.address')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.reporters.staked')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.reporters.reports')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.reporters.successRate')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.reporters.rewards')}
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.reporters.status')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.reporters.lastReport')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.reporters.map((reporter, index) => (
                <tr
                  key={reporter.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedReporter(reporter)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6">#{index + 1}</span>
                      <span className="text-sm font-mono text-gray-700">
                        {formatAddress(reporter.address)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {(reporter.stakedAmount / 1000).toFixed(1)}K TRB
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {reporter.totalReports.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-sm font-medium ${reporter.successRate >= 0.98 ? 'text-green-600' : reporter.successRate >= 0.95 ? 'text-yellow-600' : 'text-red-600'}`}
                    >
                      {(reporter.successRate * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {(reporter.rewardsEarned / 1000).toFixed(1)}K TRB
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        reporter.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : reporter.status === 'slashed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
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

      {/* Reporter Detail Modal */}
      {selectedReporter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('tellor.reporters.reporterDetails')}
                </h3>
                <button
                  onClick={() => setSelectedReporter(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Reporter Address */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">{t('tellor.reporters.address')}</p>
                <p className="text-sm font-mono text-gray-900">{selectedReporter.address}</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-cyan-50 rounded-lg">
                  <p className="text-sm text-gray-600">{t('tellor.reporters.staked')}</p>
                  <p className="text-xl font-bold text-cyan-600">
                    {(selectedReporter.stakedAmount / 1000).toFixed(1)}K TRB
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">{t('tellor.reporters.rewards')}</p>
                  <p className="text-xl font-bold text-green-600">
                    {(selectedReporter.rewardsEarned / 1000).toFixed(1)}K TRB
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">{t('tellor.reporters.reports')}</p>
                  <p className="text-xl font-bold text-blue-600">
                    {selectedReporter.totalReports.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">{t('tellor.reporters.successRate')}</p>
                  <p className="text-xl font-bold text-purple-600">
                    {(selectedReporter.successRate * 100).toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Dispute Stats */}
              {(() => {
                const disputeStats = getReporterDisputeStats(selectedReporter.id);
                return (
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      {t('tellor.reporters.disputeStats')}
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <p className="text-2xl font-bold text-yellow-600">
                          {disputeStats.disputesParticipated}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t('tellor.reporters.participated')}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {disputeStats.disputesWon}
                        </p>
                        <p className="text-sm text-gray-600">{t('tellor.reporters.won')}</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {(disputeStats.disputeRewards / 1000).toFixed(1)}K
                        </p>
                        <p className="text-sm text-gray-600">TRB {t('tellor.reporters.earned')}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Revenue Attribution */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('tellor.reporters.revenueAttribution')}
                </h4>
                {(() => {
                  const disputeStats = getReporterDisputeStats(selectedReporter.id);
                  const reportingRevenue =
                    selectedReporter.rewardsEarned - disputeStats.disputeRewards;
                  const totalRevenue = selectedReporter.rewardsEarned;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">
                          {t('tellor.reporters.reportingRevenue')}
                        </span>
                        <div className="text-right">
                          <span className="font-medium">
                            {(reportingRevenue / 1000).toFixed(1)}K TRB
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({((reportingRevenue / totalRevenue) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">
                          {t('tellor.reporters.disputeRevenue')}
                        </span>
                        <div className="text-right">
                          <span className="font-medium">
                            {(disputeStats.disputeRewards / 1000).toFixed(1)}K TRB
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({((disputeStats.disputeRewards / totalRevenue) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-cyan-50 rounded-lg">
                        <span className="font-medium text-gray-900">
                          {t('tellor.reporters.totalRevenue')}
                        </span>
                        <span className="font-bold text-cyan-600">
                          {(totalRevenue / 1000).toFixed(1)}K TRB
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
