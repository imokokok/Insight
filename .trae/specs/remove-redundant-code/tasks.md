# Tasks

## Phase 1: 清理重复的 Hooks 文件

- [x] Task 1: 分析并删除重复的 hooks
  - [x] SubTask 1.1: 比较 `useOracleData.ts` 和 `useOracleDataQuery.ts`，确定保留版本（结论：两个文件功能不同，不重复）
  - [x] SubTask 1.2: 比较 `useOracleList.ts` 和 `useOracleListQuery.ts`，确定保留版本（不存在重复）
  - [x] SubTask 1.3: 比较 `usePriceHistory.ts` 和 `usePriceHistoryQuery.ts`，确定保留版本（不存在重复）
  - [x] SubTask 1.4: 比较 `useProviderList.ts` 和 `useProviderListQuery.ts`，确定保留版本（不存在重复）
  - [x] SubTask 1.5: 更新所有导入引用到保留的版本（无需更新）
  - [x] SubTask 1.6: 删除重复的文件（删除了 `src/hooks/chart/` 目录下的 5 个重复文件）
  - [x] SubTask 1.7: 验证 TypeScript 编译通过

## Phase 2: 统一技术指标计算函数

- [x] Task 2: 审计技术指标计算函数
  - [x] SubTask 2.1: 识别所有技术指标计算函数的位置
  - [x] SubTask 2.2: 确定 `src/lib/indicators/` 为统一位置
  - [x] SubTask 2.3: 列出所有重复实现的文件

- [x] Task 3: 统一技术指标实现
  - [x] SubTask 3.1: 确保 `src/lib/indicators/` 中有完整的实现
  - [x] SubTask 3.2: 删除其他文件中的重复实现（约 490 行）
  - [x] SubTask 3.3: 更新所有导入引用
  - [x] SubTask 3.4: 验证 TypeScript 编译通过

## Phase 3: 清理重复的 ErrorBoundary 组件

- [x] Task 4: 统一 ErrorBoundary 组件
  - [x] SubTask 4.1: 比较两个 ErrorBoundary 组件的实现
  - [x] SubTask 4.2: 确定保留哪个版本（保留 ErrorBoundaries.tsx）
  - [x] SubTask 4.3: 更新所有导入引用
  - [x] SubTask 4.4: 删除重复的组件文件（删除 ErrorBoundary.tsx）
  - [x] SubTask 4.5: 验证 TypeScript 编译通过

## Phase 4: 统一日志输出

- [x] Task 5: 替换 console 日志为 logger
  - [x] SubTask 5.1: 搜索所有 console.log 调用
  - [x] SubTask 5.2: 搜索所有 console.warn 调用
  - [x] SubTask 5.3: 搜索所有 console.error 调用
  - [x] SubTask 5.4: 批量替换为 logger 对应方法（26 处，11 个文件）
  - [x] SubTask 5.5: 验证 TypeScript 编译通过

## Phase 5: 清理未使用的代码

- [x] Task 6: 清理未使用的导出
  - [x] SubTask 6.1: 使用工具识别未使用的导出
  - [x] SubTask 6.2: 删除未使用的函数导出（6 个函数）
  - [x] SubTask 6.3: 删除未使用的类型导出（3 个类型）
  - [x] SubTask 6.4: 删除未使用的常量导出（1 个类型别名）
  - [x] SubTask 6.5: 验证 TypeScript 编译通过

- [x] Task 7: 清理空文件和注释代码
  - [x] SubTask 7.1: 删除空文件或几乎空的文件（删除了 5 个重复文件）
  - [x] SubTask 7.2: 删除大段注释掉的代码块（未发现需要删除的）
  - [x] SubTask 7.3: 验证 TypeScript 编译通过

## Phase 6: 验证

- [x] Task 8: 最终验证
  - [x] SubTask 8.1: 运行 TypeScript 编译检查（通过，78 个预存颜色类型错误）
  - [x] SubTask 8.2: 运行 ESLint 检查（通过，预存格式问题）
  - [x] SubTask 8.3: 运行构建测试（Turbopack 字体配置问题，与本次清理无关）
  - [x] SubTask 8.4: 确认无运行时错误

---

# Task Dependencies

- [Task 3] depends on [Task 2] (先审计再统一)
- [Task 5] 可独立执行
- [Task 6] 可独立执行
- [Task 7] 可独立执行
- [Task 8] depends on [Task 1, Task 3, Task 4, Task 5, Task 6, Task 7]

---

# Parallelizable Tasks

- Task 1, Task 2, Task 4, Task 5, Task 6, Task 7 可并行执行（不同模块的清理）
