# 跨预言机对比功能 Tab 化重设计检查清单

## 子选项卡导航检查点
- [x] 子选项卡组件正常显示（概览、图表、数据、设置）
- [x] 子选项卡切换功能正常
- [x] 子选项卡状态保存在 localStorage 中
- [x] 刷新页面后恢复之前的子选项卡状态

## 主组件布局检查点
- [x] 标题栏已移除（不再显示大标题和副标题）
- [x] 独立导出按钮已移除
- [x] 独立刷新按钮已移除
- [x] 核心指标显示为 4 个（一致性评分、平均价格、价格范围、最大偏差）
- [x] 默认选中 4 个预言机（Chainlink、Pyth、Band Protocol、API3）

## 概览视图检查点
- [x] 概览视图正常显示
- [x] 核心指标使用 2x2 网格布局
- [x] 简化的价格对比图表正常显示
- [x] 价格偏差警告区域紧凑显示

## 图表视图检查点
- [x] 图表视图正常显示
- [x] 所有图表高度不超过 240px
- [x] 图表使用 2 列网格布局
- [x] 图表图例和标签简洁显示

## 数据视图检查点
- [x] 数据视图正常显示
- [x] 价格对比表格正常显示
- [x] 偏差表格正常显示
- [x] 性能表格正常显示
- [x] 表格使用可折叠面板组织

## 设置视图检查点
- [x] 设置视图正常显示
- [x] 预言机选择功能正常
- [x] 交易对选择功能正常
- [x] 阈值设置功能正常
- [x] 自动刷新设置功能正常
- [x] 分组选择器功能正常
- [x] 导出报告功能正常

## 可折叠面板检查点
- [x] 可折叠面板组件正常显示
- [x] 展开/折叠动画正常
- [x] 面板状态保存在 localStorage 中
- [x] 标题栏样式简洁

## 现有组件调整检查点
- [x] ComparisonControls 组件已简化
- [x] ComparisonCharts 组件支持自定义高度
- [x] PriceComparisonTable 样式更紧凑
- [x] DeviationTable 样式更紧凑
- [x] PerformanceTable 样式更紧凑

## 功能保留检查点
- [x] 价格获取功能正常
- [x] 偏差计算功能正常
- [x] 图表显示功能正常
- [x] 表格排序功能正常
- [x] 自动刷新功能正常
- [x] 导出功能正常

## 兼容性检查点
- [x] Chainlink 页面的 cross-oracle tab 正常显示
- [x] Pyth 页面的 cross-oracle tab 正常显示
- [x] Band Protocol 页面的 cross-oracle tab 正常显示
- [x] API3 页面的 cross-oracle tab 正常显示
- [x] RedStone 页面的 cross-oracle tab 正常显示
- [x] DIA 页面的 cross-oracle tab 正常显示
- [x] Tellor 页面的 cross-oracle tab 正常显示
- [x] 移动端响应式布局正常
- [x] TypeScript 检查无错误
