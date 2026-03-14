'use client';

import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { semanticColors } from '@/lib/config/colors';

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

interface PriceDataPoint {
  value: number;
}

interface PriceData {
  currentPrice: number;
  change24h: number;
  sparklineData: PriceDataPoint[];
}

const generatePriceData = (pair: TradingPair): PriceData => {
  const dataPoints = 24;
  const sparklineData: PriceDataPoint[] = [];
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

// 单个交易对卡片组件
interface TickerItemProps {
  pair: TradingPair;
  priceData: PriceData;
}

function TickerItem({ pair, priceData }: TickerItemProps) {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const isPositive = priceData.change24h >= 0;
  const color = isPositive ? semanticColors.success.main : semanticColors.danger.main;

  return (
    <div className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 bg-white/50 backdrop-blur-sm rounded-xl border border-gray-200/50 hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 min-w-[240px] sm:min-w-[280px]">
      {/* 币种图标和名称 */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-[80px] sm:min-w-[100px]">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md flex-shrink-0">
          {pair.symbol.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">{pair.symbol}</div>
          <div className="text-[10px] sm:text-xs text-gray-500 truncate">{isZh ? pair.name : pair.name}</div>
        </div>
      </div>

      {/* 价格 */}
      <div className="min-w-[70px] sm:min-w-[90px]">
        <div className="font-bold text-gray-900 text-sm sm:text-base">
          ${formatPrice(priceData.currentPrice)}
        </div>
        <div
          className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}
        >
          {isPositive ? <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
          <span>{formatChange(priceData.change24h)}</span>
        </div>
      </div>

      {/* 迷你走势图 */}
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
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [isPaused, setIsPaused] = useState(false);
  const [priceDataMap, setPriceDataMap] = useState<Map<string, PriceData>>(new Map());

  // 初始化价格数据
  useEffect(() => {
    const initialData = new Map<string, PriceData>();
    TRADING_PAIRS.forEach((pair) => {
      initialData.set(pair.symbol, generatePriceData(pair));
    });
    setPriceDataMap(initialData);
  }, []);

  // 模拟实时更新
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

  // 复制数据以实现无缝滚动
  const duplicatedPairs = useMemo(() => [...TRADING_PAIRS, ...TRADING_PAIRS], []);

  return (
    <div className="w-full bg-gradient-to-r from-slate-50 via-white to-slate-50 border-y border-gray-200/50 py-4 overflow-hidden">
      {/* 标题 */}
      <div className="px-6 lg:px-12 xl:px-20 mb-3">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {isZh ? '实时价格' : 'Live Prices'}
          </span>
        </div>
      </div>

      {/* 滚动容器 */}
      <div
        className="relative overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* 渐变遮罩 */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

        {/* 滚动内容 */}
        <div
          className={`flex gap-4 ${isPaused ? '' : 'animate-scroll-ticker'}`}
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

      {/* CSS 动画 */}
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
          animation: scroll-ticker 40s linear infinite;
        }
      `}</style>
    </div>
  );
}
