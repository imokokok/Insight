export type SortField =
  | 'name'
  | 'responseTime'
  | 'successRate'
  | 'reputation'
  | 'staked'
  | 'earnings';
export type SortDirection = 'asc' | 'desc';
export type TimeRange = '7d' | '30d' | '90d';

export interface EarningsTrend {
  day: string;
  daily: number;
  cumulative: number;
}

export const TIME_RANGE_OPTIONS: { value: TimeRange; labelKey: string; days: number }[] = [
  { value: '7d', labelKey: 'validatorAnalytics.timeRange.7d', days: 7 },
  { value: '30d', labelKey: 'validatorAnalytics.timeRange.30d', days: 30 },
  { value: '90d', labelKey: 'validatorAnalytics.timeRange.90d', days: 90 },
];

export const VALIDATOR_TYPE_STYLES: Record<string, string> = {
  institution: 'bg-purple-100 text-purple-700',
  independent: 'bg-blue-100 text-blue-700',
  community: 'bg-green-100 text-green-700',
};

export const VALIDATOR_TYPE_LABELS: Record<string, string> = {
  institution: 'validatorAnalytics.validatorType.institution',
  independent: 'validatorAnalytics.validatorType.independent',
  community: 'validatorAnalytics.validatorType.community',
};
