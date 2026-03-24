# 跨链价格分析页面重构 Spec

## Why

跨链价格分析页面是 Insight 平台的核心功能页面之一，用于展示同一资产在不同区块链上的价格差异、相关性分析和波动性对比。当前页面存在以下问题需要改进：

1. **信息密度不足** - 页面留白比例较高，专业数据平台应该展示更多信息
2. **实时数据展示不够专业** - 缺少专业的实时状态栏和价格变化动画
3. **数据表格功能基础** - 缺少固定列、条件格式、多字段排序等高级功能
4. **KPI 卡片信息单一** - 仅显示当前值和变化率，缺少趋势微图和细分数据
5. **布局不够紧凑** - 需要优化为标准的左右分栏布局，提升信息密度

## What Changes

### 布局重构
- **改为标准左右分栏布局** - 左侧控制面板 (400px) + 右侧主内容区
- **统一页面内边距** - `px-4 sm:px-6 lg:px-8 py-6`
- **统一组件间距** - `space-y-6`, `gap-6`
- **左侧边栏 sticky 跟随滚动** - `xl:sticky xl:top-6`

### 新增组件
- **LiveStatusBar** - 实时状态栏，显示 UTC 时间、网络延迟、连接状态
- **PriceChange** - 价格变化显示组件，带数值动画
- **DataFreshness** - 数据新鲜度指示器
- **CompactStatCard** - 紧凑版统计卡片，带 Sparkline 迷你趋势图
- **DataTablePro** - 专业数据表格，支持固定列、条件格式、多排序
- **Breadcrumb** - 面包屑导航

### 组件优化
- **CrossChainFilters** - 优化为左侧控制面板，紧凑布局
- **CompactStatsGrid** - 使用增强版 StatCard，添加 SparklineChart
- **PriceComparisonTable** - 升级为 DataTablePro，添加条件格式
- **TabNavigation** - 样式优化，更紧凑
- **所有图表组件** - 添加 ChartToolbar，支持时间范围联动

### 功能保留
- 所有现有图表组件（热力图、相关性矩阵、滚动相关性、协整分析等）
- 跨链数据对比功能
- 收藏夹功能
- 导出功能（CSV/JSON）
- 自动刷新功能
- 色盲友好模式
- 响应式设计

## Impact

### 受影响文件
- `src/app/[locale]/cross-chain/page.tsx` - 主页面布局重构
- `src/app/[locale]/cross-chain/components/CrossChainFilters.tsx` - 控制面板优化
- `src/app/[locale]/cross-chain/components/CompactStatsGrid.tsx` - 统计网格增强
- `src/app/[locale]/cross-chain/components/PriceComparisonTable.tsx` - 表格升级
- `src/app/[locale]/cross-chain/components/TabNavigation.tsx` - 标签导航优化
- `src/app/[locale]/cross-chain/components/SmallComponents.tsx` - 小组件优化

### 新增文件
- `src/components/ui/LiveStatusBar.tsx` - 实时状态栏
- `src/components/ui/PriceChange.tsx` - 价格变化显示
- `src/components/ui/DataFreshness.tsx` - 数据新鲜度
- `src/components/ui/CompactStatCard.tsx` - 紧凑统计卡片
- `src/components/ui/DataTablePro.tsx` - 专业数据表格
- `src/components/ui/Breadcrumb.tsx` - 面包屑导航
- `src/components/charts/SparklineChart.tsx` - 迷你趋势图
- `src/components/charts/ChartToolbar.tsx` - 图表工具栏

## ADDED Requirements

### Requirement: 页面布局重构

The system SHALL provide a professional two-column layout for the cross-chain analysis page.

#### Scenario: 桌面端布局
- **GIVEN** 用户在桌面端访问跨链分析页面
- **WHEN** 页面加载完成
- **THEN** 页面显示左侧控制面板 (400px 固定宽度) 和右侧主内容区
- **AND** 左侧控制面板支持 sticky 跟随滚动
- **AND** 页面使用统一的内边距 `px-4 sm:px-6 lg:px-8 py-6`
- **AND** 组件间距统一为 `space-y-6` 和 `gap-6`

#### Scenario: 移动端布局
- **GIVEN** 用户在移动端访问跨链分析页面
- **WHEN** 页面加载完成
- **THEN** 控制面板和主内容区垂直排列
- **AND** 控制面板可折叠

### Requirement: 实时状态栏

The system SHALL display a professional live status bar at the top of the page.

#### Scenario: 正常连接状态
- **GIVEN** WebSocket 连接正常
- **WHEN** 页面显示实时状态栏
- **THEN** 状态栏显示当前 UTC 时间（精确到秒）
- **AND** 显示网络延迟（ms）
- **AND** 显示最后更新时间
- **AND** 显示绿色连接状态指示器

#### Scenario: 连接断开
- **GIVEN** WebSocket 连接断开
- **WHEN** 页面显示实时状态栏
- **THEN** 状态栏显示红色断开状态
- **AND** 显示重连倒计时

### Requirement: 增强统计卡片

The system SHALL provide enhanced stat cards with sparkline charts.

#### Scenario: 显示统计数据
- **GIVEN** 跨链数据加载完成
- **WHEN** 显示统计网格
- **THEN** 每个统计卡片显示标题和当前值
- **AND** 显示变化趋势（带颜色标识）
- **AND** 显示 Sparkline 迷你趋势图
- **AND** 显示细分数据（如适用）

### Requirement: 专业数据表格

The system SHALL provide a professional data table with advanced features.

#### Scenario: 表格基本功能
- **GIVEN** 跨链价格数据可用
- **WHEN** 显示价格对比表格
- **THEN** 表格支持固定列（区块链名称、价格）
- **AND** 支持多字段排序
- **AND** 支持条件格式（价格差异高亮）
- **AND** 支持紧凑/标准/舒适三种密度模式

#### Scenario: 表格交互
- **GIVEN** 用户与表格交互
- **WHEN** 用户点击表头
- **THEN** 表格按该字段排序
- **AND** 支持多字段组合排序

### Requirement: 面包屑导航

The system SHALL provide breadcrumb navigation at the top of the page.

#### Scenario: 显示面包屑
- **GIVEN** 用户在跨链分析页面
- **WHEN** 页面加载完成
- **THEN** 面包屑显示：首页 > 跨链分析
- **AND** 首页可点击跳转

### Requirement: 图表工具栏

The system SHALL provide a chart toolbar for all chart components.

#### Scenario: 图表控制
- **GIVEN** 图表组件显示
- **WHEN** 用户查看图表
- **THEN** 图表顶部显示工具栏
- **AND** 支持时间范围切换（1H/24H/7D/30D）
- **AND** 支持图表类型切换（如适用）
- **AND** 支持导出图表

## MODIFIED Requirements

### Requirement: 控制面板优化

The existing CrossChainFilters component SHALL be optimized for the left sidebar layout.

#### Scenario: 控制面板显示
- **GIVEN** 控制面板在左侧边栏显示
- **WHEN** 用户查看控制面板
- **THEN** 面板使用紧凑布局
- **AND** 保留所有现有功能（预言机选择、资产选择、链筛选等）
- **AND** 添加实时状态指示器

### Requirement: 标签导航优化

The existing TabNavigation component SHALL be optimized for better information density.

#### Scenario: 标签导航显示
- **GIVEN** 标签导航显示在页面上
- **WHEN** 用户查看标签
- **THEN** 标签使用更紧凑的样式
- **AND** 保留所有现有标签（概览/相关性/高级分析/图表）

### Requirement: 小组件优化

The existing small components SHALL be optimized for the new design.

#### Scenario: 进度条组件
- **GIVEN** 稳定性分析表格显示
- **WHEN** 显示数据完整性、波动性进度条
- **THEN** 进度条使用优化样式
- **AND** 保留所有功能

## REMOVED Requirements

无功能移除，所有现有功能均保留。

## 设计规范参考

### 布局规范
```typescript
// 页面容器
<div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
  <div className="flex flex-col xl:flex-row gap-6">
    {/* 左侧控制面板 */}
    <aside className="xl:w-[400px] xl:flex-shrink-0">
      <div className="xl:sticky xl:top-6 space-y-6">
        <CrossChainFilters />
      </div>
    </aside>
    {/* 右侧主内容区 */}
    <main className="flex-1 min-w-0 space-y-6">
      <CompactStatsGrid />
      <TabNavigation />
      {/* 标签内容 */}
    </main>
  </div>
</div>
```

### 颜色规范
- 保留现有色彩系统
- 使用 `--primary-500` 作为主色
- 使用 `--success-500` 表示上涨/正常
- 使用 `--danger-500` 表示下跌/异常
- 使用 `--warning-500` 表示警告

### 圆角规范
- 按钮/输入框: `rounded-md` (6px)
- 卡片/面板: `rounded-lg` (8px)
- 徽章: `rounded-full` (完全圆角)

### 间距规范
- 页面内边距: `px-4 sm:px-6 lg:px-8 py-6`
- 组件间距: `space-y-6`, `gap-6`
- 卡片内边距: `p-4`
