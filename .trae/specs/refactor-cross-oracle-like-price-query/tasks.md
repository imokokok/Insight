# Tasks

## Phase 1: 创建查询结果组件 QueryResults

- [x] Task 1: 创建 QueryResults 组件基础结构
  - [x] SubTask 1.1: 创建 `QueryResults.tsx` 文件
  - [x] SubTask 1.2: 定义组件 Props 接口
  - [x] SubTask 1.3: 实现加载状态和空状态
  - [x] SubTask 1.4: 导出组件

- [x] Task 2: 整合风险预警模块到 QueryResults
  - [x] SubTask 2.1: 导入 RiskAlertDashboard 组件
  - [x] SubTask 2.2: 在 QueryResults 顶部整合风险预警展示
  - [x] SubTask 2.3: 确保异常数据正确传递

- [x] Task 3: 整合数据质量检测模块到 QueryResults
  - [x] SubTask 3.1: 导入 QualityDashboard 组件
  - [x] SubTask 3.2: 在 QueryResults 中部整合质量评分展示
  - [x] SubTask 3.3: 确保质量数据正确传递

- [x] Task 4: 整合价格对比模块到 QueryResults
  - [x] SubTask 4.1: 导入 SimplePriceTable 组件
  - [x] SubTask 4.2: 在 QueryResults 下部整合价格对比展示
  - [x] SubTask 4.3: 确保价格数据正确传递

## Phase 2: 重构页面布局

- [x] Task 5: 重构主页面 page.tsx
  - [x] SubTask 5.1: 移除 StatsOverview、StatsSection、ComparisonTabs
  - [x] SubTask 5.2: 实现左右布局（左侧 ControlPanel + 右侧 QueryResults）
  - [x] SubTask 5.3: 简化 HeaderSection 或替换为 QueryHeader
  - [x] SubTask 5.4: 确保所有必要数据传递给 QueryResults

- [x] Task 6: 优化 ControlPanel 组件
  - [x] SubTask 6.1: 确保 ControlPanel 适合作为左侧选择框
  - [x] SubTask 6.2: 优化移动端展示
  - [x] SubTask 6.3: 添加 sticky 定位支持

## Phase 3: 文案清理

- [x] Task 7: 清理中文文案中的套利描述
  - [x] SubTask 7.1: 检查并更新 `zh-CN/crossOracle.json`
  - [x] SubTask 7.2: 移除"套利"、"套利机会"等关键词
  - [x] SubTask 7.3: 替换为"风险预警"、"数据质量"等描述

- [x] Task 8: 清理英文文案中的套利描述
  - [x] SubTask 8.1: 检查并更新 `en/crossOracle.json`
  - [x] SubTask 8.2: 移除"arbitrage"、"opportunity"等关键词
  - [x] SubTask 8.3: 替换为"risk alert"、"data quality"等描述

## Phase 4: 清理和优化

- [x] Task 9: 删除冗余组件
  - [x] SubTask 9.1: 删除 StatsOverview（如果还存在）
  - [x] SubTask 9.2: 删除 StatsSection（如果还存在）
  - [x] SubTask 9.3: 删除 ComparisonTabs（如果还存在）
  - [x] SubTask 9.4: 删除 TabNavigation（如果还存在）

- [x] Task 10: 性能优化
  - [x] SubTask 10.1: 为 QueryResults 添加 React.memo
  - [x] SubTask 10.2: 优化 useMemo/useCallback 使用
  - [x] SubTask 10.3: 运行 lint 检查

- [x] Task 11: 功能验证
  - [x] SubTask 11.1: 验证页面加载正常
  - [x] SubTask 11.2: 验证风险预警功能正常
  - [x] SubTask 11.3: 验证数据质量评分功能正常
  - [x] SubTask 11.4: 验证价格对比功能正常
  - [x] SubTask 11.5: 验证导出功能正常

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 1
- Task 4 依赖于 Task 1
- Task 5 依赖于 Task 2, 3, 4
- Task 6 依赖于 Task 5
- Task 7, 8 可以并行
- Task 9 依赖于 Task 5
- Task 10 依赖于 Task 5, 7, 8
- Task 11 依赖于 Task 10

# 可以并行的任务

- Task 1, 7, 8 可以并行开发
- Task 2, 3, 4 可以并行开发
