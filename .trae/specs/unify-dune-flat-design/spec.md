# 统一 Dune 扁平化设计改造 Spec

## Why
项目中存在大量不专业的卡片样式（492+处），包括圆角卡片、阴影效果、渐变背景等，这些样式显得过于花哨，不符合专业数据分析平台的视觉标准。需要统一改造成类似于 Dune Analytics 的扁平化设计风格，提升产品的专业感和数据可读性。

## What Changes
- **移除所有卡片样式**：包括 `rounded-2xl`、`rounded-xl`、`shadow-lg`、`shadow-md`、`shadow-sm` 等
- **统一使用扁平化设计**：采用简洁的边框分隔、纯色背景、无阴影
- **简化颜色系统**：减少渐变色使用，采用纯色背景
- **优化间距系统**：统一使用简洁的间距规则
- **改造关键组件**：
  - Card 基础组件
  - DashboardCard 组件
  - BentoMetricsGrid 首页指标卡片
  - 所有页面级别的卡片容器

## Impact
- Affected specs: 所有页面 UI 展示
- Affected code: 
  - `src/components/Card.tsx`
  - `src/components/oracle/common/DashboardCard.tsx`
  - `src/app/home-components/BentoMetricsGrid.tsx`
  - 100+ 个组件文件中的卡片样式

## ADDED Requirements

### Requirement: Dune 风格扁平化设计系统
The system SHALL provide a unified flat design system inspired by Dune Analytics.

#### Design Principles
- **无圆角或极小圆角**：使用 `rounded-none` 或 `rounded-sm`（2px）
- **无阴影**：移除所有 `shadow-*` 类
- **简洁边框**：使用细边框 `border-gray-200` 进行内容分隔
- **纯色背景**：使用白色或极浅灰色背景，避免渐变
- **清晰层次**：通过间距和边框而非阴影来建立视觉层次

#### Scenario: Card Component
- **WHEN** 渲染 Card 组件
- **THEN** 应该显示为扁平化样式：白色背景、细边框、无阴影、无圆角或极小圆角

#### Scenario: DashboardCard Component
- **WHEN** 渲染 DashboardCard 组件
- **THEN** 应该使用扁平化变体作为默认样式

#### Scenario: Metric Display
- **WHEN** 显示指标卡片（如 BentoMetricsGrid）
- **THEN** 应该使用简洁的边框分隔，无阴影和圆角

#### Scenario: Page Layout
- **WHEN** 渲染页面级别的容器
- **THEN** 应该使用扁平化设计，通过间距和边框建立层次

## MODIFIED Requirements

### Requirement: Card Component
**Current**: Card 组件默认使用 `rounded-2xl`、`shadow-sm`、`hover:shadow-2xl` 等样式
**Modified**: 
- 默认样式改为扁平化：`bg-white border border-gray-200 rounded-none`
- 移除所有阴影效果
- 移除悬停阴影和位移效果
- 保留 `variant` 属性但简化选项

### Requirement: DashboardCard Component
**Current**: DashboardCard 有 `default` 和 `flat` 两种变体
**Modified**:
- 将 `flat` 变体设为默认
- 移除 `default` 变体的阴影和圆角
- 统一使用简洁的边框分隔

### Requirement: BentoMetricsGrid Component
**Current**: 使用彩色背景、圆角、阴影、渐变效果
**Modified**:
- 移除所有圆角 (`rounded-xl`, `rounded-2xl`)
- 移除所有阴影 (`shadow-sm`, `shadow-xl`)
- 移除渐变背景 (`bg-gradient-to-*`)
- 使用简洁的边框分隔不同指标
- 简化颜色系统，使用统一的边框和背景色

## REMOVED Requirements

### Requirement: Gradient Backgrounds
**Reason**: 不符合扁平化设计原则
**Migration**: 替换为纯色背景 (`bg-white`, `bg-gray-50`)

### Requirement: Hover Shadow Effects
**Reason**: 过于花哨，不符合专业数据平台风格
**Migration**: 使用简单的边框颜色变化或背景色变化

### Requirement: Large Border Radius
**Reason**: Dune 风格使用直角或极小圆角
**Migration**: 使用 `rounded-none` 或 `rounded-sm`
