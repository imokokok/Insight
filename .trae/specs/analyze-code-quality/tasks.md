# Tasks

- [x] Task 1: 运行 ESLint 检查并收集结果
  - [x] SubTask 1.1: 运行 npm run lint 获取完整错误列表
  - [x] SubTask 1.2: 将结果保存到 lint-report.json

- [x] Task 2: 运行 TypeScript 类型检查
  - [x] SubTask 2.1: 运行 npm run typecheck
  - [x] SubTask 2.2: 记录类型错误数量和分布

- [x] Task 3: 运行测试并收集覆盖率
  - [x] SubTask 3.1: 运行 npm run test:coverage
  - [x] SubTask 3.2: 记录通过/失败测试数量

- [x] Task 4: 分析问题分布
  - [x] SubTask 4.1: 按问题类型分类 ESLint 错误
  - [x] SubTask 4.2: 按文件类型统计问题分布
  - [x] SubTask 4.3: 识别高频问题文件

- [x] Task 5: 生成代码质量分析报告
  - [x] SubTask 5.1: 汇总所有检查结果
  - [x] SubTask 5.2: 生成质量评分
  - [x] SubTask 5.3: 提供改进建议

# Task Dependencies

- Task 4 依赖于 Task 1, Task 2, Task 3
- Task 5 依赖于 Task 4
