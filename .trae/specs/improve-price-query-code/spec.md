# 价格查询功能代码改进规范

## Why

根据代码审查发现，价格查询功能虽然整体质量较高，但存在一些可以改进的地方：类型定义可以更严格、存在重复代码需要提取、部分魔法数字需要常量化。通过针对性的改进，可以提升代码的可维护性和可读性。

## What Changes

- 提取重复的查询逻辑到公共函数
- 优化类型定义，减少 `any` 和宽泛的类型
- 提取魔法数字为具名常量
- 统一导出功能的字段处理逻辑
- 优化图表组件的数据处理逻辑
- **BREAKING**: 部分内部函数签名可能调整

## Impact

- Affected specs: 价格查询功能
- Affected code:
  - `src/app/[locale]/price-query/hooks/usePriceQuery.ts` - 统计计算逻辑
  - `src/app/[locale]/price-query/queries/usePriceData.ts` - 重复查询逻辑
  - `src/app/[locale]/price-query/utils/exportUtils.ts` - 重复导出逻辑
  - `src/app/[locale]/price-query/components/PriceChart.tsx` - 数据处理逻辑
  - `src/app/[locale]/price-query/components/Selectors.tsx` - 魔法数字

## ADDED Requirements

### Requirement: 提取公共查询函数

系统 SHALL 提取 `usePriceData.ts` 中重复的查询逻辑到公共函数。

#### Scenario: 统一价格数据获取
- **WHEN** 需要获取价格数据时
- **THEN** 应该使用统一的 `fetchPriceData` 函数，而不是重复实现

#### Scenario: 缓存逻辑复用
- **WHEN** 处理缓存时
- **THEN** 应该使用统一的缓存管理逻辑

### Requirement: 优化类型定义

系统 SHALL 使用更严格的类型定义，减少宽泛类型。

#### Scenario: ChartDataPoint 类型优化
- **WHEN** 定义图表数据点类型
- **THEN** 应该明确数据键类型，而不是使用 `[key: string]`

#### Scenario: 消除隐式 any
- **WHEN** 定义函数参数和返回值
- **THEN** 必须明确类型，禁止隐式 any

### Requirement: 提取常量

系统 SHALL 将魔法数字提取为具名常量。

#### Scenario: 并发限制常量
- **WHEN** 设置并发限制时
- **THEN** 应该使用 `MAX_CONCURRENT_REQUESTS` 常量

#### Scenario: 超时时间常量
- **WHEN** 设置请求超时时
- **THEN** 应该使用 `REQUEST_TIMEOUT_MS` 常量

#### Scenario: 显示限制常量
- **WHEN** 限制显示数量时
- **THEN** 应该使用 `MAX_VISIBLE_ITEMS` 常量

### Requirement: 统一导出逻辑

系统 SHALL 统一 CSV 和 JSON 导出的字段处理逻辑。

#### Scenario: 字段提取统一
- **WHEN** 导出数据时
- **THEN** 应该使用统一的字段提取函数

#### Scenario: 过滤逻辑复用
- **WHEN** 按时间范围过滤数据时
- **THEN** 应该复用相同的过滤函数

### Requirement: 优化统计计算

系统 SHALL 优化 `usePriceQuery` 中的统计计算逻辑。

#### Scenario: 统计函数提取
- **WHEN** 计算价格统计时
- **THEN** 应该使用提取的统计工具函数

#### Scenario: 重复计算消除
- **WHEN** 计算对比数据和非对比数据时
- **THEN** 应该复用相同的计算逻辑

## MODIFIED Requirements

### Requirement: usePriceData Hook

原有 `usePriceData` 和 `useMultiPriceData` 存在重复代码。

**修改内容**:
- 提取公共的 `fetchPriceData` 函数
- 统一缓存处理逻辑
- 保持原有接口不变

### Requirement: exportUtils

原有导出函数存在重复字段处理逻辑。

**修改内容**:
- 提取 `extractExportFields` 函数
- 统一 `filterByTimeRange` 逻辑
- 保持导出格式不变

### Requirement: PriceChart 组件

原有 `enhancedChartData` 计算逻辑较复杂。

**修改内容**:
- 提取数据处理逻辑到自定义 hook
- 优化 `useMemo` 依赖项
- 保持组件行为不变

### Requirement: Selectors 组件

原有组件使用魔法数字。

**修改内容**:
- 提取 `MAX_VISIBLE_SYMBOLS` 常量
- 保持组件行为不变

## REMOVED Requirements

### Requirement: 重复代码

**Reason**: 通过提取公共函数消除重复
**Migration**: 使用新的公共函数替代重复实现
