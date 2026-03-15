# 跨预言机比较页面交易对选择器改进规格

## Why
当前跨预言机比较页面存在两个交易对切换位置：
1. StatsSection 顶部的交易对选择器（主要位置）
2. PriceTableSection 中的交易对选择器（次要位置）

这两个选择器存在以下问题：
- **重复且不一致**：两个选择器样式不同，造成视觉混乱
- **位置不够突出**：主要选择器隐藏在 StatsSection 中，不够显眼
- **交互体验差**：使用原生 select 组件，缺乏搜索和快速切换功能
- **缺乏视觉反馈**：切换交易对时没有明显的视觉过渡效果

## What Changes
- 统一并优化交易对选择器的设计和交互
- 将交易对选择器提升到页面顶部标题区域，更加醒目
- 实现自定义下拉组件，支持搜索和快速切换
- 添加交易对图标和视觉标识
- 增加切换动画和视觉反馈
- 移除冗余的次要选择器

## Impact
- Affected specs: 跨预言机比较页面用户体验
- Affected code: 
  - `src/app/cross-oracle/page.tsx`
  - `src/app/cross-oracle/components/StatsSection.tsx`
  - `src/app/cross-oracle/components/PriceTableSection.tsx`
  - 新增: `src/app/cross-oracle/components/PairSelector.tsx`

## ADDED Requirements

### Requirement: 统一交易对选择器
The system SHALL provide a unified trading pair selector component.

#### Scenario: 显示位置
- **WHEN** 用户访问跨预言机比较页面
- **THEN** 交易对选择器应显示在页面标题右侧，与标题同行

#### Scenario: 选择器功能
- **WHEN** 用户点击选择器
- **THEN** 应展开下拉菜单显示所有可用交易对
- **AND** 每个交易对应显示对应的加密货币图标
- **AND** 支持键盘搜索快速定位

#### Scenario: 切换反馈
- **WHEN** 用户选择新的交易对
- **THEN** 选择器应显示加载状态
- **AND** 页面数据应平滑过渡更新
- **AND** URL 应同步更新以支持分享

### Requirement: 交易对图标支持
The system SHALL display cryptocurrency icons for each trading pair.

#### Scenario: 图标显示
- **WHEN** 显示交易对选择器
- **THEN** 每个交易对应显示基础资产的图标（BTC、ETH、SOL、AVAX）
- **AND** 图标应来自统一的图标库

### Requirement: 移除冗余选择器
The system SHALL remove the duplicate pair selector from PriceTableSection.

#### Scenario: 清理界面
- **WHEN** 渲染 PriceTableSection
- **THEN** 不应再显示交易对选择器
- **AND** 仅保留预言机筛选标签

## MODIFIED Requirements

### Requirement: StatsSection 简化
**Current**: StatsSection 包含交易对选择器和统计信息
**Modified**: StatsSection 仅显示统计信息，移除交易对选择器

### Requirement: 页面标题布局
**Current**: 标题和筛选按钮在同一行
**Modified**: 标题左侧显示当前交易对，右侧显示选择器和操作按钮

## REMOVED Requirements

### Requirement: PriceTableSection 交易对选择器
**Reason**: 与主选择器重复，造成界面混乱
**Migration**: 用户应使用页面顶部的统一选择器

### Requirement: StatsSection 交易对选择器
**Reason**: 位置不够突出，且与主选择器重复
**Migration**: 用户应使用页面顶部的统一选择器
