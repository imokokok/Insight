export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

export interface PageConfig {
  title: string;
  description?: string;
  provider: import('../oracle/enums').OracleProvider;
  tabs: TabConfig[];
  refreshInterval?: number;
}

export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  color?: string;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  color?: string;
}

export interface StatsSummary {
  label: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: import('../oracle/constants').TrendDirection;
}

export * from './recharts';
