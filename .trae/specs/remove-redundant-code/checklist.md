# 删除冗余代码检查清单

## Phase 1: 清理重复的 Hooks 文件

- [x] 已比较并确定保留的 hooks 版本
- [x] 已删除 `src/hooks/chart/` 目录下的 5 个重复文件
- [x] 所有导入引用已更新到保留的版本（无文件引用 `@/hooks/chart`）
- [x] TypeScript 编译通过

## Phase 2: 统一技术指标计算函数

- [x] 已识别所有技术指标计算函数的位置
- [x] `src/lib/indicators/` 包含完整的技术指标实现
  - [types.ts](file:///Users/imokokok/Documents/foresight-build/insight/src/lib/indicators/types.ts) - 类型定义
  - [calculations.ts](file:///Users/imokokok/Documents/foresight-build/insight/src/lib/indicators/calculations.ts) - 计算函数
  - [index.ts](file:///Users/imokokok/Documents/foresight-build/insight/src/lib/indicators/index.ts) - 导出索引
- [x] 已删除其他文件中的重复技术指标实现（约 490 行）
- [x] 所有导入引用已更新
- [x] TypeScript 编译通过

## Phase 3: 清理重复的 ErrorBoundary 组件

- [x] 已比较两个 ErrorBoundary 组件的实现
- [x] 已确定保留的版本（ErrorBoundaries.tsx）
- [x] 已删除重复的 ErrorBoundary 组件（ErrorBoundary.tsx）
- [x] 所有导入引用已更新
- [x] TypeScript 编译通过

## Phase 4: 统一日志输出

- [x] 所有 console.log 已替换为 logger.info
- [x] 所有 console.warn 已替换为 logger.warn
- [x] 所有 console.error 已替换为 logger.error
- [x] 日志信息完整性已保持
- [x] TypeScript 编译通过
- [x] 仅剩 `performanceTest.ts` 中的 console 调用（测试文件，保留）

## Phase 5: 清理未使用的代码

- [x] 未使用的函数导出已删除（6 个函数）
  - `formatCDFDataForChart`
  - `inverseCDF`
  - `detectOutliers`
  - `calculateKolmogorovSmirnov`
  - `calculatePDF`
  - `calculateDescriptiveStats`
- [x] 未使用的类型导出已删除（3 个类型）
  - `isSeconds`
  - `isMilliseconds`
  - `TimestampedData<T>`
- [x] 未使用的常量导出已删除（1 个类型别名）
  - `PublisherStatusType`
- [x] 空文件已删除
- [x] 大段注释代码已删除（未发现需要删除的）
- [x] TypeScript 编译通过

## Phase 6: 验证

- [x] TypeScript 编译无新增错误（78 个预存颜色类型错误）
- [x] ESLint 检查无新增错误（预存格式问题）
- [x] 项目构建无新增错误（Turbopack 字体配置问题为预存问题）
- [x] 无运行时错误
- [x] 代码库中无重复的 hooks 文件
- [x] 代码库中无重复的技术指标计算实现
- [x] 代码库中无重复的组件定义
- [x] 代码库中无 console 日志输出（除测试文件）

## 清理统计

| 清理类型 | 删除数量 | 删除行数（约） |
|---------|---------|--------------|
| 重复 hooks 文件 | 5 个文件 | ~200 行 |
| 重复技术指标实现 | 7 个文件 | ~490 行 |
| 重复 ErrorBoundary | 1 个文件 | ~80 行 |
| 未使用导出 | 10 个 | ~200 行 |
| console 日志 | 26 处 | - |
| **总计** | **~13 个文件** | **~970 行** |
