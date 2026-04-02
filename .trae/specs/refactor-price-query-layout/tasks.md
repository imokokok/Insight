# 价格查询页面布局重构 - The Implementation Plan (Decomposed and Prioritized Task List)

## [ ] Task 1: 重构 QueryResults 组件的内容顺序和布局
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 重新组织 QueryResults 组件中各部分的显示顺序
  - 将当前价格详情卡片移到最顶部，使其成为视觉焦点
  - 调整统计数据网格的位置和展示方式
  - 优化各组件之间的间距和层次
- **Acceptance Criteria Addressed**: [AC-1, AC-4]
- **Test Requirements**:
  - `human-judgement` TR-1.1: 当前价格详情卡片在最顶部，字体更大更醒目
  - `human-judgement` TR-1.2: 各组件排列顺序合理，间距适中
- **Notes**: 建议的新顺序：价格详情卡片 -> 统计网格 -> 价格图表 -> 数据源和导出区域

## [ ] Task 2: 优化当前价格详情卡片的展示
- **Priority**: P0
- **Depends On**: None
- **Description**: 
  - 增强价格详情卡片的视觉效果
  - 增大当前价格的字体
  - 优化卡片的背景和边框样式
  - 改进价格、涨跌幅、成交量等信息的布局
- **Acceptance Criteria Addressed**: [AC-1]
- **Test Requirements**:
  - `human-judgement` TR-2.1: 当前价格字体更大，视觉层次更高
  - `human-judgement` TR-2.2: 卡片整体视觉效果更美观
- **Notes**: 可以考虑使用渐变背景或更醒目的边框样式

## [ ] Task 3: 优化统计数据的展示方式
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 调整 StatsGrid 组件的展示方式
  - 确保核心指标在默认展开状态下显示
  - 优化指标卡片的间距和样式
- **Acceptance Criteria Addressed**: [AC-2]
- **Test Requirements**:
  - `human-judgement` TR-3.1: 统计数据布局合理，关键指标清晰可见
- **Notes**: 可以考虑将 StatsGrid 默认设为展开状态

## [ ] Task 4: 优化价格图表的视觉呈现
- **Priority**: P1
- **Depends On**: None
- **Description**: 
  - 微调 PriceChart 组件的样式
  - 确保图表在新布局中有良好的展示效果
- **Acceptance Criteria Addressed**: [AC-3]
- **Test Requirements**:
  - `human-judgement` TR-4.1: 图表视觉效果良好，易于阅读
- **Notes**: 主要是调整图表容器的边距和样式

## [ ] Task 5: 验证所有功能正常工作
- **Priority**: P0
- **Depends On**: [Task 1, Task 2, Task 3, Task 4]
- **Description**: 
  - 测试刷新功能
  - 测试导出功能
  - 测试查看历史功能
  - 确保所有交互功能正常
- **Acceptance Criteria Addressed**: [AC-5]
- **Test Requirements**:
  - `programmatic` TR-5.1: 所有功能与重构前保持一致，没有 regressions
- **Notes**: 需要手动测试各种功能场景
