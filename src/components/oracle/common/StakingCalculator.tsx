'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { UMAClient } from '@/lib/oracles/uma';
import { DashboardCard } from './DashboardCard';

const umaClient = new UMAClient();

type ValidatorType = 'institution' | 'independent' | 'community';
type DisputeFrequency = 'low' | 'medium' | 'high';

interface StakingCalculation {
  dailyReward: number;
  monthlyReward: number;
  yearlyReward: number;
  apr: number;
}

export function StakingCalculator() {
  const { t, locale } = useI18n();
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const [validatorType, setValidatorType] = useState<ValidatorType>('independent');
  const [disputeFrequency, setDisputeFrequency] = useState<DisputeFrequency>('medium');

  const [calculation, setCalculation] = useState<StakingCalculation>({
    dailyReward: 0,
    monthlyReward: 0,
    yearlyReward: 0,
    apr: 0,
  });

  useEffect(() => {
    const fetchCalculation = async () => {
      const result = await umaClient.calculateStakingRewards(
        stakeAmount,
        validatorType,
        disputeFrequency
      );
      setCalculation(result);
    };
    fetchCalculation();
  }, [stakeAmount, validatorType, disputeFrequency]);

  const isZh = locale === 'zh-CN';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isZh ? 'zh-CN' : 'en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value}%`;
  };

  const maxReward = Math.max(
    calculation.dailyReward,
    calculation.monthlyReward / 30,
    calculation.yearlyReward / 365
  );
  const dailyHeight = maxReward > 0 ? (calculation.dailyReward / maxReward) * 100 : 0;
  const monthlyHeight = maxReward > 0 ? (calculation.monthlyReward / 30 / maxReward) * 100 : 0;
  const yearlyHeight = maxReward > 0 ? (calculation.yearlyReward / 365 / maxReward) * 100 : 0;

  return (
    <DashboardCard title={t('oracleCommon.stakingCalculator.title')} className="h-full">
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('oracleCommon.stakingCalculator.stakeAmount')}
            </label>
            <div className="relative">
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-2.5 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder={t('oracleCommon.stakingCalculator.stakeAmountPlaceholder')}
                min="0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">
                UMA
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('oracleCommon.stakingCalculator.validatorType')}
              </label>
              <select
                value={validatorType}
                onChange={(e) => setValidatorType(e.target.value as ValidatorType)}
                className="w-full px-4 py-2.5 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="institution">
                  {t('oracleCommon.stakingCalculator.validatorTypes.institution')}
                </option>
                <option value="independent">
                  {t('oracleCommon.stakingCalculator.validatorTypes.independent')}
                </option>
                <option value="community">
                  {t('oracleCommon.stakingCalculator.validatorTypes.community')}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('oracleCommon.stakingCalculator.disputeFrequency')}
              </label>
              <select
                value={disputeFrequency}
                onChange={(e) => setDisputeFrequency(e.target.value as DisputeFrequency)}
                className="w-full px-4 py-2.5 border border-gray-300  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="low">
                  {t('oracleCommon.stakingCalculator.disputeFrequencies.low')}
                </option>
                <option value="medium">
                  {t('oracleCommon.stakingCalculator.disputeFrequencies.medium')}
                </option>
                <option value="high">
                  {t('oracleCommon.stakingCalculator.disputeFrequencies.high')}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {t('oracleCommon.stakingCalculator.estimatedRewards')}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50  p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('oracleCommon.stakingCalculator.daily')}
              </p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(calculation.dailyReward)}
              </p>
              <p className="text-xs text-gray-400 mt-1">UMA</p>
            </div>

            <div className="bg-green-50  p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('oracleCommon.stakingCalculator.monthly')}
              </p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(calculation.monthlyReward)}
              </p>
              <p className="text-xs text-gray-400 mt-1">UMA</p>
            </div>

            <div className="bg-purple-50  p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('oracleCommon.stakingCalculator.yearly')}
              </p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(calculation.yearlyReward)}
              </p>
              <p className="text-xs text-gray-400 mt-1">UMA</p>
            </div>

            <div className="bg-orange-50  p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {t('oracleCommon.stakingCalculator.apr')}
              </p>
              <p className="text-lg font-bold text-orange-600">{formatPercent(calculation.apr)}</p>
              <p className="text-xs text-gray-400 mt-1">
                {t('oracleCommon.stakingCalculator.annual')}
              </p>
            </div>
          </div>

          <div className="bg-gray-50  p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-4">
              {t('oracleCommon.stakingCalculator.rewardComparison')}
            </h5>
            <div className="flex items-end justify-around h-32 space-x-4">
              <div className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  {formatCurrency(calculation.dailyReward)}
                </div>
                <div
                  className="w-full bg-blue-500 -md transition-all duration-300"
                  style={{ height: `${Math.max(dailyHeight, 8)}%` }}
                />
                <div className="text-xs text-gray-600 mt-2 font-medium">
                  {t('oracleCommon.stakingCalculator.day')}
                </div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  {formatCurrency(calculation.monthlyReward / 30)}
                </div>
                <div
                  className="w-full bg-green-500 -md transition-all duration-300"
                  style={{ height: `${Math.max(monthlyHeight, 8)}%` }}
                />
                <div className="text-xs text-gray-600 mt-2 font-medium">
                  {t('oracleCommon.stakingCalculator.monthPerDay')}
                </div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  {formatCurrency(calculation.yearlyReward / 365)}
                </div>
                <div
                  className="w-full bg-purple-500 -md transition-all duration-300"
                  style={{ height: `${Math.max(yearlyHeight, 8)}%` }}
                />
                <div className="text-xs text-gray-600 mt-2 font-medium">
                  {t('oracleCommon.stakingCalculator.yearPerDay')}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>{t('oracleCommon.stakingCalculator.disclaimer')}</p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default StakingCalculator;
