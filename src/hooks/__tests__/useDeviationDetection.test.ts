import { renderHook } from '@testing-library/react';

import {
  useDeviationDetection,
  useBatchDeviationDetection,
  DEFAULT_DEVIATION_THRESHOLD,
} from '../utils/useDeviationDetection';

describe('useDeviationDetection', () => {
  describe('initialization', () => {
    it('should return none level for zero value', () => {
      const { result } = renderHook(() => useDeviationDetection(0));

      expect(result.current.level).toBe('none');
      expect(result.current.isWarning).toBe(false);
      expect(result.current.isDanger).toBe(false);
      expect(result.current.isDeviated).toBe(false);
    });

    it('should use default thresholds', () => {
      const { result } = renderHook(() => useDeviationDetection(0.5));

      expect(result.current.level).toBe('none');
    });
  });

  describe('warning level', () => {
    it('should return warning for value above warning threshold', () => {
      const { result } = renderHook(() => useDeviationDetection(1.5));

      expect(result.current.level).toBe('warning');
      expect(result.current.isWarning).toBe(true);
      expect(result.current.isDanger).toBe(false);
      expect(result.current.isDeviated).toBe(true);
    });

    it('should return warning at exact warning threshold boundary', () => {
      const { result } = renderHook(() => useDeviationDetection(1.01));

      expect(result.current.level).toBe('warning');
    });
  });

  describe('danger level', () => {
    it('should return danger for value above danger threshold', () => {
      const { result } = renderHook(() => useDeviationDetection(2.5));

      expect(result.current.level).toBe('danger');
      expect(result.current.isWarning).toBe(false);
      expect(result.current.isDanger).toBe(true);
      expect(result.current.isDeviated).toBe(true);
    });

    it('should return danger at exact danger threshold boundary', () => {
      const { result } = renderHook(() => useDeviationDetection(2.01));

      expect(result.current.level).toBe('danger');
    });
  });

  describe('custom thresholds', () => {
    it('should use custom warning threshold', () => {
      const { result } = renderHook(() =>
        useDeviationDetection(3, { warning: 5, danger: 10 })
      );

      expect(result.current.level).toBe('none');
    });

    it('should use custom danger threshold', () => {
      const { result } = renderHook(() =>
        useDeviationDetection(8, { warning: 5, danger: 10 })
      );

      expect(result.current.level).toBe('warning');
    });

    it('should use partial custom thresholds', () => {
      const { result } = renderHook(() => useDeviationDetection(1.5, { danger: 5 }));

      expect(result.current.level).toBe('warning');
      expect(result.current.isWarning).toBe(true);
    });
  });

  describe('negative values', () => {
    it('should handle negative values correctly', () => {
      const { result } = renderHook(() => useDeviationDetection(-1.5));

      expect(result.current.level).toBe('warning');
    });

    it('should handle large negative values', () => {
      const { result } = renderHook(() => useDeviationDetection(-3));

      expect(result.current.level).toBe('danger');
    });
  });

  describe('color classes', () => {
    it('should return correct classes for none level', () => {
      const { result } = renderHook(() => useDeviationDetection(0));

      expect(result.current.colorClass).toBe('text-gray-600');
      expect(result.current.bgClass).toBe('bg-gray-50');
      expect(result.current.borderClass).toBe('border-gray-200');
      expect(result.current.textClass).toBe('text-gray-700');
      expect(result.current.pulseClass).toBe('');
    });

    it('should return correct classes for warning level', () => {
      const { result } = renderHook(() => useDeviationDetection(1.5));

      expect(result.current.colorClass).toBe('text-amber-500');
      expect(result.current.bgClass).toBe('bg-amber-50 dark:bg-amber-950/30');
      expect(result.current.borderClass).toBe('border-amber-200 dark:border-amber-800');
      expect(result.current.textClass).toBe('text-amber-700 dark:text-amber-400');
      expect(result.current.pulseClass).toBe('animate-pulse-warning');
    });

    it('should return correct classes for danger level', () => {
      const { result } = renderHook(() => useDeviationDetection(3));

      expect(result.current.colorClass).toBe('text-red-500');
      expect(result.current.bgClass).toBe('bg-red-50 dark:bg-red-950/30');
      expect(result.current.borderClass).toBe('border-red-200 dark:border-red-800');
      expect(result.current.textClass).toBe('text-red-700 dark:text-red-400');
      expect(result.current.pulseClass).toBe('animate-pulse-danger');
    });
  });

  describe('value type', () => {
    it('should handle percentage type', () => {
      const { result } = renderHook(() =>
        useDeviationDetection(1.5, {}, 'percentage')
      );

      expect(result.current.level).toBe('warning');
    });

    it('should handle absolute type', () => {
      const { result } = renderHook(() =>
        useDeviationDetection(1.5, {}, 'absolute')
      );

      expect(result.current.level).toBe('warning');
    });
  });

  describe('edge cases', () => {
    it('should handle very small values', () => {
      const { result } = renderHook(() => useDeviationDetection(0.001));

      expect(result.current.level).toBe('none');
    });

    it('should handle very large values', () => {
      const { result } = renderHook(() => useDeviationDetection(1000));

      expect(result.current.level).toBe('danger');
    });

    it('should handle floating point values', () => {
      const { result } = renderHook(() => useDeviationDetection(1.999999));

      expect(result.current.level).toBe('warning');
    });
  });

  describe('memoization', () => {
    it('should return stable result for same inputs', () => {
      const { result, rerender } = renderHook(() => useDeviationDetection(1.5));

      const firstResult = result.current;

      rerender();

      expect(result.current).toBe(firstResult);
    });

    it('should update when value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDeviationDetection(value),
        { initialProps: { value: 0.5 } }
      );

      expect(result.current.level).toBe('none');

      rerender({ value: 2.5 });

      expect(result.current.level).toBe('danger');
    });

    it('should update when threshold changes', () => {
      const { result, rerender } = renderHook(
        ({ threshold }) => useDeviationDetection(3, threshold),
        { initialProps: { threshold: {} } }
      );

      expect(result.current.level).toBe('danger');

      rerender({ threshold: { warning: 5, danger: 10 } });

      expect(result.current.level).toBe('none');
    });
  });
});

describe('useBatchDeviationDetection', () => {
  describe('initialization', () => {
    it('should return empty results for empty array', () => {
      const { result } = renderHook(() => useBatchDeviationDetection([]));

      expect(result.current.results).toEqual([]);
      expect(result.current.hasWarning).toBe(false);
      expect(result.current.hasDanger).toBe(false);
      expect(result.current.maxDeviation).toBe(0);
      expect(result.current.maxLevel).toBe('none');
    });
  });

  describe('multiple values', () => {
    it('should process multiple values', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([0.5, 1.5, 2.5])
      );

      expect(result.current.results).toHaveLength(3);
      expect(result.current.results[0].level).toBe('none');
      expect(result.current.results[1].level).toBe('warning');
      expect(result.current.results[2].level).toBe('danger');
    });

    it('should detect warning in batch', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([0.5, 1.5])
      );

      expect(result.current.hasWarning).toBe(true);
      expect(result.current.hasDanger).toBe(false);
    });

    it('should detect danger in batch', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([0.5, 2.5])
      );

      expect(result.current.hasWarning).toBe(false);
      expect(result.current.hasDanger).toBe(true);
    });
  });

  describe('max deviation', () => {
    it('should calculate max deviation', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([1, 3, -5, 2])
      );

      expect(result.current.maxDeviation).toBe(5);
    });

    it('should determine max level', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([0.5, 1.5, 2.5])
      );

      expect(result.current.maxLevel).toBe('danger');
    });

    it('should prioritize danger over warning', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([1.5, 2.5])
      );

      expect(result.current.maxLevel).toBe('danger');
    });
  });

  describe('custom thresholds', () => {
    it('should use custom thresholds for all values', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([5, 8], { warning: 10, danger: 20 })
      );

      expect(result.current.hasWarning).toBe(false);
      expect(result.current.hasDanger).toBe(false);
    });
  });

  describe('negative values', () => {
    it('should handle negative values in batch', () => {
      const { result } = renderHook(() =>
        useBatchDeviationDetection([-1.5, -2.5])
      );

      expect(result.current.hasWarning).toBe(true);
      expect(result.current.hasDanger).toBe(true);
    });
  });

  describe('memoization', () => {
    it('should return stable result for same inputs', () => {
      const { result, rerender } = renderHook(() =>
        useBatchDeviationDetection([1, 2, 3])
      );

      const firstResult = result.current;

      rerender();

      expect(result.current.results).toEqual(firstResult.results);
      expect(result.current.hasWarning).toBe(firstResult.hasWarning);
      expect(result.current.hasDanger).toBe(firstResult.hasDanger);
    });

    it('should update when values change', () => {
      const { result, rerender } = renderHook(
        ({ values }) => useBatchDeviationDetection(values),
        { initialProps: { values: [0.5, 1] } }
      );

      expect(result.current.hasWarning).toBe(false);

      rerender({ values: [0.5, 1.5] });

      expect(result.current.hasWarning).toBe(true);
    });
  });
});

describe('DEFAULT_DEVIATION_THRESHOLD', () => {
  it('should have warning threshold of 1', () => {
    expect(DEFAULT_DEVIATION_THRESHOLD.warning).toBe(1);
  });

  it('should have danger threshold of 2', () => {
    expect(DEFAULT_DEVIATION_THRESHOLD.danger).toBe(2);
  });
});
