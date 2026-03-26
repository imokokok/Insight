/**
 * @fileoverview 布局相关类型定义
 * @description 定义页面布局、导航、Hero 等组件的类型
 */

import { ReactNode, HTMLAttributes } from 'react';
import { OracleProvider } from '../oracle';

// ============================================================================
// 页面头部类型
// ============================================================================

/**
 * 页面头部 Props
 */
export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onRefresh: () => void;
  onExport?: (options?: Record<string, unknown>) => void;
  isRefreshing: boolean;
  showTimeRange?: boolean;
  showExport?: boolean;
  lastUpdateTime?: number;
}

/**
 * Hero 区域 Props
 */
export interface HeroProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  iconBgColor?: string;
  themeColor?: string;
  actions?: ReactNode;
  stats?: HeroStatItem[];
  background?: 'gradient' | 'solid' | 'image';
  backgroundImage?: string;
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Hero 统计项
 */
export interface HeroStatItem {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
}

/**
 * 面包屑项
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  active?: boolean;
}

// ============================================================================
// 导航类型
// ============================================================================

/**
 * 导航项类型
 */
export interface NavigationItem {
  id: string;
  label: string;
  href?: string;
  icon?: ReactNode;
  badge?: number | string;
  children?: NavigationItem[];
  disabled?: boolean;
  external?: boolean;
}

/**
 * Tab 配置类型
 */
export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  disabled?: boolean;
}

/**
 * Tab 导航 Props
 */
export interface TabNavigationProps extends HTMLAttributes<HTMLElement> {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs?: TabItem[];
  defaultTabs?: 'oracle' | 'custom';
  customTabs?: TabItem[];
  provider?: string;
  oracleTabs?: OracleTab[];
  themeColor?: string;
}

/**
 * Tab 项类型
 */
export interface TabItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number | string;
  disabled?: boolean;
}

/**
 * Oracle Tab 类型
 */
export interface OracleTab {
  id: string;
  labelKey: string;
  icon?: string;
}

/**
 * UI 时间范围类型
 */
export type UITimeRange = '1H' | '24H' | '7D' | '30D' | '90D' | '1Y' | 'ALL';

// ============================================================================
// 页面配置类型
// ============================================================================

/**
 * 页面配置类型
 */
export interface PageConfig {
  title: string;
  description?: string;
  provider: OracleProvider;
  tabs: TabConfig[];
  refreshInterval?: number;
  showExport?: boolean;
  showRefresh?: boolean;
  showTimeRange?: boolean;
}

/**
 * 页面模板 Props
 */
export interface PageTemplateProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

// ============================================================================
// 侧边栏类型
// ============================================================================

/**
 * 侧边栏 Props
 */
export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  items: NavigationItem[];
  activeItem?: string;
  onItemClick?: (item: NavigationItem) => void;
  collapsed?: boolean;
  onCollapse?: (collapsed: boolean) => void;
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * 侧边栏组 Props
 */
export interface SidebarGroupProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// ============================================================================
// 布局容器类型
// ============================================================================

/**
 * 布局容器 Props
 */
export interface LayoutContainerProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  direction?: 'row' | 'column';
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  fullHeight?: boolean;
}

/**
 * 网格布局 Props
 */
export interface GridLayoutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  columns?: number;
  minColumnWidth?: string;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
}

/**
 * 分栏布局 Props
 */
export interface SplitLayoutProps extends HTMLAttributes<HTMLDivElement> {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: string;
  rightWidth?: string;
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: boolean;
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
}

// ============================================================================
// 面板类型
// ============================================================================

/**
 * 面板 Props
 */
export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  headerAction?: ReactNode;
  footer?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
}

/**
 * 可折叠面板 Props
 */
export interface CollapsiblePanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

// ============================================================================
// 页脚类型
// ============================================================================

/**
 * 页脚链接组
 */
export interface FooterLinkGroup {
  title: string;
  links: {
    label: string;
    href: string;
    external?: boolean;
  }[];
}

/**
 * 页脚 Props
 */
export interface FooterProps extends HTMLAttributes<HTMLElement> {
  linkGroups?: FooterLinkGroup[];
  socialLinks?: {
    icon: ReactNode;
    href: string;
    label: string;
  }[];
  copyright?: string;
  logo?: ReactNode;
}

// ============================================================================
// 响应式布局类型
// ============================================================================

/**
 * 响应式断点类型
 */
export type Breakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

/**
 * 响应式值类型
 */
export type ResponsiveValue<T> = T | Partial<Record<Breakpoint, T>>;

/**
 * 响应式布局 Props
 */
export interface ResponsiveLayoutProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  columns?: ResponsiveValue<number>;
  gap?: ResponsiveValue<string>;
  padding?: ResponsiveValue<string>;
}

// ============================================================================
// 模态框/抽屉布局类型
// ============================================================================

/**
 * 模态框 Props
 */
export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
}

/**
 * 抽屉 Props
 */
export interface DrawerProps extends HTMLAttributes<HTMLDivElement> {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  placement?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  showCloseButton?: boolean;
  footer?: ReactNode;
}

// ============================================================================
// 浮动操作按钮类型
// ============================================================================

/**
 * 浮动操作按钮 Props
 */
export interface FloatingActionButtonProps extends HTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  onClick: () => void;
  label?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  offset?: { x: number; y: number };
}

// ============================================================================
// 加载遮罩类型
// ============================================================================

/**
 * 加载遮罩 Props
 */
export interface LoadingOverlayProps extends HTMLAttributes<HTMLDivElement> {
  isLoading: boolean;
  message?: string;
  children: ReactNode;
  blur?: boolean;
  spinner?: ReactNode;
}

// ============================================================================
// 粘性布局类型
// ============================================================================

/**
 * 粘性头部 Props
 */
export interface StickyHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  offset?: number;
  zIndex?: number;
  shadowOnScroll?: boolean;
}

/**
 * 粘性底部 Props
 */
export interface StickyFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  zIndex?: number;
  border?: boolean;
}
