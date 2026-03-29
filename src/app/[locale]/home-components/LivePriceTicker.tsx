'use client';

import { useState, useEffect, useMemo } from 'react';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

import { useLocale, useTranslations } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { chartColors, getChartColor } from '@/lib/chartColors';
import { semanticColors } from '@/lib/config/colors';
import { formatPrice } from '@/lib/utils/chartSharedUtils';

interface TradingPair {
  symbol: string;
  name: string;
  basePrice: number;
  volatility: number;
}

const TRADING_PAIRS: TradingPair[] = [
  { symbol: 'BTC', name: 'Bitcoin', basePrice: 67432.15, volatility: 0.02 },
  { symbol: 'ETH', name: 'Ethereum', basePrice: 3521.87, volatility: 0.025 },
  { symbol: 'LINK', name: 'Chainlink', basePrice: 18.45, volatility: 0.03 },
  { symbol: 'SOL', name: 'Solana', basePrice: 142.63, volatility: 0.035 },
  { symbol: 'AVAX', name: 'Avalanche', basePrice: 38.92, volatility: 0.032 },
  { symbol: 'MATIC', name: 'Polygon', basePrice: 0.58, volatility: 0.028 },
  { symbol: 'UNI', name: 'Uniswap', basePrice: 9.24, volatility: 0.03 },
  { symbol: 'AAVE', name: 'Aave', basePrice: 112.45, volatility: 0.027 },
];

interface SparklineDataPoint {
  value: number;
}

interface TickerPriceData {
  currentPrice: number;
  change24h: number;
  sparklineData: SparklineDataPoint[];
}

const generatePriceData = (pair: TradingPair): TickerPriceData => {
  const dataPoints = 24;
  const sparklineData: SparklineDataPoint[] = [];
  let currentPrice = pair.basePrice;

  for (let i = 0; i < dataPoints; i++) {
    const change = (Math.random() - 0.5) * pair.volatility;
    currentPrice = currentPrice * (1 + change);
    sparklineData.push({ value: currentPrice });
  }

  const startPrice = sparklineData[0].value;
  const endPrice = sparklineData[sparklineData.length - 1].value;
  const change24h = ((endPrice - startPrice) / startPrice) * 100;

  return {
    currentPrice: endPrice,
    change24h,
    sparklineData,
  };
};

const formatChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

interface TickerItemProps {
  pair: TradingPair;
  priceData: TickerPriceData;
}

function TickerItem({ pair, priceData }: TickerItemProps) {
  const locale = useLocale();
  const isZh = isChineseLocale(locale);
  const isPositive = priceData.change24h >= 0;
  const color = isPositive ? semanticColors.success.main : semanticColors.danger.main;

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 min-w-[240px] sm:min-w-[280px]">
      <div className="flex items-center gap-2 sm:gap-3 min-w-[80px] sm:min-w-[100px]">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs sm:text-sm flex-shrink-0 rounded-md">
          {pair.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">{pair.symbol}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 truncate">
            {isZh ? pair.name : pair.name}
          </div>
        </div>
      </div>

      <div className="min-w-[70px] sm:min-w-[90px]">
        <div className="font-bold text-gray-900 text-sm sm:text-base">
          ${formatPrice(priceData.currentPrice)}
        </div>
        <div
          className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium ${isPositive ? 'text-success-600' : 'text-danger-600'}`}
        >
          {isPositive ? (
            <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          ) : (
            <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          )}
          <span>{formatChange(priceData.change24h)}</span>
        </div>
      </div>

      <div className="w-16 h-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={priceData.sparklineData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function LivePriceTicker() {
  const t = useTranslations('ui.livePrice');
  const locale = useLocale();
  const isZh = isChineseLocale(locale);
  const [isPaused, setIsPaused] = useState(false);
  const [priceDataMap, setPriceDataMap] = useState<Map<string, TickerPriceData>>(new Map());

  useEffect(() => {
    const initialData = new Map<string, TickerPriceData>();
    TRADING_PAIRS.forEach((pair) => {
      initialData.set(pair.symbol, generatePriceData(pair));
    });
    setPriceDataMap(initialData);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPriceDataMap((prev) => {
        const newMap = new Map(prev);
        TRADING_PAIRS.forEach((pair) => {
          const currentData = newMap.get(pair.symbol);
          if (currentData) {
            const change = (Math.random() - 0.48) * pair.volatility * 0.1;
            const newPrice = currentData.currentPrice * (1 + change);
            const newSparkline = [...currentData.sparklineData.slice(1), { value: newPrice }];
            const startPrice = newSparkline[0].value;
            const newChange24h = ((newPrice - startPrice) / startPrice) * 100;

            newMap.set(pair.symbol, {
              currentPrice: newPrice,
              change24h: newChange24h,
              sparklineData: newSparkline,
            });
          }
        });
        return newMap;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const duplicatedPairs = useMemo(() => [...TRADING_PAIRS, ...TRADING_PAIRS], []);

  return (
    <div className="w-full bg-slate-50 border-y border-slate-200 py-4 overflow-hidden">
      <div className="px-6 lg:px-12 xl:px-20 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500"></span>
          </div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {t('livePrice.title')}
          </span>
        </div>
      </div>

      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

        <div
          className={`flex gap-3 ${isPaused ? '' : 'animate-scroll-ticker'}`}
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {duplicatedPairs.map((pair, index) => {
            const priceData = priceDataMap.get(pair.symbol);
            if (!priceData) return null;

            return <TickerItem key={`${pair.symbol}-${index}`} pair={pair} priceData={priceData} />;
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll-ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-ticker {
          animation: scroll-ticker 26s linear infinite;
        }
      `}</style>
    </div>
  );
}
