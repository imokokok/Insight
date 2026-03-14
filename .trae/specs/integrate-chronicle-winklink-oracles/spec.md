# Chronicle Labs 和 WINkLink 预言机完整集成 Spec

## Why
当前系统已支持 Chainlink、Band Protocol、UMA、Pyth、API3、RedStone、DIA 和 Tellar 等预言机。为了提供更全面的预言机数据覆盖，需要完整集成 Chronicle Labs 和 WINkLink 两个主流预言机服务，包括：
1. 后端预言机客户端实现
2. 前端专属页面展示
3. 专属特性面板组件

Chronicle Labs 是 MakerDAO 的原生预言机解决方案，以其高安全性和去中心化特性著称。WINkLink 是 TRON 生态系统的官方预言机，为 TRON 网络提供可靠的链下数据。

## What Changes

### 后端变更
- **新增 Chronicle Labs 预言机客户端** (`src/lib/oracles/chronicle.ts`)
- **新增 WINkLink 预言机客户端** (`src/lib/oracles/winklink.ts`)
- **扩展 OracleProvider 枚举** (`src/types/oracle/enums.ts`) - 添加 CHRONICLE 和 WINKLINK
- **更新工厂类** (`src/lib/oracles/factory.ts`) - 注册新的预言机客户端
- **更新配置** (`src/lib/config/oracles.tsx`) - 添加 Chronicle Labs 和 WINkLink 配置
- **更新模块导出** (`src/lib/oracles/index.ts`)

### 前端变更
- **新增 Chronicle Labs 专属页面** (`src/app/chronicle/page.tsx`)
- **新增 Chronicle Labs 页面内容组件** (`src/app/chronicle/ChroniclePageContent.tsx`)
- **新增 WINkLink 专属页面** (`src/app/winklink/page.tsx`)
- **新增 WINkLink 页面内容组件** (`src/app/winklink/WINkLinkPageContent.tsx`)
- **新增 Chronicle Labs 专属 Hook** (`src/hooks/useChronicleData.ts`)
- **新增 WINkLink 专属 Hook** (`src/hooks/useWINkLinkData.ts`)
- **更新导航配置** (`src/components/navigation/config.ts`) - 添加导航项
- **更新国际化文件** (`src/i18n/en.json`, `src/i18n/zh-CN.json`)

### Chronicle Labs 专属特性组件
- **Scuttlebutt 安全机制面板** (`src/components/oracle/panels/ChronicleScuttlebuttPanel.tsx`) - 展示 Chronicle 的 Scuttlebutt 安全协议
- **MakerDAO 集成面板** (`src/components/oracle/panels/ChronicleMakerDAOIntegrationPanel.tsx`) - 展示与 MakerDAO 的深度集成
- **去中心化验证者面板** (`src/components/oracle/panels/ChronicleValidatorPanel.tsx`) - 展示验证者网络和声誉系统

### WINkLink 专属特性组件
- **TRON 生态集成面板** (`src/components/oracle/panels/WINkLinkTRONEcosystemPanel.tsx`) - 展示 TRON 生态系统集成
- **节点质押面板** (`src/components/oracle/panels/WINkLinkStakingPanel.tsx`) - 展示节点质押和奖励机制
- **游戏与娱乐数据面板** (`src/components/oracle/panels/WINkLinkGamingDataPanel.tsx`) - 展示游戏和娱乐行业数据支持

## Impact
- Affected specs: 预言机类型定义、工厂模式、配置系统、前端路由、组件库
- Affected code: 
  - 后端: `src/types/oracle/enums.ts`, `src/lib/oracles/factory.ts`, `src/lib/config/oracles.tsx`, `src/lib/oracles/index.ts`, 新增 `chronicle.ts`, `winklink.ts`
  - 前端: 新增页面、组件、hooks

## ADDED Requirements

### Requirement: Chronicle Labs 预言机后端集成
系统 SHALL 提供 Chronicle Labs 预言机客户端，支持获取价格数据。

#### Scenario: 获取实时价格
- **WHEN** 用户请求 Chronicle Labs 预言机的某个资产价格
- **THEN** 系统返回包含价格、时间戳、置信度等信息的 PriceData

#### Scenario: 获取历史价格
- **WHEN** 用户请求 Chronicle Labs 预言机的历史价格数据
- **THEN** 系统返回指定时间段内的价格数组

#### Scenario: 支持的多链
- **GIVEN** Chronicle Labs 支持 Ethereum、Arbitrum、Optimism、Polygon、Base
- **WHEN** 用户指定链获取价格
- **THEN** 系统返回对应链的价格数据

#### Scenario: Chronicle Labs 专属数据
- **GIVEN** Chronicle Labs 提供 Scuttlebutt 安全机制、MakerDAO 集成、验证者网络数据
- **WHEN** 用户请求这些专属数据
- **THEN** 系统返回相应的模拟数据

### Requirement: WINkLink 预言机后端集成
系统 SHALL 提供 WINkLink 预言机客户端，支持获取价格数据。

#### Scenario: 获取实时价格
- **WHEN** 用户请求 WINkLink 预言机的某个资产价格
- **THEN** 系统返回包含价格、时间戳、置信度等信息的 PriceData

#### Scenario: 获取历史价格
- **WHEN** 用户请求 WINkLink 预言机的历史价格数据
- **THEN** 系统返回指定时间段内的价格数组

#### Scenario: 支持的多链
- **GIVEN** WINkLink 支持 TRON、BTTC (BitTorrent Chain)
- **WHEN** 用户指定链获取价格
- **THEN** 系统返回对应链的价格数据

#### Scenario: WINkLink 专属数据
- **GIVEN** WINkLink 提供 TRON 生态集成、节点质押、游戏娱乐数据支持
- **WHEN** 用户请求这些专属数据
- **THEN** 系统返回相应的模拟数据

### Requirement: Chronicle Labs 前端专属页面
系统 SHALL 提供 Chronicle Labs 的专属展示页面，包含其独特特性。

#### Scenario: 页面访问
- **WHEN** 用户访问 `/chronicle` 路由
- **THEN** 系统显示 Chronicle Labs 专属页面，包含市场数据、Scuttlebutt 安全、MakerDAO 集成等标签页

#### Scenario: Scuttlebutt 安全机制展示
- **WHEN** 用户查看 Scuttlebutt 标签页
- **THEN** 系统显示 Chronicle 的 Scuttlebutt 安全协议详情

#### Scenario: MakerDAO 集成展示
- **WHEN** 用户查看 MakerDAO 集成标签页
- **THEN** 系统显示与 MakerDAO 协议的深度集成信息

### Requirement: WINkLink 前端专属页面
系统 SHALL 提供 WINkLink 的专属展示页面，包含其独特特性。

#### Scenario: 页面访问
- **WHEN** 用户访问 `/winklink` 路由
- **THEN** 系统显示 WINkLink 专属页面，包含市场数据、TRON 生态、节点质押等标签页

#### Scenario: TRON 生态集成展示
- **WHEN** 用户查看 TRON 生态标签页
- **THEN** 系统显示 WINkLink 在 TRON 生态系统中的集成情况

#### Scenario: 节点质押展示
- **WHEN** 用户查看节点质押标签页
- **THEN** 系统显示节点质押机制和奖励数据
