export type SortField = 'tokens' | 'commissionRate' | 'uptime' | 'rank';
export type SortDirection = 'asc' | 'desc';
export type FilterStatus = 'all' | 'active' | 'jailed';
export type QuickFilter = 'all' | 'lowCommission' | 'highStake' | 'highUptime';
export type TabType = 'overview' | 'history' | 'calculator';

export interface ValidatorPanelProps {
  limit?: number;
  autoUpdate?: boolean;
  updateInterval?: number;
}

export const statusConfig = {
  active: {
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    label: '活跃',
  },
  jailed: {
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    label: '监禁中',
  },
} as const;
