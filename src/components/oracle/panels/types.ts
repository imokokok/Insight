export interface NetworkMetric {
  title: string;
  value: string | number;
  unit?: string;
  trend: number;
  trendDirection: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

export type NetworkStatus = 'online' | 'warning' | 'offline';
