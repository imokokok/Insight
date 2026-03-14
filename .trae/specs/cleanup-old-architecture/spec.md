# 清理旧架构文件并更新导入 Spec

## Why
架构优化后，旧的类型文件和 SWR Provider 仍然存在，且有 84 个文件仍在使用旧的导入路径 `@/lib/types/`。需要清理这些旧文件并统一导入路径到新的 `@/types/` 目录。

## What Changes
- 删除旧的类型文件（`src/lib/types/` 目录下的 re-export 文件）
- 删除不再使用的 `SWRProvider.tsx`
- 更新所有 84 个文件的导入路径从 `@/lib/types/` 到 `@/types/`
- 清理 `package.json` 中不再使用的 `swr` 依赖

## Impact
- Affected specs: 类型系统、依赖管理
- Affected code: 
  - `src/lib/types/` - 将被删除
  - `src/providers/SWRProvider.tsx` - 将被删除
  - 84 个使用旧导入路径的文件

---

## ADDED Requirements

### Requirement: 删除旧的类型文件

系统 SHALL 移除 `src/lib/types/` 目录下的所有 re-export 文件，因为这些类型已迁移到 `src/types/` 目录。

#### Scenario: 删除 oracle.ts
- **WHEN** 执行清理
- **THEN** `src/lib/types/oracle.ts` 被删除
- **AND** 所有导入更新为 `@/types/oracle`

#### Scenario: 删除 oracleTypes.ts
- **WHEN** 执行清理
- **THEN** `src/lib/types/oracleTypes.ts` 被删除
- **AND** 所有导入更新为 `@/types/oracle` 或 `@/types/ui`

#### Scenario: 删除 recharts.ts
- **WHEN** 执行清理
- **THEN** `src/lib/types/recharts.ts` 被删除
- **AND** 所有导入更新为 `@/types/ui/recharts`

#### Scenario: 删除 snapshot.ts
- **WHEN** 执行清理
- **THEN** `src/lib/types/snapshot.ts` 被删除
- **AND** 所有导入更新为 `@/types/oracle`

---

### Requirement: 删除 SWR Provider

系统 SHALL 移除不再使用的 SWRProvider 文件。

#### Scenario: 删除 SWRProvider.tsx
- **WHEN** 执行清理
- **THEN** `src/providers/SWRProvider.tsx` 被删除
- **AND** 确认 layout.tsx 中已无引用

---

### Requirement: 更新所有导入路径

系统 SHALL 将所有从 `@/lib/types/` 的导入更新为 `@/types/`。

#### Scenario: 更新类型导入
- **WHEN** 文件包含 `from '@/lib/types/oracle'`
- **THEN** 更新为 `from '@/types/oracle'`

#### Scenario: 更新 oracleTypes 导入
- **WHEN** 文件包含 `from '@/lib/types/oracleTypes'`
- **THEN** 更新为 `from '@/types/oracle'` 或 `from '@/types/ui'`

#### Scenario: 更新 recharts 导入
- **WHEN** 文件包含 `from '@/lib/types/recharts'`
- **THEN** 更新为 `from '@/types/ui/recharts'`

#### Scenario: 更新 snapshot 导入
- **WHEN** 文件包含 `from '@/lib/types/snapshot'`
- **THEN** 更新为 `from '@/types/oracle'`

---

### Requirement: 清理依赖

系统 SHALL 从 package.json 中移除不再使用的 swr 依赖。

#### Scenario: 移除 swr 依赖
- **WHEN** 执行清理
- **THEN** `swr` 从 dependencies 中移除

---

## REMOVED Requirements

### Requirement: 保留旧的类型 re-export
**Reason**: 新的类型目录结构已完善，re-export 文件不再需要
**Migration**: 所有导入路径更新到新位置
