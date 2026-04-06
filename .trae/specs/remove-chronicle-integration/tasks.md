# Tasks

## 阶段一：删除 Chronicle 核心文件

- [ ] Task 1: 删除 Chronicle 客户端服务文件
  - [ ] SubTask 1.1: 删除 `src/lib/services/oracle/clients/chronicle.ts`
  - [ ] SubTask 1.2: 删除 `src/lib/oracles/chronicle.ts`
  - [ ] SubTask 1.3: 删除 `src/lib/oracles/chronicleOnChainService.ts`
  - [ ] SubTask 1.4: 删除 `src/lib/oracles/chronicleDataSources.ts`

- [ ] Task 2: 删除 Chronicle hooks 文件
  - [ ] SubTask 2.1: 删除 `src/hooks/oracles/chronicle.ts`

- [ ] Task 3: 删除 Chronicle 测试文件
  - [ ] SubTask 3.1: 删除 `src/lib/oracles/__tests__/chronicle.test.ts`

- [ ] Task 4: 删除 Chronicle i18n 翻译文件
  - [ ] SubTask 4.1: 删除 `src/i18n/messages/zh-CN/oracles/chronicle.json`
  - [ ] SubTask 4.2: 删除 `src/i18n/messages/en/oracles/chronicle.json`

## 阶段二：从枚举和类型中移除 Chronicle

- [ ] Task 5: 从 OracleProvider 枚举中移除 CHRONICLE
  - [ ] SubTask 5.1: 修改 `src/types/oracle/enums.ts`
  - [ ] SubTask 5.2: 修改 `src/types/oracle/oracle.ts`
  - [ ] SubTask 5.3: 修改 `src/types/guards.ts`

## 阶段三：从配置和常量中移除 Chronicle

- [ ] Task 6: 从配置文件中移除 Chronicle
  - [ ] SubTask 6.1: 修改 `src/lib/config/oracles.tsx`
  - [ ] SubTask 6.2: 修改 `src/lib/config/colors.ts`
  - [ ] SubTask 6.3: 修改 `src/lib/config/serverEnv.ts`
  - [ ] SubTask 6.4: 修改 `src/lib/config/colorblind-friendly.ts`

- [ ] Task 7: 从常量文件中移除 Chronicle
  - [ ] SubTask 7.1: 修改 `src/lib/constants/index.ts`
  - [ ] SubTask 7.2: 修改 `src/lib/constants/searchConfig.ts`

## 阶段四：从服务和 hooks 索引中移除 Chronicle

- [ ] Task 8: 从服务索引中移除 Chronicle
  - [ ] SubTask 8.1: 修改 `src/lib/services/oracle/index.ts`
  - [ ] SubTask 8.2: 修改 `src/lib/services/oracle/marketDataDefaults.ts`

- [ ] Task 9: 从 hooks 索引中移除 Chronicle
  - [ ] SubTask 9.1: 修改 `src/hooks/oracles/index.ts`
  - [ ] SubTask 9.2: 修改 `src/hooks/index.ts`

- [ ] Task 10: 从 oracles 库中移除 Chronicle
  - [ ] SubTask 10.1: 修改 `src/lib/oracles/index.ts`
  - [ ] SubTask 10.2: 修改 `src/lib/oracles/factory.ts`
  - [ ] SubTask 10.3: 修改 `src/lib/oracles/colors.ts`
  - [ ] SubTask 10.4: 修改 `src/lib/oracles/supportedSymbols.ts`
  - [ ] SubTask 10.5: 修改 `src/lib/oracles/performanceMetricsConfig.ts`
  - [ ] SubTask 10.6: 修改 `src/lib/oracles/oracle-config.ts`

## 阶段五：从功能模块中移除 Chronicle

- [ ] Task 11: 从搜索功能中移除 Chronicle
  - [ ] SubTask 11.1: 修改 `src/components/search/data.ts`

- [ ] Task 12: 从跨预言机对比功能中移除 Chronicle
  - [ ] SubTask 12.1: 修改 `src/app/[locale]/cross-oracle/constants.tsx`
  - [ ] SubTask 12.2: 修改 `src/app/[locale]/cross-oracle/chartConfig.ts`

- [ ] Task 13: 从价格查询功能中移除 Chronicle
  - [ ] SubTask 13.1: 修改 `src/app/[locale]/price-query/hooks/usePriceQueryState.ts`

- [ ] Task 14: 从市场概览功能中移除 Chronicle
  - [ ] SubTask 14.1: 修改 `src/app/[locale]/market-overview/constants.ts`

## 阶段六：从其他文件中移除 Chronicle

- [ ] Task 15: 从 API 和验证中移除 Chronicle
  - [ ] SubTask 15.1: 修改 `src/lib/api/oracleHandlers.ts`
  - [ ] SubTask 15.2: 修改 `src/lib/validation/schemas.ts`
  - [ ] SubTask 15.3: 修改 `src/lib/security/inputSanitizer.ts`

- [ ] Task 16: 从 i18n 配置和翻译中移除 Chronicle
  - [ ] SubTask 16.1: 修改 `src/i18n/config.ts`
  - [ ] SubTask 16.2: 修改 `src/i18n/generated-types.ts`
  - [ ] SubTask 16.3: 从各翻译文件中移除 Chronicle 相关翻译

- [ ] Task 17: 从测试文件中移除 Chronicle
  - [ ] SubTask 17.1: 修改 `src/lib/oracles/__tests__/factory.test.ts`

## 阶段七：验证和测试

- [ ] Task 18: 验证 Chronicle 完全移除
  - [ ] SubTask 18.1: 搜索项目中是否还有 Chronicle 引用
  - [ ] SubTask 18.2: 运行 TypeScript 类型检查
  - [ ] SubTask 18.3: 运行构建命令

# Task Dependencies

- 阶段一的任务（Task 1-4）可以并行执行
- 阶段二的任务（Task 5）依赖于阶段一完成
- 阶段三的任务（Task 6-7）可以并行执行
- 阶段四的任务（Task 8-10）可以并行执行，依赖于阶段二完成
- 阶段五的任务（Task 11-14）可以并行执行，依赖于阶段四完成
- 阶段六的任务（Task 15-17）可以并行执行，依赖于阶段五完成
- 阶段七的任务（Task 18）依赖于所有其他阶段完成
