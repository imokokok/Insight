'use client';

import { useMemo, useState } from 'react';

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
  const [now] = useState(() => Date.now());

  const result = useMemo(() => {
    if (!lastUpdated) {
      return {
        status: 'expired' as DataFreshnessStatus,
        ageInMinutes: 0,
        message: '数据未加载',
        shouldRefresh: true,
      };
    }

    const ageInMinutes = (now - lastUpdated.getTime()) / 60000;

    if (ageInMinutes < maxFreshTime) {
      return {
        status: 'fresh' as DataFreshnessStatus,
        ageInMinutes,
        message: '数据新鲜',
        shouldRefresh: false,
      };
    }

    if (ageInMinutes < maxStaleTime) {
      return {
        status: 'stale' as DataFreshnessStatus,
        ageInMinutes,
        message: '数据即将过期',
        shouldRefresh: false,
      };
    }

    return {
      status: 'expired' as DataFreshnessStatus,
      ageInMinutes,
      message: '数据已过期',
      shouldRefresh: true,
    };
  }, [lastUpdated, maxFreshTime, maxStaleTime, now]);

  return result;
}
