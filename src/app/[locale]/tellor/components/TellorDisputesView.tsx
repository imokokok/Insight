'use client';

import { useState } from 'react';

import {
  Shield,
  Scale,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Gavel,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorDisputesViewProps } from '../types';

interface Dispute {
  id: string;
  reporter: string;
  stake: number;
  status: 'pending' | 'resolved';
  outcome?: 'reporter_won' | 'disputer_won';
  votes: { for: number; against: number };
  reward: number;
  timestamp: string;
  reason: string;
}

const mockDisputes: Dispute[] = [
  {
    id: '0x1a2b...3c4d',
    reporter: '0x7a8b...3c4d',
    stake: 5000,
    status: 'resolved',
    outcome: 'reporter_won',
    votes: { for: 45, against: 12 },
    reward: 250,
    timestamp: '2 hours ago',
    reason: 'Price deviation claim',
  },
  {
    id: '0x5e6f...7a8b',
    reporter: '0x9e2f...8a1b',
    stake: 3200,
    status: 'pending',
    votes: { for: 8, against: 3 },
    reward: 0,
    timestamp: '5 hours ago',
    reason: 'Data accuracy dispute',
  },
  {
    id: '0x9c0d...1e2f',
    reporter: '0x3d5c...9f2e',
    stake: 2800,
    status: 'resolved',
    outcome: 'disputer_won',
    votes: { for: 15, against: 38 },
    reward: 180,
    timestamp: '1 day ago',
    reason: 'Timestamp manipulation',
  },
  {
    id: '0x3a4b...5c6d',
    reporter: '0x1b4a...7d3c',
    stake: 1500,
    status: 'resolved',
    outcome: 'reporter_won',
    votes: { for: 52, against: 8 },
    reward: 120,
    timestamp: '2 days ago',
    reason: 'Source verification',
  },
];

const disputeFlow = [
  {
    step: 1,
    title: 'Submit Data',
    description: 'Reporter submits price data to the network',
    icon: Shield,
  },
  {
    step: 2,
    title: 'Challenge',
    description: 'Any participant can challenge the data',
    icon: AlertTriangle,
  },
  {
    step: 3,
    title: 'Vote to Resolve',
    description: 'Community votes to determine the outcome',
    icon: Scale,
  },
];

export function TellorDisputesView({ isLoading }: TellorDisputesViewProps) {
  const t = useTranslations('tellor');
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'resolved'>('all');

  const stats = [
    {
      label: t('disputes.totalDisputes'),
      value: '156',
      change: '+12',
      icon: Gavel,
    },
    {
      label: t('disputes.open'),
      value: '8',
      change: '-2',
      icon: Clock,
    },
    {
      label: t('disputes.successRate'),
      value: '72%',
      change: '+5%',
      icon: CheckCircle,
    },
    {
      label: t('disputes.totalRewards'),
      value: '45.2K',
      change: '+8.5K',
      icon: Scale,
    },
  ];

  const filteredDisputes = mockDisputes.filter((dispute) => {
    if (activeTab === 'pending') return dispute.status === 'pending';
    if (activeTab === 'resolved') return dispute.status === 'resolved';
    return true;
  });

  return (
    <div className="space-y-8">
      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
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
                <span className="text-xs text-emerald-600">{stat.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 争议解决流程 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-6">{t('disputes.howItWorks')}</h3>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {disputeFlow.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="flex items-center gap-4 flex-1">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-cyan-600" />
                  </div>
                  <span className="text-xs font-medium text-cyan-600 mt-2">Step {step.step}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                </div>
                {index < disputeFlow.length - 1 && (
                  <div className="hidden md:block w-8 h-px bg-gray-200" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 争议列表 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium text-gray-900">{t('disputes.recentDisputes')}</h3>
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'resolved'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-cyan-50 text-cyan-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'all'
                    ? t('disputes.all')
                    : tab === 'pending'
                      ? t('disputes.pending')
                      : t('disputes.resolved')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('disputes.id')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('disputes.reporter')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('disputes.stake')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('disputes.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('disputes.votes')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('disputes.reward')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDisputes.map((dispute) => (
                <>
                  <tr
                    key={dispute.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      setExpandedDispute(
                        expandedDispute === dispute.id ? null : dispute.id
                      )
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{dispute.id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://etherscan.io/tx/${dispute.id}`, '_blank');
                          }}
                          className="text-gray-400 hover:text-cyan-600 transition-colors"
                          title={t('reporters.viewOnEtherscan')}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dispute.reporter}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dispute.stake.toLocaleString()} TRB
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {dispute.status === 'pending' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {t('disputes.pending')}
                        </span>
                      ) : dispute.outcome === 'reporter_won' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {t('disputes.reporterWon')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          {t('disputes.disputerWon')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-600">{dispute.votes.for}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-red-600">{dispute.votes.against}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dispute.reward > 0 ? `${dispute.reward} TRB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {expandedDispute === dispute.id ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {expandedDispute === dispute.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('disputes.reason')}</p>
                            <p className="text-sm font-medium text-gray-900">{dispute.reason}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('disputes.time')}</p>
                            <p className="text-sm font-medium text-gray-900">{dispute.timestamp}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">{t('disputes.votingProgress')}</p>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{
                                    width: `${(dispute.votes.for / (dispute.votes.for + dispute.votes.against)) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">
                                {((dispute.votes.for / (dispute.votes.for + dispute.votes.against)) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
