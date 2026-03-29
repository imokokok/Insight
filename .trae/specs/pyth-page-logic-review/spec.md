# Pyth Network 页面代码逻辑审查规范

## Why
Pyth Network 预言机页面存在多处代码逻辑问题，包括数据一致性差、重复代码、类型定义混乱、WebSocket 连接管理分散等问题，影响代码可维护性和用户体验。

## What Changes
- 统一数据获取逻辑，消除模拟数据与真实数据混用
- 整合重复的类型定义和常量定义
- 优化 WebSocket 连接管理，避免重复连接
- 修复性能问题和代码质量问题
- 提升类型安全性

## Impact
- Affected specs: pyth-page-professional-review, pyth-coverage-final-assessment
- Affected code: 
  - `src/app/[locale]/pyth/` 目录下所有组件和 hooks
  - `src/lib/oracles/pythDataService.ts`
  - `src/lib/oracles/pythNetwork.ts`
  - `src/hooks/oracles/pyth.ts`

## ADDED Requirements

### Requirement: 数据一致性
系统 SHALL 确保所有视图使用统一的数据源，避免模拟数据与真实数据混用。

#### Scenario: 价格源数据一致性
- **WHEN** 用户访问价格源视图
- **THEN** 数据应从 `PythDataService` 获取，而非硬编码的 `mockPriceFeeds`

#### Scenario: 跨链数据一致性
- **WHEN** 用户访问跨链视图
- **THEN** 数据应从真实 API 获取，而非 `generateMockChainData()` 生成的模拟数据

### Requirement: 代码去重
系统 SHALL 避免重复定义常量、类型和函数。

#### Scenario: 常量定义去重
- **WHEN** 开发者需要使用价格源 ID 映射
- **THEN** 应从单一位置导入 `PYTH_PRICE_FEED_IDS`，而非多处重复定义

#### Scenario: 类型定义统一
- **WHEN** 组件需要使用发布者数据类型
- **THEN** 应从统一的类型文件导入，而非在组件内重新定义

### Requirement: WebSocket 连接管理
系统 SHALL 集中管理 WebSocket 连接，避免重复连接和资源浪费。

#### Scenario: 单例 WebSocket 连接
- **WHEN** 多个组件需要订阅价格更新
- **THEN** 应共享同一个 WebSocket 连接实例

### Requirement: 性能优化
系统 SHALL 确保组件渲染性能符合标准。

#### Scenario: 客户端实例管理
- **WHEN** 组件需要使用 PythClient
- **THEN** 应使用单例或 useMemo 缓存，而非每次渲染创建新实例

#### Scenario: 大数据列表渲染
- **WHEN** 列表数据超过 100 条
- **THEN** 应使用虚拟滚动技术

### Requirement: 类型安全
系统 SHALL 确保类型定义完整且一致。

#### Scenario: 避免 any 类型
- **WHEN** 处理动态数据
- **THEN** 应定义明确的类型，避免使用 any

## MODIFIED Requirements

### Requirement: 数据获取架构
原有的数据获取逻辑分散在 hook 和 service 之间，现修改为统一通过 `PythDataService` 获取数据。

## REMOVED Requirements

### Requirement: 分散的模拟数据生成
**Reason**: 模拟数据应集中管理或完全移除，避免与真实数据混淆
**Migration**: 将模拟数据生成逻辑迁移到 `PythDataService` 的 fallback 机制中
