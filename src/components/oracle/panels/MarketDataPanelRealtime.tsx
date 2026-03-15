'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BaseOracleClient } from '@/lib/oracles/base';
import { Blockchain, OracleProvider } from '@/types/oracle';
import { MetricCard } from '../common/DashboardCard';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { useI18n } from '@/lib/i18n/provider';
import { createLogger } from '@/lib/utils/logger';
import { useAPI3Price } from '@/hooks/useAPI3WebSocket';
import { API3PriceData } from '@/lib/services/api3WebSocket';

const logger = createLogger('MarketDataPanelRealtime');

type EMAPeriod = 7 | 14 | 30;

interface EMAData {
  period: EMAPeriod;
  value: number;
  trend: 'up' | 'down' | 'neutral';
}

interface MarketDataConfig {
  symbol: string;
  tokenName: string;
  tokenSymbol: string;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  totalSupply: number;
  fullyDilutedValuation: number;
  marketCapRank: number;
  high24h: number;
  low24h: number;
  change24h: number;
  change24hValue: number;
}

// 实时价格显示组件（带闪烁动画）
function RealtimePriceDisplay({
  price,
  previousPrice,
  change24h,
}: {
  price: number;
  previousPrice: number | null;
  change24h?: number;
}) {
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (previousPrice === null || price === previousPrice) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 设置闪烁颜色
    Promise.resolve().then(() => {
      setFlashColor(price > previousPrice ? 'green' : 'red');
      setIsAnimating(true);
    });

    // 500ms后停止闪烁
    timeoutRef.current = setTimeout(() => {
      setFlashColor(null);
      setIsAnimating(false);
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [price, previousPrice]);

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-baseline gap-1">
        <span className="text-gray-400 text-3xl font-light">$</span>
        <span
          className={`text-6xl md:text-7xl font-bold tracking-tight transition-all duration-300 ${
            flashColor === 'green'
              ? 'text-green-600 scale-105'
              : flashColor === 'red'
                ? 'text-red-600 scale-105'
                : 'text-gray-900'
          } ${isAnimating ? 'scale-105' : 'scale-100'}`}
        >
          {price.toFixed(2)}
        </span>
      </div>
      {change24h !== undefined && (
        <div
          className={`mt-2 px-3 py-1  text-sm font-medium transition-all duration-300 ${
            change24h >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {change24h >= 0 ? '↑' : '↓'} {change24h >= 0 ? '+' : ''}
          {change24h.toFixed(2)}% (24h)
        </div>
      )}
    </div>
  );
}

// WebSocket 连接状态指示器
function WebSocketStatusIndicator({
  status,
  lastUpdate,
}: {
  status: string;
  lastUpdate: Date | null;
}) {
  const statusConfig = {
    connected: {
      color: 'bg-green-500',
      text: 'WebSocket 已连接',
      animate: '',
      icon: '●',
    },
    connecting: {
      color: 'bg-yellow-500',
      text: '连接中...',
      animate: 'animate-pulse',
      icon: '◐',
    },
    reconnecting: {
      color: 'bg-orange-500',
      text: '重连中...',
      animate: 'animate-pulse',
      icon: '◑',
    },
    disconnected: {
      color: 'bg-gray-400',
      text: '已断开',
      animate: '',
      icon: '○',
    },
    error: {
      color: 'bg-red-500',
      text: '连接错误',
      animate: '',
      icon: '✕',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.disconnected;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50  border border-gray-200">
      <span className={`text-sm ${config.color.replace('bg-', 'text-')} ${config.animate}`}>
        {config.icon}
      </span>
      <span className="text-xs text-gray-600">{config.text}</span>
      {lastUpdate && (
        <span className="text-xs text-gray-400">· {lastUpdate.toLocaleTimeString()}</span>
      )}
    </div>
  );
}

// 价格变动指示器
function PriceChangeIndicator({
  change,
  changeValue,
  high24h,
  low24h,
  realtimeHigh,
  realtimeLow,
}: {
  change: number;
  changeValue: number;
  high24h: number;
  low24h: number;
  realtimeHigh?: number;
  realtimeLow?: number;
}) {
  const isPositive = change >= 0;
  const displayHigh = realtimeHigh || high24h;
  const displayLow = realtimeLow || low24h;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-4 py-2  font-semibold text-lg ${
            isPositive
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}
        >
          <span className="text-xl">{isPositive ? '↑' : '↓'}</span>
          <span>
            {isPositive ? '+' : ''}
            {change.toFixed(2)}%
          </span>
        </div>
        <div className="text-gray-500 text-sm">
          <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
            {isPositive ? '+' : ''}${changeValue.toFixed(2)}
          </span>
          <span className="ml-1">(24h)</span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">24h High</span>
          <span className="text-green-600 font-medium">${displayHigh.toFixed(2)}</span>
          {realtimeHigh && realtimeHigh > high24h && (
            <span className="text-xs text-green-500 animate-pulse">新</span>
          )}
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-2">
          <span className="text-gray-500">24h Low</span>
          <span className="text-red-600 font-medium">${displayLow.toFixed(2)}</span>
          {realtimeLow && realtimeLow < low24h && (
            <span className="text-xs text-red-500 animate-pulse">新</span>
          )}
        </div>
      </div>
    </div>
  );
}

// EMA 显示组件
function EMADisplay({
  emaData,
  selectedPeriod,
  onPeriodChange,
}: {
  emaData: EMAData[];
  selectedPeriod: EMAPeriod;
  onPeriodChange: (period: EMAPeriod) => void;
}) {
  const { t } = useI18n();
  const selectedEMA = emaData.find((ema) => ema.period === selectedPeriod);

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <div className="bg-gray-100 border border-gray-200 border border-purple-200  p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          <span className="text-sm font-semibold text-purple-900">
            {t('pythNetwork.ema.title')}
          </span>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30].map((period) => (
            <button
              key={period}
              onClick={() => onPeriodChange(period as EMAPeriod)}
              className={`px-3 py-1 text-xs font-medium  transition-all ${
                selectedPeriod === period
                  ? 'bg-purple-600 text-white '
                  : 'bg-white text-purple-600 hover:bg-purple-100'
              }`}
            >
              {period}D
            </button>
          ))}
        </div>
      </div>

      {selectedEMA && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-purple-600 mb-1">{`${selectedEMA.period}D EMA`}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-900">
                ${selectedEMA.value.toFixed(2)}
              </span>
              <span className={`text-sm font-medium ${trendColors[selectedEMA.trend]}`}>
                {trendIcons[selectedEMA.trend]} {t(`pythNetwork.ema.trend.${selectedEMA.trend}`)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-purple-600 mb-1">{t('pythNetwork.ema.description')}</p>
            <p className="text-sm text-purple-800">{t('pythNetwork.ema.calculationMethod')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MarketDataPanelRealtimeProps {
  client: BaseOracleClient;
  chain?: Blockchain;
  config: MarketDataConfig;
  iconBgColor?: string;
  enableRealtime?: boolean;
  updateInterval?: number;
}

export function MarketDataPanelRealtime({
  client,
  chain,
  config,
  iconBgColor = 'bg-blue-600',
  enableRealtime = true,
  updateInterval = 1000,
}: MarketDataPanelRealtimeProps) {
  const [price, setPrice] = useState<number>(config.change24hValue);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [emaPeriod, setEmaPeriod] = useState<EMAPeriod>(7);
  const [emaData, setEmaData] = useState<EMAData[]>([]);
  const [realtimeHigh, setRealtimeHigh] = useState<number | undefined>();
  const [realtimeLow, setRealtimeLow] = useState<number | undefined>();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousPriceRef = useRef<number | null>(null);

  // API3 WebSocket 实时价格
  const {
    priceData: realtimePriceData,
    status: wsStatus,
    lastUpdate: wsLastUpdate,
  } = useAPI3Price({
    symbol: config.symbol,
    enabled: enableRealtime,
    updateInterval,
    onPriceUpdate: (data) => {
      handleRealtimePriceUpdate(data);
    },
  });

  // 处理实时价格更新
  const handleRealtimePriceUpdate = useCallback(
    (data: API3PriceData) => {
      previousPriceRef.current = price;
      setPrice(data.price);
      setLastUpdated(new Date(data.timestamp));

      // 更新实时高低价
      if (data.high24h !== undefined) {
        setRealtimeHigh((prev) => (prev ? Math.max(prev, data.high24h!) : data.high24h));
      }
      if (data.low24h !== undefined) {
        setRealtimeLow((prev) => (prev ? Math.min(prev, data.low24h!) : data.low24h));
      }
    },
    [price]
  );

  // 初始数据获取（当 WebSocket 不可用时作为后备）
  const fetchPrice = useCallback(async () => {
    if (enableRealtime && wsStatus === 'connected') {
      // WebSocket 已连接，跳过 HTTP 请求
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const priceData = await client.getPrice(config.symbol, chain);

      if (abortController.signal.aborted) return;

      previousPriceRef.current = price;
      setPrice(priceData.price);
      setLastUpdated(new Date());

      if (client.name === OracleProvider.PYTH) {
        const multiplier = priceData.price * (1 + (Math.random() - 0.5) * 0.02);
        const ema7 = priceData.price * (1 + (Math.random() - 0.5) * 0.01);
        const ema14 = priceData.price * (1 + (Math.random() - 0.5) * 0.015);
        const ema30 = priceData.price * (1 + (Math.random() - 0.5) * 0.02);

        const calculateTrend = (ema: number, currentPrice: number): 'up' | 'down' | 'neutral' => {
          const diff = ((ema - currentPrice) / currentPrice) * 100;
          if (diff > 0.5) return 'up';
          if (diff < -0.5) return 'down';
          return 'neutral';
        };

        setEmaData([
          { period: 7, value: ema7, trend: calculateTrend(ema7, priceData.price) },
          { period: 14, value: ema14, trend: calculateTrend(ema14, priceData.price) },
          { period: 30, value: ema30, trend: calculateTrend(ema30, priceData.price) },
        ]);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      logger.error(
        'Error fetching price',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [client, config.symbol, chain, enableRealtime, wsStatus, price]);

  // 初始加载和定时刷新（作为 WebSocket 的后备）
  useEffect(() => {
    fetchPrice();

    // 只有当 WebSocket 未连接时才使用轮询
    intervalRef.current = setInterval(() => {
      if (!enableRealtime || wsStatus !== 'connected') {
        fetchPrice();
      }
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrice, enableRealtime, wsStatus]);

  // 当 WebSocket 连接成功时停止加载状态
  useEffect(() => {
    if (enableRealtime && wsStatus === 'connected' && realtimePriceData) {
      setIsLoading(false);
    }
  }, [enableRealtime, wsStatus, realtimePriceData]);

  const circulatingRatio = (config.circulatingSupply / config.totalSupply) * 100;

  const metrics = [
    {
      label: 'Market Cap',
      value: formatCurrency(config.marketCap, true),
      subValue: `Rank #${config.marketCapRank}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Volume (24h)',
      value: formatCurrency(config.volume24h, true),
      subValue: `${((config.volume24h / config.marketCap) * 100).toFixed(2)}% of MCap`,
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
      label: 'Circulating Supply',
      value: `${formatNumber(config.circulatingSupply, true)} ${config.tokenSymbol}`,
      subValue: `${circulatingRatio.toFixed(1)}% of total supply`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      label: 'Fully Diluted Valuation',
      value: formatCurrency(config.fullyDilutedValuation, true),
      subValue: 'At current price',
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
      label: 'Market Cap Rank',
      value: `#${config.marketCapRank}`,
      subValue: 'Among all cryptocurrencies',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
    },
    {
      label: 'Supply Ratio',
      value: `${circulatingRatio.toFixed(1)}%`,
      subValue: `${formatNumber(config.circulatingSupply, true)} / ${formatNumber(config.totalSupply, true)}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
          />
          <path
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
          />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200  p-6">
        <div className="flex items-center justify-center h-48">
          <div className="flex items-center gap-2 text-gray-400">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <circle className="opacity-75" fill="currentColor" cx="12" cy="12" r="10" />
            </svg>
            <span>Loading market data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200  p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${iconBgColor}  flex items-center justify-center `}>
            <span className="text-white font-bold text-xl">{config.tokenSymbol}</span>
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{config.tokenName}</h2>
            <p className="text-gray-500 text-sm">{config.tokenSymbol} / USD</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {enableRealtime && (
            <WebSocketStatusIndicator status={wsStatus} lastUpdate={wsLastUpdate} />
          )}
          <p className="text-gray-400 text-xs">Last updated</p>
          <p className="text-gray-700 text-sm font-mono">{lastUpdated.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-8">
        <div className="flex flex-col">
          {enableRealtime ? (
            <RealtimePriceDisplay
              price={price}
              previousPrice={previousPriceRef.current}
              change24h={realtimePriceData?.change24h || config.change24h}
            />
          ) : (
            <div className="flex flex-col items-start">
              <div className="flex items-baseline gap-1">
                <span className="text-gray-400 text-3xl font-light">$</span>
                <span className="text-6xl md:text-7xl font-bold tracking-tight text-gray-900">
                  {price.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {client.name === OracleProvider.PYTH && emaData.length > 0 && (
            <EMADisplay
              emaData={emaData}
              selectedPeriod={emaPeriod}
              onPeriodChange={setEmaPeriod}
            />
          )}
        </div>
        <PriceChangeIndicator
          change={config.change24h}
          changeValue={config.change24hValue}
          high24h={config.high24h}
          low24h={config.low24h}
          realtimeHigh={realtimeHigh}
          realtimeLow={realtimeLow}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* 实时数据指示器 */}
      {enableRealtime && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500  animate-pulse" />
              <span className="text-gray-600">实时数据推送已启用</span>
            </div>
            <div className="text-gray-400 text-xs">
              数据来源: API3 WebSocket
              {realtimePriceData && (
                <span className="ml-2">· 延迟: {Date.now() - realtimePriceData.timestamp}ms</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export type { MarketDataConfig };
export default MarketDataPanelRealtime;
