/**
 * Dune Analytics 风格的扁平化设计常量
 * 设计原则：
 * - 无圆角或极小圆角
 * - 无阴影
 * - 简洁边框分隔
 * - 纯色背景
 * - 通过间距和边框建立视觉层次
 */

// 基础容器样式
export const flatContainer = {
  base: 'bg-white border border-gray-200',
  hover: 'hover:border-gray-300',
  active: 'active:border-gray-400',
};

// 卡片样式
export const flatCard = {
  wrapper: 'bg-white border border-gray-200',
  header: 'px-5 py-3 border-b border-gray-200',
  content: 'p-5',
  footer: 'px-5 py-3 border-t border-gray-200',
};

// 统计卡片样式
export const flatStatCard = {
  wrapper: 'bg-white border border-gray-200 p-4',
  label: 'text-xs text-gray-500 uppercase tracking-wider',
  value: 'text-xl font-semibold text-gray-900',
  subValue: 'text-xs text-gray-400',
  icon: 'p-2 bg-gray-100 text-gray-600',
};

// 区块分隔样式
export const flatSection = {
  wrapper: 'py-4',
  header: 'flex items-center justify-between mb-3',
  title: 'text-sm font-semibold text-gray-900',
  divider: 'border-b border-gray-200',
};

// 表格样式
export const flatTable = {
  wrapper: 'border border-gray-200',
  header: 'bg-gray-50 border-b border-gray-200',
  headerCell: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  row: 'border-b border-gray-100 last:border-b-0 hover:bg-gray-50',
  cell: 'px-4 py-3 text-sm text-gray-900',
};

// 按钮样式（扁平化）
export const flatButton = {
  base: 'px-4 py-2 border transition-colors duration-150',
  primary: 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800',
  secondary: 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
  ghost: 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100',
};

// 输入框样式
export const flatInput = {
  base: 'w-full px-3 py-2 bg-white border border-gray-300 text-gray-900 placeholder-gray-400',
  focus: 'focus:outline-none focus:border-gray-500',
  disabled: 'disabled:bg-gray-100 disabled:text-gray-500',
};

// 标签/徽章样式
export const flatBadge = {
  base: 'inline-flex items-center px-2 py-0.5 text-xs font-medium',
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  error: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
};

// 图表容器样式
export const flatChart = {
  wrapper: 'bg-white border border-gray-200 p-4',
  header: 'mb-4',
  title: 'text-sm font-semibold text-gray-900',
  subtitle: 'text-xs text-gray-500 mt-1',
};

// 列表样式
export const flatList = {
  wrapper: 'border border-gray-200 divide-y divide-gray-100',
  item: 'px-4 py-3 hover:bg-gray-50',
};

// 导航样式
export const flatNav = {
  item: 'px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50',
  active: 'px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100',
};

// 提示/警告样式
export const flatAlert = {
  base: 'p-4 border-l-4',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
  success: 'bg-green-50 border-green-400 text-green-800',
  warning: 'bg-amber-50 border-amber-400 text-amber-800',
  error: 'bg-red-50 border-red-400 text-red-800',
};

// 模态框/弹窗样式
export const flatModal = {
  overlay: 'fixed inset-0 bg-black/50',
  wrapper: 'bg-white border border-gray-200 shadow-xl',
  header: 'px-6 py-4 border-b border-gray-200',
  content: 'p-6',
  footer: 'px-6 py-4 border-t border-gray-200 bg-gray-50',
};

// 工具提示样式
export const flatTooltip = {
  wrapper: 'bg-gray-900 text-white text-xs px-2 py-1',
  arrow: 'border-gray-900',
};

// 分页样式
export const flatPagination = {
  wrapper: 'flex items-center gap-1',
  item: 'px-3 py-1 border border-gray-200 text-sm text-gray-600 hover:bg-gray-50',
  active: 'px-3 py-1 border border-gray-900 bg-gray-900 text-white',
  disabled: 'px-3 py-1 border border-gray-200 text-gray-400 cursor-not-allowed',
};

// 标签页样式
export const flatTabs = {
  wrapper: 'border-b border-gray-200',
  item: 'px-4 py-2 text-sm text-gray-500 hover:text-gray-700',
  active: 'px-4 py-2 text-sm font-medium text-gray-900 border-b-2 border-gray-900',
};

// 进度条样式
export const flatProgress = {
  wrapper: 'w-full h-2 bg-gray-200',
  bar: 'h-full bg-gray-900',
};

// 颜色常量（扁平化设计使用更克制的颜色）
export const flatColors = {
  background: {
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    tertiary: 'bg-gray-100',
  },
  border: {
    default: 'border-gray-200',
    hover: 'border-gray-300',
    active: 'border-gray-400',
  },
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    tertiary: 'text-gray-400',
    muted: 'text-gray-500',
  },
};

// 间距常量
export const flatSpacing = {
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

// 组合样式（常用组合）
export const flatComposed = {
  // 页面容器
  pageContainer: 'min-h-screen bg-white',
  pageHeader: 'border-b border-gray-200 py-6',
  pageContent: 'py-6',

  // 数据卡片
  dataCard: 'bg-white border border-gray-200 p-5',
  dataCardHeader: 'flex items-center justify-between mb-4 pb-4 border-b border-gray-100',
  dataCardTitle: 'text-sm font-semibold text-gray-900',

  // 指标展示
  metricDisplay: 'flex items-baseline gap-2',
  metricValue: 'text-2xl font-bold text-gray-900',
  metricLabel: 'text-xs text-gray-500 uppercase tracking-wider',
  metricChange: 'text-sm font-medium',

  // 图表区域
  chartArea: 'bg-white border border-gray-200',
  chartHeader: 'px-5 py-3 border-b border-gray-200',
  chartContent: 'p-5',
};
