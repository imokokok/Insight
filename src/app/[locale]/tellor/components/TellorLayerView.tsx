'use client';

import {
  Layers,
  Globe,
  ArrowRightLeft,
  Box,
  Users,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Database,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  Timer,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

import { type TellorLayerViewProps } from '../types';

const layerOverviewData = {
  chainName: 'Tellor Layer',
  chainId: 'tellor-1',
  blockHeight: 12458932,
  validators: 128,
  avgBlockTime: 6.5,
  consensus: 'Tendermint',
};

const chainMetrics = [
  {
    label: 'tellorLayer.metrics.activeValidators',
    value: '118',
    change: '+2',
    trend: 'up',
    icon: Users,
  },
  {
    label: 'tellorLayer.metrics.onlineRate',
    value: '99.8%',
    change: '+0.2%',
    trend: 'up',
    icon: CheckCircle,
  },
  {
    label: 'tellorLayer.metrics.throughput',
    value: '1,250',
    change: '+8%',
    trend: 'up',
    icon: Zap,
    suffix: 'tps',
  },
  {
    label: 'tellorLayer.metrics.trbStaked',
    value: '2.85M',
    change: '+5.2%',
    trend: 'up',
    icon: Activity,
  },
];

const bridgeStats = {
  ethToLayer: {
    volume: '$45.2M',
    transactions: 12458,
    pendingTx: 12,
  },
  layerToEth: {
    volume: '$38.7M',
    transactions: 9823,
    pendingTx: 8,
  },
  avgBridgeTime: '12 min',
  bridgeFee: '0.1%',
};

const bridgeHistory = [
  { time: '12:45', ethToLayer: 125, layerToEth: 85 },
  { time: '13:00', ethToLayer: 180, layerToEth: 120 },
  { time: '13:15', ethToLayer: 95, layerToEth: 150 },
  { time: '13:30', ethToLayer: 220, layerToEth: 180 },
  { time: '13:45', ethToLayer: 165, layerToEth: 95 },
  { time: '14:00', ethToLayer: 280, layerToEth: 210 },
  { time: '14:15', ethToLayer: 195, layerToEth: 145 },
  { time: '14:30', ethToLayer: 240, layerToEth: 175 },
];

const nativeDataSources = [
  {
    id: 'spot-price',
    name: 'Spot Price',
    description: 'tellorLayer.dataSources.spotPriceDesc',
    queries: 45000,
    reporters: 85,
    status: 'active',
  },
  {
    id: 'twap',
    name: 'TWAP',
    description: 'tellorLayer.dataSources.twapDesc',
    queries: 28500,
    reporters: 62,
    status: 'active',
  },
  {
    id: 'random-number',
    name: 'Random Number',
    description: 'tellorLayer.dataSources.randomDesc',
    queries: 12800,
    reporters: 45,
    status: 'active',
  },
  {
    id: 'custom-query',
    name: 'Custom Query',
    description: 'tellorLayer.dataSources.customDesc',
    queries: 8200,
    reporters: 38,
    status: 'active',
  },
];

const dataSourceComparison = [
  {
    feature: 'tellorLayer.comparison.updateSpeed',
    layer: '~6s',
    evm: '~12s',
    advantage: 'layer',
  },
  {
    feature: 'tellorLayer.comparison.gasCost',
    layer: 'Minimal',
    evm: 'High',
    advantage: 'layer',
  },
  {
    feature: 'tellorLayer.comparison.customData',
    layer: 'tellorLayer.comparison.native',
    evm: 'tellorLayer.comparison.limited',
    advantage: 'layer',
  },
  {
    feature: 'tellorLayer.comparison.consensus',
    layer: 'Tendermint',
    evm: 'PoS',
    advantage: 'neutral',
  },
  {
    feature: 'tellorLayer.comparison.finality',
    layer: 'Instant',
    evm: '~12s',
    advantage: 'layer',
  },
];

export function TellorLayerView({ isLoading }: TellorLayerViewProps) {
  const t = useTranslations('tellor');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
          <Layers className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{layerOverviewData.chainName}</h2>
          <p className="text-sm text-gray-500">
            {t('tellorLayer.overview.chainId')}: {layerOverviewData.chainId} · {t('tellorLayer.overview.consensus')}: {layerOverviewData.consensus}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Box className="w-4 h-4" />
            <span className="text-sm">{t('tellorLayer.overview.blockHeight')}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {layerOverviewData.blockHeight.toLocaleString()}
          </p>
        </div>
        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">{t('tellorLayer.overview.validators')}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {layerOverviewData.validators}
          </p>
        </div>
        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{t('tellorLayer.overview.avgBlockTime')}</span>
          </div>
          <p className="text-3xl font-semibold text-gray-900 tracking-tight">
            {layerOverviewData.avgBlockTime}s
          </p>
        </div>
        <div className="py-2">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Globe className="w-4 h-4" />
            <span className="text-sm">{t('tellorLayer.overview.networkStatus')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-3xl font-semibold text-gray-900 tracking-tight">
              {t('tellorLayer.overview.active')}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellorLayer.metrics.title')}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {chainMetrics.map((metric, index) => {
            const Icon = metric.icon;
            const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <div key={index} className="py-2">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{t(metric.label)}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                    {metric.value}
                    {metric.suffix && (
                      <span className="text-base font-normal text-gray-500 ml-1">
                        {metric.suffix}
                      </span>
                    )}
                  </p>
                  {metric.change && (
                    <div
                      className={cn(
                        'flex items-center gap-0.5 text-sm font-medium',
                        metric.trend === 'up' ? 'text-emerald-600' : 'text-blue-600'
                      )}
                    >
                      <TrendIcon className="w-3.5 h-3.5" />
                      <span>{metric.change}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <ArrowRightLeft className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">
            {t('tellorLayer.bridge.title')}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium text-gray-900">
                  {t('tellorLayer.bridge.ethToLayer')}
                </span>
              </div>
              <span className="text-xs text-gray-500">Ethereum → Tellor Layer</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.volume')}</p>
                <p className="text-lg font-semibold text-gray-900">{bridgeStats.ethToLayer.volume}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.transactions')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {bridgeStats.ethToLayer.transactions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.pending')}</p>
                <p className="text-lg font-semibold text-amber-600">{bridgeStats.ethToLayer.pendingTx}</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">
                  {t('tellorLayer.bridge.layerToEth')}
                </span>
              </div>
              <span className="text-xs text-gray-500">Tellor Layer → Ethereum</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.volume')}</p>
                <p className="text-lg font-semibold text-gray-900">{bridgeStats.layerToEth.volume}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.transactions')}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {bridgeStats.layerToEth.transactions.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('tellorLayer.bridge.pending')}</p>
                <p className="text-lg font-semibold text-amber-600">{bridgeStats.layerToEth.pendingTx}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t('tellorLayer.bridge.avgTime')}:</span>
            <span className="text-sm font-medium text-gray-900">{bridgeStats.avgBridgeTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t('tellorLayer.bridge.fee')}:</span>
            <span className="text-sm font-medium text-gray-900">{bridgeStats.bridgeFee}</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-gray-500 mb-3">{t('tellorLayer.bridge.activityChart')}</p>
          <div className="h-32 flex items-end gap-1">
            {bridgeHistory.map((item, index) => {
              const maxValue = Math.max(...bridgeHistory.map((h) => Math.max(h.ethToLayer, h.layerToEth)));
              return (
                <div key={index} className="flex-1 flex flex-col gap-0.5">
                  <div
                    className="bg-cyan-500/60 rounded-t"
                    style={{ height: `${(item.ethToLayer / maxValue) * 100}%` }}
                  />
                  <div
                    className="bg-blue-500/60 rounded-b"
                    style={{ height: `${(item.layerToEth / maxValue) * 100}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{bridgeHistory[0].time}</span>
            <span>{bridgeHistory[bridgeHistory.length - 1].time}</span>
          </div>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500/60" />
              <span className="text-xs text-gray-500">{t('tellorLayer.bridge.ethToLayer')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500/60" />
              <span className="text-xs text-gray-500">{t('tellorLayer.bridge.layerToEth')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">
            {t('tellorLayer.dataSources.title')}
          </h3>
        </div>

        <div className="space-y-3">
          {nativeDataSources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{source.name}</span>
                  <span
                    className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                      source.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {source.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{t(source.description)}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t('tellorLayer.dataSources.queries')}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {source.queries.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{t('tellorLayer.dataSources.reporters')}</p>
                  <p className="text-sm font-semibold text-gray-900">{source.reporters}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('tellorLayer.comparison.title')}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">
                  {t('tellorLayer.comparison.feature')}
                </th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">
                  Tellor Layer
                </th>
                <th className="text-center py-3 text-sm font-medium text-gray-500">
                  EVM Chains
                </th>
              </tr>
            </thead>
            <tbody>
              {dataSourceComparison.map((row, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-600">{t(row.feature)}</td>
                  <td className="py-3 text-center">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        row.advantage === 'layer' ? 'text-emerald-600' : 'text-gray-900'
                      )}
                    >
                      {t(row.layer)}
                    </span>
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={cn(
                        'text-sm font-medium',
                        row.advantage === 'evm' ? 'text-emerald-600' : 'text-gray-900'
                      )}
                    >
                      {t(row.evm)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
