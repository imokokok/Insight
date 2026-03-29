'use client';

import { useMemo, useState, useEffect, useCallback, useRef } from 'react';

import {
  X,
  Activity,
  TrendingUp,
  Clock,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

import { type PriceFeed } from '../types';
import { useTranslations } from '@/i18n';
import { chartColors } from '@/lib/config/colors';
import { ConfidenceIntervalChart } from '@/components/oracle/charts/ConfidenceIntervalChart';
import { getPythDataService, type PublisherData } from '@/lib/oracles/pythDataService';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';
import { cn } from '@/lib/utils';

interface PriceFeedDetailModalProps {
  priceFeed: PriceFeed;
  isOpen: boolean;
  onClose: () => void;
}

interface PriceHistoryPoint {
  time: string;
  price: number;
  confidence: number;
}

interface Publisher {
  id: string;
  name: string;
  stake: number;
  accuracy: number;
  lastUpdate: string;
  status: 'active' | 'inactive';
}

interface RealtimeState {
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  lastUpdateLatency: number;
  priceUpdateAnimation: 'up' | 'down' | 'none';
}

const PYTH_PRICE_FEED_IDS: Record<string, string> = {
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'SOL/USD': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  'PYTH/USD': '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  'USDC/USD': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
  'LINK/USD': '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433617f47b4d5d3a132b01d9dca6a9',
  'AVAX/USD': '0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7',
  'MATIC/USD': '0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  'DOT/USD': '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  'UNI/USD': '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d56834200e2a28e860bb308e3',
};

function getBasePrice(name: string): number {
  const prices: Record<string, number> = {
    'BTC/USD': 67500,
    'ETH/USD': 3450,
    'SOL/USD': 145,
    'EUR/USD': 1.08,
    'GBP/USD': 1.27,
    'XAU/USD': 2350,
    'AAPL/USD': 178,
    'TSLA/USD': 245,
    'NVDA/USD': 875,
    'JPY/USD': 0.0067,
  };
  return prices[name] || 100;
}

function generatePriceHistory(basePrice: number): PriceHistoryPoint[] {
  const data: PriceHistoryPoint[] = [];
  const now = Date.now();
  for (let i = 24; i >= 0; i--) {
    const time = new Date(now - i * 3600000);
    const variation = (Math.random() - 0.5) * basePrice * 0.02;
    const price = basePrice + variation;
    const confidence = Math.random() * basePrice * 0.001 + basePrice * 0.0005;
    data.push({
      time: time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      price: parseFloat(price.toFixed(2)),
      confidence: parseFloat(confidence.toFixed(4)),
    });
  }
  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
        <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm">
            <span className="text-gray-500">{entry.name}:</span>
            <span className="ml-2 font-medium" style={{ color: entry.color }}>
              {entry.name === '价格' ? `$${entry.value.toLocaleString()}` : `$${entry.value.toFixed(4)}`}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PriceFeedDetailModal({ priceFeed, isOpen, onClose }: PriceFeedDetailModalProps) {
  const t = useTranslations();

  const [realtimePrice, setRealtimePrice] = useState<PriceData | null>(null);
  const [realtimeState, setRealtimeState] = useState<RealtimeState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    lastUpdateLatency: 0,
    priceUpdateAnimation: 'none',
  });
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [isLoadingPublishers, setIsLoadingPublishers] = useState(false);
  const [historicalConfidence, setHistoricalConfidence] = useState<number[]>([]);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const previousPriceRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());

  const basePrice = useMemo(() => getBasePrice(priceFeed.name), [priceFeed.name]);
  const priceHistory = useMemo(() => generatePriceHistory(basePrice), [basePrice]);

  const currentPrice = realtimePrice?.price ?? priceHistory[priceHistory.length - 1]?.price ?? basePrice;
  const previousPrice = priceHistory[priceHistory.length - 2]?.price || basePrice;
  const priceChange = realtimePrice?.change24hPercent ?? ((currentPrice - previousPrice) / previousPrice) * 100;
  const isPositive = priceChange >= 0;

  const confidenceInterval: ConfidenceInterval = useMemo(() => {
    if (realtimePrice?.confidenceInterval) {
      return realtimePrice.confidenceInterval;
    }
    const bid = currentPrice * (1 - 0.0001);
    const ask = currentPrice * (1 + 0.0001);
    return {
      bid,
      ask,
      widthPercentage: ((ask - bid) / currentPrice) * 100,
    };
  }, [realtimePrice, currentPrice]);

  const clearAnimationTimeout = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
  }, []);

  const updatePriceAnimation = useCallback((newPrice: number) => {
    clearAnimationTimeout();

    if (previousPriceRef.current !== null) {
      if (newPrice > previousPriceRef.current) {
        setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'up' }));
      } else if (newPrice < previousPriceRef.current) {
        setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'down' }));
      } else {
        setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'none' }));
      }

      animationTimeoutRef.current = setTimeout(() => {
        setRealtimeState((prev) => ({ ...prev, priceUpdateAnimation: 'none' }));
      }, 500);
    }

    previousPriceRef.current = newPrice;
  }, [clearAnimationTimeout]);

  const handlePriceUpdate = useCallback((updatedPrice: PriceData) => {
    const now = Date.now();
    const latency = now - lastUpdateTimeRef.current;
    lastUpdateTimeRef.current = now;

    setRealtimePrice(updatedPrice);
    setRealtimeState((prev) => ({
      ...prev,
      isConnected: true,
      connectionStatus: 'connected',
      lastUpdateLatency: latency,
    }));

    updatePriceAnimation(updatedPrice.price);

    setHistoricalConfidence((prev) => {
      const newConfidence = updatedPrice.confidence ?? 85;
      const updated = [...prev, newConfidence];
      if (updated.length > 20) {
        return updated.slice(-20);
      }
      return updated;
    });
  }, [updatePriceAnimation]);

  useEffect(() => {
    if (!isOpen) return;

    const pythService = getPythDataService();
    const priceId = PYTH_PRICE_FEED_IDS[priceFeed.name];

    setRealtimeState((prev) => ({
      ...prev,
      connectionStatus: 'connecting',
    }));

    if (priceId) {
      try {
        unsubscribeRef.current = pythService.subscribeToPriceUpdates(
          priceFeed.name,
          handlePriceUpdate
        );
      } catch (error) {
        console.error('Failed to subscribe to price updates:', error);
        setRealtimeState((prev) => ({
          ...prev,
          connectionStatus: 'disconnected',
          isConnected: false,
        }));
      }
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      clearAnimationTimeout();
    };
  }, [isOpen, priceFeed.name, handlePriceUpdate, clearAnimationTimeout]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchPublishers = async () => {
      setIsLoadingPublishers(true);
      try {
        const pythService = getPythDataService();
        const publisherData = await pythService.getPublishers();
        
        const formattedPublishers: Publisher[] = publisherData.map((p: PublisherData) => ({
          id: p.id,
          name: p.name,
          stake: p.submissionCount ?? 0,
          accuracy: (p.reliabilityScore ?? 0.95) * 100,
          lastUpdate: new Date(p.lastUpdate ?? Date.now()).toLocaleTimeString('zh-CN'),
          status: p.status === 'active' ? 'active' : 'inactive',
        }));
        
        setPublishers(formattedPublishers);
      } catch (error) {
        console.error('Failed to fetch publishers:', error);
        const fallbackPublishers: Publisher[] = [
          { id: '1', name: 'Binance', stake: 50000000, accuracy: 99.2, lastUpdate: new Date().toLocaleTimeString('zh-CN'), status: 'active' },
          { id: '2', name: 'OKX', stake: 45000000, accuracy: 99.1, lastUpdate: new Date().toLocaleTimeString('zh-CN'), status: 'active' },
          { id: '3', name: 'Coinbase', stake: 40000000, accuracy: 99.0, lastUpdate: new Date().toLocaleTimeString('zh-CN'), status: 'active' },
          { id: '4', name: 'Kraken', stake: 35000000, accuracy: 98.9, lastUpdate: new Date().toLocaleTimeString('zh-CN'), status: 'active' },
          { id: '5', name: 'Bybit', stake: 30000000, accuracy: 98.8, lastUpdate: new Date().toLocaleTimeString('zh-CN'), status: 'active' },
        ];
        setPublishers(fallbackPublishers);
      } finally {
        setIsLoadingPublishers(false);
      }
    };

    fetchPublishers();
  }, [isOpen]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: t('pyth.priceFeeds.statusActive') || '活跃',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'paused':
        return {
          label: t('pyth.priceFeeds.statusPaused') || '暂停',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          icon: <AlertCircle className="w-4 h-4" />,
        };
      case 'deprecated':
        return {
          label: t('pyth.priceFeeds.statusDeprecated') || '已弃用',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          icon: <AlertCircle className="w-4 h-4" />,
        };
      default:
        return {
          label: status,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          icon: <Activity className="w-4 h-4" />,
        };
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      crypto: t('pyth.priceFeeds.categoryCrypto') || '加密货币',
      forex: t('pyth.priceFeeds.categoryForex') || '外汇',
      commodities: t('pyth.priceFeeds.categoryCommodities') || '大宗商品',
      equities: t('pyth.priceFeeds.categoryEquities') || '股票',
    };
    return labels[category] || category;
  };

  const statusDisplay = getStatusDisplay(priceFeed.status);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{priceFeed.name}</h2>
                <p className="text-sm text-gray-500">
                  {t('pyth.priceFeeds.id') || 'ID'}: {priceFeed.id}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100">
                {realtimeState.isConnected ? (
                  <>
                    <Wifi className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600">
                      {t('pyth.priceFeeds.realtimeConnected') || '实时连接'}
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-medium text-gray-500">
                      {realtimeState.connectionStatus === 'connecting' 
                        ? (t('pyth.priceFeeds.connecting') || '连接中...')
                        : (t('pyth.priceFeeds.disconnected') || '未连接')}
                    </span>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.priceFeeds.currentPrice') || '当前价格'}
                </span>
              </div>
              <p className={cn(
                "text-2xl font-bold text-gray-900 transition-colors duration-300",
                realtimeState.priceUpdateAnimation === 'up' && "text-emerald-600",
                realtimeState.priceUpdateAnimation === 'down' && "text-red-600"
              )}>
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className={`text-xs font-medium mt-1 ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{priceChange.toFixed(4)}%
              </p>
              {realtimeState.isConnected && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {realtimeState.lastUpdateLatency}ms
                </p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.priceFeeds.confidenceInterval') || '置信区间'}
                </span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                {confidenceInterval.widthPercentage.toFixed(4)}%
              </p>
              <div className="flex gap-2 mt-1 text-xs text-gray-500">
                <span>Bid: ${confidenceInterval.bid.toFixed(4)}</span>
                <span>Ask: ${confidenceInterval.ask.toFixed(4)}</span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.priceFeeds.updateFrequency') || '更新频率'}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{priceFeed.updateFrequency}</p>
              <p className="text-xs text-gray-400 mt-1">
                {t('pyth.priceFeeds.realTime') || '实时更新'}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  {t('pyth.priceFeeds.reliability') || '可靠性'}
                </span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{priceFeed.reliability}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {t('pyth.priceFeeds.last30Days') || '近30天'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-violet-50 p-4 rounded-lg">
              <p className="text-sm text-violet-600 mb-1">
                {t('pyth.priceFeeds.category') || '类别'}
              </p>
              <p className="text-base font-semibold text-violet-900">
                {getCategoryLabel(priceFeed.category)}
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 mb-1">
                {t('pyth.priceFeeds.deviationThreshold') || '偏差阈值'}
              </p>
              <p className="text-base font-semibold text-blue-900">
                {priceFeed.deviationThreshold}
              </p>
            </div>
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-emerald-600 mb-1">
                {t('pyth.priceFeeds.totalRequests') || '总请求数'}
              </p>
              <p className="text-base font-semibold text-emerald-900">
                {(priceFeed.totalRequests / 1e6).toFixed(1)}M
              </p>
            </div>
            <div className={`p-4 rounded-lg ${statusDisplay.bgColor}`}>
              <p className={`text-sm mb-1 ${statusDisplay.color}`}>
                {t('pyth.priceFeeds.status') || '状态'}
              </p>
              <div className="flex items-center gap-1.5">
                {statusDisplay.icon}
                <span className={`text-base font-semibold ${statusDisplay.color}`}>
                  {statusDisplay.label}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t('pyth.priceFeeds.confidenceVisualization') || '置信区间可视化'}
            </h3>
            <ConfidenceIntervalChart
              price={currentPrice}
              confidenceInterval={confidenceInterval}
              historicalConfidence={historicalConfidence}
              showTrend={true}
              height={100}
              themeColor={chartColors.oracle.pyth}
            />
          </div>

          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-base font-semibold text-gray-900 mb-4">
              {t('pyth.priceFeeds.priceHistory') || '价格历史'}
            </h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors.recharts.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColors.recharts.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    dataKey="time"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    minTickGap={30}
                  />
                  <YAxis
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickFormatter={(value) => `$${value.toLocaleString()}`}
                    width={80}
                    domain={['auto', 'auto']}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    name={t('pyth.priceFeeds.price') || '价格'}
                    stroke={chartColors.recharts.primary}
                    strokeWidth={2}
                    fill="url(#priceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                {t('pyth.priceFeeds.publishers') || '贡献发布者'}
              </h3>
              {isLoadingPublishers && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  {t('pyth.priceFeeds.loading') || '加载中...'}
                </span>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.priceFeeds.publisherName') || '名称'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.priceFeeds.publisherStake') || '提交数'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.priceFeeds.publisherAccuracy') || '准确率'}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.priceFeeds.lastUpdate') || '最后更新'}
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('pyth.priceFeeds.publisherStatus') || '状态'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {publishers.map((publisher) => (
                    <tr key={publisher.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{publisher.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {(publisher.stake / 1e6).toFixed(1)}M
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{publisher.accuracy.toFixed(2)}%</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{publisher.lastUpdate}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            publisher.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {publisher.status === 'active' ? '活跃' : '不活跃'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              {t('pyth.priceFeeds.totalPublishers') || '总计'} {publishers.length} {t('pyth.priceFeeds.publishersCount') || '个发布者'}
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="bg-violet-50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-violet-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-violet-900">
                    {t('pyth.priceFeeds.feedInfo') || '价格源信息'}
                  </h4>
                  <p className="text-sm text-violet-700 mt-1">
                    {t('pyth.priceFeeds.feedInfoDesc') ||
                      '该价格源由多个受信任的发布者提供数据，采用置信区间机制确保价格准确性。数据更新基于偏差阈值和时间间隔双重触发。'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors rounded-md"
            >
              {t('pyth.priceFeeds.close') || '关闭'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
