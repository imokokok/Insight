'use client';

import { useState, useCallback, useMemo, type ReactNode } from 'react';

import {
  TabNavigation,
  PageHeader,
  PriceChart,
  MarketDataPanel,
  NetworkHealthPanel,
  DashboardCard,
  StatCard,
  TimeRange,
  PublisherAnalysisPanel,
  ValidatorPanel,
  CrossChainPanel,
  DataQualityPanel,
  DisputeResolutionPanel,
  ValidatorAnalyticsPanel,
  RiskAssessmentPanel,
  EcosystemPanel,
  PriceStream,
  UpdateFrequencyHeatmap,
  AccuracyAnalysisPanel,
  ConfidenceIntervalChart,
  PublisherContributionPanel,
  CrossChainPriceConsistency,
  BandCrossChainPriceConsistency,
  RequestTypeDistribution,
  ConfidenceAlertPanel,
  DataQualityScorePanel,
  LatencyTrendChart,
  ChainEventMonitor,
  LatencyDistributionHistogram,
  BollingerBands,
  ATRIndicator,
  ValidatorGeographicMap,
  BandCrossChainPanel,
  CosmosEcosystemPanel,
  BandRiskAssessmentPanel,
} from '@/components/oracle';
import DataQualityIndicator from '@/components/oracle/data-display/DataQualityIndicator';
import { DataSourceCredibility } from '@/components/oracle/data-display/DataSourceCredibility';
import { UMADataQualityScoreCard } from '@/components/oracle/data-display/UMADataQualityScoreCard';
import { getPanelConfig, type PanelRenderContext } from '@/components/oracle/oracle-panels';
import {
  WINkLinkGamingDataPanel,
  WINkLinkTRONEcosystemPanel,
  WINkLinkStakingPanel,
  WINkLinkRiskPanel,
  BandStakingPanel,
  BandDataFeedsPanel,
  BandValidatorsPanel,
} from '@/components/oracle/panels';
import { StakingPanel } from '@/components/oracle/panels/StakingPanel';
import { UMADashboardPanel } from '@/components/oracle/panels/UMADashboardPanel';
import { UMAEcosystemPanel } from '@/components/oracle/panels/UMAEcosystemPanel';
import { UMANetworkPanel } from '@/components/oracle/panels/UMANetworkPanel';
import { UMARiskPanel } from '@/components/oracle/panels/UMARiskPanel';
import { useRefresh, useExport, type ExportOptions } from '@/hooks';
import { useTranslations } from '@/i18n';
import { type OracleConfig } from '@/lib/config/oracles';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { UMAClient } from '@/lib/oracles/uma';
import { type UMANetworkStats } from '@/lib/oracles/uma/types';
import { createLogger } from '@/lib/utils/logger';
import { useGlobalTimeRange, useSetGlobalTimeRange } from '@/stores/uiStore';
import { type PriceData, OracleProvider } from '@/types/oracle';

import { GasFeeTrendChart } from '../charts/GasFeeTrendChart';
import { KPIDashboard } from '../charts/KPIDashboard';
import { MACDIndicator } from '../indicators/MACDIndicator';
import { RSIIndicator } from '../indicators/RSIIndicator';

const logger = createLogger('OraclePageTemplate');

interface OraclePageTemplateProps {
  config: OracleConfig;
  showLoading?: boolean;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  customLayout?: ReactNode;
}

interface LoadingStateProps {
  show: boolean;
  message?: string;
}

export function OraclePageTemplate({
  config,
  showLoading: externalLoading,
  loadingComponent,
  errorComponent,
  customLayout,
}: OraclePageTemplateProps) {
  const t = useTranslations();
  const timeRange = useGlobalTimeRange();
  const setTimeRange = useSetGlobalTimeRange();
  const [activeTab, setActiveTab] = useState('market');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingStateProps>({ show: true });
  const [error, setError] = useState<Error | null>(null);
  const [umaNetworkStats, setUmaNetworkStats] = useState<UMANetworkStats | null>(null);

  const panelConfig = useMemo(() => getPanelConfig(config.provider), [config.provider]);

  const fetchData = useCallback(async () => {
    setLoadingState({ show: true });
    setError(null);
    try {
      const promises: Promise<unknown>[] = [
        config.client.getPrice(config.symbol, config.defaultChain),
        config.client.getHistoricalPrices(config.symbol, config.defaultChain, 7),
      ];

      if (config.provider === OracleProvider.UMA && config.client instanceof UMAClient) {
        promises.push(config.client.getNetworkStats());
      }

      const results = await Promise.all(promises);
      setPriceData(results[0] as PriceData);
      setHistoricalData(results[1] as PriceData[]);

      if (results[2]) {
        setUmaNetworkStats(results[2] as UMANetworkStats);
      }

      setLoadingState({ show: false });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch data');
      setError(error);
      setLoadingState({ show: false });
      logger.error(`Error fetching ${config.name} data`, error);
    }
  }, [config]);

  const { isRefreshing, refresh } = useRefresh({
    onRefresh: fetchData,
    minLoadingTime: 500,
  });

  const { exportData } = useExport({
    data: {
      timestamp: new Date().toISOString(),
      price: priceData,
      historical: historicalData,
      timeRange,
    },
    filename: `${config.provider}-data`,
    exportOptions: {
      timeRange,
    },
  });

  const handleExport = useCallback(
    (options?: ExportOptions) => {
      exportData(options);
    },
    [exportData]
  );

  const panelContext: PanelRenderContext = useMemo(
    () => ({
      config,
      activeTab,
      priceData,
      historicalData,
      umaNetworkStats,
      t,
    }),
    [config, activeTab, priceData, historicalData, umaNetworkStats, t]
  );

  const stats = useMemo(() => {
    if (panelConfig.getStats) {
      return panelConfig.getStats(panelContext);
    }

    return [
      {
        title: t('chainlink.stats.decentralizedNodes'),
        value: `${config.networkData.activeNodes.toLocaleString()}+`,
        change: '+5%',
        changeType: 'positive' as 'positive' | 'negative' | 'neutral',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        ),
      },
      {
        title: t('chainlink.stats.supportedChains'),
        value: `${config.supportedChains.length}+`,
        change: '0%',
        changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
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
        title: t('chainlink.stats.dataFeeds'),
        value: `${config.networkData.dataFeeds.toLocaleString()}+`,
        change: '+12%',
        changeType: 'positive' as 'positive' | 'negative' | 'neutral',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
      {
        title: t('chainlink.stats.totalValueSecured'),
        value: `$${(config.marketData.marketCap / 1e9).toFixed(1)}B+`,
        change: '+8%',
        changeType: 'positive' as 'positive' | 'negative' | 'neutral',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      },
    ];
  }, [
    panelConfig.getStats,
    panelContext,
    t,
    config.networkData.activeNodes,
    config.networkData.dataFeeds,
    config.marketData.marketCap,
    config.supportedChains.length,
  ]);

  const networkStatusData = useMemo(
    () => [
      {
        label: t('chainlink.networkHealth.activeNodes'),
        value: config.networkData.activeNodes.toLocaleString(),
        status: 'healthy' as const,
      },
      {
        label: t('chainlink.stats.dataFeeds'),
        value: config.networkData.dataFeeds.toLocaleString(),
        status: 'healthy' as const,
      },
      {
        label: t('chainlink.networkHealth.responseTime'),
        value: `${config.networkData.avgResponseTime}ms`,
        status:
          config.networkData.avgResponseTime < 200 ? ('healthy' as const) : ('warning' as const),
      },
      {
        label: t('chainlink.successRate'),
        value: `${config.networkData.nodeUptime}%`,
        status: 'healthy' as const,
      },
    ],
    [t, config]
  );

  const dataSources = useMemo(
    () => [
      {
        name: `${config.name} Market`,
        status: 'active' as const,
        latency: `${config.networkData.latency}ms`,
      },
      {
        name: config.defaultChain,
        status: 'active' as const,
        latency: `${config.networkData.avgResponseTime}ms`,
      },
      {
        name: 'Secondary Feed',
        status: 'active' as const,
        latency: `${Math.round(config.networkData.avgResponseTime * 1.2)}ms`,
      },
      {
        name: 'Backup Node',
        status: 'syncing' as const,
        latency: `${Math.round(config.networkData.avgResponseTime * 1.5)}ms`,
      },
    ],
    [config]
  );

  const getPageTitle = useCallback(() => {
    const getTitle = (key: string) => {
      switch (config.provider) {
        case OracleProvider.BAND_PROTOCOL:
          return t(`band.pageTitles.${key}`);
        case OracleProvider.PYTH:
          return t(`pyth.pageTitles.${key}`);
        case OracleProvider.UMA:
          return t(`uma.pageTitles.${key}`);
        case OracleProvider.REDSTONE:
          return t(`redstone.pageTitles.${key}`);
        default:
          return t(`chainlink.pageTitles.${key}`);
      }
    };

    switch (activeTab) {
      case 'market':
        return getTitle('market');
      case 'network':
        return getTitle('network');
      case 'validators':
        return getTitle('validators');
      case 'disputes':
        return getTitle('disputes');
      case 'ecosystem':
        return getTitle('ecosystem');
      case 'risk':
        return getTitle('risk');
      case 'cross-chain':
        return getTitle('crossChain');
      default:
        return '';
    }
  }, [activeTab, t, config.provider]);

  const kpiData = useMemo(() => {
    if (panelConfig.getKPIData) {
      return panelConfig.getKPIData(panelContext);
    }
    return null;
  }, [panelConfig, panelContext]);

  const dataQualityData = useMemo(() => {
    if (panelConfig.getDataQualityData) {
      return panelConfig.getDataQualityData(panelContext);
    }
    return null;
  }, [panelConfig, panelContext]);

  const dataSourceCredibilityData = useMemo(() => {
    if (panelConfig.getDataSourceCredibilityData) {
      return panelConfig.getDataSourceCredibilityData(panelContext);
    }
    return [];
  }, [panelConfig, panelContext]);

  const getProviderKey = useCallback(() => {
    switch (config.provider) {
      case OracleProvider.CHAINLINK:
        return 'chainlink';
      case OracleProvider.UMA:
        return 'uma';
      case OracleProvider.BAND_PROTOCOL:
        return 'bandProtocol';
      case OracleProvider.PYTH:
        return 'pythNetwork';
      case OracleProvider.API3:
        return 'api3';
      case OracleProvider.REDSTONE:
        return 'redstone';
      case OracleProvider.DIA:
        return 'dia';
      case OracleProvider.TELLOR:
        return 'tellor';
      case OracleProvider.CHRONICLE:
        return 'chronicle';
      case OracleProvider.WINKLINK:
        return 'winklink';
      default:
        return 'chainlink';
    }
  }, [config.provider]);

  const providerKey = getProviderKey();

  const renderProviderSpecificMarketContent = () => {
    if (panelConfig.renderMarketTab) {
      return panelConfig.renderMarketTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificNetworkContent = () => {
    if (panelConfig.renderNetworkTab) {
      return panelConfig.renderNetworkTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificValidatorsContent = () => {
    if (panelConfig.renderValidatorsTab) {
      return panelConfig.renderValidatorsTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificDisputesContent = () => {
    if (panelConfig.renderDisputesTab) {
      return panelConfig.renderDisputesTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificStakingContent = () => {
    if (panelConfig.renderStakingTab) {
      return panelConfig.renderStakingTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificRiskContent = () => {
    if (panelConfig.renderRiskTab) {
      return panelConfig.renderRiskTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificEcosystemContent = () => {
    if (panelConfig.renderEcosystemTab) {
      return panelConfig.renderEcosystemTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificGamingContent = () => {
    if (panelConfig.renderGamingTab) {
      return panelConfig.renderGamingTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificTronContent = () => {
    if (panelConfig.renderTronTab) {
      return panelConfig.renderTronTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificDataFeedsContent = () => {
    if (panelConfig.renderDataFeedsTab) {
      return panelConfig.renderDataFeedsTab(panelContext);
    }
    return null;
  };

  const renderProviderSpecificCrossChainContent = () => {
    if (panelConfig.renderCrossChainTab) {
      return panelConfig.renderCrossChainTab(panelContext);
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-insight">
      <PageHeader
        title={`${config.name} ${t(`${providerKey}.analytics`)}`}
        subtitle={t(`${providerKey}.subtitle`)}
        icon={config.icon}
        onRefresh={refresh}
        onExport={handleExport}
        isRefreshing={isRefreshing}
      />

      {kpiData && kpiData.price !== undefined && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <KPIDashboard
            price={kpiData.price}
            priceChange24h={kpiData.priceChange24h}
            priceChangePercent={kpiData.priceChangePercent ?? 0}
            updateFrequency={kpiData.updateFrequency}
            networkHealth={kpiData.networkHealth}
            dataQualityScore={kpiData.dataQualityScore}
          />
        </div>
      )}

      <div className="bg-insight border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            provider={config.provider}
            oracleTabs={config.tabs}
          />
        </div>
      </div>

      <main className="flex-1 bg-insight">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'market' && !config.features.hasPublisherAnalytics && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                      <p
                        className={`text-xs mt-2 font-medium ${
                          stat.changeType === 'positive'
                            ? 'text-success-600'
                            : stat.changeType === 'negative'
                              ? 'text-danger-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {stat.changeType === 'positive' && '↑ '}
                        {stat.changeType === 'negative' && '↓ '}
                        {stat.changeType === 'neutral' && '→ '}
                        {stat.change}
                      </p>
                    </div>
                    <div className="p-2 bg-primary-50 border border-primary-100 text-primary-600">
                      {stat.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'market' && (
            <div className="mb-6">
              <MarketDataPanel
                client={config.client}
                chain={config.defaultChain}
                config={config.marketData}
                iconBgColor={config.iconBgColor}
                icon={config.icon}
              />
            </div>
          )}

          {activeTab === 'market' && renderProviderSpecificMarketContent()}

          {activeTab === 'market' && config.features.hasPublisherAnalytics && (
            <div className="mb-6">
              <PublisherAnalysisPanel />
            </div>
          )}

          {activeTab === 'network' && (
            <>
              <div className="mb-6">
                <NetworkHealthPanel config={config.networkData} />
              </div>
              {renderProviderSpecificNetworkContent()}
              {dataSourceCredibilityData.length > 0 && (
                <div className="mb-6">
                  <DataSourceCredibility sources={dataSourceCredibilityData} />
                </div>
              )}
            </>
          )}

          {activeTab === 'validators' && renderProviderSpecificValidatorsContent()}

          {activeTab === 'disputes' && renderProviderSpecificDisputesContent()}

          {activeTab === 'staking' && renderProviderSpecificStakingContent()}

          {activeTab === 'risk' && renderProviderSpecificRiskContent()}

          {activeTab === 'ecosystem' && (
            <div className="mb-6">
              {renderProviderSpecificEcosystemContent() || (
                <div className="py-4 border-b border-gray-100">
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 mx-auto text-gray-300 mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">
                      {t('oracleCommon.oraclePageTemplate.ecosystemOverview')}
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto text-sm">
                      {t('oracleCommon.oraclePageTemplate.ecosystemDescription', {
                        name: config.name,
                        count: config.supportedChains.length,
                      })}
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-2">
                      {config.supportedChains.map((chain, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200"
                        >
                          {chain}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gaming' && renderProviderSpecificGamingContent()}

          {activeTab === 'tron' && renderProviderSpecificTronContent()}

          {activeTab === 'data-feeds' && renderProviderSpecificDataFeedsContent()}

          {activeTab === 'cross-chain' && renderProviderSpecificCrossChainContent()}

          {(activeTab === 'market' || activeTab === 'network') &&
            !config.features.hasPublisherAnalytics && (
              <>
                {dataQualityData && activeTab === 'market' && (
                  <div className="mb-6">
                    <DataQualityIndicator
                      completeness={dataQualityData.completeness}
                      latency={dataQualityData.latency}
                      sourceCount={dataQualityData.sourceCount}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  <div className="lg:col-span-2 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold mb-3">
                      {t('chainlink.priceChart.title')}
                    </h3>
                    <PriceChart
                      client={config.client}
                      symbol={config.symbol}
                      chain={config.defaultChain}
                      height={320}
                      showToolbar={true}
                      defaultPrice={config.marketData.change24hValue}
                    />
                  </div>

                  <div className="py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold mb-3">{t('chainlink.quickStats')}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{t('chainlink.24hVolume')}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${(config.marketData.volume24h / 1e6).toFixed(1)}M
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">
                          {t('chainlink.marketData.marketCap')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${(config.marketData.marketCap / 1e9).toFixed(1)}B
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">
                          {t('chainlink.marketData.circulatingSupply')}
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {(config.marketData.circulatingSupply / 1e6).toFixed(1)}M {config.symbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-sm text-gray-600">{t('chainlink.stakingApr')}</span>
                        <span className="text-sm font-semibold text-success-600">
                          {config.marketData.stakingApr ? `${config.marketData.stakingApr}%` : '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">
                          {t('chainlink.networkUptime')}
                        </span>
                        <span className="text-sm font-semibold text-success-600">
                          {config.networkData.nodeUptime}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold mb-3">{t('chainlink.networkStatus')}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {networkStatusData.map((item, index) => (
                        <div key={index} className="text-center py-3">
                          <p className="text-xs text-gray-500 mb-1 truncate">{item.label}</p>
                          <p className="text-lg font-semibold text-gray-900">{item.value}</p>
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <span
                              className={`w-2 h-2 ${
                                item.status === 'healthy' ? 'bg-success-500' : 'bg-warning-500'
                              }`}
                            />
                            <span className="text-xs text-gray-500">
                              {item.status === 'healthy'
                                ? t('chainlink.normal')
                                : t('chainlink.networkHealth.warning')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold mb-3">{t('chainlink.dataSource')}</h3>
                    <div className="space-y-3">
                      {dataSources.map((source, index) => (
                        <div key={index} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 flex-shrink-0 ${
                                source.status === 'active'
                                  ? 'bg-success-500'
                                  : 'bg-warning-500 animate-pulse'
                              }`}
                            />
                            <span className="text-sm text-gray-700 truncate">{source.name}</span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                            {source.latency}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
        </div>
      </main>
    </div>
  );
}
