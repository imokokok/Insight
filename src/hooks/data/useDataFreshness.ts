'use client';

import { useEffect, useState } from 'react';

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
    message: '数据未加载',
    shouldRefresh: true,
  });

  useEffect(() => {
    const calculateFreshness = () => {
      const now = Date.now();

      if (!lastUpdated) {
        setResult({
          status: 'expired',
          ageInMinutes: 0,
          message: '数据未加载',
          shouldRefresh: true,
        });
        return;
      }

      const ageInMinutes = (now - lastUpdated.getTime()) / 60000;

      if (ageInMinutes < maxFreshTime) {
        setResult({
          status: 'fresh',
          ageInMinutes,
          message: '数据新鲜',
          shouldRefresh: false,
        });
      } else if (ageInMinutes < maxStaleTime) {
        setResult({
          status: 'stale',
          ageInMinutes,
          message: '数据即将过期',
          shouldRefresh: false,
        });
      } else {
        setResult({
          status: 'expired',
          ageInMinutes,
          message: '数据已过期',
          shouldRefresh: true,
        });
      }
    };

    calculateFreshness();

    const interval = setInterval(calculateFreshness, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated, maxFreshTime, maxStaleTime]);

  return result;
}
