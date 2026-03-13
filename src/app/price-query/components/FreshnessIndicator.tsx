'use client';

import { useMemo } from 'react';

interface FreshnessIndicatorProps {
  timestamp: number;
  maxAcceptableDelay?: number;
}

export function FreshnessIndicator({
  timestamp,
  maxAcceptableDelay = 300000, // 5 minutes default
}: FreshnessIndicatorProps) {
  const { age, isFresh, isExpired } = useMemo(() => {
    const ageValue = Date.now() - timestamp;
    return {
      age: ageValue,
      isFresh: ageValue < maxAcceptableDelay,
      isExpired: ageValue > maxAcceptableDelay * 2, // 10 minutes
    };
  }, [timestamp, maxAcceptableDelay]);

  const formatAge = (ms: number): string => {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)}秒前`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)}分钟前`;
    } else if (ms < 86400000) {
      return `${Math.round(ms / 3600000)}小时前`;
    } else {
      return `${Math.round(ms / 86400000)}天前`;
    }
  };

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        数据过期
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 ${isFresh ? 'text-green-600' : 'text-orange-600'}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${isFresh ? 'bg-green-500' : 'bg-orange-500'} ${isFresh ? '' : 'animate-pulse'}`}
      />
      {formatAge(age)}
    </span>
  );
}
