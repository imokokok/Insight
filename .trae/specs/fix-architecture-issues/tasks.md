# Tasks

- [x] Task 1: 统一 Oracle 类型导入路径，消除循环依赖风险
  - [x] SubTask 1.1: 移除 `src/lib/oracles/index.ts` 中的 `export * from '@/types/oracle'`
  - [x] SubTask 1.2: 全局搜索从 `@/lib/oracles` 导入 OracleProvider/Blockchain 等类型的引用，改为从 `@/types/oracle` 导入
  - [x] SubTask 1.3: 验证构建通过，无类型错误

- [ ] Task 2: 将 API 路由迁移到 createApiHandler 声明式中间件模式
  - [ ] SubTask 2.1: 迁移 `src/app/api/favorites/route.ts` 到 createApiHandler
  - [ ] SubTask 2.2: 迁移 `src/app/api/favorites/[id]/route.ts` 到 createApiHandler
  - [ ] SubTask 2.3: 迁移 `src/app/api/alerts/route.ts` 到 createApiHandler
  - [ ] SubTask 2.4: 迁移 `src/app/api/alerts/[id]/route.ts` 到 createApiHandler
  - [ ] SubTask 2.5: 迁移 `src/app/api/alerts/batch/route.ts` 到 createApiHandler
  - [ ] SubTask 2.6: 迁移 `src/app/api/alerts/events/[id]/route.ts` 到 createApiHandler
  - [ ] SubTask 2.7: 迁移 `src/app/api/auth/callback/route.ts` 到 createApiHandler
  - [ ] SubTask 2.8: 迁移 `src/app/api/auth/profile/route.ts` 到 createApiHandler
  - [ ] SubTask 2.9: 迁移 `src/app/api/auth/delete-account/route.ts` 到 createApiHandler
  - [ ] SubTask 2.10: 迁移 `src/app/api/prices/route.ts` 到 createApiHandler（如需要）
  - [ ] SubTask 2.11: 验证所有 API 路由测试通过

- [x] Task 3: 抽取 useAllOnChainData hook，消除 PriceQueryContent 重复逻辑
  - [x] SubTask 3.1: 在 `src/hooks/oracles/` 下创建 `useAllOnChainData.ts` hook
  - [x] SubTask 3.2: 重构 `PriceQueryContent.tsx` 使用新 hook 替换重复代码
  - [x] SubTask 3.3: 验证 price-query 页面功能正常

- [ ] Task 4: 合并 Cross-Chain 4 个 Store 为 2 个
  - [ ] SubTask 4.1: 合并 `crossChainDataStore` + `crossChainConfigStore` 为 `useCrossChainDataStore`
  - [ ] SubTask 4.2: 合并 `crossChainSelectorStore` + `crossChainUIStore` 为 `useCrossChainUIStore`
  - [ ] SubTask 4.3: 移除无意义的 persist 配置（partialize 返回空对象的）
  - [ ] SubTask 4.4: 更新所有引用旧 Store 的组件
  - [ ] SubTask 4.5: 删除旧的 Store 文件

- [ ] Task 5: 重构 BaseOracleClient 历史数据获取，移除硬编码依赖
  - [ ] SubTask 5.1: 在 BaseOracleClient 中添加可注入的 historicalDataService 属性
  - [ ] SubTask 5.2: 将 binanceMarketService 作为默认实现注入
  - [ ] SubTask 5.3: 验证所有 Oracle 客户端功能正常

- [ ] Task 6: 合并 env.ts 和 serverEnv.ts 为统一环境配置模块
  - [ ] SubTask 6.1: 创建新的统一配置模块，明确区分 client/server/shared 配置
  - [ ] SubTask 6.2: 更新所有引用旧配置文件的代码
  - [ ] SubTask 6.3: 删除旧的 `serverEnv.ts` 文件
  - [ ] SubTask 6.4: 验证构建通过

- [x] Task 7: 修复 errors/index.ts 导出问题
  - [x] SubTask 7.1: 导出已定义但未导出的类型守卫函数
  - [x] SubTask 7.2: 清理注释掉的空导出分类
  - [x] SubTask 7.3: 修复 React.ReactNode 引用缺少 React 导入的问题

- [x] Task 8: 清理冗余代码
  - [x] SubTask 8.1: 移除 `IOracleClientFactory` 接口（src/lib/oracles/interfaces.ts）- 保留接口用于测试
  - [x] SubTask 8.2: 移除 `OracleRepository` 静态类，调用方改为直接使用 databaseOperations
  - [ ] SubTask 8.3: 移除 handler.ts 中的 CRUD 辅助函数（createGetHandler 等 5 个 + createCrudHandlers）- 保留用于测试
  - [x] SubTask 8.4: 移除 BaseOracleClient 中 @deprecated 的 fetchPriceWithDatabase 和 fetchHistoricalPricesWithDatabase 方法

- [x] Task 9: 添加缺失的 barrel 文件
  - [x] SubTask 9.1: 创建 `src/stores/index.ts` 统一导出
  - [x] SubTask 9.2: 创建 `src/providers/index.ts` 统一导出

- [x] Task 10: 最终验证
  - [x] SubTask 10.1: 运行 `npm run typecheck` 确保无类型错误
  - [x] SubTask 10.2: 运行 `npm run lint` 确保无 lint 错误
  - [x] SubTask 10.3: 运行 `npm run test` 确保测试通过
  - [x] SubTask 10.4: 运行 `npm run build` 确保构建成功

# Task Dependencies

- [Task 1] 无依赖，可先行
- [Task 2] 无依赖，可先行
- [Task 3] 无依赖，可先行
- [Task 4] 无依赖，可先行
- [Task 5] 依赖 [Task 1]（类型导入路径统一后再修改 base.ts）
- [Task 6] 无依赖，可先行
- [Task 7] 无依赖，可先行
- [Task 8] 依赖 [Task 2]（API 路由迁移后再清理 handler.ts）和 [Task 5]（base.ts 重构后再清理 deprecated 方法）
- [Task 9] 依赖 [Task 4]（Store 合并后再创建 barrel 文件）
- [Task 10] 依赖所有其他 Task
