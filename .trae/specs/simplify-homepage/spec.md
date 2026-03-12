# 首页精简设计 Spec

## Why
当前 Insight 首页包含 10 个模块，功能过于密集，导致用户认知负荷过重。参考 Dune Analytics、Nansen、DeFiLlama 等专业数据分析平台，首页通常只保留 5-6 个核心模块，以简洁、聚焦的方式展示平台价值，引导用户快速找到核心功能。

## What Changes

### 精简后的首页架构（6个模块）

#### 1. Hero 区域 - 核心价值传达
- 简洁有力的标题和副标题
- 核心数据指标展示（3-4个关键数字）
- 主要功能入口按钮（开始探索、查看文档）
- **移除**：动态数据流背景（过于花哨，影响加载性能）

#### 2. 实时价格监控 - 精简版
- 保留 4 个核心交易对：BTC/USD、ETH/USD、LINK/USD、PYTH/USD
- 每个卡片显示：当前价格、24h涨跌、迷你趋势图
- **移除**：BAND/USD、UMA/USD、API3/USD（移至详情页）
- **移除**：悬停显示详细信息（简化交互）

#### 3. 核心功能导航 - 4宫格
- 将原"功能导航矩阵"和"预言机生态地图"合并
- 4 个核心功能卡片：
  - 价格查询（带实时数据预览）
  - 跨预言机比较（带市场份额预览）
  - 跨链比较（带热力图预览）
  - 历史分析（带趋势图预览）
- **移除**：节点声誉、数据源追溯（移至导航栏或更多页面）

#### 4. 跨链价格差异 - 特色功能
- 保留跨链热力图核心展示
- 简化展示：只显示主要链（Ethereum、BSC、Arbitrum、Polygon）
- 突出套利机会提示
- **移除**：过多的链选择，简化界面

#### 5. 平台数据概览 - 合并版
- 将"数据质量仪表盘"、"异常监控预警"、"技术实力展示"合并
- 展示内容：
  - 数据质量综合评分（大数字）
  - 最近 3 条重要异常告警
  - 支持的区块链网络图标（简化版）
- **移除**：详细雷达图、完整异常列表、详细技术指标

#### 6. CTA 区域 - 行动召唤
- 引导用户开始使用
- 简洁的文档、社区入口
- **移除**：过多的链接和选项

## Impact
- Affected specs: 首页架构精简
- Affected code:
  - `src/app/page.tsx` - 重写，减少组件引入
  - `src/app/home-components/` - 删除或合并部分组件
  - `src/i18n/zh-CN.json` 和 `en.json` - 移除多余翻译

## ADDED Requirements

### Requirement: 精简版 Hero 区域
The system SHALL provide a simplified hero section without complex animations.

#### Scenario: 用户进入首页
- **WHEN** 用户访问首页
- **THEN** 看到简洁的标题和核心指标
- **AND** 看到清晰的 CTA 按钮
- **AND** 页面加载快速，无复杂动画

### Requirement: 精简版价格监控
The system SHALL display only 4 major trading pairs.

#### Scenario: 用户查看市场行情
- **WHEN** 用户浏览价格监控
- **THEN** 看到 BTC、ETH、LINK、PYTH 四个核心代币
- **AND** 信息展示简洁清晰

### Requirement: 4宫格功能导航
The system SHALL provide a 4-card feature navigation grid with data previews.

#### Scenario: 用户导航到功能
- **WHEN** 用户查看功能导航
- **THEN** 看到 4 个核心功能卡片
- **AND** 每个卡片带有数据预览
- **AND** 点击可跳转到对应功能

### Requirement: 合并版数据概览
The system SHALL provide a combined data overview section.

#### Scenario: 用户了解平台数据
- **WHEN** 用户查看数据概览
- **THEN** 看到综合质量评分
- **AND** 看到最近异常告警
- **AND** 看到支持的区块链

## MODIFIED Requirements

### Requirement: 跨链热力图简化
**Current**: 展示所有链的完整热力图
**Modified**:
- 只展示主要链（Ethereum、BSC、Arbitrum、Polygon）
- 简化界面，突出核心套利机会

## REMOVED Requirements
- 移除动态数据流背景动画
- 移除 3 个交易对卡片（BAND、UMA、API3）
- 移除预言机生态地图独立模块
- 移除数据质量仪表盘独立模块
- 移除异常监控预警独立模块
- 移除技术实力展示独立模块
- 移除最新洞察与报告模块（移至页脚或独立页面）
- 移除节点声誉、数据源追溯功能入口（保留在导航栏）
