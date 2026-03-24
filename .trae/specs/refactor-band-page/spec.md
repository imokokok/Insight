# Band Protocol 页面重构规范

## Why
当前 Band Protocol 页面使用通用的 `OraclePageTemplate` 组件，缺乏针对 Band Protocol 独特特性的展示。Band Protocol 作为基于 Cosmos SDK 构建的跨链数据预言机平台，具有验证者治理、跨链互操作性、Cosmos 生态系统集成等独特特性，需要专门的页面布局来充分展示这些特性。

参考 Chainlink 页面的成功实践，我们需要：
1. 减少不必要的信息展示，提升数据密度
2. 创建专门的侧边栏导航，针对不同特性提供独立视图
3. 突出 Band Protocol 的核心差异化特性：验证者系统、跨链支持、Cosmos 生态

## What Changes
- **重构 Band Protocol 页面结构**：从通用模板迁移到类似 Chainlink 的专用页面架构
- **创建专用组件**：Sidebar、MarketView、NetworkView、ValidatorsView、CrossChainView、DataFeedsView、StakingView、EcosystemView、RiskView
- **创建专用 Hook**：`useBandProtocolPage` 管理页面状态和数据获取
- **精简 Tab 数量**：从 9 个 Tab 精简到 6 个核心 Tab，移除冗余内容
- **提升数据密度**：采用紧凑布局，减少留白，增加信息展示

## Impact
- **受影响文件**：
  - `src/app/[locale]/band-protocol/page.tsx` - 完全重构
  - `src/lib/config/oracles.tsx` - 更新 tabs 配置
  - 新增 `src/app/[locale]/band-protocol/components/` 目录
  - 新增 `src/app/[locale]/band-protocol/hooks/` 目录
  - 新增 `src/app/[locale]/band-protocol/types.ts`

## ADDED Requirements

### Requirement: Band Protocol 专用页面架构
The system SHALL provide a dedicated Band Protocol page with Chainlink-style layout.

#### Scenario: 页面整体布局
- **GIVEN** 用户访问 Band Protocol 页面
- **WHEN** 页面加载完成
- **THEN** 显示 Hero 区域（包含价格、统计概览、刷新/导出按钮）
- **AND** 显示左侧边栏导航（桌面端）
- **AND** 显示主内容区域（根据选中 Tab 展示不同内容）

#### Scenario: 侧边栏导航
- **GIVEN** 用户在 Band Protocol 页面
- **WHEN** 查看侧边栏
- **THEN** 显示以下导航项：
  - 市场数据 (market)
  - 网络健康 (network)
  - 验证者 (validators) - Band 特有
  - 跨链数据 (cross-chain) - Band 特有
  - 数据源 (data-feeds)
  - 风险评估 (risk)

#### Scenario: 市场数据视图
- **GIVEN** 用户选中"市场数据" Tab
- **WHEN** 视图渲染
- **THEN** 显示价格走势图
- **AND** 显示快速统计（市值、24h 交易量、流通供应量、质押 APR）
- **AND** 显示网络状态概览
- **AND** 显示数据源状态

#### Scenario: 验证者视图
- **GIVEN** 用户选中"验证者" Tab
- **WHEN** 视图渲染
- **THEN** 显示验证者列表（包含佣金率、正常运行时间、质押量）
- **AND** 显示验证者统计概览
- **AND** 支持排序和筛选

#### Scenario: 跨链数据视图
- **GIVEN** 用户选中"跨链数据" Tab
- **WHEN** 视图渲染
- **THEN** 显示支持的链列表（Cosmos Hub、Osmosis、Ethereum 等）
- **AND** 显示各链的请求统计
- **AND** 显示跨链价格一致性分析

## MODIFIED Requirements

### Requirement: Oracle 配置更新
**Current**: Band Protocol 配置包含 9 个 tabs
**Modified**: 精简为 6 个核心 tabs：market、network、validators、cross-chain、data-feeds、risk

### Requirement: 数据获取 Hook
**Current**: 使用通用模板的数据获取逻辑
**Modified**: 创建专用 `useBandProtocolPage` hook，集成 BandProtocolClient 的方法

## REMOVED Requirements

### Requirement: 冗余 Tab 页面
**Reason**: 提升用户体验，减少信息过载
**Removed Tabs**:
- staking - 合并到 validators 视图
- ecosystem - 内容较泛，移除
- cross-oracle - 跨预言机对比有专门页面

## 设计规范

### 布局规范
- Hero 区域：白色背景，底部边框，包含 Logo、价格、统计卡片
- 侧边栏：固定宽度 256px，白色背景，圆角 8px
- 内容区域：自适应宽度，与侧边栏间距 24px
- 统计卡片：4 列网格，紧凑内边距

### 颜色规范
- 主题色：紫色 (purple-600)
- 成功色：emerald-600
- 警告色：amber-500
- 背景色：insight (gray-50)

### 数据密度规范
- 卡片内边距：16px (p-4)
- 统计数值：大号字体 (text-2xl)
- 标签：小号灰色字体 (text-xs text-gray-500)
- 间距：紧凑的 gap-4
