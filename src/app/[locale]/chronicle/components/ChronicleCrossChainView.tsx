'use client';

import { useState, useMemo } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Fuel,
  Link2,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export interface ChainPriceData {
  chain: string;
  chainId: number;
  price: number;
  deviation: number;
  lastUpdate: string;
  status: 'active' | 'warning' | 'inactive';
  confirmations: number;
}

export interface ChainLatencyData {
  chain: string;
  avgBlockTime: number;
  finalityTime: number;
  gasPrice: number;
  gasPriceUnit: string;
}

export interface BridgeStatusData {
  bridge: string;
  sourceChain: string;
  targetChain: string;
  totalTransactions: number;
  avgDelay: number;
  status: 'healthy' | 'degraded' | 'down';
  lastUpdate: string;
}

export interface CrossChainData {
  prices: ChainPriceData[];
  latencies: ChainLatencyData[];
  bridges: BridgeStatusData[];
  medianPrice: number;
}

export interface ChronicleCrossChainViewProps {
  crossChainData: CrossChainData | null;
  isLoading: boolean;
}

type SortKey = 'chain' | 'price' | 'deviation' | 'lastUpdate';

const CHAIN_ICONS: Record<string, string> = {
  Ethereum: '⟠',
  Arbitrum: '🔷',
  Optimism: '🔴',
  Polygon: '🟣',
  Base: '🔵',
  Avalanche: '🔺',
};

function getDeviationColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-100 text-emerald-700';
  if (absDeviation < 0.5) return 'bg-yellow-100 text-yellow-700';
  if (absDeviation < 1) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function getDeviationBarColor(deviation: number): string {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-500';
  if (absDeviation < 0.5) return 'bg-yellow-500';
  if (absDeviation < 1) return 'bg-orange-500';
  return 'bg-red-500';
}

function getBridgeStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return 'text-emerald-600';
    case 'degraded':
      return 'text-yellow-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

function getBridgeStatusBg(status: string): string {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-100';
    case 'degraded':
      return 'bg-yellow-100';
    case 'down':
      return 'bg-red-100';
    default:
      return 'bg-gray-100';
  }
}

const MOCK_DATA: CrossChainData = {
  medianPrice: 2650.45,
  prices: [
    {
      chain: 'Ethereum',
      chainId: 1,
      price: 2650.45,
      deviation: 0,
      lastUpdate: '2s ago',
      status: 'active',
      confirmations: 12,
    },
    {
      chain: 'Arbitrum',
      chainId: 42161,
      price: 2650.12,
      deviation: -0.012,
      lastUpdate: '5s ago',
      status: 'active',
      confirmations: 1,
    },
    {
      chain: 'Optimism',
      chainId: 10,
      price: 2651.2,
      deviation: 0.028,
      lastUpdate: '3s ago',
      status: 'active',
      confirmations: 1,
    },
    {
      chain: 'Polygon',
      chainId: 137,
      price: 2648.9,
      deviation: -0.058,
      lastUpdate: '8s ago',
      status: 'active',
      confirmations: 128,
    },
    {
      chain: 'Base',
      chainId: 8453,
      price: 2652.8,
      deviation: 0.088,
      lastUpdate: '4s ago',
      status: 'active',
      confirmations: 1,
    },
    {
      chain: 'Avalanche',
      chainId: 43114,
      price: 2645.3,
      deviation: -0.194,
      lastUpdate: '6s ago',
      status: 'warning',
      confirmations: 1,
    },
  ],
  latencies: [
    { chain: 'Ethereum', avgBlockTime: 12, finalityTime: 900, gasPrice: 35, gasPriceUnit: 'Gwei' },
    {
      chain: 'Arbitrum',
      avgBlockTime: 0.25,
      finalityTime: 600,
      gasPrice: 0.1,
      gasPriceUnit: 'Gwei',
    },
    { chain: 'Optimism', avgBlockTime: 2, finalityTime: 300, gasPrice: 0.001, gasPriceUnit: 'ETH' },
    { chain: 'Polygon', avgBlockTime: 2.1, finalityTime: 120, gasPrice: 30, gasPriceUnit: 'Gwei' },
    { chain: 'Base', avgBlockTime: 2, finalityTime: 300, gasPrice: 0.001, gasPriceUnit: 'ETH' },
    { chain: 'Avalanche', avgBlockTime: 2, finalityTime: 1, gasPrice: 25, gasPriceUnit: 'nAVAX' },
  ],
  bridges: [
    {
      bridge: 'Arbitrum Bridge',
      sourceChain: 'Ethereum',
      targetChain: 'Arbitrum',
      totalTransactions: 1250000,
      avgDelay: 10,
      status: 'healthy',
      lastUpdate: '1m ago',
    },
    {
      bridge: 'Optimism Bridge',
      sourceChain: 'Ethereum',
      targetChain: 'Optimism',
      totalTransactions: 980000,
      avgDelay: 20,
      status: 'healthy',
      lastUpdate: '30s ago',
    },
    {
      bridge: 'Polygon PoS',
      sourceChain: 'Ethereum',
      targetChain: 'Polygon',
      totalTransactions: 2100000,
      avgDelay: 180,
      status: 'healthy',
      lastUpdate: '2m ago',
    },
    {
      bridge: 'Base Bridge',
      sourceChain: 'Ethereum',
      targetChain: 'Base',
      totalTransactions: 450000,
      avgDelay: 20,
      status: 'healthy',
      lastUpdate: '1m ago',
    },
    {
      bridge: 'Avalanche Bridge',
      sourceChain: 'Ethereum',
      targetChain: 'Avalanche',
      totalTransactions: 720000,
      avgDelay: 300,
      status: 'degraded',
      lastUpdate: '5m ago',
    },
  ],
};

export function ChronicleCrossChainView({
  crossChainData,
  isLoading,
}: ChronicleCrossChainViewProps) {
  const t = useTranslations();
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'deviation',
    direction: 'desc',
  });

  const data = crossChainData || MOCK_DATA;

  const sortedPrices = useMemo(() => {
    const sorted = [...data.prices];
    sorted.sort((a, b) => {
      let aValue: string | number = a[sortConfig.key];
      let bValue: string | number = b[sortConfig.key];
      if (sortConfig.key === 'lastUpdate') {
        aValue = a.lastUpdate;
        bValue = b.lastUpdate;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return 0;
    });
    return sorted;
  }, [data.prices, sortConfig]);

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-64 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-gray-100 rounded-lg" />
        <div className="h-48 bg-gray-100 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 多链价格对比表格 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">
            {t('chronicle.crossChain.priceComparison') || 'Cross-Chain Price Comparison'}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{t('chronicle.crossChain.medianPrice') || 'Median'}:</span>
            <span className="font-medium text-gray-900">${data.medianPrice.toLocaleString()}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  {t('chronicle.crossChain.chain') || 'Chain'}
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('price')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('chronicle.crossChain.price') || 'Price'}</span>
                    <SortIcon columnKey="price" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('deviation')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('chronicle.crossChain.deviation') || 'Deviation'}</span>
                    <SortIcon columnKey="deviation" />
                  </div>
                </th>
                <th
                  className="text-right py-3 px-4 text-sm font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                  onClick={() => handleSort('lastUpdate')}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{t('chronicle.crossChain.lastUpdate') || 'Last Update'}</span>
                    <SortIcon columnKey="lastUpdate" />
                  </div>
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  {t('chronicle.crossChain.status') || 'Status'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPrices.map((item, index) => (
                <tr
                  key={item.chain}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CHAIN_ICONS[item.chain] || '⛓️'}</span>
                      <span className="font-medium text-gray-900">{item.chain}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-gray-900">
                    $
                    {item.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-sm font-medium ${getDeviationColor(item.deviation)}`}
                    >
                      {item.deviation >= 0 ? '+' : ''}
                      {item.deviation.toFixed(3)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-sm text-gray-500">{item.lastUpdate}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.status === 'active' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                      ) : item.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-600 capitalize">{item.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 价格偏差热力图 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.crossChain.deviationHeatmap') || 'Price Deviation Heatmap'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {data.prices.map((item) => (
            <div
              key={item.chain}
              className="relative p-4 rounded-lg border border-gray-200 bg-white overflow-hidden"
            >
              <div
                className={`absolute inset-0 opacity-10 ${getDeviationBarColor(item.deviation)}`}
                style={{
                  width: `${Math.min(Math.abs(item.deviation) * 100, 100)}%`,
                  height: '100%',
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-lg">{CHAIN_ICONS[item.chain] || '⛓️'}</span>
                  <span className="text-sm font-medium text-gray-700">{item.chain}</span>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-gray-900">
                    $
                    {item.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div
                    className={`text-sm font-medium ${getDeviationColor(item.deviation).split(' ')[1]}`}
                  >
                    {item.deviation >= 0 ? '+' : ''}
                    {item.deviation.toFixed(3)}%
                  </div>
                </div>
                <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${getDeviationBarColor(item.deviation)}`}
                    style={{ width: `${Math.min(Math.abs(item.deviation) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span>{'< 0.1%'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>0.1% - 0.5%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>0.5% - 1%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>{'> 1%'}</span>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 链上延迟分析 & Gas 费用对比 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 链上延迟分析 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-medium text-gray-900">
              {t('chronicle.crossChain.latencyAnalysis') || 'On-Chain Latency Analysis'}
            </h3>
          </div>
          <div className="space-y-4">
            {data.latencies.map((item) => (
              <div
                key={item.chain}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CHAIN_ICONS[item.chain] || '⛓️'}</span>
                  <span className="font-medium text-gray-900">{item.chain}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="text-gray-500">
                      {t('chronicle.crossChain.blockTime') || 'Block Time'}
                    </p>
                    <p className="font-medium text-gray-900">{item.avgBlockTime}s</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">
                      {t('chronicle.crossChain.finality') || 'Finality'}
                    </p>
                    <p className="font-medium text-gray-900">{item.finalityTime}s</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gas 费用对比 */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Fuel className="w-5 h-5 text-gray-500" />
            <h3 className="text-base font-medium text-gray-900">
              {t('chronicle.crossChain.gasComparison') || 'Gas Fee Comparison'}
            </h3>
          </div>
          <div className="space-y-4">
            {data.latencies.map((item) => {
              const maxGas = Math.max(...data.latencies.map((l) => l.gasPrice));
              const percentage = (item.gasPrice / maxGas) * 100;
              return (
                <div key={item.chain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{CHAIN_ICONS[item.chain] || '⛓️'}</span>
                      <span className="text-sm font-medium text-gray-900">{item.chain}</span>
                    </div>
                    <span className="text-sm font-mono text-gray-900">
                      {item.gasPrice} {item.gasPriceUnit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 跨链桥状态 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-5 h-5 text-gray-500" />
          <h3 className="text-base font-medium text-gray-900">
            {t('chronicle.crossChain.bridgeStatus') || 'Cross-Chain Bridge Status'}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.bridges.map((bridge) => (
            <div key={bridge.bridge} className="p-4 border border-gray-200 rounded-lg bg-white">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{bridge.bridge}</h4>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {bridge.sourceChain} → {bridge.targetChain}
                  </p>
                </div>
                <div className={`p-1.5 rounded-full ${getBridgeStatusBg(bridge.status)}`}>
                  {bridge.status === 'healthy' ? (
                    <Shield className={`w-4 h-4 ${getBridgeStatusColor(bridge.status)}`} />
                  ) : bridge.status === 'degraded' ? (
                    <AlertTriangle className={`w-4 h-4 ${getBridgeStatusColor(bridge.status)}`} />
                  ) : (
                    <XCircle className={`w-4 h-4 ${getBridgeStatusColor(bridge.status)}`} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">
                    {t('chronicle.crossChain.totalTxns') || 'Total Txns'}
                  </p>
                  <p className="font-medium text-gray-900">
                    {bridge.totalTransactions.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">
                    {t('chronicle.crossChain.avgDelay') || 'Avg Delay'}
                  </p>
                  <p className="font-medium text-gray-900">{bridge.avgDelay}s</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span className="capitalize">{bridge.status}</span>
                </div>
                <span>{bridge.lastUpdate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-500 mb-1">
            {t('chronicle.crossChain.activeChains') || 'Active Chains'}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {data.prices.filter((p) => p.status === 'active').length}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">
            {t('chronicle.crossChain.maxDeviation') || 'Max Deviation'}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {Math.max(...data.prices.map((p) => Math.abs(p.deviation))).toFixed(3)}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">
            {t('chronicle.crossChain.activeBridges') || 'Active Bridges'}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {data.bridges.filter((b) => b.status === 'healthy').length}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">
            {t('chronicle.crossChain.totalBridgeTxns') || 'Total Bridge Txns'}
          </p>
          <p className="text-2xl font-semibold text-gray-900">
            {data.bridges.reduce((sum, b) => sum + b.totalTransactions, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
