# Tasks

## P0 - 必须修复

- [x] Task 1: 请求并行化优化
  - [x] SubTask 1.1: 将顺序请求改为 Promise.allSettled 并行请求
  - [x] SubTask 1.2: 实现请求批次管理，控制并发数量
  - [x] SubTask 1.3: 添加请求超时处理
  - [x] SubTask 1.4: 测试并行请求的性能提升

- [x] Task 2: 错误可视化展示
  - [x] SubTask 2.1: 创建 ErrorBanner 组件显示失败的数据源
  - [x] SubTask 2.2: 在表格中标记失败的数据源行
  - [x] SubTask 2.3: 添加单数据源重试按钮
  - [x] SubTask 2.4: 实现错误分类显示（网络错误、数据错误等）

- [x] Task 3: 数据有效性验证
  - [x] SubTask 3.1: 创建 priceValidator 工具函数
  - [x] SubTask 3.2: 实现价格合理性检查（非负、变化阈值）
  - [x] SubTask 3.3: 实现时间戳有效性验证
  - [x] SubTask 3.4: 在 UI 中标记异常数据

## P1 - 强烈建议

- [x] Task 4: Hook 拆分重构
  - [x] SubTask 4.1: 创建 usePriceQueryState hook
  - [x] SubTask 4.2: 创建 usePriceQueryData hook
  - [x] SubTask 4.3: 创建 usePriceQueryChart hook
  - [x] SubTask 4.4: 创建 usePriceQueryExport hook
  - [x] SubTask 4.5: 创建 usePriceQueryHistory hook
  - [x] SubTask 4.6: 更新主 hook 整合所有子 hooks

- [x] Task 5: 引入 React Query/SWR
  - [x] SubTask 5.1: 安装并配置 React Query
  - [x] SubTask 5.2: 创建 usePriceData 查询
  - [x] SubTask 5.3: 创建 useHistoricalData 查询
  - [x] SubTask 5.4: 配置缓存策略和重试逻辑
  - [x] SubTask 5.5: 迁移现有数据获取逻辑

- [x] Task 6: 实现请求缓存
  - [x] SubTask 6.1: 设计缓存键生成策略
  - [x] SubTask 6.2: 实现实时价格缓存（30-60秒）
  - [x] SubTask 6.3: 实现历史数据缓存（5-10分钟）
  - [x] SubTask 6.4: 添加缓存失效和清理机制

- [x] Task 7: 加载状态优化
  - [x] SubTask 7.1: 创建 PriceChartSkeleton 骨架屏组件
  - [x] SubTask 7.2: 实现渐进式数据加载显示
  - [x] SubTask 7.3: 添加部分数据加载时的 UI 反馈
  - [x] SubTask 7.4: 优化加载动画效果

## P2 - 建议改进

- [x] Task 8: 添加单元测试
  - [x] SubTask 8.1: 为 usePriceQuery hooks 编写测试
  - [x] SubTask 8.2: 为数据处理函数编写测试
  - [x] SubTask 8.3: 为图表组件编写测试
  - [x] SubTask 8.4: 配置测试覆盖率报告

- [x] Task 9: 可访问性改进
  - [x] SubTask 9.1: 添加键盘导航支持
  - [x] SubTask 9.2: 为图表添加数据表格视图
  - [x] SubTask 9.3: 改进屏幕阅读器支持
  - [x] SubTask 9.4: 检查并修复颜色对比度问题

- [x] Task 10: 性能监控集成
  - [x] SubTask 10.1: 集成 Web Vitals 监控
  - [x] SubTask 10.2: 添加自定义性能指标
  - [x] SubTask 10.3: 实现用户行为追踪
  - [x] SubTask 10.4: 创建性能监控仪表板

## P3 - 可选优化

- [ ] Task 11: 快捷键支持
  - [ ] SubTask 11.1: 实现 Cmd/Ctrl + K 快速搜索
  - [ ] SubTask 11.2: 实现 Cmd/Ctrl + R 刷新
  - [ ] SubTask 11.3: 实现 Cmd/Ctrl + E 导出
  - [ ] SubTask 11.4: 添加快捷键帮助面板

- [ ] Task 12: 查询预设功能
  - [ ] SubTask 12.1: 设计预设数据结构
  - [ ] SubTask 12.2: 创建预设管理 UI
  - [ ] SubTask 12.3: 实现预设保存/加载
  - [ ] SubTask 12.4: 添加预设分享功能

# Task Dependencies

- [Task 4] depends on [Task 5] (Hook 拆分前先确定数据获取方案) ✅
- [Task 6] depends on [Task 5] (缓存机制依赖 React Query) ✅
- [Task 7] depends on [Task 1] (加载状态优化需要并行请求支持) ✅
- [Task 8] depends on [Task 4] (测试需要稳定的 hook 结构) ✅
