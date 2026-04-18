import { useMemo } from 'react';

export function useConsistencyRating(stdDevPercent: number) {
  return useMemo(() => {
    if (stdDevPercent < 0) return null;

    if (stdDevPercent < 0.1) {
      return {
        label: 'Excellent',
        color: 'text-emerald-600',
      };
    }
    if (stdDevPercent < 0.3) {
      return {
        label: 'Good',
        color: 'text-blue-600',
      };
    }
    if (stdDevPercent < 0.5) {
      return {
        label: 'Fair',
        color: 'text-amber-600',
      };
    }
    return {
      label: 'Poor',
      color: 'text-red-600',
    };
  }, [stdDevPercent]);
}
