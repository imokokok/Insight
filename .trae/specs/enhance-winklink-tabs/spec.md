# WINkLink 页面 Tab 功能优化 Spec

## Why
当前 WINkLink 预言机页面的各个 Tab 功能展示过于简陋，大量使用了卡片样式（card-based design），导致信息密度低且视觉层次不够清晰。参考 Chainlink 页面的设计，我们需要：
1. 减少卡片样式的使用，采用更简洁的内联布局
2. 增加有用的数据展示，以数据为核心
3. 保持专业金融风格，避免过度装饰
4. 提升信息密度，让用户快速获取关键指标

## What Changes
- **Market Tab**: 优化价格展示区域，简化统计卡片，增加交易对信息展示
- **Network Tab**: 重构网络指标展示，简化图表容器，采用行内统计布局
- **Staking Tab**: 优化节点列表展示，简化质押层级分布，增加收益计算器
- **Gaming Tab**: 重构游戏数据源展示，增加 VRF 服务统计，优化使用场景展示
- **Risk Tab**: 简化风险评分展示，优化风险因子进度条
- **TRON Tab**: 优化 dApp 列表展示，简化网络统计

**设计参考**: Chainlink 页面 Tab 区域设计风格
- 减少圆角卡片使用，采用扁平化内联布局
- 使用分隔线（border-t/border-b）代替卡片边界
- 图标 + 文字的简洁统计行
- 数据表格采用无边框或细线边框设计
- 增加信息密度，减少留白

## Impact
- Affected specs: WINkLink 页面所有 Tab 组件
- Affected code:
  - `WinklinkMarketView.tsx`
  - `WinklinkNetworkView.tsx`
  - `WinklinkStakingView.tsx`
  - `WinklinkGamingView.tsx`
  - `WinklinkRiskView.tsx`
  - `WinklinkTRONView.tsx`
  - 可能需要新增 `WinklinkDataTable.tsx` 组件

## ADDED Requirements

### Requirement: Market Tab 优化
The system SHALL provide a redesigned Market Tab with:
- 简洁的价格图表区域（无卡片包裹）
- 行内统计布局替代卡片网格
- 新增主要交易对信息展示（LINK/USDC 风格）
- 快速统计采用分隔线分隔的行列表
- 网络状态使用图标+文字的简洁行布局

#### Scenario: Market Tab 展示
- **WHEN** 用户访问 Market Tab
- **THEN** 看到简洁的价格趋势图表
- **AND** 右侧展示行内排列的快速统计数据
- **AND** 底部展示主要交易对信息（价格、成交量、流动性）

### Requirement: Network Tab 优化
The system SHALL provide a redesigned Network Tab with:
- 核心网络指标采用图标+数值的简洁行布局
- 每小时活动图表简化容器（无卡片包裹）
- 网络性能指标使用细进度条
- 网络概览统计使用行内布局

#### Scenario: Network Tab 展示
- **WHEN** 用户访问 Network Tab
- **THEN** 看到四个核心指标横向排列（Active Nodes, Data Feeds, Response Time, Uptime）
- **AND** 每小时活动使用简化柱状图
- **AND** 性能指标使用 1.5px 细进度条展示

### Requirement: Staking Tab 优化
The system SHALL provide a redesigned Staking Tab with:
- 质押统计采用行内图标+文字布局
- 节点列表使用数据表格组件（类似 ChainlinkDataTable）
- 质押层级分布简化展示
- 可选：增加质押收益计算器

#### Scenario: Staking Tab 展示
- **WHEN** 用户访问 Staking Tab
- **THEN** 看到简洁的质押统计行
- **AND** 可排序的节点数据表格
- **AND** 右侧展示层级分布和概览

### Requirement: Gaming Tab 优化
The system SHALL provide a redesigned Gaming Tab with:
- 游戏统计采用行内布局
- VRF 服务使用简洁列表
- 使用场景采用紧凑卡片或行布局
- 游戏数据源使用数据表格

#### Scenario: Gaming Tab 展示
- **WHEN** 用户访问 Gaming Tab
- **THEN** 看到游戏统计概览
- **AND** VRF 服务和游戏数据源使用表格展示

### Requirement: Risk Tab 优化
The system SHALL provide a redesigned Risk Tab with:
- 整体风险评分简化展示
- 风险因子使用细进度条
- 风险趋势图表简化
- 缓解措施使用简洁列表

#### Scenario: Risk Tab 展示
- **WHEN** 用户访问 Risk Tab
- **THEN** 看到整体风险评分
- **AND** 风险因子使用细进度条展示

### Requirement: TRON Tab 优化
The system SHALL provide a redesigned TRON Tab with:
- TRON 网络统计采用行内布局
- dApp 列表使用数据表格
- 集成覆盖度使用细进度条

#### Scenario: TRON Tab 展示
- **WHEN** 用户访问 TRON Tab
- **THEN** 看到 TRON 网络统计
- **AND** 可筛选的 dApp 数据表格

## MODIFIED Requirements

### Requirement: 组件样式规范
**Current**: 大量使用 `bg-white border border-gray-200 rounded-lg p-4` 卡片样式
**Modified**: 
- 采用扁平化设计，减少卡片使用
- 使用 `border-t border-gray-200` 和 `border-b border-gray-100` 作为分隔
- 统计区域使用 `py-2` 或 `py-3` 垂直间距
- 进度条高度统一为 `h-1.5`

### Requirement: 数据表格组件
**Current**: 各 Tab 使用内联表格或列表
**Modified**: 
- 创建统一的 `WinklinkDataTable` 组件
- 支持排序、自定义列渲染
- 采用细线边框设计

## REMOVED Requirements

### Requirement: 过度卡片包装
**Reason**: 减少视觉噪音，提升信息密度
**Migration**: 将卡片内容转换为行内布局或简化容器

### Requirement: 大圆角设计
**Reason**: 采用更专业的金融风格
**Migration**: 使用 `rounded-md` 或移除圆角
