# RedStone 页面 Tab 功能优化 Spec

## Why
当前 RedStone 预言机页面的各个 tab 功能过于简陋，以卡片堆叠为主，缺乏数据深度和可视化展示。参考 Chainlink 页面的设计，需要以数据展示为核心，减少卡片样式的使用，增加更有用的信息展示，同时避免为了丰富而添加不必要的内容。

## What Changes
- **Market View**: 优化布局，参考 Chainlink 的简洁设计，减少卡片嵌套，增加交易对信息展示
- **Network View**: 简化统计卡片，采用行内布局，增加网络活动图表和性能指标
- **Data Streams View**: 优化数据流类型展示，增加 Pull Model 优势的数据可视化
- **Providers View**: 优化数据提供者列表，增加数据质量指标和筛选功能
- **Cross Chain View**: 优化跨链支持展示，增加链间延迟对比图表
- **Ecosystem View**: 参考 Chainlink Ecosystem 设计，增加 TVL 趋势和项目分布图表
- **Risk View**: 扩展风险评估面板，增加历史事件时间线和风险因素分析

## Impact
- Affected files:
  - `src/app/[locale]/redstone/components/RedStoneMarketView.tsx`
  - `src/app/[locale]/redstone/components/RedStoneNetworkView.tsx`
  - `src/app/[locale]/redstone/components/RedStoneDataStreamsView.tsx`
  - `src/app/[locale]/redstone/components/RedStoneProvidersView.tsx`
  - `src/app/[locale]/redstone/components/RedStoneCrossChainView.tsx`
  - `src/app/[locale]/redstone/components/RedStoneEcosystemView.tsx`
  - `src/app/[locale]/redstone/components/RedStoneRiskView.tsx`

## ADDED Requirements

### Requirement: Market View 优化
The system SHALL 优化 Market View 的布局和数据显示：

#### Scenario: 价格趋势展示
- **WHEN** 用户查看 Market tab
- **THEN** 显示价格趋势图表（占 2/3 宽度）
- **AND** 右侧显示简洁的快速统计（无卡片背景）
- **AND** 下方显示主要交易对信息（LINK/USDC 等）

#### Scenario: 统计数据展示
- **WHEN** 显示统计数据
- **THEN** 使用行内布局替代卡片
- **AND** 显示市值、24h 交易量、流通供应量、质押 APR
- **AND** 数据变化使用颜色标识（绿色上涨，红色下跌）

### Requirement: Network View 优化
The system SHALL 优化 Network View 的网络指标展示：

#### Scenario: 核心网络指标
- **WHEN** 用户查看 Network tab
- **THEN** 顶部显示 4 个核心指标（活跃节点、数据喂送、响应时间、正常运行时间）
- **AND** 使用简洁的数字+趋势箭头展示
- **AND** 不使用卡片背景

#### Scenario: 网络活动图表
- **WHEN** 显示网络活动
- **THEN** 显示 24 小时活动柱状图
- **AND** 显示网络性能指标进度条（成功率、可用性、延迟）

### Requirement: Data Streams View 优化
The system SHALL 优化 Data Streams View 的数据展示：

#### Scenario: 数据流类型分布
- **WHEN** 用户查看 Data Streams tab
- **THEN** 显示数据流类型分布（价格喂送、自定义数据、L2 数据）
- **AND** 使用水平进度条展示占比

#### Scenario: 更新频率展示
- **WHEN** 显示更新频率
- **THEN** 使用简洁列表展示高频、标准、低频三种模式
- **AND** 显示对应的延迟时间

### Requirement: Providers View 优化
The system SHALL 优化 Providers View 的数据提供者展示：

#### Scenario: 提供者统计
- **WHEN** 用户查看 Providers tab
- **THEN** 顶部显示核心统计（数据源数量、更新频率、数据质量、平均声誉）
- **AND** 使用简洁行内布局

#### Scenario: 提供者列表
- **WHEN** 显示提供者列表
- **THEN** 使用表格形式展示
- **AND** 支持按声誉、数据点、最后更新时间排序
- **AND** 支持按高声誉、大数据量筛选

### Requirement: Cross Chain View 优化
The system SHALL 优化 Cross Chain View 的跨链支持展示：

#### Scenario: 跨链统计
- **WHEN** 用户查看 Cross Chain tab
- **THEN** 显示支持的链数量、平均响应时间、最快链、正常运行时间
- **AND** 使用简洁行内布局

#### Scenario: 链列表展示
- **WHEN** 显示支持的链
- **THEN** 使用表格形式展示
- **AND** 显示链名称、延迟、更新频率、状态

### Requirement: Ecosystem View 优化
The system SHALL 优化 Ecosystem View 的生态展示：

#### Scenario: TVL 趋势分析
- **WHEN** 用户查看 Ecosystem tab
- **THEN** 显示 TVL 趋势图表
- **AND** 支持按 1M/3M/6M/1Y 时间范围筛选
- **AND** 显示各链 TVL 分布

#### Scenario: 项目分布
- **WHEN** 显示生态项目
- **THEN** 使用柱状图展示各链项目数量
- **AND** 显示生态增长指标（新项目、集成数、社区、收入）

### Requirement: Risk View 优化
The system SHALL 优化 Risk View 的风险评估展示：

#### Scenario: 风险指标
- **WHEN** 用户查看 Risk tab
- **THEN** 显示风险指标（去中心化分数、安全评级、网络可靠性、透明度分数）
- **AND** 使用进度条展示各项分数
- **AND** 显示综合风险评分

#### Scenario: 历史风险事件
- **WHEN** 显示历史事件
- **THEN** 显示时间线图表
- **AND** 支持点击查看事件详情
- **AND** 显示事件类型（成功、警告、信息）

#### Scenario: 风险因素分析
- **WHEN** 显示风险因素
- **THEN** 显示可展开的风险因素列表
- **AND** 包括智能合约风险、预言机风险、市场风险、监管风险

## MODIFIED Requirements

### Requirement: 样式规范
The system SHALL 遵循以下样式规范：

#### Scenario: 减少卡片使用
- **WHEN** 设计界面布局
- **THEN** 优先使用行内布局和分隔线
- **AND** 避免嵌套卡片
- **AND** 使用 `space-y-8` 和 `border-t border-gray-200` 分隔区块

#### Scenario: 数据展示
- **WHEN** 展示数据
- **THEN** 使用大号数字（text-3xl font-semibold）
- **AND** 使用趋势箭头（TrendingUp/TrendingDown）
- **AND** 使用 Lucide 图标替代自定义 SVG

#### Scenario: 图表展示
- **WHEN** 使用图表
- **THEN** 使用 Recharts 库
- **AND** 保持简洁的配色方案
- **AND** 使用品牌色（RedStone 使用红色系）
