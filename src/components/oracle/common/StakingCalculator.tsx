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

const validatorTypeLabels: Record<ValidatorType, string> = {
  institution: '机构验证者',
  independent: '独立验证者',
  community: '社区验证者',
};

const validatorTypeLabelsEn: Record<ValidatorType, string> = {
  institution: 'Institution',
  independent: 'Independent',
  community: 'Community',
};

const disputeFrequencyLabels: Record<DisputeFrequency, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const disputeFrequencyLabelsEn: Record<DisputeFrequency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function StakingCalculator() {
  const { locale } = useI18n();
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

  const getValidatorLabel = (type: ValidatorType) => {
    return isZh ? validatorTypeLabels[type] : validatorTypeLabelsEn[type];
  };

  const getDisputeLabel = (freq: DisputeFrequency) => {
    return isZh ? disputeFrequencyLabels[freq] : disputeFrequencyLabelsEn[freq];
  };

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
    <DashboardCard
      title={isZh ? '质押收益计算器' : 'Staking Rewards Calculator'}
      className="h-full"
    >
      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isZh ? '质押金额 (UMA)' : 'Stake Amount (UMA)'}
            </label>
            <div className="relative">
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Math.max(0, Number(e.target.value)))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder={isZh ? '输入质押金额' : 'Enter stake amount'}
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
                {isZh ? '验证者类型' : 'Validator Type'}
              </label>
              <select
                value={validatorType}
                onChange={(e) => setValidatorType(e.target.value as ValidatorType)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="institution">{getValidatorLabel('institution')}</option>
                <option value="independent">{getValidatorLabel('independent')}</option>
                <option value="community">{getValidatorLabel('community')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isZh ? '争议频率' : 'Dispute Frequency'}
              </label>
              <select
                value={disputeFrequency}
                onChange={(e) => setDisputeFrequency(e.target.value as DisputeFrequency)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white"
              >
                <option value="low">{getDisputeLabel('low')}</option>
                <option value="medium">{getDisputeLabel('medium')}</option>
                <option value="high">{getDisputeLabel('high')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">
            {isZh ? '预估收益' : 'Estimated Rewards'}
          </h4>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {isZh ? '日收益' : 'Daily'}
              </p>
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(calculation.dailyReward)}
              </p>
              <p className="text-xs text-gray-400 mt-1">UMA</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {isZh ? '月收益' : 'Monthly'}
              </p>
              <p className="text-lg font-bold text-green-600">
                {formatCurrency(calculation.monthlyReward)}
              </p>
              <p className="text-xs text-gray-400 mt-1">UMA</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {isZh ? '年收益' : 'Yearly'}
              </p>
              <p className="text-lg font-bold text-purple-600">
                {formatCurrency(calculation.yearlyReward)}
              </p>
              <p className="text-xs text-gray-400 mt-1">UMA</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                {isZh ? '年化收益率' : 'APR'}
              </p>
              <p className="text-lg font-bold text-orange-600">{formatPercent(calculation.apr)}</p>
              <p className="text-xs text-gray-400 mt-1">{isZh ? '年化' : 'Annual'}</p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="text-sm font-medium text-gray-700 mb-4">
              {isZh ? '收益对比' : 'Reward Comparison'}
            </h5>
            <div className="flex items-end justify-around h-32 space-x-4">
              <div className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  {formatCurrency(calculation.dailyReward)}
                </div>
                <div
                  className="w-full bg-blue-500 rounded-t-md transition-all duration-300"
                  style={{ height: `${Math.max(dailyHeight, 8)}%` }}
                />
                <div className="text-xs text-gray-600 mt-2 font-medium">{isZh ? '日' : 'Day'}</div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  {formatCurrency(calculation.monthlyReward / 30)}
                </div>
                <div
                  className="w-full bg-green-500 rounded-t-md transition-all duration-300"
                  style={{ height: `${Math.max(monthlyHeight, 8)}%` }}
                />
                <div className="text-xs text-gray-600 mt-2 font-medium">
                  {isZh ? '月/日' : 'Mo/Day'}
                </div>
              </div>

              <div className="flex flex-col items-center flex-1">
                <div className="text-xs text-gray-500 mb-2">
                  {formatCurrency(calculation.yearlyReward / 365)}
                </div>
                <div
                  className="w-full bg-purple-500 rounded-t-md transition-all duration-300"
                  style={{ height: `${Math.max(yearlyHeight, 8)}%` }}
                />
                <div className="text-xs text-gray-600 mt-2 font-medium">
                  {isZh ? '年/日' : 'Yr/Day'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500">
            <p>
              {isZh
                ? '* 收益估算基于当前网络参数，实际收益可能因网络状况而有所不同。'
                : '* Reward estimates are based on current network parameters. Actual rewards may vary based on network conditions.'}
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default StakingCalculator;
