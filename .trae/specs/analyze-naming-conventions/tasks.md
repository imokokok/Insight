# Tasks

## 🔴 高优先级任务

### Task 1: 修复拼写错误
**描述**: 修复 `UMAMetworkStats` 拼写错误
- [ ] SubTask 1.1: 在 `src/lib/oracles/uma/types.ts` 中重命名 `UMAMetworkStats` 为 `UMANetworkStats`
- [ ] SubTask 1.2: 在 `src/lib/oracles/uma/client.ts` 中更新所有引用
- [ ] SubTask 1.3: 检查并更新其他文件中可能的引用

### Task 2: 统一常量命名风格
**描述**: 将所有常量统一为 UPPER_SNAKE_CASE
- [ ] SubTask 2.1: 重命名 `src/lib/oracles/uma/types.ts` 中的 `DisputeTypeLabels` 为 `DISPUTE_TYPE_LABELS`
- [ ] SubTask 2.2: 重命名 `src/lib/oracles/uma/types.ts` 中的 `DisputeTypeStyles` 为 `DISPUTE_TYPE_STYLES`
- [ ] SubTask 2.3: 重命名 `src/lib/oracles/uma/types.ts` 中的 `DisputeTypeChartColors` 为 `DISPUTE_TYPE_CHART_COLORS`
- [ ] SubTask 2.4: 重命名 `src/lib/oracles/uma/types.ts` 中的 `EarningsSourceLabels` 为 `EARNINGS_SOURCE_LABELS`
- [ ] SubTask 2.5: 更新所有引用这些常量的文件

### Task 3: 统一接口前缀风格
**描述**: 移除接口的 I 前缀，保持命名一致性
- [ ] SubTask 3.1: 检查所有使用 `I` 前缀的接口定义
- [ ] SubTask 3.2: 重命名 `IOracleClient` 等相关接口（如果不符合现有规范）
- [ ] SubTask 3.3: 更新所有引用

## 🟡 中优先级任务

### Task 4: 统一文件命名风格
**描述**: 统一 oracle 文件的命名风格
- [ ] SubTask 4.1: 决定命名规范（camelCase 或 kebab-case）
- [ ] SubTask 4.2: 重命名 `bandProtocol.ts` 为 `band-protocol.ts`（如选择 kebab-case）
- [ ] SubTask 4.3: 重命名 `pythNetwork.ts` 为 `pyth-network.ts`
- [ ] SubTask 4.4: 重命名 `pythHermesClient.ts` 为 `pyth-hermes-client.ts`
- [ ] SubTask 4.5: 更新所有导入语句

### Task 5: 优化类型命名
**描述**: 优化模糊或过于宽泛的类型名
- [ ] SubTask 5.1: 重命名 `BandMarketData` 为 `BandProtocolMarketData`
- [ ] SubTask 5.2: 重命名 `TRONNetworkStats` 为 `WINkLinkNetworkStats`
- [ ] SubTask 5.3: 重命名 `GamingData` 为 `WINkLinkGamingData`
- [ ] SubTask 5.4: 重命名 `CrossChainSnapshot` 为 `BandCrossChainSnapshot`
- [ ] SubTask 5.5: 更新所有引用

### Task 6: 统一 Hook 命名风格
**描述**: 统一 Hook 中缩写的大小写风格
- [ ] SubTask 6.1: 决定 API3 的命名风格（`useAPI3Price` 或 `useApi3Price`）
- [ ] SubTask 6.2: 决定 UMA 的命名风格（`useUMARealtime` 或 `useUmaRealtime`）
- [ ] SubTask 6.3: 统一所有相关 Hook 的命名
- [ ] SubTask 6.4: 更新所有引用

## 🟢 低优先级任务

### Task 7: 优化 API3 品牌命名
**描述**: 遵循 API3 品牌规范，dAPI 应正确大写
- [ ] SubTask 7.1: 重命名 `DapiCoverage` 为 `DAPICoverage` 或 `DApiCoverage`
- [ ] SubTask 7.2: 重命名 `DapiPriceDeviation` 为 `DAPIPriceDeviation` 或 `DApiPriceDeviation`
- [ ] SubTask 7.3: 更新所有引用

### Task 8: 统一导出命名
**描述**: 统一 WINkLink 相关的命名
- [ ] SubTask 8.1: 决定使用 `WINkLinkClient` 还是 `WinklinkClient`
- [ ] SubTask 8.2: 确保文件名与导出名称一致
- [ ] SubTask 8.3: 更新所有引用

# Task Dependencies

- Task 1 (拼写错误) 不依赖其他任务，可立即开始
- Task 2 (常量命名) 建议在 Task 1 之后进行
- Task 3 (接口前缀) 可以独立进行
- Task 4 (文件命名) 建议在 Task 5 之前完成
- Task 5 (类型命名) 依赖 Task 4 的文件命名决定
- Task 6 (Hook 命名) 可以独立进行
- Task 7 (API3 品牌) 可以独立进行
- Task 8 (导出命名) 建议在 Task 4 之后进行
