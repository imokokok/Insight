# Tasks

- [x] Task 1: 修复时间范围选择器功能
  - [x] SubTask 1.1: 在 InteractivePriceChart 中实现时间范围过滤逻辑
  - [x] SubTask 1.2: 在 PriceSpreadHeatmap 中实现时间范围过滤逻辑
  - [x] SubTask 1.3: 添加时间范围变化时的数据重新计算

- [x] Task 2: 修复热力图数据计算逻辑
  - [x] SubTask 2.1: 修改 heatmapData 计算逻辑，使用历史价格数据
  - [x] SubTask 2.2: 计算历史价格差异的平均值或最大值
  - [x] SubTask 2.3: 确保热力图反映时间范围内的价格差异分布

- [x] Task 3: 修复相关性计算时间戳匹配问题
  - [x] SubTask 3.1: 修改 calculatePearsonCorrelation 函数，接受带时间戳的数据
  - [x] SubTask 3.2: 在计算前匹配时间戳，只使用相同时间点的数据
  - [x] SubTask 3.3: 更新所有调用该函数的地方

- [x] Task 4: 修复价格差异计算除零问题
  - [x] SubTask 4.1: 在计算 diffPercent 前检查 basePrice 是否为零
  - [x] SubTask 4.2: 添加适当的错误处理或默认值
  - [x] SubTask 4.3: 更新 UI 显示逻辑处理异常值

- [x] Task 5: 改进数据完整性计算
  - [x] SubTask 5.1: 从预言机客户端获取实际更新间隔
  - [x] SubTask 5.2: 使用动态更新间隔计算预期数据点数
  - [x] SubTask 5.3: 添加更新间隔配置选项

- [x] Task 6: 修复滚动相关性时间戳问题
  - [x] SubTask 6.1: 修改 calculateRollingCorrelation 返回实际时间戳
  - [x] SubTask 6.2: 传入时间戳数组作为参数
  - [x] SubTask 6.3: 更新使用该函数的组件

- [x] Task 7: 改进价格跳跃频率计算
  - [x] SubTask 7.1: 使用标准差作为阈值基础
  - [x] SubTask 7.2: 添加可配置的敏感度参数
  - [x] SubTask 7.3: 考虑价格波动特性

- [x] Task 8: 添加导出功能错误处理
  - [x] SubTask 8.1: 检查数据是否为空
  - [x] SubTask 8.2: 添加 try-catch 错误处理
  - [x] SubTask 8.3: 向用户显示成功或失败提示

- [x] Task 9: 改进类型安全
  - [x] SubTask 9.1: 添加更严格的类型检查
  - [x] SubTask 9.2: 处理可能的 undefined 情况
  - [x] SubTask 9.3: 添加类型守卫函数

- [x] Task 10: 改进异常值检测
  - [x] SubTask 10.1: 使用动态阈值替代固定阈值
  - [x] SubTask 10.2: 考虑使用 IQR 方法检测异常值
  - [x] SubTask 10.3: 添加异常值检测配置选项

# Task Dependencies

- [Task 1] 和 [Task 2] 可以并行处理 ✅
- [Task 3] 需要在 [Task 6] 之前完成（都涉及相关性计算）✅
- [Task 4] 是独立任务，可以随时处理 ✅
- [Task 5] 和 [Task 7] 可以并行处理 ✅
- [Task 8] 和 [Task 9] 可以并行处理 ✅
- [Task 10] 可以独立处理 ✅
