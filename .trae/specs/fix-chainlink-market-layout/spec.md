# Chainlink 市场数据页面布局优化规格

## Why
当前 Chainlink 预言机页面的市场数据区域中，右侧三个卡片（快速统计、网络状态、数据来源）高度不一致，导致与左侧价格趋势图表区域底部不对齐，左下角出现视觉空缺。通过优化布局使两侧高度平衡，提升页面视觉协调性和专业感。

## What Changes
- **统一卡片高度**: 调整右侧三个卡片区域的高度，使其与左侧价格趋势图表等高
- **优化内容分布**: 重新分配三个卡片内部的空间，使内容分布更均匀
- **保持响应式**: 确保在移动端和桌面端都能保持良好的布局效果

## Impact
- 受影响文件:
  - `src/app/[locale]/chainlink/components/ChainlinkMarketView.tsx` - 市场数据视图组件

## ADDED Requirements
无

## MODIFIED Requirements

### Requirement: 市场数据页面布局
The system SHALL provide a balanced layout for the Chainlink market data page with the following features:

#### Scenario: 左右两侧高度对齐
- **GIVEN** 用户访问 Chainlink 市场数据页面
- **WHEN** 页面加载完成
- **THEN** 左侧价格趋势图表区域与右侧三个卡片区域底部对齐
- **AND** 左右两侧总高度相等

#### Scenario: 右侧卡片高度分配
- **GIVEN** 右侧有三个卡片区域（快速统计、网络状态、数据来源）
- **WHEN** 页面渲染完成
- **THEN** 快速统计卡片占据适当高度展示4个统计项
- **AND** 网络状态卡片占据适当高度展示4个状态项
- **AND** 数据来源卡片占据剩余高度展示4个数据源
- **AND** 三个卡片总高度等于左侧图表区域高度

#### Scenario: 响应式布局保持
- **GIVEN** 用户在不同屏幕尺寸下查看页面
- **WHEN** 页面响应式调整
- **THEN** 桌面端（lg及以上）保持左右分栏布局
- **AND** 移动端（lg以下）垂直堆叠布局
- **AND** 各卡片内容自适应不溢出

## REMOVED Requirements
无
