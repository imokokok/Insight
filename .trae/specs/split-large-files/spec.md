# 大文件拆分 Spec

## Why
项目中存在3个超过1300行的大文件，包含多个独立功能模块混杂在一起，导致代码难以维护、测试和复用。需要对这些文件进行合理拆分，提高代码的可维护性和可读性。

## What Changes
- 拆分 `PriceChart/index.tsx` (1630行) 为多个独立组件和工具函数
- 拆分 `OraclePageTemplate.tsx` (1364行) 为各Oracle专用面板组件
- 拆分 `LatencyTrendChart.tsx` (1350行) 为独立的功能组件

## Impact
- Affected specs: Oracle图表展示、Oracle页面模板、延迟分析功能
- Affected code: 
  - `src/components/oracle/charts/PriceChart/`
  - `src/components/oracle/common/OraclePageTemplate.tsx`
  - `src/components/oracle/charts/LatencyTrendChart.tsx`

## ADDED Requirements

### Requirement: PriceChart组件拆分
系统 SHALL 将PriceChart组件拆分为独立的功能模块，提高可维护性。

#### Scenario: 拆分后的组件结构
- **WHEN** 开发者需要修改图表功能
- **THEN** 可以在独立的组件文件中找到对应代码

### Requirement: OraclePageTemplate组件拆分
系统 SHALL 将OraclePageTemplate中的各Oracle面板配置拆分为独立组件。

#### Scenario: 拆分后的面板结构
- **WHEN** 开发者需要修改特定Oracle的面板配置
- **THEN** 可以在独立的面板组件文件中进行修改

### Requirement: LatencyTrendChart组件拆分
系统 SHALL 将LatencyTrendChart拆分为独立的功能组件。

#### Scenario: 拆分后的功能结构
- **WHEN** 开发者需要修改延迟分析功能
- **THEN** 可以在独立的功能组件中找到对应代码
