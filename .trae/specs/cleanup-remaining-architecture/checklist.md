# 清理剩余旧架构检查清单

## Phase 1: 重命名 SWR Hook 文件

- [x] `src/hooks/useOracleDataSWR.ts` 已重命名为 `src/hooks/useOracleDataQuery.ts`
- [x] 类型名称已更新（UseOracleDataSWROptions -> UseOracleDataQueryOptions）
- [x] `src/hooks/index.ts` 导出已更新，包含向后兼容别名
- [x] 所有使用该 hook 的文件已更新导入

## Phase 2: 统一错误类定义

- [x] `NotImplementedError` 已添加到 `src/lib/errors/BusinessErrors.ts`
- [x] `NotImplementedError` 已从 `src/lib/errors/index.ts` 导出
- [x] `src/lib/errors.ts` re-export 文件已删除
- [x] 所有 `from '@/lib/errors'` 导入仍然有效

## Phase 3: 消除常量重复

- [x] 已审计 `src/lib/constants/index.ts` 和 `src/types/oracle/constants.ts`
- [x] 已识别并记录重复或相似的常量
- [x] 已确定每个常量的正确归属位置
- [x] 结论：两个文件职责不同，无需合并
  - `src/lib/constants/index.ts` - 运行时常量（providerNames, chainNames, chainColors 等）
  - `src/types/oracle/constants.ts` - 类型定义相关常量（TimeRange, DataStatus 等）

## Phase 4: 验证

- [x] TypeScript 编译无新增错误（遗留错误与本次清理无关）
- [x] ESLint 检查无新增错误
- [x] 无残留的旧命名或导入路径
- [x] 所有测试框架错误为遗留问题（vitest 模块未安装）

## 额外修复

在清理过程中，还修复了以下遗留的导入路径问题：

- [x] `src/lib/snapshots/database.ts` - 更新为 `@/types/oracle` 导入
- [x] `src/lib/snapshots/index.ts` - 更新为 `@/types/oracle` 和 `@/types/common` 导入
- [x] `src/lib/snapshots/migration.ts` - 更新为 `@/types/oracle` 导入
- [x] `src/lib/supabase/auth.ts` - 更新为 `@/types/oracle` 导入
- [x] `src/lib/supabase/queries.ts` - 更新为 `@/types/oracle` 导入
- [x] `src/lib/realtime/priceAlerts.ts` - 修复 PriceData 类型引用
- [x] `src/lib/realtime/index.ts` - 修复导出类型名称
- [x] `src/components/oracle/index.ts` - 修复重复导出问题
- [x] `src/components/oracle/indicators/RSIIndicator.tsx` - 修复导出冲突
