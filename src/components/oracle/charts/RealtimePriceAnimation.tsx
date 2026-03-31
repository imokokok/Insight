'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

import { semanticColors } from '@/lib/config/colors';
import { formatNumber } from '@/lib/utils/format';

export interface RealtimePriceAnimationProps {
  symbol: string;
  currentPrice: number;
  previousPrice: number;
  trend: 'up' | 'down' | 'stable';
  decimals?: number;
  showSparkline?: boolean;
  sparklineData?: number[];
}

function AnimatedDigit({
  digit,
  delay,
  isChanging,
}: {
  digit: string;
  delay: number;
  isChanging: boolean;
}) {
  return (
    <motion.span
      key={digit}
      initial={isChanging ? { y: -20, opacity: 0 } : false}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.3,
        delay: delay * 0.03,
        ease: 'easeOut',
      }}
      className="inline-block tabular-nums"
    >
      {digit}
    </motion.span>
  );
}

function PriceFlash({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const color = trend === 'up' ? 'bg-emerald-500' : trend === 'down' ? 'bg-red-500' : 'bg-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0.6 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className={`absolute inset-0 ${color} rounded-lg pointer-events-none`}
    />
  );
}

function TrendArrow({
  trend,
  size = 'md',
}: {
  trend: 'up' | 'down' | 'stable';
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const colorClasses = {
    up: 'text-emerald-500',
    down: 'text-red-500',
    stable: 'text-gray-400',
  };

  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`${sizeClasses[size]} ${colorClasses[trend]}`}
    >
      <Icon className={sizeClasses[size]} />
    </motion.div>
  );
}

function MiniSparkline({ data, trend }: { data: number[]; trend: 'up' | 'down' | 'stable' }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const height = 24;
  const width = 80;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const color =
    trend === 'up'
      ? semanticColors.success.DEFAULT
      : trend === 'down'
        ? semanticColors.danger.DEFAULT
        : '#9ca3af';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${trend}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.5 }}
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        fill={`url(#gradient-${trend})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
}

export function RealtimePriceAnimation({
  symbol,
  currentPrice,
  previousPrice,
  trend,
  decimals = 2,
  showSparkline = true,
  sparklineData = [],
}: RealtimePriceAnimationProps) {
  const [displayPrice, setDisplayPrice] = useState(currentPrice);
  const [isAnimating, setIsAnimating] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const controls = useAnimation();
  const animationRef = useRef<number | null>(null);

  const priceChange = currentPrice - previousPrice;
  const percentChange = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;

  const animatePriceChange = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsAnimating(true);
    setFlashKey((k) => k + 1);

    const startPrice = displayPrice;
    const endPrice = currentPrice;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentDisplay = startPrice + (endPrice - startPrice) * easeOutQuart;

      setDisplayPrice(currentDisplay);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [currentPrice, displayPrice]);

  useEffect(() => {
    if (currentPrice !== displayPrice && !isAnimating) {
      animatePriceChange();
    }
  }, [currentPrice, displayPrice, isAnimating, animatePriceChange]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const priceString = formatNumber(displayPrice, false, decimals);
  const digits = priceString.split('');

  const trendColor =
    trend === 'up'
      ? 'text-emerald-500 dark:text-emerald-400'
      : trend === 'down'
        ? 'text-red-500 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';

  const bgColor =
    trend === 'up'
      ? 'bg-emerald-50 dark:bg-emerald-900/20'
      : trend === 'down'
        ? 'bg-red-50 dark:bg-red-900/20'
        : 'bg-gray-50 dark:bg-gray-800';

  return (
    <div className="relative">
      <motion.div
        animate={controls}
        className={`relative overflow-hidden rounded-xl p-6 ${bgColor} border border-gray-200 dark:border-gray-700`}
      >
        <AnimatePresence>{isAnimating && <PriceFlash trend={trend} />}</AnimatePresence>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {symbol.slice(0, 2)}
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{symbol}</p>
                <div className="flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">实时更新</span>
                </div>
              </div>
            </div>

            <TrendArrow trend={trend} size="lg" />
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-1">$</span>
                <span className={`text-4xl font-bold tabular-nums ${trendColor}`}>
                  {digits.map((digit, index) => (
                    <AnimatedDigit
                      key={`${digit}-${index}`}
                      digit={digit}
                      delay={index}
                      isChanging={isAnimating}
                    />
                  ))}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}
                >
                  <TrendArrow trend={trend} size="sm" />
                  <span>
                    {priceChange >= 0 ? '+' : ''}
                    {formatNumber(Math.abs(priceChange), false, decimals)}
                  </span>
                </motion.div>
                <span
                  className={`text-sm font-medium px-2 py-0.5 rounded ${
                    trend === 'up'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : trend === 'down'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {percentChange >= 0 ? '+' : ''}
                  {percentChange.toFixed(2)}%
                </span>
              </div>
            </div>

            {showSparkline && sparklineData.length > 0 && (
              <div className="flex-shrink-0">
                <MiniSparkline data={sparklineData} trend={trend} />
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isAnimating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-full shadow-lg whitespace-nowrap"
          >
            价格更新中...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RealtimePriceAnimation;
