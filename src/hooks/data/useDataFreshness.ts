'use client';

import { useEffect, useState, useMemo } from 'react';

export type DataFreshnessStatus = 'fresh' | 'stale' | 'expired';

export interface UseDataFreshnessReturn {
  status: DataFreshnessStatus;
  ageInMinutes: number;
  message: string;
  shouldRefresh: boolean;
}

export function useDataFreshness(
  lastUpdated: Date | null,
  maxFreshTime: number = 5,
  maxStaleTime: number = 30
): UseDataFreshnessReturn {
  const [result, setResult] = useState<UseDataFreshnessReturn>({
    status: 'expired',
    ageInMinutes: 0,
    message: 'Data not loaded',
    shouldRefresh: true,
  });

  const lastUpdatedTime = useMemo(() => lastUpdated?.getTime() ?? null, [lastUpdated]);

  useEffect(() => {
    const calculateFreshness = () => {
      const now = Date.now();

      if (lastUpdatedTime === null) {
        setResult({
          status: 'expired',
          ageInMinutes: 0,
          message: 'Data not loaded',
          shouldRefresh: true,
        });
        return;
      }

      const ageInMinutes = (now - lastUpdatedTime) / 60000;

      if (ageInMinutes < maxFreshTime) {
        setResult({
          status: 'fresh',
          ageInMinutes,
          message: 'Data is fresh',
          shouldRefresh: false,
        });
      } else if (ageInMinutes < maxStaleTime) {
        setResult({
          status: 'stale',
          ageInMinutes,
          message: 'Data is about to expire',
          shouldRefresh: false,
        });
      } else {
        setResult({
          status: 'expired',
          ageInMinutes,
          message: 'Data has expired',
          shouldRefresh: true,
        });
      }
    };

    calculateFreshness();

    const interval = setInterval(calculateFreshness, 60000);
    return () => clearInterval(interval);
  }, [lastUpdatedTime, maxFreshTime, maxStaleTime]);

  return result;
}
