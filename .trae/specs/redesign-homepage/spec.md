# 首页重构规格文档

## Why
当前首页设计较为基础，需要升级为专业且美观的预言机数据分析平台首页。参考 Dune Analytics 的扁平化设计风格，去除卡片样式，打造更符合专业数据平台形象的界面。

## What Changes
- 全新 Hero 区域：深色背景 + 数据可视化元素，展示平台核心价值
- 实时数据展示：扁平化表格设计展示关键预言机数据
- 功能导航：简洁的网格布局，无卡片阴影
- 数据统计：大号数字 + 简洁标签的统计展示
- 预言机概览：横向滚动或网格展示支持的预言机
- 最新动态/洞察：数据洞察区域
- 专业配色：参考 Dune 的深色主题 + 强调色

## Impact
- 受影响文件：`src/app/page.tsx`
- 新增组件：可能需要新的首页专用组件
- 样式更新：`globals.css` 可能需要补充首页专用样式
- i18n：复用现有翻译键，可能需要少量新增

## ADDED Requirements

### Requirement: 全新 Hero 区域
The system SHALL provide专业的 Hero 区域，展示平台核心价值主张。

#### Scenario: 用户访问首页
- **WHEN** 用户访问首页
- **THEN** 看到深色背景的 Hero 区域
- **AND** 包含平台标题、副标题、主要 CTA 按钮
- **AND** 展示核心数据指标（预言机数量、支持链数、数据源数量）
- **AND** 背景包含 subtle 的数据可视化元素或网格效果

### Requirement: 实时数据展示区域
The system SHALL 以扁平化表格形式展示实时预言机数据。

#### Scenario: 用户浏览实时数据
- **WHEN** 用户滚动到实时数据区域
- **THEN** 看到简洁的表格展示主流预言机代币价格
- **AND** 表格无卡片边框，使用细线分隔
- **AND** 显示价格、24h变化、趋势迷你图
- **AND** 数据实时更新指示器

### Requirement: 功能导航区域
The system SHALL 提供简洁的功能导航入口。

#### Scenario: 用户寻找功能入口
- **WHEN** 用户查看功能导航区域
- **THEN** 看到网格布局的功能入口
- **AND** 每个入口包含图标、标题、简短描述
- **AND** 无卡片样式，hover 时有 subtle 背景变化
- **AND** 包含：跨预言机比较、跨链比较、价格查询、Chainlink 详情

### Requirement: 平台统计展示
The system SHALL 以大号数字形式展示平台核心统计数据。

#### Scenario: 用户了解平台规模
- **WHEN** 用户查看统计区域
- **THEN** 看到大字号的核心指标
- **AND** 包含：集成预言机数、支持区块链数、数据源数量、日均更新次数
- **AND** 简洁的标签说明
- **AND** 数字可以有 subtle 的动画效果

### Requirement: 预言机协议展示
The system SHALL 展示支持的预言机协议。

#### Scenario: 用户查看支持的预言机
- **WHEN** 用户查看预言机展示区域
- **THEN** 看到横向排列或网格排列的预言机标识
- **AND** 包含：Chainlink、Band Protocol、UMA、Pyth Network、API3
- **AND** 每个预言机显示名称、简短描述
- **AND** 点击可跳转到详情页

### Requirement: 数据洞察区域
The system SHALL 展示平台的数据洞察能力。

#### Scenario: 用户了解数据分析能力
- **WHEN** 用户查看洞察区域
- **THEN** 看到数据洞察卡片（无阴影扁平设计）
- **AND** 包含：价格异常预警、数据质量评分、市场趋势
- **AND** 每个洞察显示关键指标和趋势

### Requirement: 专业视觉设计
The system SHALL 采用 Dune 风格的扁平化专业设计。

#### Scenario: 用户浏览首页
- **WHEN** 用户浏览首页
- **THEN** 看到深色/浅色协调的配色方案
- **AND** 无卡片阴影，使用边框或背景色区分区域
- **AND** 充足的留白空间
- **AND** 专业的数据可视化元素
- **AND** 统一的字体层次结构

## MODIFIED Requirements

### Requirement: 首页布局结构
**修改内容**: 完全重构 `src/app/page.tsx`，保留数据获取逻辑，重新设计所有 UI 组件

#### Scenario: 首页渲染
- **WHEN** 首页组件渲染
- **THEN** 使用新的扁平化设计风格
- **AND** 保留现有的数据获取 hooks（useOraclePrices）
- **AND** 保持与现有布局组件（Navbar、Footer）的兼容

## REMOVED Requirements

### Requirement: 旧版卡片样式
**Reason**: 不符合 Dune 扁平化设计风格
**Migration**: 完全移除卡片阴影和圆角卡片设计，改用扁平化替代

### Requirement: 旧版 Hero 设计
**Reason**: 需要更专业、更有冲击力的首屏设计
**Migration**: 完全重新设计 Hero 区域
