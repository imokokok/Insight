'use client';

import { useState, useMemo, useCallback } from 'react';

export type ScenarioType = 'conservative' | 'moderate' | 'optimistic';

export interface ScenarioConfig {
  label: string;
  apy: number;
  color: string;
}

export interface StakingRewards {
  daily: number;
  monthly: number;
  yearly: number;
  total: number;
  apy: number;
}

export interface UseStakingCalculatorOptions {
  initialAmount?: string;
  initialScenario?: ScenarioType;
  initialPeriod?: number;
}

export interface UseStakingCalculatorReturn {
  stakeAmount: string;
  setStakeAmount: (amount: string) => void;
  selectedScenario: ScenarioType;
  setSelectedScenario: (scenario: ScenarioType) => void;
  stakingPeriod: number;
  setStakingPeriod: (period: number) => void;
  rewards: StakingRewards;
  scenario: ScenarioConfig;
  amount: number;
}

export const SCENARIOS: Record<ScenarioType, ScenarioConfig> = {
  conservative: { label: 'Conservative', apy: 4.5, color: '#60a5fa' },
  moderate: { label: 'Moderate', apy: 7.2, color: '#3b82f6' },
  optimistic: { label: 'Optimistic', apy: 10.8, color: '#1d4ed8' },
};

export function useStakingCalculator(
  options: UseStakingCalculatorOptions = {}
): UseStakingCalculatorReturn {
  const { initialAmount = '10000', initialScenario = 'moderate', initialPeriod = 12 } = options;

  const [stakeAmount, setStakeAmount] = useState<string>(initialAmount);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>(initialScenario);
  const [stakingPeriod, setStakingPeriod] = useState<number>(initialPeriod);

  const amount = parseFloat(stakeAmount) || 0;
  const scenario = SCENARIOS[selectedScenario];

  const rewards = useMemo<StakingRewards>(() => {
    const apyDecimal = scenario.apy / 100;
    const periodDecimal = stakingPeriod / 12;
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

  const handleSetStakeAmount = useCallback((value: string) => {
    setStakeAmount(value);
  }, []);

  const handleSetScenario = useCallback((value: ScenarioType) => {
    setSelectedScenario(value);
  }, []);

  const handleSetPeriod = useCallback((value: number) => {
    setStakingPeriod(value);
  }, []);

  return {
    stakeAmount,
    setStakeAmount: handleSetStakeAmount,
    selectedScenario,
    setSelectedScenario: handleSetScenario,
    stakingPeriod,
    setStakingPeriod: handleSetPeriod,
    rewards,
    scenario,
    amount,
  };
}
