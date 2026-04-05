# 组件复用优化检查清单

## 第一阶段：SparklineChart 组件合并

- [ ] `src/components/ui/SparklineChart.tsx` 已更新支持所有功能
- [ ] 所有引用 `src/components/oracle/charts/SparklineChart.tsx` 的文件已更新
- [ ] 所有引用 `src/components/charts/SparklineChart.tsx` 的文件已更新
- [ ] 重复的 SparklineChart 文件已删除
- [ ] 相关 index.ts 导出文件已更新

## 第二阶段：DataFreshnessIndicator 组件合并

- [ ] `src/components/ui/DataFreshnessIndicator.tsx` 已更新支持面板模式
- [ ] 所有引用其他 DataFreshnessIndicator 的文件已更新
- [ ] 重复的 DataFreshnessIndicator 文件已删除
- [ ] 相关 index.ts 导出文件已更新

## 第三阶段：OracleErrorBoundary 清理

- [ ] `src/components/oracle/shared/OracleErrorBoundary.tsx` 已删除
- [ ] 所有引用该文件的导入路径已更新
- [ ] 相关 index.ts 导出文件已更新

## 第四阶段：OracleHeroBase 组件创建

- [ ] `src/components/oracle/shared/OracleHeroBase.tsx` 已创建
- [ ] 配置接口已定义（themeColor, stats, logo, networkStats 等）
- [ ] 通用功能已实现（健康度评分计算、价格走势数据生成）
- [ ] 至少一个 Hero 组件已重构使用 OracleHeroBase
- [ ] 重构后的组件功能正常

## 第五阶段：OracleRiskViewBase 组件创建

- [ ] `src/components/oracle/shared/OracleRiskViewBase.tsx` 已创建
- [ ] 通用辅助函数已提取（getRiskColor, getRiskBgColor, getTrendIcon）
- [ ] 配置接口已定义（riskMetrics, riskFactors, benchmarkData 等）
- [ ] 至少一个 RiskView 组件已重构使用 OracleRiskViewBase
- [ ] 重构后的组件功能正常

## 第六阶段：OracleMarketViewBase 组件创建

- [ ] `src/components/oracle/shared/OracleMarketViewBase.tsx` 已创建
- [ ] 配置接口已定义（stats, networkStatus, dataSources 等）
- [ ] 至少一个 MarketView 组件已重构使用 OracleMarketViewBase
- [ ] 重构后的组件功能正常

## 最终验证

- [ ] TypeScript 类型检查通过
- [ ] ESLint 检查通过
- [ ] 所有测试通过（如果有）
- [ ] 受影响的页面手动测试通过
- [ ] 无运行时错误
