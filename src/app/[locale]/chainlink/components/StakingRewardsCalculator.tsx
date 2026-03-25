'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Calculator, TrendingUp, Clock, Calendar, AlertCircle, Info } from 'lucide-react';

type ScenarioType = 'conservative' | 'moderate' | 'optimistic';

interface ScenarioConfig {
  label: string;
  apy: number;
  color: string;
  description: string;
}

const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  conservative: {
    label: 'Conservative',
    apy: 4.5,
    color: '#60a5fa',
    description: 'Lower risk, stable returns',
  },
  moderate: {
    label: 'Moderate',
    apy: 7.2,
    color: '#3b82f6',
    description: 'Balanced risk and reward',
  },
  optimistic: {
    label: 'Optimistic',
    apy: 10.8,
    color: '#1d4ed8',
    description: 'Higher risk, potential for greater returns',
  },
};

const LINK_PRICE = 14.5; // Mock LINK price in USD

export function StakingRewardsCalculator() {
  const t = useTranslations();
  const [stakeAmount, setStakeAmount] = useState<string>('10000');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('moderate');
  const [stakingPeriod, setStakingPeriod] = useState<number>(12); // months

  const amount = parseFloat(stakeAmount) || 0;
  const scenario = SCENARIOS[selectedScenario];

  const rewards = useMemo(() => {
    const apyDecimal = scenario.apy / 100;
    const periodDecimal = stakingPeriod / 12;

    // Simple interest calculation for the period
    const yearlyReward = amount * apyDecimal;
    const periodReward = yearlyReward * periodDecimal;

    return {
      daily: yearlyReward / 365,
      monthly: yearlyReward / 12,
      yearly: yearlyReward,
      total: periodReward,
      apy: scenario.apy,
    };
  }, [amount, scenario.apy, stakingPeriod]);

  const formatCurrency = (value: number): string => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K`;
    }
    return value.toFixed(2);
  };

  const formatUsd = (linkAmount: number): string => {
    return `$${(linkAmount * LINK_PRICE).toFixed(2)}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
        <Calculator className="w-4 h-4 text-gray-500" />
        <h3 className="text-sm font-medium text-gray-900">
          {t('chainlink.nodes.stakingCalculator')}
        </h3>
      </div>

      {/* Input Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {t('chainlink.nodes.stakeAmount')}
          </label>
          <div className="relative">
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-1 focus:ring-gray-300 focus:border-gray-300 outline-none"
              placeholder="10000"
              min="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">
              LINK
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-1">≈ {formatUsd(amount)}</div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            {t('chainlink.nodes.stakingPeriod')}
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="36"
              value={stakingPeriod}
              onChange={(e) => setStakingPeriod(parseInt(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-500"
            />
            <span className="text-sm text-gray-600 w-16 text-right">
              {stakingPeriod} {t('chainlink.nodes.months')}
            </span>
          </div>
        </div>
      </div>

      {/* Scenario Selection */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          {t('chainlink.nodes.scenario')}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SCENARIOS) as ScenarioType[]).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedScenario(key)}
              className={`
                px-2 py-2 rounded text-xs font-medium transition-all
                ${
                  selectedScenario === key
                    ? 'bg-gray-100 text-gray-900 border border-gray-300'
                    : 'bg-transparent text-gray-500 border border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div>{SCENARIOS[key].label}</div>
              <div className="text-xs opacity-60">{SCENARIOS[key].apy}% APY</div>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 flex items-start gap-1">
          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
          {scenario.description}
        </p>
      </div>

      {/* Rewards Display */}
      <div className="border-t border-gray-100 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">
            {t('chainlink.nodes.expectedRewards')}
          </span>
          <span className="text-xs font-medium text-gray-700">
            {scenario.apy}% APY
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{t('chainlink.nodes.daily')}</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(rewards.daily)}</div>
            <div className="text-xs text-gray-400">LINK</div>
          </div>

          <div className="text-center border-x border-gray-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{t('chainlink.nodes.monthly')}</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(rewards.monthly)}</div>
            <div className="text-xs text-gray-400">LINK</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{t('chainlink.nodes.yearly')}</span>
            </div>
            <div className="text-sm font-semibold text-gray-900">{formatCurrency(rewards.yearly)}</div>
            <div className="text-xs text-gray-400">LINK</div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {t('chainlink.nodes.totalAfter')} {stakingPeriod} {t('chainlink.nodes.months')}
            </span>
            <div className="text-right">
              <div className="text-base font-bold text-gray-900">
                +{formatCurrency(rewards.total)} LINK
              </div>
              <div className="text-xs text-gray-400">≈ {formatUsd(rewards.total)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 pt-3 border-t border-gray-100">
        <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">
          {t('chainlink.nodes.calculatorDisclaimer')}
        </p>
      </div>
    </div>
  );
}

export default StakingRewardsCalculator;
