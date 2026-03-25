'use client';

import { useTranslations } from '@/i18n';
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

  const totalRequests = chains.reduce((sum, chain) => sum + chain.requestCount24h, 0);

  return (
    <div className="space-y-8">
      {/* Stats Section - Inline Layout */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center gap-3">
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-500">{stat.label}</p>
                {stat.change && (
                  <span className="text-xs font-medium text-emerald-600">{stat.change}</span>
                )}
              </div>
            </div>
            {index < stats.length - 1 && (
              <div className="hidden sm:block w-px h-10 bg-gray-200 ml-4" />
            )}
          </div>
        ))}
      </div>

      {/* Chain List Section */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t('bandProtocol.crossChain.supportedChains')}
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  {t('bandProtocol.crossChain.chain')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  {t('bandProtocol.crossChain.chainId')}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  {t('bandProtocol.crossChain.requests24h')}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  {t('bandProtocol.crossChain.requests7d')}
                </th>
                <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                  {t('bandProtocol.crossChain.avgGasCost')}
                </th>
                <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                  {t('bandProtocol.crossChain.supportedAssets')}
                </th>
              </tr>
            </thead>
            <tbody>
              {chains.map((chain, idx) => (
                <tr
                  key={chain.chainId}
                  className={`${idx !== chains.length - 1 ? 'border-b border-gray-100' : ''} hover:bg-gray-50/50`}
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span>{getChainIcon(chain.chainName)}</span>
                      <span className="font-medium text-gray-900">{chain.chainName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-gray-500 font-mono text-xs">{chain.chainId}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900">
                    {chain.requestCount24h.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900">
                    {chain.requestCount7d.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-900">
                    {chain.avgGasCost.toFixed(4)} BAND
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {chain.supportedSymbols.slice(0, 4).map((symbol) => (
                        <span
                          key={symbol}
                          className="inline-flex items-center px-1.5 py-0.5 text-xs text-gray-600 bg-gray-100 rounded"
                        >
                          {symbol}
                        </span>
                      ))}
                      {chain.supportedSymbols.length > 4 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-xs text-gray-400">
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

      {/* Request Distribution - Progress Bars */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          {t('bandProtocol.crossChain.requestDistribution')}
        </h3>
        <div className="space-y-3">
          {chains
            .sort((a, b) => b.requestCount24h - a.requestCount24h)
            .map((chain) => {
              const percentage = totalRequests > 0 ? (chain.requestCount24h / totalRequests) * 100 : 0;
              return (
                <div key={chain.chainId} className="flex items-center gap-4">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <span>{getChainIcon(chain.chainName)}</span>
                    <span className="text-sm text-gray-700 truncate">{chain.chainName}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="text-sm font-medium text-gray-900">
                      {chain.requestCount24h.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
