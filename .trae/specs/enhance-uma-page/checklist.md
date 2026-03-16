# UMA 页面改造检查清单

## Phase 1: 基础架构改造

- [x] Tab 配置更新
  - [x] oracles.tsx 中添加了 network tab
  - [x] oracles.tsx 中添加了 cross-oracle tab
  - [x] TabNavigation.tsx 更新了 umaTabs

- [x] OraclePageTemplate 更新
  - [x] network tab 渲染逻辑已实现
  - [x] cross-oracle tab 渲染逻辑已实现
  - [x] UMA 特定的 risk tab 渲染已实现

## Phase 2: 新增 Panel 组件

- [x] UMANetworkPanel 组件
  - [x] 组件基础结构完成
  - [x] 网络健康指标展示正常
  - [x] 验证活动图表正常显示
  - [x] 争议趋势图表正常显示
  - [x] 类型错误已修复

- [ ] OptimisticOraclePanel 组件（可选）
  - [ ] 组件基础结构完成
  - [ ] 3 阶段流程可视化正常
  - [ ] 交互式说明功能正常

- [ ] DisputeLifecyclePanel 组件（可选）
  - [ ] 组件基础结构完成
  - [ ] 争议阶段时间线正常显示
  - [ ] 时间估算展示正常

- [x] UMARiskPanel 组件
  - [x] 组件基础结构完成
  - [x] 验证者分布风险分析正常
  - [x] 争议风险指标正常显示
  - [x] 经济安全指标正常显示
  - [x] 类型错误已修复

## Phase 3: 现有组件增强（可选）

- [ ] DisputeResolutionPanel 增强
  - [ ] 争议类型分布图表已添加
  - [ ] 争议金额分析已添加
  - [ ] DisputeLifecyclePanel 已集成

- [ ] ValidatorAnalyticsPanel 增强
  - [ ] 投票历史展示已添加
  - [ ] 收益归因明细已添加
  - [ ] 验证者对比功能已添加

## Phase 4: 集成与优化

- [x] 组件集成
  - [x] panels/index.ts 导出已更新
  - [x] 所有 Tab 正常工作
  - [x] 响应式布局测试通过

- [ ] i18n 支持
  - [ ] 中文翻译已添加
  - [ ] 英文翻译已添加

## 功能验证

- [x] Network Tab
  - [x] 显示验证者数量、正常运行时间、响应时间
  - [x] 显示总质押量、数据源数量
  - [x] 显示争议统计（总数、成功率、活跃数）

- [ ] Optimistic Oracle 展示（可选）
  - [ ] 3 阶段流程清晰可见
  - [ ] 每个阶段可点击查看详情
  - [ ] 动画效果流畅

- [ ] Dispute Lifecycle（可选）
  - [ ] 争议各阶段时间线清晰
  - [ ] 时间估算准确显示
  - [ ] 视觉设计美观

- [x] Risk Assessment
  - [x] 验证者分布图表正常
  - [x] 争议风险指标完整
  - [x] 经济安全指标准确

- [x] Cross-Oracle Comparison
  - [x] 与其他预言机对比数据正常
  - [x] 对比维度完整（准确性、频率、机制等）

## 最终验收

- [x] 所有 Tab 功能正常
- [x] UMA 组件无类型错误
- [x] 响应式布局正常
- [x] UMA 核心特性充分展示
