'use client';

import { useTranslations } from 'next-intl';
import { DisputeStats, Dispute } from '@/lib/oracles/tellor';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Gavel, Scale, Clock, TrendingUp } from 'lucide-react';

interface TellorDisputesPanelProps {
  data: DisputeStats;
}

export function TellorDisputesPanel({ data }: TellorDisputesPanelProps) {
  const t = useTranslations();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-amber-100 text-amber-700';
      case 'resolved':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case 'reporter_won':
        return 'text-emerald-600';
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
      {/* Dispute Stats */}
      <DashboardCard title={t('tellor.disputes.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Gavel className="w-4 h-4 text-cyan-600" />
              <p className="text-xs text-gray-500">{t('tellor.disputes.total')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.totalDisputes}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-cyan-600" />
              <p className="text-xs text-gray-500">{t('tellor.disputes.resolved')}</p>
            </div>
            <p className="text-xl font-bold text-cyan-600">{data.resolvedDisputes}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-gray-500">{t('tellor.disputes.pending')}</p>
            </div>
            <p className="text-xl font-bold text-amber-600">{data.openDisputes}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-gray-500">{t('tellor.disputes.successRate')}</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{data.successRate}%</p>
          </div>
        </div>
      </DashboardCard>

      {/* Recent Disputes */}
      <DashboardCard title={t('tellor.disputes.recent')}>
        <div className="space-y-3">
          {data.recentDisputes.map((dispute, index) => (
            <div
              key={index}
              className={`p-4 border ${
                dispute.status === 'resolved'
                  ? dispute.outcome === 'reporter_won'
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-gray-600" />
                  <span className="font-mono text-sm text-gray-900">
                    {dispute.reporterAddress.slice(0, 8)}...{dispute.reporterAddress.slice(-6)}
                  </span>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium capitalize ${
                    dispute.status === 'resolved'
                      ? dispute.outcome === 'reporter_won'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {dispute.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {t('tellor.disputes.stakeAmount')}: {dispute.stakeAmount} TRB
                </span>
                <span>{new Date(dispute.createdAt).toLocaleString()}</span>
              </div>
              {dispute.outcome && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className={`text-sm ${getOutcomeColor(dispute.outcome)}`}>
                    {t('tellor.disputes.outcome')}: {dispute.outcome}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
}
