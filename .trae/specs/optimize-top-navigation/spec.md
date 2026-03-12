# 顶部导航优化方案 Spec

## Why
当前导航栏包含10个平级菜单项，随着功能增加会导致：
1. 视觉拥挤，难以快速定位功能
2. 移动端体验差，汉堡菜单过长
3. 缺乏信息层级，新用户难以理解功能结构
4. 专业数据分析平台通常采用分层导航模式

## What Changes
- **重构导航结构**：采用"主导航 + 下拉菜单"分层模式
- **功能分组**：将功能按使用场景分组（概览、查询、对比、预言机详情）
- **视觉优化**：添加图标、分组标题、当前位置指示
- **交互增强**：支持键盘导航、悬停预览、快捷入口
- **移动端适配**：侧边抽屉式导航替代下拉菜单

## Impact
- Affected specs: 导航交互、信息架构、移动端适配
- Affected code: [src/components/Navbar.tsx](src/components/Navbar.tsx), 可能需要新增子组件

## ADDED Requirements

### Requirement: 分层导航结构
The system SHALL 将导航项按功能域分组展示

#### Scenario: 主导航展示
- **WHEN** 用户访问任意页面
- **THEN** 主导航显示4个一级菜单：市场概览、价格查询、数据分析、预言机详情

#### Scenario: 下拉菜单展开
- **WHEN** 用户hover或click一级菜单
- **THEN** 展开对应的二级菜单，显示该分组下的具体功能

### Requirement: 分组详情
The system SHALL 按以下结构组织导航：

**市场概览**
- 首页 Dashboard
- 市场总览 Market Overview

**价格查询**
- 价格查询 Price Query

**数据分析**
- 跨预言机对比 Cross-Oracle
- 跨链对比 Cross-Chain

**预言机详情**（下拉分组）
- Chainlink
- Band Protocol
- Pyth Network
- API3
- UMA

### Requirement: 视觉优化
The system SHALL 提供专业的视觉设计

#### Scenario: 图标系统
- **WHEN** 渲染导航项
- **THEN** 每个菜单项显示对应的 Lucide 图标

#### Scenario: 当前状态指示
- **WHEN** 用户位于某个页面
- **THEN** 对应导航项高亮显示，下拉分组显示激活指示器

### Requirement: 交互增强
The system SHALL 提供流畅的交互体验

#### Scenario: 悬停延迟
- **WHEN** 用户快速划过导航
- **THEN** 下拉菜单有150ms延迟避免误触发

#### Scenario: 键盘导航
- **WHEN** 用户使用 Tab 键导航
- **THEN** 可以正常遍历所有菜单项，Enter键打开下拉，Esc关闭

#### Scenario: 移动端适配
- **WHEN** 用户在移动设备访问
- **THEN** 显示汉堡菜单，点击后从右侧滑出全屏导航抽屉

## MODIFIED Requirements
无

## REMOVED Requirements
无
