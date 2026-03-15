# DIA 和 Tellor 预言机完整集成 Spec

## Why
当前系统已支持 Chainlink、Band Protocol、UMA、Pyth、API3 和 RedStone 等预言机。为了提供更全面的预言机数据覆盖，需要完整集成 DIA 和 Tellor 两个主流预言机服务，包括：
1. 后端预言机客户端实现
2. 前端专属页面展示
3. 专属特性面板组件

## What Changes

### 后端变更
- **新增 DIA 预言机客户端** (`src/lib/oracles/dia.ts`)
- **新增 Tellor 预言机客户端** (`src/lib/oracles/tellor.ts`)
- **扩展 OracleProvider 枚举** (`src/types/oracle/enums.ts`) - 添加 DIA 和 TELLOR
- **更新工厂类** (`src/lib/oracles/factory.ts`) - 注册新的预言机客户端
- **更新配置** (`src/lib/config/oracles.tsx`) - 添加 DIA 和 Tellor 配置
- **更新模块导出** (`src/lib/oracles/index.ts`)

### 前端变更
- **新增 DIA 专属页面** (`src/app/dia/page.tsx`)
- **新增 DIA 页面内容组件** (`src/app/dia/DIAPageContent.tsx`)
- **新增 Tellor 专属页面** (`src/app/tellor/page.tsx`)
- **新增 Tellor 页面内容组件** (`src/app/tellor/TellorPageContent.tsx`)
- **新增 DIA 专属 Hook** (`src/hooks/useDIAData.ts`)
- **新增 Tellor 专属 Hook** (`src/hooks/useTellorData.ts`)

### DIA 专属特性组件
- **数据透明度面板** (`src/components/oracle/panels/DIADataTransparencyPanel.tsx`)
- **跨链资产覆盖面板** (`src/components/oracle/panels/DIACrossChainCoveragePanel.tsx`)
- **数据源验证面板** (`src/components/oracle/panels/DIADataSourceVerificationPanel.tsx`)

### Tellor 专属特性组件
- **实时价格流面板** (`src/components/oracle/panels/TellorPriceStreamPanel.tsx`)
- **市场深度分析面板** (`src/components/oracle/panels/TellorMarketDepthPanel.tsx`)
- **多链聚合面板** (`src/components/oracle/panels/TellorMultiChainAggregationPanel.tsx`)

## Impact
- Affected specs: 预言机类型定义、工厂模式、配置系统、前端路由、组件库
- Affected code: 
  - 后端: `src/types/oracle/enums.ts`, `src/lib/oracles/factory.ts`, `src/lib/config/oracles.tsx`, `src/lib/oracles/index.ts`, 新增 `dia.ts`, `tellor.ts`
  - 前端: 新增页面、组件、hooks

## ADDED Requirements

### Requirement: DIA 预言机后端集成
系统 SHALL 提供 DIA 预言机客户端，支持获取价格数据。

#### Scenario: 获取实时价格
- **WHEN** 用户请求 DIA 预言机的某个资产价格
- **THEN** 系统返回包含价格、时间戳、置信度等信息的 PriceData

#### Scenario: 获取历史价格
- **WHEN** 用户请求 DIA 预言机的历史价格数据
- **THEN** 系统返回指定时间段内的价格数组

#### Scenario: 支持的多链
- **GIVEN** DIA 支持 Ethereum、Arbitrum、Polygon、Avalanche、BNB Chain、Base
- **WHEN** 用户指定链获取价格
- **THEN** 系统返回对应链的价格数据

#### Scenario: DIA 专属数据
- **GIVEN** DIA 提供数据源透明度、跨链资产覆盖、数据验证信息
- **WHEN** 用户请求这些专属数据
- **THEN** 系统返回相应的模拟数据

### Requirement: Tellor 预言机后端集成
系统 SHALL 提供 Tellor 预言机客户端，支持获取价格数据。

#### Scenario: 获取实时价格
- **WHEN** 用户请求 Tellor 预言机的某个资产价格
- **THEN** 系统返回包含价格、时间戳、置信度等信息的 PriceData

#### Scenario: 获取历史价格
- **WHEN** 用户请求 Tellor 预言机的历史价格数据
- **THEN** 系统返回指定时间段内的价格数组

#### Scenario: 支持的多链
- **GIVEN** Tellor 支持 Ethereum、Arbitrum、Optimism、Polygon、Base、Avalanche
- **WHEN** 用户指定链获取价格
- **THEN** 系统返回对应链的价格数据

#### Scenario: Tellor 专属数据
- **GIVEN** Tellor 提供实时价格流、市场深度、多链聚合数据
- **WHEN** 用户请求这些专属数据
- **THEN** 系统返回相应的模拟数据

### Requirement: DIA 前端专属页面
系统 SHALL 提供 DIA 的专属展示页面，包含其独特特性。

#### Scenario: 页面访问
- **WHEN** 用户访问 `/dia` 路由
- **THEN** 系统显示 DIA 专属页面，包含市场数据、网络健康、数据透明度等标签页

#### Scenario: 数据透明度展示
- **WHEN** 用户查看数据透明度标签页
- **THEN** 系统显示 DIA 的数据源透明度和验证信息

#### Scenario: 跨链资产覆盖展示
- **WHEN** 用户查看跨链覆盖标签页
- **THEN** 系统显示 DIA 支持的跨链资产和覆盖范围

### Requirement: Tellor 前端专属页面
系统 SHALL 提供 Tellor 的专属展示页面，包含其独特特性。

#### Scenario: 页面访问
- **WHEN** 用户访问 `/tellor` 路由
- **THEN** 系统显示 Tellor 专属页面，包含市场数据、实时价格流、市场深度等标签页

#### Scenario: 实时价格流展示
- **WHEN** 用户查看实时价格流标签页
- **THEN** 系统显示 Tellor 的实时价格更新流

#### Scenario: 市场深度分析展示
- **WHEN** 用户查看市场深度标签页
- **THEN** 系统显示 Tellor 的市场深度分析数据
