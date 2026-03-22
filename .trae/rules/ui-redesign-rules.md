# Insight 项目页面重构设计规则

> 本规则文档用于指导 Insight 区块链预言机数据分析平台的完整页面重构，确保在提升设计专业度的同时保留所有现有功能。

## 目录

1. [设计评估总结](#1-设计评估总结)
2. [保留的设计优势](#2-保留的设计优势)
3. [需要改进的设计问题](#3-需要改进的设计问题)
4. [页面重构规则](#4-页面重构规则)
5. [组件重构规则](#5-组件重构规则)
6. [功能保留清单](#6-功能保留清单)

---

## 1. 设计评估总结

### 1.1 当前水平评估

| 维度 | 当前评分 | 目标评分 | 差距 |
|------|----------|----------|------|
| 视觉设计系统 | 7.5/10 | 9/10 | 较小 |
| 信息密度 | 5/10 | 8/10 | **较大** |
| 数据可视化 | 6/10 | 9/10 | **较大** |
| 交互体验 | 7/10 | 8/10 | 中等 |
| 移动端体验 | 6/10 | 8/10 | 中等 |
| 专业性 | 6/10 | 9/10 | **较大** |
| **整体评分** | **6.2/10** | **8.7/10** | **2.5分** |

### 1.2 重构目标

- **保留所有现有功能** - 不进行任何功能删减
- **提升信息密度** - 达到专业数据平台水平
- **增强数据可视化** - 添加专业金融图表
- **优化实时体验** - 专业的实时数据展示
- **统一设计语言** - 确保所有页面风格一致

---

## 2. 保留的设计优势

以下设计元素在重构中**必须保留**，这些是项目已经做好的部分：

### 2.1 色彩系统 ✅

```css
/* 必须保留的 CSS 变量 */
--primary-50 到 --primary-900  /* 完整的蓝色色阶 */
--gray-50 到 --gray-900        /* 完整的中性色阶 */
--success-50 到 --success-700  /* 绿色语义色 */
--warning-50 到 --warning-700  /* 橙色语义色 */
--danger-50 到 --danger-700    /* 红色语义色 */
--info-50 到 --info-700        /* 蓝色语义色 */

/* 图表颜色 */
--chart-primary: #3b82f6;
--chart-secondary: #8b5cf6;
--chart-tertiary: #10b981;
--chart-quaternary: #f59e0b;
--chart-quinary: #ef4444;
--chart-senary: #06b6d4;
```

**保留原因**: 色彩系统完整且专业，符合金融数据平台调性。

### 2.2 排版系统 ✅

```css
/* 必须保留的排版工具类 */
.text-display   /* 3rem, 用于主标题 */
.text-h1        /* 2.25rem, 用于页面标题 */
.text-h2        /* 1.875rem, 用于区块标题 */
.text-h3        /* 1.5rem, 用于卡片标题 */
.text-h4        /* 1.25rem, 用于小标题 */
.text-body-lg   /* 1.125rem, 大号正文 */
.text-body      /* 1rem, 标准正文 */
.text-body-sm   /* 0.875rem, 小号正文 */
.text-caption   /* 0.75rem, 辅助文字 */
.text-overline  /* 0.6875rem, 标签文字 */
```

**保留原因**: 排版层级清晰，符合专业数据平台的可读性要求。

### 2.3 圆角规范 ✅

```css
--radius-sm: 0.25rem;   /* 4px - 按钮、输入框 */
--radius-md: 0.375rem;  /* 6px - 标准组件 */
--radius-lg: 0.5rem;    /* 8px - 卡片、面板 */
--radius-xl: 0.75rem;   /* 12px - 模态框 */
--radius-full: 9999px;  /* 完全圆角 - 徽章 */
```

**保留原因**: 微妙的圆角保持专业感，避免"卡通化"。

### 2.4 阴影系统 ✅

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

**保留原因**: 柔和阴影层次分明，不喧宾夺主。

### 2.5 间距系统 ✅

```css
/* 专业数据平台间距规范 - 紧凑风格 */
--spacing-page-x: 0.75rem;      /* 12px - 页面水平内边距 */
--spacing-page-y: 0.75rem;      /* 12px - 页面垂直内边距 */
--spacing-section: 0.75rem;     /* 12px - 组件间距 space-y */
--spacing-grid: 0.75rem;        /* 12px - 网格间距 gap */
--spacing-card: 0.75rem;        /* 12px - 卡片内边距 p */
--spacing-element: 0.5rem;      /* 8px - 元素间距 */
--spacing-tight: 0.25rem;       /* 4px - 紧凑间距 */

/* 容器规范 */
--container-max: 1600px;        /* 最大宽度，大屏充分利用 */
```

**使用规范**:
- 页面容器: `px-3 py-3` (12px)
- 组件间距: `space-y-3` (12px)
- 网格间距: `gap-3` (12px)
- 卡片内边距: `p-3` (12px)
- 卡片内部元素: `gap-2` (8px)

**保留原因**: 紧凑间距提升信息密度，符合专业数据平台标准。

### 2.6 动画系统 ✅

```css
/* 必须保留的动画类 */
.animate-fade-in      /* 淡入动画 */
.animate-fade-in-up   /* 上滑淡入 */
.animate-fade-in-down /* 下滑淡入 */
.animate-slide-in-left  /* 左滑进入 */
.animate-slide-in-right /* 右滑进入 */
```

**保留原因**: 动画流畅自然，提升用户体验。

### 2.7 核心组件 ✅

以下组件**必须保留**现有 API 和功能，仅进行样式优化：

| 组件 | 保留功能 | 允许优化 |
|------|----------|----------|
| Button | 所有 variant/size/loading 功能 | 样式微调 |
| Card | 所有 variant/headerAction/onClick | 间距调整 |
| Input | icon/error/disabled 功能 | 紧凑模式 |
| Select | 搜索、分组功能 | 样式优化 |
| Table | 基础表格功能 | 添加高级功能 |
| Badge | 所有 variant | 样式微调 |
| Tooltip | 基础提示功能 | 动画优化 |

### 2.7 响应式断点 ✅

```css
/* 保留现有断点 */
sm: 640px   /* 手机横屏 */
md: 768px   /* 平板 */
lg: 1024px  /* 小桌面 */
xl: 1280px  /* 标准桌面 */
2xl: 1536px /* 大桌面 */
```

---

## 3. 需要改进的设计问题

### 3.1 信息密度过低 ❌

**问题描述**:
- 页面留白比例 25-30%，专业平台通常 15-20%
- 卡片间距过大（gap-6 = 24px）
- 单屏信息量少

**改进规则**:
```css
/* 页面内边距 - 从宽松改为紧凑 */
/* 旧 */
px-6 lg:px-12 xl:px-20 py-6
/* 新 */
px-4 lg:px-6 py-4

/* 卡片间距 - 从宽松改为紧凑 */
/* 旧 */
gap-6  /* 24px */
/* 新 */
gap-4  /* 16px，数据密集型页面使用 gap-3 (12px) */

/* 表格行高 - 添加紧凑模式 */
--table-row-height-compact: 2.5rem;    /* 40px */
--table-row-height-normal: 3.5rem;     /* 56px */
--table-row-height-comfortable: 4rem;  /* 64px */
```

### 3.2 实时数据展示不专业 ❌

**问题描述**:
- 仅小圆点闪烁，缺少专业实时状态栏
- 数值变化无动画
- WebSocket 状态展示弱

**改进规则**:
```typescript
// 必须添加的新组件

// 1. LiveIndicator - 实时状态指示器
interface LiveIndicatorProps {
  isConnected: boolean;
  latency?: number;  // 网络延迟 ms
  lastUpdate?: Date;
}

// 2. LiveStatusBar - 实时状态栏
interface LiveStatusBarProps {
  currentTime: Date;      // UTC 时间，精确到秒
  latency: number;        // 网络延迟
  lastUpdate: Date;       // 最后更新时间
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

// 3. PriceChange - 价格变化显示
interface PriceChangeProps {
  currentPrice: number;
  previousPrice: number;
  currency?: string;
  animated?: boolean;     // 是否启用数值动画
}

// 4. DataFreshness - 数据新鲜度指示
interface DataFreshnessProps {
  lastUpdate: Date;
  threshold?: {
    warning: number;      // 警告阈值（秒）
    danger: number;       // 危险阈值（秒）
  };
}
```

### 3.3 数据表格功能基础 ❌

**问题描述**:
- 无固定列功能
- 单字段排序
- 缺少条件格式

**改进规则**:
```typescript
// DataTablePro - 专业数据表格
interface DataTableProProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  
  // 新增功能
  fixedColumns?: {
    left?: string[];      // 左侧固定列的 key
    right?: string[];     // 右侧固定列的 key
  };
  
  conditionalFormatting?: {
    field: string;
    rules: {
      condition: 'gt' | 'lt' | 'eq' | 'between';
      value: number | [number, number];
      style: 'success' | 'danger' | 'warning' | 'info';
    }[];
  }[];
  
  multiSort?: boolean;    // 是否支持多字段排序
  resizable?: boolean;    // 是否支持列宽调整
  columnVisibility?: boolean; // 是否支持列显示/隐藏
  
  density?: 'compact' | 'normal' | 'comfortable';
}
```

### 3.4 KPI 卡片信息单一 ❌

**问题描述**:
- 仅显示当前值和变化率
- 缺少趋势微图
- 无细分数据

**改进规则**:
```typescript
// 增强 StatCard 组件
interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    percentage: boolean;
    timeframe: string;    // "vs last 24h"
  };
  
  // 新增功能
  sparkline?: {
    data: number[];
    trend: 'up' | 'down' | 'neutral';
  };
  
  breakdown?: {
    label: string;
    value: string | number;
    percentage: number;
  }[];  // 细分数据
  
  benchmark?: {
    label: string;
    value: number;
  };  // 对比基准
  
  actions?: {
    info?: string;        // 信息提示
    link?: string;        // 查看详情链接
    favorite?: boolean;   // 收藏功能
  };
}
```

### 3.5 数据可视化不够专业 ❌

**问题描述**:
- 缺少 K线图、成交量图、深度图
- 图表工具栏简陋
- 无图表联动

**改进规则**:
```typescript
// 新增专业图表组件

// 1. SparklineChart - 迷你趋势图
interface SparklineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;         // 是否填充面积
  animate?: boolean;
}

// 2. CandlestickChart - 蜡烛图
interface CandlestickChartProps {
  data: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
  }[];
}

// 3. VolumeChart - 成交量图
interface VolumeChartProps {
  data: {
    timestamp: number;
    volume: number;
    color?: string;       // 根据涨跌显示不同颜色
  }[];
}

// 4. ChartToolbar - 图表工具栏
interface ChartToolbarProps {
  timeRanges: ('1H' | '24H' | '7D' | '30D' | '1Y' | 'ALL')[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
  
  chartTypes: ('line' | 'area' | 'candle')[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  
  indicators?: string[];  // 可添加的技术指标
  onAddIndicator?: (indicator: string) => void;
  
  onExport?: () => void;  // 导出图表
}

// 5. 图表联动
interface ChartSyncProps {
  charts: string[];       // 需要联动的图表 ID
  syncZoom: boolean;      // 同步缩放
  syncPan: boolean;       // 同步平移
  syncTimeRange: boolean; // 同步时间范围
}
```

### 3.6 导航信息架构不清晰 ❌

**问题描述**:
- 面包屑导航缺失
- 快捷操作不足

**改进规则**:
```typescript
// 1. Breadcrumb 组件
interface BreadcrumbProps {
  items: {
    label: string;
    href?: string;
    icon?: React.ReactNode;
  }[];
}

// 2. CommandSearch - 命令式搜索
interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
  
  // 支持自然语言查询
  onSearch: (query: string) => void;
  
  // 搜索结果分类
  results: {
    tokens?: SearchResult[];
    oracles?: SearchResult[];
    pages?: SearchResult[];
  };
}
```

### 3.7 移动端体验待优化 ❌

**问题描述**:
- 表格在移动端体验差
- 图表触摸交互不流畅

**改进规则**:
```typescript
// 移动端专用组件

// 1. CardTable - 卡片式表格（移动端）
interface CardTableProps<T> {
  data: T[];
  renderCard: (item: T) => React.ReactNode;
  onCardClick?: (item: T) => void;
}

// 2. MobileChart - 移动端优化图表
interface MobileChartProps {
  data: any[];
  enablePinchZoom: boolean;   // 双指缩放
  enablePan: boolean;         // 单指平移
  onLongPress?: (dataPoint: any) => void;
}

// 3. BottomNav - 底部导航栏（移动端）
interface BottomNavProps {
  items: {
    icon: React.ReactNode;
    label: string;
    href: string;
    active?: boolean;
  }[];
}
```

---

## 4. 页面重构规则

### 4.1 首页 (Home)

**保留功能**:
- ProfessionalHero 搜索功能
- LivePriceTicker 实时价格滚动
- BentoMetricsGrid 指标网格
- OracleMarketOverview 市场概览
- ArbitrageHeatmap 套利热力图
- ProfessionalCTA 行动号召

**改进规则**:
```typescript
// 1. ProfessionalHero 优化
// - 减小内边距: py-12 → py-8
// - 搜索框保持现有功能，添加实时搜索建议
// - 指标卡片添加 SparklineChart

// 2. BentoMetricsGrid 优化
// - 减小间距: gap-6 → gap-4
// - 每个指标卡片添加迷你趋势图
// - 添加细分数据展示

// 3. 添加 LiveStatusBar
// - 在页面顶部添加实时状态栏
// - 显示时间、延迟、连接状态
```

### 4.2 市场概览 (MarketOverview)

**保留功能**:
- MarketHeader 页面头部
- MarketStats 市场统计
- ChartContainer 图表容器
- MarketSidebar 侧边栏
- AssetsTable 资产表格
- AnomalyModal 异常详情弹窗

**改进规则**:
```typescript
// 1. 布局优化 - 紧凑专业风格
// - 页面容器: px-3 py-3 (极致紧凑)
// - 组件间距: space-y-3
// - 网格间距: gap-3
// - 卡片内边距: p-3
// - 最大宽度: max-w-[1600px] (大屏充分利用)
// - 页面容器内边距: px-4 sm:px-6 lg:px-8 py-6 → px-3 py-3

// 2. MarketStats 优化
// - 使用增强版 StatCard
// - 添加 SparklineChart 迷你趋势图
// - 添加细分数据展示

// 3. ChartContainer 优化
// - 添加 ChartToolbar
// - 支持图表类型切换
// - 支持时间范围联动

// 4. AssetsTable 优化
// - 使用 DataTablePro
// - 添加固定列（资产名称、价格）
// - 添加条件格式（涨跌幅颜色）
// - 支持紧凑模式

// 5. 添加 Breadcrumb
// - 页面顶部添加面包屑导航
```

### 4.3 价格查询 (PriceQuery)

**保留功能**:
- QueryForm 查询表单
- QueryResults 查询结果
- PriceChart 价格图表
- PriceResultsTable 结果表格
- DataQualityPanel 数据质量面板
- ExportConfig 导出配置

**改进规则**:
```typescript
// 1. 布局优化
// - 紧凑布局，减小间距
// - 图表区域最大化

// 2. PriceChart 优化
// - 添加 CandlestickChart 支持
// - 添加 VolumeChart 成交量图
// - 添加 ChartToolbar
// - 支持画图工具

// 3. 添加实时数据展示
// - 添加 PriceChange 组件
// - 添加 DataFreshness 组件
// - 价格实时更新动画

// 4. 数据表格优化
// - 使用 DataTablePro
// - 添加条件格式
// - 支持多预言机对比
```

### 4.4 跨链分析 (CrossChain)

**保留功能**:
- 所有现有图表组件
- 跨链数据对比功能
- 相关性分析
- 波动性分析

**改进规则**:
```typescript
// 1. 布局优化
// - 紧凑布局，信息密度提升
// - 图表网格优化

// 2. 图表优化
// - 添加 HeatmapGrid 热力图
// - 图表联动功能
// - 统一时间范围选择

// 3. 添加 Breadcrumb
// - 页面顶部添加面包屑
```

### 4.5 跨预言机对比 (CrossOracle)

**保留功能**:
- 预言机对比功能
- 价格偏差分析
- 性能对比表格
- 导出功能

**改进规则**:
```typescript
// 1. 表格优化
// - 使用 DataTablePro
// - 添加条件格式（偏差高亮）
// - 固定关键列

// 2. 图表优化
// - 添加对比图表联动
// - 统一时间范围

// 3. 布局优化
// - 紧凑布局
// - 减小间距
```

### 4.6 预言机详情页 (Oracle Pages)

**保留功能**:
- OraclePageTemplate 模板
- 所有面板组件（Panels）
- 图表组件
- 数据展示

**改进规则**:
```typescript
// 1. 统一使用紧凑布局
// 2. 所有表格使用 DataTablePro
// 3. 添加 SparklineChart 到 KPI 卡片
// 4. 图表添加 ChartToolbar
// 5. 添加 Breadcrumb
```

---

## 5. 组件重构规则

### 5.1 全局组件

#### Navbar 导航栏

**保留功能**:
- 所有导航链接
- 搜索按钮（Cmd+K）
- 语言切换
- 用户菜单
- 移动端抽屉

**改进规则**:
```typescript
// 1. 减小高度: h-16 → h-14
// 2. 添加 LiveIndicator 到导航栏右侧
// 3. 优化移动端体验
```

#### Footer 页脚

**保留功能**:
- 所有链接
- 版权信息

**改进规则**:
```typescript
// 1. 减小内边距
// 2. 紧凑布局
```

### 5.2 UI 组件增强

#### Button

**保留功能**:
- 所有 variant（primary/secondary/ghost）
- 所有 size（sm/md/lg）
- loading 状态
- disabled 状态

**允许优化**:
```css
/* 减小 padding，更紧凑 */
.btn-sm { padding: 0.375rem 0.75rem; }  /* 原 0.5rem 1rem */
.btn-md { padding: 0.5rem 1rem; }       /* 原 0.625rem 1.25rem */
.btn-lg { padding: 0.75rem 1.5rem; }    /* 原 0.875rem 1.5rem */
```

#### Card

**保留功能**:
- 所有 variant（default/elevated/bordered）
- headerAction
- onClick

**允许优化**:
```css
/* 减小内边距 */
.card-header { padding: 0.75rem 1rem; }  /* 原 1rem 1.25rem */
.card-body { padding: 1rem; }            /* 原 1.25rem */
.card-footer { padding: 0.5rem 1rem; }   /* 原 0.75rem 1.25rem */
```

#### Input / Select

**保留功能**:
- icon 支持
- error 状态
- disabled 状态

**允许优化**:
```css
/* 减小高度，更紧凑 */
.input { height: 2.25rem; }  /* 原 2.5rem */
```

### 5.3 新增组件

必须新增的组件清单：

| 组件 | 优先级 | 用途 |
|------|--------|------|
| LiveIndicator | P0 | 实时状态指示 |
| LiveStatusBar | P0 | 实时状态栏 |
| PriceChange | P0 | 价格变化显示 |
| DataFreshness | P0 | 数据新鲜度 |
| DataTablePro | P0 | 专业数据表格 |
| SparklineChart | P1 | 迷你趋势图 |
| ChartToolbar | P1 | 图表工具栏 |
| CandlestickChart | P1 | 蜡烛图 |
| VolumeChart | P1 | 成交量图 |
| Breadcrumb | P1 | 面包屑导航 |
| CommandSearch | P2 | 命令式搜索 |
| CardTable | P2 | 移动端卡片表格 |
| BottomNav | P2 | 移动端底部导航 |

---

## 6. 功能保留清单

### 6.1 首页功能

- [x] Hero 区域搜索功能（含历史记录、热门币种）
- [x] 实时价格滚动条
- [x] Bento 网格指标展示
- [x] 市场概览卡片
- [x] 套利热力图
- [x] CTA 行动按钮

### 6.2 市场概览功能

- [x] 市场统计数据
- [x] 多图表切换（趋势/链分布/协议）
- [x] 时间范围选择
- [x] 资产表格
- [x] 异常检测
- [x] WebSocket 实时更新
- [x] 刷新控制
- [x] 导出功能

### 6.3 价格查询功能

- [x] 多预言机价格查询
- [x] 价格对比图表
- [x] 数据质量展示
- [x] 历史数据表格
- [x] 导出配置
- [x] 技术指标

### 6.4 跨链分析功能

- [x] 跨链价格对比
- [x] 相关性分析
- [x] 波动性分析
- [x] 协整分析
- [x] 热力图展示

### 6.5 跨预言机对比功能

- [x] 多预言机价格对比
- [x] 偏差分析
- [x] 性能对比
- [x] 导出报告

### 6.6 预言机详情功能

- [x] 所有面板组件
- [x] 数据展示
- [x] 图表分析
- [x] 风险评估

### 6.7 用户功能

- [x] 登录/注册
- [x] 收藏夹
- [x] 价格警报
- [x] 设置页面
- [x] 个人资料

### 6.8 系统功能

- [x] 国际化（i18n）
- [x] 响应式设计
- [x] 无障碍支持
- [x] 键盘快捷键

---

## 7. 重构实施建议

### 7.1 实施顺序

```
阶段 1: 基础优化 (Week 1-2)
├── 优化信息密度（减小留白和间距）
├── 添加实时数据组件
└── 更新核心页面布局

阶段 2: 表格增强 (Week 3-4)
├── 创建 DataTablePro 组件
├── 替换所有现有表格
└── 添加条件格式和固定列

阶段 3: 图表增强 (Week 5-6)
├── 创建 SparklineChart
├── 创建 ChartToolbar
├── 添加专业图表类型
└── 实现图表联动

阶段 4: KPI 优化 (Week 7-8)
├── 增强 StatCard 组件
├── 添加迷你趋势图
├── 添加细分数据展示
└── 创建 KPIDashboard 布局

阶段 5: 导航优化 (Week 9-10)
├── 创建 Breadcrumb 组件
├── 创建 CommandSearch 组件
└── 集成到所有页面

阶段 6: 移动端优化 (Week 11-12)
├── 创建移动端专用组件
├── 优化移动端布局
└── 测试和调试
```

### 7.2 代码规范

重构时必须遵循以下规范：

1. **保留所有现有 API** - 不破坏任何现有接口
2. **渐进式替换** - 先创建新组件，再逐步替换
3. **功能对等** - 新实现必须包含原功能
4. **测试覆盖** - 关键功能必须添加测试
5. **文档更新** - 更新组件文档

### 7.3 验收标准

重构完成后，必须满足：

- [ ] 所有页面功能完整保留
- [ ] 所有现有测试通过
- [ ] 新增组件有完整测试
- [ ] 性能不下降（Lighthouse 评分 ≥ 90）
- [ ] 可访问性达标（WCAG AA）
- [ ] 移动端体验良好

- [ ] 国际化完整

---

## 8. 参考资源

### 8.1 设计参考

- **Bloomberg Terminal** - 专业金融数据终端
- **TradingView** - 专业图表分析平台
- **Dune Analytics** - 区块链数据分析
- **CoinGecko** - 加密货币数据聚合
- **DeFi Llama** - DeFi 数据分析

### 8.2 设计系统参考

- **Ant Design Pro** - 企业级中后台设计系统
- **Carbon Design System** - IBM 数据密集型设计系统
- **Material Design Data Tables** - Google 数据表格规范

---

**最后更新**: 2024-03-21
**版本**: 1.0.0
**适用范围**: Insight 项目页面重构
