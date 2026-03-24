'use client';

import { useTranslations } from 'next-intl';
import { TellorStakingViewProps } from '../types';
import { TellorStakingCalculator } from '@/components/oracle/panels/TellorStakingCalculator';

export function TellorStakingView({ isLoading }: TellorStakingViewProps) {
  const t = useTranslations();

  const stakingStats = [
    {
      label: t('tellor.staking.totalStaked'),
      value: '20M TRB',
      change: '+5%',
    },
    {
      label: t('tellor.staking.stakingApr'),
      value: '10.2%',
      change: '+0.5%',
    },
    {
      label: t('tellor.staking.totalStakers'),
      value: '1,250+',
      change: '+12',
    },
    {
      label: t('tellor.staking.rewardPool'),
      value: '500K TRB',
      change: '+8%',
    },
  ];

  const stakingTiers = [
    { tier: 'Bronze', minStake: '100 TRB', reward: 'Base', features: ['Basic reporting', 'Standard rewards'] },
    { tier: 'Silver', minStake: '1,000 TRB', reward: '+20%', features: ['Priority reporting', 'Bonus rewards', 'Dispute voting'] },
    { tier: 'Gold', minStake: '5,000 TRB', reward: '+50%', features: ['Highest priority', 'Maximum rewards', 'Governance rights', 'Early access'] },
  ];

  return (
    <div className="space-y-4">
      {/* Staking Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stakingStats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <span className="text-xs text-emerald-600">{stat.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Staking Calculator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.staking.calculator')}
        </h3>
        <TellorStakingCalculator />
      </div>

      {/* Staking Tiers */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('tellor.staking.tiers')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stakingTiers.map((tier, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                index === 1
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="text-center mb-3">
                <h4 className="text-lg font-bold text-gray-900">{tier.tier}</h4>
                <p className="text-sm text-gray-500">{tier.minStake}</p>
              </div>
              <div className="text-center mb-3">
                <span className="text-2xl font-bold text-emerald-600">{tier.reward}</span>
              </div>
              <ul className="space-y-1">
                {tier.features.map((feature, fIndex) => (
                  <li key={fIndex} className="text-xs text-gray-600 flex items-center gap-1">
                    <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
  );
}
