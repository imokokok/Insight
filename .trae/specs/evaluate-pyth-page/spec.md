# Pyth Network 页面特性评估与 Tab 优化 Spec

## Why

当前 Pyth Network 页面虽然基本功能完整，但存在以下问题：
1. Tab 功能区分不够明确，部分 Tab 内容有重叠
2. Tab 图标支持不完整，`price-feeds` tab 缺少专门图标
3. 缺少一些 Pyth 特有的功能展示，如验证者分析、跨链支持详情等
4. 与其他 Oracle 页面相比，功能丰富度有待提升

## What Changes

### 1. Tab 结构优化
- **重新设计 Tab 分类**，使功能区分更加明确
- **添加缺失的 Tab 图标支持**
- **新增功能 Tab**：验证者分析、跨链支持

### 2. 功能增强
- 增强 Publishers Tab 的数据展示
- 优化 Price-feeds Tab 的交互体验
- 添加更多实时数据指标

### 3. 代码改进
- 完善 TabNavigation 组件的图标映射
- 优化页面布局和响应式设计

## Impact

- **Affected specs**: Pyth Network 页面配置、TabNavigation 组件
- **Affected code**: 
  - `src/app/pyth-network/page.tsx`
  - `src/components/oracle/common/TabNavigation.tsx`
  - `src/lib/config/oracles.tsx`

## ADDED Requirements

### Requirement: Tab 图标完善

**Scenario: Price-feeds Tab 图标显示**
- **GIVEN** 用户访问 Pyth Network 页面
- **WHEN** 页面加载完成
- **THEN** `price-feeds` Tab 应该显示专门的数据源图标，而不是默认图标

### Requirement: 新增验证者分析 Tab

**Scenario: 验证者数据展示**
- **GIVEN** 用户切换到验证者 Tab
- **WHEN** 数据加载完成
- **THEN** 应该展示验证者列表、质押数量、准确率等信息

### Requirement: 新增跨链支持 Tab

**Scenario: 跨链数据展示**
- **GIVEN** 用户切换到跨链 Tab
- **WHEN** 页面加载完成
- **THEN** 应该展示支持的区块链网络、各链数据更新频率等

## MODIFIED Requirements

### Requirement: Publishers Tab 功能增强

**Current**: 简单展示发布者列表和基础信息

**Modified**: 
- 添加发布者排名和筛选功能
- 展示更详细的发布者统计信息
- 支持按质押数量、准确率排序

### Requirement: Tab 导航优化

**Current**: Tab 图标映射不完整

**Modified**:
- 完善 `getTabIcon` 函数，支持所有 Pyth 特有 Tab
- 优化 Tab 切换动画和交互体验
- 确保移动端 Tab 导航友好

## REMOVED Requirements

无
