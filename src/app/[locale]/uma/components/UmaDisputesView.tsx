'use client';

import { useState } from 'react';

import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Scale,
  TrendingUp,
  Clock,
  Shield,
  ChevronRight,
  Vote,
} from 'lucide-react';

import { DisputeResolutionPanel } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type UmaDisputesViewProps } from '../types';

import { DisputeVotingDetails } from './DisputeVotingDetails';

const disputeTrendData = [
  { day: 'Mon', active: 3, resolved: 5 },
  { day: 'Tue', active: 4, resolved: 3 },
  { day: 'Wed', active: 2, resolved: 6 },
  { day: 'Thu', active: 5, resolved: 4 },
  { day: 'Fri', active: 3, resolved: 7 },
  { day: 'Sat', active: 2, resolved: 4 },
  { day: 'Sun', active: 4, resolved: 5 },
];

export function UmaDisputesView({ disputes, networkStats, isLoading }: UmaDisputesViewProps) {
  const t = useTranslations();
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);

  const activeDisputes = disputes.filter((d) => d.status === 'active').length;
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved').length;
  const rejectedDisputes = disputes.filter((d) => d.status === 'rejected').length;
  const totalValue = disputes.reduce((sum, d) => sum + d.totalValue, 0);

  const maxActive = Math.max(...disputeTrendData.map((d) => d.active));
  const maxResolved = Math.max(...disputeTrendData.map((d) => d.resolved));

  const selectedDispute = selectedDisputeId
    ? disputes.find((d) => d.id === selectedDisputeId)
    : disputes.find((d) => d.status === 'active') || disputes[0];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-6 md:gap-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gray-200 rounded animate-pulse" />
              <div>
                <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                <div className="w-12 h-6 bg-gray-200 rounded mt-1 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-8">
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-6 md:gap-8">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('uma.disputes.activeDisputes')}
            </p>
            <p className="text-xl font-semibold text-gray-900">{activeDisputes}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('uma.disputes.resolvedDisputes')}
            </p>
            <p className="text-xl font-semibold text-emerald-600">{resolvedDisputes}</p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-blue-500" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('uma.disputes.successRate')}
            </p>
            <p className="text-xl font-semibold text-gray-900">
              {networkStats?.disputeSuccessRate ?? 78}%
            </p>
          </div>
        </div>
        <div className="hidden md:block w-px h-8 bg-gray-200" />
        <div className="flex items-center gap-3">
          <Scale className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              {t('uma.disputes.totalValue')}
            </p>
            <p className="text-xl font-semibold text-gray-900">${(totalValue / 1e6).toFixed(2)}M</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {t('uma.disputes.trend')}
          </h3>
        </div>
        <div className="flex items-end gap-3 h-24">
          {disputeTrendData.map((data, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex gap-0.5 items-end justify-center h-16">
                <div
                  className="w-2 bg-amber-400 rounded-sm"
                  style={{ height: `${(data.active / maxActive) * 100}%`, minHeight: '4px' }}
                  title={`Active: ${data.active}`}
                />
                <div
                  className="w-2 bg-emerald-400 rounded-sm"
                  style={{ height: `${(data.resolved / maxResolved) * 100}%`, minHeight: '4px' }}
                  title={`Resolved: ${data.resolved}`}
                />
              </div>
              <span className="text-xs text-gray-400">{data.day}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-amber-400 rounded-sm" />
            <span>{t('uma.disputes.active')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-emerald-400 rounded-sm" />
            <span>{t('uma.disputes.resolved')}</span>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {t('uma.disputes.resolutionPanel')}
          </h3>
        </div>
        <DisputeResolutionPanel />
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {t('uma.disputes.recentDisputes')}
            </h3>
          </div>
          <span className="text-xs text-gray-400">
            {disputes.length} {t('uma.disputes.total')}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">
                  {t('uma.disputes.id')}
                </th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">
                  {t('uma.disputes.type')}
                </th>
                <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500">
                  {t('uma.disputes.status')}
                </th>
                <th className="text-right py-2 pr-4 text-xs font-medium text-gray-500">
                  {t('uma.disputes.stakeAmount')}
                </th>
                <th className="text-right py-2 text-xs font-medium text-gray-500">
                  {t('uma.disputes.reward')}
                </th>
              </tr>
            </thead>
            <tbody>
              {disputes.slice(0, 10).map((dispute) => (
                <tr key={dispute.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-3 pr-4 text-sm text-gray-900 font-mono">
                    {dispute.id.slice(0, 8)}...
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-600 capitalize">{dispute.type}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${
                        dispute.status === 'resolved'
                          ? 'text-emerald-600'
                          : dispute.status === 'active'
                            ? 'text-amber-600'
                            : 'text-red-600'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          dispute.status === 'resolved'
                            ? 'bg-emerald-500'
                            : dispute.status === 'active'
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                        }`}
                      />
                      {dispute.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-900 text-right font-tabular">
                    ${dispute.stakeAmount.toLocaleString()}
                  </td>
                  <td className="py-3 text-sm text-gray-900 text-right font-tabular">
                    ${dispute.rewardAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {t('uma.disputes.resolutionStats')}
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('uma.disputes.avgResolutionTime')}</p>
            <p className="text-lg font-semibold text-gray-900">
              {networkStats?.avgResolutionTime ? `${networkStats.avgResolutionTime}h` : '24h'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('uma.disputes.rejected')}</p>
            <p className="text-lg font-semibold text-red-600">{rejectedDisputes}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">{t('uma.disputes.avgStake')}</p>
            <p className="text-lg font-semibold text-gray-900">
              $
              {disputes.length > 0
                ? Math.round(
                    disputes.reduce((sum, d) => sum + d.stakeAmount, 0) / disputes.length
                  ).toLocaleString()
                : '0'}
            </p>
          </div>
        </div>
      </div>

      {selectedDispute && (
        <div className="border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Vote className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                {t('uma.disputes.votingDetails')}
              </h3>
            </div>
            {disputes.filter((d) => d.status === 'active').length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('uma.disputes.selectDispute')}:</span>
                <select
                  value={selectedDisputeId || ''}
                  onChange={(e) => setSelectedDisputeId(e.target.value || null)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white"
                >
                  {disputes
                    .filter((d) => d.status === 'active')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id.slice(0, 8)}... - {d.type}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>
          <DisputeVotingDetails dispute={selectedDispute} isLoading={isLoading} />
        </div>
      )}

      {disputes.filter((d) => d.status === 'active').length > 1 && (
        <div className="border-t border-gray-200 pt-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              {t('uma.disputes.activeQuickSelect')}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {disputes
              .filter((d) => d.status === 'active')
              .slice(0, 6)
              .map((dispute) => (
                <button
                  key={dispute.id}
                  onClick={() => setSelectedDisputeId(dispute.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedDisputeId === dispute.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono text-gray-900">
                      {dispute.id.slice(0, 8)}...
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-700">
                      {t('uma.disputes.active')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="capitalize">{dispute.type}</span>
                    <span>${dispute.stakeAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-end mt-2 text-xs text-primary-600">
                    <span>{t('uma.disputes.viewVotingDetails')}</span>
                    <ChevronRight className="w-3 h-3 ml-1" />
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
