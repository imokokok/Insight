# Tasks

- [x] Task 1: 实现滚动相关性时序图组件: 创建RollingCorrelationChart组件，展示链对间相关系数随时间变化趋势
  - [x] SubTask 1.1: 在utils.ts中添加滚动相关系数计算函数
  - [x] SubTask 1.2: 创建RollingCorrelationChart.tsx组件
  - [x] SubTask 1.3: 在page.tsx中集成新组件到相关性分析区域
  - [x] SubTask 1.4: 添加窗口大小配置控件

- [x] Task 2: 重构箱线图为标准实现: 使用Recharts ComposedChart实现标准箱线图，替换现有Scatter模拟方案
  - [x] SubTask 2.1: 创建StandardBoxPlot.tsx组件
  - [x] SubTask 2.2: 实现完整的五数概括展示(Min, Q1, Median, Q3, Max)
  - [x] SubTask 2.3: 添加异常点标记功能
  - [x] SubTask 2.4: 在page.tsx中替换原有箱线图实现

- [x] Task 3: 添加协整残差诊断图: 为协整分析增加残差诊断可视化
  - [x] SubTask 3.1: 在cointegration.ts中添加残差计算函数
  - [x] SubTask 3.2: 创建ResidualDiagnostics.tsx组件
  - [x] SubTask 3.3: 实现ACF图和残差分布直方图
  - [x] SubTask 3.4: 在CointegrationAnalysis.tsx中集成诊断图

- [x] Task 4: 实现色盲友好模式: 添加全局色盲友好模式切换
  - [x] SubTask 4.1: 在crossChainStore.ts中添加colorblindMode状态
  - [x] SubTask 4.2: 创建色盲友好配色方案
  - [x] SubTask 4.3: 修改热力图组件支持色盲模式
  - [x] SubTask 4.4: 修改相关性矩阵组件支持色盲模式
  - [x] SubTask 4.5: 在页面头部添加模式切换开关

- [x] Task 5: 增强热力图信息密度: 优化PriceSpreadHeatmap组件的信息展示
  - [x] SubTask 5.1: 增强Tooltip显示绝对价差和历史百分位
  - [x] SubTask 5.2: 添加"固定对比"功能
  - [x] SubTask 5.3: 添加热力图图例说明

- [x] Task 6: 实现波动率曲面视图: 创建新的波动率分析视图
  - [x] SubTask 6.1: 在utils.ts中添加滚动波动率计算函数
  - [x] SubTask 6.2: 创建VolatilitySurface组件
  - [x] SubTask 6.3: 实现波动率时序图
  - [x] SubTask 6.4: 实现波动率相关性矩阵
  - [x] SubTask 6.5: 在page.tsx中添加视图切换选项

- [x] Task 7: 增强主价格走势图交互: 优化价格走势图的交互体验
  - [x] SubTask 7.1: 添加缩放/平移控制按钮
  - [x] SubTask 7.2: 实现框选放大功能
  - [x] SubTask 7.3: 添加参考线快速添加功能

# Task Dependencies
- Task 4 depends on Task 1, Task 2, Task 3 (色盲模式需要其他组件先实现)
- Task 5 can be done in parallel with Task 1, Task 2
- Task 6 can be done in parallel with Task 1, Task 2, Task 3
- Task 7 can be done in parallel with all other tasks
