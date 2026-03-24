'use client';

import { useTranslations } from 'next-intl';
import { BandProtocolCrossChainViewProps } from '../types';

export function BandProtocolCrossChainView({
  crossChainStats,
  isLoading,
}: BandProtocolCrossChainViewProps) {
  const t = useTranslations();

  const stats = crossChainStats
    ? [
        {
          label: t('bandProtocol.crossChain.totalRequests24h'),
          value: crossChainStats.totalRequests24h.toLocaleString(),
          change: '+12%',
        },
        {
          label: t('bandProtocol.crossChain.totalRequests7d'),
          value: crossChainStats.totalRequests7d.toLocaleString(),
          change: '+8%',
        },
        {
          label: t('bandProtocol.crossChain.totalRequests30d'),
          value: crossChainStats.totalRequests30d.toLocaleString(),
          change: '+15%',
        },
        {
          label: t('bandProtocol.crossChain.supportedChains'),
          value: crossChainStats.chains.length.toString(),
          change: null,
        },
      ]
    : [
        { label: t('bandProtocol.crossChain.totalRequests24h'), value: '12,500', change: '+12%' },
        { label: t('bandProtocol.crossChain.totalRequests7d'), value: '87,500', change: '+8%' },
        { label: t('bandProtocol.crossChain.totalRequests30d'), value: '375,000', change: '+15%' },
        { label: t('bandProtocol.crossChain.supportedChains'), value: '8', change: null },
      ];

  const chains = crossChainStats?.chains || [
    {
      chainName: 'Cosmos Hub',
      chainId: 'cosmoshub-4',
      requestCount24h: 1500,
      requestCount7d: 10000,
      requestCount30d: 45000,
      avgGasCost: 0.0025,
      supportedSymbols: ['ATOM', 'OSMO', 'JUNO', 'STARS'],
    },
    {
      chainName: 'Osmosis',
      chainId: 'osmosis-1',
      requestCount24h: 2000,
      requestCount7d: 14000,
      requestCount30d: 60000,
      avgGasCost: 0.003,
      supportedSymbols: ['OSMO', 'ATOM', 'USDC', 'WBTC'],
    },
    {
      chainName: 'Ethereum',
      chainId: '1',
      requestCount24h: 3000,
      requestCount7d: 21000,
      requestCount30d: 90000,
      avgGasCost: 0.005,
      supportedSymbols: ['ETH', 'USDC', 'USDT', 'WBTC', 'DAI'],
    },
    {
      chainName: 'Polygon',
      chainId: '137',
      requestCount24h: 1200,
      requestCount7d: 8400,
      requestCount30d: 36000,
      avgGasCost: 0.001,
      supportedSymbols: ['MATIC', 'USDC', 'USDT', 'WETH'],
    },
    {
      chainName: 'Avalanche',
      chainId: '43114',
      requestCount24h: 800,
      requestCount7d: 5600,
      requestCount30d: 24000,
      avgGasCost: 0.0015,
      supportedSymbols: ['AVAX', 'USDC', 'USDT', 'BTC.b'],
    },
    {
      chainName: 'Fantom',
      chainId: '250',
      requestCount24h: 600,
      requestCount7d: 4200,
      requestCount30d: 18000,
      avgGasCost: 0.0012,
      supportedSymbols: ['FTM', 'USDC', 'USDT', 'WETH'],
    },
    {
      chainName: 'Cronos',
      chainId: '25',
      requestCount24h: 400,
      requestCount7d: 2800,
      requestCount30d: 12000,
      avgGasCost: 0.001,
      supportedSymbols: ['CRO', 'USDC', 'USDT', 'WBTC'],
    },
    {
      chainName: 'Juno',
      chainId: 'juno-1',
      requestCount24h: 300,
      requestCount7d: 2100,
      requestCount30d: 9000,
      avgGasCost: 0.002,
      supportedSymbols: ['JUNO', 'ATOM', 'OSMO', 'STARS'],
    },
  ];

  const getChainIcon = (chainName: string) => {
    const iconMap: Record<string, string> = {
      'Cosmos Hub': '⚛️',
      Osmosis: '🌊',
      Ethereum: '🔷',
      Polygon: '💜',
      Avalanche: '⛰️',
      Fantom: '👻',
      Cronos: '🦁',
      Juno: '🚀',
    };
    return iconMap[chainName] || '🔗';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              {stat.change && (
                <span className="text-sm font-medium text-emerald-600">{stat.change}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('bandProtocol.crossChain.supportedChains')}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.crossChain.chain')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.crossChain.chainId')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.crossChain.requests24h')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.crossChain.requests7d')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.crossChain.avgGasCost')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('bandProtocol.crossChain.supportedAssets')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chains.map((chain) => (
                <tr key={chain.chainId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getChainIcon(chain.chainName)}</span>
                      <span className="text-sm font-medium text-gray-900">{chain.chainName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500 font-mono">{chain.chainId}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {chain.requestCount24h.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {chain.requestCount7d.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm text-gray-900">
                      {chain.avgGasCost.toFixed(4)} BAND
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {chain.supportedSymbols.slice(0, 4).map((symbol) => (
                        <span
                          key={symbol}
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded"
                        >
                          {symbol}
                        </span>
                      ))}
                      {chain.supportedSymbols.length > 4 && (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-gray-500">
                          +{chain.supportedSymbols.length - 4}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('bandProtocol.crossChain.requestDistribution')}
          </h3>
          <div className="space-y-3">
            {chains.slice(0, 5).map((chain) => {
              const maxRequests = Math.max(...chains.map((c) => c.requestCount24h));
              const percentage = (chain.requestCount24h / maxRequests) * 100;
              return (
                <div key={chain.chainId}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{chain.chainName}</span>
                    <span className="font-medium">{chain.requestCount24h.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('bandProtocol.crossChain.cosmosEcosystem')}
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚛️</span>
                <span className="font-medium text-gray-900">Cosmos SDK Native</span>
              </div>
              <p className="text-sm text-gray-600">
                {t('bandProtocol.crossChain.cosmosDescription')}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🔗</span>
                <span className="font-medium text-gray-900">IBC Protocol</span>
              </div>
              <p className="text-sm text-gray-600">
                {t('bandProtocol.crossChain.ibcDescription')}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">⚡</span>
                <span className="font-medium text-gray-900">Fast Finality</span>
              </div>
              <p className="text-sm text-gray-600">
                {t('bandProtocol.crossChain.finalityDescription')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
