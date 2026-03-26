/**
 * @fileoverview UI 类型统一导出
 * @description 集中导出所有 UI 相关的类型定义
 */

// ============================================================================
// 基础 UI 类型（来自现有文件）
// ============================================================================

/**
 * Tab 配置类型
 */
export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
}

/**
 * 页面配置类型
 */
export interface PageConfig {
  title: string;
  description?: string;
  provider: import('../oracle/enums').OracleProvider;
  tabs: TabConfig[];
  refreshInterval?: number;
}

/**
 * 图表数据点
 */
export interface ChartDataPoint {
  x: number | string | Date;
  y: number;
  label?: string;
  color?: string;
}

/**
 * 时间序列数据
 */
export interface TimeSeriesData {
  timestamp: number;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * 热力图单元格
 */
export interface HeatmapCell {
  x: string;
  y: string;
  value: number;
  color?: string;
}

/**
 * 统计摘要
 */
export interface StatsSummary {
  label: string;
  value: number | string;
  change?: number;
  changePercent?: number;
  trend?: import('../oracle/constants').TrendDirection;
}

// ============================================================================
// 子模块导出
// ============================================================================

// 组件类型
export * from './components';

// 布局类型
export * from './layout';

// 主题类型
export * from './theme';

// 图表类型（包含 recharts 扩展）
export * from './charts';

// ============================================================================
// 类型重新导出（解决循环依赖和简化导入）
// ============================================================================

import type { OracleProvider } from '../oracle';

/**
 * 带预言机信息的图表数据点
 */
export interface OracleChartDataPoint extends ChartDataPoint {
  provider: OracleProvider;
}

/**
 * 带预言机信息的时间序列数据
 */
export interface OracleTimeSeriesData extends TimeSeriesData {
  provider: OracleProvider;
}

/**
 * UI 状态类型
 */
export type UIState = 'idle' | 'loading' | 'success' | 'error' | 'empty';

/**
 * UI 加载状态详情
 */
export interface UILoadingState {
  state: Extract<UIState, 'loading'>;
  message?: string;
  progress?: number;
}

/**
 * UI 错误状态详情
 */
export interface UIErrorState {
  state: Extract<UIState, 'error'>;
  message: string;
  code?: string;
  retryable?: boolean;
}

/**
 * UI 成功状态详情
 */
export interface UISuccessState<T = unknown> {
  state: Extract<UIState, 'success'>;
  data: T;
}

/**
 * UI 空状态详情
 */
export interface UIEmptyState {
  state: Extract<UIState, 'empty'>;
  message?: string;
}

/**
 * UI 异步操作状态
 */
export type UIAsyncState<T = unknown> =
  | { state: 'idle' }
  | UILoadingState
  | UIErrorState
  | UISuccessState<T>
  | UIEmptyState;

// ============================================================================
// 通用工具类型
// ============================================================================

/**
 * 可选项类型
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * 必需项类型
 */
export type RequiredProps<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * 组件尺寸类型
 */
export type ComponentSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * 组件变体类型
 */
export type ComponentVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * 响应式值类型
 */
export type ResponsiveValue<T> = T | Partial<Record<'sm' | 'md' | 'lg' | 'xl', T>>;
