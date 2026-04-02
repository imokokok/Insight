# Tasks

## Phase 1: 扩展数据质量Hook

- [ ] Task 1: 扩展 useDataQualityScore Hook 计算专业指标
  - [ ] SubTask 1.1: 添加变异系数(CV)计算
  - [ ] SubTask 1.2: 添加标准误差(SEM)计算
  - [ ] SubTask 1.3: 添加95%置信区间计算
  - [ ] SubTask 1.4: 添加Z-Score计算（各预言机相对中位数）
  - [ ] SubTask 1.5: 添加延迟统计(P50/P95/P99)
  - [ ] SubTask 1.6: 添加置信度计算逻辑

## Phase 2: 创建专业质量指标组件

- [ ] Task 2: 创建核心指标展示组件
  - [ ] SubTask 2.1: 创建 `QualityMetricsHeader.tsx` - 顶部紧凑指标行
  - [ ] SubTask 2.2: 实现CV、SEM、置信区间、样本数展示
  - [ ] SubTask 2.3: 添加指标解释Tooltip

- [ ] Task 3: 创建数据源质量对比表格
  - [ ] SubTask 3.1: 创建 `OracleQualityTable.tsx` - 专业对比表格
  - [ ] SubTask 3.2: 实现表格列：预言机、价格、偏差%、Z-Score、延迟、置信度
  - [ ] SubTask 3.3: 实现异常行高亮（|Z-Score| > 2 或延迟过高）
  - [ ] SubTask 3.4: 添加排序功能（按Z-Score、延迟等）

- [ ] Task 4: 创建质量趋势图表组件
  - [ ] SubTask 4.1: 创建 `QualityTrendChart.tsx` - 一致性趋势图
  - [ ] SubTask 4.2: 使用Recharts展示CV/标准差时间序列
  - [ ] SubTask 4.3: 标注异常时间点

- [ ] Task 5: 创建异常检测面板
  - [ ] SubTask 5.1: 创建 `QualityAnomaliesPanel.tsx` - 异常数据面板
  - [ ] SubTask 5.2: 展示离群值列表（Z-Score > 2或<-2）
  - [ ] SubTask 5.3: 展示延迟异常列表
  - [ ] SubTask 5.4: 实现紧凑列表样式（非卡片式）

## Phase 3: 重写数据质量Tab

- [ ] Task 6: 完全重写 SimpleQualityAnalysisTab
  - [ ] SubTask 6.1: 移除所有卡片式布局
  - [ ] SubTask 6.2: 整合核心指标行组件
  - [ ] SubTask 6.3: 整合对比表格组件
  - [ ] SubTask 6.4: 整合趋势图表组件
  - [ ] SubTask 6.5: 整合异常面板组件
  - [ ] SubTask 6.6: 实现两栏布局（左侧图表+右侧表格）
  - [ ] SubTask 6.7: 移除所有改进建议相关代码
  - [ ] SubTask 6.8: 移除所有评分卡片相关代码

## Phase 4: 更新国际化文案

- [ ] Task 7: 更新中文文案
  - [ ] SubTask 7.1: 添加专业指标文案（CV、SEM、置信区间等）
  - [ ] SubTask 7.2: 添加表格列标题文案
  - [ ] SubTask 7.3: 移除旧的三维度评分文案

- [ ] Task 8: 更新英文文案
  - [ ] SubTask 8.1: 添加专业指标英文文案
  - [ ] SubTask 8.2: 添加表格列标题英文文案

## Phase 5: 类型定义更新

- [ ] Task 9: 更新类型定义
  - [ ] SubTask 9.1: 扩展 `DataQualityScore` 类型，添加专业指标字段
  - [ ] SubTask 9.2: 添加 `OracleQualityMetrics` 类型
  - [ ] SubTask 9.3: 添加 `LatencyStats` 类型

## Phase 6: 验证和优化

- [ ] Task 10: 功能验证
  - [ ] SubTask 10.1: 验证所有专业指标计算正确
  - [ ] SubTask 10.2: 验证表格展示正确
  - [ ] SubTask 10.3: 验证图表渲染正确
  - [ ] SubTask 10.4: 验证异常检测逻辑正确

- [ ] Task 11: 性能优化
  - [ ] SubTask 11.1: 添加 useMemo 优化计算
  - [ ] SubTask 11.2: 添加 React.memo 优化组件
  - [ ] SubTask 11.3: 运行 lint 检查

# Task Dependencies

- Task 2, 3, 4, 5 依赖于 Task 1
- Task 6 依赖于 Task 2, 3, 4, 5
- Task 7, 8 依赖于 Task 6
- Task 9 依赖于 Task 1
- Task 10 依赖于 Task 6, 7, 8
- Task 11 依赖于 Task 10

# 可以并行的任务

- Task 2, 3, 4, 5 可以并行开发（在Task 1完成后）
- Task 7, 8 可以并行开发
