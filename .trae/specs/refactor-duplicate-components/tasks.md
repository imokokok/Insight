# Tasks

## 第一阶段：清理完全重复的组件

- [ ] Task 1: 合并 SparklineChart 组件
  - [ ] SubTask 1.1: 分析三个 SparklineChart 组件的功能差异
  - [ ] SubTask 1.2: 更新 `src/components/ui/SparklineChart.tsx` 以支持所有功能
  - [ ] SubTask 1.3: 更新所有引用 `src/components/oracle/charts/SparklineChart.tsx` 的文件
  - [ ] SubTask 1.4: 更新所有引用 `src/components/charts/SparklineChart.tsx` 的文件
  - [ ] SubTask 1.5: 删除重复的 SparklineChart 文件
  - [ ] SubTask 1.6: 更新相关 index.ts 导出文件

- [ ] Task 2: 合并 DataFreshnessIndicator 组件
  - [ ] SubTask 2.1: 分析三个 DataFreshnessIndicator 组件的功能差异
  - [ ] SubTask 2.2: 更新 `src/components/ui/DataFreshnessIndicator.tsx` 以支持面板模式
  - [ ] SubTask 2.3: 更新所有引用其他 DataFreshnessIndicator 的文件
  - [ ] SubTask 2.4: 删除重复的 DataFreshnessIndicator 文件
  - [ ] SubTask 2.5: 更新相关 index.ts 导出文件

- [ ] Task 3: 清理 OracleErrorBoundary 重复导出
  - [ ] SubTask 3.1: 删除 `src/components/oracle/shared/OracleErrorBoundary.tsx`
  - [ ] SubTask 3.2: 更新所有引用该文件的导入路径
  - [ ] SubTask 3.3: 更新相关 index.ts 导出文件

## 第二阶段：创建可复用的 Oracle 基础组件

- [ ] Task 4: 创建 OracleHeroBase 组件
  - [ ] SubTask 4.1: 提取 Hero 组件的通用布局和样式
  - [ ] SubTask 4.2: 创建 `src/components/oracle/shared/OracleHeroBase.tsx`
  - [ ] SubTask 4.3: 定义配置接口（themeColor, stats, logo, networkStats 等）
  - [ ] SubTask 4.4: 实现通用功能（健康度评分计算、价格走势数据生成）
  - [ ] SubTask 4.5: 重构一个 Hero 组件（如 DIAHero）作为示例
  - [ ] SubTask 4.6: 验证重构后的组件功能正常

- [ ] Task 5: 创建 OracleRiskViewBase 组件
  - [ ] SubTask 5.1: 提取 RiskView 组件的通用功能
  - [ ] SubTask 5.2: 创建 `src/components/oracle/shared/OracleRiskViewBase.tsx`
  - [ ] SubTask 5.3: 提取通用辅助函数（getRiskColor, getRiskBgColor, getTrendIcon）
  - [ ] SubTask 5.4: 定义配置接口（riskMetrics, riskFactors, benchmarkData 等）
  - [ ] SubTask 5.5: 重构一个 RiskView 组件作为示例
  - [ ] SubTask 5.6: 验证重构后的组件功能正常

- [ ] Task 6: 创建 OracleMarketViewBase 组件
  - [ ] SubTask 6.1: 提取 MarketView 组件的通用布局
  - [ ] SubTask 6.2: 创建 `src/components/oracle/shared/OracleMarketViewBase.tsx`
  - [ ] SubTask 6.3: 定义配置接口（stats, networkStatus, dataSources 等）
  - [ ] SubTask 6.4: 重构一个 MarketView 组件作为示例
  - [ ] SubTask 6.5: 验证重构后的组件功能正常

## 第三阶段：验证和文档

- [ ] Task 7: 验证重构结果
  - [ ] SubTask 7.1: 运行 TypeScript 类型检查
  - [ ] SubTask 7.2: 运行 ESLint 检查
  - [ ] SubTask 7.3: 运行测试（如果有）
  - [ ] SubTask 7.4: 手动测试受影响的页面

# Task Dependencies

- [Task 2] depends on [Task 1] (先处理简单的组件合并)
- [Task 3] depends on [Task 2]
- [Task 4] depends on [Task 3] (基础组件清理完成后再创建新的基础组件)
- [Task 5] depends on [Task 4]
- [Task 6] depends on [Task 5]
- [Task 7] depends on [Task 6]
