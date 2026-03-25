'use client';

import { MultiChainAggregation, MultiChainPrice } from '@/lib/oracles/tellor';
import { useTranslations } from '@/i18n';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Globe, Link2, Clock, TrendingUp } from 'lucide-react';

interface TellorMultiChainAggregationPanelProps {
  data: MultiChainAggregation;
}

export function TellorMultiChainAggregationPanel({ data }: TellorMultiChainAggregationPanelProps) {
  const t = useTranslations();

  const getChainLabel = (chain: string) => {
    return chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.97) return 'bg-success-100 text-success-700';
    if (confidence >= 0.95) return 'bg-warning-100 text-warning-700';
    return 'bg-warning-100 text-orange-700';
  };

  const getDeviationColor = (deviation: number) => {
    if (deviation <= 0.1) return 'text-success-600';
    if (deviation <= 0.5) return 'text-warning-600';
    return 'text-danger-600';
  };

  const chainCount = data.chainPrices.length;
  const avgLatency = data.chainPrices.reduce((sum, p) => sum + p.latency, 0) / (chainCount || 1);

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
            <p className="text-xl font-bold text-gray-900">{chainCount}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary-600" />
              <p className="text-xs text-gray-500">{t('tellor.multiChain.consensus')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{data.consensusMethod}</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-warning-600" />
              <p className="text-xs text-gray-500">{t('tellor.multiChain.avgLatency')}</p>
            </div>
            <p className="text-xl font-bold text-gray-900">{avgLatency.toFixed(0)}ms</p>
          </div>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-success-600" />
              <p className="text-xs text-gray-500">{t('tellor.multiChain.priceDeviation')}</p>
            </div>
            <p className={`text-xl font-bold ${getDeviationColor(data.priceDeviation)}`}>
              {data.priceDeviation.toFixed(2)}%
            </p>
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
                          style={{ width: `${chain.confidence * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-700">
                        {(chain.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-900">{chain.latency}ms</td>
                  <td className="py-2 px-3 text-gray-500">
                    {new Date(chain.timestamp).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* Aggregation Info */}
      <DashboardCard title={t('tellor.multiChain.aggregationInfo')}>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">{data.aggregatedPrice.toFixed(4)}</p>
              <p className="text-xs text-gray-500">{t('tellor.multiChain.aggregatedPrice')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">{data.maxDeviation.toFixed(2)}%</p>
              <p className="text-xs text-gray-500">{t('tellor.multiChain.maxDeviation')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-600">
                {new Date(data.lastUpdated).toLocaleTimeString()}
              </p>
              <p className="text-xs text-gray-500">{t('tellor.multiChain.lastUpdated')}</p>
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

export { TellorMultiChainAggregationPanel as TellarMultiChainAggregationPanel };
