'use client';

import { useState } from 'react';

import {
  Wallet,
  TrendingUp,
  Users,
  PiggyBank,
  ChevronRight,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorStakingViewProps } from '../types';

interface StakingTier {
  name: string;
  minStake: number;
  apr: number;
  benefits: string[];
  color: string;
}

const stakingTiers: StakingTier[] = [
  {
    name: 'Bronze',
    minStake: 100,
    apr: 8.5,
    benefits: ['Basic rewards', 'Voting rights'],
    color: 'bg-amber-600',
  },
  {
    name: 'Silver',
    minStake: 500,
    apr: 12.0,
    benefits: ['Enhanced rewards', 'Priority voting', 'Dispute participation'],
    color: 'bg-gray-400',
  },
  {
    name: 'Gold',
    minStake: 2000,
    apr: 15.5,
    benefits: ['Premium rewards', 'Governance rights', 'Early access'],
    color: 'bg-yellow-500',
  },
  {
    name: 'Platinum',
    minStake: 5000,
    apr: 20.0,
    benefits: ['Maximum rewards', 'Full governance', 'Exclusive features'],
    color: 'bg-cyan-500',
  },
];

export function TellorStakingView({ isLoading }: TellorStakingViewProps) {
  const t = useTranslations('tellor');
  const [stakeAmount, setStakeAmount] = useState<number>(1000);
  const [duration, setDuration] = useState<number>(12);

  const stats = [
    {
      label: t('staking.totalStaked'),
      value: '2.8M',
      change: '+12%',
      icon: Wallet,
    },
    {
      label: t('staking.stakingApr'),
      value: '15.5%',
      change: '+2.3%',
      icon: TrendingUp,
    },
    {
      label: t('staking.totalStakers'),
      value: '1,247',
      change: '+89',
      icon: Users,
    },
    {
      label: t('staking.rewardPool'),
      value: '450K',
      change: '+35K',
      icon: PiggyBank,
    },
  ];

  const estimatedReward = (stakeAmount * (15.5 / 100) * duration) / 12;

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

      {/* 质押等级和计算器 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 质押等级 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">{t('staking.tiers')}</h3>
          <div className="space-y-4">
            {stakingTiers.map((tier, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-gray-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                    <span className="font-medium text-gray-900">{tier.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-cyan-600">{tier.apr}% APR</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">
                  Min: {tier.minStake.toLocaleString()} TRB
                </p>
                <div className="flex flex-wrap gap-2">
                  {tier.benefits.map((benefit, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {benefit}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 质押计算器 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('staking.calculator.title')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                {t('staking.calculator.stakeAmount')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-500">TRB</span>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                {t('staking.calculator.duration')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-500">{t('staking.calculator.months')}</span>
              </div>
            </div>
            <div className="p-4 bg-cyan-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('staking.calculator.estimatedReward')}
                </span>
                <span className="text-lg font-semibold text-cyan-600">
                  {estimatedReward.toFixed(2)} TRB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{t('staking.calculator.totalReward')}</span>
                <span className="text-lg font-semibold text-gray-900">
                  {(stakeAmount + estimatedReward).toFixed(2)} TRB
                </span>
              </div>
            </div>
            <button className="w-full py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium">
              {t('staking.calculator.stakeNow')}
            </button>
          </div>
        </div>
      </div>

      {/* 风险提示 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">{t('staking.risks')}</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-red-900">{t('staking.slashingRisk')}</h4>
              <p className="text-xs text-red-700 mt-1">{t('staking.slashingRiskDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50">
            <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900">{t('staking.lockupPeriod')}</h4>
              <p className="text-xs text-yellow-700 mt-1">{t('staking.lockupPeriodDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50">
            <TrendingUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">{t('staking.marketRisk')}</h4>
              <p className="text-xs text-blue-700 mt-1">{t('staking.marketRiskDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
