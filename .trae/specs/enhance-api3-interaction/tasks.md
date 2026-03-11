# Tasks

- [x] Task 1: 创建dAPI价格偏离监控组件
  - [x] SubTask 1.1: 创建DapiPriceDeviationMonitor组件，展示各dAPI与基准价格的偏离
  - [x] SubTask 1.2: 实现偏离阈值指示器（正常<0.3% / 警告0.3-0.5% / 异常>0.5%）
  - [x] SubTask 1.3: 添加偏离趋势指示器（上升/下降箭头）
  - [x] SubTask 1.4: 实现异常dAPI高亮和排序功能

- [x] Task 2: 扩展API3Client数据获取能力
  - [x] SubTask 2.1: 添加getDapiPriceDeviations方法，返回各dAPI价格偏离数据
  - [x] SubTask 2.2: 添加getDataSourceTraceability方法，返回数据源追溯信息
  - [x] SubTask 2.3: 添加getCoveragePoolEvents方法，返回保险池事件时间线数据

- [x] Task 3: 创建数据源追溯性展示组件
  - [x] SubTask 3.1: 创建DataSourceTraceabilityPanel组件
  - [x] SubTask 3.2: 实现数据源提供商信息展示（名称、类型、可信度评分）
  - [x] SubTask 3.3: 实现数据传输路径可视化（数据源→Airnode→dAPI）
  - [x] SubTask 3.4: 添加链上合约地址展示和复制功能

- [x] Task 4: 创建保险池事件时间线组件
  - [x] SubTask 4.1: 创建CoveragePoolTimeline组件
  - [x] SubTask 4.2: 实现事件时间线UI（索赔事件、参数变更、奖励发放）
  - [x] SubTask 4.3: 添加事件详情弹窗功能
  - [x] SubTask 4.4: 实现事件筛选功能（按类型、时间范围）

- [x] Task 5: 集成新组件到API3PageContent
  - [x] SubTask 5.1: 在市场数据标签页集成DapiPriceDeviationMonitor
  - [x] SubTask 5.2: 在Airnode标签页集成DataSourceTraceabilityPanel
  - [x] SubTask 5.3: 在保险池标签页集成CoveragePoolTimeline
  - [x] SubTask 5.4: 更新数据获取逻辑，并行获取新增数据

# Task Dependencies
- Task 2 需要先完成，Task 1, 3, 4 依赖 Task 2
- Task 1, 3, 4 可并行开发
- Task 5 依赖 Task 1, 3, 4
