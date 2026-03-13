# Tasks

- [x] Task 1: 优化颜色方案与视觉设计
  - [x] SubTask 1.1: 建立预言机标准颜色映射表
  - [x] SubTask 1.2: 增加色盲友好配色选项
  - [x] SubTask 1.3: 优化信息层级（KPI卡片与图表权重区分）

- [x] Task 2: 提升数据真实性
  - [x] SubTask 2.1: 标记或移除模拟数据指标（accuracy/stability）
  - [x] SubTask 2.2: 接入真实Gas费用数据源
  - [x] SubTask 2.3: 基于历史数据计算真实准确率

- [x] Task 3: 增强图表交互联动
  - [x] SubTask 3.1: 实现图表点击筛选表格功能
  - [x] SubTask 3.2: 表格悬停高亮图表对应线条
  - [x] SubTask 3.3: 统一各Tab时间轴选择器

- [x] Task 4: 性能优化
  - [x] SubTask 4.1: 实现LTTB数据下采样算法
  - [x] SubTask 4.2: 图表虚拟化（仅渲染可视区域）
  - [x] SubTask 4.3: Web Worker处理统计计算

- [x] Task 5: 移动端适配
  - [x] SubTask 5.1: 响应式布局重构
  - [x] SubTask 5.2: 触摸友好交互设计
  - [x] SubTask 5.3: 移动端简化视图

# Task Dependencies

- Task 3 依赖 Task 1（颜色方案确定后实现联动高亮）
- Task 4 依赖 Task 2（数据真实后再优化性能）
