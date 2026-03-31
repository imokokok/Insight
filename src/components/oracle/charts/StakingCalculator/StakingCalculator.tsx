'use client';

import { useState, useMemo, useCallback } from 'react';

import { Calculator, TrendingUp, Clock, AlertCircle, Info, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';

import { Skeleton } from '@/components/ui';

interface StakingTier {
  duration: number;
  apr: number;
  multiplier: number;
  label: string;
}

interface StakingReward {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  total: number;
}

interface ProjectionPoint {
  month: number;
  staked: number;
  rewards: number;
  total: number;
}

const STAKING_TIERS: StakingTier[] = [
  { duration: 30, apr: 5.2, multiplier: 1.0, label: '30 Days' },
  { duration: 90, apr: 7.8, multiplier: 1.15, label: '90 Days' },
  { duration: 180, apr: 10.5, multiplier: 1.35, label: '180 Days' },
  { duration: 365, apr: 15.2, multiplier: 1.6, label: '1 Year' },
];

const DIA_PRICE_USD = 0.85;

interface StakingCalculatorProps {
  tokenSymbol?: string;
  tokenPrice?: number;
  minStake?: number;
  maxStake?: number;
  onCalculate?: (amount: number, tier: StakingTier) => void;
}

export function StakingCalculator({
  tokenSymbol = 'DIA',
  tokenPrice = DIA_PRICE_USD,
  minStake = 100,
  maxStake = 1000000,
  onCalculate,
}: StakingCalculatorProps) {
  const [amount, setAmount] = useState<string>('1000');
  const [selectedTier, setSelectedTier] = useState<StakingTier>(STAKING_TIERS[1]);
  const [compoundEnabled, setCompoundEnabled] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);

  const numericAmount = useMemo(() => {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }, [amount]);

  const isValidAmount = useMemo(() => {
    return numericAmount >= minStake && numericAmount <= maxStake;
  }, [numericAmount, minStake, maxStake]);

  const rewards = useMemo<StakingReward>(() => {
    if (!isValidAmount) {
      return { daily: 0, weekly: 0, monthly: 0, yearly: 0, total: 0 };
    }

    const dailyRate = selectedTier.apr / 100 / 365;
    const daily = numericAmount * dailyRate;
    const weekly = daily * 7;
    const monthly = daily * 30;
    const yearly = daily * 365;

    let total: number;
    if (compoundEnabled) {
      total = numericAmount * Math.pow(1 + dailyRate, selectedTier.duration);
    } else {
      total = numericAmount + daily * selectedTier.duration;
    }

    return { daily, weekly, monthly, yearly, total };
  }, [numericAmount, selectedTier, compoundEnabled, isValidAmount]);

  const projectionData = useMemo<ProjectionPoint[]>(() => {
    if (!isValidAmount) return [];

    const data: ProjectionPoint[] = [];
    const months = Math.ceil(selectedTier.duration / 30);
    const dailyRate = selectedTier.apr / 100 / 365;

    let currentStaked = numericAmount;
    let totalRewards = 0;

    for (let month = 0; month <= months; month++) {
      const daysElapsed = month * 30;

      if (compoundEnabled) {
        currentStaked = numericAmount * Math.pow(1 + dailyRate, daysElapsed);
        totalRewards = currentStaked - numericAmount;
      } else {
        totalRewards = numericAmount * dailyRate * daysElapsed;
        currentStaked = numericAmount + totalRewards;
      }

      data.push({
        month,
        staked: numericAmount,
        rewards: totalRewards,
        total: currentStaked,
      });
    }

    return data;
  }, [numericAmount, selectedTier, compoundEnabled, isValidAmount]);

  const handleCalculate = useCallback(() => {
    if (!isValidAmount) return;

    setIsCalculating(true);
    setTimeout(() => {
      onCalculate?.(numericAmount, selectedTier);
      setIsCalculating(false);
    }, 500);
  }, [numericAmount, selectedTier, isValidAmount, onCalculate]);

  const handlePreset = (value: number) => {
    setAmount(value.toString());
  };

  const handleAmountChange = (value: string) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setAmount(sanitized);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Staking Calculator</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Estimate your {tokenSymbol} staking rewards
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Info className="w-4 h-4" />
          <span>
            1 {tokenSymbol} = ${tokenPrice.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Stake ({tokenSymbol})
            </label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={`w-full px-4 py-3 text-lg font-medium border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  !isValidAmount && numericAmount > 0
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200'
                }`}
                placeholder="Enter amount"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                {tokenSymbol}
              </span>
            </div>
            {!isValidAmount && numericAmount > 0 && (
              <p className="mt-1 text-sm text-red-600">
                Amount must be between {minStake.toLocaleString()} and {maxStake.toLocaleString()}
              </p>
            )}
            <div className="flex gap-2 mt-2">
              {[1000, 5000, 10000, 50000].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handlePreset(preset)}
                  className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Lock Period</label>
            <div className="grid grid-cols-2 gap-2">
              {STAKING_TIERS.map((tier) => (
                <button
                  key={tier.duration}
                  onClick={() => setSelectedTier(tier)}
                  className={`p-3 text-left border rounded-lg transition-all ${
                    selectedTier.duration === tier.duration
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{tier.label}</span>
                    <span className="text-sm font-semibold text-emerald-600">{tier.apr}% APR</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">{tier.multiplier}x Multiplier</div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Auto-compound</span>
            </div>
            <button
              onClick={() => setCompoundEnabled(!compoundEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                compoundEnabled ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  compoundEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!isValidAmount || isCalculating}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" />
            {isCalculating ? 'Calculating...' : 'Calculate Rewards'}
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Estimated Rewards</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Daily</p>
                <p className="text-lg font-semibold text-gray-900">
                  {rewards.daily.toFixed(4)} {tokenSymbol}
                </p>
                <p className="text-xs text-gray-500">${(rewards.daily * tokenPrice).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Weekly</p>
                <p className="text-lg font-semibold text-gray-900">
                  {rewards.weekly.toFixed(4)} {tokenSymbol}
                </p>
                <p className="text-xs text-gray-500">${(rewards.weekly * tokenPrice).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Monthly</p>
                <p className="text-lg font-semibold text-gray-900">
                  {rewards.monthly.toFixed(4)} {tokenSymbol}
                </p>
                <p className="text-xs text-gray-500">
                  ${(rewards.monthly * tokenPrice).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total ({selectedTier.label})</p>
                <p className="text-lg font-semibold text-emerald-600">
                  +{(rewards.total - numericAmount).toFixed(4)} {tokenSymbol}
                </p>
                <p className="text-xs text-gray-500">
                  +${((rewards.total - numericAmount) * tokenPrice).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Initial Stake</span>
                <span className="font-medium">
                  {numericAmount.toLocaleString()} {tokenSymbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">APR</span>
                <span className="font-medium text-emerald-600">{selectedTier.apr}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Lock Period</span>
                <span className="font-medium">{selectedTier.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Compounding</span>
                <span className="font-medium">{compoundEnabled ? 'Enabled' : 'Disabled'}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 font-medium">Final Amount</span>
                  <span className="font-bold text-gray-900">
                    {rewards.total.toFixed(4)} {tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">USD Value</span>
                  <span className="font-medium text-gray-900">
                    ${(rewards.total * tokenPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {projectionData.length > 0 && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={projectionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="month"
                    stroke="#9ca3af"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `M${value}`}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => {
                      const label =
                        name === 'total' ? 'Total' : name === 'rewards' ? 'Rewards' : 'Staked';
                      return [`${value.toFixed(2)} ${tokenSymbol}`, label];
                    }}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="staked"
                    stroke="#9ca3af"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-amber-700">
          <p className="font-medium">Disclaimer</p>
          <p className="mt-0.5">
            Calculated rewards are estimates based on current APR and may vary. Actual rewards
            depend on network conditions, total staked amount, and protocol parameters.
          </p>
        </div>
      </div>
    </div>
  );
}

export default StakingCalculator;
