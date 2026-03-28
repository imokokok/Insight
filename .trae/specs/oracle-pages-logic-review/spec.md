# 十个预言机单独页面功能代码逻辑问题分析 Spec

## Why

用户请求检查十个预言机（Chainlink, Pyth, API3, UMA, Tellor, Chronicle, DIA, RedStone, BandProtocol, WINkLink）单独页面功能的代码逻辑，发现存在多个架构不一致、潜在 bug 和代码质量问题，需要系统性地记录并修复这些问题。

## What Changes

- 统一数据获取模式，使用一致的 hooks 架构
- 移除硬编码的模拟数据，改为真实 API 调用
- 统一 lastUpdated 计算方式
- 统一错误处理机制
- 修复类型安全问题
- 清理未使用的变量和导入
- 统一 refetchAll 实现方式
- 修复条件渲染逻辑
- 提取共享的移动端菜单状态管理逻辑
- 验证翻译键完整性
- 修复组件 isLoading 传递问题
- 修复重复的客户端实例问题
- 统一类型定义

## Impact

- Affected specs: 所有预言机单独页面功能
- Affected code:
  - `src/app/[locale]/chainlink/` 目录下的所有文件
  - `src/app/[locale]/pyth/` 目录下的所有文件
  - `src/app/[locale]/api3/` 目录下的所有文件
  - `src/app/[locale]/uma/` 目录下的所有文件
  - `src/app/[locale]/tellor/` 目录下的所有文件
  - `src/app/[locale]/chronicle/` 目录下的所有文件
  - `src/app/[locale]/dia/` 目录下的所有文件
  - `src/app/[locale]/redstone/` 目录下的所有文件
  - `src/app/[locale]/band-protocol/` 目录下的所有文件
  - `src/app/[locale]/winklink/` 目录下的所有文件
  - `src/hooks/oracles/` 目录下的所有文件

## ADDED Requirements

### Requirement: 数据获取模式一致性

系统 SHALL 使用统一的数据获取模式，所有预言机页面应使用相同的 hooks 架构。

#### Scenario: 开发者添加新的预言机页面

- **WHEN** 开发者需要添加新的预言机页面
- **THEN** 系统应提供统一的数据获取 hooks 模式
- **AND** 新页面应遵循与现有页面相同的架构

### Requirement: 真实数据获取

系统 SHALL 从真实 API 获取数据，而非使用硬编码的模拟数据。

#### Scenario: 用户查看预言机网络状态

- **WHEN** 用户访问预言机页面的网络视图
- **THEN** 系统应从真实 API 获取网络统计数据
- **AND** 数据应反映预言机的真实状态

### Requirement: lastUpdated 计算统一

系统 SHALL 使用统一的方式计算最后更新时间。

#### Scenario: 用户查看数据更新时间

- **WHEN** 用户查看预言机页面的最后更新时间
- **THEN** 系统应使用一致的计算方式
- **AND** 时间应准确反映数据的最后更新时刻

### Requirement: 错误处理统一

系统 SHALL 使用统一的错误处理机制。

#### Scenario: API 请求失败

- **WHEN** 预言机 API 请求失败
- **THEN** 系统应使用统一的错误处理流程
- **AND** 用户应看到一致的错误提示

### Requirement: 条件渲染逻辑正确

系统 SHALL 正确处理加载状态和错误状态的渲染逻辑。

#### Scenario: 价格数据加载失败但其他数据仍在加载

- **WHEN** 价格数据加载失败但网络数据仍在加载
- **THEN** 系统应显示适当的加载状态
- **AND** 不应直接跳转到错误页面

## 发现的问题详情

### 问题 1: 数据获取模式不一致（高优先级）

**位置**: 各预言机的 hooks 文件
**描述**:

- Chainlink, Pyth, API3, Tellor, WINkLink: 使用 `use*AllData` hooks
- UMA, BandProtocol: 使用手动的 `useState` + `useEffect` + `Promise.all` 模式
- RedStone: 页面中直接使用 `useQuery`
- Chronicle: 使用 `useQueries` 模式
- DIA: 使用 `useDIAAllData` hook

**影响**: 代码风格不统一，维护困难，新开发者难以理解代码结构

### 问题 2: 硬编码的模拟数据（高优先级）

**位置**:

- `hooks/oracles/chainlink.ts` 第 104-111 行
- `hooks/oracles/pyth.ts` 第 119-127 行、第 136-207 行
- `hooks/oracles/redstone.ts` 第 118-161 行

**描述**:

- networkStats 数据是硬编码的静态数据
- publishers 和 validators 数据是硬编码的
- ecosystem 和 risk 数据是硬编码的

**影响**: 数据不是实时的，无法反映真实市场情况，用户可能看到过时或错误的数据

### 问题 3: lastUpdated 计算方式不一致（中优先级）

**位置**: 各预言机的 hooks 文件
**描述**:

- Chainlink: 使用 `useEffect` 监听 price 变化
- Pyth, API3, Tellor: 使用 `useMemo` 从 `price?.timestamp` 计算
- UMA, BandProtocol: 手动在 `fetchData` 成功后设置
- RedStone: 在 hook 返回时计算
- Chronicle: 使用 `dataUpdatedAt` 从 react-query 获取
- DIA: 使用 `useEffect` 监听 price 变化

**影响**: 不同页面的更新时间计算逻辑不一致，可能导致时间显示不准确

### 问题 4: 错误处理不一致（中优先级）

**位置**: 各预言机的 hooks 文件
**描述**:

- 有些页面返回 `errors` 数组
- 有些只返回单个 `error`
- UMA 和 BandProtocol 使用 try-catch 手动处理

**影响**: 错误处理逻辑不统一，可能导致某些错误无法正确显示

### 问题 5: 未使用的变量和导入（低优先级）

**位置**:

- `useChainlinkPage.ts` 导入了 `useEffect` 但未使用
- `usePythPage.ts` 创建了 `client` 但未使用
- `useAPI3Page.ts` 创建了 `client` 但未使用

**影响**: 代码冗余，可能导致混淆

### 问题 6: refetchAll 实现不一致（中优先级）

**位置**: 各预言机的 hooks 文件
**描述**:

- Chainlink, Pyth: 使用 `void` 忽略返回值，不等待
- API3, Tellor: 使用 `await Promise.all` 等待所有请求完成
- Chronicle: 使用 `forEach` 调用 refetch，不等待

**影响**: 刷新行为不一致，可能导致用户体验问题

### 问题 7: 条件渲染逻辑问题（高优先级）

**位置**: 所有预言机的 `page.tsx` 文件
**描述**:

- 所有页面都使用 `if (isLoading && !price)` 来显示加载状态
- 如果 price 加载失败但其他数据还在加载，会显示错误状态而非加载状态

**影响**: 用户可能在数据仍在加载时看到错误页面

### 问题 8: 组件 isLoading 传递问题（中优先级）

**位置**:

- `chainlink/page.tsx` 中 `ChainlinkNodesView`, `ChainlinkDataFeedsView` 等未传递 `isLoading`
- `pyth/page.tsx` 中 `PythPriceFeedsView`, `PythRiskView` 只传递了 `isLoading`

**影响**: 子组件无法正确显示加载状态

### 问题 9: 重复的客户端实例（中优先级）

**位置**:

- `redstone/page.tsx` 第 28 行
- `useRedStonePage.ts` 第 15 行
- `hooks/oracles/redstone.ts` 第 10 行

**描述**: RedStone 客户端被创建了三次

**影响**: 资源浪费，可能导致状态不一致

### 问题 10: 类型定义重复（低优先级）

**位置**: 各预言机的 `types.ts` 文件
**描述**: 多个文件中定义了相似的 `NetworkStats` 接口

**影响**: 类型维护困难，可能导致类型不一致

### 问题 11: API3 页面数据映射问题（中优先级）

**位置**: `api3/page.tsx` 第 71-78 行
**描述**: `networkStats` 使用了 `airnodeStats` 和 `dapiCoverage` 的数据，但使用了 `??` 默认值

**影响**: 可能导致数据不一致或显示错误的默认值

### 问题 12: 翻译键可能缺失（低优先级）

**位置**: 各预言机的 `page.tsx` 文件
**描述**: 需要验证所有翻译键是否存在于翻译文件中

**影响**: 可能导致翻译缺失或显示错误

### 问题 13: 类型安全问题（低优先级）

**位置**: 多个 `page.tsx` 文件
**描述**: 多处使用 `?? null` 或 `|| null` 来处理可能为 undefined 的值

**影响**: 可能导致运行时类型错误

### 问题 14: 缺少 enabled 参数检查（低优先级）

**位置**: `hooks/oracles/chainlink.ts` 的 `useChainlinkAllData`
**描述**: `isLoading` 没有检查 `enabled` 参数

**影响**: 当 `enabled` 为 false 时，`isLoading` 可能返回错误的值

### 问题 15: 移动端菜单状态管理重复（低优先级）

**位置**: 所有预言机的 `page.tsx` 文件
**描述**: 每个页面都独立管理 `isMobileMenuOpen` 状态

**影响**: 代码重复，可以提取到共享逻辑中
