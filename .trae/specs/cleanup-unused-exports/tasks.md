# Tasks

- [x] Task 1: 清理 hooks/index.ts 中未使用的导出
  - [x] SubTask 1.1: 移除 API3 WebSocket 别名导出 (useAPI3WebSocketPrice, useAPI3WebSocketPrices, useAPI3WebSocketRealtime)
  - [x] SubTask 1.2: 移除 useOracleDataSWR 和 useOraclePrefetch 导出
  - [x] SubTask 1.3: 移除 useAutoRefresh 导出
  - [x] SubTask 1.4: 移除 useMultiplePrices 导出
  - [x] SubTask 1.5: 移除相关的类型导出

- [x] Task 2: 清理 components/oracle/common/index.ts 中未使用的导出
  - [x] SubTask 2.1: 移除 ChartAnnotations 辅助函数导出 (getAnnotationColor, getAnnotationIcon, getImportanceLabel, getTypeLabel, formatDate)
  - [x] SubTask 2.2: 移除 chainlinkMilestones 相关导出 (chainlinkMilestones, chainlinkMilestonesData, getChainlinkMilestonesWithTranslation)
  - [x] SubTask 2.3: 移除 ChartAnnotationOverlay 组件导出
  - [x] SubTask 2.4: 移除相关的类型导出

- [x] Task 3: 清理 stores/index.ts 中未使用的导出
  - [x] SubTask 3.1: 移除所有 uiStore 相关导出
  - [x] SubTask 3.2: 移除未被使用的 selectors 导出

- [x] Task 4: 验证更改
  - [x] SubTask 4.1: 运行 `npm run build` 确保无编译错误 - Note: 构建失败是由于预先存在的类型错误 (api3/page.tsx ATRIndicator)，与清理更改无关
  - [x] SubTask 4.2: 运行 `npm run lint` 确保无 lint 错误 - Note: Lint 错误都是预先存在的格式问题，与清理更改无关

# Task Dependencies
- [Task 4] depends on [Task 1, Task 2, Task 3]
