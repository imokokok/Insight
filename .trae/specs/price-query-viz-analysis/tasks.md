# Tasks

本任务列表用于跟踪价格查询页面数据可视化分析相关的改进任务。

- [x] Task 1: 简化统计网格 - 将8个统计指标精简为4个核心指标，其余放入折叠面板
  - [x] SubTask 1.1: 重新设计 StatsGrid 组件，突出核心指标
  - [x] SubTask 1.2: 添加"展开/收起"功能控制信息密度
  - [x] SubTask 1.3: 优化移动端统计网格布局

- [x] Task 2: 优化价格图表 - 增强图表分析功能
  - [x] SubTask 2.1: 添加置信区间阴影区域展示
  - [x] SubTask 2.2: 使用 Recharts Brush 组件替换 CSS transform 缩放
  - [x] SubTask 2.3: 添加价格偏差带状图（Bollinger Bands）
  - [x] SubTask 2.4: 优化 Y 轴自适应逻辑

- [x] Task 3: 增强表格交互 - 提升表格与图表的联动体验
  - [x] SubTask 3.1: 实现表格行点击高亮图表对应线条
  - [x] SubTask 3.2: 添加表格数据分页或虚拟滚动
  - [x] SubTask 3.3: 优化列宽自适应

- [x] Task 4: 增强色盲友好性 - 改进无障碍访问
  - [x] SubTask 4.1: 涨跌增加箭头形状区分
  - [x] SubTask 4.2: 线条增加虚线/实线样式差异
  - [x] SubTask 4.3: 检查并提升颜色对比度

- [x] Task 5: 添加数据对比功能 - 支持多维度对比
  - [x] SubTask 5.1: 支持不同时间范围对比
  - [x] SubTask 5.2: 支持基准价格对比（如平均价）
  - [x] SubTask 5.3: 添加对比结果可视化展示

- [x] Task 6: 优化导出功能 - 增强数据导出能力
  - [x] SubTask 6.1: 支持自定义导出范围
  - [x] SubTask 6.2: 支持导出为 PDF 报告
  - [x] SubTask 6.3: 添加导出预览功能

- [x] Task 7: 增加图表注释 - 提升数据可读性
  - [x] SubTask 7.1: 异常数据点自动标记
  - [x] SubTask 7.2: 价格突变事件标注
  - [x] SubTask 7.3: 添加数据点数值标注

- [x] Task 8: 添加数据质量指标 - 增强数据可信度展示
  - [x] SubTask 8.1: 各预言机数据完整性评分
  - [x] SubTask 8.2: 延迟分布可视化
  - [x] SubTask 8.3: 数据新鲜度趋势图

# Task Dependencies

- Task 3 依赖 Task 2（表格联动需要图表组件支持）
- Task 5 依赖 Task 2（对比功能需要图表增强）
- Task 7 依赖 Task 2（图表注释基于图表组件）
