'use client';

import { useState } from 'react';
import { ReporterStats, Reporter } from '@/lib/oracles/tellor';
import { useTranslations } from '@/i18n';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Users } from 'lucide-react';
import { Trophy } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { Activity } from 'lucide-react';

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
      {/* Reporter Stats */}
      <DashboardCard title={t('tellor.reporters.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-cyan-600" />
              <p className="text-xs text-gray-500">{t('tellor.reporters.total')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.totalReporters}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-gray-500">{t('tellor.reporters.active24h')}</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{data.activeReporters}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-cyan-600" />
              <p className="text-xs text-gray-500">{t('tellor.reporters.avgStake')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {(data.avgStakePerReporter / 1e3).toFixed(1)}k TRB
            </p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-500">{t('tellor.reporters.totalRewards')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              {(data.totalStaked / 1e6).toFixed(2)}M TRB
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* Top Reporters */}
      <DashboardCard title={t('tellor.reporters.topReporters')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.reporters.rank')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.reporters.address')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.reporters.reports')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.reporters.accuracy')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.reporters.stake')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.reporters.rewards')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.reporters.map((reporter, index) => (
                <tr key={reporter.address} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium ${
                        index === 0
                          ? 'bg-amber-100 text-amber-700 border border-amber-200'
                          : index === 1
                            ? 'bg-slate-100 text-slate-700 border border-slate-200'
                            : index === 2
                              ? 'bg-warning-100 text-orange-700 border border-orange-200'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-mono text-sm text-gray-900">
                      {reporter.address.slice(0, 8)}...{reporter.address.slice(-6)}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-900">
                    {reporter.totalReports.toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-success-500 h-2 rounded-full"
                          style={{ width: `${reporter.successRate * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">
                        {(reporter.successRate * 100).toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-900">
                    {(reporter.stakedAmount / 1e3).toFixed(1)}k TRB
                  </td>
                  <td className="py-2 px-3 text-emerald-600">
                    {(reporter.rewardsEarned / 1e3).toFixed(1)}k TRB
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
                <div className="p-4 bg-success-50 rounded-lg">
                  <p className="text-sm text-gray-600">{t('tellor.reporters.rewards')}</p>
                  <p className="text-xl font-bold text-success-600">
                    {(selectedReporter.rewardsEarned / 1000).toFixed(1)}K TRB
                  </p>
                </div>
                <div className="p-4 bg-primary-50 rounded-lg">
                  <p className="text-sm text-gray-600">{t('tellor.reporters.reports')}</p>
                  <p className="text-xl font-bold text-primary-600">
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
                      <div className="text-center p-4 bg-warning-50 rounded-lg">
                        <p className="text-2xl font-bold text-warning-600">
                          {disputeStats.disputesParticipated}
                        </p>
                        <p className="text-sm text-gray-600">
                          {t('tellor.reporters.participated')}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-success-50 rounded-lg">
                        <p className="text-2xl font-bold text-success-600">
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
