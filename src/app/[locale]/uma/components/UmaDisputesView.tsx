'use client';

import { useTranslations } from 'next-intl';
import { UmaDisputesViewProps } from '../types';
import { DisputeResolutionPanel } from '@/components/oracle';

export function UmaDisputesView({ disputes, networkStats, isLoading }: UmaDisputesViewProps) {
  const t = useTranslations();

  const activeDisputes = disputes.filter(d => d.status === 'active').length;
  const resolvedDisputes = disputes.filter(d => d.status === 'resolved').length;
  const rejectedDisputes = disputes.filter(d => d.status === 'rejected').length;
  const totalValue = disputes.reduce((sum, d) => sum + d.totalValue, 0);

  const stats = [
    {
      label: t('uma.disputes.activeDisputes'),
      value: activeDisputes.toString(),
      change: '+2',
      changeType: 'neutral' as const,
    },
    {
      label: t('uma.disputes.resolvedDisputes'),
      value: resolvedDisputes.toString(),
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      label: t('uma.disputes.successRate'),
      value: `${networkStats?.disputeSuccessRate ?? 78}%`,
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      label: t('uma.disputes.totalValue'),
      value: `$${(totalValue / 1e6).toFixed(2)}M`,
      change: '+8%',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stat.value}</p>
            <p className={`text-xs mt-1 ${
              stat.changeType === 'positive' ? 'text-emerald-600' : 'text-gray-500'
            }`}>
              {stat.changeType === 'positive' ? '↑ ' : '→ '}
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Dispute Resolution Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <DisputeResolutionPanel />
      </div>

      {/* Recent Disputes Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.disputes.recentDisputes')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.disputes.id')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.disputes.type')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.disputes.status')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.disputes.stakeAmount')}
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  {t('uma.disputes.reward')}
                </th>
              </tr>
            </thead>
            <tbody>
              {disputes.slice(0, 10).map((dispute) => (
                <tr key={dispute.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 px-3 text-sm text-gray-900 font-mono">
                    {dispute.id}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-600 capitalize">
                    {dispute.type}
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      dispute.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                      dispute.status === 'active' ? 'bg-amber-100 text-amber-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {dispute.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 text-right">
                    ${dispute.stakeAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-sm text-gray-900 text-right">
                    ${dispute.rewardAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
