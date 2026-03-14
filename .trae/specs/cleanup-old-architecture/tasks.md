# Tasks

## Phase 1: 更新导入路径

- [x] Task 1: 更新所有 `@/lib/types/oracle` 导入
  - [x] SubTask 1.1: 搜索所有 `from '@/lib/types/oracle'` 的文件
  - [x] SubTask 1.2: 批量替换为 `from '@/types/oracle'`
  - [x] SubTask 1.3: 验证 TypeScript 编译通过

- [x] Task 2: 更新所有 `@/lib/types/oracleTypes` 导入
  - [x] SubTask 2.1: 搜索所有 `from '@/lib/types/oracleTypes'` 的文件
  - [x] SubTask 2.2: 替换为正确的导入路径（`@/types/oracle` 或 `@/types/ui`）
  - [x] SubTask 2.3: 验证 TypeScript 编译通过

- [x] Task 3: 更新所有 `@/lib/types/recharts` 导入
  - [x] SubTask 3.1: 搜索所有 `from '@/lib/types/recharts'` 的文件
  - [x] SubTask 3.2: 替换为 `from '@/types/ui/recharts'`
  - [x] SubTask 3.3: 验证 TypeScript 编译通过

- [x] Task 4: 更新所有 `@/lib/types/snapshot` 导入
  - [x] SubTask 4.1: 搜索所有 `from '@/lib/types/snapshot'` 的文件
  - [x] SubTask 4.2: 替换为 `from '@/types/oracle'`
  - [x] SubTask 4.3: 验证 TypeScript 编译通过

## Phase 2: 删除旧文件

- [x] Task 5: 删除旧的类型文件
  - [x] SubTask 5.1: 删除 `src/lib/types/oracle.ts`
  - [x] SubTask 5.2: 删除 `src/lib/types/oracleTypes.ts`
  - [x] SubTask 5.3: 删除 `src/lib/types/recharts.ts`
  - [x] SubTask 5.4: 删除 `src/lib/types/snapshot.ts`
  - [x] SubTask 5.5: 删除 `src/lib/types/` 目录（如果为空）

- [x] Task 6: 删除 SWR Provider
  - [x] SubTask 6.1: 确认 `src/app/layout.tsx` 中无 SWRProvider 引用
  - [x] SubTask 6.2: 删除 `src/providers/SWRProvider.tsx`

## Phase 3: 清理依赖

- [x] Task 7: 清理 package.json
  - [x] SubTask 7.1: 移除 `swr` 依赖
  - [x] SubTask 7.2: 运行 `npm install` 更新 lock 文件

## Phase 4: 验证

- [x] Task 8: 验证清理完成
  - [x] SubTask 8.1: 运行 TypeScript 编译检查
  - [x] SubTask 8.2: 运行 ESLint 检查
  - [x] SubTask 8.3: 运行构建测试

---

# Task Dependencies

- [Task 5] depends on [Task 1, Task 2, Task 3, Task 4] (先更新导入再删除文件)
- [Task 6] depends on [Task 5] (最后删除旧文件)
- [Task 7] depends on [Task 6]
- [Task 8] depends on [Task 7]

---

# Parallelizable Tasks

- Task 1, Task 2, Task 3, Task 4 可并行执行（更新不同导入路径）
