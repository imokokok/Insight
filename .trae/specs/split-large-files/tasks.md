# Tasks

- [x] Task 1: 拆分 api3DataAggregator.ts 模拟数据
  - [x] SubTask 1.1: 创建 `src/lib/oracles/api3MockData.ts` 文件，包含所有模拟数据生成函数和数据常量
  - [x] SubTask 1.2: 更新 `api3DataAggregator.ts`，导入并使用新的模拟数据模块
  - [x] SubTask 1.3: 确保所有导出和类型定义正确

- [x] Task 2: 拆分 OracleMarketDataService.ts 默认数据
  - [x] SubTask 2.1: 创建 `src/lib/services/oracle/marketDataDefaults.ts` 文件，包含所有默认数据常量
  - [x] SubTask 2.2: 更新 `OracleMarketDataService.ts`，导入并使用新的默认数据模块
  - [x] SubTask 2.3: 确保所有导出和类型定义正确

- [x] Task 3: 验证拆分结果
  - [x] SubTask 3.1: 运行 TypeScript 类型检查确保无类型错误
  - [x] SubTask 3.2: 运行 lint 检查确保代码质量

# Task Dependencies

- [Task 2] 可与 [Task 1] 并行执行
- [Task 3] 依赖于 [Task 1] 和 [Task 2] 完成
