# 优化预言机代币价格展示组件

## Why

当前的代币价格展示组件虽然功能完整，但在样式和布局上还有优化空间：

1. 卡片样式需要更好地融入项目的设计系统（使用专业的金融风格卡片）
2. 布局可以更好地与市场概览页面的整体结构协调
3. 交互体验可以进一步提升（更好的悬停效果、动画过渡）
4. 信息层次可以更清晰

## What Changes

- 重新设计代币价格卡片样式，使用项目设计系统的卡片样式（`card-elevated` 或 `card-interactive`）
- 优化布局结构，使其更好地融入市场概览页面的视觉层次
- 改进颜色使用，统一使用设计系统的语义化颜色变量
- 优化悬停交互效果，使用设计系统的过渡动画
- 添加更专业的价格变化指示器（使用趋势箭头和背景色）
- 改进响应式布局，在桌面端使用网格布局替代横向滚动

## Impact

- 修改文件: `OracleTokenPrices.tsx`, `OracleTokenPricesSkeleton.tsx`
- 影响页面: `/market-overview`
- 提升用户体验和视觉一致性

## ADDED Requirements

### Requirement: 样式优化

系统 SHALL 使用项目设计系统的卡片样式和颜色变量。

#### Scenario: 卡片样式

- **WHEN** 渲染代币价格卡片
- **THEN** 使用 `card-elevated` 或 `card-interactive` 样式
- **AND** 使用设计系统的阴影变量 (`--shadow-md`, `--shadow-lg`)
- **AND** 使用设计系统的圆角变量 (`--radius-lg`)

#### Scenario: 颜色系统

- **WHEN** 显示涨跌状态
- **THEN** 使用语义化颜色变量 (`--color-success-600`, `--color-danger-600`)
- **AND** 背景色使用对应的颜色刻度（如 `--color-success-50`）

#### Scenario: 动画过渡

- **WHEN** 用户悬停在卡片上
- **THEN** 使用 `transition-finance` 类实现平滑过渡
- **AND** 使用 `hover-lift` 效果提升交互感

### Requirement: 布局优化

系统 SHALL 优化价格展示区域的布局。

#### Scenario: 桌面端布局

- **GIVEN** 桌面端视图
- **WHEN** 渲染价格卡片
- **THEN** 使用 CSS Grid 布局，3列或自适应列数
- **AND** 卡片之间有适当的间距

#### Scenario: 移动端布局

- **GIVEN** 移动端视图
- **WHEN** 渲染价格卡片
- **THEN** 使用横向滚动或2列网格
- **AND** 保持信息清晰可读

#### Scenario: 页面融入

- **GIVEN** 市场概览页面
- **WHEN** 用户浏览页面
- **THEN** 价格区域与 MarketStats、ChartContainer 等组件视觉风格一致
- **AND** 作为独立的功能区块清晰呈现

### Requirement: 信息展示优化

系统 SHALL 优化价格信息的展示方式。

#### Scenario: 价格格式化

- **WHEN** 显示价格
- **THEN** 根据价格大小自动选择合适的精度
- **AND** 使用 `tabular-nums` 确保数字对齐

#### Scenario: 涨跌指示

- **WHEN** 显示24h涨跌幅
- **THEN** 使用背景色块 + 图标 + 百分比的形式
- **AND** 涨用绿色背景，跌用红色背景

#### Scenario: 悬停详情

- **WHEN** 用户悬停在卡片上
- **THEN** 显示24h最高/最低价和成交量
- **AND** 使用平滑的淡入动画

## UI设计参考

### 卡片设计

```
┌─────────────────────────┐
│  ┌───┐  SYMBOL          │
│  │LOGO│  Oracle Name     │
│  └───┘                   │
│                          │
│  $14.5234               │
│  ┌─────────────────┐    │
│  │ ▲ +2.45%       │    │  ← 绿色背景 pill
│  └─────────────────┘    │
│                          │
│  [悬停显示详情]          │
└─────────────────────────┘
```

### 布局方案

- 桌面端: 3列网格布局，与 ChartContainer 并排或独立区块
- 平板端: 2列网格
- 移动端: 横向滚动或2列网格

### 颜色使用

- 卡片背景: `bg-white`
- 卡片边框: `border-gray-200`
- 涨: `bg-success-50 text-success-700` + `border-success-200`
- 跌: `bg-danger-50 text-danger-700` + `border-danger-200`
- 悬停: `hover:border-primary-300 hover:shadow-lg`
