'use client';

import { useState, useEffect, useMemo } from 'react';

import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

interface DataFreshnessProps {
  lastUpdate: Date;
  warningThreshold?: number;
  dangerThreshold?: number;
  className?: string;
}

type FreshnessStatus = 'normal' | 'warning' | 'danger';

interface TimeInfo {
  seconds: number;
  text: string;
  status: FreshnessStatus;
}

function formatTimeAgo(seconds: number): string {
  if (seconds < 1) {
    return '刚刚';
  }
  if (seconds < 60) {
    return `${Math.floor(seconds)}秒前`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分钟前`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours}小时前`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days}天前`;
}

function getStatus(
  seconds: number,
  warningThreshold: number,
  dangerThreshold: number
): FreshnessStatus {
  if (seconds >= dangerThreshold) {
    return 'danger';
  }
  if (seconds >= warningThreshold) {
    return 'warning';
  }
  return 'normal';
}

export function DataFreshness({
  lastUpdate,
  warningThreshold = 30,
  dangerThreshold = 60,
  className,
}: DataFreshnessProps) {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeInfo: TimeInfo = useMemo(() => {
    const diffMs = now.getTime() - new Date(lastUpdate).getTime();
    const seconds = Math.max(0, Math.floor(diffMs / 1000));
    const status = getStatus(seconds, warningThreshold, dangerThreshold);

    return {
      seconds,
      text: formatTimeAgo(seconds),
      status,
    };
  }, [now, lastUpdate, warningThreshold, dangerThreshold]);

  const statusConfig = {
    normal: {
      dotColor: semanticColors.success.DEFAULT,
      textColor: 'text-gray-500',
      bgColor: 'bg-transparent',
    },
    warning: {
      dotColor: semanticColors.warning.DEFAULT,
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    danger: {
      dotColor: semanticColors.danger.DEFAULT,
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  };

  const config = statusConfig[timeInfo.status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-300',
        config.bgColor,
        className
      )}
      title={`最后更新: ${new Date(lastUpdate).toLocaleString('zh-CN')}`}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
        style={{ backgroundColor: config.dotColor }}
      />
      <span className={cn('tabular-nums', config.textColor)}>{timeInfo.text}</span>
    </div>
  );
}

export default DataFreshness;
