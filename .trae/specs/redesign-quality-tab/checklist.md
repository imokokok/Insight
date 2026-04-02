# Checklist

## 专业指标计算

- [x] 变异系数(CV)计算正确
- [x] 标准误差(SEM)计算正确
- [x] 95%置信区间计算正确
- [x] Z-Score计算正确（各预言机相对中位数）
- [x] 延迟统计(P50/P95/P99)计算正确
- [x] 置信度计算逻辑正确

## 核心指标展示组件

- [x] `QualityMetricsHeader.tsx` 组件存在且功能正常
- [x] CV、SEM、置信区间、样本数展示正确
- [x] 指标解释Tooltip正常显示
- [x] 布局紧凑，无多余装饰

## 数据源质量对比表格

- [x] `OracleQualityTable.tsx` 组件存在且功能正常
- [x] 表格列完整：预言机、价格、偏差%、Z-Score、延迟、置信度
- [x] 异常行高亮正确（|Z-Score| > 2）
- [x] 排序功能正常
- [x] 颜色编码标识异常正确

## 质量趋势图表

- [x] `QualityTrendChart.tsx` 组件存在且功能正常
- [x] CV/标准差时间序列展示正确
- [x] 异常时间点标注正确
- [x] 图表响应式适配正常

## 异常检测面板

- [x] `QualityAnomaliesPanel.tsx` 组件存在且功能正常
- [x] 离群值列表展示正确（Z-Score > 2或<-2）
- [x] 延迟异常列表展示正确
- [x] 紧凑列表样式（非卡片式）
- [x] 无数据时正确隐藏

## 数据质量Tab重写

- [x] `SimpleQualityAnalysisTab.tsx` 完全重写
- [x] 无卡片式布局
- [x] 核心指标行组件整合正确
- [x] 对比表格组件整合正确
- [x] 趋势图表组件整合正确
- [x] 异常面板组件整合正确
- [x] 两栏布局（左侧图表+右侧表格）实现正确
- [x] 所有改进建议代码已移除
- [x] 所有评分卡片代码已移除
- [x] 无环形进度图
- [x] 无装饰性进度条

## 国际化文案

- [x] 中文专业指标文案完整
- [x] 英文专业指标文案完整
- [x] 表格列标题文案完整
- [x] 旧的三维度评分文案已移除

## 类型定义

- [x] `DataQualityScore` 类型已扩展专业指标字段
- [x] `OracleQualityMetrics` 类型已添加
- [x] `LatencyStats` 类型已添加
- [x] 无TypeScript类型错误

## 性能优化

- [x] useMemo 优化已添加
- [x] React.memo 优化已添加
- [x] lint 检查通过
- [x] 无 console.error/warning

## 功能验证

- [x] 页面加载正常
- [x] 专业指标显示正确
- [x] 表格数据正确
- [x] 图表渲染正常
- [x] 异常检测逻辑正确
- [x] 排序功能正常
- [x] Tooltip显示正常
