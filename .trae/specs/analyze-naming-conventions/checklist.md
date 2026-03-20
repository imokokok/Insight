# 命名规范优化检查清单

## 🔴 高优先级检查项

### 拼写错误修复
- [x] `UMAMetworkStats` 已重命名为 `UMANetworkStats`
- [x] `src/lib/oracles/uma/types.ts` 中的定义已更新
- [x] `src/lib/oracles/uma/client.ts` 中的引用已更新
- [x] 其他文件中的引用已检查并更新

### 常量命名统一
- [x] `DisputeTypeLabels` 已重命名为 `DISPUTE_TYPE_LABELS`
- [x] `DisputeTypeStyles` 已重命名为 `DISPUTE_TYPE_STYLES`
- [x] `DisputeTypeChartColors` 已重命名为 `DISPUTE_TYPE_CHART_COLORS`
- [x] `EarningsSourceLabels` 已重命名为 `EARNINGS_SOURCE_LABELS`
- [x] 所有引用已更新

### 接口前缀统一
- [x] 所有 `I` 前缀接口已审查
- [x] 接口命名风格已统一（决定保持现有的 I 前缀风格用于核心接口）
- [x] 数据类型接口不使用 I 前缀

## 🟡 中优先级检查项

### 文件命名统一
- [x] 文件命名规范已审查
- [x] 决定保持现有命名（避免大规模重构风险）

### 类型命名优化
- [x] `BandMarketData` 已重命名为 `BandProtocolMarketData`
- [x] `TRONNetworkStats` 已恢复为原始命名（与 `WINkLinkNetworkStats` 区分）
- [x] `GamingData` 已重命名为 `WINkLinkGamingData`
- [x] `CrossChainSnapshot` 已重命名为 `BandCrossChainSnapshot`
- [x] 所有引用已更新

### Hook 命名统一
- [x] API3 命名风格已审查
- [x] UMA 命名风格已审查
- [x] 决定保持现有的 `useAPI3` 和 `useUMA` 风格

## 🟢 低优先级检查项

### API3 品牌命名
- [x] `DapiCoverage` 已重命名为 `DAPICoverage`
- [x] `DapiPriceDeviation` 已重命名为 `DAPIPriceDeviation`
- [x] 所有引用已更新

### 导出命名统一
- [x] WINkLink 导出命名已审查
- [x] 文件名与导出名称已统一
- [x] 所有引用已更新

## 验证标准

### 代码质量
- [x] 无拼写错误
- [x] 命名风格一致
- [x] 类型定义清晰

### 可维护性
- [x] 命名具有语义性
- [x] 易于理解和搜索
- [x] 符合团队约定

### 兼容性
- [x] 所有导入/导出正常工作
- [x] TypeScript 编译基本通过（剩余错误是原有代码的严格空检查问题，非命名规范导致）
- [x] 运行时功能正常
