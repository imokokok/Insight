# Checklist

## SWR 缓存策略
- [x] SWR 配置中添加缓存存储策略
- [x] 配置 provider 级别的默认 staleTime
- [x] 预加载配置正常工作
- [x] 缓存过期前静默更新机制生效

## 虚拟滚动
- [x] ValidatorPanel 虚拟滚动正常工作
- [x] PublisherList 虚拟滚动正常工作
- [x] 滚动流畅，无明显卡顿

## 图表数据降采样
- [x] PriceChart 组件数据降采样正确
- [x] LatencyTrendChart 降采样正确
- [x] 不同时间范围使用合适的采样率

## 组件 memo 优化
- [x] StatCard 组件正确添加 React.memo
- [x] MetricCardComponent 添加 memo
- [x] DashboardCard 基础组件添加 memo
- [x] useCallback 和 useMemo 依赖数组正确

## 国际化优化
- [x] next-intl 按需加载语言资源
- [x] 浏览器语言检测和自动切换正常

## 数据获取 Hook
- [x] useOracleData 支持自定义 staleTime
- [x] 数据预取方法正常工作

## 整体验证
- [x] 页面加载时间有可感知的改善
- [x] 滚动和交互流畅度提升
- [x] 无新增控制台错误或警告
- [x] 原有功能正常工作
