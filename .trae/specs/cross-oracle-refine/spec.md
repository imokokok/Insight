# Cross-Oracle Comparison Page Refinement - Product Requirement Document

## Overview
- **Summary**: 优化跨预言机比较页面，减少无意义的信息展示，增强核心数据的展示效果，简化卡片样式，使页面更简洁高效。
- **Purpose**: 通过去除冗余信息、简化视觉样式、突出核心数据，提升页面的可读性和用户体验，让用户能够更快速地获取关键信息。
- **Target Users**: Web3开发者、DeFi分析师、预言机用户

## Goals
- 简化卡片样式，去除不必要的阴影和悬停效果
- 减少冗余信息展示，去除重复或无意义的内容
- 增强核心数据的展示效果，突出关键信息
- 合并筛选区域，减少卡片数量
- 优化统计数据的展示方式，使其更直观高效
- 简化价格表格，只保留最核心的列

## Non-Goals (Out of Scope)
- 不添加新的功能
- 不修改数据获取逻辑
- 不改变预言机客户端API
- 不添加新的图表类型

## Background & Context
- 当前页面有过多的卡片包装和视觉效果
- 一些信息是冗余的（如价格表格中的symbol列，整个页面都是同一个交易对）
- 卡片的悬停阴影效果增加了视觉干扰
- 筛选区域分为两个卡片，可以合并简化
- 统计数据卡片的样式可以更简洁

## Functional Requirements
- **FR-1**: 简化所有卡片样式，去除hover:shadow-md效果
- **FR-2**: 去除价格表格中的symbol列（冗余信息）
- **FR-3**: 合并符号选择和预言机选择到一个卡片中
- **FR-4**: 简化统计数据展示，去掉过度的装饰
- **FR-5**: 优化信息密度，使页面更紧凑高效

## Non-Functional Requirements
- **NFR-1**: 保持页面功能完整性不变
- **NFR-2**: 保持响应式设计不变
- **NFR-3**: 保持现有配色方案不变
- **NFR-4**: 代码改动应简洁易维护

## Constraints
- **Technical**: 必须使用现有的技术栈和组件
- **Business**: 不能改变现有功能逻辑
- **Dependencies**: 依赖现有的代码结构

## Assumptions
- 用户更关注数据内容而非视觉装饰
- 减少冗余信息能提升页面的可读性
- 简化的样式不会影响用户体验

## Acceptance Criteria

### AC-1: 简化卡片样式
- **Given**: 用户访问跨预言机比较页面
- **When**: 查看页面上的所有卡片
- **Then**: 所有卡片都没有hover:shadow-md效果，样式简洁
- **Verification**: `human-judgment`

### AC-2: 去除冗余表格列
- **Given**: 用户查看价格比较表格
- **When**: 表格数据加载完成
- **Then**: 表格中没有symbol列，只保留核心列
- **Verification**: `programmatic`

### AC-3: 合并筛选区域
- **Given**: 用户在页面顶部选择筛选条件
- **When**: 查看筛选区域
- **Then**: 符号选择和预言机选择在同一个卡片中
- **Verification**: `human-judgment`

### AC-4: 简化统计数据展示
- **Given**: 用户查看统计数据
- **When**: 统计数据加载完成
- **Then**: 统计数据展示简洁，没有过度装饰
- **Verification**: `human-judgment`

### AC-5: 保持功能完整性
- **Given**: 用户使用页面的所有功能
- **When**: 进行各种操作
- **Then**: 所有现有功能都正常工作
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要完全去除CardHeader和CardTitle？
