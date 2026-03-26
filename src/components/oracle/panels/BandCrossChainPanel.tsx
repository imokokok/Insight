'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from '@/i18n';
import { BandProtocolClient, CrossChainStats } from '@/lib/oracles/bandProtocol';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { DashboardCard, MetricCard } from '@/components/oracle/data-display/DashboardCard';
import { Activity, TrendingUp, Globe, Zap, Layers, Clock } from 'lucide-react';

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
          <div key={i} className="h-24 bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <DashboardCard>
        <p className="text-gray-500 text-center">{t('bandProtocol.crossChain.failedToLoad')}</p>
      </DashboardCard>
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
        <MetricCard
          label={t('bandProtocol.crossChain.totalRequests24h')}
          value={formatNumber(stats.totalRequests24h)}
          subValue={`↑ 12.5% ${t('bandProtocol.crossChain.last24Hours')}`}
          icon={<Activity className="w-4 h-4" />}
        />
        <MetricCard
          label={t('bandProtocol.crossChain.totalRequests7d')}
          value={formatNumber(stats.totalRequests7d)}
          subValue={`↑ 8.3% ${t('bandProtocol.crossChain.last7Days')}`}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          label={t('bandProtocol.crossChain.totalRequests30d')}
          value={formatNumber(stats.totalRequests30d)}
          subValue={`↑ 15.2% ${t('bandProtocol.crossChain.last30Days')}`}
          icon={<Globe className="w-4 h-4" />}
        />
        <MetricCard
          label={t('bandProtocol.crossChain.supportedChains')}
          value={stats.chains.length.toString()}
          subValue={t('bandProtocol.crossChain.activeChains')}
          icon={<Layers className="w-4 h-4" />}
        />
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
                            className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs"
                          >
                            {symbol}
                          </span>
                        ))}
                        {chain.supportedSymbols.length > 4 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs">
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
      <DashboardCard title={t('bandProtocol.crossChain.ibcInfo')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-700" />
              <h4 className="text-sm font-medium text-purple-900">
                {t('bandProtocol.crossChain.ibcTransfers')}
              </h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {formatNumber(stats.totalRequests24h * 0.4)}
            </p>
            <p className="text-sm text-purple-600 mt-1">
              {t('bandProtocol.crossChain.transfers24h')}
            </p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-purple-700" />
              <h4 className="text-sm font-medium text-purple-900">
                {t('bandProtocol.crossChain.ibcChannels')}
              </h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">12</p>
            <p className="text-sm text-purple-600 mt-1">
              {t('bandProtocol.crossChain.activeChannels')}
            </p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-700" />
              <h4 className="text-sm font-medium text-purple-900">
                {t('bandProtocol.crossChain.avgLatency')}
              </h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">2.8s</p>
            <p className="text-sm text-purple-600 mt-1">
              {t('bandProtocol.crossChain.crossChainLatency')}
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
