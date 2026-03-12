# 首页全新设计 Spec

## Why
作为专业的预言机数据分析平台，Insight 的首页需要更好地承载以下使命：
1. **第一印象**: 让用户第一眼就能理解平台的核心价值
2. **数据门户**: 成为用户获取预言机行业数据的主要入口
3. **功能导航**: 清晰引导用户发现和使用各项分析功能
4. **信任建立**: 通过专业、实时、全面的数据展示建立用户信任

## What Changes - 全新首页架构

### 1. Hero 区域 - 沉浸式数据大屏
- 全屏或半屏的动态数据可视化背景
- 实时滚动的关键数据指标（总数据源数、活跃预言机、24h更新数等）
- 简洁有力的标题和副标题
- 主要功能入口按钮

### 2. 实时市场概览 - 价格监控墙
- 网格布局展示主流交易对实时价格
- BTC/USD、ETH/USD、LINK/USD、PYTH/USD、BAND/USD、UMA/USD、API3/USD
- 每个卡片包含：当前价格、24h涨跌、价格趋势迷你图、数据来源数量
- 悬停显示详细信息

### 3. 预言机生态地图 - 可视化展示
- 交互式图表展示各预言机的市场地位
- 市场份额饼图/环形图
- TVS（保障总价值）对比
- 支持链数量对比
- 点击可跳转到详细分析页

### 4. 跨链数据热力图 - 核心特色功能预览
- 展示不同链上同一资产的价格差异热力图
- 突出套利机会提示
- 实时同步状态指示
- 点击可进入跨链比较功能

### 5. 数据质量仪表盘 - 可信度展示
- 综合数据质量评分（大数字展示）
- 各维度评分雷达图：准确性、及时性、一致性、完整性、可靠性
- 实时更新频率展示
- 数据源分布统计

### 6. 异常监控预警 - 实时告警
- 实时异常事件滚动列表
- 价格偏离预警
- 数据延迟告警
-  severity 分级展示（高/中/低）
- 点击查看详情

### 7. 功能导航矩阵 - 快速入口
- 6宫格或4宫格功能卡片
- 每个卡片包含：图标、功能名称、简短描述、跳转链接
- 功能包括：价格查询、跨预言机比较、跨链比较、历史分析、节点声誉、数据源追溯

### 8. 最新洞察与报告 - 内容营销
- 行业洞察卡片
- 数据报告下载入口
- 使用教程链接
- 平台更新日志

### 9. 技术实力展示 - 信任背书
- 支持的区块链网络图标墙
- 数据处理能力指标
- API 调用统计
- 系统可用性 SLA

### 10. CTA 区域 - 行动召唤
- 引导用户开始使用
- 文档链接
- 社区入口
- 联系支持

## Impact
- Affected specs: 首页整体架构重构
- Affected code:
  - `src/app/page.tsx` - 完全重写
  - `src/i18n/zh-CN.json` - 大量新增翻译
  - `src/i18n/en.json` - 大量新增翻译
  - 可能需要新增多个子组件

## ADDED Requirements

### Requirement: 沉浸式 Hero 区域
The system SHALL provide an immersive hero section with real-time data visualization.

#### Scenario: 用户进入首页
- **WHEN** 用户访问首页
- **THEN** 看到动态数据流背景
- **AND** 看到实时滚动的关键指标
- **AND** 可以快速进入主要功能

### Requirement: 实时价格监控墙
The system SHALL display a grid of real-time price monitoring cards for major trading pairs.

#### Scenario: 用户查看市场行情
- **WHEN** 用户浏览价格监控区域
- **THEN** 看到 BTC/USD、ETH/USD 等主流交易对的实时价格
- **AND** 看到 24h 涨跌百分比
- **AND** 看到价格趋势迷你图
- **AND** 悬停可查看更多信息

### Requirement: 预言机生态地图
The system SHALL provide an interactive visualization of oracle ecosystem.

#### Scenario: 用户了解预言机市场格局
- **WHEN** 用户查看生态地图区域
- **THEN** 看到各预言机的市场份额对比
- **AND** 看到 TVS 对比图表
- **AND** 看到支持链数量对比
- **AND** 可以点击跳转到详细分析

### Requirement: 跨链数据热力图
The system SHALL display a cross-chain price spread heatmap.

#### Scenario: 用户发现套利机会
- **WHEN** 用户查看热力图
- **THEN** 看到不同链上同一资产的价格差异
- **AND** 看到颜色编码的价格差异程度
- **AND** 看到潜在套利机会提示

### Requirement: 数据质量仪表盘
The system SHALL provide a comprehensive data quality dashboard.

#### Scenario: 用户评估数据可信度
- **WHEN** 用户查看质量仪表盘
- **THEN** 看到综合质量评分
- **AND** 看到各维度雷达图
- **AND** 看到数据源分布

### Requirement: 异常监控预警
The system SHALL display real-time anomaly alerts and warnings.

#### Scenario: 用户监控数据异常
- **WHEN** 用户查看异常监控区域
- **THEN** 看到实时异常事件列表
- **AND** 看到 severity 分级
- **AND** 可以点击了解详情

### Requirement: 功能导航矩阵
The system SHALL provide a grid of feature navigation cards.

#### Scenario: 用户快速导航到功能
- **WHEN** 用户查看功能导航
- **THEN** 看到清晰的功能卡片网格
- **AND** 每个卡片有图标、名称、描述
- **AND** 点击可跳转到对应功能

### Requirement: 最新洞察与报告
The system SHALL display latest insights and reports.

#### Scenario: 用户获取行业信息
- **WHEN** 用户查看洞察区域
- **THEN** 看到行业洞察卡片
- **AND** 看到报告下载入口
- **AND** 看到教程和更新日志

### Requirement: 技术实力展示
The system SHALL display technical capabilities and trust indicators.

#### Scenario: 用户评估平台可靠性
- **WHEN** 用户查看技术展示区域
- **THEN** 看到支持的区块链网络
- **AND** 看到数据处理能力指标
- **AND** 看到系统可用性 SLA

## MODIFIED Requirements
无 - 完全重新设计

## REMOVED Requirements
- 移除原有的简单 MetricsSection
- 移除原有的基础 OracleTable
- 移除原有的列表式 QuickLinksSection
