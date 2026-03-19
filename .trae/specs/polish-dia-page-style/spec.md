# DIA 页面样式优化规范

## Why
DIA 预言机页面功能完整，但在样式一致性、颜色主题应用和组件使用上有轻微改进空间。基于现有 Dune 扁平化风格进行适度优化，不引入过度设计。

## What Changes
- **修复图标背景色** - 修复动态颜色不生效的问题，使用静态 Tailwind 类名
- **统一统计卡片样式** - 将 DIADataFeedsPanel、DIAEcosystemPanel、DIAStakingPanel 中的原始 div 统计卡片统一使用 DashboardCard 组件
- **优化颜色主题应用** - 统一使用 indigo-600 主题色，保持与 DIA 品牌色一致
- **表格和列表样式统一** - 使用项目标准表格样式，保持一致性
- **信息卡片优化** - 统一底部信息卡片样式，使用一致的边框和背景
- **优化卡片圆角** - 统一使用 rounded-lg 圆角风格

## Impact
- Affected code: 
  - `/src/lib/config/oracles.tsx` - DIA iconBgColor 配置
  - `/src/components/oracle/panels/DIADataFeedsPanel.tsx` - 统计卡片样式
  - `/src/components/oracle/panels/DIAEcosystemPanel.tsx` - 统计卡片和按钮样式
  - `/src/components/oracle/panels/DIAStakingPanel.tsx` - 统计卡片样式
  - `/src/components/oracle/panels/DIANFTDataPanel.tsx` - 统计卡片样式
- 保持现有 Dune 扁平化设计风格
- 不添加新依赖，仅样式调整

## ADDED Requirements
### Requirement: 样式一致性优化
The system SHALL provide consistent styling across all DIA panels.

#### Scenario: 统计卡片样式统一
- **WHEN** 渲染统计卡片
- **THEN** 使用 DashboardCard 组件，保持与其他面板一致

#### Scenario: 颜色主题统一
- **WHEN** 显示 DIA 品牌色
- **THEN** 使用统一的 indigo 主题色 (indigo-600)

#### Scenario: 图标背景色修复
- **WHEN** 显示预言机图标
- **THEN** 背景色正确显示为 indigo-600

#### Scenario: 按钮样式统一
- **WHEN** 显示筛选按钮
- **THEN** 使用统一的 indigo 主题色，保持与其他面板一致

## MODIFIED Requirements
### Requirement: DIA 配置
**Current**: iconBgColor 使用动态模板字符串 `bg-[${chartColors.oracle.dia}]`
**Modified**: 使用静态 Tailwind 类名 `bg-indigo-600`

### Requirement: 面板组件样式
**Current**: 部分使用原始 div 样式，如 `bg-white border border-gray-200 p-4`
**Modified**: 统一使用 DashboardCard 组件或标准化样式

### Requirement: 筛选按钮样式
**Current**: 使用多种颜色（紫色、蓝色、绿色等）区分不同筛选类型
**Modified**: 统一使用 indigo 主题色，通过其他方式（如文字）区分类型
