'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BandProtocolClient, CrossChainStats, ChainDataRequest } from '@/lib/oracles/bandProtocol';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface BandCrossChainPanelProps {
  client: BandProtocolClient;
}

export function BandCrossChainPanel({ client }: BandCrossChainPanelProps) {
  const t = useTranslations();
  const [stats, setStats] = useState<CrossChainStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await client.getCrossChainStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch cross-chain stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [client]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500 text-center">{t('bandProtocol.crossChain.failedToLoad')}</p>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('bandProtocol.crossChain.totalRequests24h')}
          </p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalRequests24h)}</p>
          <p className="text-xs text-green-600 mt-1">↑ 12.5% {t('bandProtocol.crossChain.last24Hours')}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('bandProtocol.crossChain.totalRequests7d')}
          </p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalRequests7d)}</p>
          <p className="text-xs text-green-600 mt-1">↑ 8.3% {t('bandProtocol.crossChain.last7Days')}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('bandProtocol.crossChain.totalRequests30d')}
          </p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalRequests30d)}</p>
          <p className="text-xs text-green-600 mt-1">↑ 15.2% {t('bandProtocol.crossChain.last30Days')}</p>
        </div>
        <div className="bg-white border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
            {t('bandProtocol.crossChain.supportedChains')}
          </p>
          <p className="text-2xl font-bold text-gray-900">{stats.chains.length}</p>
          <p className="text-xs text-gray-500 mt-1">{t('bandProtocol.crossChain.activeChains')}</p>
        </div>
      </div>

      {/* Chain Data Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {t('bandProtocol.crossChain.chainDataRequests')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.crossChain.chainName')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.crossChain.requests24h')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.crossChain.requests7d')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.crossChain.requests30d')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.crossChain.avgGasCost')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.crossChain.supportedSymbols')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.chains.map((chain, index) => (
                  <tr
                    key={chain.chainId}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{chain.chainName}</span>
                        <span className="text-xs text-gray-400">({chain.chainId})</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatNumber(chain.requestCount24h)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatNumber(chain.requestCount7d)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatNumber(chain.requestCount30d)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {chain.avgGasCost.toFixed(4)} {t('bandProtocol.crossChain.tokenBand')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {chain.supportedSymbols.slice(0, 4).map((symbol) => (
                          <span
                            key={symbol}
                            className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full"
                          >
                            {symbol}
                          </span>
                        ))}
                        {chain.supportedSymbols.length > 4 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
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
        </CardContent>
      </Card>

      {/* IBC Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('bandProtocol.crossChain.ibcInfo')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="text-sm font-medium text-purple-900 mb-2">
                {t('bandProtocol.crossChain.ibcTransfers')}
              </h4>
              <p className="text-2xl font-bold text-purple-700">
                {formatNumber(stats.totalRequests24h * 0.4)}
              </p>
              <p className="text-sm text-purple-600 mt-1">{t('bandProtocol.crossChain.transfers24h')}</p>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="text-sm font-medium text-indigo-900 mb-2">
                {t('bandProtocol.crossChain.ibcChannels')}
              </h4>
              <p className="text-2xl font-bold text-indigo-700">12</p>
              <p className="text-sm text-indigo-600 mt-1">{t('bandProtocol.crossChain.activeChannels')}</p>
            </div>
            <div className="p-4 bg-teal-50 rounded-lg">
              <h4 className="text-sm font-medium text-teal-900 mb-2">
                {t('bandProtocol.crossChain.avgLatency')}
              </h4>
              <p className="text-2xl font-bold text-teal-700">2.8s</p>
              <p className="text-sm text-teal-600 mt-1">{t('bandProtocol.crossChain.crossChainLatency')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
