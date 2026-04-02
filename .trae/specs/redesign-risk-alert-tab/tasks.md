# Tasks

## Phase 1: 核心组件开发

- [x] Task 1: 创建风险概览仪表盘组件
  - [x] SubTask 1.1: 创建 `RiskOverviewHeader.tsx` - 紧凑的风险概览栏
  - [x] SubTask 1.2: 实现风险等级指示器（高/中/低/安全）
  - [x] SubTask 1.3: 实现关键指标展示（异常数、最大偏差、风险评分）
  - [x] SubTask 1.4: 实现安全状态展示

- [x] Task 2: 创建风险热力图组件
  - [x] SubTask 2.1: 创建 `RiskHeatmap.tsx` - 预言机风险热力图
  - [x] SubTask 2.2: 实现颜色编码逻辑（红/橙/黄/绿）
  - [x] SubTask 2.3: 实现悬停详情提示
  - [x] SubTask 2.4: 添加响应式布局支持

- [x] Task 3: 创建风险趋势图表组件
  - [x] SubTask 3.1: 创建 `RiskTrendChart.tsx` - 风险趋势折线图
  - [x] SubTask 3.2: 集成 Recharts 实现趋势可视化
  - [x] SubTask 3.3: 实现时间范围切换（1H/24H/7D）
  - [x] SubTask 3.4: 添加风险事件标注

- [x] Task 4: 创建风险详情表格组件
  - [x] SubTask 4.1: 创建 `RiskDetailsTable.tsx` - 专业风险详情表格
  - [x] SubTask 4.2: 实现排序功能（按风险等级）
  - [x] SubTask 4.3: 实现展开/收起详情功能
  - [x] SubTask 4.4: 添加行内操作按钮

- [x] Task 5: 创建智能风险建议面板
  - [x] SubTask 5.1: 创建 `RiskRecommendations.tsx` - 智能建议面板
  - [x] SubTask 5.2: 实现建议生成逻辑
  - [x] SubTask 5.3: 实现优先级分类（立即处理/建议关注/持续监控）
  - [x] SubTask 5.4: 添加操作按钮（导出报告等）

- [x] Task 6: 创建风险指标卡片组
  - [x] SubTask 6.1: 创建 `RiskMetricsGrid.tsx` - 核心指标卡片组
  - [x] SubTask 6.2: 实现4个核心指标：波动率、一致性、敏感度、健康度
  - [x] SubTask 6.3: 添加趋势指示器（上升/下降/稳定）
  - [x] SubTask 6.4: 实现指标阈值颜色编码

## Phase 2: 主 Tab 重构

- [x] Task 7: 完全重写 RiskAlertTab 组件
  - [x] SubTask 7.1: 整合所有新组件到 RiskAlertTab
  - [x] SubTask 7.2: 实现新的视觉层次布局
  - [x] SubTask 7.3: 添加组件间数据联动
  - [x] SubTask 7.4: 实现响应式布局适配

- [x] Task 8: 优化 RiskAlertDashboard 组件
  - [x] SubTask 8.1: 简化 RiskAlertDashboard 代码
  - [x] SubTask 8.2: 统一与 RiskAlertTab 的视觉风格
  - [x] SubTask 8.3: 优化性能（React.memo, useMemo）

## Phase 3: 数据与类型

- [x] Task 9: 扩展风险相关类型定义
  - [x] SubTask 9.1: 在 `types/risk.ts` 添加新类型
  - [x] SubTask 9.2: 添加风险趋势数据类型
  - [x] SubTask 9.3: 添加风险建议类型

- [x] Task 10: 创建风险数据 Hook
  - [x] SubTask 10.1: 创建 `useRiskTrends.ts` - 风险趋势数据
  - [x] SubTask 10.2: 创建 `useRiskMetrics.ts` - 风险指标计算
  - [x] SubTask 10.3: 创建 `useRiskRecommendations.ts` - 建议生成

## Phase 4: 国际化与文案

- [x] Task 11: 更新国际化文案
  - [x] SubTask 11.1: 更新中文文案（专业术语）
  - [x] SubTask 11.2: 更新英文文案
  - [x] SubTask 11.3: 添加新组件所需文案

## Phase 5: 测试与优化

- [x] Task 12: 运行 lint 和类型检查
  - [x] SubTask 12.1: 运行 ESLint 检查
  - [x] SubTask 12.2: 运行 TypeScript 类型检查
  - [x] SubTask 12.3: 修复所有错误和警告

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 1
- Task 4 依赖于 Task 1
- Task 5 依赖于 Task 4
- Task 7 依赖于 Task 1, 2, 3, 4, 5, 6
- Task 8 依赖于 Task 7
- Task 10 依赖于 Task 9
- Task 11 依赖于 Task 7
- Task 12 依赖于 Task 7, 8, 10, 11

# 可以并行的任务

- Task 1, 6 可以并行开发
- Task 2, 3, 4 可以并行开发
- Task 9 可以与其他任务并行
