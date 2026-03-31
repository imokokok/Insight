'use client';

import { useState } from 'react';

import {
  Gavel,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  ChevronRight,
  ExternalLink,
  FileText,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorGovernanceViewProps } from '../types';

export function TellorGovernanceView({
  proposals: governanceProposals,
  votingWeights,
  stats: governanceStats,
  isLoading,
}: TellorGovernanceViewProps) {
  const t = useTranslations('tellor');
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);

  const displayStats = [
    {
      label: t('governance.totalVotingPower'),
      value: '5.2M',
      change: '+8%',
      icon: Users,
    },
    {
      label: t('governance.activeProposals'),
      value: '3',
      change: '+1',
      icon: Gavel,
    },
    {
      label: t('governance.participationRate'),
      value: '67%',
      change: '+5%',
      icon: TrendingUp,
    },
    {
      label: t('governance.nextDeadline'),
      value: '2d 8h',
      change: '',
      icon: Clock,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'active':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />;
      default:
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-emerald-100 text-emerald-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="p-4 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-cyan-50">
                  <Icon className="w-4 h-4 text-cyan-600" />
                </div>
                <span className="text-xs text-gray-500">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{stat.value}</span>
                {stat.change && <span className="text-xs text-emerald-600">{stat.change}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* 提案列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">{t('governance.proposals')}</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {governanceProposals?.map((proposal, index) => (
            <div
              key={index}
              className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedProposal(proposal.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-cyan-600">{proposal.id}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusClass(
                        proposal.status
                      )}`}
                    >
                      {getStatusIcon(proposal.status)}
                      <span className="ml-1 capitalize">{proposal.status}</span>
                    </span>
                    <span className="text-xs text-gray-400">{proposal.category}</span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">{proposal.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{proposal.description}</p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-600">
                        For: {(proposal.forVotes / 1e6).toFixed(2)}M
                      </span>
                      <span className="text-gray-400">|</span>
                      <span className="text-red-600">
                        Against: {(proposal.againstVotes / 1e6).toFixed(2)}M
                      </span>
                    </div>
                    <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{
                          width: `${
                            (proposal.forVotes / (proposal.forVotes + proposal.againstVotes)) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-xs text-gray-500">{t('governance.endsIn')}</p>
                    <p className="text-sm font-medium text-gray-900">{proposal.endBlock} blocks</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 治理指南 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('governance.howToParticipate')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: t('governance.step1Title'),
              description: t('governance.step1Desc'),
            },
            {
              step: '2',
              title: t('governance.step2Title'),
              description: t('governance.step2Desc'),
            },
            {
              step: '3',
              title: t('governance.step3Title'),
              description: t('governance.step3Desc'),
            },
          ].map((item, index) => (
            <div key={index} className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 text-xs font-medium flex items-center justify-center">
                  {item.step}
                </span>
                <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
              </div>
              <p className="text-xs text-gray-500">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
