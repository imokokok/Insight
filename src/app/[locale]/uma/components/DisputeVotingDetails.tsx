'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  UserCircle,
  ChevronRight,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { type DisputeData, type DisputeType } from '@/lib/oracles/uma/types';
import { formatNumber } from '@/lib/utils/format';

export interface DisputeVote {
  validatorId: string;
  validatorName: string;
  vote: 'support' | 'oppose';
  weight: number;
  timestamp: number;
  validatorType: 'institution' | 'community' | 'independent';
}

export interface VotingProgressData {
  disputeId: string;
  supportVotes: number;
  opposeVotes: number;
  totalVotes: number;
  supportPercentage: number;
  opposePercentage: number;
  remainingTime: number;
  quorum: number;
  quorumReached: boolean;
  threshold: number;
  thresholdReached: boolean;
}

export interface WeightDistribution {
  type: 'institution' | 'community' | 'independent';
  label: string;
  supportWeight: number;
  opposeWeight: number;
  totalWeight: number;
  percentage: number;
  color: string;
  bgColor: string;
}

export interface HistoricalDispute {
  id: string;
  type: DisputeType;
  result: 'resolved' | 'rejected';
  supportPercentage: number;
  opposePercentage: number;
  totalVotes: number;
  resolvedAt: number;
  stakeAmount: number;
}

export interface PredictionResult {
  predictedOutcome: 'support' | 'oppose' | 'undecided';
  confidence: number;
  trendDirection: 'up' | 'down' | 'stable';
  factors: {
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
}

interface DisputeVotingDetailsProps {
  dispute: DisputeData;
  votes?: DisputeVote[];
  historicalDisputes?: HistoricalDispute[];
  isLoading?: boolean;
}

function CountdownTimer({ remainingTime, t }: { remainingTime: number; t: ReturnType<typeof useTranslations> }) {
  const [timeLeft, setTimeLeft] = useState(remainingTime);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const isUrgent = hours < 6 && timeLeft > 0;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        isUrgent ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'
      }`}
    >
      <Clock className={`w-4 h-4 ${isUrgent ? 'animate-pulse' : ''}`} />
      <span className="font-mono text-sm font-semibold">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
        {String(seconds).padStart(2, '0')}
      </span>
      <span className="text-xs">{t('uma.disputeVoting.remaining')}</span>
    </div>
  );
}

function VotingProgressBar({ data, t }: { data: VotingProgressData; t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{t('uma.disputeVoting.votingProgress')}</h4>
        <CountdownTimer remainingTime={data.remainingTime} t={t} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">{t('uma.disputeVoting.support')}</span>
          </span>
          <span className="font-semibold text-gray-900">
            {formatNumber(data.supportVotes, true)} ({data.supportPercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${data.supportPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">{t('uma.disputeVoting.against')}</span>
          </span>
          <span className="font-semibold text-gray-900">
            {formatNumber(data.opposeVotes, true)} ({data.opposePercentage.toFixed(1)}%)
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${data.opposePercentage}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                data.quorumReached ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs text-gray-500">
              {data.quorumReached ? t('uma.disputeVoting.quorumReachedLabel') : t('uma.disputeVoting.quorumNotReached')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                data.thresholdReached ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="text-xs text-gray-500">
              {data.thresholdReached ? t('uma.disputeVoting.thresholdReached') : t('uma.disputeVoting.thresholdNotReached')}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-400">{t('uma.disputeVoting.totalVotes')}: {formatNumber(data.totalVotes, true)}</span>
      </div>
    </div>
  );
}

function WeightDistributionChart({ distributions, t }: { distributions: WeightDistribution[]; t: ReturnType<typeof useTranslations> }) {
  const [viewMode, setViewMode] = useState<'pie' | 'bar'>('bar');

  const totalWeight = distributions.reduce((sum, d) => sum + d.totalWeight, 0);

  const typeIcons = {
    institution: <Building2 className="w-4 h-4" />,
    community: <Users className="w-4 h-4" />,
    independent: <UserCircle className="w-4 h-4" />,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{t('uma.disputeVoting.weightDistribution')}</h4>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('bar')}
            className={`p-1.5 rounded ${
              viewMode === 'bar' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('pie')}
            className={`p-1.5 rounded ${
              viewMode === 'pie' ? 'bg-white shadow-sm' : 'text-gray-500'
            }`}
          >
            <PieChartIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'bar' ? (
        <div className="space-y-4">
          {distributions.map((dist, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`${dist.color}`}>{typeIcons[dist.type]}</span>
                  <span className="text-sm font-medium text-gray-700">{dist.label}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {dist.percentage.toFixed(1)}% ({formatNumber(dist.totalWeight, true)})
                </span>
              </div>
              <div className="h-6 bg-gray-100 rounded overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 flex items-center justify-end pr-1"
                  style={{ width: `${(dist.supportWeight / dist.totalWeight) * 100}%` }}
                >
                  {dist.supportWeight > dist.totalWeight * 0.15 && (
                    <span className="text-xs text-white font-medium">
                      {((dist.supportWeight / dist.totalWeight) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <div
                  className="h-full bg-red-500 transition-all duration-500 flex items-center justify-start pl-1"
                  style={{ width: `${(dist.opposeWeight / dist.totalWeight) * 100}%` }}
                >
                  {dist.opposeWeight > dist.totalWeight * 0.15 && (
                    <span className="text-xs text-white font-medium">
                      {((dist.opposeWeight / dist.totalWeight) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {t('uma.disputeVoting.support')}: {formatNumber(dist.supportWeight, true)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  {t('uma.disputeVoting.against')}: {formatNumber(dist.opposeWeight, true)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center py-4">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="transform -rotate-90">
              {(() => {
                let accumulatedPercentage = 0;
                return distributions.map((dist, index) => {
                  const segmentPercentage = dist.percentage;
                  const offset = (accumulatedPercentage / 100) * 100;
                  accumulatedPercentage += segmentPercentage;
                  const supportRatio = dist.supportWeight / dist.totalWeight;
                  return (
                    <g key={index}>
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={semanticColors.success.main}
                        strokeWidth="12"
                        strokeDasharray={`${segmentPercentage * supportRatio * 2.51} ${251}`}
                        strokeDashoffset={`-${offset * 2.51}`}
                        className="transition-all duration-500"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke={semanticColors.danger.main}
                        strokeWidth="12"
                        strokeDasharray={`${segmentPercentage * (1 - supportRatio) * 2.51} ${251}`}
                        strokeDashoffset={`-${(offset + segmentPercentage * supportRatio) * 2.51}`}
                        className="transition-all duration-500"
                      />
                    </g>
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-gray-900">
                {formatNumber(totalWeight, true)}
              </span>
              <span className="text-xs text-gray-500">{t('uma.governance.totalWeight')}</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
        {distributions.map((dist, index) => (
          <div key={index} className={`p-2 rounded-lg text-center ${dist.bgColor}`}>
            <div className={`flex justify-center mb-1 ${dist.color}`}>{typeIcons[dist.type]}</div>
            <p className="text-xs font-medium text-gray-700">{dist.label}</p>
            <p className="text-sm font-semibold text-gray-900">{dist.percentage.toFixed(1)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HistoricalDisputesList({
  disputes,
  onSelect,
  t,
}: {
  disputes: HistoricalDispute[];
  onSelect?: (dispute: HistoricalDispute) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const typeLabels: Record<DisputeType, string> = {
    price: t('uma.disputeTypes.price'),
    state: t('uma.disputeTypes.state'),
    liquidation: t('uma.disputeTypes.liquidation'),
    other: t('uma.disputeTypes.other'),
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{t('uma.disputeVoting.historicalCases')}</h4>
        <span className="text-xs text-gray-400">{disputes.length} {t('uma.disputeVoting.recentResolved')}</span>
      </div>

      <div className="space-y-2">
        {disputes.map((dispute, index) => (
          <button
            key={dispute.id}
            onClick={() => onSelect?.(dispute)}
            className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    dispute.result === 'resolved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {dispute.result === 'resolved' ? t('uma.disputeVoting.passed') : t('uma.disputeVoting.rejected')}
                </span>
                <span className="text-xs text-gray-500">{typeLabels[dispute.type]}</span>
              </div>
              <span className="text-xs text-gray-400">{formatDate(dispute.resolvedAt)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${dispute.supportPercentage}%` }}
                />
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${dispute.opposePercentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-16 text-right">
                {dispute.supportPercentage.toFixed(0)}% vs {dispute.opposePercentage.toFixed(0)}%
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <span>{t('uma.disputeVoting.stakeAmountLabel')}: ${dispute.stakeAmount.toLocaleString()}</span>
              <span>{t('uma.disputeVoting.totalVotesLabel')}: {formatNumber(dispute.totalVotes, true)}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PredictionPanel({ prediction, t }: { prediction: PredictionResult; t: ReturnType<typeof useTranslations> }) {
  const outcomeConfig = {
    support: {
      label: t('uma.disputeVoting.predictPass'),
      color: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      icon: <TrendingUp className="w-5 h-5" />,
    },
    oppose: {
      label: t('uma.disputeVoting.predictReject'),
      color: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: <TrendingDown className="w-5 h-5" />,
    },
    undecided: {
      label: t('uma.disputeVoting.predictUndecided'),
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: <Target className="w-5 h-5" />,
    },
  };

  const config = outcomeConfig[prediction.predictedOutcome];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">{t('uma.disputeVoting.outcomePrediction')}</h4>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>{t('uma.disputeVoting.accuracy')}</span>
          <span className="font-semibold text-gray-700">{prediction.confidence}%</span>
        </div>
      </div>

      <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            <span className={`font-semibold ${config.color}`}>{config.label}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-white/50 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  prediction.confidence >= 70
                    ? 'bg-emerald-500'
                    : prediction.confidence >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                }`}
                style={{ width: `${prediction.confidence}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">{prediction.confidence}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-600 font-medium">{t('uma.disputeVoting.influencingFactors')}:</p>
          {prediction.factors.slice(0, 4).map((factor, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    factor.impact === 'positive'
                      ? 'bg-emerald-500'
                      : factor.impact === 'negative'
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                  }`}
                />
                <span className="text-xs text-gray-600">{factor.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      factor.impact === 'positive'
                        ? 'bg-emerald-500'
                        : factor.impact === 'negative'
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                    }`}
                    style={{ width: `${factor.weight}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8 text-right">{factor.weight}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Clock className="w-3.5 h-3.5" />
        <span>
          {t('uma.disputeVoting.trendDirection')}:{' '}
          <span
            className={`font-medium ${
              prediction.trendDirection === 'up'
                ? 'text-emerald-600'
                : prediction.trendDirection === 'down'
                  ? 'text-red-600'
                  : 'text-gray-600'
            }`}
          >
            {prediction.trendDirection === 'up'
              ? t('uma.disputeVoting.up')
              : prediction.trendDirection === 'down'
                ? t('uma.disputeVoting.down')
                : t('uma.disputeVoting.stable')}
          </span>
        </span>
      </div>
    </div>
  );
}

function generateMockVotes(disputeId: string): DisputeVote[] {
  const validators = [
    { name: 'UMA Foundation', type: 'institution' as const },
    { name: 'Risk Labs', type: 'institution' as const },
    { name: 'SuperUMAn', type: 'community' as const },
    { name: 'Across Validator', type: 'institution' as const },
    { name: 'Polymarket Node', type: 'community' as const },
    { name: 'Independent Validator A', type: 'independent' as const },
    { name: 'Independent Validator B', type: 'independent' as const },
    { name: 'Community Node 1', type: 'community' as const },
    { name: 'DeFi Guardian', type: 'institution' as const },
    { name: 'Oracle Keeper', type: 'independent' as const },
  ];

  const now = Date.now();

  return validators.map((validator, index) => {
    const isSupport = Math.random() > 0.4;
    return {
      validatorId: `validator-${index + 1}`,
      validatorName: validator.name,
      vote: isSupport ? 'support' : 'oppose',
      weight: Math.floor(Math.random() * 50000) + 10000,
      timestamp: now - Math.floor(Math.random() * 24 * 60 * 60 * 1000),
      validatorType: validator.type,
    };
  });
}

function generateMockHistoricalDisputes(): HistoricalDispute[] {
  const types: DisputeType[] = ['price', 'state', 'liquidation', 'other'];
  const now = Date.now();

  return Array.from({ length: 5 }, (_, i) => {
    const supportPercentage = Math.random() * 60 + 20;
    return {
      id: `dispute-hist-${i + 1}`,
      type: types[Math.floor(Math.random() * types.length)],
      result: supportPercentage > 50 ? 'resolved' : 'rejected',
      supportPercentage,
      opposePercentage: 100 - supportPercentage,
      totalVotes: Math.floor(Math.random() * 100000) + 50000,
      resolvedAt: now - (i + 1) * 24 * 60 * 60 * 1000,
      stakeAmount: Math.floor(Math.random() * 50000) + 10000,
    };
  });
}

function calculateVotingProgress(votes: DisputeVote[], dispute: DisputeData): VotingProgressData {
  const supportVotes = votes
    .filter((v) => v.vote === 'support')
    .reduce((sum, v) => sum + v.weight, 0);
  const opposeVotes = votes
    .filter((v) => v.vote === 'oppose')
    .reduce((sum, v) => sum + v.weight, 0);
  const totalVotes = supportVotes + opposeVotes;

  const supportPercentage = totalVotes > 0 ? (supportVotes / totalVotes) * 100 : 0;
  const opposePercentage = totalVotes > 0 ? (opposeVotes / totalVotes) * 100 : 0;

  const quorum = totalVotes * 0.6;
  const threshold = 50;

  const endTime = dispute.timestamp + 48 * 60 * 60 * 1000;
  const remainingTime = Math.max(0, endTime - Date.now());

  return {
    disputeId: dispute.id,
    supportVotes,
    opposeVotes,
    totalVotes,
    supportPercentage,
    opposePercentage,
    remainingTime,
    quorum,
    quorumReached: totalVotes >= quorum,
    threshold,
    thresholdReached: supportPercentage >= threshold,
  };
}

function calculateWeightDistribution(votes: DisputeVote[], t: ReturnType<typeof useTranslations>): WeightDistribution[] {
  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);

  const typeConfig = {
    institution: {
      label: t('uma.disputeVoting.institutionValidators'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    community: {
      label: t('uma.disputeVoting.communityValidators'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    independent: {
      label: t('uma.disputeVoting.independentValidators'),
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
  };

  const grouped = votes.reduce(
    (acc, vote) => {
      if (!acc[vote.validatorType]) {
        acc[vote.validatorType] = { support: 0, oppose: 0, total: 0 };
      }
      acc[vote.validatorType].total += vote.weight;
      if (vote.vote === 'support') {
        acc[vote.validatorType].support += vote.weight;
      } else {
        acc[vote.validatorType].oppose += vote.weight;
      }
      return acc;
    },
    {} as Record<string, { support: number; oppose: number; total: number }>
  );

  return (Object.keys(typeConfig) as Array<keyof typeof typeConfig>).map((type) => {
    const data = grouped[type] || { support: 0, oppose: 0, total: 0 };
    const config = typeConfig[type];
    return {
      type,
      label: config.label,
      supportWeight: data.support,
      opposeWeight: data.oppose,
      totalWeight: data.total,
      percentage: totalWeight > 0 ? (data.total / totalWeight) * 100 : 0,
      color: config.color,
      bgColor: config.bgColor,
    };
  });
}

function generatePrediction(
  votingProgress: VotingProgressData,
  distributions: WeightDistribution[],
  t: ReturnType<typeof useTranslations>
): PredictionResult {
  const supportRatio = votingProgress.supportPercentage / 100;
  const institutionWeight = distributions.find((d) => d.type === 'institution');
  const institutionSupportRatio =
    institutionWeight && institutionWeight.totalWeight > 0
      ? institutionWeight.supportWeight / institutionWeight.totalWeight
      : 0.5;

  let predictedOutcome: 'support' | 'oppose' | 'undecided';
  let confidence: number;
  let trendDirection: 'up' | 'down' | 'stable';

  if (votingProgress.supportPercentage >= 60) {
    predictedOutcome = 'support';
    confidence = Math.min(95, 60 + votingProgress.supportPercentage * 0.3);
    trendDirection = 'up';
  } else if (votingProgress.supportPercentage <= 40) {
    predictedOutcome = 'oppose';
    confidence = Math.min(95, 60 + (100 - votingProgress.supportPercentage) * 0.3);
    trendDirection = 'down';
  } else {
    predictedOutcome = 'undecided';
    confidence = Math.max(30, 50 - Math.abs(votingProgress.supportPercentage - 50));
    trendDirection = 'stable';
  }

  if (institutionSupportRatio > 0.7 && predictedOutcome === 'support') {
    confidence = Math.min(98, confidence + 10);
  }

  const factors = [
    {
      name: t('uma.disputeVoting.currentSupportRate'),
      impact: (supportRatio > 0.5 ? 'positive' : supportRatio < 0.5 ? 'negative' : 'neutral') as
        | 'positive'
        | 'negative'
        | 'neutral',
      weight: Math.round(Math.abs(supportRatio - 0.5) * 100),
    },
    {
      name: t('uma.disputeVoting.institutionVotingTrend'),
      impact: (institutionSupportRatio > 0.6
        ? 'positive'
        : institutionSupportRatio < 0.4
          ? 'negative'
          : 'neutral') as 'positive' | 'negative' | 'neutral',
      weight: Math.round(Math.abs(institutionSupportRatio - 0.5) * 80),
    },
    {
      name: t('uma.disputeVoting.quorumAchieved'),
      impact: (votingProgress.quorumReached ? 'positive' : 'neutral') as
        | 'positive'
        | 'negative'
        | 'neutral',
      weight: votingProgress.quorumReached ? 70 : 30,
    },
    {
      name: t('uma.disputeVoting.votingActivity'),
      impact: (votingProgress.totalVotes > 100000 ? 'positive' : 'neutral') as
        | 'positive'
        | 'negative'
        | 'neutral',
      weight: Math.min(80, votingProgress.totalVotes / 2000),
    },
  ];

  return {
    predictedOutcome,
    confidence: Math.round(confidence),
    trendDirection,
    factors,
  };
}

export function DisputeVotingDetails({
  dispute,
  votes: externalVotes,
  historicalDisputes: externalHistorical,
  isLoading = false,
}: DisputeVotingDetailsProps) {
  const t = useTranslations();
  const [selectedHistorical, setSelectedHistorical] = useState<HistoricalDispute | null>(null);

  const votes = useMemo(() => {
    return externalVotes || generateMockVotes(dispute.id);
  }, [externalVotes, dispute.id]);

  const historicalDisputes = useMemo(() => {
    return externalHistorical || generateMockHistoricalDisputes();
  }, [externalHistorical]);

  const votingProgress = useMemo(() => {
    return calculateVotingProgress(votes, dispute);
  }, [votes, dispute]);

  const weightDistributions = useMemo(() => {
    return calculateWeightDistribution(votes, t);
  }, [votes, t]);

  const prediction = useMemo(() => {
    return generatePrediction(votingProgress, weightDistributions, t);
  }, [votingProgress, weightDistributions, t]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t('uma.disputeVoting.votingDetails')}</h3>
        <span className="text-sm text-gray-500">{t('uma.disputeVoting.disputeId')}: {dispute.id.slice(0, 8)}...</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <VotingProgressBar data={votingProgress} t={t} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <WeightDistributionChart distributions={weightDistributions} t={t} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <PredictionPanel prediction={prediction} t={t} />
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <HistoricalDisputesList disputes={historicalDisputes} onSelect={setSelectedHistorical} t={t} />
        </div>
      </div>

      {selectedHistorical && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900">{t('uma.disputeVoting.disputeDetails')}</h4>
              <button
                onClick={() => setSelectedHistorical(null)}
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
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('uma.disputeVoting.disputeId')}</span>
                <span className="text-sm font-mono text-gray-900">{selectedHistorical.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('uma.disputeVoting.result')}</span>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded ${
                    selectedHistorical.result === 'resolved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedHistorical.result === 'resolved' ? t('uma.disputeVoting.passed') : t('uma.disputeVoting.rejected')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('uma.disputeVoting.supportRateLabel')}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {selectedHistorical.supportPercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('uma.disputeVoting.totalVotesLabel')}</span>
                <span className="text-sm font-semibold text-gray-900">
                  {formatNumber(selectedHistorical.totalVotes, true)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('uma.disputeVoting.stakeAmountLabel')}</span>
                <span className="text-sm font-semibold text-gray-900">
                  ${selectedHistorical.stakeAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DisputeVotingDetails;
