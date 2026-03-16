'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseOracleClient } from '@/lib/oracles/base';
import { Blockchain, OracleProvider, ConfidenceInterval } from '@/types/oracle';
import { MetricCard } from '../common/DashboardCard';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { ConfidenceIntervalDisplay } from '../common/ConfidenceIntervalDisplay';
import { useTranslations } from 'next-intl';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MarketDataPanel');

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
  const t = useTranslations();
  const isPositive = change >= 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 font-semibold text-base border ${
            isPositive
              ? 'bg-green-50 text-green-600 border-green-200'
              : 'bg-red-50 text-red-600 border-red-200'
          }`}
        >
          <span className="text-lg">{isPositive ? '↑' : '↓'}</span>
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

      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">{t('marketDataPanel.24hHigh')}</span>
          <span className="text-green-600 font-medium">${high24h.toFixed(2)}</span>
        </div>
        <div className="w-px h-3 bg-gray-300" />
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">{t('marketDataPanel.24hLow')}</span>
          <span className="text-red-600 font-medium">${low24h.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function EMADisplay({
  emaData,
  selectedPeriod,
  onPeriodChange,
}: {
  emaData: EMAData[];
  selectedPeriod: EMAPeriod;
  onPeriodChange: (period: EMAPeriod) => void;
}) {
  const t = useTranslations();
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
    <div className="bg-purple-50 border border-purple-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-purple-600"
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
              className={`px-2 py-0.5 text-xs font-medium border transition-all ${
                selectedPeriod === period
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-purple-600 border-purple-200 hover:border-purple-400'
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
            <p className="text-xs text-purple-600 mb-0.5">{`${selectedEMA.period}D EMA`}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-purple-900">
                ${selectedEMA.value.toFixed(2)}
              </span>
              <span className={`text-xs font-medium ${trendColors[selectedEMA.trend]}`}>
                {trendIcons[selectedEMA.trend]} {t(`pythNetwork.ema.trend.${selectedEMA.trend}`)}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-purple-600 mb-0.5">{t('pythNetwork.ema.description')}</p>
            <p className="text-xs text-purple-800">{t('pythNetwork.ema.calculationMethod')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface MarketDataPanelProps {
  client: BaseOracleClient;
  chain?: Blockchain;
  config: MarketDataConfig;
  iconBgColor?: string;
  icon?: React.ReactNode;
}

export function MarketDataPanel({
  client,
  chain,
  config,
  iconBgColor = 'bg-blue-600',
  icon,
}: MarketDataPanelProps) {
  const t = useTranslations();
  const [price, setPrice] = useState<number>(config.change24hValue);
  const [confidenceInterval, setConfidenceInterval] = useState<ConfidenceInterval | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [emaPeriod, setEmaPeriod] = useState<EMAPeriod>(7);
  const [emaData, setEmaData] = useState<EMAData[]>([]);
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
      setConfidenceInterval(priceData.confidenceInterval || null);
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
      label: t('marketDataPanel.marketCap'),
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
      label: t('marketDataPanel.volume24h'),
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
      label: t('marketDataPanel.circulatingSupply'),
      value: `${formatNumber(config.circulatingSupply, true)} ${config.tokenSymbol}`,
      subValue: `${circulatingRatio.toFixed(1)}% ${t('marketDataPanel.ofTotalSupply')}`,
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
      label: t('marketDataPanel.fullyDilutedValuation'),
      value: formatCurrency(config.fullyDilutedValuation, true),
      subValue: t('marketDataPanel.atCurrentPrice'),
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
      label: t('marketDataPanel.marketCapRank'),
      value: `#${config.marketCapRank}`,
      subValue: t('marketDataPanel.amongAllCryptocurrencies'),
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
      label: t('marketDataPanel.supplyRatio'),
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
      <div className="bg-white border border-gray-200 p-6">
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
            <span>{t('marketDataPanel.loading')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className={`w-12 h-12 ${iconBgColor} flex items-center justify-center`}>
              {icon}
            </div>
          ) : (
            <div className={`w-12 h-12 ${iconBgColor} flex items-center justify-center`}>
              <span className="text-white font-bold text-xl">{config.tokenSymbol}</span>
            </div>
          )}
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{config.tokenName}</h2>
            <p className="text-gray-500 text-sm">{config.tokenSymbol} / USD</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs">{t('marketDataPanel.lastUpdated')}</p>
          <p className="text-gray-700 text-sm font-mono">{lastUpdated.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-4">
        <div className="flex flex-col flex-1 min-w-0">
          <PriceDisplay price={price} />
          {client.name === OracleProvider.PYTH && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
              {confidenceInterval && (
                <ConfidenceIntervalDisplay
                  confidenceInterval={confidenceInterval}
                  price={price}
                  warningThreshold={0.5}
                />
              )}
              {emaData.length > 0 && (
                <EMADisplay
                  emaData={emaData}
                  selectedPeriod={emaPeriod}
                  onPeriodChange={setEmaPeriod}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex-shrink-0">
          <PriceChangeIndicator
            change={config.change24h}
            changeValue={config.change24hValue}
            high24h={config.high24h}
            low24h={config.low24h}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
}

export type { MarketDataConfig };
