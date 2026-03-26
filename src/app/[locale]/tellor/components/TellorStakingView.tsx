'use client';

import { TrendingUp, TrendingDown, Wallet, Users, PiggyBank, Award } from 'lucide-react';

import { TellorStakingCalculator } from '@/components/oracle/panels/TellorStakingCalculator';
import { useTranslations } from '@/i18n';

import { type TellorStakingViewProps } from '../types';

export function TellorStakingView({ isLoading }: TellorStakingViewProps) {
  const t = useTranslations();

  const stakingStats = [
    {
      label: t('tellor.staking.totalStaked'),
      value: '20M TRB',
      change: '+5%',
      trend: 'up',
      icon: Wallet,
    },
    {
      label: t('tellor.staking.stakingApr'),
      value: '10.2%',
      change: '+0.5%',
      trend: 'up',
      icon: PiggyBank,
    },
    {
      label: t('tellor.staking.totalStakers'),
      value: '1,250+',
      change: '+12',
      trend: 'up',
      icon: Users,
    },
    {
      label: t('tellor.staking.rewardPool'),
      value: '500K TRB',
      change: '+8%',
      trend: 'up',
      icon: Award,
    },
  ];

  const stakingTiers = [
    {
      tier: 'Bronze',
      minStake: '100 TRB',
      reward: 'Base',
      features: ['Basic reporting', 'Standard rewards'],
    },
    {
      tier: 'Silver',
      minStake: '1,000 TRB',
      reward: '+20%',
      features: ['Priority reporting', 'Bonus rewards', 'Dispute voting'],
    },
    {
      tier: 'Gold',
      minStake: '5,000 TRB',
      reward: '+50%',
      features: ['Highest priority', 'Maximum rewards', 'Governance rights', 'Early access'],
    },
  ];

  return (
    <div className="space-y-8">
      {/* 质押统计 - 简洁内联布局 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stakingStats.map((stat, index) => {
          const Icon = stat.icon;
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">{stat.value}</p>
                <div
                  className={`flex items-center gap-0.5 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'
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

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 质押计算器 */}
        <div className="lg:col-span-2">
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.staking.calculator.title')}
          </h3>
          <TellorStakingCalculator />
        </div>

        {/* 质押等级 */}
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">{t('tellor.staking.tiers')}</h3>
          <div className="space-y-4">
            {stakingTiers.map((tier, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  index === 1 ? 'border-cyan-500 bg-cyan-50/50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-900">{tier.tier}</h4>
                  <span className="text-xs text-gray-500">{tier.minStake}</span>
                </div>
                <div className="mb-3">
                  <span className="text-lg font-bold text-emerald-600">{tier.reward}</span>
                </div>
                <ul className="space-y-1">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="text-xs text-gray-600 flex items-center gap-1.5">
                      <svg
                        className="w-3 h-3 text-emerald-500 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 质押说明 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.staking.howItWorks') || 'How Staking Works'}
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                1
              </span>
              <span>Stake TRB tokens to become a reporter and earn rewards</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                2
              </span>
              <span>Submit accurate data to the Tellor oracle network</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                3
              </span>
              <span>Earn rewards based on stake amount and reporting accuracy</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">
            {t('tellor.staking.risks') || 'Staking Risks'}
          </h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Slashing risk: Stake may be slashed for inaccurate data submissions</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Lock-up period: Staked tokens have a 7-day withdrawal delay</span>
            </li>
            <li className="flex items-start gap-3">
              <svg
                className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Market risk: TRB price fluctuations affect staking value</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
