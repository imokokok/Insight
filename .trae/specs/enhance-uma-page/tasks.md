# UMA 页面改造任务列表

## Phase 1: 基础架构改造

- [x] Task 1: 更新 UMA Tab 配置
  - [x] 1.1: 在 oracles.tsx 中添加 network tab 配置
  - [x] 1.2: 在 oracles.tsx 中添加 cross-oracle tab 配置
  - [x] 1.3: 更新 TabNavigation.tsx 中的 umaTabs 定义

- [x] Task 2: 更新 OraclePageTemplate 支持新 Tabs
  - [x] 2.1: 添加 network tab 渲染逻辑
  - [x] 2.2: 添加 cross-oracle tab 渲染逻辑（已存在，无需修改）
  - [x] 2.3: 更新 UMA 特定的 risk tab 渲染

## Phase 2: 新增 Panel 组件

- [x] Task 3: 创建 UMANetworkPanel 组件
  - [x] 3.1: 创建组件基础结构
  - [x] 3.2: 实现网络健康指标展示
  - [x] 3.3: 实现验证活动图表
  - [x] 3.4: 实现争议趋势图表

- [ ] Task 4: 创建 OptimisticOraclePanel 组件（可选增强）
  - [ ] 4.1: 创建组件基础结构
  - [ ] 4.2: 实现 3 阶段流程可视化
  - [ ] 4.3: 实现交互式说明

- [ ] Task 5: 创建 DisputeLifecyclePanel 组件（可选增强）
  - [ ] 5.1: 创建组件基础结构
  - [ ] 5.2: 实现争议阶段时间线
  - [ ] 5.3: 实现时间估算展示

- [x] Task 6: 创建 UMARiskPanel 组件
  - [x] 6.1: 创建组件基础结构
  - [x] 6.2: 实现验证者分布风险分析
  - [x] 6.3: 实现争议风险指标
  - [x] 6.4: 实现经济安全指标

## Phase 3: 现有组件增强（可选）

- [ ] Task 7: 增强 DisputeResolutionPanel
  - [ ] 7.1: 添加争议类型分布图表
  - [ ] 7.2: 添加争议金额分析
  - [ ] 7.3: 集成 DisputeLifecyclePanel

- [ ] Task 8: 增强 ValidatorAnalyticsPanel
  - [ ] 8.1: 添加投票历史展示
  - [ ] 8.2: 添加收益归因明细
  - [ ] 8.3: 添加验证者对比功能

## Phase 4: 集成与优化

- [x] Task 9: 集成所有组件
  - [x] 9.1: 更新 panels/index.ts 导出
  - [x] 9.2: 验证所有 Tab 正常工作
  - [x] 9.3: 测试响应式布局

- [ ] Task 10: 添加 i18n 支持
  - [ ] 10.1: 添加中文翻译
  - [ ] 10.2: 添加英文翻译

# Task Dependencies

- Task 1 → Task 2 → Task 9 (配置依赖)
- Task 3, Task 4, Task 5, Task 6 可并行
- Task 7, Task 8 可并行
- Task 9 依赖于所有 Panel 组件完成
- Task 10 依赖于所有 UI 文本确定
