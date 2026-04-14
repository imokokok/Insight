# Architecture Review Checklist

## DI 容器

- [x] Token 类泛型实现，token 与类型绑定
- [x] Container.resolve 从 token 自动推断返回类型
- [x] 所有 resolve 调用迁移到新 API
- [x] 循环依赖检测机制已添加
- [x] DI 注册中的服务不再直接导入 supabase client

## 状态管理

- [x] crossChainStore 已拆分为 selector/UI/data 三个独立 store
- [x] 拆分后所有消费组件 import 路径已更新
- [x] 原 crossChainStore.ts 已删除
- [x] authStore 添加了 persist 中间件
- [x] authStore 的 partialize 仅持久化 profile 和 preferences
- [x] authStore 的 onRehydrateStorage 正确处理 Date 对象恢复

## 数据访问层

- [x] Alert CRUD 操作路径已统一
- [x] useCreateAlert/useUpdateAlert/useDeleteAlert 已迁移至 useMutation
- [x] 手动管理的 isCreating/isUpdating/isDeleting 状态已移除
- [x] useMutation 的 onSuccess 正确 invalidate 相关 query key

## Oracle 层

- [x] OracleCache 添加了 MAX_CACHE_SIZE 限制
- [x] 缓存满时正确淘汰最早过期条目
- [x] 定期清理过期条目的 setInterval 已添加
- [x] cleanup() 方法可供外部调用

## 安全

- [x] DOMPurify 已安装并集成
- [x] sanitizeHtmlBasic 使用 DOMPurify 实现
- [x] XSS 检测模式已补充 svg/img/body 等变体
- [x] inputSanitizer 和 xss 模块重复功能已合并
- [x] sanitizeProvider 白名单与 OracleProvider 枚举同步

## 配置

- [x] useRealChainlinkData 在 env.ts 和 factory.ts 中默认值一致
- [x] featureFlags.ts 作为 Feature Flag 单一来源已创建

## 实时通信

- [x] createWebSocketHook 的回调参数使用 useRef 稳定化
- [x] onPerformanceMetrics 引用变化不再导致 WebSocket 重建

## 通用

- [x] 所有修改的模块测试通过
- [x] TypeScript 编译无错误
- [x] ESLint 检查通过
