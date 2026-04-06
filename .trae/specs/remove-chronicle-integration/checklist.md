# Checklist

## 阶段一：删除 Chronicle 核心文件

- [x] Chronicle 客户端服务文件已删除
  - [x] `src/lib/services/oracle/clients/chronicle.ts` 已删除
  - [x] `src/lib/oracles/chronicle.ts` 已删除
  - [x] `src/lib/oracles/chronicleOnChainService.ts` 已删除
  - [x] `src/lib/oracles/chronicleDataSources.ts` 已删除

- [x] Chronicle hooks 文件已删除
  - [x] `src/hooks/oracles/chronicle.ts` 已删除

- [x] Chronicle 测试文件已删除
  - [x] `src/lib/oracles/__tests__/chronicle.test.ts` 已删除

- [x] Chronicle i18n 翻译文件已删除
  - [x] `src/i18n/messages/zh-CN/oracles/chronicle.json` 已删除
  - [x] `src/i18n/messages/en/oracles/chronicle.json` 已删除

## 阶段二：从枚举和类型中移除 Chronicle

- [x] OracleProvider 枚举已更新
  - [x] `src/types/oracle/enums.ts` 中已移除 CHRONICLE
  - [x] `src/types/oracle/oracle.ts` 中已移除 Chronicle 相关类型
  - [x] `src/types/guards.ts` 中已移除 Chronicle 类型守卫

## 阶段三：从配置和常量中移除 Chronicle

- [x] 配置文件已更新
  - [x] `src/lib/config/oracles.tsx` 中已移除 Chronicle 配置
  - [x] `src/lib/config/colors.ts` 中已移除 Chronicle 颜色配置
  - [x] `src/lib/config/serverEnv.ts` 中已移除 Chronicle 环境变量配置
  - [x] `src/lib/config/colorblind-friendly.ts` 中已移除 Chronicle 颜色配置

- [x] 常量文件已更新
  - [x] `src/lib/constants/index.ts` 中已移除 Chronicle 相关常量
  - [x] `src/lib/constants/searchConfig.ts` 中已移除 Chronicle 搜索配置

## 阶段四：从服务和 hooks 索引中移除 Chronicle

- [x] 服务索引已更新
  - [x] `src/lib/services/oracle/index.ts` 中已移除 Chronicle 导出
  - [x] `src/lib/services/oracle/marketDataDefaults.ts` 中已移除 Chronicle 默认值

- [x] hooks 索引已更新
  - [x] `src/hooks/oracles/index.ts` 中已移除 Chronicle hooks 导出
  - [x] `src/hooks/index.ts` 中已移除 Chronicle hooks 导出

- [x] oracles 库已更新
  - [x] `src/lib/oracles/index.ts` 中已移除 Chronicle 导出
  - [x] `src/lib/oracles/factory.ts` 中已移除 Chronicle 工厂方法
  - [x] `src/lib/oracles/colors.ts` 中已移除 Chronicle 颜色
  - [x] `src/lib/oracles/supportedSymbols.ts` 中已移除 Chronicle 支持的代币
  - [x] `src/lib/oracles/performanceMetricsConfig.ts` 中已移除 Chronicle 配置
  - [x] `src/lib/oracles/oracle-config.ts` 中已移除 Chronicle 配置

## 阶段五：从功能模块中移除 Chronicle

- [x] 搜索功能已更新
  - [x] `src/components/search/data.ts` 中已移除 Chronicle 搜索项

- [x] 跨预言机对比功能已更新
  - [x] `src/app/[locale]/cross-oracle/constants.tsx` 中已移除 Chronicle 配置
  - [x] `src/app/[locale]/cross-oracle/chartConfig.ts` 中已移除 Chronicle 配置

- [x] 价格查询功能已更新
  - [x] `src/app/[locale]/price-query/hooks/usePriceQueryState.ts` 中已移除 Chronicle 选项

- [x] 市场概览功能已更新
  - [x] `src/app/[locale]/market-overview/constants.ts` 中已移除 Chronicle 配置

## 阶段六：从其他文件中移除 Chronicle

- [x] API 和验证已更新
  - [x] `src/lib/api/oracleHandlers.ts` 中已移除 Chronicle 处理逻辑
  - [x] `src/lib/validation/schemas.ts` 中已移除 Chronicle 验证模式
  - [x] `src/lib/security/inputSanitizer.ts` 中已移除 Chronicle 相关代码

- [x] i18n 配置和翻译已更新
  - [x] `src/i18n/config.ts` 中已移除 Chronicle i18n 配置
  - [x] `src/i18n/generated-types.ts` 中已移除 Chronicle 类型
  - [x] 各翻译文件中已移除 Chronicle 相关翻译

- [x] 测试文件已更新
  - [x] `src/lib/oracles/__tests__/factory.test.ts` 中已移除 Chronicle 测试

## 阶段七：验证和测试

- [x] Chronicle 完全移除验证
  - [x] 搜索项目中无 Chronicle 引用
  - [x] TypeScript 类型检查通过
  - [x] 构建命令成功完成
