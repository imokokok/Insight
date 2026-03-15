# Tasks

## 阶段一：基础组件改造

- [x] Task 1: 改造 Card 基础组件
  - [x] 移除圆角效果 (rounded-2xl -> rounded-none)
  - [x] 移除所有阴影效果 (shadow-sm, hover:shadow-2xl 等)
  - [x] 简化变体选项，保留扁平化样式
  - [x] 更新 hover 效果为边框颜色变化

- [x] Task 2: 改造 DashboardCard 组件
  - [x] 将 flat 变体设为默认
  - [x] 移除 default 变体的阴影和圆角
  - [x] 简化 StatCard 和 MetricCard 样式
  - [x] 更新 FlatStatItem 和 FlatSection 样式

- [x] Task 3: 创建 Dune 风格样式常量
  - [x] 定义扁平化设计常量 (边框、背景、间距)
  - [x] 创建共享样式类
  - [x] 更新 tailwind 配置（如需要）

## 阶段二：首页组件改造

- [x] Task 4: 改造 BentoMetricsGrid 组件
  - [x] 移除所有圆角 (rounded-xl, rounded-2xl)
  - [x] 移除所有阴影 (shadow-sm, shadow-xl)
  - [x] 移除渐变背景 (bg-gradient-to-*)
  - [x] 简化颜色系统为统一边框
  - [x] 改造 MiniLiveTicker 组件
  - [x] 改造底部统计行样式

- [x] Task 5: 改造 FeatureCards 组件
  - [x] 移除卡片样式
  - [x] 使用扁平化设计

- [x] Task 6: 改造 LivePriceTicker 组件
  - [x] 移除圆角和阴影
  - [x] 使用简洁边框分隔

- [x] Task 7: 改造 OracleMarketOverview 组件
  - [x] 移除所有卡片样式
  - [x] 应用扁平化设计

- [x] Task 8: 改造 ArbitrageHeatmap 组件
  - [x] 移除卡片容器样式
  - [x] 使用扁平化布局

- [x] Task 9: 改造 ProfessionalHero 组件
  - [x] 简化背景效果
  - [x] 移除不必要的装饰

## 阶段三：Market Overview 页面改造

- [x] Task 10: 改造 Market Overview 主页面
  - [x] 移除页面级别的卡片包裹
  - [x] 简化标题和分区布局

- [x] Task 11: 改造 OracleComparison 组件
  - [x] 移除卡片样式
  - [x] 扁平化图表容器

- [x] Task 12: 改造 RiskDashboard 组件
  - [x] 移除卡片背景
  - [x] 扁平化风险指标展示

- [x] Task 13: 改造 CorrelationMatrix 组件
  - [x] 移除卡片包裹
  - [x] 简化矩阵样式

- [x] Task 14: 改造 BenchmarkComparison 组件
  - [x] 扁平化比较视图

- [x] Task 15: 改造图表组件
  - [x] AssetCategoryChart
  - [x] ChainBreakdownChart
  - [x] 简化图表容器

- [x] Task 16: 改造列表和配置组件
  - [x] ProtocolList
  - [x] PriceAlertConfig
  - [x] ExportConfig
  - [x] ScheduledExportConfig

- [x] Task 17: 改造 AnomalyAlert 组件
  - [x] 内联警报样式

## 阶段四：Cross Chain 页面改造

- [x] Task 18: 改造 Cross Chain 主页面
  - [x] 移除卡片容器
  - [x] 扁平化布局

- [x] Task 19: 改造图表组件
  - [x] StandardBoxPlot
  - [x] PriceSpreadHeatmap
  - [x] InteractivePriceChart
  - [x] VolatilitySurface

- [x] Task 20: 改造过滤器组件
  - [x] CrossChainFilters

- [x] Task 21: 改造分析组件
  - [x] CointegrationAnalysis
  - [x] CorrelationMatrix

## 阶段五：预言机详情页面改造

- [x] Task 22: 改造 OraclePageTemplate 组件
  - [x] 简化模板样式

- [x] Task 23: 改造各个预言机页面
  - [x] Chainlink 页面
  - [x] Pyth Network 页面
  - [x] Band Protocol 页面
  - [x] API3 页面
  - [x] Redstone 页面
  - [x] Tellor 页面
  - [x] WINkLink 页面
  - [x] Chronicle 页面
  - [x] DIA 页面
  - [x] UMA 页面

## 阶段六：其他页面改造

- [x] Task 24: 改造 Price Query 页面
  - [x] 主页面
  - [x] 所有子组件

- [x] Task 25: 改造 Alerts 页面
  - [x] 主页面
  - [x] AlertConfig, AlertList, AlertHistory

- [x] Task 26: 改造 Favorites 页面
  - [x] 主页面
  - [x] FavoriteCard 组件

- [x] Task 27: 改造 Settings 页面
  - [x] 主页面
  - [x] 所有面板组件

- [x] Task 28: 改造 Cross Oracle 页面
  - [x] 主页面
  - [x] 所有子组件

## 阶段七：共享组件改造

- [x] Task 29: 改造通用图表组件
  - [x] 所有 recharts 包装组件
  - [x] 图表容器样式

- [x] Task 30: 改造面板组件 (panels)
  - [x] MarketDataPanel
  - [x] EcosystemPanel
  - [x] AccuracyAnalysisPanel
  - [x] 其他所有面板

- [x] Task 31: 改造通用组件
  - [x] PriceDeviationMonitor
  - [x] GasFeeComparison
  - [x] OraclePerformanceRanking
  - [x] 其他通用组件

## 阶段八：验证和优化

- [x] Task 32: 类型检查验证
  - [x] 运行 TypeScript 检查
  - [x] 修复类型错误

- [x] Task 33: 视觉一致性检查
  - [x] 检查所有页面风格统一
  - [x] 修复不一致的样式

- [x] Task 34: 响应式适配验证
  - [x] 验证移动端显示
  - [x] 修复响应式问题

- [x] Task 35: 清理未使用代码
  - [x] 移除未使用的样式定义
  - [x] 清理废弃的变体选项

# Task Dependencies
- Task 1-3 是基础任务，其他任务依赖它们
- Task 4-9 (首页) 可以并行执行
- Task 10-17 (Market Overview) 可以并行执行
- Task 18-21 (Cross Chain) 可以并行执行
- Task 22-23 (预言机页面) 可以并行执行
- Task 24-28 (其他页面) 可以并行执行
- Task 29-31 (共享组件) 可以并行执行
- Task 32-35 (验证) 依赖前面所有任务
