# UMA Tab 功能优化任务列表

## Task 1: 优化 Market Tab (UmaMarketView.tsx)
- [x] 重构布局为左侧图表(2/3) + 右侧统计(1/3)
- [x] 简化右侧统计区域，使用内联列表代替卡片
- [x] 添加底部核心交易对信息展示
- [x] 使用分隔线代替卡片边框
- [x] 添加 Lucide React 图标

## Task 2: 优化 Network Tab (UmaNetworkView.tsx)
- [x] 重构顶部网络指标为简洁 4 列网格布局
- [x] 移除 NetworkHealthPanel 的卡片包装
- [x] 添加每小时活动简化柱状图
- [x] 网络性能指标改为进度条形式
- [x] 数据来源使用内联列表展示

## Task 3: 优化 Disputes Tab (UmaDisputesView.tsx)
- [x] 顶部统计改为内联布局
- [x] 简化最近争议表格样式
- [x] 添加争议趋势迷你图表
- [x] 使用分隔线划分区域

## Task 4: 优化 Validators Tab (UmaValidatorsView.tsx)
- [x] 顶部统计改为行内内联布局
- [x] 简化验证者表格样式
- [x] 添加验证者类型分布统计
- [x] 使用分隔线划分区域

## Task 5: 优化 Staking Tab (UmaStakingView.tsx)
- [x] 减少质押计算器的卡片嵌套
- [x] 收益展示改为简洁布局
- [x] APR 对比使用进度条形式
- [x] 网络质押统计简化展示

## Task 6: 优化 Ecosystem Tab (UmaEcosystemView.tsx)
- [x] 添加 TVL 趋势分析图表（堆叠面积图）
- [x] 添加链上项目分布柱状图
- [x] 生态增长指标改为内联展示
- [x] 集成项目使用简化列表

## Task 7: 优化 Risk Tab (UmaRiskView.tsx)
- [x] 风险指标改为简洁 2 列布局
- [x] 风险因素使用列表形式
- [x] 风险缓解措施简化展示
- [x] 整体风险评分使用环形图

# Task Dependencies
- Task 2 依赖于 Task 1 的样式模式确定
- Task 3-7 可以并行执行
