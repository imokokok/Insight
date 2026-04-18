# 价格数据查询功能优化 Spec

## Why

价格数据查询功能是项目核心功能，覆盖 Price Query、Cross-Chain、Cross-Oracle 三个页面，支持 10 个预言机提供商。但当前存在数据获取层不统一、缓存策略碎片化、关键功能缺失（自动刷新/实时推送/多预言机对比 UI）、状态管理过度集中、数据准确性问题（模拟置信区间/硬编码值）等系统性问题，导致功能价值未充分发挥。

## What Changes

- 引入 React Query 统一数据获取层，替代手动的加载/缓存/重试逻辑
- 实现自动刷新机制（可配置间隔），支持 Price Query 和 Cross-Oracle 页面
- 添加多预言机同时查询 UI，将 Oracle 选择器从单选改为多选
- 实现对比模式 UI，激活已有的 compareMode 后端逻辑
- 统一缓存策略，消除三套独立缓存机制
- 修复数据准确性问题：标注置信区间来源、移除硬编码 volume24h=0、修复收藏功能
- 拆分 usePriceQuery 巨型 Hook，按功能域分离关注点
- 消除重复类型定义和冗余导出系统
- Cross-Oracle 增加链维度筛选和导出功能
- **BREAKING**: usePriceQuery 返回值结构变更（拆分为多个 Context）

## Impact

- Affected specs: 价格查询数据获取、缓存策略、状态管理、导出功能、跨链/跨预言机对比
- Affected code:
  - `src/app/price-query/hooks/` — 全部重构
  - `src/app/price-query/PriceQueryContent.tsx` — 适配新 Hook 结构
  - `src/app/price-query/components/Selectors.tsx` — 多选 Oracle
  - `src/app/price-query/components/QueryResults.tsx` — 修复 volume24h
  - `src/app/price-query/components/QueryHeader.tsx` — 修复收藏
  - `src/app/price-query/constants.ts` — 消除重复类型
  - `src/app/cross-oracle/` — 增加链维度、自动刷新、导出
  - `src/app/cross-chain/hooks/useDataFetching.ts` — 统一缓存
  - `src/lib/oracles/base.ts` — 缓存统一
  - `src/lib/config/oracles.tsx` — 移除直接实例化客户端

## ADDED Requirements

### Requirement: React Query 统一数据获取层

系统 SHALL 使用 React Query（@tanstack/react-query）管理所有价格查询的数据获取、缓存、重试和过期重新验证逻辑，SHALL NOT 在组件中手动管理 loading/error/data 状态。

#### Scenario: 数据获取统一

- **WHEN** 组件需要获取预言机价格数据
- **THEN** 通过 React Query 的 useQuery/useInfiniteQuery 获取，自动获得缓存、重试、后台刷新能力

#### Scenario: 缓存策略统一

- **WHEN** 多个组件请求相同参数的价格数据
- **THEN** React Query 自动去重和复用缓存，不重复发起网络请求

### Requirement: 自动刷新机制

系统 SHALL 在 Price Query 和 Cross-Oracle 页面提供可配置的自动刷新功能，支持关闭/30s/1m/5m 四种间隔。

#### Scenario: 自动刷新启用

- **WHEN** 用户开启自动刷新并选择间隔
- **THEN** 系统按指定间隔自动重新获取价格数据，UI 显示下次刷新倒计时

#### Scenario: 自动刷新暂停

- **WHEN** 用户切换到其他标签页（页面不可见）
- **THEN** 自动刷新暂停，页面重新可见时立即刷新一次

### Requirement: 多预言机同时查询

系统 SHALL 在 Price Query 页面支持同时选择多个预言机进行价格查询，Oracle 选择器从单选改为多选。

#### Scenario: 多预言机选择

- **WHEN** 用户在 Oracle 选择器中选择多个预言机
- **THEN** 系统并行查询所有选中预言机的价格数据，结果分卡片展示

#### Scenario: 多预言机对比视图

- **WHEN** 查询结果包含多个预言机数据
- **THEN** 显示价格对比表格（含偏差率）和统计摘要（均值/标准差/最大偏差）

### Requirement: 对比模式 UI

系统 SHALL 在 Price Query 页面暴露对比模式切换控件，允许用户对比同一资产在不同时间范围的价格走势。

#### Scenario: 对比模式启用

- **WHEN** 用户开启对比模式并选择对比时间范围
- **THEN** 图表同时展示当前时间范围和对比时间范围的价格走势，用不同颜色区分

### Requirement: 置信区间来源标注

系统 SHALL 在展示置信区间时明确标注数据来源是预言机原始数据还是客户端估算值。

#### Scenario: 置信区间来源透明

- **WHEN** 价格数据包含置信区间
- **THEN** UI 显示来源标签（"原始数据" 或 "估算值"），估算值使用虚线样式区分

### Requirement: Cross-Oracle 链维度筛选

系统 SHALL 在 Cross-Oracle 页面增加链筛选器，支持选择特定链上的预言机报价进行对比。

#### Scenario: 跨预言机跨链对比

- **WHEN** 用户在 Cross-Oracle 页面选择链（如 Ethereum）
- **THEN** 仅展示各预言机在该链上的报价，实现 "Chainlink on Ethereum vs Pyth on Ethereum" 的精确对比

### Requirement: Cross-Oracle 导出功能

系统 SHALL 在 Cross-Oracle 页面提供 CSV/JSON 导出功能，与 Cross-Chain 页面的导出体验一致。

#### Scenario: Cross-Oracle 数据导出

- **WHEN** 用户点击导出按钮
- **THEN** 可选择 CSV 或 JSON 格式导出当前跨预言机对比数据

### Requirement: 统一缓存层

系统 SHALL 建立统一的缓存管理机制，替代当前 Price Query（未使用缓存）、Cross-Chain（模块级 Map）、Cross-Oracle（useRef）三套独立缓存。

#### Scenario: 缓存策略统一

- **WHEN** 任何页面获取价格数据
- **THEN** 通过 React Query 的缓存管理器统一管理，相同参数的请求自动复用缓存

### Requirement: usePriceQuery Hook 拆分

系统 SHALL 将 usePriceQuery 巨型 Hook（50+ 字段）拆分为按功能域分组的多个 Hook/Context，减少不必要的重渲染。

#### Scenario: 按需订阅状态

- **WHEN** 组件只需要查询参数状态
- **THEN** 仅订阅 QueryParamsContext，不因数据状态变化而重渲染

#### Scenario: 返回值 memo 化

- **WHEN** Hook 返回分组对象
- **THEN** 使用 useMemo 确保引用稳定性，避免消费者不必要的重渲染

## MODIFIED Requirements

### Requirement: Price Query 收藏功能

收藏功能 SHALL 保存完整的查询配置（Oracle + Chain + Symbol + TimeRange），应用收藏时完整恢复所有参数，SHALL NOT 仅恢复 symbol 而忽略其他参数。

### Requirement: Price Query 统计卡片数据准确性

DefaultStats 中的 24h Volume SHALL 从预言机数据中获取实际值，SHALL NOT 硬编码为 0。当数据不可用时，SHALL 显示 "N/A" 而非 0。

### Requirement: Price Query 图表缺失数据处理

图表中缺失数据点 SHALL 使用 null 值让 Recharts 断开线条，SHALL NOT 使用前值填充（lastValidValues），以避免产生"价格未变"的视觉误导。

### Requirement: Oracle 选择器组件

Oracle 选择器 SHALL 支持多选模式（Price Query 页面）和单选模式（Cross-Chain 页面），通过 props 控制选择模式。

### Requirement: Cross-Oracle 自动刷新

Cross-Oracle 页面 SHALL 支持与 Cross-Chain 一致的自动刷新功能（关闭/30s/1m/5m），SHALL NOT 仅有类型定义而无 UI 控件。

## REMOVED Requirements

### Requirement: 手动数据获取状态管理

**Reason**: 引入 React Query 后，loading/error/data 状态由 React Query 自动管理，无需手动维护
**Migration**: 移除 usePriceQueryData 中的手动状态管理代码，改用 React Query 的 useQuery 返回值

### Requirement: 独立的模块级缓存（Cross-Chain useDataFetching）

**Reason**: React Query 提供了统一的缓存管理，模块级 Map 缓存不再需要
**Migration**: 移除 useDataFetching 中的 moduleCache，数据获取通过 React Query 管理

### Requirement: 三套独立导出系统

**Reason**: usePriceQueryExport、UnifiedExportSection、ExportConfig 三套导出逻辑部分重叠
**Migration**: 统一为基于 UnifiedExport 组件的单入口导出系统，ExportConfig 作为高级配置弹窗保留

### Requirement: requestAnimationFrame 状态初始化

**Reason**: 使用 RAF 延迟设置初始状态是反模式，React Query 可通过 initialData/staleTime 处理初始状态
**Migration**: 使用 React Query 的 placeholderData 或 initialData 提供初始数据
