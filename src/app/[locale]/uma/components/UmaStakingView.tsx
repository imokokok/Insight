'use client';

import { useState, useCallback } from 'react';

import {
  Calculator,
  Wallet,
  TrendingUp,
  Award,
  Users,
  BarChart3,
  CircleDollarSign,
  Shield,
} from 'lucide-react';

import { StakingPanel } from '@/components/oracle/panels';
import { useTranslations } from '@/i18n';

import { type UmaStakingViewProps } from '../types';

import { DelegationAnalysis } from './DelegationAnalysis';

export function UmaStakingView({ validators, networkStats, isLoading }: UmaStakingViewProps) {
  const t = useTranslations();
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const [validatorType, setValidatorType] = useState<'institution' | 'independent' | 'community'>(
    'institution'
  );

  const calculateRewards = useCallback(() => {
    const baseAprMap = {
      institution: 0.08,
      independent: 0.1,
      community: 0.12,
    };

    const baseApr = baseAprMap[validatorType];

    const yearlyReward = stakeAmount * baseApr;
    const monthlyReward = yearlyReward / 12;
    const dailyReward = yearlyReward / 365;

    return {
      dailyReward,
      monthlyReward,
      yearlyReward,
      apr: baseApr * 100,
    };
  }, [stakeAmount, validatorType]);

  const rewards = calculateRewards();
  const totalStaked = networkStats?.totalStaked ?? 0;
  const activeValidators = networkStats?.activeValidators ?? validators.length;

  return (
    <div className="space-y-8">
      {/* Staking Calculator - 简洁表单布局 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">{t('uma.staking.calculator')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stake Amount */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Wallet className="w-4 h-4 text-gray-400" />
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
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <Shield className="w-4 h-4 text-gray-400" />
              {t('uma.staking.validatorType')}
            </label>
            <select
              value={validatorType}
              onChange={(e) => setValidatorType(e.target.value as typeof validatorType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 bg-white"
            >
              <option value="institution">{t('uma.staking.institution')}</option>
              <option value="independent">{t('uma.staking.independent')}</option>
              <option value="community">{t('uma.staking.community')}</option>
            </select>
          </div>
        </div>

        {/* Rewards Display - 4列网格，无卡片背景 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('uma.staking.dailyReward')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900">${rewards.dailyReward.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CircleDollarSign className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('uma.staking.monthlyReward')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900">${rewards.monthlyReward.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('uma.staking.yearlyReward')}
              </p>
            </div>
            <p className="text-xl font-bold text-emerald-600">${rewards.yearlyReward.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <p className="text-xs text-red-500 uppercase tracking-wider">
                {t('uma.staking.estimatedApr')}
              </p>
            </div>
            <p className="text-xl font-bold text-red-600">{rewards.apr.toFixed(2)}%</p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Network Staking Stats - 内联展示 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">{t('uma.staking.networkStats')}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.totalStaked')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {totalStaked > 0 ? `$${(totalStaked / 1e6).toFixed(2)}M` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.activeValidators')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {activeValidators > 0 ? activeValidators : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.avgStakePerValidator')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {totalStaked > 0 && activeValidators > 0
                ? `$${(totalStaked / activeValidators / 1e3).toFixed(1)}K`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.networkApr')}
            </p>
            <p className="text-lg font-bold text-emerald-600">-</p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Delegation Analysis */}
      <section>
        <DelegationAnalysis />
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Existing Staking Panel */}
      <section>
        <StakingPanel />
      </section>
    </div>
  );
}
