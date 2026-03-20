# Tasks - 代码规范违规修复

## 第一阶段：高优先级修复

- [x] Task 1: 修复枚举定义（6 处）
  - [x] SubTask 1.1: 修复 `src/types/oracle/enums.ts` 中的 `OracleProvider` 和 `Blockchain` 枚举
  - [x] SubTask 1.2: 修复 `src/types/oracle/constants.ts` 中的 `TimeRange`、`DataStatus`、`TrendDirection` 枚举
  - [x] SubTask 1.3: 修复 `src/lib/oracles/bandProtocol.ts` 中的 `EventType` 枚举

- [x] Task 2: 修复 any 类型使用（46 处）
  - [x] SubTask 2.1: 修复图表组件 Tooltip 参数类型（5 处）
  - [x] SubTask 2.2: 修复数据数组类型定义（13 处）
  - [x] SubTask 2.3: 修复事件处理器参数类型（4 处）
  - [x] SubTask 2.4: 修复导出数据类型（4 处）
  - [x] SubTask 2.5: 修复其他 any 类型使用（20 处）

- [x] Task 3: 修复错误处理（约 60 处）
  - [x] SubTask 3.1: 修复 `src/hooks/useFavorites.ts` 中的认证错误
  - [x] SubTask 3.2: 修复 `src/hooks/useRoutePrefetch.ts` 中的数据获取错误
  - [x] SubTask 3.3: 修复 `src/hooks/queries/*.ts` 中的数据获取错误
  - [x] SubTask 3.4: 修复 `src/lib/oracles/factory.ts` 中的客户端创建错误
  - [x] SubTask 3.5: 修复 `src/lib/utils/timestamp.ts` 中的验证错误
  - [x] SubTask 3.6: 修复 `src/lib/config/env.ts` 中的环境变量错误

## 第二阶段：中优先级修复

- [x] Task 4: 修复类型导入（85+ 处）
  - [x] SubTask 4.1: 修复 `src/lib/oracles/*.ts` 中的类型导入
  - [x] SubTask 4.2: 修复 `src/hooks/*.ts` 中的类型导入
  - [x] SubTask 4.3: 修复 `src/components/**/*.tsx` 中的类型导入
  - [x] SubTask 4.4: 修复 `src/app/**/*.tsx` 中的类型导入

- [x] Task 5: 修复对象形状定义（17 处）
  - [x] SubTask 5.1: 修复 `src/hooks/usePerformanceMetrics.ts` 中的类型定义（4 处）
  - [x] SubTask 5.2: 修复 `src/lib/supabase/database.types.ts` 中的类型定义（7 处）- 跳过（自动生成）
  - [x] SubTask 5.3: 修复 `src/lib/monitoring/*.ts` 中的类型定义（3 处）
  - [x] SubTask 5.4: 修复 `src/lib/api/client/types.ts` 中的类型定义（1 处）
  - [x] SubTask 5.5: 修复 `src/i18n/types.ts` 中的类型定义（1 处）

- [x] Task 6: 扩展 React Query Query Keys 工厂模式
  - [x] SubTask 6.1: 在 `queryKeys.ts` 中添加 `favoritesKeys`
  - [x] SubTask 6.2: 在 `queryKeys.ts` 中添加 `alertsKeys`
  - [x] SubTask 6.3: 在 `queryKeys.ts` 中添加 `api3Keys`
  - [x] SubTask 6.4: 更新相关 hooks 使用工厂模式

- [x] Task 7: 修复布尔值变量命名（21+ 处）
  - [x] SubTask 7.1: 修复 `src/app/[locale]/price-query/hooks/usePriceQuery.ts` 中的布尔值命名
  - [x] SubTask 7.2: 修复 `src/app/[locale]/market-overview/useDataFetching.ts` 中的布尔值命名
  - [x] SubTask 7.3: 修复其他文件中的布尔值命名

## 第三阶段：持续改进

- [x] Task 8: 添加文件头注释和 JSDoc 文档
  - [x] SubTask 8.1: 为核心库文件添加文件头注释
  - [x] SubTask 8.2: 为公共函数添加 JSDoc 文档

- [x] Task 9: 验证修复结果
  - [x] SubTask 9.1: 运行 TypeScript 编译检查 ✅ 通过
  - [x] SubTask 9.2: 运行 ESLint 检查
  - [x] SubTask 9.3: 运行项目构建
  - [x] SubTask 9.4: 运行测试

# Task Dependencies
- Task 9 依赖 Task 1-8
- Task 1-3 可并行执行（高优先级）
- Task 4-7 可并行执行（中优先级）
- Task 8 可与其他任务并行执行
