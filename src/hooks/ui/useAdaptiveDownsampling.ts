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

  // 使用 ref 存储 data，避免 effect 依赖 data 导致循环
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!monitorPerformance) return;

    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      // 使用 ref 获取当前 data 长度用于日志
      const currentDataLength = dataRef.current.length;
      logger.debug(
        `Render time recorded: ${renderTime.toFixed(2)}ms for ${currentDataLength} points`
      );
      updateRenderTime(renderTime);
    };
    // 移除 data 依赖，避免循环更新
  }, [monitorPerformance, updateRenderTime]);

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
  // 使用 state 而不是 ref，确保更新时触发重新渲染
  const [renderTimes, setRenderTimes] = useState<number[]>([]);

  const recordRender = useCallback((renderTime: number) => {
    setRenderTimes((prev) => {
      const newTimes = [...prev, renderTime];
      if (newTimes.length > 10) {
        newTimes.shift();
      }

      // 计算新的性能分数
      const avgRenderTime = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
      let newScore: 'excellent' | 'good' | 'acceptable' | 'poor';
      if (avgRenderTime < 100) {
        newScore = 'excellent';
      } else if (avgRenderTime < 200) {
        newScore = 'good';
      } else if (avgRenderTime < 300) {
        newScore = 'acceptable';
      } else {
        newScore = 'poor';
      }

      // 使用函数式更新避免依赖 performanceScore
      setPerformanceScore(newScore);

      return newTimes;
    });
  }, []);

  const getRecommendedDownsampling = useCallback(() => {
    const avgRenderTime =
      renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0;

    if (avgRenderTime < 100) {
      return { targetPoints: 500, preserveTrends: true };
    } else if (avgRenderTime < 200) {
      return { targetPoints: 350, preserveTrends: true };
    } else if (avgRenderTime < 300) {
      return { targetPoints: 250, preserveTrends: true };
    } else {
      return { targetPoints: 150, preserveTrends: false };
    }
  }, [renderTimes]);

  return {
    performanceScore,
    recordRender,
    getRecommendedDownsampling,
    averageRenderTime:
      renderTimes.length > 0 ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length : 0,
  };
}
