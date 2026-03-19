# Tasks

## 阶段一：类型定义整合

- [x] Task 1: 整合 ChartDataPoint 类型定义
  - [x] SubTask 1.1: 确认 src/types/ui/index.ts 中的 ChartDataPoint 定义完整
  - [x] SubTask 1.2: 分析各文件的 ChartDataPoint 定义（发现不兼容）
  - [x] SubTask 1.3: 创建 TimeSeriesChartDataPoint 类型统一时间序列图表数据
  - [x] SubTask 1.4: 更新所有文件使用导入的类型

- [x] Task 2: 整合 ApiResponse 相关类型定义
  - [x] SubTask 2.1: 分析各文件的 ApiResponse 定义
  - [x] SubTask 2.2: 删除未使用的 src/types/api/responses.ts
  - [x] SubTask 2.3: 删除未使用的 src/lib/api/types.ts
  - [x] SubTask 2.4: 保留实际使用的 src/lib/api/response/ApiResponse.ts

- [x] Task 3: 整合价格相关类型定义
  - [x] SubTask 3.1: 确认 src/types/oracle/price.ts 定义完整
  - [x] SubTask 3.2: 更新所有使用 PriceData, PricePoint 的文件导入
  - [x] SubTask 3.3: 删除重复定义

## 阶段二：工具函数整合

- [x] Task 4: 创建统一的格式化工具函数
  - [x] SubTask 4.1: src/lib/utils/format.ts 已存在
  - [x] SubTask 4.2: 整合 formatNumber 函数（8处重复）
  - [x] SubTask 4.3: 整合 formatPrice 函数
  - [x] SubTask 4.4: 更新所有使用这些函数的组件

- [x] Task 5: 创建统一的日期工具函数
  - [x] SubTask 5.1: 更新 src/lib/utils/timestamp.ts
  - [x] SubTask 5.2: 整合 getTimeAgo 函数（3处重复）
  - [x] SubTask 5.3: 整合 formatDate 函数
  - [x] SubTask 5.4: 整合 formatTimestamp 函数
  - [x] SubTask 5.5: 更新所有使用这些函数的文件

## 阶段三：常量整合

- [x] Task 6: 整合 ORACLE_COLORS 常量
  - [x] SubTask 6.1: 确认 src/lib/constants/index.ts 定义完整
  - [x] SubTask 6.2: 删除 anomalyUtils.tsx 和 qualityUtils.ts 中未使用的 ORACLE_COLORS
  - [x] SubTask 6.3: 重构 market-overview/constants.ts 使用统一常量
  - [x] SubTask 6.4: 更新所有导入

- [x] Task 7: 整合其他常量
  - [x] SubTask 7.1: chainColors 已在 src/lib/constants/index.ts 中定义
  - [x] SubTask 7.2: 整合 PROVIDER_NAMES 常量到 providerNames
  - [x] SubTask 7.3: 更新所有导入

## 阶段四：清理未使用代码

- [x] Task 8: 检查并清理未使用的模块导出文件
  - [x] SubTask 8.1: 删除 src/components/features/index.ts
  - [x] SubTask 8.2: 删除 src/components/charts/index.ts
  - [x] SubTask 8.3: 删除 src/lib/export/index.ts
  - [x] SubTask 8.4: 删除 src/lib/api/validation/index.ts
  - [x] SubTask 8.5: 删除 src/lib/api/response/index.ts
  - [x] SubTask 8.6: 所有文件确认未使用并已删除

- [x] Task 9: 清理未使用的导入
  - [x] SubTask 9.1: 运行 lint 检查未使用的导入
  - [x] SubTask 9.2: 自动修复了 29 个问题

## 阶段五：验证

- [x] Task 10: 验证代码清理结果
  - [x] SubTask 10.1: 运行 TypeScript 类型检查 - 通过
  - [x] SubTask 10.2: 运行 ESLint 检查 - 通过（无新错误）
  - [x] SubTask 10.3: 运行构建测试 - TypeScript 编译成功
  - [x] SubTask 10.4: 验证应用功能正常

# Task Dependencies
- [Task 2] depends on [Task 1] (类型整合顺序)
- [Task 3] depends on [Task 2]
- [Task 4] 和 [Task 5] 可并行执行
- [Task 6] 和 [Task 7] 可并行执行
- [Task 8] 和 [Task 9] 可在阶段一至三完成后并行执行
- [Task 10] depends on [Task 1-9] (所有清理完成后验证)
