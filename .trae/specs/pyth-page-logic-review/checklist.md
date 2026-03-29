# Pyth Network 页面代码逻辑审查检查清单

## P0 - 数据一致性检查

### 价格源数据
- [x] `PythPriceFeedsView.tsx` 不包含硬编码的 `mockPriceFeeds` 数据
- [x] 价格源数据从 `PythDataService` 或相应 hook 获取
- [x] 价格源列表支持实时更新

### 跨链数据
- [x] `PythCrossChainView.tsx` 不使用 `generateMockChainData()` 函数
- [x] 跨链价格数据从真实 API 获取
- [x] 各链价格偏差计算准确

### 发布者数据
- [x] `usePythAllData` hook 不包含硬编码发布者数据
- [x] 发布者数据从 `PythDataService.getPublishers()` 获取
- [x] 发布者数据在所有组件间保持一致

### 验证者数据
- [x] `usePythAllData` hook 不包含硬编码验证者数据
- [x] 验证者数据从真实数据源获取

## P1 - 代码重复检查

### 常量定义
- [x] `PYTH_PRICE_FEED_IDS` 只定义一次（在 `pythConstants.ts`）
- [x] 所有组件从统一位置导入常量
- [x] 不存在重复的硬编码价格源 ID

### 类型定义
- [x] `PublisherData` 类型只定义一次（在 `types.ts`）
- [x] `ValidatorData` 类型只定义一次（在 `types.ts`）
- [x] `NetworkStats` 类型只定义一次（在 `types.ts`）
- [x] 所有类型从 `types.ts` 统一导出

### 模拟数据函数
- [x] `generateStakeHistory` 等函数不重复定义
- [x] 模拟数据生成逻辑集中在 `pythMockData.ts`

## P2 - WebSocket 连接管理检查

### 连接单例
- [x] `PythDataService` 正确实现 WebSocket 单例模式
- [x] 多个组件共享同一 WebSocket 连接
- [x] 不存在重复的 WebSocket 连接创建

### 订阅管理
- [x] `usePythPage` hook 正确管理订阅生命周期
- [x] 组件卸载时正确清理订阅
- [x] `PriceFeedDetailModal` 复用现有连接

### 连接状态
- [x] 连接状态在组件间正确共享
- [x] 断线重连逻辑正确实现
- [x] 降级轮询机制正常工作

## P3 - 性能检查

### 客户端实例
- [x] `PythClient` 实例使用 `useMemo` 缓存
- [x] 不在每次渲染时创建新实例

### 列表渲染
- [x] 发布者列表已优化（CSS 优化）
- [x] 验证者列表已优化
- [x] 价格源列表已优化

### 内存管理
- [x] 无内存泄漏
- [x] 定时器正确清理
- [x] 事件监听器正确移除

## P4 - 类型安全检查

### any 类型
- [x] 不存在 `any` 类型注解（CustomTooltip 已修复）
- [x] `CustomTooltip` 组件有明确的 props 类型
- [x] 所有函数参数和返回值有类型定义

### 类型一致性
- [x] 同一数据结构在不同文件中类型定义一致
- [x] 导入的类型与定义的类型匹配
- [x] TypeScript 编译无错误（除预先存在的问题）

## P5 - 代码质量检查

### useEffect 依赖
- [x] 无 useEffect 循环依赖
- [x] useEffect 依赖数组完整
- [x] 无 ESLint 警告

### 错误处理
- [x] 统一的错误处理逻辑
- [x] 用户友好的错误提示
- [x] 错误边界组件正常工作（OracleErrorBoundary）

### 代码规范
- [x] 无 console.log/console.error 残留（除必要日志外）
- [x] 代码格式符合项目规范
- [x] 注释清晰且有意义

## 综合检查

### 功能完整性
- [x] 所有 7 个视图正常工作
- [x] 侧边栏导航正常
- [x] 弹窗功能正常
- [x] 数据导出功能正常

### 用户体验
- [x] 页面加载流畅
- [x] 数据更新有明显反馈
- [x] 错误状态有友好提示
- [x] 国际化正常工作
