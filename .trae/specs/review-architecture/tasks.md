# Tasks

## Task 1: 重构 DI 容器为类型安全 token 机制

- [x] SubTask 1.1: 创建 `Token` 泛型类，将 token 字符串与类型绑定
- [x] SubTask 1.2: 将 `tokens.ts` 中的字符串常量迁移为 `Token<ISomeService>` 实例
- [x] SubTask 1.3: 修改 `Container.resolve` 使其从 token 推断返回类型
- [x] SubTask 1.4: 更新所有 `container.resolve<T>('token')` 调用为新 API
- [x] SubTask 1.5: 添加循环依赖检测机制

## Task 2: 拆分 crossChainStore 为多个独立 store

- [x] SubTask 2.1: 创建 `crossChainSelectorStore`（选择器状态：selectedOracle, selectedChain, selectedSymbol）
- [x] SubTask 2.2: 创建 `crossChainUIStore`（UI 状态：sortConfig, currentPage, pageSize, hiddenLines）
- [x] SubTask 2.3: 创建 `crossChainDataStore`（数据状态：priceData, loading, error）
- [x] SubTask 2.4: 迁移原 store 的所有 selector hooks 到新 store
- [x] SubTask 2.5: 更新所有消费组件的 import 路径
- [x] SubTask 2.6: 删除原 `crossChainStore.ts`

## Task 3: 统一 Alert 数据访问路径

- [x] SubTask 3.1: 确定统一路径策略（建议：CRUD 操作走 API 路由，读取走 React Query + direct queries）
- [x] SubTask 3.2: 修改 `useBatchAlerts` 使其与单个操作走相同路径
- [x] SubTask 3.3: 更新相关测试

## Task 4: CRUD Hooks 迁移至 useMutation

- [x] SubTask 4.1: 将 `useCreateAlert` 改为 `useMutation` + `onSuccess` invalidate
- [x] SubTask 4.2: 将 `useUpdateAlert` 改为 `useMutation` + `onSuccess` invalidate
- [x] SubTask 4.3: 将 `useDeleteAlert` 改为 `useMutation` + `onSuccess` invalidate
- [x] SubTask 4.4: 移除手动管理的 `isCreating`/`isUpdating`/`isDeleting` 状态
- [x] SubTask 4.5: 更新相关测试

## Task 5: OracleCache 增加容量限制与定期清理

- [x] SubTask 5.1: 添加 `MAX_CACHE_SIZE` 常量（建议 1000）
- [x] SubTask 5.2: 实现 LRU 淘汰策略（当缓存满时淘汰最早过期条目）
- [x] SubTask 5.3: 添加 `setInterval` 定期清理过期条目（建议 60 秒）
- [x] SubTask 5.4: 添加 `cleanup()` 方法供外部调用
- [x] SubTask 5.5: 更新相关测试

## Task 6: 引入 DOMPurify 替换手写 HTML 消毒

- [x] SubTask 6.1: 安装 `dompurify` 和 `@types/dompurify`
- [x] SubTask 6.2: 重构 `sanitizeHtmlBasic` 使用 DOMPurify
- [x] SubTask 6.3: 补充 XSS 检测模式（`<svg/onload=`, `<img/src=` 等）
- [x] SubTask 6.4: 合并 `inputSanitizer` 和 `xss` 模块的重复功能
- [x] SubTask 6.5: 更新相关测试

## Task 7: 修复 Feature Flag 默认值不一致

- [x] SubTask 7.1: 统一 `useRealChainlinkData` 在 `env.ts` 和 `factory.ts` 中的默认值
- [x] SubTask 7.2: 创建 `featureFlags.ts` 单一来源，其他位置引用该文件

## Task 8: authStore 增加关键状态持久化

- [x] SubTask 8.1: 为 `authStore` 添加 `persist` 中间件
- [x] SubTask 8.2: 使用 `partialize` 仅持久化 `profile` 和 `preferences`
- [x] SubTask 8.3: 实现 `onRehydrateStorage` 处理 Date 对象恢复
- [x] SubTask 8.4: 更新相关测试

## Task 9: WebSocket Hook 回调引用稳定化

- [x] SubTask 9.1: 在 `createWebSocketHook` 中使用 `useRef` 存储 `onPerformanceMetrics`
- [x] SubTask 9.2: 同样处理其他回调参数（`onMessage`, `onStatusChange`）
- [x] SubTask 9.3: 更新相关测试

# Task Dependencies

- [Task 2] depends on [Task 1]（拆分 store 后需要更新 DI 注册）
- [Task 3] depends on [Task 4]（统一路径前先迁移 useMutation）
- [Task 7] 无依赖，可独立执行
- [Task 5, 6, 8, 9] 互相独立，可并行执行
