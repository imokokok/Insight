# Band Protocol 页面样式优化规范

## Why
Band Protocol 预言机页面功能完整，但在样式一致性、颜色主题应用和组件使用上有轻微改进空间。基于现有 Dune 风格进行适度优化，不引入过度设计。

## What Changes
- **修复图标背景色** - 修复动态颜色不生效的问题
- **统一统计卡片样式** - 使用 DashboardCard 替代原始 div
- **优化颜色主题应用** - 统一使用紫色主题色
- **表格样式统一** - 使用项目标准表格样式
- **信息卡片优化** - 统一底部信息卡片样式

## Impact
- Affected code: BandProtocolPanelConfig.tsx, BandValidatorsPanel.tsx, BandCrossChainPanel.tsx, BandDataFeedsPanel.tsx, BandStakingPanel.tsx, CosmosEcosystemPanel.tsx
- 保持现有 Dune 扁平化设计风格
- 不添加新依赖，仅样式调整

## ADDED Requirements
### Requirement: 样式一致性优化
The system SHALL provide consistent styling across all Band Protocol panels.

#### Scenario: 统计卡片样式统一
- **WHEN** 渲染统计卡片
- **THEN** 使用 DashboardCard 组件，保持与其他面板一致

#### Scenario: 颜色主题统一
- **WHEN** 显示 Band Protocol 品牌色
- **THEN** 使用统一的紫色主题 (#516BEB 或 purple-600)

#### Scenario: 图标背景色修复
- **WHEN** 显示预言机图标
- **THEN** 背景色正确显示为紫色

## MODIFIED Requirements
### Requirement: Band Protocol 配置
**Current**: iconBgColor 使用动态模板字符串
**Modified**: 使用静态 Tailwind 类名

### Requirement: 面板组件样式
**Current**: 部分使用原始 div 样式
**Modified**: 统一使用项目标准组件
