# UMA 预言机页面 Tab 功能优化规格文档

## Why
当前 UMA 预言机页面的各个 Tab 功能较为简陋，数据展示不够丰富，且过度使用卡片样式，导致信息密度低、视觉层次不清晰。参考 Chainlink 页面的设计，需要优化为以数据展示为核心、减少卡片嵌套、采用更简洁的内联布局风格。

## What Changes
- **Market Tab**: 优化价格趋势展示，简化统计区域布局，减少卡片嵌套，增加交易对信息展示
- **Network Tab**: 重构网络指标展示，采用简洁的统计布局，优化数据来源展示
- **Disputes Tab**: 优化争议统计展示，简化表格样式，增加争议趋势图表
- **Validators Tab**: 重构验证者列表，采用更简洁的表格和内联统计
- **Staking Tab**: 优化质押计算器布局，减少卡片使用，增加收益对比图表
- **Ecosystem Tab**: 重构生态展示，增加 TVL 趋势图表和项目分布数据
- **Risk Tab**: 优化风险指标展示，采用更简洁的风险评分展示方式

## Impact
- Affected specs: UMA 页面所有 Tab 组件
- Affected code: 
  - `UmaMarketView.tsx`
  - `UmaNetworkView.tsx`
  - `UmaDisputesView.tsx`
  - `UmaValidatorsView.tsx`
  - `UmaStakingView.tsx`
  - `UmaEcosystemView.tsx`
  - `UmaRiskView.tsx`

## ADDED Requirements

### Requirement: Market Tab 优化
The system SHALL provide a cleaner market data presentation with:
- 左侧价格趋势图表占 2/3 宽度
- 右侧统计信息采用内联列表布局，减少卡片嵌套
- 底部增加核心交易对信息展示（价格、24h交易量、流动性、市场深度）
- 使用简洁的分隔线代替卡片边框

### Requirement: Network Tab 优化
The system SHALL provide a streamlined network metrics display with:
- 顶部核心网络指标采用简洁的 4 列网格布局，无卡片背景
- 每小时活动使用简化柱状图展示
- 网络性能指标使用进度条形式
- 数据来源采用内联列表展示

### Requirement: Disputes Tab 优化
The system SHALL provide an enhanced disputes view with:
- 顶部统计采用内联布局，减少卡片使用
- 争议解决面板保持核心功能
- 最近争议表格简化样式
- 增加争议趋势迷你图表

### Requirement: Validators Tab 优化
The system SHALL provide a cleaner validators presentation with:
- 顶部统计采用行内内联布局
- 验证者表格简化样式
- 验证者分析面板保持核心功能
- 增加验证者分布统计

### Requirement: Staking Tab 优化
The system SHALL provide an improved staking view with:
- 质押计算器减少卡片嵌套
- 收益展示采用简洁布局
- APR 对比使用进度条形式
- 网络质押统计简化展示

### Requirement: Ecosystem Tab 优化
The system SHALL provide a data-rich ecosystem view with:
- TVL 趋势分析图表（堆叠面积图）
- 链上项目分布柱状图
- 生态增长指标内联展示
- 集成项目简化列表

### Requirement: Risk Tab 优化
The system SHALL provide a streamlined risk assessment with:
- 风险指标采用简洁的 2 列布局
- 风险因素使用列表形式
- 风险缓解措施简化展示
- 整体风险评分使用环形图

## MODIFIED Requirements

### Requirement: 样式统一
All Tab components SHALL follow the Chainlink page design patterns:
- 使用 `space-y-8` 作为主要间距
- 使用分隔线 `border-t border-gray-200` 划分区域
- 统计数据采用简洁的文本布局，减少 `bg-gray-50` 和 `rounded-lg` 的使用
- 表格使用简洁的表头样式
- 图标使用 Lucide React 图标库

## REMOVED Requirements

### Requirement: 过度卡片嵌套
**Reason**: 减少视觉层级复杂度，提高信息密度
**Migration**: 将卡片内容改为内联布局或简洁的分隔区域

### Requirement: 冗余的背景色
**Reason**: 保持界面简洁专业
**Migration**: 移除不必要的 `bg-gray-50` 和 `bg-white` 嵌套
