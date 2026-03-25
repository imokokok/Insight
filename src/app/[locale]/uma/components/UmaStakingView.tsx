'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Calculator, Wallet, TrendingUp, Award, Users, BarChart3, CircleDollarSign, Shield } from 'lucide-react';
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
    <div className="space-y-8">
      {/* Staking Calculator - 简洁表单布局 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">
            {t('uma.staking.calculator')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Dispute Frequency */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <BarChart3 className="w-4 h-4 text-gray-400" />
              {t('uma.staking.disputeFrequency')}
            </label>
            <select
              value={disputeFrequency}
              onChange={(e) => setDisputeFrequency(e.target.value as typeof disputeFrequency)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 bg-white"
            >
              <option value="low">{t('uma.staking.low')}</option>
              <option value="medium">{t('uma.staking.medium')}</option>
              <option value="high">{t('uma.staking.high')}</option>
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
            <p className="text-xl font-bold text-gray-900">
              ${rewards.dailyReward.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <CircleDollarSign className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('uma.staking.monthlyReward')}
              </p>
            </div>
            <p className="text-xl font-bold text-gray-900">
              ${rewards.monthlyReward.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Award className="w-4 h-4 text-gray-400" />
              <p className="text-xs text-gray-500 uppercase tracking-wider">
                {t('uma.staking.yearlyReward')}
              </p>
            </div>
            <p className="text-xl font-bold text-emerald-600">
              ${rewards.yearlyReward.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-red-500" />
              <p className="text-xs text-red-500 uppercase tracking-wider">
                {t('uma.staking.estimatedApr')}
              </p>
            </div>
            <p className="text-xl font-bold text-red-600">
              {rewards.apr.toFixed(2)}%
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* APR Comparison - 进度条形式 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">
            {t('uma.staking.aprComparison')}
          </h3>
        </div>
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
        <p className="text-xs text-gray-500 mt-3">
          {t('uma.staking.aprNote')}
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Network Staking Stats - 内联展示 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900">
            {t('uma.staking.networkStats')}
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.totalStaked')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              ${(totalStaked / 1e6).toFixed(2)}M
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.activeValidators')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              {networkStats?.activeValidators ?? 850}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.avgStakePerValidator')}
            </p>
            <p className="text-lg font-bold text-gray-900">
              ${((totalStaked / (networkStats?.activeValidators ?? 850)) / 1e3).toFixed(1)}K
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.staking.networkApr')}
            </p>
            <p className="text-lg font-bold text-emerald-600">
              8.5%
            </p>
          </div>
        </div>
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
