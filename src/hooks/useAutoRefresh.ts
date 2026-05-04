import type { RefreshInterval } from '@/types/common';
import {
  REFRESH_INTERVAL_OPTIONS,
  refreshIntervalToLabel,
  labelToRefreshInterval,
} from '@/types/common';

export type { RefreshInterval } from '@/types/common';
export {
  REFRESH_INTERVAL_OPTIONS,
  refreshIntervalToLabel,
  labelToRefreshInterval,
} from '@/types/common';

export const REFRESH_INTERVALS = REFRESH_INTERVAL_OPTIONS;

export function refreshIntervalToMs(interval: RefreshInterval): number | false {
  return interval === 0 ? false : interval;
}
