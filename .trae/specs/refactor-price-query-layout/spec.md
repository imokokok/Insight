# 价格查询页面布局重构 - Product Requirement Document

## Overview
- **Summary**: 重构价格查询页面右侧查询结果区域的布局，针对单一预言机、单一区块链的当前具体价格查询场景进行优化，使真正需要的查询结果显示更完美
- **Purpose**: 简化界面，突出核心信息，提升用户体验，让用户能够快速获取关键的价格数据
- **Target Users**: 区块链预言机价格数据查询用户，关注当前具体价格信息的交易者和分析师

## Goals
- 重构 QueryResults 组件的布局结构
- 突出显示当前价格和关键统计数据
- 优化历史价格图表的展示
- 简化不必要的功能，保持界面简洁
- 保持现有功能的完整性和可用性

## Non-Goals (Out of Scope)
- 不修改左侧查询表单的功能和布局
- 不添加新的查询功能
- 不修改数据源逻辑
- 不修改图表的数据计算逻辑

## Background & Context
- 当前价格查询页面定位为单一预言机、单一区块链的当前具体价格查询
- 用户已删除了很多不必要的查询结果功能
- 现在需要优化剩余功能的布局，让真正需要的查询结果显示更完美
- 现有组件包括：StatsGrid（统计网格）、PriceChart（价格图表）、DataSourceSection（数据源信息）、UnifiedExportSection（导出功能）、价格详情卡片

## Functional Requirements
- **FR-1**: 重新组织 QueryResults 组件的内容顺序和布局
- **FR-2**: 优化当前价格详情卡片的展示，使其更醒目
- **FR-3**: 调整统计数据的展示方式，突出关键指标
- **FR-4**: 优化价格图表的视觉呈现
- **FR-5**: 保持所有现有功能的正常工作

## Non-Functional Requirements
- **NFR-1**: 界面响应式，在不同屏幕尺寸下都有良好的展示效果
- **NFR-2**: 保持现有性能，不引入明显的加载延迟
- **NFR-3**: 代码结构清晰，易于维护

## Constraints
- **Technical**: 使用现有的 React 组件和 Tailwind CSS 样式系统
- **Business**: 不破坏现有功能，保持与系统其他部分的兼容性
- **Dependencies**: 依赖现有的 usePriceQuery hook 和相关组件

## Assumptions
- 用户已经确定了需要保留的功能列表
- 现有数据结构和 API 不需要修改
- 当前的样式系统（Tailwind CSS）可以满足新的布局需求

## Acceptance Criteria

### AC-1: 当前价格信息突出显示
- **Given**: 用户完成价格查询并获得结果
- **When**: 查询结果显示在页面右侧
- **Then**: 当前价格信息应该在最醒目的位置显示，字体更大，视觉层次更高
- **Verification**: `human-judgment`
- **Notes**: 价格详情卡片应该成为视觉焦点

### AC-2: 统计数据优化展示
- **Given**: 用户完成价格查询并获得结果
- **When**: 查询结果显示在页面右侧
- **Then**: 关键统计数据（平均价格、24h变化等）应该清晰展示，布局合理
- **Verification**: `human-judgment`

### AC-3: 图表展示优化
- **Given**: 用户完成价格查询并获得结果
- **When**: 查询结果显示在页面右侧
- **Then**: 价格图表应该有良好的视觉效果，易于阅读
- **Verification**: `human-judgment`

### AC-4: 整体布局合理
- **Given**: 用户完成价格查询并获得结果
- **When**: 查询结果显示在页面右侧
- **Then**: 所有组件的排列顺序和间距应该合理，信息层次清晰
- **Verification**: `human-judgment`

### AC-5: 功能保持完整
- **Given**: 用户使用重构后的页面
- **When**: 执行各种操作（刷新、导出、查看历史等）
- **Then**: 所有功能应该正常工作，与重构前保持一致
- **Verification**: `programmatic`

## Open Questions
- 无
