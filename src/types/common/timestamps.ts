export interface TimestampFields {
  createdAt: number;
  updatedAt: number;
}

export interface TimeRangeValue {
  start: number;
  end: number;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export { getTimeAgo, getTimeAgoDiff, formatTimeAgo } from '@/lib/utils/timestamp';
export type { TimeAgoResult } from '@/lib/utils/timestamp';
