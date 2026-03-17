# Checklist

## PriceChart 拆分验证
- [x] ChartToolbar.tsx 组件正确提取工具栏功能
- [x] TechnicalIndicators.tsx 正确处理MA、RSI、MACD指标（使用现有hook）
- [x] useChartState.ts 正确管理图表状态
- [x] chartUtils.ts 工具函数可复用
- [x] 重构后的 index.tsx 功能与原来一致
- [x] PriceChart 组件在所有使用位置正常工作

## OraclePageTemplate 拆分验证
- [x] oraclePanels/ 目录结构正确创建
- [x] 各Oracle面板配置正确提取
- [x] oraclePanels/index.ts 正确导出所有面板
- [x] 重构后的 OraclePageTemplate.tsx 功能与原来一致
- [x] 所有Oracle页面正常显示

## LatencyTrendChart 拆分验证
- [x] LatencyHistogram.tsx 正确渲染延迟直方图
- [x] LatencyPrediction.tsx 正确处理预测功能
- [x] useLatencyStats.ts 正确计算延迟统计
- [x] latencyUtils.ts 工具函数可复用
- [x] 重构后的 LatencyTrendChart.tsx 功能与原来一致
- [x] 延迟趋势图表在所有使用位置正常工作

## 整体验证
- [x] 项目可以正常构建 (npm run build)
- [x] 没有TypeScript类型错误
- [x] 没有ESLint错误
