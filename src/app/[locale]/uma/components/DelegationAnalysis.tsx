'use client';

import { useState, useMemo } from 'react';

import {
  Calculator,
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  Star,
  Info,
  Clock,
  DollarSign,
  BarChart3,
} from 'lucide-react';

export interface DelegationInfo {
  validatorId: string;
  validatorName: string;
  delegatedAmount: number;
  rewards: number;
  apy: number;
  riskScore: number;
  startDate: number;
}

interface ValidatorRecommendation {
  id: string;
  name: string;
  type: 'institution' | 'independent' | 'community';
  apy: number;
  riskScore: number;
  performance: number;
  uptime: number;
  totalStaked: number;
  reason: string;
  rating: number;
}

interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

const BASE_TIME = 1704067200000;

const mockDelegationHistory: DelegationInfo[] = [
  {
    validatorId: 'v1',
    validatorName: 'Figment',
    delegatedAmount: 5000,
    rewards: 425.5,
    apy: 8.5,
    riskScore: 25,
    startDate: BASE_TIME - 90 * 24 * 60 * 60 * 1000,
  },
  {
    validatorId: 'v2',
    validatorName: 'Chorus One',
    delegatedAmount: 3000,
    rewards: 315.2,
    apy: 10.5,
    riskScore: 35,
    startDate: BASE_TIME - 60 * 24 * 60 * 60 * 1000,
  },
  {
    validatorId: 'v3',
    validatorName: 'Community Validator',
    delegatedAmount: 2000,
    rewards: 280.8,
    apy: 14.04,
    riskScore: 55,
    startDate: BASE_TIME - 30 * 24 * 60 * 60 * 1000,
  },
];

const mockValidatorRecommendations: ValidatorRecommendation[] = [
  {
    id: 'v1',
    name: 'Figment',
    type: 'institution',
    apy: 8.5,
    riskScore: 25,
    performance: 99.2,
    uptime: 99.9,
    totalStaked: 2500000,
    reason: 'High stability and low risk',
    rating: 4.8,
  },
  {
    id: 'v2',
    name: 'Chorus One',
    type: 'institution',
    apy: 9.2,
    riskScore: 28,
    performance: 98.8,
    uptime: 99.8,
    totalStaked: 1800000,
    reason: 'Excellent performance history',
    rating: 4.7,
  },
  {
    id: 'v3',
    name: 'Independent Validator A',
    type: 'independent',
    apy: 11.5,
    riskScore: 40,
    performance: 97.5,
    uptime: 99.2,
    totalStaked: 500000,
    reason: 'High yield with moderate risk',
    rating: 4.3,
  },
  {
    id: 'v4',
    name: 'Community Node Alpha',
    type: 'community',
    apy: 13.8,
    riskScore: 55,
    performance: 95.8,
    uptime: 98.5,
    totalStaked: 150000,
    reason: 'Highest APY for risk-tolerant delegators',
    rating: 4.0,
  },
];

export function DelegationAnalysis() {
  const [delegationAmount, setDelegationAmount] = useState<number>(10000);
  const [selectedValidator, setSelectedValidator] = useState<string>('v1');
  const [activeTab, setActiveTab] = useState<'calculator' | 'recommendations' | 'risk' | 'history'>(
    'calculator'
  );

  const selectedValidatorData = useMemo(() => {
    return mockValidatorRecommendations.find((v) => v.id === selectedValidator);
  }, [selectedValidator]);

  const delegationRewards = useMemo(() => {
    if (!selectedValidatorData) return { daily: 0, monthly: 0, yearly: 0, apy: 0 };

    const apy = selectedValidatorData.apy / 100;
    const yearly = delegationAmount * apy;
    const monthly = yearly / 12;
    const daily = yearly / 365;

    return {
      daily,
      monthly,
      yearly,
      apy: selectedValidatorData.apy,
    };
  }, [delegationAmount, selectedValidatorData]);

  const riskFactors: RiskFactor[] = useMemo(() => {
    if (!selectedValidatorData) return [];

    return [
      {
        name: 'Performance',
        score: selectedValidatorData.performance,
        weight: 0.35,
        description: 'Historical performance consistency',
      },
      {
        name: 'Uptime',
        score: selectedValidatorData.uptime,
        weight: 0.3,
        description: 'Network availability and reliability',
      },
      {
        name: 'Reputation',
        score: 100 - selectedValidatorData.riskScore,
        weight: 0.2,
        description: 'Community trust and track record',
      },
      {
        name: 'Stake Distribution',
        score: Math.min(100, (selectedValidatorData.totalStaked / 2500000) * 100),
        weight: 0.15,
        description: 'Stake concentration level',
      },
    ];
  }, [selectedValidatorData]);

  const getRiskLevel = (score: number) => {
    if (score <= 30) return { level: 'Low', color: 'text-emerald-600', bgColor: 'bg-emerald-50' };
    if (score <= 60) return { level: 'Medium', color: 'text-amber-600', bgColor: 'bg-amber-50' };
    return { level: 'High', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  const getRiskIcon = (score: number) => {
    if (score <= 30) return <CheckCircle className="w-5 h-5 text-emerald-600" />;
    if (score <= 60) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatDuration = (startDate: number) => {
    const days = Math.floor((BASE_TIME - startDate) / (24 * 60 * 60 * 1000));
    return `${days} days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-red-500" />
        <h3 className="text-base font-semibold text-gray-900">Delegation Analysis</h3>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'calculator', label: 'Calculator', icon: Calculator },
          { id: 'recommendations', label: 'Recommendations', icon: Star },
          { id: 'risk', label: 'Risk Assessment', icon: Shield },
          { id: 'history', label: 'History', icon: Clock },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'calculator' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                Delegation Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={delegationAmount}
                  onChange={(e) => setDelegationAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500"
                  min="100"
                  step="100"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 text-gray-400" />
                Select Validator
              </label>
              <select
                value={selectedValidator}
                onChange={(e) => setSelectedValidator(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-red-500 focus:border-red-500 bg-white"
              >
                {mockValidatorRecommendations.map((validator) => (
                  <option key={validator.id} value={validator.id}>
                    {validator.name} ({validator.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedValidatorData && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-900">
                  {selectedValidatorData.name}
                </h4>
                <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                  {selectedValidatorData.type}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">APY:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {selectedValidatorData.apy}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Performance:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {selectedValidatorData.performance}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Uptime:</span>
                  <span className="ml-2 font-semibold text-gray-900">
                    {selectedValidatorData.uptime}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Risk Score:</span>
                  <span
                    className={`ml-2 font-semibold ${getRiskLevel(selectedValidatorData.riskScore).color}`}
                  >
                    {selectedValidatorData.riskScore}/100
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Daily Reward</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                ${delegationRewards.daily.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Monthly Reward</p>
              </div>
              <p className="text-xl font-bold text-gray-900">
                ${delegationRewards.monthly.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <p className="text-xs text-gray-500 uppercase tracking-wider">Yearly Reward</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">
                ${delegationRewards.yearly.toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BarChart3 className="w-4 h-4 text-red-500" />
                <p className="text-xs text-red-500 uppercase tracking-wider">APY</p>
              </div>
              <p className="text-xl font-bold text-red-600">{delegationRewards.apy.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <p className="text-sm text-blue-800">
              Recommendations are based on historical performance, risk assessment, and network
              participation.
            </p>
          </div>

          <div className="space-y-3">
            {mockValidatorRecommendations.map((validator, index) => (
              <div
                key={validator.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-red-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                      {index + 1}
                    </div>
                    <h4 className="font-semibold text-gray-900">{validator.name}</h4>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {validator.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-gray-900">{validator.rating}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{validator.reason}</p>

                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">APY</p>
                    <p className="font-semibold text-emerald-600">{validator.apy}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Performance</p>
                    <p className="font-semibold text-gray-900">{validator.performance}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Uptime</p>
                    <p className="font-semibold text-gray-900">{validator.uptime}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Risk</p>
                    <p className={`font-semibold ${getRiskLevel(validator.riskScore).color}`}>
                      {getRiskLevel(validator.riskScore).level}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedValidator(validator.id);
                    setActiveTab('calculator');
                  }}
                  className="mt-3 w-full py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                >
                  Select This Validator
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'risk' && selectedValidatorData && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {getRiskIcon(selectedValidatorData.riskScore)}
              <div>
                <p className="text-sm text-gray-500">Overall Risk Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {selectedValidatorData.riskScore}
                  <span className="text-sm font-normal text-gray-500">/100</span>
                </p>
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded-lg ${getRiskLevel(selectedValidatorData.riskScore).bgColor}`}
            >
              <p
                className={`text-sm font-semibold ${getRiskLevel(selectedValidatorData.riskScore).color}`}
              >
                {getRiskLevel(selectedValidatorData.riskScore).level} Risk
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Risk Factors Analysis</h4>
            <div className="space-y-3">
              {riskFactors.map((factor) => (
                <div key={factor.name} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">{factor.name}</p>
                      <span className="text-xs text-gray-500">
                        ({(factor.weight * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{factor.score.toFixed(1)}</p>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${factor.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{factor.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-1">Risk Considerations</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>• Higher APY typically correlates with higher risk</li>
                  <li>• Consider diversifying across multiple validators</li>
                  <li>• Monitor validator performance regularly</li>
                  <li>• Be aware of unbonding periods and liquidity risks</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Delegated</p>
              <p className="text-lg font-bold text-gray-900">
                $
                {mockDelegationHistory
                  .reduce((sum, d) => sum + d.delegatedAmount, 0)
                  .toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Rewards</p>
              <p className="text-lg font-bold text-emerald-600">
                ${mockDelegationHistory.reduce((sum, d) => sum + d.rewards, 0).toFixed(2)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Active Delegations
              </p>
              <p className="text-lg font-bold text-gray-900">{mockDelegationHistory.length}</p>
            </div>
          </div>

          <div className="space-y-3">
            {mockDelegationHistory.map((delegation) => (
              <div key={delegation.validatorId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{delegation.validatorName}</h4>
                    <p className="text-xs text-gray-500">
                      Started {formatDate(delegation.startDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {getRiskIcon(delegation.riskScore)}
                    <span className="text-xs text-gray-500">
                      {getRiskLevel(delegation.riskScore).level} Risk
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500 text-xs">Delegated</p>
                    <p className="font-semibold text-gray-900">
                      ${delegation.delegatedAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Rewards</p>
                    <p className="font-semibold text-emerald-600">
                      ${delegation.rewards.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">APY</p>
                    <p className="font-semibold text-gray-900">{delegation.apy}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs">Duration</p>
                    <p className="font-semibold text-gray-900">
                      {formatDuration(delegation.startDate)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden w-24">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(delegation.riskScore / 100) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">Risk: {delegation.riskScore}/100</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
