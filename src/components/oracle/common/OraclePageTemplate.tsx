'use client';

import { useState, useCallback, useMemo, ReactNode } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData, OracleProvider } from '@/types/oracle';
import { UMAMetworkStats } from '@/lib/oracles/uma/types';
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
  CrossOracleComparison,
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
} from '@/components/oracle';
import { RSIIndicator } from '../indicators/RSIIndicator';
import { MACDIndicator } from '../indicators/MACDIndicator';
import { GasFeeTrendChart } from '../charts/GasFeeTrendChart';
import { useRefresh, useExport, ExportOptions } from '@/hooks';
import { useGlobalTimeRange } from '@/contexts/TimeRangeContext';
import { UMAClient } from '@/lib/oracles/uma';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { UMADataQualityScoreCard } from './UMADataQualityScoreCard';
import { KPIDashboard } from '../charts/KPIDashboard';
import DataQualityIndicator from './DataQualityIndicator';
import { DataSourceCredibility } from './DataSourceCredibility';
import { createLogger } from '@/lib/utils/logger';

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
  const { t } = useI18n();
  const { timeRange, setTimeRange } = useGlobalTimeRange();
  const [activeTab, setActiveTab] = useState('market');
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [historicalData, setHistoricalData] = useState<PriceData[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingStateProps>({ show: true });
  const [error, setError] = useState<Error | null>(null);
  const [umaNetworkStats, setUmaNetworkStats] = useState<UMAMetworkStats | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingState({ show: true });
    setError(null);
    try {
      const promises: Promise<unknown>[] = [
        config.client.getPrice(config.symbol, config.defaultChain),
        config.client.getHistoricalPrices(config.symbol, config.defaultChain, 7),
      ];

      // Fetch UMA network stats if using UMA client
      if (config.provider === OracleProvider.UMA && config.client instanceof UMAClient) {
        promises.push(config.client.getNetworkStats());
      }

      const results = await Promise.all(promises);
      setPriceData(results[0] as PriceData);
      setHistoricalData(results[1] as PriceData[]);

      // Set UMA network stats if available
      if (results[2]) {
        setUmaNetworkStats(results[2] as UMAMetworkStats);
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

  const stats = useMemo(() => {
    if (config.provider === OracleProvider.UMA && config.client instanceof UMAClient) {
      // Use fetched network stats or fallback to defaults
      const activeValidators = umaNetworkStats?.activeValidators ?? 850;
      const totalDisputes = umaNetworkStats?.totalDisputes ?? 1250;
      const disputeSuccessRate = umaNetworkStats?.disputeSuccessRate ?? 78;

      return [
        {
          title: t('uma.stats.activeValidators'),
          value: `${activeValidators.toLocaleString()}+`,
          change: '+3%',
          changeType: 'positive' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          title: t('uma.stats.totalDisputes'),
          value: `${totalDisputes.toLocaleString()}+`,
          change: '+15%',
          changeType: 'positive' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
              />
            </svg>
          ),
        },
        {
          title: t('uma.stats.disputeSuccessRate'),
          value: `${disputeSuccessRate}%`,
          change: '+5%',
          changeType: 'positive' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        },
        {
          title: t('uma.stats.supportedChains'),
          value: `${config.supportedChains.length}+`,
          change: '0%',
          changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          ),
        },
      ];
    }

    if (config.provider === OracleProvider.PYTH) {
      return [
        {
          title: t('pythNetwork.stats.updateFrequencyPerSecond'),
          value: '2.5',
          suffix: t('pythNetwork.stats.updatesPerSecond'),
          change: '+12%',
          changeType: 'positive' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
        {
          title: t('pythNetwork.stats.avgConfidenceWidth'),
          value: '0.15',
          suffix: '%',
          change: '-5%',
          changeType: 'positive' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          ),
        },
        {
          title: t('pythNetwork.stats.publisherCount'),
          value: '90+',
          change: '+8%',
          changeType: 'positive' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          title: t('pythNetwork.stats.crossChainSupport'),
          value: `${config.supportedChains.length}+`,
          change: '0%',
          changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          ),
        },
      ];
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
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      },
    ];
  }, [config, t, umaNetworkStats]);

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
    switch (activeTab) {
      case 'market':
        return t('chainlink.pageTitles.market');
      case 'network':
        return t('chainlink.pageTitles.network');
      case 'validators':
        return t('uma.pageTitles.validators');
      case 'disputes':
        return t('uma.pageTitles.disputes');
      case 'ecosystem':
        return t('chainlink.pageTitles.ecosystem');
      case 'risk':
        return t('chainlink.pageTitles.risk');
      default:
        return '';
    }
  }, [activeTab, t]);

  const kpiData = useMemo(() => {
    if (config.provider !== OracleProvider.CHAINLINK) {
      return null;
    }

    const price = priceData?.price ?? config.marketData.change24hValue;
    const priceChange24h = config.marketData.change24hValue;
    const priceChangePercent = config.marketData.change24hPercent;
    const updateFrequency = config.networkData.updateFrequency;

    let networkHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (config.networkData.nodeUptime < 95) {
      networkHealth = 'critical';
    } else if (config.networkData.avgResponseTime > 500 || config.networkData.nodeUptime < 99) {
      networkHealth = 'warning';
    }

    const completeness = 95;
    const latencyScore = Math.max(0, 100 - config.networkData.avgResponseTime / 10);
    const sourceScore = Math.min(100, (8 / 10) * 100);
    const dataQualityScore = completeness * 0.4 + latencyScore * 0.3 + sourceScore * 0.3;

    return {
      price,
      priceChange24h,
      priceChangePercent,
      updateFrequency,
      networkHealth,
      dataQualityScore,
    };
  }, [config, priceData]);

  const dataQualityData = useMemo(() => {
    if (config.provider !== OracleProvider.CHAINLINK) {
      return null;
    }

    return {
      completeness: 95,
      latency: config.networkData.avgResponseTime,
      sourceCount: 8,
    };
  }, [config]);

  const dataSourceCredibilityData = useMemo(() => {
    if (config.provider !== OracleProvider.CHAINLINK) {
      return [];
    }

    return [
      {
        id: '1',
        name: 'Binance',
        accuracy: 98,
        responseSpeed: 95,
        consistency: 97,
        availability: 99,
        contribution: 25,
      },
      {
        id: '2',
        name: 'Coinbase',
        accuracy: 97,
        responseSpeed: 94,
        consistency: 96,
        availability: 99,
        contribution: 22,
      },
      {
        id: '3',
        name: 'Kraken',
        accuracy: 96,
        responseSpeed: 93,
        consistency: 95,
        availability: 98,
        contribution: 18,
      },
      {
        id: '4',
        name: 'Huobi',
        accuracy: 95,
        responseSpeed: 92,
        consistency: 94,
        availability: 97,
        contribution: 15,
      },
      {
        id: '5',
        name: 'OKX',
        accuracy: 94,
        responseSpeed: 91,
        consistency: 93,
        availability: 96,
        contribution: 12,
      },
      {
        id: '6',
        name: 'KuCoin',
        accuracy: 93,
        responseSpeed: 90,
        consistency: 92,
        availability: 95,
        contribution: 8,
      },
    ];
  }, [config]);

  // 根据 provider 获取对应的 i18n 键名
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

  return (
    <div className="min-h-screen bg-dune">
      <PageHeader
        title={`${config.name} ${t(`${providerKey}.analytics` as any)}`}
        subtitle={t(`${providerKey}.subtitle` as any)}
        icon={config.icon}
        onRefresh={refresh}
        onExport={handleExport}
        isRefreshing={isRefreshing}
      />

      {kpiData && (
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

      <div className="bg-dune border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            provider={config.provider}
          />
        </div>
      </div>

      <main className="flex-1 bg-dune">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 统计数据行 - 去中心化节点、支持的链等 */}
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
                            ? 'text-green-600'
                            : stat.changeType === 'negative'
                              ? 'text-red-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {stat.changeType === 'positive' && '↑ '}
                        {stat.changeType === 'negative' && '↓ '}
                        {stat.changeType === 'neutral' && '→ '}
                        {stat.change}
                      </p>
                    </div>
                    <div className="p-2 bg-blue-50 border border-blue-100 text-blue-600">
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

          {/* RSI和MACD技术指标 - 仅Chainlink显示 */}
          {activeTab === 'market' && config.provider === OracleProvider.CHAINLINK && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <RSIIndicator
                data={historicalData.map((h) => ({
                  time: new Date(h.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  timestamp: h.timestamp,
                  price: h.price,
                  close: h.price,
                }))}
                period={14}
                height={220}
              />
              <MACDIndicator
                data={historicalData.map((h) => ({
                  time: new Date(h.timestamp).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  timestamp: h.timestamp,
                  price: h.price,
                  close: h.price,
                }))}
                fastPeriod={12}
                slowPeriod={26}
                signalPeriod={9}
                height={220}
              />
            </div>
          )}

          {activeTab === 'market' && config.provider === OracleProvider.PYTH && (
            <>
              <div className="mb-6">
                <PriceStream
                  symbol={config.symbol}
                  initialPrice={config.marketData.change24hValue}
                  updateInterval={100}
                />
              </div>
              <div className="mb-6">
                <DataQualityScorePanel symbol={config.symbol} />
              </div>
              <div className="mb-6">
                <ConfidenceIntervalChart />
              </div>
              <div className="mb-6">
                <ConfidenceAlertPanel symbol={config.symbol} />
              </div>
            </>
          )}

          {activeTab === 'market' && config.provider === OracleProvider.PYTH && (
            <div className="mb-6">
              <AccuracyAnalysisPanel />
            </div>
          )}

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

              {/* Gas费用趋势图 */}
              {config.provider === OracleProvider.CHAINLINK && (
                <div className="mb-6">
                  <GasFeeTrendChart height={280} />
                </div>
              )}

              {/* 链上延迟分布 */}
              {config.provider === OracleProvider.CHAINLINK && (
                <div className="mb-6">
                  <LatencyDistributionHistogram
                    data={Array.from({ length: 1000 }, () => Math.random() * 400 + 50)}
                    oracleName={config.name}
                  />
                </div>
              )}

              {dataSourceCredibilityData.length > 0 && (
                <div className="mb-6">
                  <DataSourceCredibility sources={dataSourceCredibilityData} />
                </div>
              )}
              {config.provider === OracleProvider.PYTH && (
                <>
                  <div className="mb-6">
                    <UpdateFrequencyHeatmap
                      hourlyActivity={config.networkData.hourlyActivity}
                      updateFrequency={config.networkData.updateFrequency}
                    />
                  </div>
                  <div className="mb-6">
                    <LatencyTrendChart symbol={config.symbol} />
                  </div>
                  <div className="mb-6">
                    <CrossChainPriceConsistency symbol={config.symbol} />
                  </div>
                </>
              )}
              {config.provider === OracleProvider.BAND_PROTOCOL &&
                config.client instanceof BandProtocolClient && (
                  <>
                    <div className="mb-6">
                      <ValidatorGeographicMap validators={[]} />
                    </div>
                    <div className="mb-6">
                      <ValidatorPanel client={config.client} />
                    </div>
                    <div className="mb-6">
                      <ChainEventMonitor client={config.client} refreshInterval={30000} />
                    </div>
                    <div className="mb-6">
                      <BandCrossChainPriceConsistency />
                    </div>
                  </>
                )}
            </>
          )}

          {activeTab === 'validators' && config.provider === OracleProvider.UMA && (
            <>
              <div className="mb-6">
                <UMADataQualityScoreCard />
              </div>
              <div className="mb-6">
                <ValidatorAnalyticsPanel />
              </div>
            </>
          )}

          {activeTab === 'disputes' && config.provider === OracleProvider.UMA && (
            <div className="mb-6">
              <DisputeResolutionPanel />
            </div>
          )}

          {activeTab === 'risk' && (
            <>
              <div className="mb-6">
                <RiskAssessmentPanel provider={config.provider} />
              </div>
              <div className="mb-6">
                <DataQualityPanel symbol={config.symbol} basePrice={config.marketData.high24h} />
              </div>
            </>
          )}

          {activeTab === 'ecosystem' && (
            <div className="mb-6">
              {config.provider === OracleProvider.PYTH ? (
                <EcosystemPanel />
              ) : config.provider === OracleProvider.BAND_PROTOCOL &&
                config.client instanceof BandProtocolClient ? (
                <CrossChainPanel client={config.client} />
              ) : (
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

          {activeTab === 'cross-oracle' && (
            <div className="mb-6">
              <CrossOracleComparison />
            </div>
          )}

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
                        <span className="text-sm font-semibold text-green-600">4.32%</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-600">
                          {t('chainlink.networkUptime')}
                        </span>
                        <span className="text-sm font-semibold text-green-600">
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
                                item.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
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
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500 animate-pulse'
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
