# 颜色系统优化任务

## 高优先级

- [ ] **Task 1: 修复 shadowColors 占位符问题**
  - [ ] 在 colors.ts 中填充实际的阴影颜色值
  - [ ] shadowColors.soft: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
  - [ ] shadowColors.medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  - [ ] shadowColors.strong: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  - [ ] shadowColors.tooltip: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  - [ ] shadowColors.card: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
  - [ ] shadowColors.cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  - [ ] shadowColors.inputFocus: '0 0 0 3px rgba(59, 130, 246, 0.1)'
  - [ ] shadowColors.glow: '0 0 20px rgba(59, 130, 246, 0.3)'
  - [ ] shadowColors.pulse: '0 0 0 0 rgba(59, 130, 246, 0.4)'

- [ ] **Task 2: 统一 marketOverview 命名规范**
  - [ ] 在 colors.ts 中将 `band` 改为 `bandProtocol`
  - [ ] 更新 src/lib/services/marketData/defiLlamaApi.ts 中的引用
  - [ ] 更新 src/app/[locale]/market-overview/components/ChartRenderer.tsx 中的引用
  - [ ] 更新 src/components/oracle/charts/DataQualityTrend.tsx 中的引用

## 中优先级

- [ ] **Task 3: 添加类型接口定义**
  - [ ] 在 colors.ts 顶部添加 ColorScale 接口
  - [ ] 添加 SemanticColor 接口
  - [ ] 添加 ShadowColor 接口
  - [ ] 为 baseColors 添加 ColorScale 类型注解
  - [ ] 为 semanticColors 添加 Record<string, SemanticColor> 类型

- [ ] **Task 4: 完善 JSDoc 注释**
  - [ ] 为 getPriceChangeColor 添加完整 JSDoc
  - [ ] 为 getChartSequenceColor 添加完整 JSDoc
  - [ ] 为 getContrastTextColor 添加算法说明
  - [ ] 为 colorblindTheme.ts 中的函数添加 JSDoc

## Task Dependencies
- Task 2 依赖 Task 1（需要确保 colors.ts 修改完成）
- Task 3 和 Task 4 可以并行执行
