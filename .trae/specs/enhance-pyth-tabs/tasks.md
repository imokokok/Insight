# Tasks

- [x] Task 1: 优化 PythMarketView - 简化布局，减少卡片使用
  - [x] SubTask 1.1: 重构价格图表和统计数据的布局，采用左图右统计的链式布局
  - [x] SubTask 1.2: 将卡片式统计改为简洁的行内布局
  - [x] SubTask 1.3: 优化网络状态和数据来源的展示方式

- [x] Task 2: 优化 PythNetworkView - 简化核心指标展示
  - [x] SubTask 2.1: 将4个核心指标改为无卡片背景的简洁展示
  - [x] SubTask 2.2: 优化每小时活动图表的样式
  - [x] SubTask 2.3: 改进性能指标进度条的展示

- [x] Task 3: 重构 PythPublishersView - 改为数据表格
  - [x] SubTask 3.1: 创建 PythDataTable 组件或复用现有表格组件
  - [x] SubTask 3.2: 将发布者卡片网格改为表格展示
  - [x] SubTask 3.3: 添加搜索和排序功能
  - [x] SubTask 3.4: 将统计卡片改为行内统计展示

- [x] Task 4: 优化 PythValidatorsView - 增强表格功能
  - [x] SubTask 4.1: 优化验证者表格的列定义
  - [x] SubTask 4.2: 改进状态徽章的样式
  - [x] SubTask 4.3: 将统计卡片改为行内统计展示

- [x] Task 5: 重构 PythPriceFeedsView - 改为分类数据表格
  - [x] SubTask 5.1: 创建价格源数据表格
  - [x] SubTask 5.2: 添加分类筛选标签（All, Crypto, Forex, Commodities, Equities）
  - [x] SubTask 5.3: 将分类卡片改为行内统计展示
  - [x] SubTask 5.4: 添加 About Section 说明数据 feeds 特性

- [x] Task 6: 增强 PythRiskView - 参考 Chainlink Risk View
  - [x] SubTask 6.1: 添加风险指标展示（去中心化、安全性、可靠性、透明度）
  - [x] SubTask 6.2: 创建行业基准对比雷达图
  - [x] SubTask 6.3: 添加历史风险事件时间线
  - [x] SubTask 6.4: 添加风险因素分析（可展开详情）

- [x] Task 7: 扩展 types.ts - 添加新类型定义
  - [ ] SubTask 7.1: 添加 PriceFeed 类型定义
  - [ ] SubTask 7.2: 添加 RiskMetric、RiskFactor 等类型

# Task Dependencies
- Task 3 依赖 Task 7 (需要类型定义)
- Task 5 依赖 Task 7 (需要类型定义)
- Task 6 依赖 Task 7 (需要类型定义)
