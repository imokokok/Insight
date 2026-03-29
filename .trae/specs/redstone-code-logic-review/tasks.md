# Tasks

## P0 - 数据真实性问题修复（立即实施）

- [x] Task 1: 移除 Math.random() 调用，使用确定性算法
  - [x] SubTask 1.1: 修改 `generateConfidenceInterval` 方法，使用基于时间戳的确定性值
  - [x] SubTask 1.2: 修改 `getRiskMetrics` 方法，返回稳定的默认值或从配置读取
  - [x] SubTask 1.3: 添加单元测试验证确定性输出

- [x] Task 2: 统一硬编码数据源
  - [x] SubTask 2.1: 创建 `redstoneConstants.ts` 文件，集中管理链信息
  - [x] SubTask 2.2: 移除 `FALLBACK_CHAINS` 重复定义，使用统一数据源
  - [x] SubTask 2.3: 更新所有引用位置

## P1 - 状态管理优化

- [x] Task 3: 实现 RedStoneClient 单例模式
  - [x] SubTask 3.1: 创建 RedStoneClientContext
  - [x] SubTask 3.2: 修改 `useRedStonePage` 使用 Context 共享实例
  - [x] SubTask 3.3: 修改 `src/hooks/oracles/redstone.ts` 使用共享实例
  - [x] SubTask 3.4: 添加单元测试验证单例行为

- [x] Task 4: 优化加载状态管理
  - [x] SubTask 4.1: 合并多个独立查询为单一 useQueries 调用
  - [x] SubTask 4.2: 实现统一的加载状态计算逻辑
  - [x] SubTask 4.3: 添加加载状态过渡动画避免闪烁

## P1 - 错误处理完善

- [x] Task 5: 完善错误处理机制
  - [x] SubTask 5.1: 修改 `fetchRealPrice` 方法，抛出具体错误而非静默返回 null
  - [x] SubTask 5.2: 添加部分数据加载失败的提示组件
  - [x] SubTask 5.3: 实现错误重试机制优化

## P2 - 性能优化

- [x] Task 6: 优化动画和定时器
  - [x] SubTask 6.1: 合并 RedStonePullModelView 中的多个 interval
  - [x] SubTask 6.2: 使用 useReducer 替代多个 useState 减少重渲染
  - [x] SubTask 6.3: 添加 useMemo 包裹 useRedStonePage 返回对象

- [x] Task 7: 移除未使用的状态变量
  - [x] SubTask 7.1: 清理 RedStoneProvidersView 中未使用的 sortBy 变量
  - [x] SubTask 7.2: 清理组件中未使用的 isLoading 参数或实现加载状态

## P2 - 类型安全增强

- [x] Task 8: 修复类型安全问题
  - [x] SubTask 8.1: 修改 RedStoneMarketView 中硬编码的 priceChange24h
  - [x] SubTask 8.2: 统一时间戳处理逻辑，明确单位（毫秒/秒）
  - [x] SubTask 8.3: 添加类型注释和 JSDoc 文档

## P3 - 国际化完善

- [x] Task 9: 完善国际化支持
  - [x] SubTask 9.1: 移除 RedStoneHero 中硬编码的中文文本
  - [x] SubTask 9.2: 添加缺失的翻译 key 到 i18n 文件
  - [x] SubTask 9.3: 验证所有翻译 key 存在

# Task Dependencies

- [Task 3] 应优先于 [Task 4]，因为共享实例后更容易统一状态管理 ✅
- [Task 1] 是核心问题，应优先实施 ✅
- [Task 5] 依赖 [Task 3]，需要先统一错误处理入口 ✅
- [Task 6] 和 [Task 7] 可以并行执行 ✅
- [Task 8] 和 [Task 9] 可以并行执行 ✅
