/**
 * 导出功能类型定义
 */

/**
 * 导出格式
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx';

/**
 * 导出日期范围
 */
export type ExportDateRange = '7d' | '30d' | '90d' | 'custom';

/**
 * 导出时间范围
 */
export type ExportTimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

/**
 * 导出配置
 */
export interface ExportConfig {
  /** 格式 */
  format: ExportFormat;
  /** 日期范围 */
  dateRange: ExportDateRange;
  /** 时间范围 */
  timeRange: ExportTimeRange;
  /** 开始日期 - 可选 */
  startDate?: string;
  /** 结束日期 - 可选 */
  endDate?: string;
  /** 是否包含图表 */
  includeCharts: boolean;
  /** 是否包含原始数据 */
  includeRawData: boolean;
  /** 是否包含元数据 */
  includeMetadata: boolean;
  /** 指标列表 */
  metrics: string[];
  /** 筛选器 */
  filters: {
    oracles: string[];
    assets: string[];
    chains: string[];
  };
}

/**
 * 定时导出频率
 */
export type ScheduledExportFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * 定时导出配置
 */
export interface ScheduledExport {
  /** 导出ID */
  id: string;
  /** 导出名称 */
  name: string;
  /** 频率 */
  frequency: ScheduledExportFrequency;
  /** 时间 */
  time: string;
  /** 邮箱 */
  email: string;
  /** 格式 */
  format: ExportFormat;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 最后运行时间 - 可选 */
  lastRun?: string;
  /** 下次运行时间 - 可选 */
  nextRun?: string;
  /** 最后运行状态 - 可选 */
  lastRunStatus?: 'success' | 'failed' | 'pending';
}
