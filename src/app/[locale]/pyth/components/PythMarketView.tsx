'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, Server, Clock, Shield, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

import { PriceChart, ConfidenceIntervalChart } from '@/components/oracle';
import { chartColors } from '@/lib/config/colors';
import { useTranslations } from '@/i18n';
import { PythClient } from '@/lib/oracles/pythNetwork';
import { calculateEMA } from '@/lib/indicators';

import { type PythMarketViewProps } from '../types';

export function PythMarketView({
  config,
  price,
  historicalData,
  networkStats,
  isLoading,
}: PythMarketViewProps) {
  const t = useTranslations();
  const tPyth = useTranslations('pyth');

  const client = new PythClient();

  const confidenceIntervalData = useMemo(() => {
    if (price?.confidenceInterval) {
      return price.confidenceInterval;
    }
    const currentPrice = price?.price ?? 0.45;
    const spread = currentPrice * 0.002;
    return {
      bid: currentPrice - spread / 2,
      ask: currentPrice + spread / 2,
      widthPercentage: 0.2,
    };
  }, [price]);

  const historicalConfidenceData = useMemo(() => {
    if (historicalData && historicalData.length > 0) {
      return historicalData
        .filter((d) => d.confidence !== undefined)
        .map((d) => d.confidence!);
    }
    const baseConfidence = 85;
    return Array.from({ length: 20 }, () =>
      Math.round(baseConfidence + (Math.random() - 0.5) * 20)
    );
  }, [historicalData]);

  const emaData = useMemo(() => {
    const prices = historicalData && historicalData.length > 0
      ? historicalData.map((d) => d.price)
      : Array.from({ length: 50 }, (_, i) => (price?.price ?? 0.45) * (1 + (Math.random() - 0.5) * 0.02));

    const ema7Values = calculateEMA(prices, 7);
    const ema25Values = calculateEMA(prices, 25);

    const currentPrice = price?.price ?? prices[prices.length - 1] ?? 0.45;
    const ema7 = ema7Values[ema7Values.length - 1] ?? currentPrice;
    const ema25 = ema25Values[ema25Values.length - 1] ?? currentPrice;

    const getTrend = (emaValue: number, currentPriceValue: number): 'up' | 'down' | 'neutral' => {
      const deviation = Math.abs((currentPriceValue - emaValue) / emaValue) * 100;
      if (deviation < 0.1) return 'neutral';
      return currentPriceValue > emaValue ? 'up' : 'down';
    };

    const getDeviation = (emaValue: number, currentPriceValue: number): number => {
      return ((currentPriceValue - emaValue) / emaValue) * 100;
    };

    return {
      ema7: {
        value: ema7,
        trend: getTrend(ema7, currentPrice),
        deviation: getDeviation(ema7, currentPrice),
      },
      ema25: {
        value: ema25,
        trend: getTrend(ema25, currentPrice),
        deviation: getDeviation(ema25, currentPrice),
      },
      currentPrice,
    };
  }, [historicalData, price]);

  const stats = [
    {
      label: t('pyth.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: config.marketData.change24hValue,
    },
    {
      label: t('pyth.stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: '+8%',
    },
    {
      label: t('pyth.stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e9).toFixed(1)}B PYTH`,
      change: null,
    },
    {
      label: t('pyth.stats.updateFrequency'),
      value: `${networkStats?.updateFrequency ?? 1}s`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    {
      label: t('pyth.networkHealth.activePublishers'),
      value: '85+',
      status: 'healthy',
      icon: Server,
    },
    { label: t('pyth.networkHealth.priceFeeds'), value: '400+', status: 'healthy', icon: Zap },
    { label: t('pyth.networkHealth.responseTime'), value: '200ms', status: 'healthy', icon: Clock },
    { label: t('pyth.networkHealth.confidence'), value: '99.9%', status: 'healthy', icon: Shield },
  ];

  return (
    <div className="space-y-8">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{t('pyth.priceTrend')}</h3>
          </div>
          <div className="flex-1">
            <PriceChart
              client={client}
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('pyth.quickStats')}</h3>
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
                        stat.highlight ? 'text-violet-600' : 'text-gray-900'
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('pyth.networkStatus')}</h3>
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('pyth.dataSource')}</h3>
            <div className="flex-1 flex flex-col">
              {[
                { name: tPyth('dataSources.pythNetwork'), status: 'active', latency: '150ms' },
                { name: tPyth('dataSources.solanaMainnet'), status: 'active', latency: '200ms' },
                { name: tPyth('dataSources.ethereumMainnet'), status: 'active', latency: '250ms' },
                { name: tPyth('dataSources.publisherConsensus'), status: 'active', latency: '180ms' },
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

      {/* 置信区间趋势图区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{tPyth('confidenceIntervalTrend')}</h3>
          </div>
          <ConfidenceIntervalChart
            price={price?.price ?? 0.45}
            confidenceInterval={confidenceIntervalData}
            historicalConfidence={historicalConfidenceData}
            showTrend={true}
            height={120}
            themeColor={chartColors.oracle.pyth}
          />
        </div>
      </div>

      {/* EMA 价格展示区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* EMA-7 卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              {t('pythNetwork.ema.periods.ema7')}
            </h4>
            {emaData.ema7.trend === 'up' ? (
              <div className="flex items-center gap-1 text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-medium">{t('pythNetwork.ema.trend.up')}</span>
              </div>
            ) : emaData.ema7.trend === 'down' ? (
              <div className="flex items-center gap-1 text-red-600">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-xs font-medium">{t('pythNetwork.ema.trend.down')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <Minus className="w-4 h-4" />
                <span className="text-xs font-medium">{t('pythNetwork.ema.trend.neutral')}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{t('pythNetwork.ema.emaValue')}</p>
                <p className={`text-xl font-semibold ${emaData.ema7.trend === 'up' ? 'text-emerald-600' : emaData.ema7.trend === 'down' ? 'text-red-600' : 'text-gray-900'}`}>
                  ${emaData.ema7.value.toFixed(4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">{t('pythNetwork.ema.currentPrice')}</p>
                <p className="text-lg font-medium text-gray-700">${emaData.currentPrice.toFixed(4)}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('pythNetwork.ema.deviation')}</span>
                <span className={`text-sm font-medium ${emaData.ema7.deviation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {emaData.ema7.deviation >= 0 ? '+' : ''}{emaData.ema7.deviation.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* EMA-25 卡片 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">
              {t('pythNetwork.ema.periods.ema25')}
            </h4>
            {emaData.ema25.trend === 'up' ? (
              <div className="flex items-center gap-1 text-emerald-600">
                <ArrowUpRight className="w-4 h-4" />
                <span className="text-xs font-medium">{t('pythNetwork.ema.trend.up')}</span>
              </div>
            ) : emaData.ema25.trend === 'down' ? (
              <div className="flex items-center gap-1 text-red-600">
                <ArrowDownRight className="w-4 h-4" />
                <span className="text-xs font-medium">{t('pythNetwork.ema.trend.down')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-500">
                <Minus className="w-4 h-4" />
                <span className="text-xs font-medium">{t('pythNetwork.ema.trend.neutral')}</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{t('pythNetwork.ema.emaValue')}</p>
                <p className={`text-xl font-semibold ${emaData.ema25.trend === 'up' ? 'text-emerald-600' : emaData.ema25.trend === 'down' ? 'text-red-600' : 'text-gray-900'}`}>
                  ${emaData.ema25.value.toFixed(4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-1">{t('pythNetwork.ema.currentPrice')}</p>
                <p className="text-lg font-medium text-gray-700">${emaData.currentPrice.toFixed(4)}</p>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{t('pythNetwork.ema.deviation')}</span>
                <span className={`text-sm font-medium ${emaData.ema25.deviation >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {emaData.ema25.deviation >= 0 ? '+' : ''}{emaData.ema25.deviation.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* EMA 说明卡片 */}
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-violet-600" />
            <h4 className="text-sm font-medium text-violet-900">{t('pythNetwork.ema.title')}</h4>
          </div>
          <p className="text-xs text-violet-700 leading-relaxed mb-4">
            {t('pythNetwork.ema.explanation')}
          </p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-xs text-violet-600">
                EMA-7: {t('pythNetwork.ema.calculationMethod')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-xs text-violet-600">
                EMA-25: {t('pythNetwork.ema.calculationMethod')}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-violet-200">
            <p className="text-xs text-violet-500">
              {t('pythNetwork.ema.priceComparison')}
            </p>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 核心交易对信息 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {tPyth('tradingPair')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">PYTH/USDC</p>
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
            <p className="text-xs text-gray-400 mb-1">{t('pyth.stats.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">$45.2M</p>
            <p className="text-sm text-emerald-600 mt-1">+12.5%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('pyth.stats.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">$18.5M</p>
            <p className="text-sm text-emerald-600 mt-1">+5.2%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('pyth.stats.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">8.2</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('pyth.depthScore')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
