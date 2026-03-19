# Tasks

- [x] Task 1: 优化 StatsGrid 统计卡片样式
  - [x] SubTask 1.1: 减小内边距，主统计使用 py-2.5 px-3
  - [x] SubTask 1.2: 优化字体层次，主指标 text-xl，标签 text-[10px]
  - [x] SubTask 1.3: 简化对比差异的展示，使用更 subtle 的背景色
  - [x] SubTask 1.4: 优化展开/收起按钮样式

- [x] Task 2: 优化 StatItem 组件
  - [x] SubTask 2.1: 支持更紧凑的展示模式
  - [x] SubTask 2.2: 优化趋势指示器的样式
  - [x] SubTask 2.3: 确保数字字体使用等宽字体

- [x] Task 3: 优化 PriceResultsTable 表格样式
  - [x] SubTask 3.1: 减小行高，从 py-2.5 调整为 py-2
  - [x] SubTask 3.2: 优化选中状态，添加左侧边框高亮
  - [x] SubTask 3.3: 简化高偏差标记的样式
  - [x] SubTask 3.4: 优化分页器样式，使用更简洁的设计

- [x] Task 4: 优化 Selectors 选择器区域
  - [x] SubTask 4.1: 优化各选择器之间的分隔
  - [x] SubTask 4.2: 增强 SegmentedControl 选中状态的视觉反馈
  - [x] SubTask 4.3: 优化高级选项的展开动画

- [x] Task 5: 优化 PriceChart 图表区域
  - [x] SubTask 5.1: 简化指标控制区域的布局
  - [x] SubTask 5.2: 优化图例的交互反馈
  - [x] SubTask 5.3: 确保图表标题样式与其他组件一致

- [x] Task 6: 统一整体布局和间距
  - [x] SubTask 6.1: 统一区块间距为 gap-6
  - [x] SubTask 6.2: 统一卡片圆角为 rounded-lg
  - [x] SubTask 6.3: 优化 QueryHeader 的按钮布局
  - [x] SubTask 6.4: 检查并优化响应式布局

# Task Dependencies
- Task 2 依赖 Task 1 (StatItem 是 StatsGrid 的子组件)
- Task 6 应该在其他任务完成后进行，用于统一调整
