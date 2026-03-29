'use client';

import { useMemo } from 'react';

import {
  X,
  Shield,
  User,
  MapPin,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Coins,
  Unlock,
  Users,
  Vote,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Zap,
  Globe,
  Server,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

export interface ValidatorDetail {
  id: string;
  name: string;
  address: string;
  operator: string;
  operatorContact: string;
  joinedAt: number;
  region: string;
  location: string;
  responseTime: number;
  responseTimeHistory: number[];
  successRate: number;
  successRateHistory: number[];
  reputation: number;
  reputationHistory: number[];
  stakedAmount: number;
  earnings: number;
  earningsHistory: { date: string; amount: number }[];
  unlockSchedule: { date: string; amount: number; status: 'pending' | 'completed' }[];
  delegators: number;
  delegatedAmount: number;
  votingParticipation: number;
  recentVotes: {
    id: string;
    proposal: string;
    vote: 'approve' | 'reject' | 'abstain';
    timestamp: number;
    weight: number;
  }[];
  consensusContribution: number;
  status: 'active' | 'inactive' | 'jailed';
}

interface ChronicleValidatorDetailProps {
  validator: ValidatorDetail | null;
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
}

function MiniChart({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * (height - 10) - 5;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width="100%" height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points.join(' ')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProgressBar({ value, max, color, showLabel = true }: { value: number; max: number; color: string; showLabel?: boolean }) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="w-full">
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{value.toLocaleString()}</span>
          <span>{max.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

function formatTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function ChronicleValidatorDetail({ validator, isOpen, onClose, themeColor }: ChronicleValidatorDetailProps) {
  const t = useTranslations();

  const stats = useMemo(() => {
    if (!validator) return null;
    return {
      avgResponseTime: Math.round(
        validator.responseTimeHistory.reduce((a, b) => a + b, 0) / validator.responseTimeHistory.length
      ),
      avgSuccessRate: (
        validator.successRateHistory.reduce((a, b) => a + b, 0) / validator.successRateHistory.length
      ).toFixed(1),
      totalEarnings: validator.earningsHistory.reduce((a, b) => a + b.amount, 0),
      pendingUnlocks: validator.unlockSchedule
        .filter((u) => u.status === 'pending')
        .reduce((a, b) => a + b.amount, 0),
      approveVotes: validator.recentVotes.filter((v) => v.vote === 'approve').length,
      rejectVotes: validator.recentVotes.filter((v) => v.vote === 'reject').length,
    };
  }, [validator]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: t('chronicle.validators.statusActive'),
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'inactive':
        return {
          label: t('chronicle.validators.statusInactive'),
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: <AlertCircle className="w-4 h-4" />,
        };
      case 'jailed':
        return {
          label: t('chronicle.validators.statusJailed'),
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          icon: <XCircle className="w-4 h-4" />,
        };
      default:
        return {
          label: status,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: <Activity className="w-4 h-4" />,
        };
    }
  };

  const getVoteDisplay = (vote: string) => {
    switch (vote) {
      case 'approve':
        return {
          label: t('chronicle.validators.voteApprove'),
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          icon: <CheckCircle className="w-3 h-3" />,
        };
      case 'reject':
        return {
          label: t('chronicle.validators.voteReject'),
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: <XCircle className="w-3 h-3" />,
        };
      case 'abstain':
        return {
          label: t('chronicle.validators.voteAbstain'),
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: <AlertCircle className="w-3 h-3" />,
        };
      default:
        return {
          label: vote,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: null,
        };
    }
  };

  if (!isOpen || !validator) return null;

  const statusDisplay = getStatusDisplay(validator.status);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{validator.name}</h2>
                <p className="text-sm text-gray-500">
                  {t('chronicle.validators.validatorId')}: {validator.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border',
                  statusDisplay.color,
                  statusDisplay.bgColor,
                  statusDisplay.borderColor
                )}
              >
                {statusDisplay.icon}
                {statusDisplay.label}
              </span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              {t('chronicle.validators.basicInfo')}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {t('chronicle.validators.address')}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 font-mono">{validator.address}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {t('chronicle.validators.operator')}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">{validator.operator}</p>
                <p className="text-xs text-gray-400 mt-1">{validator.operatorContact}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {t('chronicle.validators.joinedAt')}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">{formatDate(validator.joinedAt)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {t('chronicle.validators.location')}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900">{validator.location}</p>
                <p className="text-xs text-gray-400 mt-1">{validator.region}</p>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-500" />
              {t('chronicle.validators.performanceAnalysis')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-500">
                      {t('chronicle.validators.responseTimeTrend')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{validator.responseTime}ms</span>
                </div>
                <MiniChart data={validator.responseTimeHistory} color="#3b82f6" height={50} />
                <p className="text-xs text-gray-400 mt-2">
                  {t('chronicle.validators.avgResponse')}: {stats?.avgResponseTime}ms
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-gray-500">
                      {t('chronicle.validators.successRateTrend')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-600">{validator.successRate}%</span>
                </div>
                <MiniChart data={validator.successRateHistory} color="#10b981" height={50} />
                <p className="text-xs text-gray-400 mt-2">
                  {t('chronicle.validators.avgSuccess')}: {stats?.avgSuccessRate}%
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-500">
                      {t('chronicle.validators.reputationTrend')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-amber-600">{validator.reputation}</span>
                </div>
                <MiniChart data={validator.reputationHistory} color={themeColor} height={50} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {t('chronicle.validators.last30Days')}
                  </span>
                  <span
                    className={cn(
                      'text-xs font-medium flex items-center gap-0.5',
                      validator.reputation >= 95 ? 'text-emerald-600' : validator.reputation >= 90 ? 'text-amber-600' : 'text-gray-600'
                    )}
                  >
                    {validator.reputation >= 95 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {validator.reputation >= 95 ? '优秀' : validator.reputation >= 90 ? '良好' : '一般'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-gray-500" />
              {t('chronicle.validators.stakingDetails')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-200 rounded-full">
                      <Coins className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-700">
                        {t('chronicle.validators.currentStake')}
                      </p>
                      <p className="text-2xl font-bold text-amber-900">
                        {(validator.stakedAmount / 1e6).toFixed(2)}M
                      </p>
                    </div>
                  </div>
                  <ProgressBar
                    value={validator.stakedAmount}
                    max={10000000}
                    color="bg-amber-500"
                    showLabel={false}
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm text-gray-500">
                        {t('chronicle.validators.totalEarnings')}
                      </span>
                    </div>
                    <span className="text-lg font-semibold text-emerald-600">
                      +{(stats?.totalEarnings ?? 0).toLocaleString()} MKR
                    </span>
                  </div>
                  <div className="space-y-2">
                    {validator.earningsHistory.slice(-5).map((earning, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">{earning.date}</span>
                        <span className="font-medium text-emerald-600">+{earning.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Unlock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {t('chronicle.validators.unlockSchedule')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {validator.unlockSchedule.map((unlock, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-2 rounded',
                          unlock.status === 'completed' ? 'bg-gray-100 opacity-60' : 'bg-blue-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {unlock.status === 'completed' ? (
                            <CheckCircle className="w-4 h-4 text-gray-400" />
                          ) : (
                            <Clock className="w-4 h-4 text-blue-500" />
                          )}
                          <span className="text-sm text-gray-600">{unlock.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {(unlock.amount / 1000).toFixed(0)}K
                          </span>
                          <span
                            className={cn(
                              'text-xs px-2 py-0.5 rounded',
                              unlock.status === 'completed' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'
                            )}
                          >
                            {unlock.status === 'completed' ? '已完成' : '待解锁'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    {t('chronicle.validators.pendingUnlocks')}: {(stats?.pendingUnlocks ?? 0).toLocaleString()} MKR
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-900">
                      {t('chronicle.validators.delegationInfo')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('chronicle.validators.delegators')}
                      </p>
                      <p className="text-xl font-semibold text-gray-900">{validator.delegators}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        {t('chronicle.validators.delegatedAmount')}
                      </p>
                      <p className="text-xl font-semibold text-gray-900">
                        {(validator.delegatedAmount / 1e6).toFixed(2)}M
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-200" />

          <section>
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5 text-gray-500" />
              {t('chronicle.validators.votingRecords')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-500">
                    {t('chronicle.validators.participationRate')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{validator.votingParticipation}%</span>
                </div>
                <ProgressBar
                  value={validator.votingParticipation}
                  max={100}
                  color="bg-blue-500"
                  showLabel={false}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-gray-500">
                    {t('chronicle.validators.consensusContribution')}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-purple-600">{validator.consensusContribution}%</span>
                </div>
                <ProgressBar
                  value={validator.consensusContribution}
                  max={100}
                  color="bg-purple-500"
                  showLabel={false}
                />
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Vote className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-gray-500">
                    {t('chronicle.validators.voteStats')}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-900">{stats?.approveVotes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-gray-900">{stats?.rejectVotes}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chronicle.validators.proposal')}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chronicle.validators.vote')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chronicle.validators.weight')}
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('chronicle.validators.time')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validator.recentVotes.map((vote) => {
                    const voteDisplay = getVoteDisplay(vote.vote);
                    return (
                      <tr key={vote.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">{vote.proposal}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                              voteDisplay.color,
                              voteDisplay.bgColor
                            )}
                          >
                            {voteDisplay.icon}
                            {voteDisplay.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-sm text-gray-600">{vote.weight}%</td>
                        <td className="py-3 px-4 text-right text-sm text-gray-500">{formatTime(vote.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-amber-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">
                    {t('chronicle.validators.validatorInfo')}
                  </h4>
                  <p className="text-sm text-amber-700 mt-1">
                    {t('chronicle.validators.validatorInfoDesc') ||
                      '该验证者是 Chronicle 预言机网络的重要组成部分，负责提供准确、及时的价格数据。验证者通过质押代币来保证其行为的诚实性，并因其服务获得奖励。'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded-md"
            >
              {t('chronicle.validators.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
