# 数据质量指标布局优化任务清单

## Task 1: 修复历史准确率显示精度
- [x] SubTask 1.1: 修改 DataQualityIndicators.tsx 中的 rightContent 格式化
  - 将 `${reliability.historicalAccuracy}%` 改为 `${reliability.historicalAccuracy.toFixed(1)}%`
- [x] SubTask 1.2: 修改 Tooltip 中的历史准确率显示
  - 同样应用 toFixed(1) 格式化

## Task 2: 优化卡片布局
- [x] SubTask 2.1: 修改 compact 模式的容器布局
  - 将 `flex flex-wrap items-center gap-2` 改为 grid 布局
  - 使用 `grid-cols-4` 确保4个卡片均匀分布
- [x] SubTask 2.2: 调整 CompactScoreCard 组件的最小宽度
  - 移除或调整 `min-w-[200px]` 限制
  - 确保卡片可以自适应填充空间
- [x] SubTask 2.3: 验证响应式效果
  - 确保在不同屏幕尺寸下布局正常

## Task 3: 验证修复效果
- [x] SubTask 3.1: 检查历史准确率显示精度
- [x] SubTask 3.2: 检查卡片布局是否占满整行
- [x] SubTask 3.3: 运行 TypeScript 类型检查
- [x] SubTask 3.4: 运行 ESLint 检查

# Task Dependencies
- Task 1 和 Task 2 可以并行执行
- Task 3 依赖 Task 1 和 Task 2 完成
