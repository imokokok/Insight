'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, TrendingDown, Zap, Server, Clock, Shield } from 'lucide-react';

import { PriceChart } from '@/components/oracle';
import {
  TellorPriceStreamPanel,
  TellorMarketDepthPanel,
  TellorMultiChainAggregationPanel,
} from '@/components/oracle/panels';
import { useTranslations } from '@/i18n';
import {
  type PriceStreamPoint,
  type MarketDepth,
  type MultiChainAggregation,
} from '@/lib/oracles/tellor';
import { Blockchain } from '@/types/oracle';

import { type TellorMarketViewProps } from '../types';

type PanelTab = 'priceStream' | 'marketDepth' | 'multiChain';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generatePriceStreamData(basePrice: number, symbol: string): PriceStreamPoint[] {
  const data: PriceStreamPoint[] = [];
  const now = Date.now();
  const seedBase = symbol.charCodeAt(0) + basePrice;

  for (let i = 0; i < 50; i++) {
    const seed = seedBase + i;
    const change = (seededRandom(seed) - 0.5) * 0.1;
    const currentPrice = basePrice + change;
    data.push({
      timestamp: now - (50 - i) * 60000,
      price: currentPrice,
      volume: Math.floor(seededRandom(seed + 100) * 10000) + 1000,
      change: change,
      changePercent: (change / basePrice) * 100,
      source: ['Ethereum', 'Arbitrum', 'Polygon', 'Optimism'][Math.floor(seededRandom(seed + 200) * 4)],
    });
  }
  return data;
}

function generateMarketDepthData(basePrice: number, symbol: string): MarketDepth {
  const levels = [];
  const seedBase = symbol.charCodeAt(0) + basePrice;

  for (let i = 0; i < 15; i++) {
    const priceOffset = i * 0.05;
    const seed = seedBase + i;
    levels.push({
      price: basePrice - priceOffset,
      bidVolume: Math.floor(seededRandom(seed + 300) * 5000) + 500,
      askVolume: 0,
      bidCount: Math.floor(seededRandom(seed + 400) * 20) + 1,
      askCount: 0,
    });
    levels.push({
      price: basePrice + priceOffset,
      bidVolume: 0,
      askVolume: Math.floor(seededRandom(seed + 500) * 5000) + 500,
      bidCount: 0,
      askCount: Math.floor(seededRandom(seed + 600) * 20) + 1,
    });
  }

  return {
    symbol,
    timestamp: Date.now(),
    levels: levels.sort((a, b) => a.price - b.price),
    totalBidVolume: levels.reduce((sum, l) => sum + l.bidVolume, 0),
    totalAskVolume: levels.reduce((sum, l) => sum + l.askVolume, 0),
    spread: 0.1,
    spreadPercent: (0.1 / basePrice) * 100,
  };
}

function generateMultiChainData(basePrice: number, symbol: string): MultiChainAggregation {
  const chains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.OPTIMISM,
    Blockchain.BASE,
  ];
  const seedBase = symbol.charCodeAt(0) + basePrice;

  return {
    symbol,
    aggregatedPrice: basePrice,
    consensusMethod: 'Median',
    chainPrices: chains.map((chain, idx) => ({
      chain,
      price: basePrice + (seededRandom(seedBase + idx * 10) - 0.5) * 0.2,
      timestamp: Date.now() - Math.floor(seededRandom(seedBase + idx * 20) * 5000),
      confidence: 0.95 + seededRandom(seedBase + idx * 30) * 0.04,
      latency: 50 + Math.floor(seededRandom(seedBase + idx * 40) * 100),
    })),
    priceDeviation: seededRandom(seedBase + 100) * 0.3,
    maxDeviation: seededRandom(seedBase + 200) * 0.5,
    lastUpdated: Date.now(),
  };
}

export function TellorMarketView({ config, price }: TellorMarketViewProps) {
  const t = useTranslations('tellor');
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>('priceStream');

  const basePrice = price?.price ?? 45.85;

  const priceStreamData = useMemo(
    () => generatePriceStreamData(basePrice, config.symbol),
    [basePrice, config.symbol]
  );
  const marketDepthData = useMemo(
    () => generateMarketDepthData(basePrice, config.symbol),
    [basePrice, config.symbol]
  );
  const multiChainData = useMemo(
    () => generateMultiChainData(basePrice, config.symbol),
    [basePrice, config.symbol]
  );

  const stats = [
    {
      label: t('stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: config.marketData.change24hValue,
    },
    {
      label: t('stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: '+12%',
    },
    {
      label: t('stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M TRB`,
      change: null,
    },
    {
      label: t('stats.stakingApr'),
      value: `${config.marketData.stakingApr ?? '-'}%`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    { label: t('stats.activeReporters'), value: '72+', status: 'healthy', icon: Server },
    { label: t('stats.dataFeeds'), value: '350+', status: 'healthy', icon: Zap },
    { label: t('stats.responseTime'), value: '95ms', status: 'healthy', icon: Clock },
    { label: t('successRate'), value: '99.9%', status: 'healthy', icon: Shield },
  ];

  const dataSources = [
    { name: t('market.dataSources.tellorMainnet'), status: 'active', latency: '95ms' },
    { name: t('market.dataSources.ethereumMainnet'), status: 'active', latency: '120ms' },
    { name: t('market.dataSources.arbitrumOne'), status: 'active', latency: '85ms' },
    { name: t('market.dataSources.backupReporter'), status: 'syncing', latency: '150ms' },
  ];

  return (
    <div className="space-y-8">
      {/* 主内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* 左侧价格趋势图表 - 占2列 */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{t('priceTrend')}</h3>
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('quickStats')}</h3>
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
            <h3 className="text-base font-medium text-gray-900 mb-4">
              {t('networkStatus')}
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
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('dataSource')}</h3>
            <div className="flex-1 flex flex-col">
              {dataSources.map((source, index) => (
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
          {t('market.tradingPair')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">TRB/USDC</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${price?.price?.toFixed(2) || '45.85'}
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
            <p className="text-xs text-gray-400 mb-1">{t('volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">$8.2M</p>
            <p className="text-sm text-emerald-600 mt-1">+15.3%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">$12.5M</p>
            <p className="text-sm text-emerald-600 mt-1">+8.7%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('marketDepthLabel')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">7.8</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('market.depthScore')}</p>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 数据面板区域 - 使用Tabs组织 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">{t('panels.title')}</h3>
        </div>

        {/* Tabs 导航 */}
        <nav className="flex space-x-6 border-b border-gray-200 mb-6" aria-label="PanelTabs">
          {[
            { id: 'priceStream' as PanelTab, label: t('tabs.priceStream') },
            { id: 'marketDepth' as PanelTab, label: t('tabs.marketDepth') },
            { id: 'multiChain' as PanelTab, label: t('tabs.multiChain') },
          ].map((tab) => {
            const isActive = activePanelTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanelTab(tab.id)}
                className={`
                  relative px-1 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200
                  ${
                    isActive
                      ? 'text-cyan-600 border-b-2 border-cyan-600'
                      : 'text-gray-500 hover:text-gray-700 hover:border-b-2 hover:border-gray-300'
                  }
                `}
              >
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Panel 内容 */}
        <div className="mt-4">
          {activePanelTab === 'priceStream' && <TellorPriceStreamPanel data={priceStreamData} />}
          {activePanelTab === 'marketDepth' && <TellorMarketDepthPanel data={marketDepthData} />}
          {activePanelTab === 'multiChain' && (
            <TellorMultiChainAggregationPanel data={multiChainData} />
          )}
        </div>
      </div>
    </div>
  );
}
