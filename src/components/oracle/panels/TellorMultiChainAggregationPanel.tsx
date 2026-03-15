'use client';

import { MultiChainAggregation, MultiChainPrice } from '@/lib/oracles/tellor';
import { useI18n } from '@/lib/i18n/provider';
import { Blockchain } from '@/types/oracle';

interface TellorMultiChainAggregationPanelProps {
  data: MultiChainAggregation;
}

export function TellorMultiChainAggregationPanel({ data }: TellorMultiChainAggregationPanelProps) {
  const { t } = useI18n();

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
    <div className="py-4 border-b border-gray-100">
      <h3 className="text-sm font-semibold mb-3">{t('tellor.multiChain.title')}</h3>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.multiChain.symbol')}</p>
            <p className="text-lg font-bold text-cyan-600">{data.symbol}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.multiChain.aggregatedPrice')}</p>
            <p className="text-lg font-bold text-cyan-600">${data.aggregatedPrice.toFixed(4)}</p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.multiChain.deviation')}</p>
            <p className={`text-lg font-bold ${getDeviationColor(data.priceDeviation)}`}>
              {data.priceDeviation.toFixed(4)}%
            </p>
          </div>
          <div className="py-2">
            <p className="text-xs text-gray-600 mb-1">{t('tellor.multiChain.maxDeviation')}</p>
            <p className={`text-lg font-bold ${getDeviationColor(data.maxDeviation)}`}>
              {data.maxDeviation.toFixed(4)}%
            </p>
          </div>
        </div>

        <div className="py-4 border-b border-gray-100">
          <p className="text-xs text-gray-600 mb-1">{t('tellor.multiChain.consensusMethod')}</p>
          <p className="text-sm font-medium text-gray-900">{data.consensusMethod}</p>
        </div>

        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-3">
            {t('tellor.multiChain.chainPrices')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.chainPrices.map((chainPrice: MultiChainPrice) => (
              <div
                key={chainPrice.chain}
                className="py-4 border-b border-gray-100"
              >
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-gray-900">
                    {getChainLabel(chainPrice.chain)}
                  </h5>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-md ${getConfidenceColor(
                      chainPrice.confidence
                    )}`}
                  >
                    {(chainPrice.confidence * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('tellor.multiChain.price')}</span>
                    <span className="font-medium text-gray-900">
                      ${chainPrice.price.toFixed(4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('tellor.multiChain.latency')}</span>
                    <span className="font-medium text-gray-900">{chainPrice.latency}ms</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{t('tellor.multiChain.lastUpdate')}</span>
                    <span className="font-medium text-gray-900">
                      {new Date(chainPrice.timestamp).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export { TellorMultiChainAggregationPanel as TellarMultiChainAggregationPanel };
