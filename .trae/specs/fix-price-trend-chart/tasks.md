# Tasks

## 修复价格趋势图表数据生成逻辑

- [x] Task 1: 修改 BaseOracleClient 的 generateMockHistoricalPrices 方法
  - [x] SubTask 1.1: 将独立随机生成改为基于前一个价格的随机游走模型
  - [x] SubTask 1.2: 添加价格连续性逻辑，确保相邻时间点价格变化平滑
  - [x] SubTask 1.3: 添加价格边界检查，防止价格偏离基准价格过大

- [x] Task 2: 验证修复效果
  - [x] SubTask 2.1: 在本地启动开发服务器
  - [x] SubTask 2.2: 访问价格查询页面验证图表显示正常趋势
  - [x] SubTask 2.3: 测试不同时间范围（6h, 24h, 7d）下的趋势显示

# Task Dependencies
- Task 2 依赖于 Task 1
