# Tasks

## 高优先级问题

- [x] Task 1: 修复预言机客户端重复实例化问题
  - [x] SubTask 1.1: 移除 `constants.tsx` 中的 `oracleClients` 实例化
  - [x] SubTask 1.2: 移除 `crossOracleConfig.ts` 中的 `oracleClients` 实例化
  - [x] SubTask 1.3: 统一使用 `OracleClientFactory.getClient()` 获取客户端

- [x] Task 2: 统一数据获取逻辑
  - [x] SubTask 2.1: 分析 `useOracleData.ts` 和 `useCrossOraclePrices.ts` 的差异
  - [x] SubTask 2.2: 确定主数据获取 Hook，移除冗余实现
  - [x] SubTask 2.3: 更新所有使用数据获取的组件

- [x] Task 3: 修复风险指标随机趋势问题
  - [x] SubTask 3.1: 移除 `generateRandomTrend()` 函数
  - [x] SubTask 3.2: 实现基于历史数据的趋势计算
  - [x] SubTask 3.3: 添加趋势数据缓存机制

- [x] Task 4: 修复延迟数据模拟问题
  - [x] SubTask 4.1: 移除 `useChartConfig.ts` 中硬编码的 `latencyData`
  - [x] SubTask 4.2: 从实际请求中收集响应时间数据
  - [x] SubTask 4.3: 实现延迟数据的统计和展示

## 中优先级问题

- [x] Task 5: 统一统计计算函数
  - [x] SubTask 5.1: 创建统一的统计计算工具模块
  - [x] SubTask 5.2: 移除 `constants.tsx` 中的重复计算函数
  - [x] SubTask 5.3: 移除 `usePriceStats.ts` 中的重复计算函数
  - [x] SubTask 5.4: 更新所有调用点使用统一工具

- [x] Task 6: 统一异常检测阈值配置
  - [x] SubTask 6.1: 创建统一的阈值配置文件
  - [x] SubTask 6.2: 更新 `usePriceAnomalyDetection.ts` 使用统一阈值
  - [x] SubTask 6.3: 更新 `useFilterSort.ts` 使用统一阈值

- [x] Task 7: 优化性能指标计算
  - [x] SubTask 7.1: 审查 `PerformanceMetricsCalculator` 中的硬编码值
  - [x] SubTask 7.2: 实现动态计算或从配置读取
  - [x] SubTask 7.3: 添加指标计算结果的缓存

- [x] Task 8: 统一类型定义
  - [x] SubTask 8.1: 合并 `types.ts` 和 `types/index.ts` 中的重复类型
  - [x] SubTask 8.2: 确定统一的类型导出路径
  - [x] SubTask 8.3: 更新所有导入路径

## 低优先级问题

- [x] Task 9: 改进错误处理
  - [x] SubTask 9.1: 在 `useOracleData.ts` 中添加错误状态返回
  - [x] SubTask 9.2: 在 UI 层展示错误信息
  - [x] SubTask 9.3: 添加重试机制

- [x] Task 10: 添加并发请求控制
  - [x] SubTask 10.1: 实现请求队列或并发限制
  - [x] SubTask 10.2: 添加请求超时处理
  - [x] SubTask 10.3: 测试高并发场景

- [x] Task 11: 内存管理优化
  - [x] SubTask 11.1: 审查 `priceHistoryMapRef` 的内存使用
  - [x] SubTask 11.2: 实现更智能的数据清理策略
  - [x] SubTask 11.3: 添加内存使用监控

# Task Dependencies
- [Task 2] depends on [Task 1] (统一数据获取需要先统一客户端实例)
- [Task 3] depends on [Task 2] (趋势计算需要历史数据)
- [Task 4] depends on [Task 2] (延迟数据来自实际请求)
- [Task 7] depends on [Task 5] (性能指标计算依赖统计工具)
- [Task 9] depends on [Task 2] (错误处理改进需要统一数据获取)
