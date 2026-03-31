'use client';

import {
  TrendingUp,
  TrendingDown,
  Server,
  Zap,
  Clock,
  Shield,
  Database,
  Activity,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Layers,
  Target,
  Gauge,
  Building2,
} from 'lucide-react';

import { PriceChart } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { RELIABILITY_THRESHOLDS } from '../constants';
import { type WinklinkMarketViewProps } from '../types';

interface DataSourceDetail {
  name: string;
  type: 'exchange' | 'aggregator';
  status: 'active' | 'inactive' | 'degraded';
  reliability: number;
  lastUpdate: string;
  latency: string;
  weight: number;
}

interface DataQualityMetric {
  label: string;
  value: string | number;
  status: 'excellent' | 'good' | 'warning';
  description: string;
}

export function WinklinkMarketView({
  config,
  price,
  historicalData,
  staking,
  isLoading,
}: WinklinkMarketViewProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      label: t('winklink.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: '+8%',
    },
    {
      label: t('winklink.stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: '+12%',
    },
    {
      label: t('winklink.stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e9).toFixed(1)}B WIN`,
      change: null,
    },
    {
      label: t('winklink.stats.stakingApr'),
      value: `${staking?.averageApr ?? 12.5}%`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    {
      label: t('winklink.stats.activeNodes'),
      value: `${staking?.activeNodes ?? 82}+`,
      status: 'healthy',
      icon: Server,
    },
    { label: t('winklink.stats.dataFeeds'), value: '180+', status: 'healthy', icon: Zap },
    { label: t('winklink.stats.responseTime'), value: '110ms', status: 'healthy', icon: Clock },
    { label: t('winklink.stats.successRate'), value: '99.92%', status: 'healthy', icon: Shield },
  ];

  const dataSources: DataSourceDetail[] = [
    {
      name: 'Binance',
      type: 'exchange',
      status: 'active',
      reliability: 99.8,
      lastUpdate: '2s ago',
      latency: '45ms',
      weight: 35,
    },
    {
      name: 'Huobi',
      type: 'exchange',
      status: 'active',
      reliability: 99.5,
      lastUpdate: '3s ago',
      latency: '62ms',
      weight: 25,
    },
    {
      name: 'CoinGecko',
      type: 'aggregator',
      status: 'active',
      reliability: 98.9,
      lastUpdate: '5s ago',
      latency: '85ms',
      weight: 20,
    },
    {
      name: 'CoinMarketCap',
      type: 'aggregator',
      status: 'active',
      reliability: 99.2,
      lastUpdate: '4s ago',
      latency: '78ms',
      weight: 20,
    },
  ];

  const dataQualityMetrics: DataQualityMetric[] = [
    {
      label: t('winklink.dataQuality.priceDeviation'),
      value: '0.12%',
      status: 'excellent',
      description: t('winklink.dataQuality.priceDeviationDesc'),
    },
    {
      label: t('winklink.dataQuality.updateFrequency'),
      value: '3s',
      status: 'excellent',
      description: t('winklink.dataQuality.updateFrequencyDesc'),
    },
    {
      label: t('winklink.dataQuality.freshnessScore'),
      value: '98.5%',
      status: 'excellent',
      description: t('winklink.dataQuality.freshnessScoreDesc'),
    },
    {
      label: t('winklink.dataQuality.contributingSources'),
      value: 4,
      status: 'good',
      description: t('winklink.dataQuality.contributingSourcesDesc'),
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'excellent':
        return 'text-emerald-600';
      case 'good':
        return 'text-blue-600';
      case 'degraded':
      case 'warning':
        return 'text-amber-600';
      case 'inactive':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'excellent':
        return 'bg-emerald-50';
      case 'good':
        return 'bg-blue-50';
      case 'degraded':
      case 'warning':
        return 'bg-amber-50';
      case 'inactive':
        return 'bg-red-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'excellent':
        return 'bg-emerald-500';
      case 'good':
        return 'bg-blue-500';
      case 'degraded':
      case 'warning':
        return 'bg-amber-500';
      case 'inactive':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getReliabilityColor = (reliability: number) => {
    if (reliability >= RELIABILITY_THRESHOLDS.excellent) return 'text-emerald-600';
    if (reliability >= RELIABILITY_THRESHOLDS.good) return 'text-blue-600';
    if (reliability >= RELIABILITY_THRESHOLDS.warning) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{t('winklink.priceTrend')}</h3>
          </div>
          <div className="flex-1">
            {config.client ? (
              <PriceChart
                client={config.client}
                symbol={config.symbol}
                chain={config.defaultChain}
                height={300}
                showToolbar={true}
                defaultPrice={config.marketData.change24hValue}
              />
            ) : (
              <div className="h-[300px] flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-gray-500">{t('common.noData')}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('winklink.quickStats')}</h3>
            <div className="flex-1 flex flex-col">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-500">{stat.label}</span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-medium ${
                        stat.highlight ? 'text-pink-600' : 'text-gray-900'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.change && (
                      <span
                        className={`text-xs ml-2 ${
                          stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('winklink.networkStatus')}
            </h3>
            <div className="flex-1 flex flex-col gap-3">
              {networkStatus.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{item.value}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900">{t('winklink.dataSource')}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <RefreshCw className="w-3 h-3" />
                <span>Live</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-2">
              {dataSources.map((source, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${getStatusDotColor(source.status)} ${
                        source.status === 'active' ? '' : 'animate-pulse'
                      }`}
                    />
                    <div className="flex items-center gap-1.5">
                      {source.type === 'exchange' ? (
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span className="text-sm text-gray-700">{source.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-medium ${getReliabilityColor(source.reliability)}`}
                      >
                        {source.reliability}%
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-mono w-12 text-right">
                      {source.latency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Database className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-medium text-gray-900">
              {t('winklink.dataSourceDetails')}
            </h3>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {t('winklink.dataProviders')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dataSources.map((source, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${getStatusBgColor(source.status)}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(source.status)}`}
                      />
                      <span className="text-sm text-gray-700">{source.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {source.type === 'exchange'
                        ? t('winklink.market.exchange')
                        : t('winklink.market.aggregator')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {t('winklink.aggregationMethod')}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {t('winklink.weightedAverage')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('winklink.weightedAverageDesc')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">{t('winklink.weightDistribution')}</span>
                    <div className="flex items-center gap-2">
                      {dataSources.map((source, index) => (
                        <span key={index} className="text-gray-600">
                          {source.name}: {source.weight}%
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {t('winklink.verificationMechanism')}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600">{t('winklink.multiSourceVerify')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600">{t('winklink.outlierDetection')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600">{t('winklink.timestampVerify')}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {t('winklink.reliabilityScore')}
                </span>
              </div>
              <div className="space-y-2">
                {dataSources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{source.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            source.reliability >= RELIABILITY_THRESHOLDS.excellent
                              ? 'bg-emerald-500'
                              : source.reliability >= RELIABILITY_THRESHOLDS.good
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                          }`}
                          style={{ width: `${source.reliability}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium w-12 text-right ${getReliabilityColor(source.reliability)}`}
                      >
                        {source.reliability}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">
                  {t('winklink.lastUpdate')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {dataSources.map((source, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm text-gray-600">{source.name}</span>
                    <span className="text-xs text-gray-400">{source.lastUpdate}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-5 h-5 text-gray-600" />
            <h3 className="text-base font-medium text-gray-900">
              {t('winklink.dataQualityMetrics')}
            </h3>
          </div>

          <div className="space-y-4">
            {dataQualityMetrics.map((metric, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg ${getStatusBgColor(metric.status)}`}
              >
                <div className="flex items-center gap-3">
                  {metric.status === 'excellent' ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                  ) : metric.status === 'good' ? (
                    <Activity className="w-5 h-5 text-blue-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700">{metric.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{metric.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-semibold ${getStatusColor(metric.status)}`}>
                    {metric.value}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{t('winklink.overallQuality')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '96%' }} />
                </div>
                <span className="text-sm font-medium text-emerald-600">96/100</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">{t('winklink.qualityNote')}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">{t('winklink.tradingPair')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">WIN/USDT</p>
            <p className="text-2xl font-semibold text-gray-900">${currentPrice.toFixed(6)}</p>
            <div className="flex items-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              )}
              <span className={`text-sm ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}
                {priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('winklink.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${(config.marketData.volume24h / 1e6).toFixed(1)}M
            </p>
            <p className="text-sm text-emerald-600 mt-1">+12%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('winklink.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">$32.5M</p>
            <p className="text-sm text-emerald-600 mt-1">+8.3%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('winklink.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">7.8</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('winklink.depthScore')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
