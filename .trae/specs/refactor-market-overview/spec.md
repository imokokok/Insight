# 市场概览页面重构规格文档

## Why

当前市场概览页面存在以下问题需要改进：
1. **信息密度过低** - 页面留白比例 25-30%，专业平台通常 15-20%
2. **实时数据展示不专业** - 仅小圆点闪烁，缺少专业实时状态栏
3. **数据表格功能基础** - 无固定列、单字段排序、缺少条件格式
4. **KPI 卡片信息单一** - 仅显示当前值和变化率，缺少趋势微图
5. **数据可视化不够专业** - 缺少 K线图、成交量图、深度图等专业图表

## What Changes

### 布局重构
- 减小页面内边距: `px-4 sm:px-6 lg:px-8 py-6` → `px-4 py-4`
- 减小网格间距: `gap-6` → `gap-4`
- 紧凑布局提升信息密度

### 新增专业组件
1. **LiveStatusBar** - 实时状态栏（时间、延迟、连接状态）
2. **EnhancedStatCard** - 增强版统计卡片（含趋势微图、细分数据）
3. **DataTablePro** - 专业数据表格（固定列、条件格式、多排序）
4. **ChartToolbar** - 图表工具栏（时间范围、图表类型切换）
5. **Breadcrumb** - 面包屑导航
6. **SparklineChart** - 迷你趋势图

### 组件增强
1. **MarketHeader** - 添加面包屑、优化布局
2. **MarketStats** - 使用增强版 StatCard，添加趋势微图
3. **ChartContainer** - 添加 ChartToolbar，支持图表联动
4. **AssetsTable** - 升级为 DataTablePro，添加条件格式
5. **MarketSidebar** - 优化布局，添加更多数据展示

### 功能保留
- 所有现有图表类型（pie/trend/bar/chain/protocol/asset/comparison/benchmark/correlation）
- WebSocket 实时更新
- 刷新控制
- 导出功能
- 异常检测
- 时间范围选择
- 同比/环比对比

## Impact

### 受影响的文件
- `src/app/[locale]/market-overview/page.tsx`
- `src/app/[locale]/market-overview/components/MarketHeader.tsx`
- `src/app/[locale]/market-overview/components/MarketStats.tsx`
- `src/app/[locale]/market-overview/components/ChartContainer.tsx`
- `src/app/[locale]/market-overview/components/AssetsTable.tsx`
- `src/app/[locale]/market-overview/components/MarketSidebar.tsx`

### 新增文件
- `src/components/ui/LiveStatusBar.tsx`
- `src/components/ui/EnhancedStatCard.tsx`
- `src/components/ui/DataTablePro.tsx`
- `src/components/ui/ChartToolbar.tsx`
- `src/components/ui/Breadcrumb.tsx`
- `src/components/charts/SparklineChart.tsx`

## ADDED Requirements

### Requirement: 实时状态栏
The system SHALL provide a professional live status bar component that displays:
- Current UTC time with second-level precision
- Network latency in milliseconds
- Last data update timestamp
- Connection status (connected/disconnected/reconnecting)

#### Scenario: Success case
- **WHEN** the page loads
- **THEN** the LiveStatusBar SHALL display current time, latency, last update, and connection status
- **AND** the time SHALL update every second
- **AND** the connection status SHALL reflect WebSocket state

### Requirement: 增强版统计卡片
The system SHALL provide an enhanced stat card component with:
- Main value display with large typography
- Change indicator with percentage and direction
- Sparkline chart showing trend over time
- Optional breakdown data with percentages
- Optional benchmark comparison

#### Scenario: Success case
- **WHEN** the MarketStats component renders
- **THEN** each stat SHALL display with trend sparkline
- **AND** change indicators SHALL use color coding (green for positive, red for negative)
- **AND** breakdown data SHALL be visible on hover

### Requirement: 专业数据表格
The system SHALL provide a professional data table component with:
- Fixed left/right columns support
- Multi-column sorting
- Conditional formatting based on cell values
- Column resizing
- Column visibility toggle
- Density modes (compact/normal/comfortable)

#### Scenario: Success case
- **WHEN** the AssetsTable renders with DataTablePro
- **THEN** asset name and price columns SHALL be fixed
- **AND** 24h/7d change columns SHALL have conditional formatting (green/red)
- **AND** users SHALL be able to sort by multiple columns

### Requirement: 图表工具栏
The system SHALL provide a chart toolbar component with:
- Time range selector (1H/24H/7D/30D/1Y/ALL)
- Chart type switcher (line/area/candle)
- Technical indicator add/remove
- Chart export button
- Zoom/pan controls

#### Scenario: Success case
- **WHEN** the ChartContainer renders
- **THEN** the ChartToolbar SHALL be visible above the chart
- **AND** time range selection SHALL update chart data
- **AND** chart type switching SHALL change visualization

### Requirement: 面包屑导航
The system SHALL provide a breadcrumb component that displays:
- Current page location hierarchy
- Clickable parent links
- Current page as non-clickable text

#### Scenario: Success case
- **WHEN** the MarketOverview page loads
- **THEN** the Breadcrumb SHALL show: Home > Market Overview
- **AND** "Home" SHALL be clickable to navigate to home page

### Requirement: 迷你趋势图
The system SHALL provide a sparkline chart component that:
- Displays a compact line chart without axes
- Supports area fill option
- Animates on data change
- Shows trend direction (up/down/neutral)

#### Scenario: Success case
- **WHEN** an EnhancedStatCard renders with sparkline data
- **THEN** a compact trend chart SHALL be displayed
- **AND** the chart color SHALL match the trend direction

## MODIFIED Requirements

### Requirement: MarketHeader 组件优化
The MarketHeader component SHALL be enhanced to:
- Include Breadcrumb navigation
- Optimize layout for better space utilization
- Maintain all existing functionality (export, refresh, real-time indicator)

### Requirement: MarketStats 组件优化
The MarketStats component SHALL be enhanced to:
- Use EnhancedStatCard for all statistics
- Add sparkline charts to each stat
- Display breakdown data where applicable
- Maintain compact layout

### Requirement: ChartContainer 组件优化
The ChartContainer component SHALL be enhanced to:
- Include ChartToolbar above charts
- Support chart type switching
- Maintain all existing chart types and functionality
- Optimize layout for better information density

### Requirement: AssetsTable 组件优化
The AssetsTable component SHALL be enhanced to:
- Use DataTablePro for advanced features
- Add fixed columns for asset name and price
- Implement conditional formatting for change columns
- Support multi-column sorting

### Requirement: MarketSidebar 组件优化
The MarketSidebar component SHALL be enhanced to:
- Optimize layout and spacing
- Add more data visualization elements
- Maintain all existing functionality

## REMOVED Requirements

None - 所有现有功能都将保留

## 设计规范参考

### 色彩系统（保留）
- Primary: #3b82f6 (blue-500)
- Success: #10b981 (green-500)
- Warning: #f59e0b (amber-500)
- Danger: #ef4444 (red-500)
- Neutral: #64748b (slate-500)

### 圆角规范（保留）
- sm: 4px (按钮、标签)
- md: 6px (输入框)
- lg: 8px (卡片、面板)
- xl: 12px (模态框)
- full: 9999px (徽章)

### 间距规范（优化）
- 页面内边距: px-4 py-4
- 卡片间距: gap-4
- 组件内间距: 紧凑模式

## 性能要求

- 首屏加载时间 < 3s
- 图表交互响应时间 < 100ms
- 实时数据更新频率 1-5s 可调
- 支持虚拟滚动处理大数据量

## 可访问性要求

- 所有交互元素支持键盘导航
- 图表提供替代文本描述
- 颜色对比度符合 WCAG AA 标准
- 支持屏幕阅读器

## 响应式要求

- 桌面端: 完整功能展示
- 平板端: 优化布局，保持核心功能
- 移动端: 卡片式布局，简化交互
