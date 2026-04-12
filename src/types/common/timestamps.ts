export interface TimeRangeValue {
  start: number;
  end: number;
}

export type TimeRangePreset = '1H' | '6H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

export interface TimeRange {
  preset?: TimeRangePreset;
  custom?: TimeRangeValue;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai',
  });
}

export { getTimeAgo, getTimeAgoDiff, formatTimeAgo } from '@/lib/utils/timestamp';
export type { TimeAgoResult } from '@/lib/utils/timestamp';
