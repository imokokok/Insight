import { renderHook, act } from '@testing-library/react';

import { useDataFreshness, type DataFreshnessStatus } from '../data/useDataFreshness';

describe('useDataFreshness', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return expired status when lastUpdated is null', () => {
    const { result } = renderHook(() => useDataFreshness(null));

    expect(result.current.status).toBe('expired');
    expect(result.current.ageInMinutes).toBe(0);
    expect(result.current.message).toBe('数据未加载');
    expect(result.current.shouldRefresh).toBe(true);
  });

  it('should return fresh status for recent data', () => {
    const recentDate = new Date();

    const { result } = renderHook(() => useDataFreshness(recentDate));

    expect(result.current.status).toBe('fresh');
    expect(result.current.message).toBe('数据新鲜');
    expect(result.current.shouldRefresh).toBe(false);
  });

  it('should return stale status for aging data', () => {
    const staleDate = new Date(Date.now() - 10 * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(staleDate));

    expect(result.current.status).toBe('stale');
    expect(result.current.message).toBe('数据即将过期');
    expect(result.current.shouldRefresh).toBe(false);
  });

  it('should return expired status for old data', () => {
    const expiredDate = new Date(Date.now() - 60 * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(expiredDate));

    expect(result.current.status).toBe('expired');
    expect(result.current.message).toBe('数据已过期');
    expect(result.current.shouldRefresh).toBe(true);
  });

  it('should respect custom maxFreshTime', () => {
    const date = new Date(Date.now() - 3 * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(date, 5));

    expect(result.current.status).toBe('fresh');
  });

  it('should respect custom maxStaleTime', () => {
    const date = new Date(Date.now() - 20 * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(date, 5, 30));

    expect(result.current.status).toBe('stale');
  });

  it('should calculate correct ageInMinutes', () => {
    const ageInMinutes = 15;
    const date = new Date(Date.now() - ageInMinutes * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(date));

    expect(Math.round(result.current.ageInMinutes)).toBe(ageInMinutes);
  });

  it('should update status over time', () => {
    const date = new Date();

    const { result } = renderHook(() => useDataFreshness(date, 1, 2));

    expect(result.current.status).toBe('fresh');

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(result.current.status).toBe('stale');

    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(result.current.status).toBe('expired');
  });

  it('should update when lastUpdated changes', () => {
    const oldDate = new Date(Date.now() - 60 * 60 * 1000);
    const newDate = new Date();

    const { result, rerender } = renderHook(
      ({ lastUpdated }) => useDataFreshness(lastUpdated),
      { initialProps: { lastUpdated: oldDate } }
    );

    expect(result.current.status).toBe('expired');

    rerender({ lastUpdated: newDate });

    expect(result.current.status).toBe('fresh');
  });

  it('should cleanup interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = renderHook(() => useDataFreshness(new Date()));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });

  it('should handle edge case at fresh/stale boundary', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(date, 5, 30));

    expect(result.current.status).toBe('stale');
  });

  it('should handle edge case at stale/expired boundary', () => {
    const date = new Date(Date.now() - 30 * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(date, 5, 30));

    expect(result.current.status).toBe('expired');
  });

  it('should handle zero values for thresholds', () => {
    const date = new Date();

    const { result } = renderHook(() => useDataFreshness(date, 0, 0));

    expect(result.current.status).toBe('expired');
    expect(result.current.shouldRefresh).toBe(true);
  });

  it('should update every minute', () => {
    const date = new Date(Date.now() - 4 * 60 * 1000);

    const { result } = renderHook(() => useDataFreshness(date, 5, 30));

    const initialAge = result.current.ageInMinutes;

    act(() => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.ageInMinutes).toBeGreaterThan(initialAge);
  });
});
