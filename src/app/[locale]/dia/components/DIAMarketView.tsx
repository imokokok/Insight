'use client';

import { TrendingUp, TrendingDown, Activity, Zap, Server, Clock, Shield } from 'lucide-react';

import { PriceChart } from '@/components/oracle';
import { CrossChainPriceComparison } from '@/components/oracle/charts/CrossChainPriceComparison';
import { useTranslations } from '@/i18n';
import { Blockchain } from '@/types/oracle';

import { type DIAMarketViewProps } from '../types';

export function DIAMarketView({ config, price, historicalData, isLoading }: DIAMarketViewProps) {
  const t = useTranslations();

  const stats: Array<{
    label: string;
    value: string;
    change: number | string | null;
    highlight?: boolean;
  }> = [
    {
      label: t('dia.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: config.marketData.change24hValue,
    },
    {
      label: t('dia.stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: config.marketData.volume24hChange ?? null,
    },
    {
      label: t('dia.stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M DIA`,
      change: null,
    },
    {
      label: t('dia.stats.stakingApr'),
      value: `${config.marketData.stakingApr ?? '8.5'}%`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    { label: t('dia.stats.activeDataSources'), value: `45+`, status: 'healthy', icon: Server },
    { label: t('dia.stats.dataFeeds'), value: `280+`, status: 'healthy', icon: Zap },
    { label: t('dia.stats.avgResponseTime'), value: `150ms`, status: 'healthy', icon: Clock },
    { label: t('dia.stats.successRate'), value: `99.8%`, status: 'healthy', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{t('dia.priceTrend')}</h3>
          </div>
          <div className="flex-1">
            <PriceChart
              client={config.client}
              symbol={config.symbol}
              chain={config.defaultChain}
              height={300}
              showToolbar={true}
              defaultPrice={config.marketData.change24hValue}
            />
          </div>
        </div>

        {/* 右侧统计区域 */}
        <div className="flex flex-col gap-8">
          {/* 快速统计 */}
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('dia.quickStats')}</h3>
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
                        stat.highlight ? 'text-emerald-600' : 'text-gray-900'
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('dia.networkStatus')}</h3>
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('dia.dataSources')}</h3>
            <div className="flex-1 flex flex-col">
              {[
            { name: t('dia.dataSource.diaPrimary'), status: 'active', latency: '85ms' },
            { name: t('dia.dataSource.ethereumNode'), status: 'active', latency: '150ms' },
            { name: t('dia.dataSource.backupFeed'), status: 'active', latency: '120ms' },
            { name: t('dia.dataSource.archiveNode'), status: 'syncing', latency: '280ms' },
          ].map((source, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        source.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    <span className="text-sm text-gray-700">{source.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{source.latency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 核心交易对信息 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('dia.tradingPair')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('dia.tradingPairDiaUsdc')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${price?.price?.toFixed(2) || '0.45'}
            </p>
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
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('dia.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${config.marketData.volume24h ? `${(config.marketData.volume24h / 1e6).toFixed(1)}M` : '--'}
            </p>
            <p className="text-sm text-gray-400 mt-1">--</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('dia.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              {config.marketData.liquidity ? `$${(config.marketData.liquidity / 1e6).toFixed(1)}M` : '--'}
            </p>
            <p className="text-sm text-gray-400 mt-1">--</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('dia.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">{t('dia.depthScoreValue')}</span>
              <span className="text-sm text-gray-400">{t('dia.depthScoreTotal')}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('dia.depthScore')}</p>
          </div>
        </div>
      </div>

      {/* 跨链价格对比 */}
      <div className="border-t border-gray-200 pt-8">
        <CrossChainPriceComparison
          symbol={config.symbol || 'DIA'}
          chains={[
            Blockchain.ETHEREUM,
            Blockchain.ARBITRUM,
            Blockchain.POLYGON,
            Blockchain.BASE,
          ]}
          priceThreshold={0.5}
        />
      </div>
    </div>
  );
}
