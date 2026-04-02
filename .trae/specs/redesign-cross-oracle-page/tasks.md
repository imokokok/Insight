# Tasks

## Phase 1: 创建新的核心组件

- [x] Task 1: 创建风险预警仪表盘组件
  - [x] SubTask 1.1: 创建 `RiskAlertDashboard.tsx` - 顶部风险预警卡片
  - [x] SubTask 1.2: 实现异常统计展示（数量、等级分布）
  - [x] SubTask 1.3: 实现安全状态展示（无异常时）
  - [x] SubTask 1.4: 添加快速跳转功能

- [x] Task 2: 创建数据质量仪表盘组件
  - [x] SubTask 2.1: 创建 `QualityDashboard.tsx` - 质量评分仪表盘
  - [x] SubTask 2.2: 实现综合评分大数字展示
  - [x] SubTask 2.3: 实现三维度评分卡片
  - [x] SubTask 2.4: 添加改进建议展示

- [x] Task 3: 创建预言机对比矩阵组件
  - [x] SubTask 3.1: 创建 `OracleComparisonMatrix.tsx`
  - [x] SubTask 3.2: 实现特性对比表格
  - [x] SubTask 3.3: 添加特性标签展示
  - [x] SubTask 3.4: 实现悬停详情提示

- [x] Task 4: 重构 ControlPanel
  - [x] SubTask 4.1: 简化界面，移除不必要选项
  - [x] SubTask 4.2: 优化币种选择器展示
  - [x] SubTask 4.3: 优化预言机选择器展示
  - [x] SubTask 4.4: 添加快速选择按钮（如"主流预言机"）

- [x] Task 5: 重构价格展示组件
  - [x] SubTask 5.1: 创建 `SimplePriceTable.tsx` - 简化版价格表格
  - [x] SubTask 5.2: 只保留核心列（预言机、价格、偏差、状态）
  - [x] SubTask 5.3: 突出异常价格展示
  - [x] SubTask 5.4: 添加中位数价格卡片

- [x] Task 6: 重构 HeaderSection
  - [x] SubTask 6.1: 简化头部信息
  - [x] SubTask 6.2: 添加页面标题和描述
  - [x] SubTask 6.3: 保留收藏和导出功能

- [x] Task 7: 重写主页面布局
  - [x] SubTask 7.1: 实现新的布局结构（左侧边栏+右侧主区域）
  - [x] SubTask 7.2: 整合风险预警仪表盘（顶部）
  - [x] SubTask 7.3: 整合质量评分仪表盘
  - [x] SubTask 7.4: 整合价格对比区
  - [x] SubTask 7.5: 整合预言机对比矩阵
  - [x] SubTask 7.6: 移除 Tab 相关代码
  - [x] SubTask 7.7: 添加锚点导航

- [x] Task 8: 更新 useCrossOraclePage hook
  - [x] SubTask 8.1: 简化状态管理
  - [x] SubTask 8.2: 移除 Tab 相关状态
  - [x] SubTask 8.3: 优化数据流

## Phase 4: 清理和优化

- [x] Task 9: 删除冗余组件
  - [x] SubTask 9.1: 删除 StatsOverview
  - [x] SubTask 9.2: 删除 StatsSection
  - [x] SubTask 9.3: 删除 ComparisonTabs
  - [x] SubTask 9.4: 删除 TabNavigation
  - [x] SubTask 9.5: 删除旧的 Tab 组件

- [x] Task 10: 更新国际化文案
  - [x] SubTask 10.1: 更新中文文案
  - [x] SubTask 10.2: 更新英文文案
  - [x] SubTask 10.3: 添加新组件文案

- [x] Task 11: 性能优化
  - [x] SubTask 11.1: 添加 React.memo 优化
  - [x] SubTask 11.2: 优化 useMemo/useCallback
  - [x] SubTask 11.3: 运行 lint 检查

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 1
- Task 7 依赖于 Task 1, 2, 3, 4, 5, 6
- Task 8 依赖于 Task 7
- Task 9 依赖于 Task 7
- Task 10 依赖于 Task 7
- Task 11 依赖于 Task 10

# 可以并行的任务

- Task 1, 4, 5, 6 可以并行开发
- Task 2, 3 可以并行开发
