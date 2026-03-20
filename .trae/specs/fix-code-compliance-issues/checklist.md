# Checklist - 代码规范违规修复

## 第一阶段：高优先级修复

### 枚举定义修复
- [x] `src/types/oracle/enums.ts` - `OracleProvider` 改为 `const enum`
- [x] `src/types/oracle/enums.ts` - `Blockchain` 改为 `const enum`
- [x] `src/types/oracle/constants.ts` - `TimeRange` 改为 `const enum`
- [x] `src/types/oracle/constants.ts` - `DataStatus` 改为 `const enum`
- [x] `src/types/oracle/constants.ts` - `TrendDirection` 改为 `const enum`
- [x] `src/lib/oracles/bandProtocol.ts` - `EventType` 改为 `const enum`

### any 类型修复
- [x] 图表组件 Tooltip 参数使用 Recharts 类型
- [x] 数据数组使用具体接口定义
- [x] 事件处理器使用具体事件类型
- [x] 导出数据使用具体类型
- [x] 其他 any 类型替换完成

### 错误处理修复
- [x] `useFavorites.ts` 使用 `AuthenticationError`
- [x] `useRoutePrefetch.ts` 使用 `PriceFetchError`
- [x] `useOraclePrices.ts` 使用 `PriceFetchError`
- [x] `useOracleData.ts` 使用 `PriceFetchError`
- [x] `usePriceHistory.ts` 使用 `PriceFetchError`
- [x] `factory.ts` 使用 `OracleClientError` 和 `ValidationError`
- [x] `timestamp.ts` 使用 `ValidationError`
- [x] `env.ts` 使用 `InternalError`

## 第二阶段：中优先级修复

### 类型导入修复
- [x] `src/lib/oracles/*.ts` 类型导入使用 `import type`
- [x] `src/hooks/*.ts` 类型导入使用 `import type`
- [x] `src/components/**/*.tsx` 类型导入使用 `import type`
- [x] `src/app/**/*.tsx` 类型导入使用 `import type`

### 对象形状定义修复
- [x] `usePerformanceMetrics.ts` - `OperationMetric` 改为 interface
- [x] `usePerformanceMetrics.ts` - `ComponentRenderMetric` 改为 interface
- [x] `usePerformanceMetrics.ts` - `PerformanceReport` 改为 interface
- [x] `usePerformanceMetrics.ts` - `MemoryInfo` 改为 interface
- [x] `database.types.ts` - 跳过（自动生成文件）
- [x] `monitoring/index.ts` - `SentryUser`, `Breadcrumb` 改为 interface
- [x] `monitoring/webVitals.ts` - `WebVitalMetric` 改为 interface
- [x] `api/client/types.ts` - `RequestConfig` 改为 interface
- [x] `i18n/types.ts` - `LoadedMessages` 改为 interface

### Query Keys 工厂模式扩展
- [x] 添加 `favoritesKeys` 工厂函数
- [x] 添加 `alertsKeys` 工厂函数
- [x] 添加 `api3Keys` 工厂函数
- [x] 更新 hooks 使用工厂模式

### 布尔值变量命名修复
- [x] `usePriceQuery.ts` - `loading` 改为 `isLoading`
- [x] `usePriceQuery.ts` - `compareMode` 改为 `isCompareMode`
- [x] `useDataFetching.ts` - 所有 loading 变量添加 is 前缀
- [x] 其他文件布尔值变量命名修复

## 第三阶段：验证

### 编译和测试验证
- [x] TypeScript 编译无错误 ✅
- [x] ESLint 检查无错误
- [x] 项目构建成功
- [x] 所有测试通过

### 规范合规性验证
- [x] 无 `any` 类型使用
- [x] 所有枚举使用 `const enum`
- [x] 所有类型导入使用 `import type`
- [x] 所有错误使用自定义错误类
- [x] 所有布尔值变量使用正确前缀
