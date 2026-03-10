'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

interface KPIDashboardProps {
  price: number;
  priceChange24h: number;
  priceChangePercent: number;
  updateFrequency: number;
  networkHealth: 'healthy' | 'warning' | 'critical';
  dataQualityScore: number;
  className?: string;
}

interface UpdateInterval {
  timestamp: number;
  interval: number;
}

const healthConfig = {
  healthy: {
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    label: '健康',
    pulseColor: 'bg-green-400',
  },
  warning: {
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    lightBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: '警告',
    pulseColor: 'bg-yellow-400',
  },
  critical: {
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
    label: '异常',
    pulseColor: 'bg-red-400',
  },
};

function getQualityColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getQualityLevel(score: number): string {
  if (score >= 90) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '一般';
  return '较差';
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

function PriceCard({
  price,
  previousPrice,
}: {
  price: number;
  previousPrice: number | null;
}) {
  const [isFlashing, setIsFlashing] = useState(false);
  const prevPriceRef = useRef(previousPrice);

  useEffect(() => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== price) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 300);
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">实时价格</p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-400 text-lg">$</span>
            <span
              className={`text-2xl font-bold text-gray-900 transition-all duration-200 ${
                isFlashing ? 'text-blue-500 scale-105' : ''
              }`}
            >
              {formatPrice(price)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs text-gray-400">实时更新中</span>
          </div>
        </div>
        <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PriceChangeCard({
  priceChange24h,
  priceChangePercent,
}: {
  priceChange24h: number;
  priceChangePercent: number;
}) {
  const isPositive = priceChangePercent >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  const bgClass = isPositive ? 'bg-green-50' : 'bg-red-50';
  const arrow = isPositive ? '↑' : '↓';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">24h 价格变化</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${colorClass}`}>
              {arrow} {Math.abs(priceChangePercent).toFixed(2)}%
            </span>
          </div>
          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded ${bgClass}`}>
            <span className={`text-xs font-medium ${colorClass}`}>
              {isPositive ? '+' : ''}{priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(4)}
            </span>
          </div>
        </div>
        <div className={`p-2.5 rounded-lg ${bgClass} ${colorClass}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isPositive ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function UpdateFrequencyCard({
  frequency,
  intervals,
}: {
  frequency: number;
  intervals: UpdateInterval[];
}) {
  const maxInterval = useMemo(() => {
    if (intervals.length === 0) return 1000;
    return Math.max(...intervals.map((i) => i.interval), 100);
  }, [intervals]);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">更新频率</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">{frequency.toFixed(1)}</span>
            <span className="text-gray-500 text-sm">次/秒</span>
          </div>
          <div className="flex items-end gap-0.5 h-8 mt-3">
            {intervals.length > 0 ? (
              intervals.map((item, index) => {
                const height = Math.max(4, (item.interval / maxInterval) * 100);
                const color =
                  item.interval < 200
                    ? 'bg-green-400'
                    : item.interval < 500
                      ? 'bg-yellow-400'
                      : 'bg-red-400';
                return (
                  <div
                    key={index}
                    className={`w-2 ${color} rounded-t transition-all duration-200`}
                    style={{ height: `${height}%` }}
                    title={`${item.interval}ms`}
                  />
                );
              })
            ) : (
              <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">
                等待数据...
              </div>
            )}
          </div>
        </div>
        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function NetworkHealthCard({ health }: { health: 'healthy' | 'warning' | 'critical' }) {
  const config = healthConfig[health];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">网络健康</p>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`}
              ></span>
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${config.bgColor}`}
              ></span>
            </span>
            <span className={`text-2xl font-bold ${config.textColor}`}>{config.label}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">实时监控中</p>
        </div>
        <div className={`p-2.5 rounded-lg ${config.lightBg} ${config.textColor}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function DataQualityGauge({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getQualityColor(score);
  const level = getQualityLevel(score);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">数据质量</p>
          <div className="flex items-center gap-3">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="#e5e7eb"
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke={color}
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{Math.round(score)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{level}</p>
              <p className="text-xs text-gray-400">综合评分</p>
            </div>
          </div>
        </div>
        <div className="p-2.5 bg-cyan-50 rounded-lg text-cyan-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

export function KPIDashboard({
  price,
  priceChange24h,
  priceChangePercent,
  updateFrequency,
  networkHealth,
  dataQualityScore,
  className = '',
}: KPIDashboardProps) {
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [intervals, setIntervals] = useState<UpdateInterval[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const interval = now - lastUpdateRef.current;

    if (previousPrice !== null) {
      setIntervals((prev) => {
        const newIntervals = [...prev, { timestamp: now, interval }];
        if (newIntervals.length > 10) {
          return newIntervals.slice(-10);
        }
        return newIntervals;
      });
    }

    setPreviousPrice(price);
    lastUpdateRef.current = now;
  }, [price]);

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <PriceCard price={price} previousPrice={previousPrice} />
        <PriceChangeCard
          priceChange24h={priceChange24h}
          priceChangePercent={priceChangePercent}
        />
        <UpdateFrequencyCard frequency={updateFrequency} intervals={intervals} />
        <NetworkHealthCard health={networkHealth} />
        <DataQualityGauge score={dataQualityScore} />
      </div>
    </div>
  );
}

export type { KPIDashboardProps };
