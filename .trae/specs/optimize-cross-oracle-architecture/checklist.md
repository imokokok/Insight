# 多预言机对比页面代码架构优化检查清单

## Context Providers 检查

- [ ] OracleDataContext 已创建
- [ ] OracleDataContext 提供价格数据
- [ ] OracleDataContext 提供统计指标
- [ ] ChartConfigContext 已创建
- [ ] ChartConfigContext 提供图表配置
- [ ] UIStateContext 已创建
- [ ] UIStateContext 提供 UI 状态

## Hook 拆分检查

- [ ] useOracleSelection hook 已创建
- [ ] usePriceData hook 已创建
- [ ] useChartInteractions hook 已创建
- [ ] useFilterState hook 已创建
- [ ] useSnapshotActions hook 已创建
- [ ] 主 useCrossOraclePage 已重构
- [ ] 每个 hook 代码行数 < 150 行

## 组件拆分检查

- [ ] OverviewTab 组件已创建
- [ ] AnalysisTab 组件已创建
- [ ] HistoryTab 组件已创建
- [ ] Tab 组件使用动态导入
- [ ] ComparisonTabs props 数量 < 20
- [ ] 组件通过 Context 获取数据

## 性能优化检查

- [ ] StatsSection 使用 React.memo
- [ ] PriceTableSection 使用 React.memo
- [ ] 图表数据使用 useMemo 缓存
- [ ] 统计指标使用 useMemo 缓存
- [ ] 事件处理函数使用 useCallback 缓存

## 类型定义检查

- [ ] types/oracle.ts 已创建
- [ ] types/chart.ts 已创建
- [ ] types/stats.ts 已创建
- [ ] types/ui.ts 已创建
- [ ] 所有类型导入路径已更新
- [ ] 无重复类型定义

## 功能测试检查

- [ ] TypeScript 类型检查通过
- [ ] 项目构建成功
- [ ] 所有 Tab 正常显示
- [ ] Context 数据传递正常
- [ ] 懒加载正常工作
- [ ] 首屏加载时间优化
- [ ] 组件重渲染次数减少

## 代码质量检查

- [ ] 代码可维护性提升
- [ ] Props drilling 减少
- [ ] 组件职责单一
- [ ] Hook 职责单一
