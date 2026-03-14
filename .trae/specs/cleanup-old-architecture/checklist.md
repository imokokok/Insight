# 清理旧架构检查清单

## Phase 1: 更新导入路径

- [x] 所有 `@/lib/types/oracle` 导入已更新为 `@/types/oracle`
- [x] 所有 `@/lib/types/oracleTypes` 导入已更新为正确路径
- [x] 所有 `@/lib/types/recharts` 导入已更新为 `@/types/ui/recharts`
- [x] 所有 `@/lib/types/snapshot` 导入已更新为 `@/types/oracle`
- [x] 无文件包含旧的 `@/lib/types/` 导入路径

## Phase 2: 删除旧文件

- [x] `src/lib/types/oracle.ts` 已删除
- [x] `src/lib/types/oracleTypes.ts` 已删除
- [x] `src/lib/types/recharts.ts` 已删除
- [x] `src/lib/types/snapshot.ts` 已删除
- [x] `src/lib/types/` 目录已删除（或为空）
- [x] `src/providers/SWRProvider.tsx` 已删除

## Phase 3: 清理依赖

- [x] `swr` 依赖已从 package.json 移除
- [x] package-lock.json 已更新

## Phase 4: 验证

- [x] TypeScript 编译无错误
- [x] ESLint 检查无错误
- [x] 项目构建成功
- [x] 无残留的旧导入路径