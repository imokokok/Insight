# Tasks

## P0 - 立即修复 (影响核心功能)

- [x] Task 1: 添加空数据状态处理
  - [x] SubTask 1.1: 创建 EmptyState 组件
  - [x] SubTask 1.2: 在 ChartRenderer 中集成空状态处理
  - [x] SubTask 1.3: 在 AssetsTable 中集成空状态处理
  - [x] SubTask 1.4: 在 MarketStats 中集成空状态处理

- [x] Task 2: 添加错误边界
  - [x] SubTask 2.1: 创建 ChartErrorBoundary 组件
  - [x] SubTask 2.2: 在 page.tsx 中包装主要组件
  - [x] SubTask 2.3: 添加错误日志记录
  - [x] SubTask 2.4: 设计友好的错误提示 UI

- [x] Task 3: 修复移动端图表显示问题
  - [x] SubTask 3.1: 在 ChartRenderer 中添加移动端检测
  - [x] SubTask 3.2: 移动端默认只显示 Top 5 预言机
  - [x] SubTask 3.3: 添加"显示更多"按钮
  - [x] SubTask 3.4: 优化移动端图表尺寸

## P1 - 短期改进 (1-2 周)

- [x] Task 4: 添加骨架屏加载状态
  - [x] SubTask 4.1: 创建 MarketStatsSkeleton 组件
  - [x] SubTask 4.2: 创建 ChartSkeleton 组件
  - [x] SubTask 4.3: 创建 AssetsTableSkeleton 组件
  - [x] SubTask 4.4: 在各组件中集成骨架屏

- [x] Task 5: 添加图表切换过渡动画
  - [x] SubTask 5.1: 添加 CSS transition 配置
  - [x] SubTask 5.2: 实现淡入淡出效果
  - [x] SubTask 5.3: 添加动画性能优化

- [x] Task 6: 实现数据筛选功能
  - [x] SubTask 6.1: 在 MarketSidebar 添加筛选器 UI
  - [x] SubTask 6.2: 实现按市场份额筛选
  - [x] SubTask 6.3: 实现按 24h 变化筛选
  - [x] SubTask 6.4: 在 AssetsTable 添加筛选功能

- [x] Task 7: 添加键盘导航支持
  - [x] SubTask 7.1: 为图表添加 Tab 导航
  - [x] SubTask 7.2: 添加 Enter/Space 激活支持
  - [x] SubTask 7.3: 添加焦点指示器样式
  - [x] SubTask 7.4: 添加键盘快捷键提示

## P2 - 中期改进 (1 个月)

- [x] Task 8: 实现数据采样优化
  - [x] SubTask 8.1: 创建数据采样工具函数
  - [x] SubTask 8.2: 根据时间范围动态调整采样率
  - [x] SubTask 8.3: 在 useDataFetching 中集成采样逻辑
  - [x] SubTask 8.4: 添加采样配置选项

- [x] Task 9: 添加虚拟滚动
  - [x] SubTask 9.1: 评估 react-window vs react-virtualized
  - [x] SubTask 9.2: 在 AssetsTable 中实现虚拟滚动
  - [x] SubTask 9.3: 优化滚动性能
  - [x] SubTask 9.4: 添加滚动位置记忆

- [x] Task 10: 实现数据缓存策略
  - [x] SubTask 10.1: 设计缓存数据结构
  - [x] SubTask 10.2: 实现基于时间范围的缓存
  - [x] SubTask 10.3: 添加缓存过期逻辑
  - [x] SubTask 10.4: 添加手动刷新覆盖缓存功能

- [x] Task 11: 重构 ChartContainer 组件
  - [x] SubTask 11.1: 提取 ChartTypeSelector 组件
  - [x] SubTask 11.2: 提取 ChartToolbar 组件
  - [x] SubTask 11.3: 提取 ChartTimeRangeSelector 组件
  - [x] SubTask 11.4: 重构主组件使用组合模式

- [x] Task 12: 添加单元测试
  - [x] SubTask 12.1: 为 useMarketOverviewData 添加测试
  - [x] SubTask 12.2: 为 marketStats 计算逻辑添加测试
  - [x] SubTask 12.3: 为图表组件添加快照测试
  - [x] SubTask 12.4: 达到 80% 覆盖率目标

## P3 - 长期改进 (季度)

- [ ] Task 13: 添加历史数据快照功能
  - [ ] SubTask 13.1: 设计快照数据存储结构
  - [ ] SubTask 13.2: 实现快照选择器 UI
  - [ ] SubTask 13.3: 添加快照与当前数据对比视图
  - [ ] SubTask 13.4: 实现本地存储或 API 支持

- [ ] Task 14: 扩展导出格式
  - [ ] SubTask 14.1: 添加 XLSX 导出支持
  - [ ] SubTask 14.2: 添加 PDF 报告导出
  - [ ] SubTask 14.3: 添加图片导出 (PNG/SVG)
  - [ ] SubTask 14.4: 优化导出配置选项

- [ ] Task 15: 添加高对比度模式
  - [ ] SubTask 15.1: 设计高对比度配色方案
  - [ ] SubTask 15.2: 添加主题切换功能
  - [ ] SubTask 15.3: 使用图案区分数据
  - [ ] SubTask 15.4: 添加色盲模拟测试

- [ ] Task 16: 完善屏幕阅读器支持
  - [ ] SubTask 16.1: 为图表添加 ARIA 属性
  - [ ] SubTask 16.2: 提供数据表格替代视图
  - [ ] SubTask 16.3: 添加隐藏数据摘要
  - [ ] SubTask 16.4: 进行屏幕阅读器测试

# Task Dependencies

- [Task 4] 依赖 [Task 1] - 骨架屏需要先有统一的加载状态处理
- [Task 5] 依赖 [Task 11] - 过渡动画在组件重构后更容易实现
- [Task 8] 依赖 [Task 10] - 数据采样与缓存策略配合使用
- [Task 12] 应在 [Task 11] 完成后进行 - 重构后测试更稳定
- [Task 15] 和 [Task 16] 可以并行进行
- [Task 13] 依赖后端 API 支持
