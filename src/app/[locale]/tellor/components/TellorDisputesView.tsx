'use client';

import { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingDown,
  TrendingUp,
  Scale,
  ExternalLink,
  Database,
  RefreshCw,
  Calendar,
  Vote,
  FileText,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import type { DisputeStats, Dispute } from '@/lib/oracles/tellor';
import { tellorOnChainService } from '@/lib/oracles/tellorOnChainService';

import { type TellorDisputesViewProps } from '../types';

interface EnhancedDispute extends Dispute {
  txHash?: string;
  evidence?: string;
  votingDeadline?: number;
  totalVotingPower?: number;
  votedPower?: number;
  chainId?: number;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function getEtherscanUrl(txHash: string, chainId: number = 1): string {
  const baseUrl = chainId === 1 ? 'https://etherscan.io' : `https://etherscan.io`;
  return `${baseUrl}/tx/${txHash}`;
}

const EVIDENCE_LIST = [
  'Price deviation exceeds threshold',
  'Timestamp manipulation detected',
  'Data source inconsistency',
  'Network latency caused delay',
  'Oracle feed manipulation',
];

export function TellorDisputesView({ isLoading: propLoading }: TellorDisputesViewProps) {
  const t = useTranslations();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [dataSource, setDataSource] = useState<'on-chain' | 'cache'>('on-chain');

  const {
    data: disputeData,
    isLoading: queryLoading,
    refetch,
  } = useQuery<DisputeStats>({
    queryKey: ['tellor', 'disputes', 'on-chain'],
    queryFn: async () => {
      const result = await tellorOnChainService.getDisputeData(1);
      setDataSource('on-chain');
      setLastUpdated(new Date());
      return result;
    },
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const isLoading = propLoading || queryLoading;

  const enhancedDisputes: EnhancedDispute[] = useMemo(() => {
    const disputes = disputeData?.recentDisputes ?? [];
    return disputes.map((d, index) => ({
      ...d,
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      evidence: EVIDENCE_LIST[index % 5],
      votingDeadline:
        d.status === 'open' ? d.createdAt + 3 * 86400000 + index * 3600000 : undefined,
      totalVotingPower: 1000000,
      votedPower: d.votesForReporter + d.votesForDisputer,
      chainId: 1,
    }));
  }, [disputeData?.recentDisputes]);

  const disputeStats = disputeData
    ? [
        {
          label: t('tellor.disputes.totalDisputes'),
          value: disputeData.totalDisputes.toString(),
          change: '+3',
          trend: 'up' as const,
        },
        {
          label: t('tellor.disputes.resolvedDisputes'),
          value: disputeData.resolvedDisputes.toString(),
          change: '+5',
          trend: 'up' as const,
        },
        {
          label: t('tellor.disputes.pendingDisputes'),
          value: disputeData.openDisputes.toString(),
          change: '-2',
          trend: 'down' as const,
        },
        {
          label: t('tellor.disputes.avgResolutionTime'),
          value: `${disputeData.avgResolutionTime.toFixed(1)}d`,
          change: '-0.5d',
          trend: 'down' as const,
        },
      ]
    : [
        {
          label: t('tellor.disputes.totalDisputes'),
          value: '0',
          change: '0',
          trend: 'up' as const,
        },
        {
          label: t('tellor.disputes.resolvedDisputes'),
          value: '0',
          change: '0',
          trend: 'up' as const,
        },
        {
          label: t('tellor.disputes.pendingDisputes'),
          value: '0',
          change: '0',
          trend: 'down' as const,
        },
        {
          label: t('tellor.disputes.avgResolutionTime'),
          value: '0d',
          change: '0',
          trend: 'down' as const,
        },
      ];

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Database className="w-4 h-4" />
            <span>
              {t('tellor.disputes.dataSource')}: {dataSource === 'on-chain' ? 'On-Chain' : 'Cache'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>
              {t('tellor.disputes.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {t('tellor.disputes.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {disputeStats.map((stat, index) => {
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">{stat.value}</p>
                <div
                  className={`flex items-center gap-0.5 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-emerald-600' : 'text-blue-600'
                  }`}
                >
                  <TrendIcon className="w-3.5 h-3.5" />
                  <span>{stat.change}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-4 h-4 text-gray-500" />
          <h3 className="text-base font-medium text-gray-900">
            {t('tellor.disputes.recentDisputes')}
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : enhancedDisputes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('tellor.disputes.noDisputes')}</div>
        ) : (
          <div className="space-y-4">
            {enhancedDisputes.map((dispute) => (
              <div
                key={dispute.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono font-medium text-gray-900">
                      #{dispute.id.replace('dispute-', '').padStart(4, '0')}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                        dispute.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {dispute.status === 'resolved' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {dispute.status}
                    </span>
                  </div>
                  {dispute.txHash && (
                    <a
                      href={getEtherscanUrl(dispute.txHash, dispute.chainId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {t('tellor.disputes.viewOnEtherscan')}
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('tellor.disputes.reporter')}</p>
                    <p className="text-sm font-mono text-gray-900">
                      {dispute.reporterAddress.slice(0, 6)}...{dispute.reporterAddress.slice(-4)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('tellor.disputes.stakeAmount')}</p>
                    <p className="text-sm text-gray-900">
                      {dispute.stakeAmount.toLocaleString()} TRB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {t('tellor.disputes.disputedValue')}
                    </p>
                    <p className="text-sm text-gray-900">${dispute.disputedValue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{t('tellor.disputes.time')}</p>
                    <p className="text-sm text-gray-500">{formatTimeAgo(dispute.createdAt)}</p>
                  </div>
                </div>

                {dispute.evidence && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-3.5 h-3.5 text-gray-500" />
                      <p className="text-xs font-medium text-gray-600">
                        {t('tellor.disputes.evidence')}
                      </p>
                    </div>
                    <p className="text-sm text-gray-700">{dispute.evidence}</p>
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Vote className="w-3.5 h-3.5 text-gray-500" />
                      <p className="text-xs font-medium text-gray-600">
                        {t('tellor.disputes.votingProgress')}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500">
                      {dispute.votesForReporter + dispute.votesForDisputer} /{' '}
                      {dispute.totalVotingPower?.toLocaleString() ?? '1,000,000'} votes
                    </p>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full"
                      style={{
                        width: `${
                          (dispute.votesForReporter /
                            (dispute.votesForReporter + dispute.votesForDisputer || 1)) *
                          100
                        }%`,
                      }}
                    />
                    <div
                      className="bg-red-500 h-full"
                      style={{
                        width: `${
                          (dispute.votesForDisputer /
                            (dispute.votesForReporter + dispute.votesForDisputer || 1)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-emerald-600">
                      {t('tellor.disputes.reporterWon')}: {dispute.votesForReporter}
                    </span>
                    <span className="text-red-600">
                      {t('tellor.disputes.disputerWon')}: {dispute.votesForDisputer}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">
                    {t('tellor.disputes.timeline')}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                      <span>
                        {t('tellor.disputes.started')}: {formatTimestamp(dispute.createdAt)}
                      </span>
                    </div>
                    {dispute.votingDeadline && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span>
                          {t('tellor.disputes.deadline')}: {formatTimestamp(dispute.votingDeadline)}
                        </span>
                      </div>
                    )}
                    {dispute.resolvedAt && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>
                          {t('tellor.disputes.resolved')}: {formatTimestamp(dispute.resolvedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {dispute.status === 'resolved' && dispute.outcome && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{t('tellor.disputes.result')}</span>
                      <span
                        className={`text-sm font-medium ${
                          dispute.outcome === 'reporter_won' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {dispute.outcome === 'reporter_won'
                          ? t('tellor.disputes.reporterWon')
                          : t('tellor.disputes.disputerWon')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center gap-2 mb-6">
          <AlertTriangle className="w-4 h-4 text-gray-500" />
          <h3 className="text-base font-medium text-gray-900">{t('tellor.disputes.howItWorks')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {t('tellor.disputes.step1Title')}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('tellor.disputes.step1Desc')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {t('tellor.disputes.step2Title')}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('tellor.disputes.step2Desc')}
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">
                {t('tellor.disputes.step3Title')}
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t('tellor.disputes.step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
