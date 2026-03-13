# 逻辑错误审查检查清单

## 严重问题

- [x] 时间戳处理：`queries.ts` 和 `api/oracles/route.ts` 使用一致的时间戳单位
- [x] 时间戳工具：创建了 `lib/utils/timestamp.ts` 并提供统一转换函数
- [x] Pyth 类型安全：`convertPythPrice` 函数参数类型与调用匹配
- [x] Pyth WebSocket：`handlePriceUpdate` 正确处理各种数据格式
- [x] Pyth 历史价格：`getHistoricalPrices` 返回有效数据或抛出明确错误

## 性能问题

- [x] 告警检测：`checkAlertConditions` 批量获取历史价格，避免 N+1 查询
- [x] 告警缓存：添加内存缓存减少数据库查询
- [x] 性能监控：告警检查记录耗时日志

## 代码重复

- [x] getUserId 函数：提取到 `lib/api/utils.ts`，所有 API 路由使用同一实现
- [x] Oracle API 逻辑：`api/oracles/route.ts` 和 `api/oracles/[provider]/route.ts` 共享公共处理器
- [x] WebSocket 管理：`lib/realtime/websocket.ts` 和 `hooks/useWebSocket.ts` 功能不重叠

## 配置问题

- [x] WebSocket URL：使用有效默认值或在配置缺失时抛出错误
- [x] 基础价格：`UNIFIED_BASE_PRICES` 从配置文件读取，支持环境变量
- [x] 配置验证：启动时验证必要配置

## 代码规范

- [x] 文件命名：`uma.tsx` 保持原名（包含 JSX 组件）
- [x] 导入更新：所有引用已正确更新

## 测试验证

- [x] 时间戳转换：单元测试覆盖毫秒/秒转换场景
- [x] 类型安全：TypeScript 编译无错误 ✅
- [x] 功能测试：所有 API 端点正常响应
- [x] 性能测试：告警检测耗时在可接受范围内
