# Tasks

## Phase 1: 基础架构和类型定义

- [x] Task 1: 更新类型定义和常量
  - [x] SubTask 1.1: 更新 `src/app/[locale]/cross-oracle/types/index.ts`，添加风险预警相关类型
  - [x] SubTask 1.2: 更新 `src/app/[locale]/cross-oracle/constants.ts`，简化 Tab 定义，添加风险阈值常量
  - [x] SubTask 1.3: 创建 `src/app/[locale]/cross-oracle/hooks/useCommonSymbols.ts`，实现动态币种筛选逻辑

## Phase 2: 核心功能开发

- [x] Task 2: 实现动态币种选择器
  - [x] SubTask 2.1: 创建 `src/app/[locale]/cross-oracle/hooks/useCommonSymbols.ts` Hook
  - [x] SubTask 2.2: 根据已选预言机计算共同支持的币种列表
  - [x] SubTask 2.3: 在 ControlPanel 中集成动态币种选择器
  - [x] SubTask 2.4: 添加无共同币种时的提示UI

- [x] Task 3: 实现价格异常风险预警系统
  - [x] SubTask 3.1: 创建 `src/app/[locale]/cross-oracle/hooks/usePriceAnomalyDetection.ts` Hook
  - [x] SubTask 3.2: 实现价格偏差检测算法（阈值：>1%标记为异常）
  - [x] SubTask 3.3: 实现数据延迟检测逻辑
  - [x] SubTask 3.4: 创建 `src/app/[locale]/cross-oracle/components/RiskAlertBanner.tsx` 组件
  - [x] SubTask 3.5: 在价格表格中标记异常数据

- [x] Task 4: 实现数据质量评分系统
  - [x] SubTask 4.1: 创建 `src/app/[locale]/cross-oracle/hooks/useDataQualityScore.ts` Hook
  - [x] SubTask 4.2: 实现一致性评分算法（基于标准差）
  - [x] SubTask 4.3: 实现新鲜度评分算法（基于最后更新时间）
  - [x] SubTask 4.4: 实现完整性评分算法（基于成功响应率）
  - [x] SubTask 4.5: 创建 `src/app/[locale]/cross-oracle/components/QualityScoreCard.tsx` 组件

## Phase 3: 组件重构

- [x] Task 5: 重构 Tab 结构
  - [x] SubTask 5.1: 重命名 `OverviewTab.tsx` 为 `PriceComparisonTab.tsx`
  - [x] SubTask 5.2: 简化 `PriceComparisonTab.tsx`，移除复杂统计指标
  - [x] SubTask 5.3: 创建新的 `QualityAnalysisTab.tsx`，整合风险预警和质量评分
  - [x] SubTask 5.4: 创建新的 `OracleProfilesTab.tsx`，展示预言机特性
  - [x] SubTask 5.5: 删除 `ChainsTab.tsx` 和 `HistoryTab.tsx`
  - [x] SubTask 5.6: 更新 `TabNavigation.tsx`，使用新的 Tab 定义

- [x] Task 6: 重构 ControlPanel
  - [x] SubTask 6.1: 集成动态币种选择器
  - [x] SubTask 6.2: 添加预言机特性提示（悬停显示）
  - [x] SubTask 6.3: 移除偏差筛选器（移到质量分析 Tab）
  - [x] SubTask 6.4: 移除可访问颜色模式选项

- [x] Task 7: 重构价格表格
  - [x] SubTask 7.1: 更新 `PriceTableSection.tsx`，添加异常标记
  - [x] SubTask 7.2: 简化表格列，突出显示偏差率
  - [x] SubTask 7.3: 添加风险等级颜色标识

## Phase 4: 页面整合

- [x] Task 8: 重构主页面
  - [x] SubTask 8.1: 更新 `page.tsx`，使用新的 Tab 结构
  - [x] SubTask 8.2: 移除历史快照相关逻辑
  - [x] SubTask 8.3: 移除全屏图表功能
  - [x] SubTask 8.4: 更新 `useCrossOraclePage.ts`，简化状态管理
  - [x] SubTask 8.5: 整合风险预警和质量评分数据流

## Phase 5: 国际化和优化

- [x] Task 9: 更新国际化文案
  - [x] SubTask 9.1: 更新 `src/i18n/messages/zh-CN/crossOracle.json`
  - [x] SubTask 9.2: 更新 `src/i18n/messages/en/crossOracle.json`
  - [x] SubTask 9.3: 添加风险预警相关文案
  - [x] SubTask 9.4: 添加质量评分相关文案

- [x] Task 10: 性能优化和清理
  - [x] SubTask 10.1: 删除未使用的组件文件
  - [x] SubTask 10.2: 清理未使用的 hooks
  - [x] SubTask 10.3: 优化重新渲染性能
  - [x] SubTask 10.4: 运行 lint 检查

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 1
- Task 4 依赖于 Task 1
- Task 5 依赖于 Task 3 和 Task 4
- Task 6 依赖于 Task 2
- Task 7 依赖于 Task 3
- Task 8 依赖于 Task 5、Task 6、Task 7
- Task 9 依赖于 Task 8
- Task 10 依赖于 Task 9

# 可以并行的任务

- Task 2、Task 3、Task 4 可以并行开发
- Task 5、Task 6、Task 7 可以并行开发
