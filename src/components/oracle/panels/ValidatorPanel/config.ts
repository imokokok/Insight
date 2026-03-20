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
    bgColor: 'bg-success-500',
    textColor: 'text-success-600',
    labelKey: 'validatorPanel.status.active',
  },
  jailed: {
    bgColor: 'bg-danger-500',
    textColor: 'text-danger-600',
    labelKey: 'validatorPanel.status.jailed',
  },
} as const;
