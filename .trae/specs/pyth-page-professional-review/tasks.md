# Tasks

## Phase 1: 核心功能完善 (高优先级)

- [x] Task 1: 实现置信区间可视化组件
  - [x] SubTask 1.1: 创建ConfidenceIntervalChart组件，展示bid/ask区间条
  - [x] SubTask 1.2: 在PythHero价格展示区集成置信区间显示
  - [x] SubTask 1.3: 在PythMarketView添加置信区间宽度趋势图
  - [x] SubTask 1.4: 添加置信度评分显示

- [x] Task 2: 集成实时WebSocket价格更新
  - [x] SubTask 2.1: 在usePythPage hook中集成PythHermesClient WebSocket订阅
  - [x] SubTask 2.2: 实现实时价格更新动画效果
  - [x] SubTask 2.3: 添加价格变化方向指示器
  - [x] SubTask 2.4: 显示价格更新延迟和连接状态

- [x] Task 3: 改进数据真实性
  - [x] SubTask 3.1: 创建PythDataService服务，从Pythnet获取真实发布者数据
  - [x] SubTask 3.2: 实现从Solana链上获取验证者数据
  - [x] SubTask 3.3: 替换PythMarketView中的模拟数据为Hermes API真实数据
  - [x] SubTask 3.4: 替换PythNetworkView中的模拟网络统计数据
  - [x] SubTask 3.5: 更新PythPublishersView使用真实发布者数据
  - [x] SubTask 3.6: 更新PythValidatorsView使用真实验证者数据

## Phase 2: 功能增强 (中优先级)

- [x] Task 4: 实现EMA价格展示
  - [x] SubTask 4.1: 在PythMarketView新增EMA价格展示区域
  - [x] SubTask 4.2: 创建EMA与实时价格对比图表
  - [x] SubTask 4.3: 添加EMA趋势方向指示器
  - [x] SubTask 4.4: 添加EMA计算参数说明文档

- [x] Task 5: 实现跨链价格一致性分析
  - [x] SubTask 5.1: 创建PythCrossChainView组件
  - [x] SubTask 5.2: 实现多链价格对比表格
  - [x] SubTask 5.3: 添加价格偏差热力图
  - [x] SubTask 5.4: 集成Wormhole跨链状态显示
  - [x] SubTask 5.5: 在侧边栏添加跨链分析导航入口

- [x] Task 6: 增强发布者和价格源详情
  - [x] SubTask 6.1: 创建PublisherDetailModal组件，展示发布者详情
  - [x] SubTask 6.2: 在PythPublishersView添加点击查看详情功能
  - [x] SubTask 6.3: 创建PriceFeedDetailPage页面，展示价格源详情
  - [x] SubTask 6.4: 在价格源详情页展示实时价格和置信区间
  - [x] SubTask 6.5: 显示价格源对应的发布者列表

## Phase 3: 高级功能 (低优先级)

- [ ] Task 7: 实现价格预警功能
  - [ ] SubTask 7.1: 创建价格预警配置界面
  - [ ] SubTask 7.2: 实现置信区间异常预警逻辑
  - [ ] SubTask 7.3: 添加发布者状态变化通知
  - [ ] SubTask 7.4: 实现预警通知推送机制

- [ ] Task 8: 增强数据导出功能
  - [ ] SubTask 8.1: 支持CSV格式导出
  - [ ] SubTask 8.2: 支持JSON格式导出
  - [ ] SubTask 8.3: 添加自定义时间范围选择
  - [ ] SubTask 8.4: 实现历史数据导出功能

# Task Dependencies
- [Task 2] depends on [Task 3] (WebSocket需要真实数据API支持)
- [Task 4] depends on [Task 2] (EMA需要实时价格数据)
- [Task 5] depends on [Task 3] (跨链分析需要真实链上数据)
- [Task 6] depends on [Task 3] (详情页需要真实数据)
- [Task 7] depends on [Task 2] (预警需要实时数据)
- [Task 8] depends on [Task 3] (导出需要真实数据)
