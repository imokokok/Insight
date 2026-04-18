# 项目代码架构修复 Spec

## Why

项目存在多处架构问题：Oracle 类型导出循环依赖风险、API 路由中间件使用不一致、大量重复代码、Store 过度拆分、环境配置冗余、接口与实现脱节等。这些问题会导致维护困难、bundle 体积膨胀、代码不一致和潜在运行时错误。

## What Changes

- 移除 `@/lib/oracles/index.ts` 中的 `export * from '@/types/oracle'`，统一类型导入路径为 `@/types/oracle`
- 将所有手动中间件模式的 API 路由迁移到 `createApiHandler` 声明式模式
- 消除 `PriceQueryContent.tsx` 中重复的 on-chain 数据获取逻辑，抽取 `useAllOnChainData` hook
- 合并 cross-chain 的 4 个 Zustand Store 为 2 个（数据 Store + UI Store）
- 重构 `BaseOracleClient.getHistoricalPrices`，移除对 `binanceMarketService` 的硬编码依赖
- 合并 `env.ts` 和 `serverEnv.ts` 为统一的环境配置模块
- 清理未使用的接口、Repository 类、CRUD handler 辅助函数
- 修复 `lib/errors/index.ts` 中未导出的类型守卫函数
- 添加 `src/stores/index.ts` 和 `src/providers/index.ts` barrel 文件

## Impact

- Affected specs: Oracle 数据获取、API 路由处理、状态管理、环境配置、错误处理
- Affected code:
  - `src/lib/oracles/index.ts` - 移除类型重导出
  - `src/app/api/favorites/[id]/route.ts` - 迁移到 createApiHandler
  - `src/app/api/alerts/route.ts` - 迁移到 createApiHandler
  - `src/app/api/alerts/[id]/route.ts` - 迁移到 createApiHandler
  - `src/app/api/alerts/batch/route.ts` - 迁移到 createApiHandler
  - `src/app/api/alerts/events/[id]/route.ts` - 迁移到 createApiHandler
  - `src/app/api/auth/callback/route.ts` - 迁移到 createApiHandler
  - `src/app/api/auth/profile/route.ts` - 迁移到 createApiHandler
  - `src/app/api/auth/delete-account/route.ts` - 迁移到 createApiHandler
  - `src/app/price-query/PriceQueryContent.tsx` - 抽取 hook
  - `src/stores/crossChain*.ts` - 合并 Store
  - `src/lib/oracles/base.ts` - 移除硬编码依赖
  - `src/lib/config/env.ts` + `serverEnv.ts` - 合并
  - `src/lib/errors/index.ts` - 修复导出
  - `src/lib/api/handler.ts` - 清理冗余函数
  - `src/lib/oracles/interfaces.ts` - 清理未使用接口
  - `src/lib/oracles/OracleRepository.ts` - 清理

## ADDED Requirements

### Requirement: 统一 Oracle 类型导入路径

系统 SHALL 仅通过 `@/types/oracle` 导入 Oracle 相关类型（OracleProvider、Blockchain 等），`@/lib/oracles/index.ts` SHALL NOT 重新导出 `@/types/oracle` 中的任何内容。

#### Scenario: 类型导入路径统一

- **WHEN** 开发者需要导入 OracleProvider 或 Blockchain 类型
- **THEN** 只能从 `@/types/oracle` 导入，`@/lib/oracles` 不再提供类型重导出

### Requirement: API 路由统一使用 createApiHandler

系统 SHALL 通过 `createApiHandler` 声明式中间件模式处理所有 API 路由，SHALL NOT 在路由处理函数中手动调用 rateLimit、auth、validation 等中间件。

#### Scenario: API 路由中间件统一

- **WHEN** 创建或修改 API 路由
- **THEN** 必须使用 `createApiHandler` 配置中间件，而非手动调用中间件函数

### Requirement: On-Chain 数据获取逻辑去重

系统 SHALL 通过 `useAllOnChainData` hook 统一获取所有 Oracle 提供商的 on-chain 数据，SHALL NOT 在组件中为每个提供商重复编写数据获取逻辑。

#### Scenario: On-chain 数据获取统一

- **WHEN** 组件需要获取多个 Oracle 提供商的 on-chain 数据
- **THEN** 使用 `useAllOnChainData` hook 一次性获取，返回 `Record<OracleProvider, OnChainData>` 结构

### Requirement: Cross-Chain Store 合并

系统 SHALL 将 4 个 cross-chain Zustand Store 合并为 2 个：`useCrossChainDataStore`（数据+配置）和 `useCrossChainUIStore`（UI 状态），SHALL NOT 保留无意义的 persist 配置。

#### Scenario: Store 合并

- **WHEN** cross-chain 功能需要访问状态
- **THEN** 从 2 个 Store 中获取，而非 4 个

### Requirement: BaseOracleClient 历史数据获取解耦

系统 SHALL 将 `BaseOracleClient.getHistoricalPrices` 中的 `binanceMarketService` 硬编码依赖移除，改为可注入的历史数据服务。

#### Scenario: 历史数据服务注入

- **WHEN** Oracle 客户端需要获取历史价格数据
- **THEN** 通过可配置的历史数据服务获取，默认使用 Binance 但可被子类覆盖

### Requirement: 环境配置统一

系统 SHALL 将 `env.ts` 和 `serverEnv.ts` 合并为统一的环境配置模块，明确区分 client-only / server-only / shared 配置。

#### Scenario: 环境配置合并

- **WHEN** 代码需要访问环境变量
- **THEN** 从统一的配置模块导入，模块内部自动区分客户端和服务端

### Requirement: 错误处理工具函数导出

系统 SHALL 导出 `lib/errors/index.ts` 中已定义但未导出的类型守卫函数（`isValidationError`、`isNotFoundError` 等）。

#### Scenario: 类型守卫可用

- **WHEN** 外部代码需要判断错误类型
- **THEN** 可以从 `@/lib/errors` 导入并使用类型守卫函数

### Requirement: 清理冗余代码

系统 SHALL 移除以下冗余代码：

- `IOracleClientFactory` 接口（未被实现）
- `OracleRepository` 静态类（无附加价值的转发层）
- `createGetHandler`/`createPostHandler`/`createPutHandler`/`createPatchHandler`/`createDeleteHandler` 辅助函数（与 `createApiHandler` 完全等价）
- `createCrudHandlers` 函数（未被使用）
- `BaseOracleClient` 中标记为 `@deprecated` 的 `fetchPriceWithDatabase` 和 `fetchHistoricalPricesWithDatabase` 方法

#### Scenario: 冗余代码清理

- **WHEN** 代码库中存在未被使用或无附加价值的抽象
- **THEN** 这些抽象 SHALL 被移除，调用方 SHALL 直接使用底层实现

## MODIFIED Requirements

### Requirement: Stores 目录统一导出

`src/stores/` 目录 SHALL 提供 `index.ts` barrel 文件，统一导出所有 store hooks。

### Requirement: Providers 目录统一导出

`src/providers/` 目录 SHALL 提供 `index.ts` barrel 文件，统一导出所有 provider 组件。

## REMOVED Requirements

### Requirement: Cross-Chain 4 Store 架构

**Reason**: 过度拆分导致隐式依赖难以追踪，persist 配置无意义
**Migration**: 合并为 2 个 Store（数据+配置 / UI）

### Requirement: 双环境配置文件

**Reason**: `env.ts` 和 `serverEnv.ts` 职责重叠，验证逻辑不一致
**Migration**: 合并为统一模块
