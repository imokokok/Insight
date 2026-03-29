'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Vote,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  BookOpen,
  HelpCircle,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon,
  FileText,
  Settings,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import {
  type GovernanceProposal,
  type VotingWeightDistribution,
  type GovernanceStats,
  PROPOSAL_CATEGORY_CONFIG,
  PROPOSAL_STATUS_CONFIG,
} from '@/lib/oracles/uma/governanceTypes';
import { formatNumber } from '@/lib/utils/format';

interface GovernanceViewProps {
  proposals?: GovernanceProposal[];
  votingWeights?: VotingWeightDistribution[];
  stats?: GovernanceStats;
  isLoading?: boolean;
}

type TabId = 'active' | 'history' | 'guide';

function CountdownTimer({ endBlock, currentBlock, t }: { endBlock: number; currentBlock: number; t: ReturnType<typeof useTranslations> }) {
  const blocksRemaining = endBlock - currentBlock;
  const secondsRemaining = blocksRemaining * 12;
  const [timeLeft, setTimeLeft] = useState(secondsRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const days = Math.floor(timeLeft / (60 * 60 * 24));
  const hours = Math.floor((timeLeft % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60);

  const isUrgent = days === 0 && hours < 12;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isUrgent ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
      }`}
    >
      <Clock className={`w-4 h-4 ${isUrgent ? 'animate-pulse' : ''}`} />
      <span className="font-mono text-sm font-semibold">
        {days > 0 && `${days}d `}
        {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m
      </span>
      <span className="text-xs">{t('uma.governance.reached')}</span>
    </div>
  );
}

function ProposalCard({
  proposal,
  onViewDetails,
  t,
}: {
  proposal: GovernanceProposal;
  onViewDetails?: (proposal: GovernanceProposal) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const categoryConfig = PROPOSAL_CATEGORY_CONFIG[proposal.category];
  const statusConfig = PROPOSAL_STATUS_CONFIG[proposal.status];

  const totalVotes = proposal.forVotes + proposal.againstVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const quorumPercentage = (totalVotes / proposal.quorum) * 100;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded border ${categoryConfig.bgColor} ${categoryConfig.borderColor} ${categoryConfig.color}`}
            >
              {t(categoryConfig.label)}
            </span>
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded ${statusConfig.bgColor} ${statusConfig.color}`}
            >
              {t(statusConfig.label)}
            </span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">{proposal.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{proposal.description}</p>
        </div>
      </div>

      {proposal.status === 'active' && (
        <div className="mb-4">
          <CountdownTimer endBlock={proposal.endBlock} currentBlock={proposal.startBlock + 1000} t={t} />
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-gray-600">{t('uma.governance.support')}</span>
            </span>
            <span className="font-semibold text-gray-900">
              {formatNumber(proposal.forVotes, true)} ({forPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${forPercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-gray-600">{t('uma.governance.against')}</span>
            </span>
            <span className="font-semibold text-gray-900">
              {formatNumber(proposal.againstVotes, true)} ({againstPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all duration-500"
              style={{ width: `${againstPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>{t('uma.governance.quorumLabel')}: {quorumPercentage.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                quorumPercentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{quorumPercentage >= 100 ? t('uma.governance.reached') : t('uma.governance.notReached')}</span>
          </div>
        </div>
        <button
          onClick={() => onViewDetails?.(proposal)}
          className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          {t('uma.governance.viewDetails')}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function VotingWeightChart({ weights, t }: { weights: VotingWeightDistribution[]; t: ReturnType<typeof useTranslations> }) {
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar');
  const totalPower = weights.reduce((sum, w) => sum + w.votingPower, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{t('uma.governance.votingWeightDistribution')}</h4>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('bar')}
            className={`p-1.5 rounded ${viewMode === 'bar' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('pie')}
            className={`p-1.5 rounded ${viewMode === 'pie' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
          >
            <PieChartIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'bar' ? (
        <div className="space-y-3">
          {weights.slice(0, 10).map((weight, index) => (
            <div key={index} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-gray-600">
                    {weight.holder.slice(0, 6)}...{weight.holder.slice(-4)}
                  </span>
                  {weight.isDelegated && (
                    <span className="px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                      {t('uma.governance.delegated')}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-gray-900">
                  {formatNumber(weight.votingPower, true)} ({weight.percentage.toFixed(2)}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-500"
                  style={{ width: `${weight.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-6">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {(() => {
                let accumulatedPercentage = 0;
                return weights.slice(0, 8).map((weight, index) => {
                  const offset = accumulatedPercentage;
                  accumulatedPercentage += weight.percentage;
                  const colors = [
                    '#dc2626',
                    '#ea580c',
                    '#d97706',
                    '#65a30d',
                    '#059669',
                    '#0891b2',
                    '#2563eb',
                    '#7c3aed',
                  ];
                  return (
                    <circle
                      key={index}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={colors[index % colors.length]}
                      strokeWidth="12"
                      strokeDasharray={`${weight.percentage * 2.51} ${251}`}
                      strokeDashoffset={`-${offset * 2.51}`}
                      className="transition-all duration-500"
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-gray-900">
                {formatNumber(totalPower, true)}
              </span>
              <span className="text-xs text-gray-500">{t('uma.governance.totalWeight')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-gray-100">
        <div className="p-2 rounded-lg bg-blue-50 text-center">
          <p className="text-xs text-gray-600 mb-0.5">{t('uma.governance.totalHolders')}</p>
          <p className="text-base font-semibold text-gray-900">{weights.length}</p>
        </div>
        <div className="p-2 rounded-lg bg-purple-50 text-center">
          <p className="text-xs text-gray-600 mb-0.5">{t('uma.governance.delegationRatio')}</p>
          <p className="text-base font-semibold text-gray-900">
            {((weights.filter((w) => w.isDelegated).length / weights.length) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-50 text-center">
          <p className="text-xs text-gray-600 mb-0.5">{t('uma.governance.avgWeight')}</p>
          <p className="text-base font-semibold text-gray-900">
            {formatNumber(totalPower / weights.length, true)}
          </p>
        </div>
      </div>
    </div>
  );
}

function GovernanceGuide({ t }: { t: ReturnType<typeof useTranslations> }) {
  const sections = [
    {
      icon: <Vote className="w-5 h-5" />,
      title: t('uma.governance.howToParticipate'),
      content: [
        t('uma.governance.holdUmaToVote'),
        t('uma.governance.viewActiveProposals'),
        t('uma.governance.voteDuringPeriod'),
        t('uma.governance.canDelegate'),
      ],
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: t('uma.governance.votingWeightCalculation'),
      content: [
        t('uma.governance.votingWeightFormula'),
        t('uma.governance.delegatedTokensBelong'),
        t('uma.governance.snapshotDeterminesWeight'),
        t('uma.governance.weightNotReleasedImmediately'),
      ],
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: t('uma.governance.proposalProcess'),
      content: [
        t('uma.governance.stage1CommunityDiscussion'),
        t('uma.governance.stage2TemperatureCheck'),
        t('uma.governance.stage3OnChainProposal'),
        t('uma.governance.stage4Execution'),
      ],
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: t('uma.governance.proposalTypes'),
      content: [
        t('uma.governance.parameterAdjustment'),
        t('uma.governance.protocolUpgrade'),
        t('uma.governance.treasuryManagement'),
        t('uma.governance.otherProposals'),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-gray-400" />
        <h3 className="text-base font-semibold text-gray-900">{t('uma.governance.governanceGuide')}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-primary-600">{section.icon}</span>
              <h4 className="font-semibold text-gray-900">{section.title}</h4>
            </div>
            <ul className="space-y-2">
              {section.content.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                  <ChevronRight className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">{t('uma.governance.commonQuestions')}</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-700">{t('uma.governance.canModifyVote')}</p>
                <p>{t('uma.governance.cannotModifyVote')}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">{t('uma.governance.tokensRequiredToPropose')}</p>
                <p>{t('uma.governance.need100UmaToPropose')}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">{t('uma.governance.votingRewardDistribution')}</p>
                <p>{t('uma.governance.votingRewardsByWeight')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMockProposals(): GovernanceProposal[] {
  const proposals: GovernanceProposal[] = [
    {
      id: 'prop-001',
      title: 'Increase Validator Staking Requirements',
      description:
        'Proposal to increase the minimum staking requirement for validators from 10,000 UMA to 15,000 UMA to enhance network security and validator commitment.',
      status: 'active',
      proposer: '0x1234567890abcdef1234567890abcdef12345678',
      startBlock: 18000000,
      endBlock: 18010000,
      forVotes: 2500000,
      againstVotes: 1200000,
      quorum: 4000000,
      votingPower: 3700000,
      category: 'parameter',
    },
    {
      id: 'prop-002',
      title: 'Protocol Upgrade V2.5',
      description:
        'Upgrade UMA Optimistic Oracle to V2.5, introducing new dispute resolution mechanisms and faster finality times.',
      status: 'active',
      proposer: '0xabcdef1234567890abcdef1234567890abcdef12',
      startBlock: 18001000,
      endBlock: 18011000,
      forVotes: 3100000,
      againstVotes: 800000,
      quorum: 4000000,
      votingPower: 3900000,
      category: 'upgrade',
    },
    {
      id: 'prop-003',
      title: 'Treasury Fund Allocation',
      description: 'Proposal to allocate 500,000 UMA from treasury for ecosystem development fund to support UMA-based projects.',
      status: 'passed',
      proposer: '0x9876543210fedcba9876543210fedcba98765432',
      startBlock: 17950000,
      endBlock: 17960000,
      forVotes: 4200000,
      againstVotes: 1500000,
      quorum: 4000000,
      votingPower: 5700000,
      category: 'treasury',
    },
    {
      id: 'prop-004',
      title: 'Adjust Dispute Fee Structure',
      description: 'Modify dispute fee structure to lower participation threshold for small disputes while maintaining deterrence against malicious disputes.',
      status: 'rejected',
      proposer: '0xfedcba9876543210fedcba9876543210fedcba98',
      startBlock: 17900000,
      endBlock: 17910000,
      forVotes: 1800000,
      againstVotes: 3200000,
      quorum: 4000000,
      votingPower: 5000000,
      category: 'parameter',
    },
    {
      id: 'prop-005',
      title: 'Community Governance Tool Development',
      description: 'Fund development of community governance dashboard providing better proposal tracking and voting analysis tools.',
      status: 'pending',
      proposer: '0x1111222233334444555566667777888899990000',
      startBlock: 18020000,
      endBlock: 18030000,
      forVotes: 0,
      againstVotes: 0,
      quorum: 4000000,
      votingPower: 0,
      category: 'other',
    },
  ];

  return proposals;
}

function generateMockVotingWeights(): VotingWeightDistribution[] {
  const holders = [
    { address: '0x1234567890abcdef1234567890abcdef12345678', power: 5000000, delegated: false },
    { address: '0xabcdef1234567890abcdef1234567890abcdef12', power: 3200000, delegated: true },
    { address: '0x9876543210fedcba9876543210fedcba98765432', power: 2800000, delegated: false },
    { address: '0xfedcba9876543210fedcba9876543210fedcba98', power: 2100000, delegated: true },
    { address: '0x1111222233334444555566667777888899990000', power: 1800000, delegated: false },
    { address: '0xaaaa1111bbbb2222cccc3333dddd4444eeee5555', power: 1500000, delegated: true },
    { address: '0x5555eeee4444dddd3333cccc2222bbbb1111aaaa', power: 1200000, delegated: false },
    { address: '0x6666ffff00001111222233334444555566667777', power: 1000000, delegated: true },
    { address: '0x7777aaaa8888bbbb9999cccc0000dddd1111eeee', power: 800000, delegated: false },
    { address: '0x8888bbbb9999cccc0000dddd1111eeee2222ffff', power: 600000, delegated: true },
  ];

  const totalPower = holders.reduce((sum, h) => sum + h.power, 0);

  return holders.map((holder) => ({
    holder: holder.address,
    votingPower: holder.power,
    percentage: (holder.power / totalPower) * 100,
    isDelegated: holder.delegated,
  }));
}

function generateMockStats(): GovernanceStats {
  return {
    totalProposals: 45,
    activeProposals: 2,
    passedProposals: 32,
    rejectedProposals: 11,
    totalVotingPower: 20000000,
    avgParticipation: 68.5,
    quorumThreshold: 4000000,
  };
}

export function GovernanceView({
  proposals: externalProposals,
  votingWeights: externalWeights,
  stats: externalStats,
  isLoading = false,
}: GovernanceViewProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [selectedProposal, setSelectedProposal] = useState<GovernanceProposal | null>(null);

  const proposals = useMemo(() => {
    return externalProposals || generateMockProposals();
  }, [externalProposals]);

  const votingWeights = useMemo(() => {
    return externalWeights || generateMockVotingWeights();
  }, [externalWeights]);

  const stats = useMemo(() => {
    return externalStats || generateMockStats();
  }, [externalStats]);

  const activeProposals = useMemo(() => {
    return proposals.filter((p) => p.status === 'active');
  }, [proposals]);

  const historicalProposals = useMemo(() => {
    return proposals.filter((p) => p.status === 'passed' || p.status === 'rejected');
  }, [proposals]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'active' as TabId,
      label: t('uma.governance.activeTab'),
      icon: <Vote className="w-4 h-4" />,
      count: activeProposals.length,
    },
    {
      id: 'history' as TabId,
      label: t('uma.governance.historyTab'),
      icon: <Clock className="w-4 h-4" />,
      count: historicalProposals.length,
    },
    { id: 'guide' as TabId, label: t('uma.governance.guideTab'), icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('uma.governance.title')}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span>{stats.activeProposals} {t('uma.governance.activeProposals')}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">{t('uma.governance.totalProposals')}</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">{stats.totalProposals}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-gray-500">{t('uma.governance.passed')}</span>
          </div>
          <p className="text-xl font-semibold text-emerald-600">{stats.passedProposals}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500">{t('uma.governance.rejected')}</span>
          </div>
          <p className="text-xl font-semibold text-red-600">{stats.rejectedProposals}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">{t('uma.governance.avgParticipation')}</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {stats.avgParticipation.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'active' && (
        <div className="space-y-6">
          {activeProposals.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeProposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onViewDetails={setSelectedProposal}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('uma.governance.noActiveProposals')}</p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <VotingWeightChart weights={votingWeights} t={t} />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {historicalProposals.length > 0 ? (
            historicalProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onViewDetails={setSelectedProposal}
                t={t}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t('uma.governance.noHistoricalProposals')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'guide' && <GovernanceGuide t={t} />}

      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('uma.governance.proposalDetails')}</h3>
              <button
                onClick={() => setSelectedProposal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded border ${
                      PROPOSAL_CATEGORY_CONFIG[selectedProposal.category].bgColor
                    } ${PROPOSAL_CATEGORY_CONFIG[selectedProposal.category].borderColor} ${
                      PROPOSAL_CATEGORY_CONFIG[selectedProposal.category].color
                    }`}
                  >
                    {t(PROPOSAL_CATEGORY_CONFIG[selectedProposal.category].label)}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded ${
                      PROPOSAL_STATUS_CONFIG[selectedProposal.status].bgColor
                    } ${PROPOSAL_STATUS_CONFIG[selectedProposal.status].color}`}
                  >
                    {t(PROPOSAL_STATUS_CONFIG[selectedProposal.status].label)}
                  </span>
                </div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">
                  {selectedProposal.title}
                </h4>
                <p className="text-sm text-gray-600">{selectedProposal.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.proposer')}</p>
                  <p className="text-sm font-mono text-gray-900">
                    {selectedProposal.proposer.slice(0, 10)}...{selectedProposal.proposer.slice(-8)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.proposalId')}</p>
                  <p className="text-sm font-mono text-gray-900">{selectedProposal.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.startBlock')}</p>
                  <p className="text-sm text-gray-900">
                    {selectedProposal.startBlock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.endBlock')}</p>
                  <p className="text-sm text-gray-900">
                    {selectedProposal.endBlock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.supportVotes')}</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatNumber(selectedProposal.forVotes, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.againstVotes')}</p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatNumber(selectedProposal.againstVotes, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.quorumRequired')}</p>
                  <p className="text-sm text-gray-900">
                    {formatNumber(selectedProposal.quorum, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">{t('uma.governance.totalVotingWeight')}</p>
                  <p className="text-sm text-gray-900">
                    {formatNumber(selectedProposal.votingPower, true)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {t('uma.governance.close')}
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
                  {t('uma.governance.viewOnGovernancePortal')}
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GovernanceView;
