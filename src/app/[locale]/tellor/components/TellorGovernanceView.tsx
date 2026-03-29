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
import { formatNumber } from '@/lib/utils/format';

interface TellorGovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending' | 'executed';
  proposer: string;
  startBlock: number;
  endBlock: number;
  forVotes: number;
  againstVotes: number;
  abstainVotes: number;
  quorum: number;
  votingPower: number;
  category: 'parameter' | 'treasury' | 'other';
}

interface TellorVotingWeightDistribution {
  holder: string;
  votingPower: number;
  percentage: number;
  isDelegated: boolean;
}

interface TellorGovernanceStats {
  totalVotingPower: number;
  activeProposals: number;
  participationRate: number;
  nextVotingDeadline: number;
  totalProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  quorumThreshold: number;
}

interface TellorGovernanceViewProps {
  proposals?: TellorGovernanceProposal[];
  votingWeights?: TellorVotingWeightDistribution[];
  stats?: TellorGovernanceStats;
  isLoading?: boolean;
}

type TabId = 'active' | 'history' | 'guide';

const PROPOSAL_CATEGORY_CONFIG: Record<
  TellorGovernanceProposal['category'],
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  parameter: {
    label: 'tellor.governance.category.parameter',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  treasury: {
    label: 'tellor.governance.category.treasury',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  other: {
    label: 'tellor.governance.category.other',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

const PROPOSAL_STATUS_CONFIG: Record<
  TellorGovernanceProposal['status'],
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: 'tellor.governance.status.active',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  passed: {
    label: 'tellor.governance.status.passed',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  rejected: {
    label: 'tellor.governance.status.rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  pending: {
    label: 'tellor.governance.status.pending',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
  },
  executed: {
    label: 'tellor.governance.status.executed',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
  },
};

function CountdownTimer({ endBlock, currentBlock }: { endBlock: number; currentBlock: number }) {
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
      <span className="text-xs">剩余</span>
    </div>
  );
}

function ProposalCard({
  proposal,
  onViewDetails,
}: {
  proposal: TellorGovernanceProposal;
  onViewDetails?: (proposal: TellorGovernanceProposal) => void;
}) {
  const t = useTranslations();
  const categoryConfig = PROPOSAL_CATEGORY_CONFIG[proposal.category];
  const statusConfig = PROPOSAL_STATUS_CONFIG[proposal.status];

  const totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
  const forPercentage = totalVotes > 0 ? (proposal.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (proposal.againstVotes / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (proposal.abstainVotes / totalVotes) * 100 : 0;
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
          <CountdownTimer endBlock={proposal.endBlock} currentBlock={proposal.startBlock + 1000} />
        </div>
      )}

      <div className="space-y-3 mb-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-gray-600">支持</span>
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
              <span className="text-gray-600">反对</span>
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5">
              <Vote className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">弃权</span>
            </span>
            <span className="font-semibold text-gray-900">
              {formatNumber(proposal.abstainVotes, true)} ({abstainPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gray-400 transition-all duration-500"
              style={{ width: `${abstainPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            <span>法定人数: {quorumPercentage.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                quorumPercentage >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span>{quorumPercentage >= 100 ? '已达到' : '未达到'}</span>
          </div>
        </div>
        <button
          onClick={() => onViewDetails?.(proposal)}
          className="flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
        >
          查看详情
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function VotingWeightChart({ weights }: { weights: TellorVotingWeightDistribution[] }) {
  const [viewMode, setViewMode] = useState<'bar' | 'pie'>('bar');
  const totalPower = weights.reduce((sum, w) => sum + w.votingPower, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">投票权重分布</h4>
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
                    <span className="px-1.5 py-0.5 text-xs bg-cyan-50 text-cyan-600 rounded">
                      委托
                    </span>
                  )}
                </div>
                <span className="font-semibold text-gray-900">
                  {formatNumber(weight.votingPower, true)} ({weight.percentage.toFixed(2)}%)
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-500 transition-all duration-500"
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
                    '#06b6d4',
                    '#0891b2',
                    '#0e7490',
                    '#155e75',
                    '#164e63',
                    '#083344',
                    '#22d3ee',
                    '#67e8f9',
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
              <span className="text-xs text-gray-500">总权重</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 border-t border-gray-100">
        <div className="p-2 rounded-lg bg-cyan-50 text-center">
          <p className="text-xs text-gray-600 mb-0.5">总持有者</p>
          <p className="text-base font-semibold text-gray-900">{weights.length}</p>
        </div>
        <div className="p-2 rounded-lg bg-purple-50 text-center">
          <p className="text-xs text-gray-600 mb-0.5">委托比例</p>
          <p className="text-base font-semibold text-gray-900">
            {((weights.filter((w) => w.isDelegated).length / weights.length) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-50 text-center">
          <p className="text-xs text-gray-600 mb-0.5">平均权重</p>
          <p className="text-base font-semibold text-gray-900">
            {formatNumber(totalPower / weights.length, true)}
          </p>
        </div>
      </div>
    </div>
  );
}

function GovernanceGuide() {
  const sections = [
    {
      icon: <Vote className="w-5 h-5" />,
      title: '如何参与治理',
      content: [
        '持有TRB代币即可参与治理投票',
        '通过Tellor治理门户查看活跃提案',
        '在投票期内对提案进行投票',
        '可以委托他人代为投票',
      ],
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      title: '投票权重计算',
      content: [
        '投票权重 = 持有的TRB代币数量',
        '委托的代币权重归受托人所有',
        '快照时点决定投票权重',
        '投票后权重不会立即释放',
      ],
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: '提案流程',
      content: [
        '第一阶段：社区讨论（论坛/Discord）',
        '第二阶段：温度检查（投票）',
        '第三阶段：链上提案',
        '第四阶段：执行实施',
      ],
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: '提案类型',
      content: ['参数调整：修改协议参数', '资金分配：国库资金使用', '其他：社区提案等'],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-gray-400" />
        <h3 className="text-base font-semibold text-gray-900">治理参与指南</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyan-600">{section.icon}</span>
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

      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-cyan-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">常见问题</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-700">Q: 投票后可以修改吗？</p>
                <p>A: 投票提交后无法修改，请谨慎投票。</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Q: 需要多少代币才能提案？</p>
                <p>A: 需要持有至少 100 TRB 代币才能创建提案。</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Q: 投票奖励如何分配？</p>
                <p>A: 参与投票可获得治理奖励，按投票权重比例分配。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateMockProposals(): TellorGovernanceProposal[] {
  const proposals: TellorGovernanceProposal[] = [
    {
      id: 'TGP-001',
      title: '提高报告者最低质押要求',
      description:
        '建议将报告者的最低质押要求从 100 TRB 提高到 150 TRB，以增强网络安全性和报告者承诺。',
      status: 'active',
      proposer: '0x1234567890abcdef1234567890abcdef12345678',
      startBlock: 18000000,
      endBlock: 18010000,
      forVotes: 250000,
      againstVotes: 120000,
      abstainVotes: 30000,
      quorum: 400000,
      votingPower: 400000,
      category: 'parameter',
    },
    {
      id: 'TGP-002',
      title: '调整争议费用结构',
      description: '修改争议费用结构，降低小额争议的参与门槛，同时保持对恶意争议的威慑力。',
      status: 'active',
      proposer: '0xabcdef1234567890abcdef1234567890abcdef12',
      startBlock: 18001000,
      endBlock: 18011000,
      forVotes: 310000,
      againstVotes: 80000,
      abstainVotes: 10000,
      quorum: 400000,
      votingPower: 400000,
      category: 'parameter',
    },
    {
      id: 'TGP-003',
      title: '国库资金分配提案',
      description: '建议从国库中分配 50,000 TRB 用于生态系统发展基金，支持基于Tellor的项目构建。',
      status: 'passed',
      proposer: '0x9876543210fedcba9876543210fedcba98765432',
      startBlock: 17950000,
      endBlock: 17960000,
      forVotes: 420000,
      againstVotes: 150000,
      abstainVotes: 30000,
      quorum: 400000,
      votingPower: 600000,
      category: 'treasury',
    },
    {
      id: 'TGP-004',
      title: '优化奖励分配机制',
      description: '修改奖励分配算法，提高活跃报告者的激励比例，鼓励更多数据提交。',
      status: 'rejected',
      proposer: '0xfedcba9876543210fedcba9876543210fedcba98',
      startBlock: 17900000,
      endBlock: 17910000,
      forVotes: 180000,
      againstVotes: 320000,
      abstainVotes: 50000,
      quorum: 400000,
      votingPower: 550000,
      category: 'parameter',
    },
    {
      id: 'TGP-005',
      title: '社区治理工具开发资助',
      description: '资助开发社区治理仪表板，提供更好的提案追踪和投票分析工具。',
      status: 'pending',
      proposer: '0x1111222233334444555566667777888899990000',
      startBlock: 18020000,
      endBlock: 18030000,
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      quorum: 400000,
      votingPower: 0,
      category: 'other',
    },
    {
      id: 'TGP-006',
      title: '多链扩展资金申请',
      description: '申请 80,000 TRB 用于支持更多区块链网络的集成开发。',
      status: 'executed',
      proposer: '0xaaaa1111bbbb2222cccc3333dddd4444eeee5555',
      startBlock: 17850000,
      endBlock: 17860000,
      forVotes: 500000,
      againstVotes: 100000,
      abstainVotes: 20000,
      quorum: 400000,
      votingPower: 620000,
      category: 'treasury',
    },
  ];

  return proposals;
}

function generateMockVotingWeights(): TellorVotingWeightDistribution[] {
  const holders = [
    { address: '0x1234567890abcdef1234567890abcdef12345678', power: 500000, delegated: false },
    { address: '0xabcdef1234567890abcdef1234567890abcdef12', power: 320000, delegated: true },
    { address: '0x9876543210fedcba9876543210fedcba98765432', power: 280000, delegated: false },
    { address: '0xfedcba9876543210fedcba9876543210fedcba98', power: 210000, delegated: true },
    { address: '0x1111222233334444555566667777888899990000', power: 180000, delegated: false },
    { address: '0xaaaa1111bbbb2222cccc3333dddd4444eeee5555', power: 150000, delegated: true },
    { address: '0x5555eeee4444dddd3333cccc2222bbbb1111aaaa', power: 120000, delegated: false },
    { address: '0x6666ffff00001111222233334444555566667777', power: 100000, delegated: true },
    { address: '0x7777aaaa8888bbbb9999cccc0000dddd1111eeee', power: 80000, delegated: false },
    { address: '0x8888bbbb9999cccc0000dddd1111eeee2222ffff', power: 60000, delegated: true },
  ];

  const totalPower = holders.reduce((sum, h) => sum + h.power, 0);

  return holders.map((holder) => ({
    holder: holder.address,
    votingPower: holder.power,
    percentage: (holder.power / totalPower) * 100,
    isDelegated: holder.delegated,
  }));
}

function generateMockStats(): TellorGovernanceStats {
  return {
    totalVotingPower: 2000000,
    activeProposals: 2,
    participationRate: 68.5,
    nextVotingDeadline: Date.now() + 3 * 24 * 60 * 60 * 1000,
    totalProposals: 28,
    passedProposals: 18,
    rejectedProposals: 6,
    quorumThreshold: 400000,
  };
}

export function TellorGovernanceView({
  proposals: externalProposals,
  votingWeights: externalWeights,
  stats: externalStats,
  isLoading = false,
}: TellorGovernanceViewProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [selectedProposal, setSelectedProposal] = useState<TellorGovernanceProposal | null>(null);

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
    return proposals.filter(
      (p) => p.status === 'passed' || p.status === 'rejected' || p.status === 'executed'
    );
  }, [proposals]);

  const formatDeadline = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

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
      label: '活跃提案',
      icon: <Vote className="w-4 h-4" />,
      count: activeProposals.length,
    },
    {
      id: 'history' as TabId,
      label: '历史提案',
      icon: <Clock className="w-4 h-4" />,
      count: historicalProposals.length,
    },
    { id: 'guide' as TabId, label: '参与指南', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('tellor.governance.title')}</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span>{stats.activeProposals} 个活跃提案</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Vote className="w-4 h-4 text-cyan-500" />
            <span className="text-xs text-gray-500">{t('tellor.governance.totalVotingPower')}</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {formatNumber(stats.totalVotingPower, true)}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-gray-500">{t('tellor.governance.activeProposals')}</span>
          </div>
          <p className="text-xl font-semibold text-amber-600">{stats.activeProposals}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500">
              {t('tellor.governance.participationRate')}
            </span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {stats.participationRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500">{t('tellor.governance.nextDeadline')}</span>
          </div>
          <p className="text-xl font-semibold text-gray-900">
            {formatDeadline(stats.nextVotingDeadline)}
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
                ? 'border-cyan-500 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  activeTab === tab.id ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600'
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
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Vote className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无活跃提案</p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <VotingWeightChart weights={votingWeights} />
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">已通过</p>
              <p className="text-lg font-semibold text-emerald-600">{stats.passedProposals}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">已拒绝</p>
              <p className="text-lg font-semibold text-red-600">{stats.rejectedProposals}</p>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 mb-1">已执行</p>
              <p className="text-lg font-semibold text-cyan-600">
                {historicalProposals.filter((p) => p.status === 'executed').length}
              </p>
            </div>
          </div>

          {historicalProposals.length > 0 ? (
            historicalProposals.map((proposal) => (
              <ProposalCard
                key={proposal.id}
                proposal={proposal}
                onViewDetails={setSelectedProposal}
              />
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">暂无历史提案</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'guide' && <GovernanceGuide />}

      {selectedProposal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">提案详情</h3>
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
                  <p className="text-xs text-gray-500 mb-1">提案ID</p>
                  <p className="text-sm font-mono text-gray-900">{selectedProposal.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">提案人</p>
                  <p className="text-sm font-mono text-gray-900">
                    {selectedProposal.proposer.slice(0, 10)}...{selectedProposal.proposer.slice(-8)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">起始区块</p>
                  <p className="text-sm text-gray-900">
                    {selectedProposal.startBlock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">结束区块</p>
                  <p className="text-sm text-gray-900">
                    {selectedProposal.endBlock.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">支持票数</p>
                  <p className="text-sm font-semibold text-emerald-600">
                    {formatNumber(selectedProposal.forVotes, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">反对票数</p>
                  <p className="text-sm font-semibold text-red-600">
                    {formatNumber(selectedProposal.againstVotes, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">弃权票数</p>
                  <p className="text-sm font-semibold text-gray-600">
                    {formatNumber(selectedProposal.abstainVotes, true)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">法定人数要求</p>
                  <p className="text-sm text-gray-900">
                    {formatNumber(selectedProposal.quorum, true)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setSelectedProposal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  关闭
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors">
                  在治理门户查看
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

export default TellorGovernanceView;
