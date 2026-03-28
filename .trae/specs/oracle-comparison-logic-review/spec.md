# 多预言机对比功能代码逻辑问题分析 Spec

## Why

用户请求检查多预言机对比功能（OracleMarketOverview）的代码逻辑，发现存在多个功能不完整、逻辑错误和潜在 bug，需要系统性地记录并修复这些问题。

## What Changes

- 修复时间范围选择器无实际功能的问题
- 修复 OraclePrefetchCard 中 Link 和 onClick 冲突的问题
- 修复 API 预取配置缺少必需参数的问题
- 修复表格视图数据不一致的问题
- 优化趋势图渲染逻辑，减少代码重复
- 统一翻译键命名
- 改进类型安全

## Impact

- Affected specs: 市场概览功能、预言机对比功能
- Affected code:
  - `src/app/[locale]/home-components/OracleMarketOverview.tsx`
  - `src/app/[locale]/home-components/OraclePrefetchCard.tsx`
  - `src/i18n/messages/zh-CN/marketOverview.json`
  - `src/i18n/messages/en/marketOverview.json`

## ADDED Requirements

### Requirement: 时间范围选择器功能完整性

系统 SHALL 使时间范围选择器具有实际功能，切换时间范围时应该更新图表数据。

#### Scenario: 用户切换时间范围

- **WHEN** 用户点击时间范围选择器（如 1H、24H、7D 等）
- **THEN** 系统应该根据选择的时间范围过滤或更新图表数据

### Requirement: OraclePrefetchCard 交互逻辑清晰

系统 SHALL 区分选中操作和导航操作，避免用户点击时同时触发两个操作。

#### Scenario: 用户点击预言机卡片

- **WHEN** 用户点击预言机卡片的主体区域
- **THEN** 系统应该只执行选中操作，不触发页面导航
- **AND** 当用户点击特定的导航按钮时，才执行页面跳转

### Requirement: API 预取配置正确

系统 SHALL 在预取 API 时提供所有必需的参数。

#### Scenario: 预取预言机详情数据

- **WHEN** 用户悬停在预言机卡片上
- **THEN** 系统应该使用正确的 API 参数（包括 symbol）进行预取
- **AND** 预取请求应该成功完成

### Requirement: 表格视图数据一致性

系统 SHALL 确保表格视图显示的数据与当前选中的图表类型一致。

#### Scenario: 用户在趋势图模式下切换到表格视图

- **WHEN** 用户选中趋势图模式并切换到表格视图
- **THEN** 表格应该显示趋势相关的数据，而非市场份额数据

## MODIFIED Requirements

### Requirement: 趋势图渲染优化

系统 SHALL 使用配置驱动的方式渲染趋势图，减少代码重复，提高可维护性。

### Requirement: 翻译键统一

系统 SHALL 统一翻译键的命名，确保 `marketOverview.json` 和 `ui.json` 中的键名一致。

## 发现的问题详情

### 问题 1: 时间范围选择器无实际功能（高优先级）

**位置**: `OracleMarketOverview.tsx` 第 199 行、第 666-686 行
**描述**:

- `selectedRange` 状态被创建，UI 也渲染了时间范围选择器
- 但这个状态没有被任何地方使用，切换时间范围不会影响任何数据展示
- 数据是硬编码的静态数据，无法根据时间范围动态变化

**影响**: 用户会认为时间范围选择器有效，但实际上没有任何作用，造成用户困惑

### 问题 2: OraclePrefetchCard 中 Link 和 onClick 冲突（高优先级）

**位置**: `OraclePrefetchCard.tsx` 第 104-158 行
**描述**:

- 整个卡片被包裹在 `Link` 组件中
- 同时卡片也有 `onClick` 处理器用于选中项目
- 点击时会同时触发选中操作和页面导航
- 用户无法只选中项目而不跳转页面

**影响**: 交互逻辑混乱，用户无法正常使用选中功能

### 问题 3: API 预取配置缺少必需参数（高优先级）

**位置**: `OraclePrefetchCard.tsx` 第 68-79 行
**描述**:

- 预取配置调用 `/api/oracles/${provider}`
- 但根据 `src/app/api/oracles/[provider]/route.ts`，这个 API 需要 `symbol` 参数
- 预取时没有提供 `symbol` 参数，会导致 API 返回 400 错误

**影响**: 预取功能完全失效，无法提升用户体验

### 问题 4: 表格视图数据不一致（中优先级）

**位置**: `OracleMarketOverview.tsx` 第 285-379 行
**描述**:

- `renderTable` 函数中，当 `activeChart === 'trend'` 时使用 `marketShareData`
- 但趋势图应该显示趋势数据，而非市场份额数据
- 表格视图的数据与图表类型不匹配

**影响**: 用户切换到表格视图时看到的数据与图表不一致

### 问题 5: 趋势图代码重复（中优先级）

**位置**: `OracleMarketOverview.tsx` 第 429-567 行
**描述**:

- 趋势图中有 10 个几乎相同的 `Line` 组件
- 每个组件都有重复的属性设置和事件处理器
- 代码冗余，难以维护

**影响**: 代码可维护性差，修改时容易遗漏

### 问题 6: 翻译键不一致（低优先级）

**位置**: `marketOverview.json` 和 `ui.json`
**描述**:

- `marketOverview.json` 中有 `coveringOracles`，但代码中用的是 `oraclesCovered`
- `marketOverview.json` 中缺少 `oracle`、`chains` 等键
- 翻译文件与代码不匹配

**影响**: 可能导致翻译缺失或显示错误

### 问题 7: 类型安全问题（低优先级）

**位置**: `OracleMarketOverview.tsx` 第 187-194 行
**描述**:

- `MarketShareDataItem` 接口中 `protocols` 是可选的
- 但在表格渲染时直接访问 `item.protocols`，可能导致 undefined

**影响**: 可能导致运行时错误

### 问题 8: 悬停状态闪烁问题（低优先级）

**位置**: `OracleMarketOverview.tsx` 第 437-566 行
**描述**:

- 趋势图中每个 Line 都有独立的 `onMouseEnter` 和 `onMouseLeave`
- 快速移动鼠标时会导致 `hoveredItem` 状态频繁变化
- 可能导致视觉闪烁

**影响**: 用户体验不佳

### 问题 9: 数据硬编码问题（架构问题）

**位置**: `OracleMarketOverview.tsx` 第 54-172 行
**描述**:

- 所有数据都是硬编码的静态数据
- 没有从 API 获取真实数据
- 无法实现动态更新

**影响**: 数据不是实时的，无法反映真实市场情况
