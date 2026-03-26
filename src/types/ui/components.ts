/**
 * @fileoverview UI 组件通用 Props 类型定义
 * @description 集中定义所有 UI 组件的 Props 类型，便于复用和维护
 */

import { ReactNode, ButtonHTMLAttributes, HTMLAttributes } from 'react';

// ============================================================================
// 基础组件类型
// ============================================================================

/**
 * 卡片组件变体类型
 */
export type CardVariant = 'default' | 'elevated' | 'bordered' | 'filled' | 'interactive';

/**
 * 卡片组件尺寸类型
 */
export type CardSize = 'sm' | 'md' | 'lg';

/**
 * 卡片组件 Props
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  onClick?: () => void;
}

/**
 * 卡片头部 Props
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * 卡片标题 Props
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

/**
 * 卡片描述 Props
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

/**
 * 卡片内容 Props
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * 卡片底部 Props
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

// ============================================================================
// 按钮组件类型
// ============================================================================

/**
 * 按钮变体类型
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/**
 * 按钮尺寸类型
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * 按钮组件 Props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/**
 * 图标按钮 Props
 */
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string;
  variant?: Exclude<ButtonVariant, 'danger'>;
  size?: Exclude<ButtonSize, 'icon'>;
  isLoading?: boolean;
}

// ============================================================================
// 徽章组件类型
// ============================================================================

/**
 * 徽章变体类型
 */
export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

/**
 * 徽章尺寸类型
 */
export type BadgeSize = 'sm' | 'md' | 'lg';

/**
 * 徽章组件 Props
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
}

// ============================================================================
// 空状态组件类型
// ============================================================================

/**
 * 空状态组件 Props
 */
export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  compact?: boolean;
}

// ============================================================================
// 统计卡片组件类型
// ============================================================================

/**
 * 变化类型
 */
export type ChangeType = 'positive' | 'negative' | 'neutral';

/**
 * 趋势类型
 */
export type TrendType = 'up' | 'down' | 'neutral';

/**
 * 基础统计卡片 Props
 */
export interface StatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: string;
  changeType?: ChangeType;
  icon?: ReactNode;
}

/**
 * 统计网格项 Props
 */
export interface StatGridItemProps {
  title: string;
  value: string;
  change: string;
  changeType: ChangeType;
  icon: ReactNode;
}

/**
 * 统计网格 Props
 */
export interface StatGridProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/**
 * 扁平统计项 Props
 */
export interface FlatStatItemProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  trend?: TrendType;
  trendValue?: string;
}

/**
 * 扁平区块 Props
 */
export interface FlatSectionProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

/**
 * 指标卡片 Props
 */
export interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: ReactNode;
}

// ============================================================================
// Dashboard 卡片组件类型
// ============================================================================

/**
 * Dashboard 卡片变体
 */
export type DashboardCardVariant = 'default' | 'elevated' | 'bordered';

/**
 * Dashboard 卡片 Props
 */
export interface DashboardCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: string | ReactNode;
  children: ReactNode;
  headerAction?: ReactNode;
  onClick?: () => void;
  variant?: DashboardCardVariant;
}

// ============================================================================
// 输入组件类型
// ============================================================================

/**
 * 输入框尺寸类型
 */
export type InputSize = 'sm' | 'md' | 'lg';

/**
 * 基础输入框 Props
 */
export interface InputProps extends HTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: InputSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/**
 * 文本域 Props
 */
export interface TextareaProps extends HTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rows?: number;
}

// ============================================================================
// 选择组件类型
// ============================================================================

/**
 * 选择器选项类型
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  icon?: ReactNode;
}

/**
 * 下拉选择器 Props
 */
export interface DropdownSelectProps<T = string> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
}

/**
 * 分段控制器 Props
 */
export interface SegmentedControlProps<T = string> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 多选 Props
 */
export interface MultiSelectProps<T = string> extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SelectOption<T>[];
  value: T[];
  onChange: (value: T[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  maxSelected?: number;
}

// ============================================================================
// 加载状态组件类型
// ============================================================================

/**
 * 加载状态 Props
 */
export interface LoadingStateProps extends HTMLAttributes<HTMLDivElement> {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullscreen?: boolean;
}

/**
 * 骨架屏 Props
 */
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

// ============================================================================
// 错误状态组件类型
// ============================================================================

/**
 * 错误显示 Props
 */
export interface ErrorDisplayProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

/**
 * 错误回退 Props
 */
export interface ErrorFallbackProps extends HTMLAttributes<HTMLDivElement> {
  error: Error | null;
  onReset?: () => void;
  title?: string;
}

// ============================================================================
// 提示组件类型
// ============================================================================

/**
 * Toast 类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast Props
 */
export interface ToastProps extends HTMLAttributes<HTMLDivElement> {
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: ReactNode;
}

/**
 * Tooltip Props
 */
export interface TooltipProps extends Omit<HTMLAttributes<HTMLDivElement>, 'content'> {
  content: ReactNode;
  children: ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

// ============================================================================
// 数据展示组件类型
// ============================================================================

/**
 * 价格变化 Props
 */
export interface PriceChangeProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  percentage?: boolean;
  decimals?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  inverse?: boolean;
}

/**
 * 数据新鲜度 Props
 */
export interface DataFreshnessProps extends HTMLAttributes<HTMLDivElement> {
  timestamp: number | Date;
  threshold?: number;
  showIcon?: boolean;
  format?: 'relative' | 'absolute';
}

/**
 * 实时状态条 Props
 */
export interface LiveStatusBarProps extends HTMLAttributes<HTMLDivElement> {
  isConnected: boolean;
  latency?: number;
  lastUpdate?: Date;
  showPulse?: boolean;
}

/**
 * 迷你走势图 Props
 */
export interface SparklineChartProps extends HTMLAttributes<SVGSVGElement> {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
  strokeWidth?: number;
  showArea?: boolean;
}

// ============================================================================
// 表单组件类型
// ============================================================================

/**
 * 表单标签 Props
 */
export interface FormLabelProps extends HTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  helperText?: string;
}

/**
 * 表单错误 Props
 */
export interface FormErrorProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

// ============================================================================
// 复选框和单选按钮类型
// ============================================================================

/**
 * 复选框 Props
 */
export interface CheckboxProps extends Omit<HTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: ReactNode;
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
}

/**
 * 单选按钮 Props
 */
export interface RadioProps extends Omit<HTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  error?: string;
}

// ============================================================================
// 导航组件类型
// ============================================================================



// ============================================================================
// 数据表格组件类型
// ============================================================================

/**
 * 表格列定义
 */
export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, record: T, index: number) => ReactNode;
}

/**
 * 数据表格 Props
 */
export interface DataTableProps<T = Record<string, unknown>> extends HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  sortable?: boolean;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (record: T, index: number) => void;
  rowKey?: string | ((record: T) => string);
  emptyText?: string;
  scroll?: { x?: number | string; y?: number | string };
}

// ============================================================================
// 教程组件类型
// ============================================================================

/**
 * 教程步骤类型
 */
export interface TutorialStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * 教程 Props
 */
export interface TutorialProps extends HTMLAttributes<HTMLDivElement> {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  currentStep?: number;
  onStepChange?: (step: number) => void;
  showProgress?: boolean;
  showSkip?: boolean;
  mask?: boolean;
}

// ============================================================================
// 头像上传组件类型
// ============================================================================

/**
 * 头像上传 Props
 */
export interface AvatarUploaderProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onUpload?: (file: File) => Promise<void> | void;
  onRemove?: () => void;
  loading?: boolean;
  accept?: string;
  maxSize?: number;
}

// ============================================================================
// 图表工具栏组件类型
// ============================================================================



// ============================================================================
// 紧凑统计卡片类型
// ============================================================================

/**
 * 紧凑统计卡片 Props
 */
export interface CompactStatCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  change?: number;
  changeType?: ChangeType;
  icon?: ReactNode;
  loading?: boolean;
}

// ============================================================================
// 增强统计卡片类型
// ============================================================================

/**
 * 增强统计卡片 Props
 */
export interface EnhancedStatCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: ChangeType;
  icon?: ReactNode;
  chart?: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}
