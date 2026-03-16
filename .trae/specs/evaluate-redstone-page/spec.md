# RedStone 页面特性评估与 Tab 优化 Spec

## Why

当前 RedStone 页面虽然基本功能完整，但存在以下问题：

1. Tab 功能区分不够明确，`ecosystem` 和 `providers` 内容有重叠
2. Tab 图标支持不完整，`providers` tab 缺少专门图标
3. 缺少 RedStone 特有的功能展示，如模块化费用分析、数据流分析、跨链支持详情等
4. 数据提供者 Tab 内容较简单，只有静态列表
5. 与其他 Oracle 页面相比，功能丰富度有待提升

## What Changes

### 1. Tab 结构优化

- **重新设计 Tab 分类**，使功能区分更加明确
- **添加缺失的 Tab 图标支持** - 为 `providers` tab 添加专门图标
- **新增功能 Tab**：数据流分析、跨链支持

### 2. 功能增强

- 增强 Providers Tab 的数据展示，添加动态数据
- 优化 Ecosystem Tab 的交互体验
- 添加模块化费用分析展示
- 添加更多实时数据指标

### 3. 代码改进

- 完善 TabNavigation 组件的图标映射
- 优化页面布局和响应式设计

## Impact

- **Affected specs**: RedStone 页面配置、TabNavigation 组件
- **Affected code**:
  - `src/app/redstone/page.tsx`
  - `src/components/oracle/common/TabNavigation.tsx`
  - `src/lib/config/oracles.tsx`
  - `src/hooks/useRedStoneData.ts`
  - `src/i18n/en.json` 和 `src/i18n/zh-CN.json`

## ADDED Requirements

### Requirement: Tab 图标完善

**Scenario: Providers Tab 图标显示**

- **GIVEN** 用户访问 RedStone 页面
- **WHEN** 页面加载完成
- **THEN** `providers` Tab 应该显示专门的数据提供者图标，而不是默认图标

### Requirement: 新增数据流分析 Tab

**Scenario: 数据流数据展示**

- **GIVEN** 用户切换到数据流 Tab
- **WHEN** 数据加载完成
- **THEN** 应该展示数据流统计、更新频率、数据新鲜度等信息

### Requirement: 新增跨链支持 Tab

**Scenario: 跨链数据展示**

- **GIVEN** 用户切换到跨链 Tab
- **WHEN** 页面加载完成
- **THEN** 应该展示支持的区块链网络、各链数据更新频率等

## MODIFIED Requirements

### Requirement: Providers Tab 功能增强

**Current**: 简单展示数据源列表和基础信息

**Modified**:

- 添加数据提供者排名和筛选功能
- 展示更详细的提供者统计信息
- 支持按数据点数量、声誉排序
- 添加提供者详情弹窗或展开功能

### Requirement: Ecosystem Tab 内容优化

**Current**: 简单展示集成列表

**Modified**:

- 优化集成展示布局
- 添加集成项目分类
- 展示集成项目统计信息

### Requirement: Tab 导航优化

**Current**: Tab 图标映射不完整

**Modified**:

- 完善 `getTabIcon` 函数，支持 RedStone 特有 Tab
- 优化 Tab 切换动画和交互体验
- 确保移动端 Tab 导航友好

## REMOVED Requirements

无
