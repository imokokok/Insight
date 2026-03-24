# Chronicle 页面重构规范

## Why
Chronicle 页面当前使用传统的 Tab 导航布局，信息展示较为分散，数据密度较低。为了提升用户体验和信息展示效率，需要将 Chronicle 页面重构为类似 Chainlink 页面的侧边栏导航布局，减少不必要的信息展示，提升数据密度，并充分展示 Chronicle 作为 MakerDAO 原生预言机的独特特性。

## What Changes
- **布局重构**: 从 Tab 导航改为侧边栏导航布局（类似 Chainlink 页面）
- **Hero 区域**: 添加实时状态栏、价格展示、快捷操作按钮
- **统计卡片**: 优化为更紧凑的 4 列网格布局
- **内容区域**: 采用左侧边栏 + 右侧内容区的两栏布局
- **视图组件化**: 将各个 Tab 内容拆分为独立的 View 组件
- **减少冗余**: 移除重复信息，提升数据密度
- **响应式设计**: 优化移动端体验，添加移动端菜单

## Impact
- 受影响文件:
  - `src/app/[locale]/chronicle/page.tsx` - 主页面重构
  - 新增 `src/app/[locale]/chronicle/types.ts` - 类型定义
  - 新增 `src/app/[locale]/chronicle/hooks/useChroniclePage.ts` - 页面逻辑 Hook
  - 新增 `src/app/[locale]/chronicle/components/ChronicleSidebar.tsx` - 侧边栏组件
  - 新增 `src/app/[locale]/chronicle/components/ChronicleMarketView.tsx` - 市场数据视图
  - 新增 `src/app/[locale]/chronicle/components/ChronicleNetworkView.tsx` - 网络视图
  - 新增 `src/app/[locale]/chronicle/components/ChronicleValidatorsView.tsx` - 验证者视图
  - 新增 `src/app/[locale]/chronicle/components/ChronicleMakerDAOView.tsx` - MakerDAO 集成视图
  - 新增 `src/app/[locale]/chronicle/components/ChronicleScuttlebuttView.tsx` - Scuttlebutt 安全视图
  - 新增 `src/app/[locale]/chronicle/components/ChronicleRiskView.tsx` - 风险评估视图
  - 新增 `src/app/[locale]/chronicle/components/index.ts` - 组件导出

## ADDED Requirements

### Requirement: 页面布局重构
The system SHALL provide a sidebar-based navigation layout for Chronicle page similar to Chainlink page.

#### Scenario: 桌面端布局
- **GIVEN** 用户在桌面端访问 Chronicle 页面
- **WHEN** 页面加载完成
- **THEN** 显示 Hero 区域（包含状态栏、标题、价格、操作按钮、统计卡片）
- **AND** 下方显示左侧边栏导航 + 右侧内容区域的两栏布局

#### Scenario: 移动端布局
- **GIVEN** 用户在移动端访问 Chronicle 页面
- **WHEN** 页面加载完成
- **THEN** 显示 Hero 区域
- **AND** 显示移动端菜单按钮
- **AND** 点击菜单按钮展开侧边栏导航抽屉

### Requirement: Hero 区域
The system SHALL display a comprehensive hero section with live status, price, and actions.

#### Scenario: Hero 区域展示
- **GIVEN** Chronicle 页面加载
- **WHEN** 数据获取完成
- **THEN** 显示 LiveStatusBar 组件展示连接状态和延迟
- **AND** 显示 Chronicle Logo 和标题
- **AND** 显示当前价格和 24h 涨跌幅
- **AND** 显示刷新和导出按钮
- **AND** 显示 4 个关键统计指标（验证者数量、MakerDAO 支持资产、质押 APR、网络正常运行时间）

### Requirement: 侧边栏导航
The system SHALL provide a sidebar navigation with Chronicle-specific menu items.

#### Scenario: 导航菜单展示
- **GIVEN** 侧边栏导航组件渲染
- **WHEN** 用户查看导航菜单
- **THEN** 显示以下菜单项：
  - 市场数据 (Market Data)
  - 网络健康 (Network Health)
  - 验证者 (Validators)
  - MakerDAO 集成 (MakerDAO Integration)
  - Scuttlebutt 安全 (Scuttlebutt Security)
  - 跨预言机对比 (Cross-Oracle Comparison)
  - 风险评估 (Risk Assessment)

#### Scenario: 导航切换
- **GIVEN** 用户点击侧边栏菜单项
- **WHEN** 菜单项被点击
- **THEN** 高亮当前选中的菜单项
- **AND** 右侧内容区域切换到对应的视图

### Requirement: 视图组件
The system SHALL provide dedicated view components for each tab content.

#### Scenario: Market View
- **GIVEN** 用户选择"市场数据"菜单
- **WHEN** 视图渲染
- **THEN** 显示价格趋势图表（占 2/3 宽度）
- **AND** 显示快速统计数据（市值、24h 交易量、流通供应量、质押 APR）
- **AND** 显示网络状态指标
- **AND** 显示数据源状态

#### Scenario: Network View
- **GIVEN** 用户选择"网络健康"菜单
- **WHEN** 视图渲染
- **THEN** 显示网络统计卡片（验证者数量、数据喂价数量、响应时间、成功率）
- **AND** 显示网络活动图表
- **AND** 显示实时网络指标

#### Scenario: Validators View
- **GIVEN** 用户选择"验证者"菜单
- **WHEN** 视图渲染
- **THEN** 显示验证者列表表格
- **AND** 支持按声誉分数、质押金额排序
- **AND** 显示验证者状态指示器

#### Scenario: MakerDAO View
- **GIVEN** 用户选择"MakerDAO 集成"菜单
- **WHEN** 视图渲染
- **THEN** 显示支持的资产列表
- **AND** 显示每个资产的抵押率、债务上限、稳定费
- **AND** 显示系统总锁仓价值和 DAI 供应量

#### Scenario: Scuttlebutt View
- **GIVEN** 用户选择"Scuttlebutt 安全"菜单
- **WHEN** 视图渲染
- **THEN** 显示安全等级和验证状态
- **AND** 显示安全特性列表
- **AND** 显示历史安全事件时间线

#### Scenario: Risk View
- **GIVEN** 用户选择"风险评估"菜单
- **WHEN** 视图渲染
- **THEN** 显示风险评估指标
- **AND** 显示风险因素分析

### Requirement: 数据展示优化
The system SHALL optimize data presentation for higher information density.

#### Scenario: 紧凑统计展示
- **GIVEN** 统计数据展示
- **WHEN** 组件渲染
- **THEN** 使用紧凑的网格布局
- **AND** 减少不必要的间距和装饰
- **AND** 突出关键数值

#### Scenario: 图表优化
- **GIVEN** 价格趋势图表展示
- **WHEN** 图表渲染
- **THEN** 使用合适的高度（300px）
- **AND** 显示工具栏
- **AND** 支持交互操作

## MODIFIED Requirements

### Requirement: 现有 Chronicle 页面
**Current**: 使用 TabNavigation 组件，顶部 Tab 切换，内容区域下方展示
**Modified**: 使用侧边栏导航，Hero 区域 + 两栏布局

### Requirement: 统计卡片展示
**Current**: 4 列网格，每个卡片包含图标、标题、数值、变化
**Modified**: 保持 4 列，但布局更紧凑，集成到 Hero 区域下方

### Requirement: 内容组织
**Current**: 所有内容在 page.tsx 中通过条件渲染
**Modified**: 每个 Tab 内容拆分为独立的 View 组件

## REMOVED Requirements

### Requirement: TabNavigation 组件使用
**Reason**: 改为侧边栏导航布局
**Migration**: 使用新的 ChronicleSidebar 组件替代

### Requirement: 原有的面板组件直接导入
**Reason**: 面板组件将整合到新的 View 组件中
**Migration**: 在 View 组件中导入和使用面板组件
