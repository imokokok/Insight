# 多预言机对比页面优化任务清单

## 阶段 1: 基础组件开发

- [x] Task 1: 创建增强型统计卡片组件 EnhancedStatCard
  - [x] SubTask 1.1: 创建组件文件 src/components/ui/EnhancedStatCard.tsx
  - [x] SubTask 1.2: 实现大字数值显示和趋势指示
  - [x] SubTask 1.3: 集成 SparklineChart 迷你趋势图
  - [x] SubTask 1.4: 添加置信度进度条指示器
  - [x] SubTask 1.5: 实现悬停效果显示详细信息
  - [x] SubTask 1.6: 添加加载状态支持

- [x] Task 2: 创建数据质量评分组件 DataQualityIndicators
  - [x] SubTask 2.1: 创建组件文件 src/components/ui/DataQualityIndicators.tsx
  - [x] SubTask 2.2: 实现新鲜度评分显示
  - [x] SubTask 2.3: 实现完整度评分显示
  - [x] SubTask 2.4: 实现可靠性评分显示
  - [x] SubTask 2.5: 添加综合质量仪表盘

- [x] Task 3: 创建异常高亮组件 DeviationHighlighter
  - [x] SubTask 3.1: 创建组件文件 src/components/ui/DeviationHighlighter.tsx
  - [x] SubTask 3.2: 实现偏离阈值检测逻辑
  - [x] SubTask 3.3: 添加警告级别颜色（黄/红）
  - [x] SubTask 3.4: 实现脉冲动画效果
  - [x] SubTask 3.5: 添加警告图标和提示

- [x] Task 4: 创建增强表格组件 EnhancedComparisonTable
  - [x] SubTask 4.1: 创建组件文件 src/components/comparison/EnhancedComparisonTable.tsx
  - [x] SubTask 4.2: 实现条件格式（渐变背景）
  - [x] SubTask 4.3: 添加排序状态指示器
  - [x] SubTask 4.4: 实现行悬停效果
  - [x] SubTask 4.5: 添加异常行高亮

## 阶段 2: 页面头部重构

- [x] Task 5: 重构 StatsSection 组件
  - [x] SubTask 5.1: 重新设计头部布局结构
  - [x] SubTask 5.2: 添加 Live 状态徽章（脉冲动画）
  - [x] SubTask 5.3: 优化交易对信息展示
  - [x] SubTask 5.4: 集成数据质量评分卡片
  - [x] SubTask 5.5: 使用 EnhancedStatCard 替换原有统计卡片

- [x] Task 6: 创建新的 HeaderStats 组件
  - [x] SubTask 6.1: 创建组件文件 src/app/[locale]/cross-oracle/components/HeaderStats.tsx
  - [x] SubTask 6.2: 实现清晰的信息层次
  - [x] SubTask 6.3: 添加响应式布局支持
  - [x] SubTask 6.4: 集成所有关键指标

## 阶段 3: 对比视图优化

- [x] Task 7: 重构 OracleComparisonView 组件
  - [x] SubTask 7.1: 集成异常高亮功能
  - [x] SubTask 7.2: 添加置信度展示
  - [x] SubTask 7.3: 优化图表颜色对比度
  - [x] SubTask 7.4: 添加图例交互功能
  - [x] SubTask 7.5: 实现图表异常点标记

- [x] Task 8: 重构 OracleComparisonSection 组件
  - [x] SubTask 8.1: 使用 EnhancedComparisonTable 替换基础表格
  - [x] SubTask 8.2: 添加偏离阈值配置
  - [x] SubTask 8.3: 实现条件格式展示
  - [x] SubTask 8.4: 优化移动端显示

## 阶段 4: 移动端适配

- [x] Task 9: 优化移动端布局
  - [x] SubTask 9.1: 重构 ControlPanel 移动端样式
  - [x] SubTask 9.2: 优化统计卡片垂直堆叠
  - [x] SubTask 9.3: 确保表格横向滚动流畅
  - [x] SubTask 9.4: 添加控制面板折叠功能

- [x] Task 10: 创建移动端专用组件
  - [x] SubTask 10.1: 创建 MobileStatsView 组件
  - [x] SubTask 10.2: 创建 MobileComparisonTable 组件
  - [x] SubTask 10.3: 优化触摸交互体验

## 阶段 5: 可访问性优化

- [x] Task 11: 优化图表可访问性
  - [x] SubTask 11.1: 更新图表配色方案（WCAG AA 标准）
  - [x] SubTask 11.2: 添加色盲友好配色选项
  - [x] SubTask 11.3: 实现图案填充功能
  - [x] SubTask 11.4: 添加图表 ARIA 标签

- [x] Task 12: 添加键盘导航支持
  - [x] SubTask 12.1: 实现表格键盘导航
  - [x] SubTask 12.2: 添加排序快捷键
  - [x] SubTask 12.3: 优化焦点指示器

## 阶段 6: 国际化更新

- [x] Task 13: 更新国际化文本
  - [x] SubTask 13.1: 添加新组件的国际化键
  - [x] SubTask 13.2: 更新中文翻译
  - [x] SubTask 13.3: 更新英文翻译
  - [x] SubTask 13.4: 验证所有文本显示正常

## 阶段 7: 代码重构

- [x] Task 14: 提取通用逻辑
  - [x] SubTask 14.1: 创建 useOracleStatistics Hook
  - [x] SubTask 14.2: 创建 useDeviationDetection Hook
  - [x] SubTask 14.3: 统一类型定义
  - [x] SubTask 14.4: 删除重复代码

# Task Dependencies

- Task 5-6 依赖 Task 1-2（基础组件必须先完成）
- Task 7-8 依赖 Task 3-4（异常高亮和表格组件）
- Task 9-10 可以并行执行
- Task 11-12 可以并行执行
- Task 13 依赖所有 UI 任务完成
- Task 14 可以在任何阶段执行
