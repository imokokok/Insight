# Chainlink 页面色调优化 Spec

## Why
现有的 Chainlink 页面使用了深色主题（slate-900/slate-950），与项目整体浅色主题（白色/灰色）不一致，造成视觉上的割裂感。需要统一色调以提供一致的用户体验。

## What Changes
- 将 Chainlink 页面从深色主题改为与项目一致的浅色主题
- 移除 Chainlink 页面内部的侧边导航栏（避免与顶部导航栏重复）
- 保留页面内的功能模块，改为标签页或锚点导航方式
- 调整所有组件的配色方案，使用项目标准色板

## Impact
- Affected specs: Chainlink 页面展示
- Affected code: src/app/chainlink/page.tsx, src/app/chainlink/components/*.tsx

## ADDED Requirements

### Requirement: 统一色调
The system SHALL provide consistent light theme styling for Chainlink page.

#### Scenario: 页面背景
- **WHEN** 用户访问 Chainlink 页面
- **THEN** 页面背景应为浅灰色（bg-gray-50），与项目其他页面一致

#### Scenario: 卡片样式
- **WHEN** 页面显示数据卡片
- **THEN** 卡片使用白色背景（bg-white），灰色边框（border-gray-200）

#### Scenario: 文字颜色
- **WHEN** 页面显示文字内容
- **THEN** 主要文字为深灰色（text-gray-900），次要文字为中灰色（text-gray-600）

## MODIFIED Requirements

### Requirement: 页面导航结构
**原需求**: Chainlink 页面有独立的顶部导航栏 + 左侧边栏导航
**修改后**: 使用项目统一的顶部导航栏，Chainlink 页面内部使用标签页导航

#### Scenario: 导航方式
- **WHEN** 用户在 Chainlink 页面内切换不同模块
- **THEN** 使用水平标签页（Tabs）进行导航，而非侧边栏

#### Scenario: 模块展示
- **WHEN** 页面加载完成
- **THEN** 默认显示市场数据模块，用户可通过标签页切换其他模块

### Requirement: 配色方案
**原需求**: 深色主题配色（slate-900, slate-800, slate-700）
**修改后**: 浅色主题配色（white, gray-50, gray-100, gray-200）

#### Scenario: 主色调
- **WHEN** 页面显示品牌色
- **THEN** 使用蓝色系（blue-600, blue-500）作为强调色

#### Scenario: 状态指示
- **WHEN** 显示状态指示器
- **THEN** 使用绿色（green-500）表示正常，黄色（yellow-500）表示警告，红色（red-500）表示错误

## REMOVED Requirements

### Requirement: 独立侧边导航栏
**Reason**: 与项目顶部导航栏重复，造成双导航栏的视觉混乱
**Migration**: 改为使用标签页导航，所有模块在同一页面内通过标签切换

### Requirement: 深色主题背景
**Reason**: 与项目整体浅色主题不一致
**Migration**: 全面改为浅色主题配色
