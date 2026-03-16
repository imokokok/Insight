'use client';

import { DisputeStats, Dispute } from '@/lib/oracles/tellor';
import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from '@/components/oracle';

interface TellorDisputesPanelProps {
  data: DisputeStats;
}

export function TellorDisputesPanel({ data }: TellorDisputesPanelProps) {
  const { t } = useI18n();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-700';
      case 'resolved':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'reporter_won':
        return 'text-green-600';
      case 'disputer_won':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="space-y-6">
      {/* Dispute Flow Diagram */}
      <DashboardCard title={t('tellor.disputes.flow.title')}>
        <div className="py-6">
          <div className="flex items-center justify-between">
            {[
              { step: 1, label: t('tellor.disputes.flow.submit'), desc: t('tellor.disputes.flow.submitDesc') },
              { step: 2, label: t('tellor.disputes.flow.challenge'), desc: t('tellor.disputes.flow.challengeDesc') },
              { step: 3, label: t('tellor.disputes.flow.vote'), desc: t('tellor.disputes.flow.voteDesc') },
              { step: 4, label: t('tellor.disputes.flow.resolve'), desc: t('tellor.disputes.flow.resolveDesc') },
            ].map((item, index) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-lg">
                    {item.step}
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 text-center max-w-[100px]">{item.desc}</p>
                </div>
                {index < 3 && (
                  <div className="w-16 h-0.5 bg-gray-300 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard title={t('tellor.disputes.totalDisputes')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">{data.totalDisputes}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.openDisputes} {t('tellor.disputes.open')}
            </p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.disputes.successRate')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-green-600">{data.successRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.disputes.disputerWins')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.disputes.avgResolutionTime')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">{data.avgResolutionTime}d</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.disputes.average')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.disputes.totalRewards')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-purple-600">
              {(data.totalRewardsDistributed / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-gray-500 mt-1">TRB {t('tellor.disputes.distributed')}</p>
          </div>
        </DashboardCard>
      </div>

      {/* Dispute Trend */}
      <DashboardCard title={t('tellor.disputes.trend')}>
        <div className="py-4">
          <div className="h-48 flex items-end gap-1">
            {data.disputeTrend.map((point, index) => {
              const maxValue = Math.max(
                ...data.disputeTrend.map((t) => Math.max(t.opened, t.resolved))
              );
              const openedHeight = maxValue > 0 ? (point.opened / maxValue) * 100 : 0;
              const resolvedHeight = maxValue > 0 ? (point.resolved / maxValue) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="w-full flex gap-0.5 h-full items-end">
                    <div
                      className="flex-1 bg-yellow-400 rounded-t transition-all duration-200 hover:bg-yellow-500 relative"
                      style={{ height: `${openedHeight}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {t('tellor.disputes.opened')}: {point.opened}
                      </div>
                    </div>
                    <div
                      className="flex-1 bg-green-400 rounded-t transition-all duration-200 hover:bg-green-500 relative"
                      style={{ height: `${resolvedHeight}%` }}
                    >
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                        {t('tellor.disputes.resolved')}: {point.resolved}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>30 {t('tellor.disputes.daysAgo')}</span>
            <span>{t('tellor.disputes.today')}</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded" />
              <span className="text-sm text-gray-600">{t('tellor.disputes.opened')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded" />
              <span className="text-sm text-gray-600">{t('tellor.disputes.resolved')}</span>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Recent Disputes */}
      <DashboardCard title={t('tellor.disputes.recentDisputes')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.disputes.reporter')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.disputes.stake')}
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.disputes.status')}
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.disputes.outcome')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.disputes.votes')}
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                  {t('tellor.disputes.reward')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recentDisputes.map((dispute) => (
                <tr key={dispute.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-gray-700">
                      {formatAddress(dispute.reporterAddress)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {(dispute.stakeAmount / 1000).toFixed(1)}K TRB
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(
                        dispute.status
                      )}`}
                    >
                      {dispute.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {dispute.outcome && (
                      <span className={`text-sm font-medium ${getOutcomeColor(dispute.outcome)}`}>
                        {dispute.outcome === 'reporter_won'
                          ? t('tellor.disputes.reporterWon')
                          : t('tellor.disputes.disputerWon')}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    <span className="text-green-600">{dispute.votesForReporter}</span>
                    {' / '}
                    <span className="text-red-600">{dispute.votesForDisputer}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-700">
                    {dispute.reward ? `${(dispute.reward / 1000).toFixed(1)}K TRB` : '-'}
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
