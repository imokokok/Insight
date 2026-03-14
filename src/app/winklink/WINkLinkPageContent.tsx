'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { WINkLinkClient } from '@/lib/oracles/winklink';
import {
  PageHeader,
  MarketDataPanel,
  NetworkHealthPanel,
} from '@/components/oracle';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { useWINkLinkAllData } from '@/hooks/useWINkLinkData';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('WINkLinkPageContent');

type WINkLinkTab = 'market' | 'network' | 'tron' | 'staking' | 'gaming';

const TABS: { id: WINkLinkTab; labelKey: string }[] = [
  { id: 'market', labelKey: 'winklink.tabs.market' },
  { id: 'network', labelKey: 'winklink.tabs.network' },
  { id: 'tron', labelKey: 'winklink.tabs.tron' },
  { id: 'staking', labelKey: 'winklink.tabs.staking' },
  { id: 'gaming', labelKey: 'winklink.tabs.gaming' },
];

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{t('winklink.error.loadingFailed')}</h3>
        <p className="text-sm text-gray-500 text-center mb-6">{error.message || t('winklink.error.loadingFailed')}</p>
        <button
          onClick={onRetry}
          className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          {t('common.retry')}
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        <p className="text-gray-500">{t('winklink.loading')}</p>
      </div>
    </div>
  );
}

export function WINkLinkPageContent() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<WINkLinkTab>('market');

  const config = getOracleConfig(OracleProvider.WINKLINK);
  const client = useMemo(() => new WINkLinkClient(), []);

  const {
    price,
    historicalData,
    tronData,
    stakingData,
    gamingData,
    networkStats,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = useWINkLinkAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      tron: tronData,
      staking: stakingData,
      gaming: gamingData,
    },
    filename: `winklink-data-${new Date().toISOString().split('T')[0]}`,
  });

  const { isRefreshing, handleRefresh, lastUpdateTime } = useRefresh({
    onRefresh: refetchAll,
    interval: 60000,
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (isError) {
    return <ErrorFallback error={errors[0] || new Error('Unknown error')} onRetry={refetchAll} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        title={config.name}
        subtitle={t('winklink.subtitle')}
        icon={config.icon}
        onRefresh={handleRefresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
        lastUpdateTime={lastUpdateTime}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-2 p-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-pink-100 text-pink-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {activeTab === 'market' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MarketDataPanel client={client} config={config.marketData} iconBgColor={config.iconBgColor} />
              </div>
              <div>
                <NetworkHealthPanel config={config.networkData} />
              </div>
            </div>
          )}

          {activeTab === 'network' && (
            <NetworkHealthPanel config={config.networkData} />
          )}

          {activeTab === 'tron' && tronData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('winklink.tron.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.tron.totalTransactions')}</p>
                  <p className="text-2xl font-bold text-gray-900">{(tronData.networkStats.totalTransactions / 1e9).toFixed(2)}B</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.tron.tps')}</p>
                  <p className="text-2xl font-bold text-gray-900">{tronData.networkStats.tps}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.tron.totalAccounts')}</p>
                  <p className="text-2xl font-bold text-gray-900">{(tronData.networkStats.totalAccounts / 1e6).toFixed(0)}M</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.tron.dailyTransactions')}</p>
                  <p className="text-2xl font-bold text-gray-900">{(tronData.dailyTransactions / 1e6).toFixed(2)}M</p>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('winklink.tron.integratedDApps')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tronData.integratedDApps.map((dapp, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{dapp.name}</h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        dapp.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {dapp.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 capitalize mb-2">{dapp.category}</p>
                    <p className="text-sm text-gray-700">{t('winklink.tron.users')}: {dapp.users.toLocaleString()}</p>
                    <p className="text-sm text-gray-700">{t('winklink.tron.volume24h')}: ${(dapp.volume24h / 1e6).toFixed(2)}M</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'staking' && stakingData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('winklink.staking.title')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.staking.totalStaked')}</p>
                  <p className="text-2xl font-bold text-gray-900">{(stakingData.totalStaked / 1e6).toFixed(2)}M WIN</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.staking.activeNodes')}</p>
                  <p className="text-2xl font-bold text-green-600">{stakingData.activeNodes}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.staking.averageApr')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stakingData.averageApr}%</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.staking.rewardPool')}</p>
                  <p className="text-2xl font-bold text-gray-900">{(stakingData.rewardPool / 1e6).toFixed(2)}M WIN</p>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('winklink.staking.tiers')}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {stakingData.stakingTiers.map((tier, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg text-center">
                    <h4 className="font-semibold text-gray-900 mb-2">{tier.tier}</h4>
                    <p className="text-2xl font-bold text-pink-600 mb-1">{tier.apr}%</p>
                    <p className="text-sm text-gray-500">APR</p>
                    <p className="text-sm text-gray-700 mt-2">
                      {(tier.minStake / 1e6).toFixed(1)}M - {(tier.maxStake / 1e6).toFixed(1)}M
                    </p>
                    <p className="text-xs text-gray-500">{tier.nodeCount} nodes</p>
                  </div>
                ))}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('winklink.staking.topNodes')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('winklink.staking.node')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('winklink.staking.region')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('winklink.staking.tier')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('winklink.staking.staked')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('winklink.staking.uptime')}</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('winklink.staking.rewards')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stakingData.nodes.slice(0, 5).map((node, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-gray-900">{node.name}</p>
                          <p className="text-xs text-gray-500">{node.address}</p>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{node.region}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs capitalize ${
                            node.tier === 'platinum' ? 'bg-purple-100 text-purple-700' :
                            node.tier === 'gold' ? 'bg-yellow-100 text-yellow-700' :
                            node.tier === 'silver' ? 'bg-gray-100 text-gray-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {node.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-900">{(node.stakedAmount / 1e6).toFixed(2)}M</td>
                        <td className="py-3 px-4 text-gray-900">{node.uptime}%</td>
                        <td className="py-3 px-4 text-green-600">{(node.rewardsEarned / 1e6).toFixed(2)}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'gaming' && gamingData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('winklink.gaming.title')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.gaming.totalVolume')}</p>
                  <p className="text-2xl font-bold text-gray-900">${(gamingData.totalGamingVolume / 1e6).toFixed(0)}M</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.gaming.activeGames')}</p>
                  <p className="text-2xl font-bold text-gray-900">{gamingData.activeGames}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">{t('winklink.gaming.dailyRngRequests')}</p>
                  <p className="text-2xl font-bold text-gray-900">{(gamingData.dailyRandomRequests / 1e6).toFixed(2)}M</p>
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('winklink.gaming.dataSources')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {gamingData.dataSources.map((source, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{source.name}</h4>
                      <span className="px-2 py-1 bg-gray-200 rounded text-xs text-gray-600 capitalize">
                        {source.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 capitalize mb-2">{source.type}</p>
                    <p className="text-sm text-gray-700">{t('winklink.gaming.users')}: {source.users.toLocaleString()}</p>
                    <p className="text-sm text-gray-700">{t('winklink.gaming.volume24h')}: ${(source.volume24h / 1e6).toFixed(2)}M</p>
                    <p className="text-sm text-gray-700">{t('winklink.gaming.reliability')}: {source.reliability}%</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {source.dataTypes.map((type, i) => (
                        <span key={i} className="px-2 py-1 bg-pink-100 rounded text-xs text-pink-700">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('winklink.gaming.rngServices')}</h3>
              <div className="space-y-3">
                {gamingData.randomNumberServices.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      <p className="text-sm text-gray-500">{t('winklink.gaming.chains')}: {service.supportedChains.join(', ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{service.requestCount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{t('winklink.gaming.requests')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{service.averageResponseTime}ms</p>
                      <p className="text-sm text-gray-500">{t('winklink.gaming.avgResponse')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      service.securityLevel === 'high' ? 'bg-green-100 text-green-700' :
                      service.securityLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {service.securityLevel} {t('winklink.gaming.security')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
