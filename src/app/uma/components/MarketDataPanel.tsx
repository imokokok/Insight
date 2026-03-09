'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { UMAClient } from '@/lib/oracles/uma';
import { Blockchain } from '@/lib/types/oracle';

const umaClient = new UMAClient();

// 模拟市场数据
const mockMarketData = {
  marketCap: 650000000, // $650M
  volume24h: 25000000, // $25M
  circulatingSupply: 76000000, // 76M UMA
  totalSupply: 100000000, // 100M UMA
  fullyDilutedValuation: 850000000, // $850M
  marketCapRank: 89,
  high24h: 8.85,
  low24h: 8.15,
  change24h: 3.2, // +3.2%
  change24hValue: 0.26,
};

// 格式化货币
function formatCurrency(value: number, compact: boolean = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

// 格式化数量
function formatNumber(value: number, compact: boolean = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value);
}

// 价格显示组件
function PriceDisplay({ price, previousPrice }: { price: number; previousPrice: number }) {
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (price === previousPrice) return;

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule state updates in a microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      setFlashColor(price > previousPrice ? 'green' : 'red');
      setIsAnimating(true);
    });

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
    </div>
  );
}

// 24h 涨跌幅组件
function PriceChangeIndicator({
  change,
  changeValue,
  high24h,
  low24h,
}: {
  change: number;
  changeValue: number;
  high24h: number;
  low24h: number;
}) {
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 涨跌幅主显示 */}
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-lg ${
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

      {/* 24h 最高最低价 */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">24h High</span>
          <span className="text-green-600 font-medium">${high24h.toFixed(2)}</span>
        </div>
        <div className="w-px h-4 bg-gray-300" />
        <div className="flex items-center gap-2">
          <span className="text-gray-500">24h Low</span>
          <span className="text-red-600 font-medium">${low24h.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

// 市场数据指标卡片
function MetricCard({
  label,
  value,
  subValue,
  icon,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">{label}</p>
          <p className="text-gray-900 text-lg font-semibold">{value}</p>
          {subValue && <p className="text-gray-400 text-xs mt-1">{subValue}</p>}
        </div>
        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">{icon}</div>
      </div>
    </div>
  );
}

// 主市场数据面板组件
export function MarketDataPanel() {
  const [price, setPrice] = useState<number>(8.5);
  const [previousPrice, setPreviousPrice] = useState<number>(8.5);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取实时价格
  const fetchPrice = useCallback(async () => {
    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const priceData = await umaClient.getPrice('UMA', Blockchain.ETHEREUM);

      // 检查是否已取消
      if (abortController.signal.aborted) return;

      setPreviousPrice((prev) => (prev !== price ? price : prev));
      setPrice(priceData.price);
      setLastUpdated(new Date());
    } catch (error) {
      // 检查是否是取消错误
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error fetching UMA price:', error);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [price]);

  // 初始加载和定时更新
  useEffect(() => {
    fetchPrice();

    // 每 10 秒更新一次价格
    intervalRef.current = setInterval(fetchPrice, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrice]);

  // 计算流通供应量占比
  const circulatingRatio = (mockMarketData.circulatingSupply / mockMarketData.totalSupply) * 100;

  // 市场数据指标
  const metrics = [
    {
      label: 'Market Cap',
      value: formatCurrency(mockMarketData.marketCap, true),
      subValue: `Rank #${mockMarketData.marketCapRank}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Volume (24h)',
      value: formatCurrency(mockMarketData.volume24h, true),
      subValue: `${((mockMarketData.volume24h / mockMarketData.marketCap) * 100).toFixed(2)}% of MCap`,
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
      label: 'Circulating Supply',
      value: `${formatNumber(mockMarketData.circulatingSupply, true)} UMA`,
      subValue: `${circulatingRatio.toFixed(1)}% of total supply`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      label: 'Fully Diluted Valuation',
      value: formatCurrency(mockMarketData.fullyDilutedValuation, true),
      subValue: `At current price`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      label: 'Market Cap Rank',
      value: `#${mockMarketData.marketCapRank}`,
      subValue: 'Among all cryptocurrencies',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
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
      subValue: `${formatNumber(mockMarketData.circulatingSupply, true)} / ${formatNumber(mockMarketData.totalSupply, true)}`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
          />
          <path
            strokeLinecap="round"
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
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
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
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading market data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      {/* 头部：代币信息和最后更新时间 */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/25">
            <span className="text-white font-bold text-xl">UMA</span>
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">UMA Protocol</h2>
            <p className="text-gray-500 text-sm">UMA / USD</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Last updated</p>
          <p className="text-gray-700 text-sm font-mono">{lastUpdated.toLocaleTimeString()}</p>
        </div>
      </div>

      {/* 价格显示和涨跌幅 */}
      <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-8">
        <PriceDisplay price={price} previousPrice={previousPrice} />
        <PriceChangeIndicator
          change={mockMarketData.change24h}
          changeValue={mockMarketData.change24hValue}
          high24h={mockMarketData.high24h}
          low24h={mockMarketData.low24h}
        />
      </div>

      {/* 市场数据指标网格 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
}
