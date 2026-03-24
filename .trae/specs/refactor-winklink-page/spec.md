# WINkLink页面重构规范

## Why
当前WINkLink页面使用传统的Tab导航布局，信息密度较低，用户体验不够专业。需要参考Chainlink页面的侧边栏导航布局，提升数据密度，减少不必要信息，充分展示WINkLink作为TRON生态预言机的独特特性。

## What Changes
- **重构页面布局**：从Tab导航改为侧边栏导航布局（参考Chainlink页面）
- **提升数据密度**：紧凑的卡片设计，减少留白
- **优化导航结构**：侧边栏菜单包含：市场数据、网络健康、TRON生态、节点质押、游戏数据、风险评估、跨预言机对比
- **新增视图组件**：
  - WINkLinkMarketView - 市场数据视图
  - WINkLinkNetworkView - 网络健康视图
  - WINkLinkTRONView - TRON生态集成视图
  - WINkLinkStakingView - 节点质押视图
  - WINkLinkGamingView - 游戏数据视图
  - WINkLinkRiskView - 风险评估视图
- **新增Hook**：useWinklinkPage - 统一管理页面状态和逻辑
- **新增类型定义**：WinklinkTabId和相关接口
- **更新配置**：扩展oracleConfigs中的WINkLink配置

## Impact
- 受影响文件：
  - `src/app/[locale]/winklink/page.tsx` - 主页面重构
  - `src/app/[locale]/winklink/components/` - 新增组件目录
  - `src/app/[locale]/winklink/hooks/` - 新增hook目录
  - `src/app/[locale]/winklink/types.ts` - 新增类型定义
  - `src/hooks/useWINkLinkData.ts` - 可能需要的调整
  - `src/lib/config/oracles.tsx` - 更新WINkLink配置

## ADDED Requirements

### Requirement: 页面布局重构
The system SHALL provide a sidebar-based navigation layout for the WINkLink page, consistent with the Chainlink page design.

#### Scenario: 页面加载
- **GIVEN** 用户访问WINkLink页面
- **WHEN** 页面加载完成
- **THEN** 显示侧边栏导航 + 主内容区的布局
- **AND** 侧边栏包含所有功能菜单项

### Requirement: 侧边栏导航
The system SHALL provide a sidebar with navigation items for all WINkLink features.

#### Scenario: 导航切换
- **GIVEN** 侧边栏导航显示
- **WHEN** 用户点击不同菜单项
- **THEN** 主内容区切换到对应视图
- **AND** 当前选中项高亮显示

### Requirement: Hero区域
The system SHALL display a hero section with key metrics and price information.

#### Scenario: 显示关键指标
- **GIVEN** 页面加载完成
- **THEN** Hero区域显示：
  - WINkLink名称和Logo
  - 实时价格
  - 24小时涨跌幅
  - 刷新和导出按钮
  - 4个关键统计卡片（活跃节点、TRON集成、质押APR、网络正常运行时间）

### Requirement: 市场数据视图 (WINkLinkMarketView)
The system SHALL display comprehensive market data in a compact layout.

#### Scenario: 查看市场数据
- **GIVEN** 用户选择"市场数据"菜单
- **THEN** 显示：
  - 价格趋势图表（左侧大卡片）
  - 快速统计（市值、24h交易量、流通供应量、质押APR）
  - 网络状态概览
  - 数据源状态

### Requirement: 网络健康视图 (WINkLinkNetworkView)
The system SHALL display network health metrics with high data density.

#### Scenario: 查看网络健康
- **GIVEN** 用户选择"网络健康"菜单
- **THEN** 显示：
  - 4个关键指标卡片（活跃节点、数据喂价、响应时间、正常运行时间）
  - 网络健康面板
  - 每小时活动图表
  - 性能指标（成功率、可用性、延迟）

### Requirement: TRON生态视图 (WINkLinkTRONView)
The system SHALL display TRON ecosystem integration data, a unique feature of WINkLink.

#### Scenario: 查看TRON生态
- **GIVEN** 用户选择"TRON生态"菜单
- **THEN** 显示：
  - TRON网络统计（TPS、区块高度、总账户数）
  - 集成的DApp列表（带分类筛选）
  - 总锁仓价值(TVL)
  - 集成覆盖率

### Requirement: 节点质押视图 (WINkLinkStakingView)
The system SHALL display node staking information with tier details.

#### Scenario: 查看质押数据
- **GIVEN** 用户选择"节点质押"菜单
- **THEN** 显示：
  - 质押概览（总质押量、节点数、平均APR）
  - 质押等级分布
  - 节点列表（带排序功能）

### Requirement: 游戏数据视图 (WINkLinkGamingView)
The system SHALL display gaming-related data, highlighting WINkLink's gaming focus.

#### Scenario: 查看游戏数据
- **GIVEN** 用户选择"游戏数据"菜单
- **THEN** 显示：
  - 游戏总量统计
  - 随机数服务状态
  - 游戏数据源列表
  - VRF使用案例

### Requirement: 风险评估视图 (WINkLinkRiskView)
The system SHALL display risk assessment metrics.

#### Scenario: 查看风险评估
- **GIVEN** 用户选择"风险评估"菜单
- **THEN** 显示：
  - 整体风险评分
  - 各项风险指标（去中心化、数据质量、正常运行时间）
  - 风险趋势图表

### Requirement: 跨预言机对比
The system SHALL provide cross-oracle comparison functionality.

#### Scenario: 对比其他预言机
- **GIVEN** 用户选择"跨预言机对比"菜单
- **THEN** 显示CrossOracleComparison组件

## MODIFIED Requirements

### Requirement: 数据Hook
The existing useWINkLinkAllData hook SHALL continue to work with the new layout.

#### Scenario: 数据获取
- **GIVEN** 新页面布局
- **WHEN** 组件需要数据
- **THEN** useWINkLinkAllData提供所需数据
- **AND** 包含lastUpdated时间戳

## REMOVED Requirements

### Requirement: 旧版Tab导航
**Reason**: 被侧边栏导航替代
**Migration**: 删除TabNavigation组件的使用，改用侧边栏

### Requirement: 分散的面板组件
**Reason**: 整合到统一的视图组件中
**Migration**: 将WINkLinkTRONEcosystemPanel等面板整合到对应的View组件中
