# Tasks

- [x] Task 1: 实现争议投票分布可视化组件
  - [x] SubTask 1.1: 创建 DisputeVotingPanel 组件基础结构
  - [x] SubTask 1.2: 实现投票分布饼图/环形图展示
  - [x] SubTask 1.3: 实现验证者投票立场列表
  - [x] SubTask 1.4: 集成到 DisputeResolutionPanel

- [x] Task 2: 实现验证者收益归因分析
  - [x] SubTask 2.1: 扩展 UMAClient 收益归因数据模型
  - [x] SubTask 2.2: 创建 ValidatorEarningsBreakdown 组件
  - [x] SubTask 2.3: 实现收益来源分布可视化
  - [x] SubTask 2.4: 添加单位质押收益效率指标

- [x] Task 3: 实现实时数据流支持
  - [x] SubTask 3.1: 扩展 WebSocket 服务支持 UMA 实时数据
  - [x] SubTask 3.2: 创建 useUMARealtime hook
  - [x] SubTask 3.3: 集成实时价格更新到 PriceChart
  - [x] SubTask 3.4: 集成争议状态实时通知

- [x] Task 4: 优化争议类型可视化
  - [x] SubTask 4.1: 设计争议类型专属图标
  - [x] SubTask 4.2: 更新 DisputeType 组件样式
  - [x] SubTask 4.3: 在争议列表和趋势图中应用新图标

- [x] Task 5: 实现争议金额分布分析
  - [x] SubTask 5.1: 扩展争议数据模型包含金额字段
  - [x] SubTask 5.2: 创建争议金额分布直方图组件
  - [x] SubTask 5.3: 实现奖励效率分析指标

- [x] Task 6: 优化数据质量评分透明度
  - [x] SubTask 6.1: 创建评分算法说明弹窗/面板
  - [x] SubTask 6.2: 展示权重配置和计算公式
  - [x] SubTask 6.3: 添加历史评分趋势图表

# Task Dependencies

- Task 2 依赖 Task 1（共享数据模型理解）
- Task 3 依赖现有 WebSocket 基础设施
- Task 5 依赖 Task 1 的数据结构
