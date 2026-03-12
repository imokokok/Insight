# 市场概览页面 (Market Overview) 规格文档

## Why
当前项目已有多个功能丰富的页面，但缺乏一个**简洁的全局市场概览**，让用户能够快速了解预言机市场的整体状态。需要一个与现有页面功能不重复、采用项目现有设计风格的轻量级页面。

## What Changes
- **新增** `/market-overview` 页面路由
- **新增** 简洁的市场概览页面（浅色主题，扁平化设计）
- **新增** 4个核心市场指标展示
- **新增** 热门资产列表（简洁表格）
- **新增** 导航栏入口

## Impact
- **受影响规格**: 导航栏结构、路由配置、国际化文件
- **受影响代码**: `src/app/market-overview/page.tsx` 及组件目录

## ADDED Requirements

### Requirement: 页面基础结构
The system SHALL provide a clean, light-themed market overview page following existing project design patterns.

#### Scenario: 页面加载
- **WHEN** 用户访问 `/market-overview`
- **THEN** 系统显示简洁的市场概览页面
- **AND** 采用浅色主题（白色背景）
- **AND** 使用项目现有的配色方案（gray-900 文字，gray-200 边框）
- **AND** 无卡片阴影，使用细边框分隔

### Requirement: 核心市场指标
The system SHALL display 4 key market metrics in a simple row layout.

#### Scenario: 指标展示
- **WHEN** 页面加载完成
- **THEN** 显示以下核心指标：
  - 总保障价值 (TVS)
  - 活跃预言机数量
  - 支持资产数量
  - 24小时更新次数

### Requirement: 热门资产列表
The system SHALL display a clean table of top assets.

#### Scenario: 资产列表展示
- **WHEN** 用户查看页面
- **THEN** 显示热门资产表格，包含：
  - 资产符号
  - 当前价格
  - 24小时变化
  - 主要预言机

### Requirement: 简洁的视觉设计
The system SHALL follow existing project design patterns with light theme.

#### Design Guidelines:
- 浅色主题：白色背景 (bg-white)
- 无卡片阴影
- 使用细边框 (border-gray-200) 分隔
- 文字颜色：gray-900（主文字）、gray-500（次要文字）
- 简洁的表格设计，hover:bg-gray-50
- 大量留白
- 响应式布局

## MODIFIED Requirements
无

## REMOVED Requirements
无
