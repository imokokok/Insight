'use client';

import { useState, useMemo } from 'react';

import {
  Layers,
  Activity,
  Clock,
  Users,
  Database,
  TrendingUp,
  ArrowRightLeft,
  Zap,
  Shield,
  Globe,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorLayerViewProps } from '../types';

interface ChainMetrics {
  activeValidators: number;
  onlineRate: number;
  throughput: number;
  trbStaked: number;
}

interface BridgeStats {
  ethToLayer: {
    volume: number;
    transactions: number;
    pending: number;
  };
  layerToEth: {
    volume: number;
    transactions: number;
    pending: number;
  };
  avgTime: number;
  fee: number;
}

interface DataSource {
  type: string;
  queries: number;
  reporters: number;
  description: string;
}

const mockMetrics: ChainMetrics = {
  activeValidators: 85,
  onlineRate: 98.5,
  throughput: 1250,
  trbStaked: 2500000,
};

const mockBridgeStats: BridgeStats = {
  ethToLayer: {
    volume: 1250000,
    transactions: 450,
    pending: 12,
  },
  layerToEth: {
    volume: 890000,
    transactions: 320,
    pending: 8,
  },
  avgTime: 15,
  fee: 0.001,
};

const mockDataSources: DataSource[] = [
  {
    type: 'SpotPrice',
    queries: 156,
    reporters: 42,
    description: 'Real-time spot price data from multiple sources',
  },
  {
    type: 'TWAP',
    queries: 89,
    reporters: 38,
    description: 'Time-weighted average price for reduced volatility',
  },
  {
    type: 'Random',
    queries: 45,
    reporters: 25,
    description: 'Verifiable random number generation',
  },
  {
    type: 'Custom',
    queries: 23,
    reporters: 15,
    description: 'Custom query types for specialized data needs',
  },
];

const bridgeActivityData = [
  { time: '10:00', ethToLayer: 45, layerToEth: 32 },
  { time: '10:30', ethToLayer: 52, layerToEth: 38 },
  { time: '11:00', ethToLayer: 48, layerToEth: 41 },
  { time: '11:30', ethToLayer: 61, layerToEth: 45 },
  { time: '12:00', ethToLayer: 55, layerToEth: 39 },
];

export function TellorLayerView({ isLoading }: TellorLayerViewProps) {
  const t = useTranslations('tellor');

  const maxBridgeValue = useMemo(() => {
    const allValues = bridgeActivityData.flatMap((d) => [d.ethToLayer, d.layerToEth]);
    return Math.max(...allValues);
  }, []);

  return (
    <div className="space-y-8">
      {/* Tellor Layer Overview */}
      <div className="bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Tellor Layer</h2>
            <p className="text-cyan-100 text-sm">{t('tellorLayer.overview.dedicatedBlockchain')}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-white/10 rounded-lg">
            <p className="text-xs text-cyan-100">{t('tellorLayer.overview.chainId')}</p>
            <p className="text-lg font-semibold">1</p>
          </div>
          <div className="p-3 bg-white/10 rounded-lg">
            <p className="text-xs text-cyan-100">{t('tellorLayer.overview.consensus')}</p>
            <p className="text-lg font-semibold">PoS</p>
          </div>
          <div className="p-3 bg-white/10 rounded-lg">
            <p className="text-xs text-cyan-100">{t('tellorLayer.overview.blockHeight')}</p>
            <p className="text-lg font-semibold">1,245,678</p>
          </div>
          <div className="p-3 bg-white/10 rounded-lg">
            <p className="text-xs text-cyan-100">{t('tellorLayer.overview.validators')}</p>
            <p className="text-lg font-semibold">100</p>
          </div>
        </div>
      </div>

      {/* Chain Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-cyan-50">
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-xs text-gray-500">
              {t('tellorLayer.metrics.activeValidators')}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{mockMetrics.activeValidators}</p>
          <p className="text-xs text-emerald-600 mt-1">+3 {t('hero.thisWeek')}</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-cyan-50">
              <Activity className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-xs text-gray-500">{t('tellorLayer.metrics.onlineRate')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{mockMetrics.onlineRate}%</p>
          <p className="text-xs text-emerald-600 mt-1">+0.5%</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-cyan-50">
              <Zap className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-xs text-gray-500">{t('tellorLayer.metrics.throughput')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{mockMetrics.throughput}</p>
          <p className="text-xs text-gray-500 mt-1">{t('tellorLayer.metrics.tps')}</p>
        </div>
        <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-cyan-50">
              <Database className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-xs text-gray-500">{t('tellorLayer.metrics.trbStaked')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(mockMetrics.trbStaked / 1e6).toFixed(2)}M
          </p>
          <p className="text-xs text-emerald-600 mt-1">+12%</p>
        </div>
      </div>

      {/* Bridge Statistics */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellorLayer.bridge.title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('tellorLayer.bridge.ethToLayer')}</span>
                <ArrowRightLeft className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-gray-900">
                  ${(mockBridgeStats.ethToLayer.volume / 1e6).toFixed(2)}M
                </span>
                <span className="text-xs text-gray-500">
                  {mockBridgeStats.ethToLayer.transactions}{' '}
                  {t('tellorLayer.bridge.transactions').toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                {mockBridgeStats.ethToLayer.pending} {t('tellorLayer.bridge.pending').toLowerCase()}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">{t('tellorLayer.bridge.layerToEth')}</span>
                <ArrowRightLeft className="w-4 h-4 text-cyan-600 transform rotate-180" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold text-gray-900">
                  ${(mockBridgeStats.layerToEth.volume / 1e6).toFixed(2)}M
                </span>
                <span className="text-xs text-gray-500">
                  {mockBridgeStats.layerToEth.transactions}{' '}
                  {t('tellorLayer.bridge.transactions').toLowerCase()}
                </span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                {mockBridgeStats.layerToEth.pending} {t('tellorLayer.bridge.pending').toLowerCase()}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.avgTime')}</p>
                <p className="text-lg font-semibold text-gray-900">{mockBridgeStats.avgTime} min</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.fee')}</p>
                <p className="text-lg font-semibold text-gray-900">{mockBridgeStats.fee} ETH</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-3">{t('tellorLayer.bridge.activityChart')}</p>
            <div className="space-y-3">
              {bridgeActivityData.map((data, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-10">{data.time}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${(data.ethToLayer / maxBridgeValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-cyan-600 w-6">{data.ethToLayer}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${(data.layerToEth / maxBridgeValue) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-blue-600 w-6">{data.layerToEth}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-cyan-600">→ Layer</span>
              <span className="text-blue-600">→ ETH</span>
            </div>
          </div>
        </div>
      </div>

      {/* Native Data Sources */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellorLayer.dataSources.title')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockDataSources.map((source, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-gray-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">{source.type}</h4>
                <Database className="w-4 h-4 text-cyan-600" />
              </div>
              <p className="text-xs text-gray-500 mb-3">{source.description}</p>
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400">{t('tellorLayer.dataSources.queries')}</p>
                  <p className="text-sm font-semibold text-gray-900">{source.queries}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">{t('tellorLayer.dataSources.reporters')}</p>
                  <p className="text-sm font-semibold text-gray-900">{source.reporters}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison with EVM Chains */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellorLayer.comparison.title')}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('tellorLayer.comparison.feature')}
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-cyan-600 uppercase">
                  Tellor Layer
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  EVM Chains
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { feature: t('tellorLayer.comparison.updateSpeed'), layer: '~2s', evm: '~12s' },
                {
                  feature: t('tellorLayer.comparison.gasCost'),
                  layer: t('tellorLayer.comparison.nearZero'),
                  evm: t('tellorLayer.comparison.variable'),
                },
                {
                  feature: t('tellorLayer.comparison.customData'),
                  layer: t('tellorLayer.comparison.native'),
                  evm: t('tellorLayer.comparison.limited'),
                },
                { feature: t('tellorLayer.comparison.consensus'), layer: 'PoS', evm: 'PoW/PoS' },
                {
                  feature: t('tellorLayer.comparison.finality'),
                  layer: t('tellorLayer.comparison.instant'),
                  evm: '~6 min',
                },
              ].map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{row.feature}</td>
                  <td className="px-4 py-3 text-center text-sm font-medium text-cyan-600">
                    {row.layer}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-500">{row.evm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
