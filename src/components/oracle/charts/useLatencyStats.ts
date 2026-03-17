'use client';

import { useMemo } from 'react';
import {
  LatencyDataPoint,
  HistogramDataPoint,
  calculatePercentile,
  generateHistogramData,
} from './latencyUtils';

export interface LatencyStats {
  avg: number;
  max: number;
  min: number;
  p50: number;
  p90: number;
  p99: number;
  histogramData: HistogramDataPoint[];
  anomalyCount: number;
  anomalyPercent: number;
  longestAnomalyDuration: number;
  anomalyPeriods: { start: number; end: number }[];
  anomalyDataPoints: LatencyDataPoint[];
}

export function useLatencyStats(data: LatencyDataPoint[]): LatencyStats {
  return useMemo(() => {
    const latencies = data.map((d) => d.latency);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);
    const anomalyCount = data.filter((d) => d.isAnomaly).length;
    const anomalyDataPoints = data.filter((d) => d.isAnomaly);

    const p50 = calculatePercentile(sortedLatencies, 50);
    const p90 = calculatePercentile(sortedLatencies, 90);
    const p99 = calculatePercentile(sortedLatencies, 99);

    const histogramData = generateHistogramData(latencies, 12);

    let longestAnomalyDuration = 0;
    let currentDuration = 0;
    const anomalyPeriods: { start: number; end: number }[] = [];
    let currentStart = -1;

    data.forEach((d, i) => {
      if (d.isAnomaly) {
        if (currentStart === -1) {
          currentStart = i;
        }
        currentDuration++;
      } else {
        if (currentStart !== -1) {
          anomalyPeriods.push({ start: currentStart, end: i - 1 });
          if (currentDuration > longestAnomalyDuration) {
            longestAnomalyDuration = currentDuration;
          }
        }
        currentStart = -1;
        currentDuration = 0;
      }
    });

    if (currentStart !== -1) {
      anomalyPeriods.push({ start: currentStart, end: data.length - 1 });
      if (currentDuration > longestAnomalyDuration) {
        longestAnomalyDuration = currentDuration;
      }
    }

    return {
      avg: Number(avg.toFixed(1)),
      max: Number(max.toFixed(1)),
      min: Number(min.toFixed(1)),
      p50: Number(p50.toFixed(1)),
      p90: Number(p90.toFixed(1)),
      p99: Number(p99.toFixed(1)),
      histogramData,
      anomalyCount,
      anomalyPercent: Number(((anomalyCount / data.length) * 100).toFixed(1)),
      longestAnomalyDuration,
      anomalyPeriods,
      anomalyDataPoints,
    };
  }, [data]);
}
