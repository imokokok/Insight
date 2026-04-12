/**
 * 数据对比功能类型定义
 */

import { type OracleProvider } from '@/types/oracle';

// ============================================
// 时间段对比类型
// ============================================

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

export interface TimePeriod {
  id: string;
  label: string;
  startDate: Date;
  endDate: Date;
  range: TimeRange;
}

export interface TimeComparisonConfig {
  primaryPeriod: TimePeriod;
  comparisonPeriod: TimePeriod;
  comparisonType: 'previous' | 'custom' | 'year_over_year';
}

// ============================================
// 差异高亮类型
// ============================================

export type DifferenceSeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';
