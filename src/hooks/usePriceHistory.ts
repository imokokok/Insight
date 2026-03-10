'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface PriceHistoryPoint {
  timestamp: number;
  oraclePrice: number;
  marketPrice: number;
  deviation: number;
  deviationPercent: number;
  marketCondition: 'normal' | 'volatile' | 'extreme';
  confidence: number;
}

export interface AccuracyStats {
  overallAccuracy: number;
  avgDeviation: number;
  maxDeviation: number;
  minDeviation: number;
  normalAccuracy: number;
  volatileAccuracy: number;
  extremeAccuracy: number;
  totalDataPoints: number;
}

export interface AccuracyTrendPoint {
  date: string;
  accuracy: number;
  deviation: number;
  event?: string;
}

export interface ExtremeMarketEvent {
  id: string;
  timestamp: number;
  date: string;
  type: 'flash_crash' | 'pump' | 'high_volatility' | 'liquidity_crisis';
  severity: 'low' | 'medium' | 'high';
  oraclePrice: number;
  marketPrice: number;
  deviation: number;
  recoveryTime: number;
  description: string;
}

function generateMarketCondition(): 'normal' | 'volatile' | 'extreme' {
  const rand = Math.random();
  if (rand > 0.95) return 'extreme';
  if (rand > 0.85) return 'volatile';
  return 'normal';
}

function generatePriceHistory(count: number = 100): PriceHistoryPoint[] {
  const now = Date.now();
  const data: PriceHistoryPoint[] = [];
  const basePrice = 0.35;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * 60000;
    const marketCondition = generateMarketCondition();

    let volatility = 0.002;
    if (marketCondition === 'volatile') volatility = 0.01;
    if (marketCondition === 'extreme') volatility = 0.03;

    const trend = Math.sin(i / 15) * 0.02;
    const noise = (Math.random() - 0.5) * volatility;
    const oraclePrice = basePrice + trend + noise;

    const marketNoise = (Math.random() - 0.5) * volatility * 1.2;
    const marketPrice = oraclePrice + marketNoise;

    const deviation = oraclePrice - marketPrice;
    const deviationPercent = (deviation / marketPrice) * 100;

    const confidence =
      marketCondition === 'normal'
        ? 95 + Math.random() * 5
        : marketCondition === 'volatile'
          ? 85 + Math.random() * 10
          : 70 + Math.random() * 15;

    data.push({
      timestamp,
      oraclePrice: Number(oraclePrice.toFixed(6)),
      marketPrice: Number(marketPrice.toFixed(6)),
      deviation: Number(deviation.toFixed(6)),
      deviationPercent: Number(deviationPercent.toFixed(4)),
      marketCondition,
      confidence: Number(confidence.toFixed(2)),
    });
  }

  return data;
}

function generateExtremeEvents(data: PriceHistoryPoint[]): ExtremeMarketEvent[] {
  const extremePoints = data.filter((d) => d.marketCondition === 'extreme');
  const events: ExtremeMarketEvent[] = [];

  extremePoints.forEach((point, index) => {
    const types: ExtremeMarketEvent['type'][] = [
      'flash_crash',
      'pump',
      'high_volatility',
      'liquidity_crisis',
    ];
    const type = types[Math.floor(Math.random() * types.length)];
    const severity =
      Math.abs(point.deviationPercent) > 2
        ? 'high'
        : Math.abs(point.deviationPercent) > 1
          ? 'medium'
          : 'low';

    const descriptions: Record<ExtremeMarketEvent['type'], string> = {
      flash_crash: '市场价格快速下跌，预言机价格保持稳定',
      pump: '市场价格快速上涨，预言机价格延迟跟随',
      high_volatility: '市场波动率异常升高，价格偏差增大',
      liquidity_crisis: '市场流动性不足，价差扩大',
    };

    events.push({
      id: `extreme-${index}`,
      timestamp: point.timestamp,
      date: new Date(point.timestamp).toLocaleString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      type,
      severity,
      oraclePrice: point.oraclePrice,
      marketPrice: point.marketPrice,
      deviation: point.deviationPercent,
      recoveryTime: Math.floor(Math.random() * 300) + 30,
      description: descriptions[type],
    });
  });

  return events.slice(0, 10);
}

function generateAccuracyTrend(days: number = 30): AccuracyTrendPoint[] {
  const data: AccuracyTrendPoint[] = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - i * 86400000;
    const date = new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });

    const baseAccuracy = 96 + Math.random() * 3;
    const accuracy = i === 5 ? baseAccuracy - 5 : i === 15 ? baseAccuracy - 3 : baseAccuracy;
    const deviation = (100 - accuracy) / 10 + Math.random() * 0.2;

    let event: string | undefined;
    if (i === 5) event = '市场异常波动';
    if (i === 15) event = '网络拥堵';
    if (i === 25) event = '数据源切换';

    data.push({
      date,
      accuracy: Number(accuracy.toFixed(2)),
      deviation: Number(deviation.toFixed(4)),
      event,
    });
  }

  return data;
}

export function usePriceHistory(maxDataPoints: number = 100) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      setIsLoading(true);
      setTimeout(() => {
        const data = generatePriceHistory(maxDataPoints);
        setPriceHistory(data);
        setIsLoading(false);
      }, 300);
    };

    loadData();
  }, [maxDataPoints]);

  const addPricePoint = useCallback(
    (point: Omit<PriceHistoryPoint, 'timestamp'>) => {
      setPriceHistory((prev) => {
        const newPoint: PriceHistoryPoint = {
          ...point,
          timestamp: Date.now(),
        };
        const updated = [...prev, newPoint];
        if (updated.length > maxDataPoints) {
          return updated.slice(-maxDataPoints);
        }
        return updated;
      });
    },
    [maxDataPoints]
  );

  const stats = useMemo<AccuracyStats>(() => {
    if (priceHistory.length === 0) {
      return {
        overallAccuracy: 0,
        avgDeviation: 0,
        maxDeviation: 0,
        minDeviation: 0,
        normalAccuracy: 0,
        volatileAccuracy: 0,
        extremeAccuracy: 0,
        totalDataPoints: 0,
      };
    }

    const deviations = priceHistory.map((d) => Math.abs(d.deviationPercent));
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations);
    const minDeviation = Math.min(...deviations);

    const normalPoints = priceHistory.filter((d) => d.marketCondition === 'normal');
    const volatilePoints = priceHistory.filter((d) => d.marketCondition === 'volatile');
    const extremePoints = priceHistory.filter((d) => d.marketCondition === 'extreme');

    const calcAccuracy = (points: PriceHistoryPoint[]) => {
      if (points.length === 0) return 0;
      const accurate = points.filter((d) => Math.abs(d.deviationPercent) <= 0.5).length;
      return (accurate / points.length) * 100;
    };

    const overallAccurate = priceHistory.filter((d) => Math.abs(d.deviationPercent) <= 0.5).length;
    const overallAccuracy = (overallAccurate / priceHistory.length) * 100;

    return {
      overallAccuracy: Number(overallAccuracy.toFixed(2)),
      avgDeviation: Number(avgDeviation.toFixed(4)),
      maxDeviation: Number(maxDeviation.toFixed(4)),
      minDeviation: Number(minDeviation.toFixed(4)),
      normalAccuracy: Number(calcAccuracy(normalPoints).toFixed(2)),
      volatileAccuracy: Number(calcAccuracy(volatilePoints).toFixed(2)),
      extremeAccuracy: Number(calcAccuracy(extremePoints).toFixed(2)),
      totalDataPoints: priceHistory.length,
    };
  }, [priceHistory]);

  const extremeEvents = useMemo(() => {
    return generateExtremeEvents(priceHistory);
  }, [priceHistory]);

  const accuracyTrend = useMemo(() => {
    return generateAccuracyTrend(30);
  }, []);

  const recentTrend = useMemo<'improving' | 'stable' | 'declining'>(() => {
    if (priceHistory.length < 10) return 'stable';
    const recent = priceHistory.slice(-10);
    const older = priceHistory.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + Math.abs(b.deviationPercent), 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + Math.abs(b.deviationPercent), 0) / older.length;

    if (recentAvg < olderAvg * 0.9) return 'improving';
    if (recentAvg > olderAvg * 1.1) return 'declining';
    return 'stable';
  }, [priceHistory]);

  return {
    priceHistory,
    stats,
    extremeEvents,
    accuracyTrend,
    recentTrend,
    isLoading,
    addPricePoint,
  };
}
