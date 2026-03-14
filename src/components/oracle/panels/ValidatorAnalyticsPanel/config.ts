export type SortField = 'name' | 'responseTime' | 'successRate' | 'reputation' | 'staked' | 'earnings';
export type SortDirection = 'asc' | 'desc';
export type TimeRange = '7d' | '30d' | '90d';

export interface EarningsTrend {
  day: string;
  daily: number;
  cumulative: number;
}

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string; days: number }[] = [
  { value: '7d', label: '7天', days: 7 },
  { value: '30d', label: '30天', days: 30 },
  { value: '90d', label: '90天', days: 90 },
];

export const VALIDATOR_TYPE_STYLES: Record<string, string> = {
  institution: 'bg-purple-100 text-purple-700',
  independent: 'bg-blue-100 text-blue-700',
  community: 'bg-green-100 text-green-700',
};

export const VALIDATOR_TYPE_LABELS: Record<string, string> = {
  institution: '机构',
  independent: '独立',
  community: '社区',
};
