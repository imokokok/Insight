# API3 页面 Tab 功能优化规格

## Why

当前 API3 预言机页面的各个 tab 功能过于简陋，主要存在以下问题：
1. **过度使用卡片样式** - 每个统计项都包裹在独立的卡片中，造成视觉碎片化
2. **信息密度低** - 大量留白，数据展示不够紧凑
3. **缺乏数据深度** - 仅展示基础统计，缺少趋势分析、对比数据等
4. **交互性弱** - 缺少筛选、排序、展开等交互功能
5. **与 Chainlink 页面风格不一致** - Chainlink 页面采用更简洁的内联布局和数据表格

通过参考 Chainlink 页面的设计风格，优化 API3 各 tab 的数据展示，提升信息密度和专业感。

## What Changes

### 整体风格调整
- **减少卡片使用** - 采用 Chainlink 风格的简洁内联布局
- **增加信息密度** - 更紧凑的数据排列，减少不必要的留白
- **统一间距系统** - 使用 `space-y-8` 和 `gap-6/8` 的间距规范
- **添加分隔线** - 使用 `border-t border-gray-200` 划分内容区块

### Market Tab 优化
- 简化统计展示，采用行内布局替代卡片网格
- 添加主要交易对信息展示（类似 Chainlink）
- 优化价格趋势图表区域
- 网络状态采用图标+文字的简洁行内展示

### Network Tab 优化
- 核心指标采用简洁的文本布局（图标+标签+数值+趋势）
- 每小时活动图表简化容器样式
- 性能指标使用细进度条（h-1.5）
- 添加网络概览统计区域

### Airnode Tab 优化
- 添加 Airnode 节点列表表格（类似 Chainlink Nodes）
- 展示节点地区分布统计
- 添加第一方数据源优势说明区域
- 优化网络统计数据展示

### dAPI Tab 优化
- 添加 dAPI 数据馈送列表表格
- 支持按资产类型筛选（Crypto/Forex/Commodities/Stocks）
- 展示覆盖统计和更新频率分布
- 添加数据源可追溯性展示

### Ecosystem Tab 优化
- 参考 Chainlink Ecosystem 的 TVL 趋势分析
- 添加项目分布图表
- 生态增长指标采用简洁行内布局
- 支持链筛选功能

### Risk Tab 优化
- 添加风险指标雷达图对比
- 风险因素可展开/收起详情
- 历史风险事件时间线
- 综合风险评分展示

## Impact

### 受影响文件
- `src/app/[locale]/api3/components/API3MarketView.tsx`
- `src/app/[locale]/api3/components/API3NetworkView.tsx`
- `src/app/[locale]/api3/components/API3AirnodeView.tsx`
- `src/app/[locale]/api3/components/API3DapiView.tsx`
- `src/app/[locale]/api3/components/API3EcosystemView.tsx`
- `src/app/[locale]/api3/components/API3RiskView.tsx`
- `src/app/[locale]/api3/types.ts` - 可能需要扩展类型定义

### 新增组件（如需）
- `API3DataTable.tsx` - 类似 ChainlinkDataTable 的表格组件
- `AirnodeNodeData.ts` - Airnode 节点数据类型和模拟数据
- `DapiFeedData.ts` - dAPI 数据馈送类型和模拟数据

## ADDED Requirements

### Requirement: Market Tab 数据展示优化

The system SHALL provide a comprehensive market data view with the following features:

#### Scenario: Market Overview Display
- **GIVEN** the user is on the API3 Market tab
- **WHEN** the page loads
- **THEN** the system SHALL display:
  - 价格趋势图表（占2/3宽度）
  - 快速统计区域（简洁行内布局，无卡片背景）
  - 网络状态（图标+文字行内展示）
  - 数据来源列表（简洁行内布局）
  - 主要交易对信息（LINK/USDC等4个指标）

#### Scenario: Trading Pair Information
- **GIVEN** the market data is loaded
- **WHEN** displaying trading information
- **THEN** the system SHALL show:
  - LINK/USDC 当前价格
  - 24小时交易量
  - 流动性数据
  - 市场深度评分

### Requirement: Network Tab 网络数据展示

The system SHALL provide detailed network statistics with:

#### Scenario: Core Network Metrics
- **GIVEN** the user is on the API3 Network tab
- **WHEN** the page loads
- **THEN** the system SHALL display:
  - 4个核心指标：活跃 Airnodes、dAPI Feeds、响应时间、正常运行时间
  - 每个指标包含：图标、标签、数值、趋势指示器
  - 简洁文本布局，无卡片背景

#### Scenario: Network Activity Visualization
- **GIVEN** the network data is available
- **WHEN** displaying hourly activity
- **THEN** the system SHALL show:
  - 24小时活动柱状图
  - 性能指标进度条（成功率、可用性、延迟）
  - 网络概览统计（总请求数、平均Gas、活跃链数等）

### Requirement: Airnode Tab 节点数据展示

The system SHALL provide comprehensive Airnode information:

#### Scenario: Airnode Node List
- **GIVEN** the user is on the API3 Airnode tab
- **WHEN** the page loads
- **THEN** the system SHALL display:
  - Airnode 节点列表表格（名称、地区、响应时间、成功率、声誉、质押金额）
  - 支持排序功能
  - 地区分布统计（进度条展示）
  - 质押奖励计算器

#### Scenario: First-Party Data Advantages
- **GIVEN** the Airnode data is loaded
- **WHEN** displaying advantages
- **THEN** the system SHALL show:
  - 第一方数据优势说明（去中心化、透明度、安全性）
  - 每个优势包含标题、描述和关键指标

### Requirement: dAPI Tab 数据馈送展示

The system SHALL provide detailed dAPI coverage information:

#### Scenario: dAPI Feed List
- **GIVEN** the user is on the API3 dAPI tab
- **WHEN** the page loads
- **THEN** the system SHALL display:
  - dAPI 数据馈送列表表格（名称、类别、更新频率、偏差阈值、状态、总请求数、可靠性）
  - 类别筛选标签（All/Crypto/Forex/Commodities/Stocks）
  - 支持排序功能

#### Scenario: Coverage Statistics
- **GIVEN** the dAPI data is available
- **WHEN** displaying coverage
- **THEN** the system SHALL show:
  - 总 dAPI 数量
  - 支持的链数
  - 加密资产数量
  - 平均更新频率

### Requirement: Ecosystem Tab 生态数据展示

The system SHALL provide comprehensive ecosystem analytics:

#### Scenario: TVL Trend Analysis
- **GIVEN** the user is on the API3 Ecosystem tab
- **WHEN** the page loads
- **THEN** the system SHALL display:
  - TVL 趋势堆叠面积图
  - 时间范围选择器（1M/3M/6M/1Y）
  - 链筛选功能（Ethereum/Arbitrum/Polygon等）
  - TVL 统计数据（总TVL、各链占比）

#### Scenario: Project Distribution
- **GIVEN** the ecosystem data is available
- **WHEN** displaying project info
- **THEN** the system SHALL show:
  - 项目链分布横向柱状图
  - 生态增长指标（新项目、集成数、社区增长、收入）

### Requirement: Risk Tab 风险评估展示

The system SHALL provide comprehensive risk analysis:

#### Scenario: Risk Metrics Display
- **GIVEN** the user is on the API3 Risk tab
- **WHEN** the page loads
- **THEN** the system SHALL display:
  - 4个风险指标评分（去中心化、安全性、可靠性、透明度）
  - 综合风险评分
  - 行业基准对比雷达图
  - 与其他预言机的详细对比

#### Scenario: Risk Factor Analysis
- **GIVEN** the risk data is available
- **WHEN** displaying risk factors
- **THEN** the system SHALL show:
  - 可展开的风险因素列表（智能合约风险、预言机风险、市场风险、监管风险）
  - 每个因素包含风险等级、描述和详细说明
  - 历史风险事件时间线

## Design Reference

### Chainlink 页面设计特点
1. **间距规范**: 使用 `space-y-8` 作为主要区块间距，`gap-6/8` 作为网格间距
2. **分隔线**: 使用 `border-t border-gray-200` 划分主要区块
3. **统计展示**: 图标 + 标签 + 大数值 + 趋势指示器
4. **表格样式**: 简洁的表头，支持排序，状态标签使用颜色圆点
5. **进度条**: 细进度条（h-1.5），不同颜色表示不同指标
6. **图表容器**: 移除卡片背景，直接使用图表组件

### API3 品牌色应用
- 主色: `#00d090` (emerald-500)
- 辅助色: `#10b981` (emerald-600)
- 背景: 白色或浅灰，避免使用 emerald 色背景
