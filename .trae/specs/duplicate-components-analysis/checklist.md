# 重复组件分析与复用检查清单

## Hero 组件共享子组件检查

- [x] `Sparkline` 组件已提取到共享文件
- [x] `EnhancedCoreStats` 组件已提取到共享文件
- [x] `CompactMetricsRow` 组件已提取到共享文件
- [x] `UnifiedInfoSection` 组件已提取到共享文件
- [x] `ActionButtons` 组件已提取到共享文件
- [x] `MiniPriceChart` 组件已提取到共享文件
- [x] `index.ts` 统一导出文件已创建
- [x] ChainlinkHero.tsx 已更新使用共享组件
- [x] API3Hero.tsx 已更新使用共享组件
- [x] PythHero.tsx 已更新使用共享组件
- [x] DIAHero.tsx 已更新使用共享组件
- [x] RedStoneHero.tsx 已更新使用共享组件
- [x] 其他 Hero 组件已更新（WinklinkHero, UMAHero, TellorHero, ChronicleHero, BandProtocolHero）

## ErrorBoundary 组件检查

- [x] 所有 ErrorBoundary 使用位置已审计
- [x] `src/components/error-boundary/ErrorBoundary.tsx` 已支持主题色
- [x] `OracleErrorBoundary` 便捷封装已创建
- [x] `src/app/[locale]/cross-oracle/components/ErrorBoundary.tsx` 已删除
- [x] `src/app/[locale]/cross-oracle/components/ErrorFallback.tsx` 已删除
- [x] 所有引用已更新使用新的统一组件

## ChartToolbar 组件检查

- [x] 三个 ChartToolbar 的功能差异已分析
- [x] `OracleChartToolbar` 已创建
- [x] `EnhancedChartToolbar.tsx` 已删除
- [x] `PriceChart/ChartToolbar.tsx` 已删除
- [x] 所有引用已更新

## 卡片类组件检查

- [x] DashboardCard 和 ui/StatCard 的差异已分析
- [x] `ScoreCard` 基础组件已创建
- [x] `RiskScoreCard` 已重构使用 ScoreCard
- [x] `DataQualityScoreCard` 已重构使用 ScoreCard

## Loading/Skeleton 组件检查

- [x] 所有加载状态组件已审计
- [x] `LoadingState` 已重构使用 Skeleton
- [x] `LoadingStates.tsx` 统一加载状态配置已创建

## 代码质量检查

- [x] TypeScript 编译通过
- [x] 无循环依赖
- [x] 所有导入路径正确
- [x] 组件功能正常
