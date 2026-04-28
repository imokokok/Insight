export type RefreshInterval = 0 | 10000 | 30000 | 60000 | 300000;

export const REFRESH_INTERVALS: { value: RefreshInterval; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
];

export function refreshIntervalToMs(interval: RefreshInterval): number | false {
  return interval === 0 ? false : interval;
}
