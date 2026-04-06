# 移除 Chronicle 预言机集成 Spec

## Why
项目决定不再需要 Chronicle 预言机的支持，需要完全移除所有与 Chronicle 相关的代码、配置和依赖，以简化代码库并减少维护成本。

## What Changes
- **BREAKING**: 移除 ChronicleClient 服务代码
- **BREAKING**: 移除 Chronicle 相关的 hooks
- **BREAKING**: 从 OracleProvider 枚举中移除 CHRONICLE
- **BREAKING**: 从搜索、导航、配置中移除 Chronicle 相关条目
- **BREAKING**: 移除 Chronicle 相关的 i18n 翻译文件
- **BREAKING**: 从跨预言机对比功能中移除 Chronicle 支持
- **BREAKING**: 移除 Chronicle 相关的测试文件

## Impact
- Affected specs: oracle-clients, oracle-enums, search, navigation, i18n, cross-oracle-comparison
- Affected code:
  - `src/lib/services/oracle/clients/chronicle.ts` - 删除
  - `src/hooks/oracles/chronicle.ts` - 删除
  - `src/lib/oracles/chronicle*.ts` - 删除所有 Chronicle 相关服务文件
  - `src/types/oracle/enums.ts` - 移除 CHRONICLE 枚举值
  - `src/lib/config/oracles.tsx` - 移除 Chronicle 配置
  - `src/components/search/data.ts` - 移除 Chronicle 搜索项
  - `src/i18n/messages/*/oracles/chronicle.json` - 删除翻译文件
  - `src/lib/oracles/__tests__/chronicle.test.ts` - 删除测试文件

## ADDED Requirements

### Requirement: 完全移除 Chronicle 支持
系统 SHALL 完全移除所有 Chronicle 预言机的代码和配置，确保项目中不再有任何 Chronicle 相关的引用。

#### Scenario: 检查 Chronicle 引用
- **WHEN** 搜索项目中的 "chronicle" 或 "Chronicle" 或 "CHRONICLE"
- **THEN** 系统 SHALL 不返回任何相关结果（除文档或历史记录外）

#### Scenario: 跨预言机对比功能
- **WHEN** 使用跨预言机对比功能
- **THEN** 系统 SHALL 不显示 Chronicle 作为可选预言机

#### Scenario: 价格查询功能
- **WHEN** 使用价格查询功能
- **THEN** 系统 SHALL 不提供 Chronicle 作为数据源选项

## REMOVED Requirements

### Requirement: Chronicle 预言机支持
**Reason**: 项目不再需要 Chronicle 预言机的支持
**Migration**: 使用其他预言机（Chainlink、Pyth 等）替代 Chronicle 的功能

### Requirement: Chronicle 详情页面
**Reason**: 已在前面的简化任务中删除
**Migration**: 无需迁移，功能已完全移除

---

## Chronicle 相关文件清单

### 需要删除的文件
1. `src/lib/services/oracle/clients/chronicle.ts` - Chronicle 客户端服务
2. `src/hooks/oracles/chronicle.ts` - Chronicle hooks
3. `src/lib/oracles/chronicle.ts` - Chronicle 类型导出
4. `src/lib/oracles/chronicleOnChainService.ts` - Chronicle 链上服务
5. `src/lib/oracles/chronicleDataSources.ts` - Chronicle 数据源配置
6. `src/lib/oracles/__tests__/chronicle.test.ts` - Chronicle 测试文件
7. `src/i18n/messages/zh-CN/oracles/chronicle.json` - 中文翻译
8. `src/i18n/messages/en/oracles/chronicle.json` - 英文翻译

### 需要修改的文件
1. `src/types/oracle/enums.ts` - 移除 CHRONICLE 枚举值
2. `src/lib/config/oracles.tsx` - 移除 Chronicle 配置
3. `src/lib/config/colors.ts` - 移除 Chronicle 颜色配置
4. `src/lib/constants/index.ts` - 移除 Chronicle 相关常量
5. `src/components/search/data.ts` - 移除 Chronicle 搜索项
6. `src/lib/oracles/index.ts` - 移除 Chronicle 导出
7. `src/lib/oracles/factory.ts` - 移除 Chronicle 工厂方法
8. `src/lib/oracles/colors.ts` - 移除 Chronicle 颜色
9. `src/lib/oracles/supportedSymbols.ts` - 移除 Chronicle 支持的代币
10. `src/lib/oracles/performanceMetricsConfig.ts` - 移除 Chronicle 配置
11. `src/lib/services/oracle/index.ts` - 移除 Chronicle 导出
12. `src/lib/services/oracle/marketDataDefaults.ts` - 移除 Chronicle 默认值
13. `src/hooks/oracles/index.ts` - 移除 Chronicle hooks 导出
14. `src/hooks/index.ts` - 移除 Chronicle hooks 导出
15. `src/lib/api/oracleHandlers.ts` - 移除 Chronicle 处理逻辑
16. `src/lib/validation/schemas.ts` - 移除 Chronicle 验证模式
17. `src/types/oracle/oracle.ts` - 移除 Chronicle 类型定义
18. `src/types/guards.ts` - 移除 Chronicle 类型守卫
19. `src/app/[locale]/cross-oracle/constants.tsx` - 移除 Chronicle 配置
20. `src/app/[locale]/cross-oracle/chartConfig.ts` - 移除 Chronicle 配置
21. `src/app/[locale]/price-query/hooks/usePriceQueryState.ts` - 移除 Chronicle 选项
22. `src/app/[locale]/market-overview/constants.ts` - 移除 Chronicle 配置
23. `src/lib/constants/searchConfig.ts` - 移除 Chronicle 搜索配置
24. `src/lib/security/inputSanitizer.ts` - 移除 Chronicle 相关代码
25. `src/lib/config/colorblind-friendly.ts` - 移除 Chronicle 颜色配置
26. `src/lib/config/serverEnv.ts` - 移除 Chronicle 环境变量配置
27. `src/lib/oracles/oracle-config.ts` - 移除 Chronicle 配置
28. `src/lib/oracles/__tests__/factory.test.ts` - 移除 Chronicle 测试
29. `src/i18n/config.ts` - 移除 Chronicle i18n 配置
30. `src/i18n/messages/*/common.json` - 移除 Chronicle 翻译
31. `src/i18n/messages/*/ui.json` - 移除 Chronicle 翻译
32. `src/i18n/messages/*/priceQuery.json` - 移除 Chronicle 翻译
33. `src/i18n/messages/*/navigation.json` - 移除 Chronicle 翻译
34. `src/i18n/messages/*/docs.json` - 移除 Chronicle 翻译
35. `src/i18n/messages/*/components/search.json` - 移除 Chronicle 翻译
36. `src/i18n/generated-types.ts` - 移除 Chronicle 类型
