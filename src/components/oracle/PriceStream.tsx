'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardCard } from './DashboardCard';

interface PriceUpdate {
  id: number;
  price: number;
  timestamp: Date;
  change: number;
  direction: 'up' | 'down' | 'neutral';
  confidenceWidth: number;
}

interface PriceStreamStats {
  updatesPerSecond: number;
  avgLatency: number;
  totalUpdates: number;
  avgConfidenceWidth: number;
}

interface PriceStreamProps {
  symbol: string;
  initialPrice: number;
  updateInterval?: number;
}

export function PriceStream({ symbol, initialPrice, updateInterval = 100 }: PriceStreamProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [priceHistory, setPriceHistory] = useState<PriceUpdate[]>([]);
  const [stats, setStats] = useState<PriceStreamStats>({
    updatesPerSecond: 0,
    avgLatency: 0,
    totalUpdates: 0,
    avgConfidenceWidth: 0,
  });
  const [pausedPrice, setPausedPrice] = useState<number | null>(null);

  const updateCountRef = useRef(0);
  const latencySumRef = useRef(0);
  const confidenceWidthSumRef = useRef(0);
  const lastSecondCountRef = useRef(0);
  const lastSecondTimeRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const priceRef = useRef(initialPrice);
  const idCounterRef = useRef(0);
  const isInitializedRef = useRef(false);

  const generatePriceUpdate = useCallback(() => {
    const currentPriceValue = priceRef.current;
    const changePercent = (Math.random() - 0.5) * 0.1;
    const newPrice = currentPriceValue * (1 + changePercent / 100);
    const change = newPrice - currentPriceValue;

    const direction = change > 0.0001 ? 'up' : change < -0.0001 ? 'down' : 'neutral';

    priceRef.current = newPrice;

    const latency = Math.random() * 50 + 10;
    const confidenceWidth = Math.random() * 0.3 + 0.05;

    return {
      price: newPrice,
      change,
      direction: direction as 'up' | 'down' | 'neutral',
      latency,
      confidenceWidth,
    };
  }, []);

  const updatePrice = useCallback(() => {
    const update = generatePriceUpdate();
    const now = new Date();

    setCurrentPrice(update.price);

    const newUpdate: PriceUpdate = {
      id: ++idCounterRef.current,
      price: update.price,
      timestamp: now,
      change: update.change,
      direction: update.direction,
      confidenceWidth: update.confidenceWidth,
    };

    setPriceHistory((prev) => {
      const newHistory = [newUpdate, ...prev];
      return newHistory.slice(0, 20);
    });

    updateCountRef.current++;
    latencySumRef.current += update.latency;
    confidenceWidthSumRef.current += update.confidenceWidth;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastSecondTimeRef.current;

    if (timeDiff >= 1000) {
      const updatesInLastSecond = updateCountRef.current - lastSecondCountRef.current;
      const avgLatency = latencySumRef.current / updateCountRef.current;
      const avgConfidenceWidth = confidenceWidthSumRef.current / updateCountRef.current;

      setStats({
        updatesPerSecond: updatesInLastSecond,
        avgLatency: Math.round(avgLatency * 100) / 100,
        totalUpdates: updateCountRef.current,
        avgConfidenceWidth: Math.round(avgConfidenceWidth * 10000) / 10000,
      });

      lastSecondCountRef.current = updateCountRef.current;
      lastSecondTimeRef.current = currentTime;
    }
  }, [generatePriceUpdate]);

  useEffect(() => {
    if (!isInitializedRef.current) {
      lastSecondTimeRef.current = Date.now();
      isInitializedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!isPaused && isInitializedRef.current) {
      intervalRef.current = setInterval(updatePrice, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, updateInterval, updatePrice]);

  const handlePause = () => {
    setIsPaused(true);
    setPausedPrice(currentPrice);
  };

  const handleResume = () => {
    setIsPaused(false);
    setPausedPrice(null);
  };

  const formatPrice = (price: number) => {
    return price.toFixed(4);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  return (
    <DashboardCard
      title="实时价格流"
      headerAction={
        <button
          onClick={isPaused ? handleResume : handlePause}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            isPaused
              ? 'bg-green-500 text-white hover:bg-green-600'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isPaused ? (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
              恢复
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              暂停
            </span>
          )}
        </button>
      }
    >
      <div className="space-y-4">
        {isPaused && pausedPrice && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-yellow-800 text-sm font-medium">
                价格流已暂停 - 当前快照: ${formatPrice(pausedPrice)}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">{symbol}/USD</p>
            <p className="text-3xl font-bold text-gray-900">${formatPrice(currentPrice)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'
              }`}
            />
            <span className="text-sm text-gray-600">{isPaused ? '已暂停' : '实时更新中'}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">每秒更新</p>
            <p className="text-xl font-bold text-blue-700">{stats.updatesPerSecond}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">平均延迟</p>
            <p className="text-xl font-bold text-purple-700">{stats.avgLatency}ms</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">总更新数</p>
            <p className="text-xl font-bold text-green-700">{stats.totalUpdates}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <p className="text-xs text-orange-600 mb-1">平均置信区间</p>
            <p className="text-xl font-bold text-orange-700">{(stats.avgConfidenceWidth * 100).toFixed(2)}%</p>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">最近 20 条更新记录</h4>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    时间
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    价格
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    变化
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    置信区间
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {priceHistory.map((update, index) => {
                  const confidenceColor = 
                    update.confidenceWidth < 0.15 ? 'text-green-600' :
                    update.confidenceWidth < 0.25 ? 'text-yellow-600' : 'text-red-600';
                  return (
                    <tr
                      key={update.id}
                      className={`transition-colors duration-300 ${
                        index === 0 && !isPaused
                          ? update.direction === 'up'
                            ? 'bg-green-50'
                            : update.direction === 'down'
                              ? 'bg-red-50'
                              : ''
                          : ''
                      }`}
                    >
                      <td className="px-4 py-2 text-sm font-mono text-gray-600">
                        {formatTime(update.timestamp)}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-right text-gray-900">
                        ${formatPrice(update.price)}
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-right">
                        <span
                          className={`inline-flex items-center gap-1 ${
                            update.direction === 'up'
                              ? 'text-green-600'
                              : update.direction === 'down'
                                ? 'text-red-600'
                                : 'text-gray-500'
                          }`}
                        >
                          {update.direction === 'up' && '↑'}
                          {update.direction === 'down' && '↓'}
                          {update.change >= 0 ? '+' : ''}
                          {update.change.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm font-mono text-right">
                        <span className={`font-medium ${confidenceColor}`}>
                          {(update.confidenceWidth * 100).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
