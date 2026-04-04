'use client';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { useTranslations } from '@/i18n';

interface ChainPriceData {
  chain: string;
  chainId: number;
  price: number;
  deviation: number;
  deviationPercent: number;
  latency: number;
  lastUpdate: string;
  status: 'normal' | 'warning' | 'critical';
}

interface ArbitrageOpportunity {
  buyChain: string;
  sellChain: string;
  priceDiff: number;
  priceDiffPercent: number;
  estimatedProfit: string;
}

const ARBITRAGE_THRESHOLD = 0.5;

function findArbitrageOpportunities(chainData: ChainPriceData[]): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];

  for (let i = 0; i < chainData.length; i++) {
    for (let j = i + 1; j < chainData.length; j++) {
      const priceDiff = Math.abs(chainData[i].price - chainData[j].price);
      const avgPrice = (chainData[i].price + chainData[j].price) / 2;
      const priceDiffPercent = (priceDiff / avgPrice) * 100;

      if (priceDiffPercent >= ARBITRAGE_THRESHOLD) {
        const lowerChain = chainData[i].price < chainData[j].price ? chainData[i] : chainData[j];
        const higherChain = chainData[i].price < chainData[j].price ? chainData[j] : chainData[i];

        opportunities.push({
          buyChain: lowerChain.chain,
          sellChain: higherChain.chain,
          priceDiff: Number(priceDiff.toFixed(4)),
          priceDiffPercent: Number(priceDiffPercent.toFixed(3)),
          estimatedProfit: `~${(priceDiffPercent * 100).toFixed(0)} bps`,
        });
      }
    }
  }

  return opportunities.sort((a, b) => b.priceDiffPercent - a.priceDiffPercent).slice(0, 5);
}

export function CrossChainRisk() {
  const t = useTranslations();
  const chainData: ChainPriceData[] = [];
  const arbitrageOpportunities: ArbitrageOpportunity[] = [];

  const avgLatency = 0;
  const maxDeviation = 0;
  const warningCount = 0;

  const getStatusColor = (status: 'normal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'normal':
        return 'bg-success-100 text-success-700';
      case 'warning':
        return 'bg-warning-100 text-warning-700';
      case 'critical':
        return 'bg-danger-100 text-danger-700';
    }
  };

  const getStatusLabel = (status: 'normal' | 'warning' | 'critical'): string => {
    switch (status) {
      case 'normal':
        return t('crossChainRisk.status.normal');
      case 'warning':
        return t('crossChainRisk.status.warning');
      case 'critical':
        return t('crossChainRisk.status.critical');
    }
  };

  const getLatencyDescription = (latency: number): string => {
    if (latency < 100) {
      return t('crossChainRisk.latencyRisk.lowLatency');
    } else if (latency < 200) {
      return t('crossChainRisk.latencyRisk.mediumLatency');
    } else {
      return t('crossChainRisk.latencyRisk.highLatency');
    }
  };

  return (
    <DashboardCard title={t('crossChainRisk.title')}>
      <div className="space-y-6">
        {arbitrageOpportunities.length > 0 && (
          <div className="bg-warning-50 border border-yellow-200  p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-warning-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">
                  {t('crossChainRisk.arbitrageOpportunity.title')}
                </h4>
                <p className="text-sm text-warning-700 mt-1">
                  {t('crossChainRisk.arbitrageOpportunity.description', {
                    count: arbitrageOpportunities.length,
                    threshold: ARBITRAGE_THRESHOLD,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">
              {t('crossChainRisk.stats.supportedChains')}
            </p>
            <p className="text-xl font-bold text-gray-900">{chainData.length}</p>
          </div>
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">{t('crossChainRisk.stats.avgLatency')}</p>
            <p className="text-xl font-bold text-gray-900">{avgLatency}ms</p>
          </div>
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">{t('crossChainRisk.stats.maxDeviation')}</p>
            <p
              className={`text-xl font-bold ${maxDeviation >= 1 ? 'text-danger-600' : maxDeviation >= ARBITRAGE_THRESHOLD ? 'text-warning-600' : 'text-gray-900'}`}
            >
              {maxDeviation.toFixed(3)}%
            </p>
          </div>
          <div className="bg-gray-50  p-3">
            <p className="text-xs text-gray-500 mb-1">{t('crossChainRisk.stats.abnormalChains')}</p>
            <p
              className={`text-xl font-bold ${warningCount > 0 ? 'text-warning-600' : 'text-gray-900'}`}
            >
              {warningCount}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {t('crossChainRisk.priceDetails.title')}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">
                    {t('crossChainRisk.priceDetails.chain')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('crossChainRisk.priceDetails.price')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('crossChainRisk.priceDetails.deviation')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('crossChainRisk.priceDetails.latency')}
                  </th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">
                    {t('crossChainRisk.priceDetails.updateTime')}
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">
                    {t('crossChainRisk.priceDetails.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {chainData.map((chain) => (
                  <tr key={chain.chain} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{chain.chain}</span>
                        <span className="text-xs text-gray-400">#{chain.chainId || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 text-sm font-mono text-gray-900">
                      ${chain.price.toFixed(4)}
                    </td>
                    <td
                      className={`text-right py-2 px-3 text-sm font-mono ${chain.deviation >= 0 ? 'text-success-600' : 'text-danger-600'}`}
                    >
                      {chain.deviation >= 0 ? '+' : ''}
                      {chain.deviationPercent.toFixed(3)}%
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-600">
                      {chain.latency}ms
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-500">
                      {chain.lastUpdate}
                    </td>
                    <td className="text-center py-2 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium  ${getStatusColor(chain.status)}`}
                      >
                        {getStatusLabel(chain.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {arbitrageOpportunities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('crossChainRisk.arbitrage.title')}
            </h4>
            <div className="space-y-2">
              {arbitrageOpportunities.map((opp, index) => (
                <div key={index} className="bg-gray-50  p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-900">{opp.buyChain}</span>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">{opp.sellChain}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {t('crossChainRisk.arbitrage.buyToSell')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {t('crossChainRisk.arbitrage.priceDiff')}
                      </p>
                      <p className="text-sm font-medium text-warning-600">
                        {opp.priceDiffPercent.toFixed(3)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {t('crossChainRisk.arbitrage.estimatedProfit')}
                      </p>
                      <p className="text-sm font-medium text-success-600">{opp.estimatedProfit}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50  p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              {t('crossChainRisk.latencyRisk.title')}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {t('crossChainRisk.latencyRisk.avgLatency')}
                </span>
                <span className="text-sm font-medium text-gray-900">{avgLatency}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {t('crossChainRisk.latencyRisk.maxLatency')}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {chainData.length > 0 ? Math.max(...chainData.map((c) => c.latency)) : 0}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  {t('crossChainRisk.latencyRisk.minLatency')}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {chainData.length > 0 ? Math.min(...chainData.map((c) => c.latency)) : 0}ms
                </span>
              </div>
              <div className="w-full bg-gray-200  h-2 mt-2">
                <div
                  className={`h-2  ${avgLatency < 100 ? 'bg-success-500' : avgLatency < 200 ? 'bg-warning-500' : 'bg-danger-500'}`}
                  style={{ width: `${Math.min((avgLatency / 300) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{getLatencyDescription(avgLatency)}</p>
            </div>
          </div>

          <div className="bg-primary-50  p-4">
            <h4 className="text-sm font-medium text-primary-900 mb-2">
              {t('crossChainRisk.consistencyNote.title')}
            </h4>
            <ul className="text-sm text-primary-800 space-y-1">
              <li>• {t('crossChainRisk.consistencyNote.wormhole')}</li>
              <li>• {t('crossChainRisk.consistencyNote.idealCase')}</li>
              <li>
                •{' '}
                {t('crossChainRisk.consistencyNote.arbitrageThreshold', {
                  threshold: ARBITRAGE_THRESHOLD,
                })}
              </li>
              <li>• {t('crossChainRisk.consistencyNote.highLatencyRisk')}</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
