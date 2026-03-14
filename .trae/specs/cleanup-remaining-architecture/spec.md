# 清理剩余旧架构并更新导入 Spec

## Why
架构优化后，仍有一些旧架构残留需要清理：
1. `useOracleDataSWR.ts` 文件虽然已迁移到 React Query，但文件名和导出仍使用 "SWR" 命名
2. `src/lib/errors.ts` 是一个 re-export 文件，应将 `NotImplementedError` 移到正确的位置并统一导入路径
3. `src/lib/constants/index.ts` 与 `@/types/oracle/constants.ts` 存在职责重叠
4. 14 个文件仍使用 `@/lib/errors` 导入，应统一到 `@/lib/errors/index` 或创建 `@/types/errors`

## What Changes
- 重命名 `useOracleDataSWR.ts` 为 `useOracleDataQuery.ts`（反映 React Query 实现）
- 将 `NotImplementedError` 移到 `src/lib/errors/BusinessErrors.ts`
- 删除 `src/lib/errors.ts` re-export 文件
- 更新所有 `@/lib/errors` 导入为 `@/lib/errors/index` 或保持现有路径
- 检查并消除 `src/lib/constants/` 与 `src/types/oracle/constants.ts` 之间的重复

## Impact
- Affected specs: 错误处理系统、Hooks 命名、常量管理
- Affected code:
  - `src/hooks/useOracleDataSWR.ts` - 将重命名
  - `src/lib/errors.ts` - 将被删除
  - `src/lib/errors/BusinessErrors.ts` - 将添加 NotImplementedError
  - 14 个使用 `@/lib/errors` 的文件
  - `src/lib/constants/index.ts` - 可能需要重构
  - `src/hooks/index.ts` - 需要更新导出

---

## ADDED Requirements

### Requirement: 重命名 SWR 命名的 Hook 文件

系统 SHALL 将 `useOracleDataSWR.ts` 重命名为 `useOracleDataQuery.ts`，因为该文件已迁移到 React Query 实现。

#### Scenario: 重命名 Hook 文件
- **WHEN** 执行清理
- **THEN** `src/hooks/useOracleDataSWR.ts` 重命名为 `src/hooks/useOracleDataQuery.ts`
- **AND** 更新 `src/hooks/index.ts` 中的导出
- **AND** 更新所有使用该 hook 的文件

#### Scenario: 更新类型命名
- **WHEN** 重命名文件
- **THEN** `UseOracleDataSWROptions` 重命名为 `UseOracleDataQueryOptions`
- **AND** `UseOracleDataSWRReturn` 重命名为 `UseOracleDataQueryReturn`
- **AND** `UseOraclePrefetchOptions` 保持不变

---

### Requirement: 统一错误类定义位置

系统 SHALL 将 `NotImplementedError` 移到 `src/lib/errors/BusinessErrors.ts`，并删除 `src/lib/errors.ts` re-export 文件。

#### Scenario: 移动 NotImplementedError
- **WHEN** 执行清理
- **THEN** `NotImplementedError` 类移到 `src/lib/errors/BusinessErrors.ts`
- **AND** 从 `src/lib/errors/index.ts` 导出

#### Scenario: 删除 re-export 文件
- **WHEN** NotImplementedError 已移动
- **THEN** `src/lib/errors.ts` 文件被删除
- **AND** 所有 `from '@/lib/errors'` 导入保持有效（通过 `@/lib/errors/index`）

---

### Requirement: 更新错误导入路径

系统 SHALL 确保所有错误类导入使用统一路径 `@/lib/errors`（指向 `@/lib/errors/index`）。

#### Scenario: 验证导入路径
- **WHEN** 文件导入错误类
- **THEN** 使用 `from '@/lib/errors'` 或 `from '@/lib/errors/index'`
- **AND** 所有错误类可正确导入

---

### Requirement: 消除常量重复定义

系统 SHALL 检查并消除 `src/lib/constants/` 与 `src/types/oracle/constants.ts` 之间的重复定义。

#### Scenario: 审计常量定义
- **WHEN** 执行清理
- **THEN** 识别两个文件中的重复常量
- **AND** 确定每个常量的正确归属位置

#### Scenario: 统一常量位置
- **WHEN** 发现重复
- **THEN** 保留语义更合适的位置
- **AND** 更新所有导入路径

---

## MODIFIED Requirements

### Requirement: Hooks 导出规范化

系统 SHALL 确保所有 hooks 从 `src/hooks/index.ts` 统一导出，命名清晰反映实现方式。

原导出使用 SWR 命名：
```typescript
export { useOracleDataSWR, useOraclePrefetch } from './useOracleDataSWR';
```

现导出使用 Query 命名：
```typescript
export { useOracleDataQuery, useOraclePrefetch } from './useOracleDataQuery';
// 保持向后兼容的别名导出
export { useOracleDataQuery as useOracleDataSWR } from './useOracleDataQuery';
```

---

## REMOVED Requirements

### Requirement: 保留 SWR 命名
**Reason**: 文件已迁移到 React Query 实现，命名应反映实际实现
**Migration**: 使用新的 hook 名称或兼容别名
