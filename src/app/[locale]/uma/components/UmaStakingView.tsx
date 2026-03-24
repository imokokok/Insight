'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { UmaStakingViewProps } from '../types';
import { StakingPanel } from '@/components/oracle/panels';

export function UmaStakingView({ validators, networkStats, isLoading }: UmaStakingViewProps) {
  const t = useTranslations();
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const [validatorType, setValidatorType] = useState<'institution' | 'independent' | 'community'>('institution');
  const [disputeFrequency, setDisputeFrequency] = useState<'low' | 'medium' | 'high'>('medium');

  const calculateRewards = useCallback(() => {
    const baseAprMap = {
      institution: 0.08,
      independent: 0.1,
      community: 0.12,
    };

    const disputeBonusMap = {
      low: 0,
      medium: 0.02,
      high: 0.05,
    };

    const baseApr = baseAprMap[validatorType];
    const disputeBonus = disputeBonusMap[disputeFrequency];
    const totalApr = baseApr + disputeBonus;

    const yearlyReward = stakeAmount * totalApr;
    const monthlyReward = yearlyReward / 12;
    const dailyReward = yearlyReward / 365;

    return {
      dailyReward,
      monthlyReward,
      yearlyReward,
      apr: totalApr * 100,
    };
  }, [stakeAmount, validatorType, disputeFrequency]);

  const rewards = calculateRewards();
  const totalStaked = networkStats?.totalStaked ?? 25000000;

  return (
    <div className="space-y-4">
      {/* Staking Calculator */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.staking.calculator')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Stake Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('uma.staking.stakeAmount')}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                min="1000"
                step="1000"
              />
            </div>
          </div>

          {/* Validator Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('uma.staking.validatorType')}
            </label>
            <select
              value={validatorType}
              onChange={(e) => setValidatorType(e.target.value as typeof validatorType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              <option value="institution">{t('uma.staking.institution')}</option>
              <option value="independent">{t('uma.staking.independent')}</option>
              <option value="community">{t('uma.staking.community')}</option>
            </select>
          </div>

          {/* Dispute Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('uma.staking.disputeFrequency')}
            </label>
            <select
              value={disputeFrequency}
              onChange={(e) => setDisputeFrequency(e.target.value as typeof disputeFrequency)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
            >
              <option value="low">{t('uma.staking.low')}</option>
              <option value="medium">{t('uma.staking.medium')}</option>
              <option value="high">{t('uma.staking.high')}</option>
            </select>
          </div>
        </div>

        {/* Rewards Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.dailyReward')}
            </p>
            <p className="text-xl font-bold text-gray-900">
              ${rewards.dailyReward.toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.monthlyReward')}
            </p>
            <p className="text-xl font-bold text-gray-900">
              ${rewards.monthlyReward.toFixed(2)}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.yearlyReward')}
            </p>
            <p className="text-xl font-bold text-emerald-600">
              ${rewards.yearlyReward.toFixed(2)}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
            <p className="text-xs text-red-500 uppercase tracking-wider mb-1">
              {t('uma.staking.estimatedApr')}
            </p>
            <p className="text-xl font-bold text-red-600">
              {rewards.apr.toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* APR Comparison */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.staking.aprComparison')}
        </h3>
        <div className="space-y-3">
          {[
            { type: 'institution', label: t('uma.staking.institution'), apr: 8.0, color: 'bg-blue-500' },
            { type: 'independent', label: t('uma.staking.independent'), apr: 10.0, color: 'bg-purple-500' },
            { type: 'community', label: t('uma.staking.community'), apr: 12.0, color: 'bg-red-500' },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-4">
              <span className="text-sm text-gray-600 w-24">{item.label}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${item.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(item.apr / 15) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900 w-16 text-right">
                {item.apr}%
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          {t('uma.staking.aprNote')}
        </p>
      </div>

      {/* Network Staking Stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.staking.networkStats')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.totalStaked')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              ${(totalStaked / 1e6).toFixed(2)}M
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.activeValidators')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {networkStats?.activeValidators ?? 850}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.avgStakePerValidator')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              ${((totalStaked / (networkStats?.activeValidators ?? 850)) / 1e3).toFixed(1)}K
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.networkApr')}
            </p>
            <p className="text-lg font-bold text-emerald-600">
              8.5%
            </p>
          </div>
        </div>
      </div>

      {/* Existing Staking Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <StakingPanel />
      </div>
    </div>
  );
}
