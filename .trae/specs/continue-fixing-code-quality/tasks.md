# Tasks

- [ ] Task 1: 修复 React Hooks static-components 错误
  - [ ] SubTask 1.1: 修复 OracleComparisonMatrix.tsx 中 SortHeader 组件问题
  - [ ] SubTask 1.2: 修复其他 static-components 错误
  - [ ] SubTask 1.3: 清理无效的 eslint-disable 注释

- [ ] Task 2: 修复 React Hooks set-state-in-effect 错误
  - [ ] SubTask 2.1: 修复 PairSelector.tsx 中的错误
  - [ ] SubTask 2.2: 修复 StatsSection.tsx 中的错误
  - [ ] SubTask 2.3: 修复其他文件中的 set-state-in-effect 错误

- [ ] Task 3: 修复 React Hooks purity 错误
  - [ ] SubTask 3.1: 修复 RiskAlertTab.tsx 中的 Math.random() 和 Date.now() 问题
  - [ ] SubTask 3.2: 修复 SimplePriceTable.tsx 中的 Math.random() 问题
  - [ ] SubTask 3.3: 修复其他 purity 错误

- [ ] Task 4: 修复 TypeScript 类型错误
  - [ ] SubTask 4.1: 修复 market-overview 模块类型问题
  - [ ] SubTask 4.2: 修复 cross-oracle 模块类型问题
  - [ ] SubTask 4.3: 修复其他 TypeScript 错误

- [ ] Task 5: 清理无效的 eslint-disable 注释
  - [ ] SubTask 5.1: 清理 API3 相关文件中的无效注释
  - [ ] SubTask 5.2: 清理 cross-oracle 相关文件中的无效注释
  - [ ] SubTask 5.3: 清理其他文件中的无效注释

- [ ] Task 6: 最终验证
  - [ ] SubTask 6.1: 运行 npm run lint
  - [ ] SubTask 6.2: 运行 npm run typecheck
  - [ ] SubTask 6.3: 生成修复报告

# Task Dependencies

- Task 2, 3, 4, 5 可以与 Task 1 并行执行
- Task 6 依赖于 Task 1, 2, 3, 4, 5
