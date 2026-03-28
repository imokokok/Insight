# Tasks

- [x] Task 1: 修复滚动相关性图表时间范围过滤功能
  - [x] SubTask 1.1: 在 RollingCorrelationChart 中实现时间范围过滤逻辑
  - [x] SubTask 1.2: 使用过滤后的 chartData 计算滚动相关性
  - [x] SubTask 1.3: 更新图表显示逻辑

- [x] Task 2: 修复热力图历史数据过滤功能
  - [x] SubTask 2.1: 修改 heatmapData 计算逻辑，使用 filteredHistoricalPrices
  - [x] SubTask 2.2: 计算历史时间范围内的价格差异分布
  - [x] SubTask 2.3: 确保时间范围选择器对热力图生效

- [x] Task 3: 改进协整分析统计显著性
  - [x] SubTask 3.1: 实现 ADF 检验的 p 值计算
  - [x] SubTask 3.2: 添加置信区间显示
  - [x] SubTask 3.3: 添加明显的风险提示文本
  - [x] SubTask 3.4: 改进交易建议的表述

- [x] Task 4: 改进波动率年化因子计算
  - [x] SubTask 4.1: 检测实际数据间隔
  - [x] SubTask 4.2: 根据数据间隔动态计算年化因子
  - [x] SubTask 4.3: 更新 calculateRollingVolatility 函数

- [x] Task 5: 改进置信区间计算
  - [x] SubTask 5.1: 实现小样本 t 分布临界值查找
  - [x] SubTask 5.2: 根据样本量选择 z 分布或 t 分布
  - [x] SubTask 5.3: 更新置信区间计算逻辑

- [x] Task 6: 实现数据缓存策略
  - [x] SubTask 6.1: 设计缓存数据结构
  - [x] SubTask 6.2: 实现缓存读写逻辑
  - [x] SubTask 6.3: 添加缓存过期机制
  - [x] SubTask 6.4: 在数据获取时检查缓存

- [x] Task 7: 添加错误边界处理
  - [x] SubTask 7.1: 创建 ChartErrorBoundary 组件
  - [x] SubTask 7.2: 为每个图表组件添加错误边界
  - [x] SubTask 7.3: 添加错误恢复机制

- [x] Task 8: 实现图表导出功能
  - [x] SubTask 8.1: 实现相关性矩阵导出
  - [x] SubTask 8.2: 实现滚动相关性图表导出
  - [x] SubTask 8.3: 实现热力图导出
  - [x] SubTask 8.4: 实现价格图表导出

- [x] Task 9: 改进数据验证
  - [x] SubTask 9.1: 添加价格数据有效性验证
  - [x] SubTask 9.2: 添加时间戳合理性验证
  - [x] SubTask 9.3: 添加异常数据点检测

- [x] Task 10: 改进用户反馈机制
  - [x] SubTask 10.1: 添加数据加载失败重试按钮
  - [x] SubTask 10.2: 添加数据更新进度指示
  - [x] SubTask 10.3: 实现后台刷新保留旧数据显示

- [x] Task 11: 改进相关性矩阵样本量显示
  - [x] SubTask 11.1: 在每个单元格显示实际样本量
  - [x] SubTask 11.2: 添加样本量不足的警告

- [x] Task 12: 改进无障碍访问
  - [x] SubTask 12.1: 添加图表键盘导航支持
  - [x] SubTask 12.2: 添加屏幕阅读器支持
  - [x] SubTask 12.3: 改进色盲模式

# Task Dependencies

- [Task 1] 和 [Task 2] 已并行处理完成 ✅
- [Task 4] 和 [Task 5] 已并行处理完成 ✅
- [Task 6] 已在 [Task 10] 之前完成 ✅
- [Task 7] 已独立处理完成 ✅
- [Task 8] 已独立处理完成 ✅
- [Task 3] 已优先处理完成 ✅
- [Task 11] 和 [Task 12] 已完成 ✅
