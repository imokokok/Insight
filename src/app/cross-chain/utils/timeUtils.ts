import { type TimeRange } from '@/components/charts/ChartToolbar';

export const getTimestampCutoff = (range: TimeRange): number => {
  const now = Date.now();
  switch (range) {
    case '1H':
      return now - 60 * 60 * 1000;
    case '24H':
      return now - 24 * 60 * 60 * 1000;
    case '7D':
      return now - 7 * 24 * 60 * 60 * 1000;
    case '30D':
      return now - 30 * 24 * 60 * 60 * 1000;
    default:
      return now - 24 * 60 * 60 * 1000;
  }
};

/** @deprecated Use getTimestampCutoff instead */
export const getTimeRangeInMs = getTimestampCutoff;
