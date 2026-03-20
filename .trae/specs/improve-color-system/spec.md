# 颜色系统优化 Spec

## Why
根据代码审查报告，颜色系统存在以下需要优化的问题：
1. shadowColors 中所有值都是 'none' 占位符，但实际被 9 个文件使用
2. marketOverview 中的 `band` 命名与其他地方的 `band-protocol` 不一致
3. 缺少类型接口定义，影响代码可维护性
4. 部分工具函数缺少详细的 JSDoc 注释

## What Changes
- 修复 shadowColors，填充实际的阴影颜色值
- 统一 marketOverview 中 `band` 命名为 `bandProtocol`
- 更新所有引用 `chartColors.marketOverview.band` 的代码
- 添加颜色系统的类型接口定义
- 完善工具函数的 JSDoc 注释

## Impact
-  affected specs: review-color-system
-  affected code:
  - src/lib/config/colors.ts
  - src/lib/services/marketData/defiLlamaApi.ts
  - src/app/[locale]/market-overview/components/ChartRenderer.tsx
  - src/components/oracle/charts/DataQualityTrend.tsx

## ADDED Requirements

### Requirement: 修复 shadowColors
The system SHALL 提供实际的阴影颜色值替代 'none' 占位符

#### Scenario: Tooltip 阴影
- **WHEN** 组件使用 shadowColors.tooltip
- **THEN** 显示适当的阴影效果而非无阴影

#### Scenario: Card 阴影
- **WHEN** 组件使用 shadowColors.card
- **THEN** 显示卡片阴影效果

### Requirement: 添加类型接口
The system SHALL 为颜色对象提供 TypeScript 类型接口

#### Scenario: ColorScale 类型
- **WHEN** 定义色阶颜色（50-900）
- **THEN** 使用 ColorScale 接口确保类型安全

#### Scenario: SemanticColor 类型
- **WHEN** 定义语义化颜色
- **THEN** 使用 SemanticColor 接口确保结构一致

## MODIFIED Requirements

### Requirement: 统一 marketOverview 命名
**Current**: `chartColors.marketOverview.band`
**Modified**: `chartColors.marketOverview.bandProtocol`

#### Scenario: 命名一致性
- **WHEN** 代码引用 Band Protocol 的颜色
- **THEN** 使用 `bandProtocol` 键名而非 `band`
- **AND** 与 oracle 对象中的 `'band-protocol'` 保持一致

### Requirement: 完善 JSDoc 注释
**Current**: 部分工具函数缺少详细注释
**Modified**: 所有工具函数都有完整的 JSDoc 注释

#### Scenario: 函数文档
- **WHEN** 开发者查看颜色工具函数
- **THEN** 可以看到参数说明、返回值说明和使用示例

## REMOVED Requirements
无
