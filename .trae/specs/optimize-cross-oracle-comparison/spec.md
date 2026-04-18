# 多预言机对比功能优化 Spec

## Why

多预言机对比功能（Cross-Oracle Comparison）存在数据准确性问题（历史数据来源单一、模拟数据未标注、硬编码默认值）、代码架构问题（重复组件、超大文件、死代码）、用户体验问题（翻译键未实现、共同币种交集为空、错误分类脆弱）和性能问题（客户端急切实例化、潜在内存泄漏），导致功能价值大打折扣，用户可能被误导或无法获得有意义的跨预言机洞察。

## What Changes

- 在历史数据来源为 Binance 时，UI 明确标注数据来源，避免用户误认为各预言机自身提供历史数据
- 在 MarketDepthSimulator 和 SimplePriceTable 的 Latency/Sources 列添加"模拟"或"估算"标注
- 合并 `SimplePriceTable` 和 `PriceTable` 为统一价格表格组件，统一异常检测逻辑
- 拆分 `useOracleData.ts`（683行）为多个专注模块：数据获取、错误处理、性能指标、内存管理
- 拆分 `oracles.tsx`（706行）为按预言机拆分的配置模块
- 移除死代码：未使用的 `UnifiedExportSection`、`charts.ts` 中未导出的类型、`hooks/index.ts` 不完整导出
- 统一重复定义：合并 `OracleErrorType` 和 `OracleErrorTypeValue`、合并 `deviationThresholds` 和 `SEVERITY_THRESHOLDS`、统一预言机颜色配置为一处
- 修复 `constants.tsx` 文件扩展名为 `.ts`
- 统一 API 路由验证方式，将 `/api/oracles/[provider]/route.ts` 的手动验证迁移为 Zod schema
- 实现共同币种智能推荐：当交集为空时，推荐支持最多预言机的交易对子集
- 修复 `classifyError` 错误分类逻辑，使用结构化错误类型替代字符串匹配
- 修复 `usePriceAnomalyDetection` 中 `analyzeReason` 返回翻译键但无 i18n 的问题，改为直接返回可读文本
- 懒加载预言机客户端实例，避免启动时全部创建
- 修复 `priceHistoryMapRef` 内存泄漏，确保始终执行清理
- 导出 `UnsupportedChainError` 和 `UnsupportedSymbolError` 错误类

## Impact

- Affected specs: 预言机数据获取、价格对比展示、异常检测、错误处理、API 路由
- Affected code:
  - `src/app/cross-oracle/` - 整个目录重构
  - `src/app/api/oracles/` - API 路由验证统一
  - `src/lib/oracles/base.ts` - 历史数据标注
  - `src/lib/oracles/factory.ts` - 懒加载
  - `src/lib/config/oracles.tsx` - 配置拆分
  - `src/lib/errors/OracleError.ts` - 错误类导出
  - `src/lib/api/oracleHandlers.ts` - 验证统一

## ADDED Requirements

### Requirement: 历史数据来源透明标注

系统 SHALL 在跨预言机历史数据对比视图中，明确标注历史价格数据的实际来源。当历史数据来自 Binance（而非各预言机自身）时，SHALL 在图表和表格中显示"历史数据来源: Binance"的标注信息。

#### Scenario: 历史数据来源标注显示

- **WHEN** 用户查看多预言机趋势对比图（MultiOracleTrendChart）
- **THEN** 图表下方 SHALL 显示数据来源标注，明确指出历史数据来自 Binance API 而非各预言机原生数据源

#### Scenario: 历史数据来源标注在表格中显示

- **WHEN** 用户查看包含历史数据的价格表格
- **THEN** 表格的 Sources 列 SHALL 标注"binance-api (估算)"而非直接显示"binance-api"

### Requirement: 模拟数据明确标注

系统 SHALL 在所有使用模拟/估算数据而非真实测量数据的 UI 组件中，添加明确的"模拟"或"估算"标注，避免用户误认为数据是真实测量值。

#### Scenario: MarketDepthSimulator 标注

- **WHEN** 用户查看共识深度图（MarketDepthSimulator）
- **THEN** 组件 SHALL 显示"模拟数据"标注，说明深度数据基于偏差计算生成而非真实订单簿

#### Scenario: SimplePriceTable 延迟和来源标注

- **WHEN** 用户查看价格表格中的 Latency 和 Sources 列
- **THEN** 如果数据来自硬编码默认值而非实际测量，SHALL 显示"估算"标注

### Requirement: 统一价格表格组件

系统 SHALL 合并 `SimplePriceTable` 和 `PriceTable` 为一个统一的价格表格组件，使用一致的异常检测逻辑（基于偏差百分比阈值），SHALL NOT 保留两个功能重叠但逻辑不一致的表格组件。

#### Scenario: 价格表格统一

- **WHEN** 用户查看跨预言机价格对比
- **THEN** 使用统一的表格组件，异常检测逻辑一致（偏差百分比阈值），支持排序、筛选、异常高亮

#### Scenario: 旧组件移除

- **WHEN** 开发者查看代码
- **THEN** `PriceTable.tsx` SHALL 已被移除，所有引用改为使用统一的 `SimplePriceTable`

### Requirement: useOracleData Hook 拆分

系统 SHALL 将 `useOracleData.ts`（683行）拆分为以下专注模块：

- `useOracleDataCore.ts`：核心数据获取逻辑
- `useOracleErrorHandling.ts`：错误分类与处理
- `useOraclePerformance.ts`：性能指标计算与监控
- `useOracleMemory.ts`：内存管理与清理
- `useOracleData.ts`：组合 Hook，聚合上述模块

#### Scenario: Hook 拆分后功能不变

- **WHEN** 开发者使用 `useOracleData` Hook
- **THEN** 返回值和行为与拆分前完全一致，但内部实现分散在专注模块中

### Requirement: 预言机配置按提供商拆分

系统 SHALL 将 `oracles.tsx`（706行）拆分为按预言机提供商的独立配置模块，每个提供商一个文件，通过 barrel 文件统一导出。

#### Scenario: 配置拆分后功能不变

- **WHEN** 开发者导入预言机配置
- **THEN** 导入路径和返回值与拆分前一致，但每个预言机配置在独立文件中维护

### Requirement: 死代码清理

系统 SHALL 移除以下未使用的代码：

- `UnifiedExportSection.tsx`（cross-oracle 中未被引用）
- `charts.ts` 中已定义但未导出且无组件使用的类型（`BoxPlotStats`、`VolatilityResult`、`VolatilityTrendPoint` 等）
- `hooks/index.ts` 中补全所有 hooks 的导出

#### Scenario: 未使用组件移除

- **WHEN** 开发者查看 cross-oracle 目录
- **THEN** 不存在 `UnifiedExportSection.tsx`，不存在未使用的类型定义

### Requirement: 重复定义统一

系统 SHALL 统一以下重复定义：

1. 合并 `OracleErrorType`（types/index.ts）和 `OracleErrorTypeValue`（useOracleData.ts）为单一 `OracleErrorType`
2. 合并 `deviationThresholds`（constants.tsx）和 `SEVERITY_THRESHOLDS`（thresholds.ts）为统一的阈值配置
3. 统一预言机颜色配置，只保留 `chartColors.oracle` 一处定义，移除 `constants.tsx` 中的 `oracleColors`

#### Scenario: 类型定义统一

- **WHEN** 开发者需要引用预言机错误类型
- **THEN** 只有一个 `OracleErrorType` 定义，从 `types/index.ts` 导入

#### Scenario: 阈值配置统一

- **WHEN** 开发者需要引用偏差阈值
- **THEN** 只有一处阈值定义，从 `thresholds.ts` 导入

#### Scenario: 颜色配置统一

- **WHEN** 开发者需要引用预言机颜色
- **THEN** 只有一处颜色定义，从 `lib/config/colors.ts` 导入

### Requirement: 文件扩展名修正

系统 SHALL 将 `constants.tsx` 重命名为 `constants.ts`，因为该文件不包含 JSX 代码。

#### Scenario: 文件扩展名正确

- **WHEN** 开发者查看 cross-oracle 目录
- **THEN** 常量文件名为 `constants.ts`，所有引用路径已更新

### Requirement: API 路由验证统一

系统 SHALL 将 `/api/oracles/[provider]/route.ts` 的手动参数验证迁移为 Zod schema 验证，与 `/api/oracles/route.ts` 保持一致。

#### Scenario: 验证方式统一

- **WHEN** API 路由接收请求参数
- **THEN** 所有预言机相关路由使用 Zod schema 验证参数，无手动验证逻辑

### Requirement: 共同币种智能推荐

系统 SHALL 在共同币种交集为空时，智能推荐支持最多预言机的交易对子集，而非显示空列表。SHALL 在 UI 中明确标注哪些预言机不支持当前选中的交易对。

#### Scenario: 交集为空时推荐

- **WHEN** 用户选择的预言机组合没有共同支持的交易对
- **THEN** 系统 SHALL 推荐支持最多预言机的交易对子集，并标注不支持的预言机

#### Scenario: 部分支持标注

- **WHEN** 用户选择了一个交易对，但部分预言机不支持
- **THEN** 系统 SHALL 在控制面板中标注哪些预言机不支持该交易对，并在结果中跳过这些预言机

### Requirement: 错误分类结构化

系统 SHALL 重构 `classifyError` 函数，使用结构化错误类型（如 `OracleClientError`、`PriceFetchError` 等）的 `instanceof` 检查替代基于错误消息字符串的匹配，提高分类准确性和可维护性。

#### Scenario: 错误分类基于类型

- **WHEN** 预言机数据获取失败
- **THEN** 错误分类基于错误对象的类型（instanceof 检查），而非错误消息字符串匹配

### Requirement: 异常原因文本可读化

系统 SHALL 修复 `usePriceAnomalyDetection` 中 `analyzeReason` 返回翻译键但无 i18n 系统的问题，改为直接返回用户可读的文本描述。

#### Scenario: 异常原因可读

- **WHEN** 检测到价格异常
- **THEN** `analyzeReason` 返回用户可读的文本（如"价格偏差超过3%"），而非翻译键（如"anomalyDetection.reasons.severeDeviation"）

### Requirement: 预言机客户端懒加载

系统 SHALL 将 `oracles.tsx` 中的预言机客户端实例化从模块顶层改为懒加载（工厂函数），仅在首次访问时创建实例，避免应用启动时创建所有客户端。

#### Scenario: 客户端按需创建

- **WHEN** 应用启动
- **THEN** 预言机客户端实例 SHALL NOT 被创建

- **WHEN** 用户首次查询某个预言机的数据
- **THEN** 该预言机的客户端实例 SHALL 被创建并缓存

### Requirement: 内存泄漏修复

系统 SHALL 修复 `priceHistoryMapRef` 的潜在内存泄漏，确保清理逻辑不依赖于 `enablePerformanceMetrics` 标志，在组件卸载或数据刷新时始终执行清理。

#### Scenario: 内存始终清理

- **WHEN** 组件卸载或数据刷新
- **THEN** `priceHistoryMapRef` 中的历史数据 SHALL 被清理，无论 `enablePerformanceMetrics` 是否为 true

### Requirement: 错误类导出完善

系统 SHALL 导出 `UnsupportedChainError` 和 `UnsupportedSymbolError` 错误类，供外部代码使用。

#### Scenario: 错误类可导入

- **WHEN** 外部代码需要判断不支持的链或代币错误
- **THEN** 可以从 `@/lib/errors` 导入并使用 `UnsupportedChainError` 和 `UnsupportedSymbolError`

## MODIFIED Requirements

### Requirement: 跨预言机数据对比

跨预言机数据对比功能 SHALL 在展示数据时，对所有非真实测量数据（历史价格来源、延迟估算、深度模拟）进行明确标注，确保用户能够区分真实数据和模拟/估算数据。

## REMOVED Requirements

### Requirement: 双价格表格架构

**Reason**: `SimplePriceTable` 和 `PriceTable` 功能重叠且异常检测逻辑不一致，合并为统一组件
**Migration**: 保留 `SimplePriceTable` 作为基础，融入 `PriceTable` 的高级特性（Z-score 可作为可选模式）

### Requirement: 基于字符串的错误分类

**Reason**: 基于错误消息字符串匹配的分类方式脆弱且不可靠
**Migration**: 改为基于结构化错误类型的 instanceof 检查
