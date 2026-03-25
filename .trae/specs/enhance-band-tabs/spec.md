# Band Protocol Tabs 功能优化规范

## Why
当前 Band Protocol 页面的各个 tab 功能展示过于简陋，主要依赖卡片式布局堆砌数据，缺乏数据可视化和深度信息展示。参考 Chainlink 页面的设计，需要优化为更加专业的数据展示形式，减少卡片使用，增加表格、图表和简洁的统计布局。

## What Changes
- **Market View**: 优化价格展示区域，参考 Chainlink 的简洁统计布局，减少卡片嵌套
- **Network View**: 简化网络指标展示，使用行内统计替代卡片，优化图表展示
- **Validators View**: 优化验证者表格，增加数据密度，减少卡片使用
- **Cross-Chain View**: 优化跨链数据展示，使用更简洁的表格和统计布局
- **Data Feeds View**: 参考 Chainlink Data Feeds 设计，使用分类筛选和简洁表格
- **Risk View**: 参考 Chainlink Risk View，增加雷达图对比、时间线和风险因素分析

## Impact
- Affected files:
  - `BandProtocolMarketView.tsx`
  - `BandProtocolNetworkView.tsx`
  - `BandProtocolValidatorsView.tsx`
  - `BandProtocolCrossChainView.tsx`
  - `BandProtocolDataFeedsView.tsx`
  - `BandProtocolRiskView.tsx`
- 样式参考: Chainlink 页面各 tab 组件

## ADDED Requirements

### Requirement: Market View 优化
The system SHALL provide a cleaner market data display with reduced card usage.

#### Scenario: 价格趋势展示
- **WHEN** 用户访问 Market tab
- **THEN** 看到简洁的价格图表和行内统计数据
- **AND** 统计数据使用图标+数值的简洁布局
- **AND** 减少卡片嵌套，使用分隔线区分区域

#### Scenario: 交易对信息
- **WHEN** 用户查看市场数据
- **THEN** 看到主要交易对的价格、成交量、流动性等核心指标
- **AND** 使用简洁的网格布局而非卡片

### Requirement: Network View 优化
The system SHALL display network metrics in a streamlined inline layout.

#### Scenario: 网络指标展示
- **WHEN** 用户访问 Network tab
- **THEN** 看到图标+大数值的简洁统计行
- **AND** 趋势指示器（上升/下降）与数值同行显示
- **AND** 每小时活动使用简化柱状图

#### Scenario: 性能指标
- **WHEN** 用户查看网络性能
- **THEN** 看到进度条形式的成功率、可用性、延迟指标
- **AND** 使用细线进度条（h-1.5）保持简洁

### Requirement: Validators View 优化
The system SHALL present validator data in a dense, information-rich table.

#### Scenario: 验证者列表
- **WHEN** 用户访问 Validators tab
- **THEN** 看到紧凑的验证者表格
- **AND** 支持排序功能
- **AND** 减少顶部统计卡片，使用行内统计

### Requirement: Data Feeds View 优化
The system SHALL follow Chainlink Data Feeds design pattern.

#### Scenario: 数据流分类筛选
- **WHEN** 用户访问 Data Feeds tab
- **THEN** 看到分类筛选标签（All, Crypto, Forex, Commodities, DeFi）
- **AND** 统计数据使用图标+数值的行内布局
- **AND** 数据表格支持排序和筛选

#### Scenario: 数据流详情
- **WHEN** 用户查看数据流
- **THEN** 看到更新频率、偏差阈值、状态等核心指标
- **AND** 底部包含关于数据流的说明文字

### Requirement: Risk View 优化
The system SHALL provide comprehensive risk analysis similar to Chainlink.

#### Scenario: 风险指标展示
- **WHEN** 用户访问 Risk tab
- **THEN** 看到多个风险维度的评分（去中心化、安全性、可靠性、透明度）
- **AND** 每个指标包含数值、进度条、描述和趋势
- **AND** 显示综合风险评分

#### Scenario: 行业基准对比
- **WHEN** 用户查看风险分析
- **THEN** 看到雷达图对比 Band Protocol 与其他预言机
- **AND** 右侧显示详细对比数据

#### Scenario: 历史风险事件
- **WHEN** 用户查看风险历史
- **THEN** 看到时间线展示历史安全事件
- **AND** 点击事件查看详情
- **AND** 事件类型包括：成功、警告、信息、错误

#### Scenario: 风险因素分析
- **WHEN** 用户查看风险因素
- **THEN** 看到可展开的风险类别列表
- **AND** 每个类别显示风险等级（低/中/高）
- **AND** 展开后显示详细描述和要点

### Requirement: Cross-Chain View 优化
The system SHALL display cross-chain data in a clean table format.

#### Scenario: 跨链统计
- **WHEN** 用户访问 Cross-Chain tab
- **THEN** 看到简洁的统计数据行
- **AND** 链列表使用表格展示
- **AND** 请求分布使用进度条展示

## MODIFIED Requirements

### Requirement: 样式统一
所有 tab 组件 SHALL follow these styling guidelines:
- 使用 `space-y-8` 作为主要区域间距
- 统计数据使用图标+数值的行内布局
- 减少 `rounded-lg` 卡片使用，优先使用简洁布局
- 分隔线使用 `border-t border-gray-200`
- 进度条使用 `h-1.5` 细线样式
- 表格使用标准 HTML table，外层容器使用 `overflow-x-auto`

### Requirement: 数据密度
所有数据展示 SHALL:
- 优先使用表格展示列表数据
- 使用行内统计替代卡片统计
- 保持信息密度，避免过度留白
- 使用 Lucide 图标增强可读性

## REMOVED Requirements

### Requirement: 过度卡片化布局
**Reason**: Chainlink 设计采用更简洁的行内布局
**Migration**: 将卡片统计改为行内统计，使用分隔线区分区域

### Requirement: 彩色背景信息块
**Reason**: 减少视觉噪音，保持专业感
**Migration**: 使用简洁的边框和分隔线，仅在必要时使用浅色背景
