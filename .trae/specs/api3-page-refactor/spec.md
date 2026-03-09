# API3 页面重构规格文档

## Why
现有的 API3 页面采用简单的单页长滚动设计，缺乏 Chainlink 页面那样的专业数据分析平台架构。API3 作为第一方预言机解决方案的代表，具有独特的技术特点（Airnode、dAPI、可量化安全等），需要一个能够充分展示这些特性的专业仪表板界面。重构后的页面将提供更深入的数据可视化、实时市场洞察和技术架构分析，帮助用户全面了解 API3 的预言机特性。

## What Changes
- **BREAKING**: 页面架构从单页长滚动改为多标签页专业仪表板设计（参照 Chainlink 页面架构）
- 重新组织目录结构，将功能拆分为独立的 Panel 组件
- 增加 API3 代币的实时市场数据面板
- 添加 Airnode 网络健康度监控指标
- 实现第一方预言机特有的数据可视化（dAPI 覆盖、Airnode 部署统计）
- 增加可量化安全分析模块（API3 的核心特性）
- 提供 dAPI 生态集成展示
- 集成风险评估和安全指标

## Impact
- Affected specs: API3 页面展示能力、数据可视化能力、用户分析能力
- Affected code: 
  - src/app/api3/page.tsx (完全重构)
  - src/app/api3/components/ (新增目录和组件)
  - src/lib/oracles/api3.ts (扩展)
  - src/i18n/en.json (添加翻译键)
  - src/i18n/zh-CN.json (添加翻译键)

## ADDED Requirements

### Requirement: 多标签页导航系统
The system SHALL provide a tab-based navigation system similar to Chainlink page.

#### Scenario: 标签页切换
- **WHEN** 用户点击不同标签页
- **THEN** 内容区域动态切换显示对应面板，URL 可选择性更新

#### Scenario: 标签页配置
- **GIVEN** 5个主要标签页：market（市场数据）、network（网络健康）、airnodes（Airnode 分析）、ecosystem（dAPI 生态）、risk（风险评估）
- **THEN** 每个标签页显示对应的图标和标签文本

### Requirement: 实时市场数据面板 (MarketDataPanel)
The system SHALL provide comprehensive real-time market data display for API3 token.

#### Scenario: 市场概览展示
- **WHEN** 用户访问 API3 页面市场标签
- **THEN** 系统显示 API3 的实时价格、24h涨跌、市值、交易量、流通供应量、完全稀释估值

#### Scenario: 价格变动提醒
- **WHEN** 价格变动时
- **THEN** 显示视觉提示（颜色变化/动画效果），绿色表示上涨，红色表示下跌

#### Scenario: 市场数据指标
- **THEN** 显示以下指标卡片：
  - Market Cap（市值）
  - Volume 24h（24小时交易量）
  - Circulating Supply（流通供应量）
  - Fully Diluted Valuation（完全稀释估值）
  - Market Cap Rank（市值排名）
  - Supply Ratio（供应比例）

### Requirement: Airnode 网络健康度监控面板 (NetworkHealthPanel)
The system SHALL display API3 Airnode network health and performance metrics.

#### Scenario: 网络状态监控
- **WHEN** 页面加载完成
- **THEN** 显示：活跃 Airnode 数量、节点在线率、平均响应时间、dAPI 更新频率、API3 质押总量

#### Scenario: 网络活动热力图
- **WHEN** 用户查看网络活动
- **THEN** 显示 24h dAPI 数据请求分布热力图（按小时）

#### Scenario: 数据新鲜度指示
- **WHEN** 数据更新时
- **THEN** 显示最后更新时间戳和数据延迟状态（优秀/良好/缓慢）

### Requirement: 第一方预言机分析面板 (FirstPartyOraclePanel)
The system SHALL provide first-party oracle specific analytics for API3.

#### Scenario: Airnode 部署统计
- **WHEN** 用户查看 Airnode 分析
- **THEN** 显示：
  - 活跃 Airnode 数量及地理分布
  - 按区块链网络的 Airnode 分布（Ethereum、Arbitrum、Polygon 等）
  - API 提供商类型分布（交易所、传统金融、其他）

#### Scenario: dAPI 覆盖分析
- **WHEN** 用户查看数据源
- **THEN** 显示：
  - 活跃的 dAPI 数量
  - 按资产类型分布（加密货币、外汇、商品、股票）
  - dAPI 更新频率统计

#### Scenario: 第一方优势指标
- **THEN** 显示 API3 第一方预言机的核心优势：
  - 中间商消除（直接来自 API 提供商）
  - 数据源透明度（可验证的 API 提供商）
  - 响应时间对比（vs 第三方预言机）

### Requirement: 可量化安全分析面板 (QuantifiableSecurityPanel)
The system SHALL provide API3's quantifiable security analysis - a core differentiator of API3.

#### Scenario: 安全评分展示
- **WHEN** 用户查看安全分析
- **THEN** 显示整体安全评分（0-100）及各维度子评分：
  - 去中心化程度（Decentralization）
  - 数据完整性（Data Integrity）
  - 抗操纵性（Manipulation Resistance）
  - 经济安全性（Economic Security）

#### Scenario: 保险池状态
- **THEN** 显示 API3 保险池（Coverage Pool）状态：
  - 保险池总锁仓价值
  - 保险覆盖率
  - 历史赔付记录

#### Scenario: 质押安全分析
- **THEN** 显示质押相关安全指标：
  - 总质押 API3 数量
  - 质押年化收益率
  - 质押者数量分布

### Requirement: dAPI 生态集成展示面板 (EcosystemPanel)
The system SHALL display API3 dAPI ecosystem integration status.

#### Scenario: DeFi 协议集成
- **WHEN** 用户查看生态数据
- **THEN** 显示集成的 DeFi 协议列表及使用 dAPI 的情况

#### Scenario: 区块链覆盖
- **THEN** 显示 API3 dAPI 支持的区块链网络

#### Scenario: 数据源提供商
- **THEN** 显示主要的 API 提供商合作伙伴

### Requirement: 风险评估模块 (RiskAssessmentPanel)
The system SHALL provide risk assessment specific to API3's architecture.

#### Scenario: API3 特定风险评估
- **WHEN** 用户查看风险分析
- **THEN** 显示：
  - 第一方数据源风险（API 提供商集中风险）
  - 智能合约风险
  - 质押 slash 风险

#### Scenario: 风险缓解措施
- **THEN** 显示 API3 已部署的风险缓解措施：
  - 保险池机制
  - 去中心化治理
  - 多数据源聚合

### Requirement: 高级价格图表组件 (PriceChart)
The system SHALL provide professional-grade price chart for API3 token.

#### Scenario: 多时间周期价格图表
- **WHEN** 用户选择不同时间周期（1H/24H/7D/30D/90D/1Y/ALL）
- **THEN** 图表动态更新显示对应数据

#### Scenario: 图表交互
- **THEN** 支持图表交互：数据提示框、十字光标

### Requirement: 页面头部和操作栏
The system SHALL provide a consistent page header with controls.

#### Scenario: 页面头部显示
- **THEN** 显示 API3 Logo、页面标题、副标题

#### Scenario: 时间范围选择器
- **WHEN** 用户选择时间范围
- **THEN** 所有相关数据组件同步更新

#### Scenario: 刷新和导出功能
- **WHEN** 用户点击刷新按钮
- **THEN** 重新获取所有数据
- **WHEN** 用户点击导出按钮
- **THEN** 导出当前数据为 JSON 文件

## MODIFIED Requirements

### Requirement: API3Client 扩展
**原需求**: 基础的 getPrice 和 getHistoricalPrices 方法
**修改后**: 扩展支持 API3 特有的数据获取方法

#### Scenario: 扩展数据获取
- **THEN** API3Client 支持获取：
  - Airnode 网络统计数据
  - dAPI 覆盖数据
  - 质押和保险池数据

### Requirement: 页面布局结构
**原需求**: 单页长滚动，简单的上下布局
**修改后**: 专业仪表板布局，采用标签页导航和网格系统

#### Scenario: 响应式仪表板
- **WHEN** 用户在不同设备访问
- **THEN** 布局自动适配：桌面端多列网格，平板端双列，移动端单列堆叠

## REMOVED Requirements

### Requirement: 基础特性卡片
**Reason**: 被更专业的数据分析模块替代，特性信息整合到各 Panel 中展示
**Migration**: 第一方预言机、Airnode、去中心化 API 连接、可量化安全等特性将在对应 Panel 中详细展示

### Requirement: 简单的价格统计卡片
**Reason**: 被专业的 MarketDataPanel 替代
**Migration**: BTC/ETH/SOL/API3 价格卡片整合到统一的市场数据面板中
