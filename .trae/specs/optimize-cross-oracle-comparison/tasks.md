# 优化跨预言机对比功能任务列表

## 任务1: 扩展默认预言机列表
- [x] 1.1 在 `index.tsx` 中修改 `selectedOracles` 默认状态，包含 6 个预言机
- [x] 1.2 更新 `handleQuickCompare` 函数，包含所有可对比预言机
- [x] 1.3 调整最大可选预言机数量为 5 个（避免图表过于拥挤）

## 任务2: 优化性能数据
- [x] 2.1 在 `crossOracleConfig.ts` 中添加 RedStone、DIA、Tellor 的性能数据
- [x] 2.2 更新现有预言机（Chainlink、Pyth、Band、API3）的性能数据，使其更准确
- [x] 2.3 添加预言机分组配置（高频组、标准组）

## 任务3: 新增分组对比功能
- [x] 3.1 在 `crossOracleConfig.ts` 中定义预言机分组常量
- [x] 3.2 在 `ComparisonControls.tsx` 中添加分组选择器 UI
- [x] 3.3 在 `index.tsx` 中添加分组切换逻辑
- [x] 3.4 根据分组自动筛选显示的预言机

## 任务4: 增强对比维度 - 更新频率对比
- [x] 4.1 在 `useComparisonStats.ts` 中添加更新频率计算逻辑
- [x] 4.2 在 `ComparisonCharts.tsx` 中添加更新频率对比图表
- [x] 4.3 使用对数刻度展示更新频率差异

## 任务5: 增强对比维度 - 价格偏差热力图
- [x] 5.1 在 `useComparisonStats.ts` 中添加多资产偏差矩阵计算
- [x] 5.2 在 `ComparisonCharts.tsx` 中添加热力图组件
- [x] 5.3 支持 BTC、ETH、SOL、LINK、AVAX、MATIC、ARB 等资产

## 任务6: 智能基准选择优化
- [x] 6.1 在 `ComparisonControls.tsx` 中添加基准预言机选择器
- [x] 6.2 更新 `useComparisonStats.ts` 中的偏差计算逻辑，支持动态基准
- [x] 6.3 确保所有图表在切换基准时实时更新

## 任务7: 验证所有修改
- [x] 7.1 验证所有页面能正常编译
- [x] 7.2 验证默认选中 6 个预言机
- [x] 7.3 验证分组切换功能正常
- [x] 7.4 验证新图表正确显示
- [x] 7.5 验证基准切换功能正常

# 任务依赖
- 任务1、2 可以并行执行
- 任务3 依赖于任务2
- 任务4、5、6 可以并行执行
- 任务7 依赖于所有其他任务完成
