# DIA 预言机 Tab 功能优化 Spec

## Why
当前DIA页面的各个tab功能展示过于简陋，大量使用了卡片式布局，信息密度低且展示方式单一。参考Chainlink页面的设计，需要以数据展示为核心，减少卡片样式，采用更简洁的列表和行内布局，提升信息密度和专业感。

## What Changes
- **Market View**: 优化布局，减少卡片嵌套，采用Chainlink风格的简洁统计行和数据展示
- **Network View**: 简化指标展示，使用行内布局替代卡片堆叠，增加网络活动可视化
- **Data Feeds View**: 优化统计展示方式，采用横向统计行，增加分类筛选功能
- **NFT View**: 减少卡片使用，改为简洁的列表布局
- **Staking View**: 简化统计卡片，优化锁定期展示，采用更紧凑的布局
- **Ecosystem View**: 参考Chainlink生态页面，增加TVL趋势图表和项目分布可视化
- **Risk View**: 减少Card组件使用，改为简洁的列表和行内布局

## Impact
- Affected files:
  - `src/app/[locale]/dia/components/DIAMarketView.tsx`
  - `src/app/[locale]/dia/components/DIANetworkView.tsx`
  - `src/app/[locale]/dia/components/DIADataFeedsView.tsx`
  - `src/app/[locale]/dia/components/DIANFTView.tsx`
  - `src/app/[locale]/dia/components/DIAStakingView.tsx`
  - `src/app/[locale]/dia/components/DIAEcosystemView.tsx`
  - `src/app/[locale]/dia/components/DIARiskView.tsx`

## ADDED Requirements

### Requirement: DIAMarketView 优化
The system SHALL provide a cleaner market view with:
- 横向统计行展示核心指标（市值、24h交易量、流通供应量、质押APR）
- 左侧价格图表 + 右侧简洁统计的布局
- 网络状态使用行内列表展示，去除卡片嵌套
- 数据来源使用简洁的行内状态展示
- 主要交易对信息展示

### Requirement: DIANetworkView 优化
The system SHALL provide a streamlined network view with:
- 核心网络指标使用简洁的文本布局（非卡片）
- 每小时活动使用柱状图展示
- 网络性能指标使用进度条展示
- 网络统计摘要使用网格布局

### Requirement: DIADataFeedsView 优化
The system SHALL provide an enhanced data feeds view with:
- 横向统计行展示数据馈送概览
- 分类筛选功能（Crypto、Fiat、Commodity、NFT等）
- 数据馈送表格优化展示
- 数据源透明度表格
- 关于数据馈送的说明区域

### Requirement: DIANFTView 优化
The system SHALL provide a cleaner NFT view with:
- 简洁的统计行展示NFT概览
- NFT收藏列表使用表格布局
- 链分布使用简洁的网格展示

### Requirement: DIAStakingView 优化
The system SHALL provide an improved staking view with:
- 简洁的统计行展示质押概览
- 锁定期APR使用进度条对比展示
- 历史APR趋势使用图表展示
- 质押详情使用两栏布局

### Requirement: DIAEcosystemView 优化
The system SHALL provide a comprehensive ecosystem view with:
- TVL趋势分析区域，包含时间范围筛选
- 堆叠面积图展示各链TVL变化
- 链筛选功能
- 项目分布柱状图
- 生态增长指标展示

### Requirement: DIARiskView 优化
The system SHALL provide a streamlined risk view with:
- 风险指标使用简洁的文本布局
- 风险评估面板使用列表布局
- 数据验证状态使用行内展示
