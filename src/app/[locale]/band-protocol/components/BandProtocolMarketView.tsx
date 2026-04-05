'use client';

import { TrendingUp, TrendingDown, Zap, Server, Clock, Shield } from 'lucide-react';

import { PriceChart } from '@/components/oracle';
import { useTranslations } from '@/i18n';

import { type BandProtocolMarketViewProps } from '../types';

export function BandProtocolMarketView({ config, price }: BandProtocolMarketViewProps) {
  const t = useTranslations();

  // 核心市场统计数据
  const stats: Array<{
    label: string;
    value: string;
    change: string | number | null;
    highlight?: boolean;
  }> = [
    {
      label: t('band.bandProtocol.stats.marketCap'),
      value:
        config.marketData.marketCap > 0
          ? `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`
          : '-',
      change: config.marketData.change24hValue,
    },
    {
      label: t('band.bandProtocol.stats.volume24h'),
      value:
        config.marketData.volume24h > 0
          ? `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`
          : '-',
      change: null,
    },
    {
      label: t('band.bandProtocol.stats.circulatingSupply'),
      value:
        config.marketData.circulatingSupply > 0
          ? `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M BAND`
          : '-',
      change: null,
    },
    {
      label: t('band.bandProtocol.stats.stakingApr'),
      value:
        config.marketData.stakingApr != null && config.marketData.stakingApr > 0
          ? `${config.marketData.stakingApr}%`
          : '-',
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    {
      label: t('band.bandProtocol.stats.activeNodes'),
      value: config.networkData.activeNodes > 0 ? `${config.networkData.activeNodes}+` : '-',
      status: config.networkData.activeNodes > 0 ? 'healthy' : 'unknown',
      icon: Server,
    },
    {
      label: t('band.bandProtocol.dataFeeds.dataFeeds'),
      value: config.networkData.dataFeeds > 0 ? `${config.networkData.dataFeeds}+` : '-',
      status: config.networkData.dataFeeds > 0 ? 'healthy' : 'unknown',
      icon: Zap,
    },
    {
      label: t('band.bandProtocol.stats.responseTime'),
      value:
        config.networkData.avgResponseTime > 0 ? `${config.networkData.avgResponseTime}ms` : '-',
      status: config.networkData.avgResponseTime > 0 ? 'healthy' : 'unknown',
      icon: Clock,
    },
    {
      label: t('band.bandProtocol.stats.successRate'),
      value:
        config.networkData.nodeUptime > 0 ? `${config.networkData.nodeUptime.toFixed(2)}%` : '-',
      status: config.networkData.nodeUptime > 0 ? 'healthy' : 'unknown',
      icon: Shield,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('band.bandProtocol.market.priceTrend')}
            </h3>
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

        {/* 右侧统计区域 */}
        <div className="flex flex-col gap-8">
          {/* 快速统计 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('band.bandProtocol.market.quickStats')}
            </h3>
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
                        stat.highlight ? 'text-purple-600' : 'text-gray-900'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.change && (
                      <span
                        className={`text-xs ml-2 ${
                          typeof stat.change === 'string' && stat.change.startsWith('+')
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {typeof stat.change === 'string' ? stat.change : `${stat.change}%`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 网络状态 - 内联布局 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('band.bandProtocol.network.status')}
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

          {/* 数据来源 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('band.bandProtocol.market.dataSource')}
            </h3>
            <div className="flex-1 flex flex-col">
              <div className="text-sm text-gray-500 py-4 text-center">{t('common.noData')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 核心交易对信息 */}
      <div className="border-t border-gray-200 pt-8">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('band.bandProtocol.market.tradingPair')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">BAND/USDC</p>
            <p className="text-2xl font-semibold text-gray-900">
              {price?.price != null ? `$${price.price.toFixed(2)}` : '-'}
            </p>
            {config.marketData.change24hValue != null && (
              <div className="flex items-center gap-1 mt-1">
                {config.marketData.change24hValue >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                )}
                <span
                  className={`text-sm ${config.marketData.change24hValue >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {config.marketData.change24hValue >= 0 ? '+' : ''}
                  {config.marketData.change24hValue}%
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('band.bandProtocol.stats.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {config.marketData.volume24h > 0
                ? `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`
                : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('band.bandProtocol.market.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">-</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('band.bandProtocol.market.depth')}</p>
            <p className="text-2xl font-semibold text-gray-900">-</p>
          </div>
        </div>
      </div>
    </div>
  );
}
