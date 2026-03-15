'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { chartColors, semanticColors, baseColors, animationColors } from '@/lib/config/colors';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { formatNumber } from '@/lib/utils/format';

export type VotePosition = 'for' | 'against' | 'abstain';

export interface ValidatorVote {
  validatorId: string;
  validatorName: string;
  validatorAddress: string;
  position: VotePosition;
  votingPower: number;
  timestamp: number;
  reputation: number;
}

export interface DisputeVotingData {
  disputeId: string;
  totalVotingPower: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  validatorVotes: ValidatorVote[];
  quorum: number;
  threshold: number;
  endTime: number;
}

export interface DisputeVotingPanelProps {
  votingData: DisputeVotingData;
  loading?: boolean;
}

interface DonutSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
  lightColor: string;
}

function DonutChart({
  segments,
  size = 200,
  strokeWidth = 30,
}: {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
}) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercentage = 0;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={chartColors.recharts.grid}
          strokeWidth={strokeWidth}
        />

        {/* Segments */}
        {segments.map((segment, index) => {
          const segmentLength = (segment.percentage / 100) * circumference;
          const gap = 2;
          const drawLength = Math.max(0, segmentLength - gap);
          const offset = (accumulatedPercentage / 100) * circumference;
          accumulatedPercentage += segment.percentage;

          return (
            <circle
              key={index}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${drawLength} ${circumference - drawLength}`}
              strokeDashoffset={-offset}
              className="transition-all duration-500 ease-out"
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">
          {Math.round(segments.find((s) => s.label === '支持')?.percentage || 0)}%
        </span>
        <span className="text-xs text-gray-500">支持率</span>
      </div>
    </div>
  );
}

function VoteDistributionCard({ votingData }: { votingData: DisputeVotingData }) {
  const { t } = useI18n();
  const totalVotes = votingData.votesFor + votingData.votesAgainst + votingData.votesAbstain;

  const segments: DonutSegment[] = useMemo(() => {
    if (totalVotes === 0) return [];

    return [
      {
        label: '支持',
        value: votingData.votesFor,
        percentage: (votingData.votesFor / totalVotes) * 100,
        color: chartColors.semantic.success,
        lightColor: semanticColors.success.light,
      },
      {
        label: '反对',
        value: votingData.votesAgainst,
        percentage: (votingData.votesAgainst / totalVotes) * 100,
        color: chartColors.semantic.danger,
        lightColor: semanticColors.danger.light,
      },
      {
        label: '弃权',
        value: votingData.votesAbstain,
        percentage: (votingData.votesAbstain / totalVotes) * 100,
        color: chartColors.recharts.tick,
        lightColor: baseColors.gray[100],
      },
    ];
  }, [votingData, totalVotes]);

  const supportRate = totalVotes > 0 ? (votingData.votesFor / totalVotes) * 100 : 0;
  const quorumProgress = (totalVotes / votingData.quorum) * 100;
  const isQuorumReached = totalVotes >= votingData.quorum;
  const isThresholdReached = supportRate >= votingData.threshold;

  return (
    <DashboardCard title={t('uma.disputeVoting.voteDistribution') || '投票分布'}>
      <div className="space-y-6">
        {/* Donut Chart */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0">
            <DonutChart segments={segments} size={180} strokeWidth={24} />
          </div>

          {/* Legend and Stats */}
          <div className="flex-1 space-y-3 w-full">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }} />
                  <span className="text-sm text-gray-600">{segment.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(segment.value, true)}
                  </span>
                  <span className="text-xs text-gray-500 w-12 text-right">
                    {segment.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">总投票权</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatNumber(totalVotes, true)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quorum and Threshold Progress */}
        <div className="space-y-4">
          {/* Quorum Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">法定人数 (Quorum)</span>
              <span
                className={`text-sm font-medium ${
                  isQuorumReached ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {formatNumber(totalVotes, true)} / {formatNumber(votingData.quorum, true)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isQuorumReached ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(quorumProgress, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {isQuorumReached
                ? '已达到法定投票人数'
                : `还需 ${formatNumber(votingData.quorum - totalVotes, true)} 投票权达到法定人数`}
            </p>
          </div>

          {/* Threshold Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">通过阈值</span>
              <span
                className={`text-sm font-medium ${
                  isThresholdReached ? 'text-green-600' : 'text-gray-600'
                }`}
              >
                {supportRate.toFixed(1)}% / {votingData.threshold}%
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isThresholdReached ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min((supportRate / votingData.threshold) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`p-3 rounded-lg ${
            isQuorumReached && isThresholdReached
              ? 'bg-green-50 border border-green-200'
              : isQuorumReached
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-5 h-5 ${
                isQuorumReached && isThresholdReached
                  ? 'text-green-600'
                  : isQuorumReached
                    ? 'text-yellow-600'
                    : 'text-blue-600'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isQuorumReached && isThresholdReached ? (
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              ) : (
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              )}
            </svg>
            <span
              className={`text-sm font-medium ${
                isQuorumReached && isThresholdReached
                  ? 'text-green-800'
                  : isQuorumReached
                    ? 'text-yellow-800'
                    : 'text-blue-800'
              }`}
            >
              {isQuorumReached && isThresholdReached
                ? '投票通过 - 已达到通过条件'
                : isQuorumReached
                  ? '投票进行中 - 已达到法定人数但未达支持阈值'
                  : '投票进行中 - 等待更多验证者参与'}
            </span>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function ValidatorVoteList({
  validatorVotes,
  totalVotingPower,
}: {
  validatorVotes: ValidatorVote[];
  totalVotingPower: number;
}) {
  const { t } = useI18n();
  const [sortBy, setSortBy] = useState<'power' | 'time' | 'reputation'>('power');
  const [filterPosition, setFilterPosition] = useState<VotePosition | 'all'>('all');

  const positionConfig = {
    for: {
      label: '支持',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      borderColor: 'border-green-200',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    against: {
      label: '反对',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      borderColor: 'border-red-200',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    abstain: {
      label: '弃权',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
    },
  };

  const filteredAndSortedVotes = useMemo(() => {
    let result = [...validatorVotes];

    if (filterPosition !== 'all') {
      result = result.filter((v) => v.position === filterPosition);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'power':
          return b.votingPower - a.votingPower;
        case 'time':
          return b.timestamp - a.timestamp;
        case 'reputation':
          return b.reputation - a.reputation;
        default:
          return 0;
      }
    });

    return result;
  }, [validatorVotes, filterPosition, sortBy]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <DashboardCard title={t('uma.disputeVoting.validatorVotes') || '验证者投票'}>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">立场:</span>
            <div className="flex items-center gap-1">
              {(['all', 'for', 'against', 'abstain'] as const).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setFilterPosition(pos)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    filterPosition === pos
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {pos === 'all' ? '全部' : positionConfig[pos as VotePosition].label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">排序:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="power">投票权</option>
              <option value="time">时间</option>
              <option value="reputation">声誉</option>
            </select>
          </div>
        </div>

        {/* Vote Count Summary */}
        <div className="grid grid-cols-3 gap-3">
          {(['for', 'against', 'abstain'] as const).map((pos) => {
            const count = validatorVotes.filter((v) => v.position === pos).length;
            const config = positionConfig[pos];
            return (
              <div key={pos} className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
                <div className="flex items-center gap-2">
                  <span className={config.color}>{config.icon}</span>
                  <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                <p className="text-xs text-gray-500">验证者</p>
              </div>
            );
          })}
        </div>

        {/* Validator List */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  验证者
                </th>
                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  立场
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  投票权
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  占比
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  声誉
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">
                  时间
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedVotes.map((vote) => {
                const config = positionConfig[vote.position];
                const percentage =
                  totalVotingPower > 0 ? (vote.votingPower / totalVotingPower) * 100 : 0;

                return (
                  <tr
                    key={vote.validatorId}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{vote.validatorName}</p>
                        <p className="text-xs text-gray-400 font-mono">
                          {truncateAddress(vote.validatorAddress)}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded ${config.bgColor} ${config.color}`}
                      >
                        {config.icon}
                        {config.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatNumber(vote.votingPower, true)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-sm text-gray-600">{percentage.toFixed(2)}%</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              vote.reputation >= 90
                                ? 'bg-green-500'
                                : vote.reputation >= 80
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${vote.reputation}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8">{vote.reputation}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-xs text-gray-500">{formatTime(vote.timestamp)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAndSortedVotes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p>没有找到匹配的投票记录</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

export function DisputeVotingPanel({ votingData, loading = false }: DisputeVotingPanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded-full mx-auto w-40"></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <VoteDistributionCard votingData={votingData} />
      <ValidatorVoteList
        validatorVotes={votingData.validatorVotes}
        totalVotingPower={votingData.totalVotingPower}
      />
    </div>
  );
}

// Generate mock voting data for demonstration
export function generateMockVotingData(disputeId: string = 'dispute-1'): DisputeVotingData {
  const validators = [
    { name: 'UMA Foundation', reputation: 98 },
    { name: 'Risk Labs', reputation: 95 },
    { name: 'SuperUMAn', reputation: 92 },
    { name: 'Across Validator', reputation: 94 },
    { name: 'Polymarket Node', reputation: 90 },
    { name: 'Independent Validator A', reputation: 88 },
    { name: 'Independent Validator B', reputation: 89 },
    { name: 'Community Node 1', reputation: 85 },
    { name: 'Community Node 2', reputation: 86 },
    { name: 'Independent Validator C', reputation: 84 },
    { name: 'DeFi Guardian', reputation: 91 },
    { name: 'Oracle Keeper', reputation: 87 },
  ];

  const now = Date.now();
  const validatorVotes: ValidatorVote[] = validators.map((validator, index) => {
    const random = Math.random();
    let position: VotePosition;
    if (random > 0.6) {
      position = 'for';
    } else if (random > 0.3) {
      position = 'against';
    } else {
      position = 'abstain';
    }

    return {
      validatorId: `validator-${index + 1}`,
      validatorName: validator.name,
      validatorAddress: `0x${Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`,
      position,
      votingPower: Math.floor(Math.random() * 50000) + 10000,
      timestamp: now - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
      reputation: validator.reputation,
    };
  });

  const votesFor = validatorVotes
    .filter((v) => v.position === 'for')
    .reduce((sum, v) => sum + v.votingPower, 0);
  const votesAgainst = validatorVotes
    .filter((v) => v.position === 'against')
    .reduce((sum, v) => sum + v.votingPower, 0);
  const votesAbstain = validatorVotes
    .filter((v) => v.position === 'abstain')
    .reduce((sum, v) => sum + v.votingPower, 0);

  const totalVotingPower = votesFor + votesAgainst + votesAbstain;

  return {
    disputeId,
    totalVotingPower,
    votesFor,
    votesAgainst,
    votesAbstain,
    validatorVotes,
    quorum: totalVotingPower * 0.6,
    threshold: 50,
    endTime: now + 48 * 60 * 60 * 1000,
  };
}

export default DisputeVotingPanel;
