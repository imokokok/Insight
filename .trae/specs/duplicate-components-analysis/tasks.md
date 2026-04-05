# Tasks

## 高优先级任务

- [x] Task 1: 提取 Hero 组件共享子组件
  - [x] SubTask 1.1: 创建 `src/components/oracle/shared/HeroComponents/` 目录
  - [x] SubTask 1.2: 提取 `Sparkline` 组件到共享文件
  - [x] SubTask 1.3: 提取 `EnhancedCoreStats` 组件到共享文件
  - [x] SubTask 1.4: 提取 `CompactMetricsRow` 组件到共享文件
  - [x] SubTask 1.5: 提取 `UnifiedInfoSection` 组件到共享文件
  - [x] SubTask 1.6: 提取 `ActionButtons` 组件到共享文件
  - [x] SubTask 1.7: 提取 `MiniPriceChart` 组件到共享文件
  - [x] SubTask 1.8: 创建 `index.ts` 统一导出
  - [x] SubTask 1.9: 更新 ChainlinkHero.tsx 使用共享组件
  - [x] SubTask 1.10: 更新 API3Hero.tsx 使用共享组件
  - [x] SubTask 1.11: 更新 PythHero.tsx 使用共享组件
  - [x] SubTask 1.12: 更新 DIAHero.tsx 使用共享组件
  - [x] SubTask 1.13: 更新 RedStoneHero.tsx 使用共享组件
  - [x] SubTask 1.14: 更新其他 Hero 组件（WinklinkHero, UMAHero, TellorHero, ChronicleHero, BandProtocolHero）

- [x] Task 2: 统一 ErrorBoundary 组件
  - [x] SubTask 2.1: 审计所有 ErrorBoundary 使用位置
  - [x] SubTask 2.2: 增强 `src/components/error-boundary/ErrorBoundary.tsx` 支持主题色
  - [x] SubTask 2.3: 创建 `OracleErrorBoundary` 作为便捷封装
  - [x] SubTask 2.4: 删除 `src/app/[locale]/cross-oracle/components/ErrorBoundary.tsx`
  - [x] SubTask 2.5: 删除 `src/app/[locale]/cross-oracle/components/ErrorFallback.tsx`
  - [x] SubTask 2.6: 更新所有引用使用新的统一组件

## 中优先级任务

- [x] Task 3: 统一 ChartToolbar 组件
  - [x] SubTask 3.1: 分析三个 ChartToolbar 的功能差异
  - [x] SubTask 3.2: 创建 `OracleChartToolbar` 作为 Oracle 专用组件
  - [x] SubTask 3.3: 更新 PriceChart/index.tsx 使用新组件
  - [x] SubTask 3.4: 更新 InteractivePriceChart.tsx 使用新组件
  - [x] SubTask 3.5: 删除 `EnhancedChartToolbar.tsx`
  - [x] SubTask 3.6: 删除 `PriceChart/ChartToolbar.tsx`

- [x] Task 4: 统一卡片类组件
  - [x] SubTask 4.1: 分析 DashboardCard 和 ui/StatCard 的差异
  - [x] SubTask 4.2: 创建 `ScoreCard` 基础组件
  - [x] SubTask 4.3: 重构 `RiskScoreCard` 使用 ScoreCard
  - [x] SubTask 4.4: 重构 `DataQualityScoreCard` 使用 ScoreCard

## 低优先级任务

- [x] Task 5: 统一 Loading/Skeleton 组件
  - [x] SubTask 5.1: 审计所有加载状态组件
  - [x] SubTask 5.2: 重构 LoadingState 使用 Skeleton
  - [x] SubTask 5.3: 创建统一的加载状态配置（LoadingStates.tsx）

# Task Dependencies
- Task 2 依赖 Task 1 完成（避免同时修改大量文件）
- Task 3 和 Task 4 可以并行进行
- Task 5 可以在任何时候进行
