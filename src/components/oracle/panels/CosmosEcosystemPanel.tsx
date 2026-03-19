'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardCard, MetricCard } from '@/components/oracle/common/DashboardCard';
import { Layers, Link2, Wallet, BarChart3, Zap, Globe, Database, Shield } from 'lucide-react';

interface CosmosEcosystemPanelProps {
  client: BandProtocolClient;
}

interface IBCChain {
  name: string;
  chainId: string;
  channelId: string;
  status: 'active' | 'inactive';
  tvl: number;
  volume24h: number;
}

export function CosmosEcosystemPanel({ client }: CosmosEcosystemPanelProps) {
  const t = useTranslations();
  const [ibcChains, setIbcChains] = useState<IBCChain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mockIBCChains: IBCChain[] = [
      {
        name: 'Cosmos Hub',
        chainId: 'cosmoshub-4',
        channelId: 'channel-0',
        status: 'active',
        tvl: 2500000000,
        volume24h: 150000000,
      },
      {
        name: 'Osmosis',
        chainId: 'osmosis-1',
        channelId: 'channel-1',
        status: 'active',
        tvl: 1800000000,
        volume24h: 280000000,
      },
      {
        name: 'Juno',
        chainId: 'juno-1',
        channelId: 'channel-2',
        status: 'active',
        tvl: 120000000,
        volume24h: 8500000,
      },
      {
        name: 'Stargaze',
        chainId: 'stargaze-1',
        channelId: 'channel-3',
        status: 'active',
        tvl: 85000000,
        volume24h: 5200000,
      },
      {
        name: 'Akash',
        chainId: 'akashnet-2',
        channelId: 'channel-4',
        status: 'active',
        tvl: 65000000,
        volume24h: 3200000,
      },
      {
        name: 'Persistence',
        chainId: 'core-1',
        channelId: 'channel-5',
        status: 'active',
        tvl: 45000000,
        volume24h: 2100000,
      },
    ];

    setIbcChains(mockIBCChains);
    setLoading(false);
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

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    }
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const totalTVL = ibcChains.reduce((sum, chain) => sum + chain.tvl, 0);
  const totalVolume24h = ibcChains.reduce((sum, chain) => sum + chain.volume24h, 0);
  const activeChains = ibcChains.filter((c) => c.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Cosmos Ecosystem Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('bandProtocol.ecosystem.cosmosSdkVersion')}
          value="v0.47"
          subValue={t('bandProtocol.ecosystem.cosmosSdk')}
          icon={<Layers className="w-4 h-4" />}
        />
        <MetricCard
          label={t('bandProtocol.ecosystem.ibcConnections')}
          value={activeChains.toString()}
          subValue={t('bandProtocol.ecosystem.activeIBCChannels')}
          icon={<Link2 className="w-4 h-4" />}
        />
        <MetricCard
          label={t('bandProtocol.ecosystem.totalIBCTVL')}
          value={formatCurrency(totalTVL)}
          subValue={`↑ 8.5% ${t('bandProtocol.ecosystem.totalValueLocked')}`}
          icon={<Wallet className="w-4 h-4" />}
        />
        <MetricCard
          label={t('bandProtocol.ecosystem.ibcVolume24h')}
          value={formatCurrency(totalVolume24h)}
          subValue={`↑ 12.3% ${t('bandProtocol.ecosystem.volumeChange')}`}
          icon={<BarChart3 className="w-4 h-4" />}
        />
      </div>

      {/* IBC Connections */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {t('bandProtocol.ecosystem.ibcConnections')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.ecosystem.chainName')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.ecosystem.chainId')}
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.ecosystem.channelId')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.ecosystem.tvl')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.ecosystem.volume24h')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    {t('bandProtocol.ecosystem.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ibcChains.map((chain, index) => (
                  <tr
                    key={chain.chainId}
                    className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                  >
                    <td className="py-3 px-4">
                      <span className="font-medium text-gray-900">{chain.name}</span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{chain.chainId}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{chain.channelId}</td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatCurrency(chain.tvl)}
                    </td>
                    <td className="text-right py-3 px-4 text-sm text-gray-600">
                      {formatCurrency(chain.volume24h)}
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium ${
                          chain.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {chain.status === 'active' ? '●' : '○'} {t('bandProtocol.ecosystem.active')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Band in Cosmos Ecosystem */}
      <DashboardCard title={t('bandProtocol.ecosystem.bandInCosmos')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">{t('bandProtocol.ecosystem.keyFeatures')}</h4>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span className="text-sm text-gray-600">{t('bandProtocol.ecosystem.feature1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span className="text-sm text-gray-600">{t('bandProtocol.ecosystem.feature2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span className="text-sm text-gray-600">{t('bandProtocol.ecosystem.feature3')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span className="text-sm text-gray-600">{t('bandProtocol.ecosystem.feature4')}</span>
              </li>
            </ul>
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">{t('bandProtocol.ecosystem.integrations')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50">
                <p className="text-lg font-semibold text-gray-900">25+</p>
                <p className="text-xs text-gray-500">{t('bandProtocol.ecosystem.dApps')}</p>
              </div>
              <div className="p-3 bg-gray-50">
                <p className="text-lg font-semibold text-gray-900">8</p>
                <p className="text-xs text-gray-500">{t('bandProtocol.ecosystem.blockchains')}</p>
              </div>
              <div className="p-3 bg-gray-50">
                <p className="text-lg font-semibold text-gray-900">180+</p>
                <p className="text-xs text-gray-500">{t('bandProtocol.ecosystem.dataFeeds')}</p>
              </div>
              <div className="p-3 bg-gray-50">
                <p className="text-lg font-semibold text-gray-900">$850M+</p>
                <p className="text-xs text-gray-500">{t('bandProtocol.ecosystem.tvlSecured')}</p>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Ecosystem Stats */}
      <DashboardCard title={t('bandProtocol.ecosystem.ecosystemStats')}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('bandProtocol.ecosystem.blockTime')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">~2.8s</p>
            <p className="text-sm text-purple-600 mt-1">{t('bandProtocol.ecosystem.fastFinality')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('bandProtocol.ecosystem.interoperability')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">IBC</p>
            <p className="text-sm text-purple-600 mt-1">{t('bandProtocol.ecosystem.nativeIBC')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('bandProtocol.ecosystem.dataSources')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">200+</p>
            <p className="text-sm text-purple-600 mt-1">{t('bandProtocol.ecosystem.priceFeeds')}</p>
          </div>
          <div className="p-4 bg-purple-50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-purple-700" />
              <h4 className="font-medium text-purple-900">{t('bandProtocol.ecosystem.security')}</h4>
            </div>
            <p className="text-2xl font-bold text-purple-700">Tendermint</p>
            <p className="text-sm text-purple-600 mt-1">{t('bandProtocol.ecosystem.bftConsensus')}</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
