import { renderHook, act } from '@testing-library/react';

import {
  useAdaptiveDownsampling,
  useChartPerformanceMonitor,
} from '../ui/useAdaptiveDownsampling';

jest.mock('@/lib/utils/downsampling', () => ({
  adaptiveDownsample: jest.fn((data) => data.slice(0, Math.floor(data.length / 2))),
  shouldDownsample: jest.fn((length, threshold) => length > threshold),
  getDownsamplingMetrics: jest.fn((original, downsampled, time) => ({
    originalLength: original,
    downsampledLength: downsampled,
    compressionRatio: ((original - downsampled) / original) * 100,
    efficiency: time < 10 ? 'excellent' : time < 50 ? 'good' : 'acceptable',
  })),
}));

describe('useAdaptiveDownsampling', () => {
  const generateTestData = (count: number) =>
    Array.from({ length: count }, (_, i) => ({
      timestamp: i * 1000,
      value: Math.random() * 100,
    }));

  it('should return original data when disabled', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { enabled: false })
    );

    expect(result.current.downsampledData).toEqual(data);
  });

  it('should return original data when below threshold', () => {
    const data = generateTestData(100);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { threshold: 500 })
    );

    expect(result.current.downsampledData).toEqual(data);
  });

  it('should downsample data when above threshold', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { threshold: 500, enabled: true })
    );

    expect(result.current.downsampledData.length).toBeLessThan(data.length);
  });

  it('should return metrics when downsampling is applied', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { threshold: 500, enabled: true })
    );

    expect(result.current.metrics).not.toBeNull();
    expect(result.current.metrics?.originalLength).toBe(1000);
    expect(result.current.metrics?.downsampledLength).toBeLessThan(1000);
    expect(result.current.metrics?.compressionRatio).toBeGreaterThan(0);
  });

  it('should return null metrics when no downsampling', () => {
    const data = generateTestData(100);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { threshold: 500 })
    );

    expect(result.current.metrics).toBeNull();
  });

  it('should track state', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { threshold: 500 })
    );

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.state.isProcessing).toBe('boolean');
    expect(typeof result.current.state.lastRenderTime).toBe('number');
    expect(typeof result.current.state.averageRenderTime).toBe('number');
  });

  it('should force downsample with custom config', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { threshold: 500 })
    );

    const customData = generateTestData(800);
    let downsampled: typeof customData = [];

    act(() => {
      downsampled = result.current.forceDownsample(customData);
    });

    expect(downsampled.length).toBeLessThan(customData.length);
  });

  it('should not force downsample when below threshold', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, { threshold: 500 })
    );

    const smallData = generateTestData(100);
    let downsampled: typeof smallData = [];

    act(() => {
      downsampled = result.current.forceDownsample(smallData);
    });

    expect(downsampled).toEqual(smallData);
  });

  it('should respect custom render time', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, {
        threshold: 500,
        renderTime: 200,
        targetRenderTime: 100,
      })
    );

    expect(result.current.downsampledData.length).toBeLessThan(data.length);
  });

  it('should respect min and max points', () => {
    const data = generateTestData(1000);

    const { result } = renderHook(() =>
      useAdaptiveDownsampling(data, {
        threshold: 500,
        minPoints: 200,
        maxPoints: 400,
      })
    );

    expect(result.current.downsampledData.length).toBeLessThanOrEqual(500);
    expect(result.current.downsampledData.length).toBeGreaterThanOrEqual(200);
  });

  it('should update when data changes', () => {
    const data1 = generateTestData(1000);
    const data2 = generateTestData(800);

    const { result, rerender } = renderHook(
      ({ data }) => useAdaptiveDownsampling(data, { threshold: 500 }),
      { initialProps: { data: data1 } }
    );

    const firstResult = result.current.downsampledData;

    rerender({ data: data2 });

    expect(result.current.downsampledData).not.toEqual(firstResult);
  });
});

describe('useChartPerformanceMonitor', () => {
  it('should initialize with good performance score', () => {
    const { result } = renderHook(() => useChartPerformanceMonitor());

    expect(result.current.performanceScore).toBe('good');
    expect(result.current.averageRenderTime).toBe(0);
  });

  it('should record render times', () => {
    const { result } = renderHook(() => useChartPerformanceMonitor());

    act(() => {
      result.current.recordRender(50);
    });

    expect(result.current.averageRenderTime).toBe(50);

    act(() => {
      result.current.recordRender(100);
    });

    expect(result.current.averageRenderTime).toBe(75);
  });

  it('should update performance score based on render times', () => {
    const { result } = renderHook(() => useChartPerformanceMonitor());

    act(() => {
      result.current.recordRender(50);
    });

    expect(result.current.performanceScore).toBe('excellent');

    act(() => {
      result.current.recordRender(150);
      result.current.recordRender(150);
      result.current.recordRender(150);
    });

    expect(result.current.performanceScore).toBe('good');
  });

  it('should return recommended downsampling config', () => {
    const { result } = renderHook(() => useChartPerformanceMonitor());

    act(() => {
      result.current.recordRender(50);
    });

    const recommendation = result.current.getRecommendedDownsampling();

    expect(recommendation.targetPoints).toBeDefined();
    expect(recommendation.preserveTrends).toBeDefined();
  });

  it('should adjust recommendation based on render time', () => {
    const { result } = renderHook(() => useChartPerformanceMonitor());

    act(() => {
      result.current.recordRender(50);
    });

    let recommendation = result.current.getRecommendedDownsampling();
    expect(recommendation.targetPoints).toBe(500);

    act(() => {
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
      result.current.recordRender(400);
    });

    recommendation = result.current.getRecommendedDownsampling();
    expect(recommendation.targetPoints).toBe(150);
    expect(recommendation.preserveTrends).toBe(false);
  });

  it('should limit render times history', () => {
    const { result } = renderHook(() => useChartPerformanceMonitor());

    for (let i = 0; i < 20; i++) {
      act(() => {
        result.current.recordRender(i * 10);
      });
    }

    act(() => {
      result.current.recordRender(1000);
    });

    const avg = result.current.averageRenderTime;
    expect(avg).toBeGreaterThan(0);
  });
});
