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

  const currentPrice = price?.price ?? 0;
  const priceChange24h = price?.change24hPercent ?? 0;
  const isPositive = priceChange24h >= 0;

  const stats = [
    {
      label: t('winklink.stats.price'),
      value: currentPrice > 0 ? `$${currentPrice.toFixed(6)}` : '-',
      change: null,
    },
    {
      label: t('winklink.stats.change24h'),
      value: priceChange24h !== 0 ? `${priceChange24h.toFixed(2)}%` : '-',
      change: null,
      highlight: priceChange24h > 0,
    },
    {
      label: t('winklink.stats.confidence'),
      value: price?.confidence ? `${(price.confidence * 100).toFixed(1)}%` : '-',
      change: null,
    },
    {
      label: t('winklink.stats.stakingApr'),
      value: staking?.averageApr ? `${staking.averageApr}%` : '-',
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = staking
    ? [
        {
          label: t('winklink.stats.activeNodes'),
          value: `${staking.activeNodes}+`,
          status: 'healthy',
          icon: Server,
        },
        {
          label: t('winklink.stats.dataFeeds'),
          value: `${staking.totalNodes || 0}+`,
          status: 'healthy',
          icon: Zap,
        },
        {
          label: t('winklink.stats.responseTime'),
          value: '110ms',
          status: 'healthy',
          icon: Clock,
        },
        {
          label: t('winklink.stats.successRate'),
          value: '99.92%',
          status: 'healthy',
          icon: Shield,
        },
      ]
    : [];

  const dataQualityMetrics: DataQualityMetric[] = price
    ? [
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
      ]
    : [];

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

  // 空状态显示
  if (!price && !isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Activity className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('winklink.market.noData')}</h3>
          <p className="text-sm text-gray-500 max-w-md">{t('winklink.market.noDataDescription')}</p>
        </div>
      </div>
    );
  }

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
                defaultPrice={currentPrice}
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
                          String(stat.change).startsWith('+') ? 'text-emerald-600' : 'text-red-600'
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

          {networkStatus.length > 0 && (
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
          )}
        </div>
      </div>

      {dataQualityMetrics.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
      )}

      {price && (
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">{t('winklink.tradingPair')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-gray-400 mb-1">WIN/USDT</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${currentPrice > 0 ? currentPrice.toFixed(6) : '-'}
              </p>
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
              <p className="text-xs text-gray-400 mb-1">{t('winklink.priceConfidence')}</p>
              <p className="text-2xl font-semibold text-gray-900">
                {price?.confidence ? `${(price.confidence * 100).toFixed(1)}%` : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">{t('winklink.liquidity')}</p>
              <p className="text-2xl font-semibold text-gray-900">-</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">{t('winklink.marketDepth')}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-semibold text-gray-900">-</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
