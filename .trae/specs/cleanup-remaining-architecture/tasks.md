# Tasks

## Phase 1: 重命名 SWR Hook 文件

- [x] Task 1: 重命名 useOracleDataSWR.ts 文件
  - [x] SubTask 1.1: 将 `src/hooks/useOracleDataSWR.ts` 重命名为 `src/hooks/useOracleDataQuery.ts`
  - [x] SubTask 1.2: 更新文件内的类型名称（UseOracleDataSWROptions -> UseOracleDataQueryOptions, UseOracleDataSWRReturn -> UseOracleDataQueryReturn）
  - [x] SubTask 1.3: 更新 `src/hooks/index.ts` 中的导出，添加向后兼容别名

- [x] Task 2: 更新使用该 hook 的文件
  - [x] SubTask 2.1: 搜索所有使用 `useOracleDataSWR` 的文件
  - [x] SubTask 2.2: 更新导入语句
  - [x] SubTask 2.3: 验证 TypeScript 编译通过

## Phase 2: 统一错误类定义

- [x] Task 3: 移动 NotImplementedError 到正确位置
  - [x] SubTask 3.1: 将 `NotImplementedError` 类添加到 `src/lib/errors/BusinessErrors.ts`
  - [x] SubTask 3.2: 在 `src/lib/errors/index.ts` 中导出 `NotImplementedError`
  - [x] SubTask 3.3: 验证所有错误类可从 `@/lib/errors` 正确导入

- [x] Task 4: 删除 re-export 文件
  - [x] SubTask 4.1: 确认 `src/lib/errors.ts` 中的所有导出已在 `src/lib/errors/index.ts` 中
  - [x] SubTask 4.2: 删除 `src/lib/errors.ts` 文件
  - [x] SubTask 4.3: 验证 TypeScript 编译通过

## Phase 3: 消除常量重复

- [x] Task 5: 审计常量定义
  - [x] SubTask 5.1: 比较 `src/lib/constants/index.ts` 和 `src/types/oracle/constants.ts` 的内容
  - [x] SubTask 5.2: 识别重复或相似的常量
  - [x] SubTask 5.3: 确定每个常量的正确归属位置（结论：两个文件职责不同，无需合并）

- [x] Task 6: 统一常量位置（如有需要）
  - [x] SubTask 6.1: 将重复常量合并到合适位置（无需合并）
  - [x] SubTask 6.2: 更新所有导入路径（无需更新）
  - [x] SubTask 6.3: 验证 TypeScript 编译通过

## Phase 4: 验证

- [x] Task 7: 验证清理完成
  - [x] SubTask 7.1: 运行 TypeScript 编译检查
  - [x] SubTask 7.2: 运行 ESLint 检查
  - [x] SubTask 7.3: 运行构建测试
  - [x] SubTask 7.4: 确认无残留的旧命名或导入

---

# Task Dependencies

- [Task 2] depends on [Task 1] (先重命名文件再更新引用)
- [Task 4] depends on [Task 3] (先移动错误类再删除 re-export)
- [Task 6] depends on [Task 5] (先审计再统一)
- [Task 7] depends on [Task 1, Task 2, Task 3, Task 4, Task 5, Task 6]

---

# Parallelizable Tasks

- Task 1 + Task 3 + Task 5 可并行执行（不同模块的清理）
