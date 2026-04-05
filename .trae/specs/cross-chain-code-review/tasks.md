# Tasks

- [x] Task 1: 修复 IQR 异常检测偏差计算错误
  - [x] SubTask 1.1: 修改 useCrossChainData.ts 中 stdDevHistoricalOutliers 计算逻辑
  - [x] SubTask 1.2: 根据价格与边界的关系选择正确的边界值计算偏差
  - [ ] SubTask 1.3: 添加单元测试验证修复

- [x] Task 2: 修复相关性计算除零风险
  - [x] SubTask 2.1: 在 correlationUtils.ts 中添加边界检查
  - [x] SubTask 2.2: 处理 correlation 为 ±1 的情况
  - [ ] SubTask 2.3: 添加单元测试覆盖边界情况

- [x] Task 3: 修复价格跳变检测阈值计算问题
  - [x] SubTask 3.1: 修改 volatilityUtils.ts 中 detectPriceJumps 函数
  - [x] SubTask 3.2: 处理均值为负数或接近零的情况
  - [ ] SubTask 3.3: 添加单元测试验证各种边界情况

- [x] Task 4: 修复箱线图边界值计算
  - [x] SubTask 4.1: 修改 useCrossChainData.ts 中 boxPlotData 计算
  - [x] SubTask 4.2: 处理所有数据点都是异常值的情况
  - [ ] SubTask 4.3: 添加单元测试验证

- [x] Task 5: 优化缓存机制
  - [x] SubTask 5.1: 添加缓存大小限制
  - [x] SubTask 5.2: 实现自动清理过期条目的机制
  - [x] SubTask 5.3: 添加缓存清理的导出函数

- [x] Task 6: 修复 useEffect 依赖项性能问题
  - [x] SubTask 6.1: 使用 useMemo 缓存 chains.join(',') 结果
  - [x] SubTask 6.2: 修改 CrossChainPriceComparison 组件

- [x] Task 7: 改进更新延迟基准链选择
  - [x] SubTask 7.1: 修改 updateDelays 计算逻辑
  - [x] SubTask 7.2: 选择数据点最多的链作为基准

- [x] Task 8: 改进数据完整性计算
  - [x] SubTask 8.1: 使用中位数替代平均值计算更新间隔
  - [x] SubTask 8.2: 过滤异常大的时间间隔

# Task Dependencies
- [Task 3] 建议在 [Task 1] 完成后进行，因为都涉及异常检测相关逻辑
- [Task 4] 建议在 [Task 1] 完成后进行，因为都涉及 IQR 计算相关逻辑
- [Task 5], [Task 6], [Task 7], [Task 8] 可以并行进行
