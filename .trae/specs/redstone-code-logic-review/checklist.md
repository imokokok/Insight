# RedStone 预言机页面代码逻辑审查检查清单

## P0 - 数据真实性问题

### Math.random() 移除
- [x] `generateConfidenceInterval` 方法不再使用 Math.random()
- [x] `getRiskMetrics` 方法返回确定性数据
- [x] 所有随机数据生成已替换为确定性算法
- [x] 单元测试验证相同输入产生相同输出

### 硬编码数据统一
- [x] 创建了 `redstoneConstants.ts` 集中管理常量
- [x] `FALLBACK_CHAINS` 不再重复定义
- [x] 所有组件使用统一的数据源

## P1 - 状态管理

### RedStoneClient 单例
- [x] 创建了 RedStoneClientContext
- [x] useRedStonePage 使用 Context 共享实例
- [x] src/hooks/oracles/redstone.ts 使用共享实例
- [x] 缓存在所有使用位置共享

### 加载状态优化
- [x] 多个独立查询合并为单一 useQueries
- [x] 加载状态计算逻辑统一
- [x] 加载状态过渡平滑无闪烁

## P1 - 错误处理

- [x] `fetchRealPrice` 方法抛出具体错误
- [x] 部分数据加载失败有明确提示
- [x] 错误重试机制正常工作
- [x] 错误边界处理完整

## P2 - 性能优化

### 动画和定时器
- [x] RedStonePullModelView 中多个 interval 已合并
- [x] 使用 useReducer 减少重渲染
- [x] useRedStonePage 返回对象使用 useMemo 包裹

### 未使用变量清理
- [x] RedStoneProvidersView 中未使用的 sortBy 已移除
- [x] 组件中未使用的 isLoading 参数已处理

## P2 - 类型安全

- [x] RedStoneMarketView 中 priceChange24h 不再硬编码
- [x] 时间戳处理逻辑统一（明确毫秒/秒单位）
- [x] 添加了必要的类型注释和 JSDoc 文档

## P3 - 国际化

- [x] RedStoneHero 中无硬编码中文文本
- [x] 所有翻译 key 已添加到 i18n 文件
- [x] 验证所有翻译 key 存在且正确

## 代码质量

- [x] 无 ESLint 警告
- [x] 无 TypeScript 类型错误
- [x] 所有测试通过
- [x] 代码格式符合项目规范
