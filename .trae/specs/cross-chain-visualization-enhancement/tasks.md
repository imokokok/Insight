# Tasks

- [x] Task 1: 增强价格图表组件
  - [x] SubTask 1.1: 添加图表缩放和拖拽功能（使用 Recharts 的 Brush 组件）
  - [x] SubTask 1.2: 添加 MA7 和 MA20 移动平均线显示
  - [x] SubTask 1.3: 优化 Tooltip 显示更多价格信息（开盘、最高、最低、收盘）
  - [x] SubTask 1.4: 添加价格变化百分比标注
  - [x] SubTask 1.5: 添加图表图例交互（点击显示/隐藏特定链）

- [x] Task 2: 新增价格分布分析组件
  - [x] SubTask 2.1: 创建价格分布直方图组件
  - [x] SubTask 2.2: 添加统计指标标注（中位数、平均值、标准差）
  - [x] SubTask 2.3: 创建价格箱线图组件
  - [x] SubTask 2.4: 实现异常值高亮显示

- [x] Task 3: 新增链间相关性分析组件
  - [x] SubTask 3.1: 实现 Pearson 相关系数计算函数
  - [x] SubTask 3.2: 创建相关性矩阵热力图组件
  - [x] SubTask 3.3: 添加相关系数数值显示
  - [x] SubTask 3.4: 实现颜色编码（正相关蓝色、负相关红色）

- [x] Task 4: 增强统计指标面板
  - [x] SubTask 4.1: 添加中位数价格计算和显示
  - [x] SubTask 4.2: 添加四分位距（IQR）计算和显示
  - [x] SubTask 4.3: 添加偏度（Skewness）计算和显示
  - [x] SubTask 4.4: 添加峰度（Kurtosis）计算和显示
  - [x] SubTask 4.5: 添加 95% 置信区间计算和显示
  - [x] SubTask 4.6: 为每个指标添加解释说明 Tooltip

- [x] Task 5: 优化热力图交互
  - [x] SubTask 5.1: 实现鼠标悬停时的高亮行和列
  - [x] SubTask 5.2: 优化热力图 Tooltip 显示详细信息
  - [x] SubTask 5.3: 添加点击展开详细对比功能

- [x] Task 6: 异常值可视化标注 (P2)
  - [x] SubTask 6.1: 在图表数据中标记异常点
  - [x] SubTask 6.2: 为异常数据点添加特殊样式（如不同颜色的点）
  - [x] SubTask 6.3: 在图例中添加异常标注说明

- [x] Task 7: 优化价格比较表
  - [x] SubTask 7.1: 添加颜色渐变显示价格差异
  - [x] SubTask 7.2: 实现表格排序功能
  - [x] SubTask 7.3: 添加迷你趋势图（Sparkline）显示

- [x] Task 8: 增强稳定性分析表
  - [x] SubTask 8.1: 添加数据完整性评分指标
  - [x] SubTask 8.2: 添加价格跳动频率指标
  - [x] SubTask 8.3: 使用可视化指标条显示各指标值

- [x] Task 9: 更新国际化配置
  - [x] SubTask 9.1: 添加新增统计指标的中英文翻译
  - [x] SubTask 9.2: 添加新增组件的中英文翻译
  - [x] SubTask 9.3: 添加指标解释说明的中英文翻译

- [x] Task 10: 集成和测试
  - [x] SubTask 10.1: 将所有新组件集成到跨链比较页面
  - [x] SubTask 10.2: 测试所有新增功能的交互性
  - [x] SubTask 10.3: 验证响应式布局
  - [x] SubTask 10.4: 性能优化和代码清理

# Task Dependencies
- [Task 2] 依赖 [Task 4] (分布分析需要统计指标)
- [Task 3] 依赖 [Task 4] (相关性分析需要统计指标)
- [Task 5] 依赖 [Task 6] (热力图交互需要异常检测)
- [Task 7] 依赖 [Task 6] (价格比较表需要异常检测)
- [Task 10] 依赖 [Task 1-9] (集成测试依赖所有功能完成)
