# DIA 页面重构规范

## Why
当前 DIA 页面布局与 Chainlink 等其他预言机页面不一致，信息密度较低，且未能充分展示 DIA 作为开源跨链数据预言机平台的特性。通过重构，我们需要：
1. 统一页面布局风格，与 Chainlink 页面保持一致
2. 提升数据密度，减少不必要的信息展示
3. 突出 DIA 的核心特性：数据透明度、跨链覆盖、NFT 数据、质押机制

## What Changes
- **重构页面布局**：从 Tab 导航 + 动态统计卡片改为侧边栏导航 + 固定统计概览
- **简化数据结构**：参考 Chainlink 的 `useChainlinkPage` hook，创建 `useDIAPage` hook
- **优化视图组件**：创建与 Chainlink 对应的视图组件（MarketView, NetworkView, DataFeedsView 等）
- **提升数据密度**：在首屏展示更多核心指标
- **保留 DIA 特性**：数据透明度、NFT 数据、质押详情等 DIA 特有功能

## Impact
- **受影响文件**：
  - `src/app/[locale]/dia/page.tsx` - 主页面重构
  - `src/app/[locale]/dia/hooks/useDIAPage.ts` - 新增 hook
  - `src/app/[locale]/dia/types.ts` - 新增类型定义
  - `src/app/[locale]/dia/components/DIASidebar.tsx` - 新增侧边栏
  - `src/app/[locale]/dia/components/DIAMarketView.tsx` - 新增市场视图
  - `src/app/[locale]/dia/components/DIANetworkView.tsx` - 新增网络视图
  - `src/app/[locale]/dia/components/DIADataFeedsView.tsx` - 新增数据馈送视图
  - `src/app/[locale]/dia/components/DIANFTView.tsx` - 新增 NFT 视图
  - `src/app/[locale]/dia/components/DIAStakingView.tsx` - 新增质押视图
  - `src/app/[locale]/dia/components/DIAEcosystemView.tsx` - 新增生态视图
  - `src/app/[locale]/dia/components/DIARiskView.tsx` - 新增风险视图
  - `src/app/[locale]/dia/components/index.ts` - 组件导出

## ADDED Requirements

### Requirement: 页面布局重构
DIA 页面 SHALL 采用与 Chainlink 页面一致的布局结构。

#### Scenario: 页面结构
- **GIVEN** 用户访问 DIA 页面
- **WHEN** 页面加载完成
- **THEN** 应显示：
  - Hero 区域：包含实时状态条、页面标题、价格显示、刷新/导出按钮、4 个核心统计卡片
  - 侧边栏导航：8 个导航项（市场、网络、数据馈送、NFT 数据、质押、生态、跨预言机、风险）
  - 内容区域：根据选中标签显示对应视图

### Requirement: 核心统计数据
页面 SHALL 在 Hero 区域展示固定的 4 个核心统计数据。

#### Scenario: 统计数据展示
- **GIVEN** 用户查看 DIA 页面
- **WHEN** 页面加载完成
- **THEN** 应显示以下统计：
  - 活跃数据源数量（45+）
  - 支持链数量（6+）
  - 数据馈送数量（280+）
  - 质押总价值（$15M+）

### Requirement: 侧边栏导航
页面 SHALL 提供固定的侧边栏导航，与 Chainlink 保持一致。

#### Scenario: 导航项
- **GIVEN** 用户查看侧边栏
- **WHEN** 导航渲染完成
- **THEN** 应包含以下导航项：
  - 市场数据（market）
  - 网络健康（network）
  - 数据馈送（data-feeds）
  - NFT 数据（nft-data）
  - 质押（staking）
  - 生态系统（ecosystem）
  - 跨预言机对比（cross-oracle）
  - 风险评估（risk）

### Requirement: 市场数据视图
市场视图 SHALL 展示价格趋势和关键指标。

#### Scenario: 市场视图内容
- **GIVEN** 用户选择"市场数据"标签
- **WHEN** 视图加载完成
- **THEN** 应显示：
  - 价格趋势图表（占 2/3 宽度）
  - 快速统计面板（市值、24h 交易量、流通供应量、质押 APR）
  - 网络状态概览（活跃数据源、数据馈送、响应时间、成功率）
  - 数据源列表（带状态指示器）

### Requirement: 网络健康视图
网络视图 SHALL 展示 DIA 网络的核心指标。

#### Scenario: 网络视图内容
- **GIVEN** 用户选择"网络健康"标签
- **WHEN** 视图加载完成
- **THEN** 应显示：
  - 4 个核心指标卡片（活跃数据源、数据馈送、响应时间、正常运行时间）
  - 网络健康面板
  - 每小时活动图表
  - 性能指标（成功率、可用性、延迟）

### Requirement: 数据馈送视图
数据馈送视图 SHALL 展示 DIA 的数据馈送列表。

#### Scenario: 数据馈送内容
- **GIVEN** 用户选择"数据馈送"标签
- **WHEN** 视图加载完成
- **THEN** 应显示：
  - 数据馈送表格（名称、类型、链、状态、置信度）
  - 数据源透明度信息

### Requirement: NFT 数据视图
NFT 视图 SHALL 展示 DIA 的 NFT 数据功能。

#### Scenario: NFT 视图内容
- **GIVEN** 用户选择"NFT 数据"标签
- **WHEN** 视图加载完成
- **THEN** 应显示：
  - NFT 集合列表
  - 地板价趋势
  - 按链分布统计

### Requirement: 质押视图
质押视图 SHALL 展示 DIA 的质押机制。

#### Scenario: 质押视图内容
- **GIVEN** 用户选择"质押"标签
- **WHEN** 视图加载完成
- **THEN** 应显示：
  - 质押统计（总质押量、APR、质押者数量）
  - 质押详情面板

### Requirement: Hook 重构
创建 `useDIAPage` hook 统一管理页面状态。

#### Scenario: Hook 功能
- **GIVEN** 页面使用 `useDIAPage` hook
- **WHEN** hook 初始化完成
- **THEN** 应提供：
  - 当前选中标签状态
  - 价格数据
  - 历史数据
  - 网络统计数据
  - 加载/错误状态
  - 刷新和导出功能

## MODIFIED Requirements

### Requirement: 现有 DIA 页面
**修改前**：使用 Tab 导航 + 动态统计卡片
**修改后**：使用侧边栏导航 + 固定 Hero 统计

## REMOVED Requirements

### Requirement: 动态统计切换
**原因**：改为固定统计卡片，提升信息密度
**迁移**：统计数据移至 Hero 区域固定展示

### Requirement: 复杂的 TabNavigation 组件
**原因**：改为侧边栏导航，与 Chainlink 保持一致
**迁移**：使用新的 DIASidebar 组件
