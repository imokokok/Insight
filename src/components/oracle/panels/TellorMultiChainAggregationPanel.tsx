'use client';

import { MultiChainAggregation } from '@/lib/oracles/tellor';
import { useTranslations } from 'next-intl';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Globe, Link2, Clock, TrendingUp } from 'lucide-react';

interface TellorMultiChainAggregationPanelProps {
  data: MultiChainAggregation;
}

export function TellorMultiChainAggregationPanel({ data }: TellorMultiChainAggregationPanelProps) {
  const t = useTranslations();

  const getChainLabel = (chain: Blockchain) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.97) return 'bg-green-100 text-green-700';
    if (confidence >= 0.95) return 'bg-yellow-100 text-yellow-700';
    return 'bg-orange-100 text-orange-700';
  };

  const getDeviationColor = (deviation: number) => {
    if (deviation <= 0.1) return 'text-green-600';
    if (deviation <= 0.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Aggregation Stats */}
      <DashboardCard title={t('tellor.multiChain.title')}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-cyan-600" />
              <p className="text-xs text-gray-500">{t('tellor.multiChain.chains')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.chainCount}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-500">{t('tellor.multiChain.sources')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.sourceCount}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-gray-500">{t('tellor.multiChain.avgLatency')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.averageLatency}ms</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <p className="text-xs text-gray-500">{t('tellor.multiChain.consensusRate')}</p>
            </div>
            <p className="text-xl font-bold text-green-600">{data.consensusRate}%</p>
          </div>
        </div>
      </DashboardCard>

      {/* Chain Prices */}
      <DashboardCard title={t('tellor.multiChain.chainPrices')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.multiChain.chain')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.multiChain.price')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.multiChain.confidence')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.multiChain.latency')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.multiChain.sources')}
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                  {t('tellor.multiChain.lastUpdate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.chainPrices.map((chain, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-cyan-600" />
                      <span className="font-medium text-gray-900 capitalize">{chain.chain}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-900">${chain.price.toFixed(4)}</td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${chain.confidence}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">{chain.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-900">{chain.latency}ms</td>
                  <td className="py-2 px-3 text-gray-900">{chain.sourceCount}</td>
                  <td className="py-2 px-3 text-gray-500">
                    {new Date(chain.lastUpdate).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* Aggregation Method */}
      <DashboardCard title={t('tellor.multiChain.aggregationMethod')}>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 leading-relaxed">{data.aggregationMethod}</p>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">{data.outlierThreshold}%</p>
              <p className="text-xs text-gray-500">{t('tellor.multiChain.outlierThreshold')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">{data.minSources}</p>
              <p className="text-xs text-gray-500">{t('tellor.multiChain.minSources')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">{data.updateInterval}s</p>
              <p className="text-xs text-gray-500">{t('tellor.multiChain.updateInterval')}</p>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

export { TellorMultiChainAggregationPanel as TellarMultiChainAggregationPanel };
