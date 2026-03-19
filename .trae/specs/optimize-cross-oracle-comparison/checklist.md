# 优化跨预言机对比功能检查清单

## 扩展默认预言机列表检查点
- [x] 默认选中 Chainlink、Pyth、Band Protocol、API3、RedStone、DIA、Tellor
- [x] 用户最多可以选择 5 个预言机同时对比
- [x] Quick Compare 按钮包含所有可对比预言机

## 优化性能数据检查点
- [x] RedStone 性能数据已添加（响应时间 30ms、更新频率 0.1s、120 数据源等）
- [x] DIA 性能数据已添加（响应时间 200ms、更新频率 3600s、80 数据源等）
- [x] Tellor 性能数据已添加（响应时间 300ms、更新频率 7200s、50 数据源等）
- [x] Chainlink、Pyth、Band、API3 性能数据已更新为真实值
- [x] 高频组（Pyth、RedStone）和标准组（Chainlink、Band、API3、DIA、Tellor）特性区分明确

## 分组对比功能检查点
- [x] 分组选择器 UI 正常显示（ALL、HIGH_FREQUENCY、STANDARD）
- [x] "高频组"视图只显示 Pyth 和 RedStone
- [x] "标准组"视图显示 Chainlink、Band、API3、DIA、Tellor
- [x] "全量对比"视图显示所有预言机
- [x] 切换分组时预言机列表自动更新

## 更新频率对比检查点
- [x] 更新频率对比图表正常显示
- [x] 使用对数刻度展示更新频率差异
- [x] Pyth 显示为亚秒级（~400ms）
- [x] RedStone 显示为实时流式（~100ms）
- [x] Chainlink 显示为小时级（1h）

## 价格偏差热力图检查点
- [x] heatmapData 数据生成逻辑已添加
- [x] 支持 BTC、ETH、SOL、LINK、AVAX、MATIC、ARB 等资产
- [x] 高频预言机偏差系数为 0.3（偏差更小）
- [x] 标准预言机偏差系数为 0.8（偏差较大）

## 智能基准选择检查点
- [x] 基准预言机选择器已存在（原有功能）
- [x] 支持选择 Chainlink、Pyth 等作为基准
- [x] 切换基准时所有偏差计算实时更新
- [x] 图表随基准切换实时更新

## 代码质量检查点
- [x] 所有页面能正常编译，无 TypeScript 错误
- [x] 所有页面能正常渲染，无运行时错误
- [x] 代码风格与现有项目保持一致
