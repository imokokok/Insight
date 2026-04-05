'use client';

import { useState, useMemo } from 'react';

import { Scale, Clock, CheckCircle, XCircle, AlertCircle, Vote, Info, X } from 'lucide-react';

import { useTranslations, useLocale } from '@/i18n';
import { type GovernanceProposal, type ProposalStatus } from '@/lib/oracles/bandProtocol';

import { type BandProtocolGovernanceViewProps } from '../types';

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

function formatDate(timestamp: number, locale: string = 'en-US'): string {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTimeRemaining(
  endTime: number,
  t: (key: string, params?: Record<string, string | number | Date>) => string
): string {
  const now = Date.now();
  const diff = endTime - now;
  if (diff <= 0) return t('band.bandProtocol.time.ended');

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  return t('band.bandProtocol.time.timeRemaining', { days, hours });
}

function getStatusIcon(status: ProposalStatus) {
  switch (status) {
    case 'voting':
      return <Vote className="w-4 h-4 text-blue-500" />;
    case 'passed':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'failed':
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    case 'deposit':
      return <Clock className="w-4 h-4 text-yellow-500" />;
    default:
      return <Info className="w-4 h-4 text-gray-500" />;
  }
}

function getStatusColor(status: ProposalStatus): string {
  switch (status) {
    case 'voting':
      return 'bg-blue-100 text-blue-800';
    case 'passed':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'failed':
      return 'bg-orange-100 text-orange-800';
    case 'deposit':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

interface ProposalDetailModalProps {
  proposal: GovernanceProposal;
  onClose: () => void;
}

function ProposalDetailModal({ proposal, onClose }: ProposalDetailModalProps) {
  const t = useTranslations();
  const locale = useLocale();

  const totalVotes =
    proposal.votes.yes + proposal.votes.no + proposal.votes.abstain + proposal.votes.noWithVeto;
  const yesPercentage = totalVotes > 0 ? (proposal.votes.yes / totalVotes) * 100 : 0;
  const noPercentage = totalVotes > 0 ? (proposal.votes.no / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.votes.abstain / totalVotes) * 100 : 0;
  const vetoPercentage = totalVotes > 0 ? (proposal.votes.noWithVeto / totalVotes) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('band.bandProtocol.governance.proposalDetails')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon(proposal.status)}
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}
              >
                {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{proposal.title}</h3>
            <p className="text-sm text-gray-500">
              {t('band.bandProtocol.governance.proposalId')}: #{proposal.id}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('band.bandProtocol.governance.description')}
            </h4>
            <p className="text-sm text-gray-600">{proposal.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">{t('band.bandProtocol.governance.type')}</p>
              <p className="text-sm font-medium text-gray-900">{proposal.type}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.totalDeposit')}
              </p>
              <p className="text-sm font-medium text-gray-900">{proposal.totalDeposit} BAND</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.proposer')}
              </p>
              <p className="text-sm font-medium text-gray-900 font-mono truncate">
                {proposal.proposer.slice(0, 20)}...
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.votingEnds')}
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(proposal.votingEndTime, locale)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('band.bandProtocol.governance.voteResults')}
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{t('band.bandProtocol.governance.yes')}</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(proposal.votes.yes)} ({yesPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${yesPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{t('band.bandProtocol.governance.no')}</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(proposal.votes.no)} ({noPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all"
                    style={{ width: `${noPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">{t('band.bandProtocol.governance.abstain')}</span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(proposal.votes.abstain)} ({abstainPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-gray-400 h-2 rounded-full transition-all"
                    style={{ width: `${abstainPercentage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    {t('band.bandProtocol.governance.noWithVeto')}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatNumber(proposal.votes.noWithVeto)} ({vetoPercentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all"
                    style={{ width: `${vetoPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {t('band.bandProtocol.governance.totalVotes')}
              </span>
              <span className="text-lg font-semibold text-purple-600">
                {formatNumber(totalVotes)} BAND
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type FilterStatus = 'all' | ProposalStatus;

export function BandProtocolGovernanceView({
  proposals,
  governanceParams,
  isLoading,
}: BandProtocolGovernanceViewProps) {
  const t = useTranslations();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedProposal, setSelectedProposal] = useState<GovernanceProposal | null>(null);

  const filteredProposals = useMemo(() => {
    if (filterStatus === 'all') return proposals;
    return proposals.filter((p) => p.status === filterStatus);
  }, [proposals, filterStatus]);

  const stats = useMemo<{
    activeProposals: number;
    passedProposals: number;
    totalVotes: number;
    participationRate: number | null;
  }>(() => {
    const activeProposals = proposals.filter((p) => p.status === 'voting').length;
    const passedProposals = proposals.filter((p) => p.status === 'passed').length;
    const totalVotes = proposals.reduce((sum, p) => {
      return sum + p.votes.yes + p.votes.no + p.votes.abstain + p.votes.noWithVeto;
    }, 0);

    return {
      activeProposals,
      passedProposals,
      totalVotes,
      participationRate: null,
    };
  }, [proposals]);

  const filterOptions: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: t('band.bandProtocol.governance.all') },
    { value: 'voting', label: t('band.bandProtocol.governance.voting') },
    { value: 'passed', label: t('band.bandProtocol.governance.passed') },
    { value: 'rejected', label: t('band.bandProtocol.governance.rejected') },
    { value: 'deposit', label: t('band.bandProtocol.governance.deposit') },
    { value: 'failed', label: t('band.bandProtocol.governance.failed') },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Vote className="w-4 h-4" />
            <span className="text-sm">{t('band.bandProtocol.governance.activeProposals')}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {stats.activeProposals}
          </p>
        </div>

        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">{t('band.bandProtocol.governance.passedProposals')}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {stats.passedProposals}
          </p>
        </div>

        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Scale className="w-4 h-4" />
            <span className="text-sm">{t('band.bandProtocol.governance.totalVotes')}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {formatNumber(stats.totalVotes)}
          </p>
        </div>

        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Info className="w-4 h-4" />
            <span className="text-sm">{t('band.bandProtocol.governance.participationRate')}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {stats.participationRate != null ? `${stats.participationRate.toFixed(1)}%` : '-'}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {governanceParams && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Scale className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-medium text-gray-900">
              {t('band.bandProtocol.governance.params')}
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.minDeposit')}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {governanceParams.minDeposit} BAND
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.depositPeriod')}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {governanceParams.maxDepositPeriod} days
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.votingPeriod')}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {governanceParams.votingPeriod} days
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.quorum')}
              </p>
              <p className="text-sm font-semibold text-gray-900">{governanceParams.quorum}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.threshold')}
              </p>
              <p className="text-sm font-semibold text-gray-900">{governanceParams.threshold}%</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">
                {t('band.bandProtocol.governance.vetoThreshold')}
              </p>
              <p className="text-sm font-semibold text-gray-900">
                {governanceParams.vetoThreshold}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">
            {t('band.bandProtocol.governance.proposalList')}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterStatus(option.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  filterStatus === option.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredProposals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('band.bandProtocol.governance.noProposals')}
            </div>
          ) : (
            filteredProposals.map((proposal) => {
              const totalVotes =
                proposal.votes.yes +
                proposal.votes.no +
                proposal.votes.abstain +
                proposal.votes.noWithVeto;
              const yesPercentage = totalVotes > 0 ? (proposal.votes.yes / totalVotes) * 100 : 0;

              return (
                <div
                  key={proposal.id}
                  onClick={() => setSelectedProposal(proposal)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 hover:shadow-sm transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(proposal.status)}
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(proposal.status)}`}
                      >
                        {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                      </span>
                      <span className="text-xs text-gray-400">#{proposal.id}</span>
                    </div>
                    <span className="text-xs text-gray-500">{proposal.type}</span>
                  </div>

                  <h4 className="text-sm font-medium text-gray-900 mb-2">{proposal.title}</h4>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>
                      {t('band.bandProtocol.governance.proposer')}: {proposal.proposer.slice(0, 16)}
                      ...
                    </span>
                    {proposal.status === 'voting' && (
                      <span className="text-blue-600 font-medium">
                        {t('band.bandProtocol.governance.timeRemaining')}:{' '}
                        {formatTimeRemaining(proposal.votingEndTime, t)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${yesPercentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-24 text-right">
                      {t('band.bandProtocol.governance.yes')}: {yesPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
        />
      )}
    </div>
  );
}
