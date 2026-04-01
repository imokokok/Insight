# Tasks

- [x] Task 1: 创建常量文件 constants.ts
  - [x] SubTask 1.1: 提取 MarketSidebar 中的集中度阈值常量
  - [x] SubTask 1.2: 提取图表相关常量
  - [x] SubTask 1.3: 提取筛选器相关常量

- [x] Task 2: 拆分 types.ts 类型定义文件
  - [x] SubTask 2.1: 创建 types/oracle.ts 包含预言机相关类型
  - [x] SubTask 2.2: 创建 types/asset.ts 包含资产相关类型
  - [x] SubTask 2.3: 创建 types/chart.ts 包含图表相关类型
  - [x] SubTask 2.4: 创建 types/risk.ts 包含风险指标类型
  - [x] SubTask 2.5: 创建 types/index.ts 统一导出所有类型
  - [x] SubTask 2.6: 更新原 types.ts 文件为重新导出

- [x] Task 3: 创建 useMarketInsights hook
  - [x] SubTask 3.1: 从 MarketSidebar 提取计算逻辑
  - [x] SubTask 3.2: 使用 useMemo 优化计算性能
  - [x] SubTask 3.3: 更新 MarketSidebar 使用新 hook

- [x] Task 4: 拆分 useMarketPage hook
  - [x] SubTask 4.1: 创建 hooks/useChartState.ts
  - [x] SubTask 4.2: 创建 hooks/useComparisonState.ts
  - [x] SubTask 4.3: 更新 useMarketPage 使用新 hooks

- [x] Task 5: 创建 ChartContext
  - [x] SubTask 5.1: 创建 context/ChartContext.tsx
  - [x] SubTask 5.2: 更新 page.tsx 使用 ChartProvider
  - [x] SubTask 5.3: 更新 ChartContainer 使用 useChartContext

- [x] Task 6: 优化 AssetsTable
  - [x] SubTask 6.1: 提取 columns 定义为 useAssetsTableColumns hook
  - [x] SubTask 6.2: 使用 useMemo 缓存 columns 配置

- [x] Task 7: 验证和测试
  - [x] SubTask 7.1: 运行 TypeScript 类型检查
  - [x] SubTask 7.2: 运行 ESLint 检查
  - [x] SubTask 7.3: 验证页面功能正常

# Task Dependencies

- Task 2 依赖 Task 1（类型定义可能依赖常量）
- Task 3 依赖 Task 1（需要使用常量）
- Task 4 依赖 Task 2（需要使用拆分后的类型）
- Task 5 依赖 Task 4（ChartContext 可能使用拆分后的 hooks）
- Task 6 可以并行执行
- Task 7 依赖所有其他任务
