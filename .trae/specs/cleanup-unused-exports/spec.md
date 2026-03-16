# 清理未使用代码 Spec

## Why
项目中存在大量已导出但从未被使用的代码，包括别名导出、辅助函数、hooks 和 store 选择器。这些代码增加了代码库的维护负担，降低了代码可读性。

## What Changes
- 移除 `hooks/index.ts` 中未使用的别名导出和 hooks 导出
- 移除 `components/oracle/common/index.ts` 中未使用的辅助函数导出
- 移除 `stores/index.ts` 中未使用的 uiStore 和 selectors 相关导出
- 保留实际被使用的代码

## Impact
- Affected code: 
  - `src/hooks/index.ts`
  - `src/components/oracle/common/index.ts`
  - `src/stores/index.ts`

## ADDED Requirements

### Requirement: 清理未使用的 Hooks 导出
系统 SHALL 移除 `src/hooks/index.ts` 中以下未使用的导出：
- `useAPI3WebSocketPrice`, `useAPI3WebSocketPrices`, `useAPI3WebSocketRealtime` (API3 WebSocket 别名)
- `useOracleDataSWR`, `useOraclePrefetch` (Oracle 数据查询相关)
- `useAutoRefresh` (自动刷新 hook)
- `useMultiplePrices` (多价格 hook)

#### Scenario: 移除未使用的 hooks 导出
- **WHEN** 检查 hooks/index.ts 中的导出
- **THEN** 移除上述未使用的导出，保留被实际使用的导出

### Requirement: 清理未使用的组件辅助函数导出
系统 SHALL 移除 `src/components/oracle/common/index.ts` 中以下未使用的导出：
- `getAnnotationColor`, `getAnnotationIcon`, `getImportanceLabel`, `getTypeLabel`, `formatDate` (ChartAnnotations 辅助函数)
- `chainlinkMilestones`, `chainlinkMilestonesData`, `getChainlinkMilestonesWithTranslation` (Chainlink 里程碑数据)
- `ChartAnnotationOverlay` (图表注释覆盖组件)

#### Scenario: 移除未使用的辅助函数导出
- **WHEN** 检查 components/oracle/common/index.ts 中的导出
- **THEN** 移除上述未使用的导出，这些函数仅在 ChartAnnotations.tsx 内部使用

### Requirement: 清理未使用的 Store 导出
系统 SHALL 移除 `src/stores/index.ts` 中以下未使用的导出：
- 所有 uiStore 相关导出 (`useUIStore`, `useSidebar`, `useSidebarActions`, `useModal`, `useModalActions`, `useNotifications`, `useNotificationActions`, `useTheme`, `useThemeActions`, `useIsMobile`, `useSetIsMobile`)
- 大量 selectors 相关导出（保留被 cross-chain 页面使用的）

#### Scenario: 移除未使用的 store 导出
- **WHEN** 检查 stores/index.ts 中的导出
- **THEN** 移除未被任何文件导入的 uiStore 和 selectors 导出

## MODIFIED Requirements
无

## REMOVED Requirements
无
