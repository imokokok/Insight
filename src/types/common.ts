export type RefreshInterval = 0 | 10000 | 30000 | 60000 | 300000;

export const REFRESH_INTERVAL_OPTIONS: { value: RefreshInterval; label: string }[] = [
  { value: 0, label: 'Off' },
  { value: 10000, label: '10s' },
  { value: 30000, label: '30s' },
  { value: 60000, label: '1m' },
  { value: 300000, label: '5m' },
];

export function refreshIntervalToLabel(interval: RefreshInterval): string {
  return REFRESH_INTERVAL_OPTIONS.find((o) => o.value === interval)?.label ?? 'Unknown';
}

export function labelToRefreshInterval(label: string): RefreshInterval {
  return REFRESH_INTERVAL_OPTIONS.find((o) => o.label === label)?.value ?? 0;
}
