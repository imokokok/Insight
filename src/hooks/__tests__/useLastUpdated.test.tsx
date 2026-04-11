import { renderHook, act } from '@testing-library/react';

import { useLastUpdated } from '../oracles/useLastUpdated';

describe('useLastUpdated', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should initialize with null lastUpdated', () => {
    const { result } = renderHook(() => useLastUpdated());

    expect(result.current.lastUpdated).toBeNull();
  });

  it('should update lastUpdated when updateLastUpdated is called', () => {
    const { result } = renderHook(() => useLastUpdated());

    act(() => {
      result.current.updateLastUpdated();
    });

    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should update lastUpdated to current time', () => {
    const fixedDate = new Date('2024-01-01T12:00:00Z');
    jest.setSystemTime(fixedDate);

    const { result } = renderHook(() => useLastUpdated());

    act(() => {
      result.current.updateLastUpdated();
    });

    expect(result.current.lastUpdated).toEqual(fixedDate);
  });

  it('should allow setting lastUpdated directly', () => {
    const { result } = renderHook(() => useLastUpdated());

    const customDate = new Date('2024-01-01T10:00:00Z');

    act(() => {
      result.current.setLastUpdated(customDate);
    });

    expect(result.current.lastUpdated).toEqual(customDate);
  });

  it('should update multiple times', () => {
    const { result } = renderHook(() => useLastUpdated());

    act(() => {
      result.current.updateLastUpdated();
    });

    const firstUpdate = result.current.lastUpdated;

    jest.advanceTimersByTime(1000);

    act(() => {
      result.current.updateLastUpdated();
    });

    const secondUpdate = result.current.lastUpdated;

    expect(secondUpdate!.getTime()).toBeGreaterThan(firstUpdate!.getTime());
  });

  it('should return stable updateLastUpdated function', () => {
    const { result, rerender } = renderHook(() => useLastUpdated());

    const firstUpdateFn = result.current.updateLastUpdated;

    rerender();

    const secondUpdateFn = result.current.updateLastUpdated;

    expect(firstUpdateFn).toBe(secondUpdateFn);
  });

  it('should return stable setLastUpdated function', () => {
    const { result, rerender } = renderHook(() => useLastUpdated());

    const firstSetFn = result.current.setLastUpdated;

    rerender();

    const secondSetFn = result.current.setLastUpdated;

    expect(firstSetFn).toBe(secondSetFn);
  });
});
