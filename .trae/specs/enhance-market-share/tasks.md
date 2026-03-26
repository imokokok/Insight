# Tasks

- [ ] Task 1: 创建增强型市场份额图表组件
  - [ ] SubTask 1.1: 创建 EnhancedMarketShareChart 组件文件
  - [ ] SubTask 1.2: 实现环形图中心显示总 TVS
  - [ ] SubTask 1.3: 添加环形图悬停放大效果
  - [ ] SubTask 1.4: 实现环形图与列表的双向高亮联动

- [ ] Task 2: 添加时间趋势缩略图
  - [ ] SubTask 2.1: 在环形图下方添加趋势缩略图区域
  - [ ] SubTask 2.2: 使用 sparkline 展示最近 30 天份额变化
  - [ ] SubTask 2.3: 点击缩略图切换到趋势图表视图
  - [ ] SubTask 2.4: 添加时间范围选择器（7d/30d/90d）

- [ ] Task 3: 创建详细数据表格
  - [ ] SubTask 3.1: 创建 MarketShareTable 组件
  - [ ] SubTask 3.2: 添加列：预言机、份额、TVS、链数、协议数、24h变化、7d变化
  - [ ] SubTask 3.3: 实现表头点击排序功能
  - [ ] SubTask 3.4: 添加迷你趋势图列（30天趋势）

- [ ] Task 4: 创建选中预言机详情卡片
  - [ ] SubTask 4.1: 创建 OracleDetailCard 组件
  - [ ] SubTask 4.2: 显示关键指标：TVS、份额、链数、协议数、响应时间
  - [ ] SubTask 4.3: 添加与行业平均的对比指示器
  - [ ] SubTask 4.4: 显示该预言机的历史趋势图

- [ ] Task 5: 创建市场洞察卡片
  - [ ] SubTask 5.1: 创建 MarketInsightCards 组件
  - [ ] SubTask 5.2: 实现"增长最快"卡片（7天份额增长最多）
  - [ ] SubTask 5.3: 实现"份额变化最大"卡片（24h变化最大）
  - [ ] SubTask 5.4: 实现"新进入者"卡片（最近30天新协议）
  - [ ] SubTask 5.5: 实现"市场集中度"卡片（CR4指标）

- [ ] Task 6: 整合到 ChartContainer
  - [ ] SubTask 6.1: 当 activeChart === 'pie' 时渲染增强组件
  - [ ] SubTask 6.2: 调整布局为左侧图表 + 右侧表格/详情
  - [ ] SubTask 6.3: 在底部添加洞察卡片行
  - [ ] SubTask 6.4: 确保响应式布局正常

- [ ] Task 7: 数据准备和类型定义
  - [ ] SubTask 7.1: 更新 types.ts 添加新类型定义
  - [ ] SubTask 7.2: 准备模拟数据（历史趋势、协议数等）
  - [ ] SubTask 7.3: 计算洞察数据（增长最快、CR4等）

- [ ] Task 8: 测试和优化
  - [ ] SubTask 8.1: 测试所有交互功能正常
  - [ ] SubTask 8.2: 测试响应式布局
  - [ ] SubTask 8.3: 运行 lint 和 typecheck
  - [ ] SubTask 8.4: 优化性能（避免不必要的重渲染）

# Task Dependencies

- Task 2 依赖 Task 1（环形图完成后添加趋势缩略图）
- Task 4 依赖 Task 3（表格完成后添加详情卡片）
- Task 6 依赖 Task 1、3、4、5（所有子组件完成后整合）
- Task 7 可与 Task 1-5 并行进行
- Task 8 依赖所有其他任务
