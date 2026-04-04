import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import {
  adaptiveDownsample,
  shouldDownsample,
  getDownsamplingMetrics,
  type DataPoint,
  type AdaptiveDownsampleConfig,
} from '@/lib/utils/downsampling';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useAdaptiveDownsampling');

interface UseAdaptiveDownsamplingOptions extends AdaptiveDownsampleConfig {
  enabled?: boolean;
  threshold?: number;
  monitorPerformance?: boolean;
}

interface DownsamplingState {
  isProcessing: boolean;
  lastRenderTime: number;
  averageRenderTime: number;
  sampleCount: number;
}

interface DownsamplingResult {
  downsampledData: DataPoint[];
  metrics: {
    originalLength: number;
    downsampledLength: number;
    compressionRatio: number;
    efficiency: 'excellent' | 'good' | 'acceptable' | 'poor';
  } | null;
  state: DownsamplingState;
  forceDownsample: (data: DataPoint[], config?: AdaptiveDownsampleConfig) => DataPoint[];
}

export function useAdaptiveDownsampling(
  data: DataPoint[],
  options: UseAdaptiveDownsamplingOptions = {}
): DownsamplingResult {
  const {
    enabled = true,
    threshold = 500,
    monitorPerformance = true,
    renderTime,
    targetRenderTime = 300,
    minPoints = 100,
    maxPoints = 500,
  } = options;

  const [state, setState] = useState<DownsamplingState>({
    isProcessing: false,
    lastRenderTime: 0,
    averageRenderTime: 0,
    sampleCount: 0,
  });

  const renderTimesRef = useRef<number[]>([]);
  const maxSamples = 10;

  const updateRenderTime = useCallback((time: number) => {
    renderTimesRef.current.push(time);
    if (renderTimesRef.current.length > maxSamples) {
      renderTimesRef.current.shift();
    }
    const avg = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
    setState((prev) => ({
      ...prev,
      lastRenderTime: time,
      averageRenderTime: avg,
      sampleCount: renderTimesRef.current.length,
    }));
  }, []);

  useEffect(() => {
    if (!monitorPerformance) return;

    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      updateRenderTime(renderTime);
    };
  }, [data, monitorPerformance, updateRenderTime]);

  const downsampledData = useMemo(() => {
    if (!enabled) {
      return data;
    }

    const dataLength = data.length;
    if (!shouldDownsample(dataLength, threshold)) {
      logger.debug('Data size within limits, skipping downsampling', {
        dataLength,
        threshold,
      });
      return data;
    }

    setState((prev) => ({ ...prev, isProcessing: true }));

    const startTime = performance.now();

    const effectiveRenderTime = renderTime ?? state.averageRenderTime;

    const result = adaptiveDownsample(data, {
      renderTime: effectiveRenderTime,
      targetRenderTime,
      minPoints,
      maxPoints,
    });

    const processingTime = performance.now() - startTime;

    const metrics = getDownsamplingMetrics(dataLength, result.length, processingTime);

    logger.info('Adaptive downsampling applied', {
      originalPoints: dataLength,
      downsampledPoints: result.length,
      compressionRatio: `${metrics.compressionRatio.toFixed(1)}%`,
      processingTime: `${processingTime.toFixed(2)}ms`,
      efficiency: metrics.efficiency,
      averageRenderTime: `${state.averageRenderTime.toFixed(2)}ms`,
    });

    setState((prev) => ({ ...prev, isProcessing: false }));

    return result;
  }, [
    data,
    enabled,
    threshold,
    renderTime,
    targetRenderTime,
    minPoints,
    maxPoints,
    state.averageRenderTime,
  ]);

  const metrics = useMemo(() => {
    if (data.length === downsampledData.length) {
      return null;
    }

    let efficiency: 'excellent' | 'good' | 'acceptable' | 'poor';
    if (state.averageRenderTime < 100) {
      efficiency = 'excellent';
    } else if (state.averageRenderTime < 200) {
      efficiency = 'good';
    } else if (state.averageRenderTime < 300) {
      efficiency = 'acceptable';
    } else {
      efficiency = 'poor';
    }

    return {
      originalLength: data.length,
      downsampledLength: downsampledData.length,
      compressionRatio: (1 - downsampledData.length / data.length) * 100,
      efficiency,
    };
  }, [data.length, downsampledData.length, state.averageRenderTime]);

  const forceDownsample = useCallback(
    (dataToDownsample: DataPoint[], config?: AdaptiveDownsampleConfig) => {
      if (!shouldDownsample(dataToDownsample.length, threshold)) {
        return dataToDownsample;
      }
      return adaptiveDownsample(dataToDownsample, {
        renderTime: state.averageRenderTime,
        targetRenderTime,
        minPoints,
        maxPoints,
        ...config,
      });
    },
    [threshold, state.averageRenderTime, targetRenderTime, minPoints, maxPoints]
  );

  return {
    downsampledData,
    metrics,
    state,
    forceDownsample,
  };
}

export function useChartPerformanceMonitor() {
  const [performanceScore, setPerformanceScore] = useState<
    'excellent' | 'good' | 'acceptable' | 'poor'
  >('good');
  const renderTimesRef = useRef<number[]>([]);

  const recordRender = useCallback((renderTime: number) => {
    renderTimesRef.current.push(renderTime);
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current.shift();
    }

    const avgRenderTime =
      renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;

    if (avgRenderTime < 100) {
      setPerformanceScore('excellent');
    } else if (avgRenderTime < 200) {
      setPerformanceScore('good');
    } else if (avgRenderTime < 300) {
      setPerformanceScore('acceptable');
    } else {
      setPerformanceScore('poor');
    }
  }, []);

  const getRecommendedDownsampling = useCallback(() => {
    const avgRenderTime =
      renderTimesRef.current.length > 0
        ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
        : 0;

    if (avgRenderTime < 100) {
      return { targetPoints: 500, preserveTrends: true };
    } else if (avgRenderTime < 200) {
      return { targetPoints: 350, preserveTrends: true };
    } else if (avgRenderTime < 300) {
      return { targetPoints: 250, preserveTrends: true };
    } else {
      return { targetPoints: 150, preserveTrends: false };
    }
  }, []);

  return {
    performanceScore,
    recordRender,
    getRecommendedDownsampling,
    averageRenderTime:
      renderTimesRef.current.length > 0
        ? renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length
        : 0,
  };
}
