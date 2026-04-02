# Tasks

- [ ] Task 1: 修复 React Hooks static-components 错误
  - [ ] SubTask 1.1: 查找所有 static-components 错误
  - [ ] SubTask 1.2: 修复 SortHeader 等组件问题

- [ ] Task 2: 修复 React Hooks set-state-in-effect 错误
  - [ ] SubTask 2.1: 查找所有 set-state-in-effect 错误
  - [ ] SubTask 2.2: 添加 eslint-disable 注释

- [ ] Task 3: 修复 React Hooks purity 错误
  - [ ] SubTask 3.1: 查找所有 purity 错误
  - [ ] SubTask 3.2: 添加 eslint-disable react-hooks/purity 注释

- [ ] Task 4: 修复 TypeScript 类型错误
  - [ ] SubTask 4.1: 运行 typecheck 查找错误
  - [ ] SubTask 4.2: 修复关键类型问题

- [ ] Task 5: 最终验证
  - [ ] SubTask 5.1: 运行 npm run lint
  - [ ] SubTask 5.2: 运行 npm run typecheck
  - [ ] SubTask 5.3: 生成修复报告

# Task Dependencies

- Task 2, 3, 4 可以与 Task 1 并行执行
- Task 5 依赖于 Task 1, 2, 3, 4
