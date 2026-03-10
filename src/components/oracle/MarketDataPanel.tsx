'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseOracleClient } from '@/lib/oracles/base';
import { Blockchain } from '@/lib/types/oracle';
import { MetricCard } from './DashboardCard';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

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

function PriceDisplay({ price }: { price: number }) {
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPriceRef = useRef<number>(price);

  useEffect(() => {
    if (price === previousPriceRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    Promise.resolve().then(() => {
      setFlashColor(price > previousPriceRef.current ? 'green' : 'red');
      setIsAnimating(true);
    });

    timeoutRef.current = setTimeout(() => {
      setFlashColor(null);
      setIsAnimating(false);
    }, 500);

    previousPriceRef.current = price;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [price]);

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

interface MarketDataPanelProps {
  client: BaseOracleClient;
  chain?: Blockchain;
  config: MarketDataConfig;
  iconBgColor?: string;
}

export function MarketDataPanel({
  client,
  chain,
  config,
  iconBgColor = 'bg-blue-600',
}: MarketDataPanelProps) {
  const [price, setPrice] = useState<number>(config.change24hValue);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const priceRef = useRef<number>(config.change24hValue);

  const fetchPrice = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const priceData = await client.getPrice(config.symbol, chain);

      if (abortController.signal.aborted) return;

      priceRef.current = priceData.price;
      setPrice(priceData.price);
      setLastUpdated(new Date());
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('Error fetching price:', error);
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [client, config.symbol, chain]);

  useEffect(() => {
    fetchPrice();

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

  const circulatingRatio = (config.circulatingSupply / config.totalSupply) * 100;

  const metrics = [
    {
      label: 'Market Cap',
      value: formatCurrency(config.marketCap, true),
      subValue: `Rank #${config.marketCapRank}`,
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
      value: formatCurrency(config.volume24h, true),
      subValue: `${((config.volume24h / config.marketCap) * 100).toFixed(2)}% of MCap`,
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
      value: `${formatNumber(config.circulatingSupply, true)} ${config.tokenSymbol}`,
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
      value: formatCurrency(config.fullyDilutedValuation, true),
      subValue: 'At current price',
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
      value: `#${config.marketCapRank}`,
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
      subValue: `${formatNumber(config.circulatingSupply, true)} / ${formatNumber(config.totalSupply, true)}`,
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
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 ${iconBgColor} rounded-xl flex items-center justify-center shadow-lg`}
          >
            <span className="text-white font-bold text-xl">{config.tokenSymbol}</span>
          </div>
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{config.tokenName}</h2>
            <p className="text-gray-500 text-sm">{config.tokenSymbol} / USD</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">Last updated</p>
          <p className="text-gray-700 text-sm font-mono">{lastUpdated.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end gap-6 mb-8">
        <PriceDisplay price={price} />
        <PriceChangeIndicator
          change={config.change24h}
          changeValue={config.change24hValue}
          high24h={config.high24h}
          low24h={config.low24h}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
}

export type { MarketDataConfig };
