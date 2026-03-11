# Tasks

- [x] Task 1: 统一时间范围选择器
  - [x] SubTask 1.1: 增强 TimeRangeContext，支持时间范围持久化（localStorage）
  - [x] SubTask 1.2: 修改 PageHeader，添加快速时间范围切换按钮
  - [x] SubTask 1.3: 修改 PriceChart，移除独立的时间范围选择器
  - [x] SubTask 1.4: 确保所有图表组件使用全局时间范围

- [x] Task 2: 简化图表工具栏
  - [x] SubTask 2.1: 创建 MoreOptionsDropdown 组件，包含高级功能
  - [x] SubTask 2.2: 修改 PriceChart 工具栏布局，核心功能直接显示
  - [x] SubTask 2.3: 实现功能状态持久化（localStorage）
  - [x] SubTask 2.4: 优化移动端工具栏，使用图标按钮

- [x] Task 3: 增强跨预言机比较交互
  - [x] SubTask 3.1: 实现价格偏离预警组件
  - [x] SubTask 3.2: 添加偏离阈值设置功能
  - [x] SubTask 3.3: 实现表格排序功能
  - [x] SubTask 3.4: 创建快速对比模式按钮

- [x] Task 4: 数据刷新视觉反馈
  - [x] SubTask 4.1: 添加图表刷新过渡动画
  - [x] SubTask 4.2: 优化刷新按钮动画效果
  - [x] SubTask 4.3: 增强 KPI 仪表板实时数据指示器
  - [x] SubTask 4.4: 添加数据更新边框闪烁效果

- [x] Task 5: 价格偏离历史分析
  - [x] SubTask 5.1: 创建 PriceDeviationHistoryChart 组件
  - [x] SubTask 5.2: 实现偏离统计面板
  - [x] SubTask 5.3: 添加基准选择功能（平均值/中位数/Chainlink）
  - [x] SubTask 5.4: 集成到 CrossOracleComparison 组件

- [x] Task 6: 响应式布局优化
  - [x] SubTask 6.1: 优化 KPIDashboard 移动端布局（2列+滑动）
  - [x] SubTask 6.2: 添加滑动指示器组件
  - [x] SubTask 6.3: 优化 TabNavigation 移动端显示
  - [x] SubTask 6.4: 实现移动端 Tab 滑动切换

- [x] Task 7: 数据导出增强
  - [x] SubTask 7.1: 增强 ExportModal，添加批量导出选项
  - [x] SubTask 7.2: 添加导出范围选择功能
  - [x] SubTask 7.3: 优化图表截图，添加标题和时间戳
  - [x] SubTask 7.4: 添加分辨率选择功能

# Task Dependencies
- [Task 2] depends on [Task 1] (工具栏简化需要先统一时间范围)
- [Task 5] depends on [Task 3] (偏离历史分析需要偏离预警功能)
- [Task 7] depends on [Task 1] (导出增强需要全局时间范围)
