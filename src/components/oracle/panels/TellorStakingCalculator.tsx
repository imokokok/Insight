'use client';

import { useState } from 'react';
import { StakingCalculation } from '@/lib/oracles/tellor';
import { useI18n } from '@/lib/i18n/provider';
import { DashboardCard } from '@/components/oracle';
import { useStakingCalculator } from '@/hooks/useTellorData';

export function TellorStakingCalculator() {
  const { t } = useI18n();
  const [stakeAmount, setStakeAmount] = useState<number>(10000);
  const [duration, setDuration] = useState<number>(365);
  const [isActiveReporter, setIsActiveReporter] = useState<boolean>(true);
  const [disputeParticipation, setDisputeParticipation] = useState<number>(2);

  const calculation = useStakingCalculator({
    stakeAmount,
    duration,
    isActiveReporter,
    disputeParticipation,
  });

  return (
    <div className="space-y-6">
      {/* Calculator Inputs */}
      <DashboardCard title={t('tellor.staking.calculator.title')}>
        <div className="py-4 space-y-6">
          {/* Stake Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tellor.staking.calculator.stakeAmount')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1000"
                max="100000"
                step="1000"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="w-32">
                <div className="relative">
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">TRB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tellor.staking.calculator.duration')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="30"
                max="1095"
                step="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="w-32">
                <div className="relative">
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Reporter Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('tellor.staking.calculator.activeReporter')}
              </label>
              <p className="text-xs text-gray-500 mt-1">
                {t('tellor.staking.calculator.activeReporterDesc')}
              </p>
            </div>
            <button
              onClick={() => setIsActiveReporter(!isActiveReporter)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActiveReporter ? 'bg-cyan-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActiveReporter ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Dispute Participation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('tellor.staking.calculator.disputeParticipation')}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={disputeParticipation}
                onChange={(e) => setDisputeParticipation(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="w-32">
                <div className="relative">
                  <input
                    type="number"
                    value={disputeParticipation}
                    onChange={(e) => setDisputeParticipation(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-right pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/month</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('tellor.staking.calculator.disputeParticipationDesc')}
            </p>
          </div>
        </div>
      </DashboardCard>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard title={t('tellor.staking.calculator.estimatedApr')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">{calculation.estimatedApr}%</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.staking.calculator.apr')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.staking.calculator.estimatedReward')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-cyan-600">
              {calculation.estimatedReward.toFixed(2)} TRB
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.staking.calculator.totalReward')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.staking.calculator.disputeBonus')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-green-600">
              +{calculation.disputeBonus.toFixed(2)} TRB
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.staking.calculator.extra')}</p>
          </div>
        </DashboardCard>

        <DashboardCard title={t('tellor.staking.calculator.roi')}>
          <div className="py-2">
            <p className="text-3xl font-bold text-purple-600">{calculation.roi}%</p>
            <p className="text-xs text-gray-500 mt-1">{t('tellor.staking.calculator.returnOnInvestment')}</p>
          </div>
        </DashboardCard>
      </div>

      {/* Breakdown */}
      <DashboardCard title={t('tellor.staking.calculator.breakdown')}>
        <div className="py-4 space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600">{t('tellor.staking.calculator.baseApr')}</span>
            <span className="font-medium">10.2%</span>
          </div>
          {isActiveReporter && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-gray-600">{t('tellor.staking.calculator.reporterBonus')}</span>
              <span className="font-medium text-green-600">+5.0%</span>
            </div>
          )}
          {disputeParticipation > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-600">
                {t('tellor.staking.calculator.disputeBonus')} ({disputeParticipation}x)
              </span>
              <span className="font-medium text-blue-600">+{disputeParticipation * 2.0}%</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-900">{t('tellor.staking.calculator.totalApr')}</span>
              <span className="text-2xl font-bold text-cyan-600">{calculation.estimatedApr}%</span>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
