# 预言机前端显示和功能更新 Spec

## Why
项目已经集成了多个预言机（Chainlink、Band Protocol、UMA、Pyth、API3、RedStone、DIA、Tellar、Chronicle、WINkLink），但前端显示和功能使用需要进一步更新和完善，以确保：
1. 所有预言机在前端正确显示
2. 各个预言机的专属功能面板完整实现
3. 跨预言机比较功能支持所有预言机
4. 用户体验保持一致性和完整性

## What Changes

### 新增组件
- **Chronicle Scuttlebutt 安全面板** (`src/components/oracle/panels/ChronicleScuttlebuttPanel.tsx`) - 展示 Chronicle 的 Scuttlebutt 安全协议
- **Chronicle MakerDAO 集成面板** (`src/components/oracle/panels/ChronicleMakerDAOIntegrationPanel.tsx`) - 展示与 MakerDAO 的深度集成
- **Chronicle 验证者面板** (`src/components/oracle/panels/ChronicleValidatorPanel.tsx`) - 展示验证者网络和声誉系统
- **WINkLink TRON 生态面板** (`src/components/oracle/panels/WINkLinkTRONEcosystemPanel.tsx`) - 展示 TRON 生态系统集成
- **WINkLink 节点质押面板** (`src/components/oracle/panels/WINkLinkStakingPanel.tsx`) - 展示节点质押和奖励机制
- **WINkLink 游戏数据面板** (`src/components/oracle/panels/WINkLinkGamingDataPanel.tsx`) - 展示游戏和娱乐行业数据支持

### 更新现有组件
- **更新 Chronicle 页面内容组件** - 使用新的专属面板组件替代内联代码
- **更新 WINkLink 页面内容组件** - 使用新的专属面板组件替代内联代码
- **更新跨预言机比较页面** - 确保支持所有 10 个预言机
- **更新价格查询页面** - 确保支持所有预言机选择

### 功能增强
- **统一面板组件接口** - 确保所有预言机面板组件遵循统一的接口规范
- **完善国际化翻译** - 补充缺失的翻译 key
- **优化响应式设计** - 确保所有面板在移动端和桌面端都有良好的显示效果

## Impact
- Affected specs: 预言机面板组件、页面内容组件、跨预言机比较功能
- Affected code:
  - 新增: `src/components/oracle/panels/Chronicle*.tsx`, `src/components/oracle/panels/WINkLink*.tsx`
  - 修改: `src/app/chronicle/ChroniclePageContent.tsx`, `src/app/winklink/WINkLinkPageContent.tsx`
  - 修改: `src/app/cross-oracle/page.tsx`, `src/app/price-query/page.tsx`

## ADDED Requirements

### Requirement: Chronicle Labs 专属面板组件
系统 SHALL 提供 Chronicle Labs 的专属面板组件，展示其独特特性。

#### Scenario: Scuttlebutt 安全面板
- **WHEN** 用户查看 Scuttlebutt 标签页
- **THEN** 系统显示 ChronicleScuttlebuttPanel 组件，展示 Scuttlebutt 安全协议详情

#### Scenario: MakerDAO 集成面板
- **WHEN** 用户查看 MakerDAO 集成标签页
- **THEN** 系统显示 ChronicleMakerDAOIntegrationPanel 组件，展示与 MakerDAO 协议的深度集成信息

#### Scenario: 验证者面板
- **WHEN** 用户查看验证者标签页
- **THEN** 系统显示 ChronicleValidatorPanel 组件，展示验证者网络拓扑和声誉分数

### Requirement: WINkLink 专属面板组件
系统 SHALL 提供 WINkLink 的专属面板组件，展示其独特特性。

#### Scenario: TRON 生态面板
- **WHEN** 用户查看 TRON 生态标签页
- **THEN** 系统显示 WINkLinkTRONEcosystemPanel 组件，展示 TRON 生态系统集成情况

#### Scenario: 节点质押面板
- **WHEN** 用户查看节点质押标签页
- **THEN** 系统显示 WINkLinkStakingPanel 组件，展示节点质押机制和奖励数据

#### Scenario: 游戏数据面板
- **WHEN** 用户查看游戏数据标签页
- **THEN** 系统显示 WINkLinkGamingDataPanel 组件，展示游戏行业数据支持

### Requirement: 跨预言机比较功能更新
系统 SHALL 支持所有 10 个预言机的跨预言机比较功能。

#### Scenario: 比较页面支持所有预言机
- **GIVEN** 系统已集成 10 个预言机
- **WHEN** 用户访问跨预言机比较页面
- **THEN** 系统显示所有 10 个预言机的比较选项

#### Scenario: 价格查询支持所有预言机
- **GIVEN** 系统已集成 10 个预言机
- **WHEN** 用户访问价格查询页面
- **THEN** 系统允许用户选择任意预言机进行价格查询

## MODIFIED Requirements

### Requirement: Chronicle 页面内容组件
**修改内容**: 将内联的面板实现替换为独立的 ChronicleScuttlebuttPanel、ChronicleMakerDAOIntegrationPanel、ChronicleValidatorPanel 组件

### Requirement: WINkLink 页面内容组件
**修改内容**: 将内联的面板实现替换为独立的 WINkLinkTRONEcosystemPanel、WINkLinkStakingPanel、WINkLinkGamingDataPanel 组件
