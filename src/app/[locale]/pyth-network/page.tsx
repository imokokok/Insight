'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { PythClient } from '@/lib/oracles/pythNetwork';
import {
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  TabNavigation,
  LoadingState,
  ErrorFallback,
} from '@/components/oracle';
import { PythRiskAssessmentPanel } from '@/components/oracle/panels/PythRiskAssessmentPanel';
import { CrossOracleComparison } from '@/components/oracle/charts/CrossOracleComparison';
import { getOracleConfig } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';
import { useRefresh, useExport } from '@/hooks';
import { usePythAllData } from '@/hooks/usePythData';
import { SegmentedControl } from '@/components/ui/selectors';
import { FlatStatItem } from '@/components/oracle/common/DashboardCard';

type SortField = 'stake' | 'accuracy' | 'name';
type SortOrder = 'asc' | 'desc';

export default function PythNetworkPage() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState('market');
  const [publisherSortField, setPublisherSortField] = useState<SortField>('stake');
  const [publisherSortOrder, setPublisherSortOrder] = useState<SortOrder>('desc');
  const [publisherSearchQuery, setPublisherSearchQuery] = useState('');

  const config = getOracleConfig(OracleProvider.PYTH);
  const client = useMemo(() => new PythClient(), []);

  const {
    price,
    historicalData,
    networkStats,
    publishers,
    validators,
    isLoading,
    isError,
    errors,
    refetchAll,
  } = usePythAllData({
    symbol: config.symbol,
    chain: config.defaultChain,
    enabled: true,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price,
      historical: historicalData,
      network: networkStats,
    },
    filename: `pyth-data`,
  });

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: async () => {
      await refetchAll();
    },
    minLoadingTime: 500,
  });

  const stats = useMemo(() => {
    const updateFrequency = networkStats?.updateFrequency ?? 1;
    const publisherCount = publishers?.length ?? 90;
    const crossChainSupport = config.supportedChains.length;
    const nodeUptime = networkStats?.nodeUptime ?? 99.9;

    return [
      {
        title: t('pyth.stats.updateFrequency'),
        value: `${updateFrequency}s`,
        change: '+12%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        ),
      },
      {
        title: t('pyth.stats.publisherCount'),
        value: `${publisherCount}+`,
        change: '+8%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        ),
      },
      {
        title: t('pyth.stats.crossChainSupport'),
        value: `${crossChainSupport}+`,
        change: '0%',
        changeType: 'neutral' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        ),
      },
      {
        title: t('pyth.stats.networkUptime'),
        value: `${nodeUptime}%`,
        change: '+0.05%',
        changeType: 'positive' as const,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
    ];
  }, [networkStats, publishers, config, t]);

  if (isLoading) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (isError && !isLoading) {
    return <ErrorFallback error={errors[0]} onRetry={refetchAll} themeColor={config.themeColor} />;
  }

  return (
    <div className="min-h-screen bg-insight">
      <PageHeader
        title={t('pyth.title')}
        subtitle={t('pyth.subtitle')}
        icon={config.icon}
        onRefresh={refresh}
        onExport={exportData}
        isRefreshing={isRefreshing}
      />

      <div className="bg-insight border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            oracleTabs={config.tabs}
            themeColor={config.themeColor}
          />
        </div>
      </div>

      <main className="flex-1 bg-insight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => (
              <StatCard key={index} {...stat} />
            ))}
          </div>

          {activeTab === 'market' && (
            <>
              <div className="mb-6">
                <MarketDataPanel
                  client={client}
                  chain={config.defaultChain}
                  config={config.marketData}
                  iconBgColor={config.iconBgColor}
                  icon={config.icon}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <DashboardCard title={t('pyth.priceTrend')} className="lg:col-span-2">
                  <PriceChart
                    client={client}
                    symbol={config.symbol}
                    chain={config.defaultChain}
                    height={320}
                    showToolbar={true}
                    defaultPrice={config.marketData.change24hValue}
                  />
                </DashboardCard>

                <DashboardCard title={t('pyth.quickStats')}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('pyth.stats.volume24h')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">{t('pyth.stats.marketCap')}</span>
                      <span className="text-sm font-semibold text-gray-900">
                        ${(config.marketData.marketCap / 1e9).toFixed(2)}B
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-600">
                        {t('pyth.stats.circulatingSupply')}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {(config.marketData.circulatingSupply / 1e9).toFixed(1)}B PYTH
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-600">
                        {t('pyth.stats.updateFrequency')}
                      </span>
                      <span className="text-sm font-semibold text-success-600">
                        {networkStats?.updateFrequency ?? 1}s
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              </div>
            </>
          )}

          {activeTab === 'network' && (
            <div className="space-y-6">
              <NetworkHealthPanel config={config.networkData} />
            </div>
          )}

          {activeTab === 'publishers' && (
            <div className="space-y-6">
              <DashboardCard title={t('pyth.publishers.title')}>
                {/* 搜索和排序控件 */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder={t('pyth.publishers.searchPlaceholder') || '搜索发布者...'}
                      value={publisherSearchQuery}
                      onChange={(e) => setPublisherSearchQuery(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <SegmentedControl
                      options={[
                        { value: 'stake', label: t('pyth.publishers.sortByStake') || '按质押排序' },
                        {
                          value: 'accuracy',
                          label: t('pyth.publishers.sortByAccuracy') || '按准确率排序',
                        },
                        { value: 'name', label: t('pyth.publishers.sortByName') || '按名称排序' },
                      ]}
                      value={publisherSortField}
                      onChange={(value) => setPublisherSortField(value as SortField)}
                      size="sm"
                    />
                    <button
                      onClick={() =>
                        setPublisherSortOrder(publisherSortOrder === 'asc' ? 'desc' : 'asc')
                      }
                      className="px-4 py-2 border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      {publisherSortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {/* 发布者统计 - 使用 FlatStatItem 风格 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-gray-200 mb-6">
                  <FlatStatItem
                    label={t('pyth.publishers.totalPublishers') || '发布者总数'}
                    value={publishers?.length || 0}
                    className="px-4 py-4 border-r border-gray-200"
                  />
                  <FlatStatItem
                    label={t('pyth.publishers.totalStaked') || '总质押'}
                    value={`${((publishers?.reduce((sum, p) => sum + p.stake, 0) || 0) / 1e9).toFixed(2)}B`}
                    className="px-4 py-4 border-r border-gray-200"
                  />
                  <FlatStatItem
                    label={t('pyth.publishers.avgAccuracy') || '平均准确率'}
                    value={`${
                      publishers?.length
                        ? (
                            publishers.reduce((sum, p) => sum + p.accuracy, 0) / publishers.length
                          ).toFixed(1)
                        : 0
                    }%`}
                    className="px-4 py-4 border-r border-gray-200"
                  />
                  <FlatStatItem
                    label={t('pyth.publishers.topPublisher') || '头部发布者'}
                    value={publishers?.sort((a, b) => b.stake - a.stake)[0]?.name || '-'}
                    className="px-4 py-4"
                  />
                </div>

                {/* 发布者列表 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publishers
                    ?.filter((publisher) =>
                      publisher.name.toLowerCase().includes(publisherSearchQuery.toLowerCase())
                    )
                    ?.sort((a, b) => {
                      let comparison = 0;
                      switch (publisherSortField) {
                        case 'stake':
                          comparison = a.stake - b.stake;
                          break;
                        case 'accuracy':
                          comparison = a.accuracy - b.accuracy;
                          break;
                        case 'name':
                          comparison = a.name.localeCompare(b.name);
                          break;
                      }
                      return publisherSortOrder === 'asc' ? comparison : -comparison;
                    })
                    ?.map((publisher, index) => (
                      <div
                        key={publisher.id}
                        className="p-4 border border-gray-200 hover:border-gray-400 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900">{publisher.name}</h4>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1">
                            #{index + 1}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {t('pyth.publishers.stake')}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {(publisher.stake / 1e6).toFixed(1)}M PYTH
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 h-1">
                            <div
                              className="bg-gray-600 h-1"
                              style={{
                                width: `${Math.min((publisher.stake / (publishers?.[0]?.stake || 1)) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              {t('pyth.publishers.accuracy')}
                            </span>
                            <span
                              className={`text-sm font-medium ${
                                publisher.accuracy >= 99 ? 'text-success-600' : 'text-warning-600'
                              }`}
                            >
                              {publisher.accuracy}%
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <span className="text-sm text-gray-600">
                              {t('pyth.publishers.contribution') || '贡献度'}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {(
                                (publisher.stake /
                                  (publishers?.reduce((sum, p) => sum + p.stake, 0) || 1)) *
                                100
                              ).toFixed(2)}
                              %
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'validators' && (
            <div className="space-y-6">
              {/* 验证者统计 - 使用 FlatStatItem 风格 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-gray-200">
                <FlatStatItem
                  label={t('pyth.validators.totalValidators') || '验证者总数'}
                  value={validators?.length || 0}
                  className="px-4 py-4 border-r border-gray-200"
                />
                <FlatStatItem
                  label={t('pyth.validators.activeValidators') || '活跃验证者'}
                  value={validators?.filter((v) => v.status === 'active').length || 0}
                  className="px-4 py-4 border-r border-gray-200"
                />
                <FlatStatItem
                  label={t('pyth.validators.totalStaked') || '总质押'}
                  value={`${((validators?.reduce((sum, v) => sum + v.stake, 0) || 0) / 1e9).toFixed(2)}B`}
                  className="px-4 py-4 border-r border-gray-200"
                />
                <FlatStatItem
                  label={t('pyth.validators.avgUptime') || '平均在线率'}
                  value={`${
                    validators?.length
                      ? (
                          validators.reduce((sum, v) => sum + v.uptime, 0) / validators.length
                        ).toFixed(1)
                      : 0
                  }%`}
                  className="px-4 py-4"
                />
              </div>

              <DashboardCard title={t('pyth.validators.title') || '验证者列表'}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                          {t('pyth.validators.name') || '名称'}
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">
                          {t('pyth.validators.status') || '状态'}
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                          {t('pyth.validators.stake') || '质押'}
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                          {t('pyth.validators.uptime') || '在线率'}
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700 text-sm">
                          {t('pyth.validators.rewards') || '奖励'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {validators
                        ?.sort((a, b) => b.stake - a.stake)
                        ?.map((validator) => (
                          <tr
                            key={validator.id}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-3 px-4 font-medium text-gray-900">
                              {validator.name}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-medium ${
                                  validator.status === 'active'
                                    ? 'text-success-600'
                                    : validator.status === 'inactive'
                                      ? 'text-gray-500'
                                      : 'text-danger-600'
                                }`}
                              >
                                {validator.status === 'active'
                                  ? t('pyth.validators.statusActive') || '活跃'
                                  : validator.status === 'inactive'
                                    ? t('pyth.validators.statusInactive') || '离线'
                                    : t('pyth.validators.statusJailed') || '监禁'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-sm">
                              {(validator.stake / 1e6).toFixed(1)}M PYTH
                            </td>
                            <td className="py-3 px-4 text-right text-sm">
                              <span
                                className={
                                  validator.uptime >= 99
                                    ? 'text-success-600'
                                    : validator.uptime >= 95
                                      ? 'text-warning-600'
                                      : 'text-danger-600'
                                }
                              >
                                {validator.uptime}%
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right text-sm">
                              {(validator.rewards / 1e3).toFixed(1)}K PYTH
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'cross-chain' && (
            <div className="space-y-6">
              <DashboardCard title={t('pyth.crossChain.title') || '跨链支持'}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {config.supportedChains.map((chain) => (
                    <div key={chain} className="p-4 border border-gray-200">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                          <span className="text-gray-600 font-bold">{chain.charAt(0)}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{chain}</h4>
                          <p className="text-xs text-gray-500">
                            {t('pyth.crossChain.supported') || '已支持'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {t('pyth.crossChain.updateFrequency') || '更新频率'}
                          </span>
                          <span className="font-medium">1s</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {t('pyth.crossChain.latency') || '延迟'}
                          </span>
                          <span className="font-medium">&lt; 500ms</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {t('pyth.crossChain.status') || '状态'}
                          </span>
                          <span className="text-success-600 font-medium">
                            {t('pyth.crossChain.online') || '在线'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    {t('pyth.crossChain.description') ||
                      `Pyth 通过 Wormhole 跨链协议支持 ${config.supportedChains.length} 条区块链，实现亚秒级价格更新。`}
                  </p>
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'price-feeds' && (
            <div className="space-y-6">
              <DashboardCard title={t('pyth.priceFeeds.title')}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { category: t('pyth.priceFeeds.categories.crypto'), count: 350, icon: '₿' },
                    { category: t('pyth.priceFeeds.categories.equities'), count: 80, icon: '📈' },
                    {
                      category: t('pyth.priceFeeds.categories.commodities'),
                      count: 45,
                      icon: '🛢️',
                    },
                    { category: t('pyth.priceFeeds.categories.forex'), count: 45, icon: '💱' },
                  ].map((feed) => (
                    <div key={feed.category} className="p-4 border border-gray-200 text-center">
                      <div className="text-2xl mb-2">{feed.icon}</div>
                      <h4 className="font-semibold text-gray-900 text-sm">{feed.category}</h4>
                      <p className="text-xl font-bold text-gray-900 mt-1">{feed.count}</p>
                      <p className="text-xs text-gray-500">{t('pyth.priceFeeds.priceFeeds')}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200">
                  <p className="text-sm text-gray-700">
                    {t('pyth.priceFeeds.totalDescription', { count: 520 })}
                  </p>
                </div>
              </DashboardCard>
            </div>
          )}

          {activeTab === 'risk' && (
            <div className="space-y-6">
              <PythRiskAssessmentPanel />
            </div>
          )}

          {activeTab === 'cross-oracle' && (
            <div className="space-y-6">
              <DashboardCard title={t('pyth.crossOracle.title')}>
                <CrossOracleComparison />
              </DashboardCard>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
