# Tasks

## Phase 1: 核心组件开发

- [x] Task 1: 重构 SimplePriceComparisonTab 主组件
  - [x] SubTask 1.1: 重新设计组件结构，移除4卡片布局，改为2核心指标卡片
  - [x] SubTask 1.2: 创建 MarketConsensusCard 组件（市场共识价格卡片）
  - [x] SubTask 1.3: 创建 PriceDispersionCard 组件（价格离散度指数卡片）
  - [x] SubTask 1.4: 实现图表Tab切换逻辑（分布/散点/走势/深度）

- [x] Task 2: 增强 SimplePriceTable 表格组件
  - [x] SubTask 2.1: 添加置信度列（带颜色条可视化）
  - [x] SubTask 2.2: 添加响应延迟列（毫秒）
  - [x] SubTask 2.3: 添加数据源数量列
  - [x] SubTask 2.4: 添加最后更新时间列
  - [x] SubTask 2.5: 实现表格排序功能（价格、偏差、置信度）
  - [x] SubTask 2.6: 实现状态筛选功能

- [x] Task 3: 创建专业图表组件
  - [x] SubTask 3.1: 创建 PriceDistributionHistogram 组件（价格分布直方图）
  - [x] SubTask 3.2: 创建 DeviationScatterChart 组件（偏差分析散点图）
  - [x] SubTask 3.3: 创建 MultiOracleTrendChart 组件（多预言机走势对比图）
  - [x] SubTask 3.4: 创建 MarketDepthSimulator 组件（市场深度模拟图）
  - [x] SubTask 3.5: 创建 ChartTabSwitcher 组件（图表切换器）

- [x] Task 4: 创建辅助组件
  - [x] SubTask 4.1: 创建 ConfidenceBar 组件（置信度可视化条）
  - [x] SubTask 4.2: 创建 DispersionGauge 组件（离散度仪表盘）
  - [x] SubTask 4.3: 创建 PriceRangeBar 组件（价格区间可视化条）

## Phase 2: 数据模型与Hook增强

- [x] Task 5: 增强价格数据结构
  - [x] SubTask 5.1: 扩展 PriceData 类型，添加 confidence、latency、dataSources、updateTime 字段
  - [x] SubTask 5.2: 更新 mock 数据生成器，包含新字段
  - [x] SubTask 5.3: 计算变异系数（CV）工具函数

- [x] Task 6: 更新 useCrossOraclePage Hook
  - [x] SubTask 6.1: 添加历史价格数据获取逻辑
  - [x] SubTask 6.2: 添加图表数据预处理逻辑

## Phase 3: 国际化与样式

- [x] Task 7: 更新国际化文案
  - [x] SubTask 7.1: 更新 zh-CN/crossOracle.json 新增专业术语
  - [x] SubTask 7.2: 更新 en/crossOracle.json 新增专业术语

- [x] Task 8: 样式优化
  - [x] SubTask 8.1: 确保专业金融数据展示风格
  - [x] SubTask 8.2: 优化响应式布局

## Phase 4: 验证与优化

- [x] Task 9: 功能验证
  - [x] SubTask 9.1: 验证所有图表正常渲染
  - [x] SubTask 9.2: 验证表格排序筛选功能
  - [x] SubTask 9.3: 验证响应式布局

- [x] Task 10: 性能优化
  - [x] SubTask 10.1: 添加 React.memo 优化
  - [x] SubTask 10.2: 优化图表重渲染
  - [x] SubTask 10.3: 运行 lint 检查

# Task Dependencies

- Task 2 依赖于 Task 1
- Task 3 依赖于 Task 1
- Task 4 依赖于 Task 1
- Task 6 依赖于 Task 5
- Task 7 依赖于 Task 1, 2, 3
- Task 8 依赖于 Task 1, 2, 3
- Task 9 依赖于 Task 7, 8
- Task 10 依赖于 Task 9

# 可以并行的任务

- Task 1, 5 可以并行开发
- Task 3, 4 可以并行开发
- Task 7, 8 可以并行开发
