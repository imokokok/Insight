'use client';

import { useState, useMemo, useCallback } from 'react';

import {
  DollarSign,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Zap,
  BarChart3,
  Calendar,
  Clock,
  Database,
  ArrowRight,
  Building2,
  Landmark,
  Coins,
  Settings,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

import { useTranslations } from '@/i18n';

type Scenario = 'lending' | 'dex' | 'derivatives' | 'custom';
type Chain = 'ethereum' | 'arbitrum' | 'optimism' | 'polygon' | 'base' | 'bsc';
type UpdateFrequency = 'hourly' | '15min' | 'realtime';
type DataComplexity = 'simple' | 'twap' | 'volatility';

interface ChainConfig {
  name: string;
  baseGasMultiplier: number;
  avgGasPrice: number;
  ethPrice: number;
}

interface ScenarioConfig {
  name: string;
  icon: typeof Building2;
  defaultFeeds: number;
  defaultFrequency: UpdateFrequency;
  description: string;
}

const chainConfigs: Record<Chain, ChainConfig> = {
  ethereum: { name: 'Ethereum', baseGasMultiplier: 1.0, avgGasPrice: 25, ethPrice: 3200 },
  arbitrum: { name: 'Arbitrum', baseGasMultiplier: 0.1, avgGasPrice: 0.1, ethPrice: 3200 },
  optimism: { name: 'Optimism', baseGasMultiplier: 0.15, avgGasPrice: 0.003, ethPrice: 3200 },
  polygon: { name: 'Polygon', baseGasMultiplier: 0.05, avgGasPrice: 30, ethPrice: 3200 },
  base: { name: 'Base', baseGasMultiplier: 0.1, avgGasPrice: 0.001, ethPrice: 3200 },
  bsc: { name: 'BSC', baseGasMultiplier: 0.08, avgGasPrice: 3, ethPrice: 3200 },
};

const scenarioConfigs: Record<Scenario, ScenarioConfig> = {
  lending: {
    name: 'Lending Protocol (Aave-style)',
    icon: Building2,
    defaultFeeds: 8,
    defaultFrequency: '15min',
    description: 'Multi-asset lending with liquidation feeds',
  },
  dex: {
    name: 'DEX (Uniswap-style)',
    icon: Coins,
    defaultFeeds: 12,
    defaultFrequency: 'realtime',
    description: 'Real-time trading pair prices',
  },
  derivatives: {
    name: 'Derivatives (GMX-style)',
    icon: BarChart3,
    defaultFeeds: 15,
    defaultFrequency: 'realtime',
    description: 'Perpetual futures with funding rates',
  },
  custom: {
    name: 'Custom Scenario',
    icon: Settings,
    defaultFeeds: 5,
    defaultFrequency: 'hourly',
    description: 'Configure your own parameters',
  },
};

const frequencyMultipliers: Record<UpdateFrequency, number> = {
  hourly: 24,
  '15min': 96,
  realtime: 288,
};

const complexityMultipliers: Record<DataComplexity, number> = {
  simple: 1.0,
  twap: 1.5,
  volatility: 2.0,
};

const historicalCases = [
  {
    protocol: 'Venus Protocol',
    type: 'Lending',
    chain: 'BSC',
    monthlySavings: 12500,
    savingsPercent: 72,
    feedsCount: 15,
    description: 'Migrated from Chainlink push model to RedStone pull model',
  },
  {
    protocol: 'GMX V2',
    type: 'Derivatives',
    chain: 'Arbitrum',
    monthlySavings: 45000,
    savingsPercent: 78,
    feedsCount: 25,
    description: 'Real-time price feeds for perpetual trading',
  },
  {
    protocol: 'Polynomial Trade',
    type: 'DEX',
    chain: 'Optimism',
    monthlySavings: 8200,
    savingsPercent: 68,
    feedsCount: 18,
    description: 'Options trading platform with TWAP feeds',
  },
  {
    protocol: 'Morpho Blue',
    type: 'Lending',
    chain: 'Ethereum',
    monthlySavings: 38000,
    savingsPercent: 75,
    feedsCount: 12,
    description: 'Efficient lending with volatility-adjusted feeds',
  },
];

export function GasCostCalculator() {
  const t = useTranslations();

  const [isExpanded, setIsExpanded] = useState(true);
  const [scenario, setScenario] = useState<Scenario>('lending');
  const [chain, setChain] = useState<Chain>('ethereum');
  const [priceFeeds, setPriceFeeds] = useState(8);
  const [updateFrequency, setUpdateFrequency] = useState<UpdateFrequency>('15min');
  const [dataComplexity, setDataComplexity] = useState<DataComplexity>('simple');
  const [gasPriceOverride, setGasPriceOverride] = useState<number | null>(null);

  const handleScenarioChange = (newScenario: Scenario) => {
    setScenario(newScenario);
    if (newScenario !== 'custom') {
      setPriceFeeds(scenarioConfigs[newScenario].defaultFeeds);
      setUpdateFrequency(scenarioConfigs[newScenario].defaultFrequency);
    }
  };

  const calculations = useMemo(() => {
    const chainConfig = chainConfigs[chain];
    const effectiveGasPrice = gasPriceOverride ?? chainConfig.avgGasPrice;

    const updatesPerDay = frequencyMultipliers[updateFrequency];
    const complexityMult = complexityMultipliers[dataComplexity];

    const pushGasPerUpdate = 150000 * priceFeeds * complexityMult;
    const pullGasPerUpdate = 80000 * priceFeeds * complexityMult;

    const pushDailyGas = pushGasPerUpdate * updatesPerDay;
    const pullDailyGas = pullGasPerUpdate * Math.min(updatesPerDay, 10);

    const pushDailyCost =
      (pushDailyGas * effectiveGasPrice * chainConfig.baseGasMultiplier * chainConfig.ethPrice) /
      1e18;
    const pullDailyCost =
      (pullDailyGas * effectiveGasPrice * chainConfig.baseGasMultiplier * chainConfig.ethPrice) /
      1e18;

    const dailySavings = pushDailyCost - pullDailyCost;
    const savingsPercent = ((pushDailyCost - pullDailyCost) / pushDailyCost) * 100;

    return {
      pushDailyCost,
      pullDailyCost,
      dailySavings,
      savingsPercent,
      monthlySavings: dailySavings * 30,
      yearlySavings: dailySavings * 365,
      pushMonthlyCost: pushDailyCost * 30,
      pullMonthlyCost: pullDailyCost * 30,
    };
  }, [chain, priceFeeds, updateFrequency, dataComplexity, gasPriceOverride]);

  const chartData = useMemo(() => {
    return [
      {
        name: t('redstone.gasCalculator.daily'),
        push: Number(calculations.pushDailyCost.toFixed(2)),
        pull: Number(calculations.pullDailyCost.toFixed(2)),
      },
      {
        name: t('redstone.gasCalculator.monthly'),
        push: Number(calculations.pushMonthlyCost.toFixed(2)),
        pull: Number(calculations.pullMonthlyCost.toFixed(2)),
      },
      {
        name: t('redstone.gasCalculator.yearly'),
        push: Number((calculations.pushDailyCost * 365).toFixed(2)),
        pull: Number((calculations.pullDailyCost * 365).toFixed(2)),
      },
    ];
  }, [calculations, t]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('redstone.gasCalculator.title')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('redstone.gasCalculator.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-emerald-100 rounded-full">
            <span className="text-sm font-semibold text-emerald-600">
              {calculations.savingsPercent.toFixed(0)}%{' '}
              {t('redstone.gasCalculator.savings')}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-100 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-medium">
                  {t('redstone.gasCalculator.scenario')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(scenarioConfigs) as Scenario[]).map((key) => {
                    const config = scenarioConfigs[key];
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => handleScenarioChange(key)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          scenario === key
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className={`w-4 h-4 ${scenario === key ? 'text-red-500' : 'text-gray-400'}`}
                          />
                          <span
                            className={`text-xs font-medium ${scenario === key ? 'text-red-600' : 'text-gray-600'}`}
                          >
                            {t(`redstone.gasCalculator.scenarios.${key}`)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 truncate">{config.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-medium">
                  {t('redstone.gasCalculator.chain')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(chainConfigs) as Chain[]).map((key) => {
                    const config = chainConfigs[key];
                    return (
                      <button
                        key={key}
                        onClick={() => setChain(key)}
                        className={`p-2 rounded-lg border-2 transition-all ${
                          chain === key
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span
                          className={`text-xs font-medium ${chain === key ? 'text-red-600' : 'text-gray-600'}`}
                        >
                          {config.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">
                  {t('redstone.gasCalculator.priceFeeds')}: {priceFeeds}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={priceFeeds}
                  onChange={(e) => setPriceFeeds(Number(e.target.value))}
                  disabled={scenario !== 'custom'}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500 disabled:opacity-50"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-medium">
                  {t('redstone.gasCalculator.updateFrequency')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['hourly', '15min', 'realtime'] as UpdateFrequency[]).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setUpdateFrequency(freq)}
                      disabled={scenario !== 'custom'}
                      className={`p-2 rounded-lg border-2 transition-all disabled:opacity-50 ${
                        updateFrequency === freq
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${updateFrequency === freq ? 'text-red-600' : 'text-gray-600'}`}
                      >
                        {t(`redstone.gasCalculator.frequencies.${freq}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-2 block font-medium">
                  {t('redstone.gasCalculator.dataComplexity')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['simple', 'twap', 'volatility'] as DataComplexity[]).map((complexity) => (
                    <button
                      key={complexity}
                      onClick={() => setDataComplexity(complexity)}
                      className={`p-2 rounded-lg border-2 transition-all ${
                        dataComplexity === complexity
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span
                        className={`text-xs font-medium ${dataComplexity === complexity ? 'text-red-600' : 'text-gray-600'}`}
                      >
                        {t(`redstone.gasCalculator.complexity.${complexity}`)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block font-medium">
                  {t('redstone.gasCalculator.gasPrice')}:{' '}
                  {gasPriceOverride ?? chainConfigs[chain].avgGasPrice}
                </label>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={gasPriceOverride ?? chainConfigs[chain].avgGasPrice}
                  onChange={(e) => setGasPriceOverride(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>1 Gwei</span>
                  <span>200 Gwei</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      type="number"
                      tickFormatter={(v) => formatCurrency(v)}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                    <Legend />
                    <Bar
                      dataKey="push"
                      name={t('redstone.gasCalculator.pushModel')}
                      fill="#9ca3af"
                      radius={[0, 4, 4, 0]}
                    />
                    <Bar
                      dataKey="pull"
                      name={t('redstone.gasCalculator.pullModel')}
                      fill="#ef4444"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    {t('redstone.gasCalculator.dailySavings')}
                  </p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(calculations.dailySavings)}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">
                    {t('redstone.gasCalculator.monthlySavings')}
                  </p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(calculations.monthlySavings)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg text-center border border-emerald-200">
                  <p className="text-xs text-emerald-600 mb-1">
                    {t('redstone.gasCalculator.yearlySavings')}
                  </p>
                  <p className="text-lg font-bold text-emerald-600">
                    {formatCurrency(calculations.yearlySavings)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-red-50 to-emerald-50 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      {t('redstone.gasCalculator.totalSavings')}
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(calculations.yearlySavings)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {t('redstone.gasCalculator.savingsRate')}
                    </p>
                    <p className="text-2xl font-bold text-red-500">
                      {calculations.savingsPercent.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-red-500" />
              {t('redstone.gasCalculator.historicalCases')}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {historicalCases.map((case_, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-red-200 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">{case_.protocol}</span>
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                      {case_.type}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {t('redstone.gasCalculator.chain')}:
                      </span>
                      <span className="text-gray-700">{case_.chain}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {t('redstone.gasCalculator.feeds')}:
                      </span>
                      <span className="text-gray-700">{case_.feedsCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">
                        {t('redstone.gasCalculator.monthlySavings')}:
                      </span>
                      <span className="text-emerald-600 font-semibold">
                        ${case_.monthlySavings.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {t('redstone.gasCalculator.savings')}:
                      </span>
                      <span className="text-sm font-bold text-emerald-600">
                        {case_.savingsPercent}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{case_.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
